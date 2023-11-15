/**
 * This script transforms the access log partition of two hours ago into the Apache parquet format.
 * Taken and adjusted from https://github.com/aws-samples/amazon-cloudfront-access-logs-queries/blob/mainline/functions/transformPartition.js.
 */
import {StartQueryExecutionCommand} from '@aws-sdk/client-athena';
import {executeAndAwaitResponse} from './util';
import type {ColumnTransformationRules, TransformPartitionEvent} from './types';

const workgroup = process.env.WORKGROUP;
if (!workgroup) {
  throw new Error('Required environment variable WORKGROUP missing!');
}
const database = process.env.DATABASE;
if (!database) {
  throw new Error('Required environment variable DATABASE missing!');
}
const sourceTable = process.env.SOURCE_TABLE;
if (!sourceTable) {
  throw new Error('Required environment variable SOURCE_TABLE missing!');
}
const targetTable = process.env.TARGET_TABLE;
if (!targetTable) {
  throw new Error('Required environment variable TARGET_TABLE missing!');
}

/**
 * Reducer, that computes the column statements for the insert command. Columns are either selected by their name, or
 * are computed by an expression specified in `columnTransformations`.
 */
const buildQueryColumns = (
  columnTransformations: ColumnTransformationRules,
  previous: string,
  current: string
): string => {
  const columnExpression = Object.keys(columnTransformations).includes(current)
    ? `${columnTransformations[current]} AS ${current}`
    : current;
  return previous.length === 0 ? columnExpression : `${previous}, ${columnExpression}`;
};

/**
 * Entrypoint
 */
const internalHandler = async (event: TransformPartitionEvent) => {
  try {
    const partitionHour = new Date(Date.now() - 120 * 60 * 1000);
    const year = partitionHour.getUTCFullYear();
    const month = (partitionHour.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = partitionHour.getUTCDate().toString().padStart(2, '0');
    const hour = partitionHour.getUTCHours().toString().padStart(2, '0');

    console.log('transforming partition', {year, month, day, hour});

    // apply transformations on certain columns:
    // - obfuscate IPs
    // - optionally filter cookies
    const selectExpr = event.columnNames.reduce(
      (previous, current) => buildQueryColumns(event.columnTransformations, previous, current),
      ''
    );

    const command = new StartQueryExecutionCommand({
      QueryString: `
        INSERT INTO ${database}.${targetTable} (${event.columnNames.join(',')})
        SELECT ${selectExpr}
        FROM ${database}.${sourceTable}
        WHERE year = '${year}'
          AND month = '${month}'
          AND day = '${day}'
          AND hour = '${hour}';`,
      WorkGroup: workgroup,
      QueryExecutionContext: {Database: database},
    });

    if (await executeAndAwaitResponse(command, false)) {
      console.log('successfully transformed partition', {year, month, day, hour});
    }
  } catch (error) {
    console.error('### unexpected runtime error ###', error);
  }
};

export const handler = internalHandler;
