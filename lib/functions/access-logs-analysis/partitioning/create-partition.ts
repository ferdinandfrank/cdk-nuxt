/**
 * This script creates a partition for the upcoming hour.
 * Taken and adjusted from https://github.com/aws-samples/amazon-cloudfront-access-logs-queries/blob/mainline/functions/createPartitions.js.
 */
// noinspection DuplicatedCode
import {StartQueryExecutionCommand} from '@aws-sdk/client-athena';
import {executeAndAwaitResponse} from './util';

const workgroup = process.env.WORKGROUP;
if (!workgroup) {
  throw new Error('Required environment variable WORKGROUP missing!');
}
const database = process.env.DATABASE;
if (!database) {
  throw new Error('Required environment variable DATABASE missing!');
}
const table = process.env.TABLE;
if (!table) {
  throw new Error('Required environment variable TABLE missing!');
}

const internalHandler = async () => {
  try {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    const year = nextHour.getUTCFullYear();
    const month = (nextHour.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = nextHour
      .getUTCDate()
      .toString()
      .padStart(2, '0');
    const hour = nextHour
      .getUTCHours()
      .toString()
      .padStart(2, '0');

    console.log('creating partition', {year, month, day, hour});

    const command = new StartQueryExecutionCommand({
      QueryString: `
        ALTER TABLE ${database}.${table}
        ADD IF NOT EXISTS
        PARTITION (
            year = '${year}',
            month = '${month}',
            day = '${day}',
            hour = '${hour}' );`,
      WorkGroup: workgroup,
      QueryExecutionContext: {Database: database},
    });

    await executeAndAwaitResponse(command, true);
    console.log('partition successfully created');
  } catch (error) {
    console.error('### unexpected runtime error ###', error);
  }
};

export const handler = internalHandler;
