import {AccessLogsTableConfig} from './AccessLogsTableConfig';
import {
  ClassificationString,
  DataFormat,
  InputFormat,
  OutputFormat,
  SerializationLibrary,
  Table
} from "@aws-cdk/aws-glue-alpha";
import {Construct} from "constructs";
import {CfnTable} from "aws-cdk-lib/aws-glue";
import {type AccessLogsTableProps} from "./AccessLogsTableProps";

/**
 * Represents the temporary table, containing the access logs of the S3 sub folder hierarchy.
 */
export class CloudFrontAccessLogsByDateTable extends Table {
  constructor(scope: Construct, id: string, props: AccessLogsTableProps) {
    super(scope, id, {
      database: props.database,
      // Athena doesn't support dashes in database/table names
      tableName: id.replace(/-/g, '_'),
      description: 'Represents the S3 bucket folder containing the sub folders by date',
      compressed: true,
      partitionKeys: AccessLogsTableConfig.getPartitionKeys(),
      columns: AccessLogsTableConfig.getTableColumns(),
      dataFormat: new DataFormat({
        outputFormat: OutputFormat.HIVE_IGNORE_KEY_TEXT,
        inputFormat: InputFormat.TEXT,
        serializationLibrary: SerializationLibrary.LAZY_SIMPLE,
        classificationString: ClassificationString.CSV,
      }),
      bucket: props.accessLogsBucket,
      s3Prefix: props.folderName,
      storedAsSubDirectories: true,
    });

    // these properties are currently not supported by the V2 alpha construct
    const cfnTable = this.node.defaultChild as CfnTable;
    cfnTable.addPropertyOverride('TableInput.Parameters.skip\\.header\\.line\\.count', '2');
    cfnTable.addPropertyOverride('TableInput.StorageDescriptor.SerdeInfo.Parameters.field\\.delim', '\t');
    cfnTable.addPropertyOverride('TableInput.StorageDescriptor.SerdeInfo.Parameters.serialization\\.format', '\t');
  }
}
