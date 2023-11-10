import {
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    GetObjectCommand, HeadObjectCommand,
    ListObjectsV2Command,
    S3Client
} from "@aws-sdk/client-s3";
import type {ListObjectsV2CommandOutput} from "@aws-sdk/client-s3";
import {text} from 'stream/consumers';
import {Readable} from "stream";

interface AssetMetadata {
    readonly key: string;
    readonly metadata: {[key: string]: string};
}

const MAX_DELETE_OBJECT_KEYS = 1000;
const ONE_DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;

/**
 * Returns the current deployment revision (build timestamp).
 */
const getCurrentRevision = async (s3Client: S3Client, bucketName: string): Promise<Date> => {
    const revisionFile = await s3Client.send(
        new GetObjectCommand({
            Bucket: bucketName,
            Key: 'app-revision',
        })
    );

    return new Date(await text(revisionFile.Body as Readable));
};

/**
 * Filters the given assets by inspecting their revision and returns those, that are older than the specified cutoff date.
 */
const filterOutdatedAssetKeys = (metadataResults: AssetMetadata[], returnOlderThan: Date): string[] => {
    return metadataResults
        .filter(assetMetadata =>
            assetMetadata.metadata.revision
                ? new Date(assetMetadata.metadata.revision).getTime() <= returnOlderThan.getTime()
                : false
        )
        .map(filteredAssets => filteredAssets.key);
};

/**
 * Deletes the given assets.
 */
const deleteAssets = async (
    assetKeys: string[],
    s3Client: S3Client,
    bucketName: string
): Promise<DeleteObjectsCommandOutput[]> => {
    let remainingAssetKeysToDelete = [...assetKeys];
    const pendingDeletes = [];

    while (remainingAssetKeysToDelete.length > 0) {
        const curDeleteBatch = remainingAssetKeysToDelete.slice(0, MAX_DELETE_OBJECT_KEYS);
        remainingAssetKeysToDelete = remainingAssetKeysToDelete.slice(MAX_DELETE_OBJECT_KEYS);

        console.log('Deleting assets:', curDeleteBatch);

        const pendingDelete = s3Client.send(
            new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: {
                    Objects: curDeleteBatch.map(outdatedKey => {
                        return {Key: outdatedKey};
                    }),
                },
            })
        );
        pendingDeletes.push(pendingDelete);
    }

    return await Promise.all(pendingDeletes);
};

exports.handler = async (event: any, context: any) => {
    try {
        const client = new S3Client({region: process.env.AWS_REGION});
        const bucketName = process.env.STATIC_ASSETS_BUCKET;
        if (!bucketName) {
            throw new Error("Static asset's bucket name not specified in environment!");
        }

        if (!process.env.OUTDATED_ASSETS_RETENTION_DAYS) {
            throw new Error('Retain duration of static assets not specified!');
        }
        const retainAssetsInDays = Number.parseInt(process.env.OUTDATED_ASSETS_RETENTION_DAYS);
        const currentRevision = await getCurrentRevision(client, bucketName);
        const deleteOlderThan = new Date(currentRevision.getTime() - retainAssetsInDays * ONE_DAY_IN_MILLISECONDS);

        console.log(`Starting cleanup of static assets older than ${deleteOlderThan.toISOString()}...`);

        let assetKeysToDelete: string[] = [];
        let lastToken = undefined;

        do {
            const curAssetsResult: ListObjectsV2CommandOutput = await client.send(
                new ListObjectsV2Command({
                    Bucket: bucketName,
                    MaxKeys: 250,
                    ContinuationToken: lastToken,
                })
            );

            // Read object metadata in blocks of 10
            let processableAssets = [...curAssetsResult.Contents!];

            while (processableAssets.length > 0) {
                const assetsBatch = processableAssets.slice(0, 10);
                processableAssets = processableAssets.slice(10);

                const pendingMetadataRequests = assetsBatch.map(asset =>
                    client.send(
                        new HeadObjectCommand({
                            Bucket: bucketName,
                            Key: asset.Key,
                        })
                    )
                );

                const metadataResults = await Promise.all(pendingMetadataRequests);

                // Assign metadata to assets
                const metadataByAsset: AssetMetadata[] = (metadataResults.map((metadataResult, index) => ({
                    key: assetsBatch[index].Key,
                    metadata: metadataResult.Metadata,
                })) as AssetMetadata[]);

                const outdatedAssetKeys = filterOutdatedAssetKeys(metadataByAsset, deleteOlderThan);
                assetKeysToDelete.push(...outdatedAssetKeys);
            }
            lastToken = curAssetsResult.NextContinuationToken;
        } while (lastToken !== undefined);

        if (assetKeysToDelete.length === 0) {
            console.log('No outdated assets to delete found');
            return;
        }

        console.log('Deleting ' + assetKeysToDelete.length + ' assets...');

        // Delete outdated assets (max. 1000 allowed per request)
        const results = await deleteAssets(assetKeysToDelete, client, bucketName);
        const failed = results.reduce((previousResult: boolean, currentResult: DeleteObjectsCommandOutput): boolean => {
            const currentError: boolean = !!(currentResult.Errors && currentResult.Errors.length > 0);
            if (currentError) {
                console.error('Failed to delete outdated static assets', currentResult.Errors);
            }
            return previousResult || currentError;
        }, false);

        if (failed) {
            throw new Error('Failed to delete outdated static assets');
        }

        console.log('Cleanup of old static assets finished');
    } catch (error) {
        console.error('### unexpected runtime error ###', error);
    }
};