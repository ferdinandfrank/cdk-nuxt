/**
 * Provides the column descriptions for both of the access log tables.
 */
import {Column, Schema} from '@aws-cdk/aws-glue-alpha';

export class AccessLogsTableConfig {
  public static getPartitionKeys(): Column[] {
    return [
      {
        name: 'year',
        type: Schema.STRING,
      },
      {
        name: 'month',
        type: Schema.STRING,
      },
      {
        name: 'day',
        type: Schema.STRING,
      },
      {
        name: 'hour',
        type: Schema.STRING,
      },
    ];
  }

  public static getTableColumns(): Column[] {
    return [
      {
        name: 'date',
        type: Schema.DATE,
      },
      {
        name: 'time',
        type: Schema.STRING,
      },
      {
        name: 'location',
        type: Schema.STRING,
      },
      {
        name: 'bytes',
        type: Schema.BIG_INT,
      },
      {
        name: 'request_ip',
        type: Schema.STRING,
      },
      {
        name: 'method',
        type: Schema.STRING,
      },
      {
        name: 'host',
        type: Schema.STRING,
      },
      {
        name: 'uri',
        type: Schema.STRING,
      },
      {
        name: 'status',
        type: Schema.INTEGER,
      },
      {
        name: 'referrer',
        type: Schema.STRING,
      },
      {
        name: 'user_agent',
        type: Schema.STRING,
      },
      {
        name: 'query_string',
        type: Schema.STRING,
      },
      {
        name: 'cookie',
        type: Schema.STRING,
      },
      {
        name: 'result_type',
        type: Schema.STRING,
      },
      {
        name: 'request_id',
        type: Schema.STRING,
      },
      {
        name: 'host_header',
        type: Schema.STRING,
      },
      {
        name: 'request_protocol',
        type: Schema.STRING,
      },
      {
        name: 'request_bytes',
        type: Schema.BIG_INT,
      },
      {
        name: 'time_taken',
        type: Schema.FLOAT,
      },
      {
        name: 'xforwarded_for',
        type: Schema.STRING,
      },
      {
        name: 'ssl_protocol',
        type: Schema.STRING,
      },
      {
        name: 'ssl_cipher',
        type: Schema.STRING,
      },
      {
        name: 'response_result_type',
        type: Schema.STRING,
      },
      {
        name: 'http_version',
        type: Schema.STRING,
      },
      {
        name: 'fle_status',
        type: Schema.STRING,
      },
      {
        name: 'fle_encrypted_fields',
        type: Schema.INTEGER,
      },
      {
        name: 'c_port',
        type: Schema.INTEGER,
      },
      {
        name: 'time_to_first_byte',
        type: Schema.FLOAT,
      },
      {
        name: 'x_edge_detailed_result_type',
        type: Schema.STRING,
      },
      {
        name: 'sc_content_type',
        type: Schema.STRING,
      },
      {
        name: 'sc_content_len',
        type: Schema.BIG_INT,
      },
      {
        name: 'sc_range_start',
        type: Schema.BIG_INT,
      },
      {
        name: 'sc_range_end',
        type: Schema.BIG_INT,
      },
    ];
  }
}
