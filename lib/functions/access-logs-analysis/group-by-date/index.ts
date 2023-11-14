/**
 * This script moves access logs into a target folder hierarchy, structured by year, month, day, and hour (UTC).
 * That way, the logs can easier be processed with Athena.
 * Taken and adjusted from https://github.com/aws-samples/amazon-cloudfront-access-logs-queries.
 * This Lambda supports access logs from both: CloudFront and S3.
 */
import {S3Client, CopyObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3';
import type {S3Event} from 'aws-lambda';

// without leading and trailing slashes
const targetFolder = process.env.TARGET_FOLDER;
if (!targetFolder) {
  throw new Error('Required environment variable TARGET_FOLDER missing!');
}
if (!process.env.RAW_ACCESS_LOG_FILE_PATTERN) {
  throw new Error('Required environment variable RAW_ACCESS_LOG_FILE_PATTERN missing!');
}
// unfortunately, CloudFront logs and S3 logs are completely different. That's why the pattern to identify
// unprocessed log files need to be configurable
const rawAccessLogFilePattern = new RegExp(process.env.RAW_ACCESS_LOG_FILE_PATTERN);

// matches for everything after the last slash
const filenamePattern = /[^/]+$/;

const s3Client = new S3Client({region: process.env.AWS_REGION});

const internalHandler = async (event: S3Event) => {
  try {
    const pendingMoves = event.Records.map(async record => {
      const bucket = record.s3.bucket.name;
      const sourceKey = record.s3.object.key;
      const match = rawAccessLogFilePattern.exec(sourceKey);

      // skip other files/folder
      if (match?.groups) {
        const {year, month, day, hour} = match.groups;
        const filename = filenamePattern.exec(sourceKey)![0];
        const targetKey = `${targetFolder}/year=${year}/month=${month}/day=${day}/hour=${hour}/${filename}`;

        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          Key: targetKey,
          CopySource: bucket + '/' + sourceKey,
        });

        await s3Client.send(copyCommand);

        const deleteSourceCommand = new DeleteObjectCommand({
          Bucket: bucket,
          Key: sourceKey,
        });

        await s3Client.send(deleteSourceCommand);
      }
    });

    const processed = await Promise.all(pendingMoves);
    console.log(`successfully moved ${processed.length} files`);
  } catch (error) {
    console.error('### unexpected runtime error ###', error);
  }
};

export const handler = internalHandler;
