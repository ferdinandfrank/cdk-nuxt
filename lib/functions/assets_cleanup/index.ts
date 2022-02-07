import {AWSLambda} from "@sentry/serverless";
import {DeleteObjectsCommand, ListObjectsV2Command, S3Client} from "@aws-sdk/client-s3";

AWSLambda.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.ENVIRONMENT,
});

const ONE_WEEK_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 7;

exports.handler = async (event: any, context: any) => {
    console.log('Starting cleanup of static assets older than 1 week...');

    try {
        const client = new S3Client({region: process.env.AWS_REGION});
        const bucketName = process.env.STATIC_ASSETS_BUCKET;

        if (!bucketName) {
            throw new Error("Static asset's bucket name not specified in environment!");
        }

        const deleteOlderThan = new Date(Date.now() - ONE_WEEK_IN_MILLISECONDS);

        // As we don't have hundreds of deployments per week, there's no need for pagination
        const deploymentFolders = await client.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Delimiter: '/', // Only retrieve the top level folders
            })
        );

        // The result is a list of objects containing the keys with a trailing slash
        const folderNames = deploymentFolders.CommonPrefixes?.map(folder => folder.Prefix?.slice(0, -1))
        if (!folderNames) {
            console.log('Canceled static assets cleanup as folder is empty.');
            return;
        }

        // We sort the folders by their creation data and remove the latest one as this is the currently active one used in production
        const legacyFolderNames = folderNames.sort((a,b) => {
            // @ts-ignore
            const creationDateA = new Date(a);
            // @ts-ignore
            const creationDateB = new Date(b);

            return creationDateA.getTime() < creationDateB.getTime() ? -1 : 1;
        })
        const activeFolderName = legacyFolderNames.pop();
        console.log(`Detected assets folder "${activeFolderName}" as current production folder...`);

        // We want to get all outdated folders of our legacy (not productively used) folders for deletion
        const outdatedFolderNames = legacyFolderNames.filter(folderName => {
                // @ts-ignore
                const creationDate = new Date(folderName);
                return creationDate.getTime() < deleteOlderThan.getTime();
            }
        );

        if (!outdatedFolderNames || outdatedFolderNames.length === 0) {
            console.log('No outdated asset folders found.');
        } else {
            console.log(`Deleting ${outdatedFolderNames.length} outdated folders...`);

            // Unfortunately it's not possible to delete folders recursively 🙄
            // so we need to query all the contents in order to delete them
            const pendingPromises = outdatedFolderNames.map(folderName => {
                return client
                    .send(
                        new ListObjectsV2Command({
                            Bucket: bucketName,
                            Prefix: folderName,
                        })
                    )
                    .then(outdatedAssets => {
                        return client.send(
                            new DeleteObjectsCommand({
                                Bucket: bucketName,
                                Delete: {
                                    Objects: outdatedAssets.Contents?.map(outdatedAsset => {
                                        return {Key: outdatedAsset.Key};
                                    }),
                                },
                            })
                        );
                    });
            });

            const results = await Promise.all(pendingPromises);
            results.forEach(result => {
                if (result.Errors && result.Errors.length) {
                    const errorMsg = 'Failed to delete outdated static assets.';
                    console.error(errorMsg, result.Errors);
                    throw new Error(errorMsg);
                }
            });
        }

        console.log('Cleanup of old static assets finished.');
    } catch (error) {
        console.error('### unexpected runtime error ###', error);
        AWSLambda.captureException(error);
    }
};