import {AccessLogsTableConfig} from './AccessLogsTableConfig';
import {DataFormat, Table} from '@aws-cdk/aws-glue-alpha';
import {Construct} from 'constructs';
import {AccessLogsTableProps} from "./AccessLogsTableProps";

/**
 * Contains the transformed access logs in Apache Parquet format (which is cheaper to query).
 */
export class AccessLogsParquetTable extends Table {
  constructor(scope: Construct, id: string, props: AccessLogsTableProps) {
    super(scope, id, {
      database: props.database,
      // Athena doesn't support dashes in database/table names
      tableName: id.replace(/-/g, '_'),
      columns: AccessLogsTableConfig.getTableColumns(),
      bucket: props.accessLogsBucket,
      description: 'Contains the access logs transformed to Apache Parquet format',
      partitionKeys: AccessLogsTableConfig.getPartitionKeys(),
      dataFormat: DataFormat.PARQUET,
      s3Prefix: props.folderName,
    });
  }
}
