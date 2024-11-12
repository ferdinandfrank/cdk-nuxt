import {Construct} from 'constructs';
import {type AccessLogsAnalysisProps} from "./AccessLogsAnalysisProps";
import {type ColumnTransformationRules} from "../../functions/access-logs-analysis/partitioning/types";
import {AccessLogsAnalysis} from "./AccessLogsAnalysis";
import {type NotificationKeyFilter} from "aws-cdk-lib/aws-s3";
import {CloudFrontAccessLogsByDateTable} from "./CloudFrontAccessLogsByDateTable";
import {AccessLogsParquetTable} from "./AccessLogsParquetTable";

interface CloudFrontAccessLogsAnalysisProps extends AccessLogsAnalysisProps {
    readonly accessLogCookies?: string[];
}

/**
 * Provides the AWS resources to analyze CloudFront access logs.
 */
export class CloudFrontAccessLogsAnalysis extends AccessLogsAnalysis {

    constructor(scope: Construct, id: string, props: CloudFrontAccessLogsAnalysisProps) {
        super(scope, id, props);
    }

    /**
     * The trailing slash is automatically added by CloudFront
     */
    public static getLogFilePrefix(): string {
        return AccessLogsAnalysis.ACCESS_LOGS_FOLDER_UNPROCESSED;
    }

    protected getUnprocessedObjectsFilter(): NotificationKeyFilter {
        return {prefix: `${CloudFrontAccessLogsAnalysis.getLogFilePrefix()}/`, suffix: '.gz'};
    }

    /**
     * <p>Format: '{prefix/}{cdn_id}.{year}-{month}-{day}-{hour}.{random_id}.gz' (slash after prefix auto-appended)</p>
     * <p>Example: 'unprocessed/E24DN41CDZRLM8.2022-07-20-13.d94543d0.gz'</p>
     */
    protected getRawAccessLogFilePattern(): RegExp {
        return /[\w\/]+\.(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})-(?<hour>\d{2})\.\w+\.gz/;
    }

    protected createAccessLogsByDateTable(): CloudFrontAccessLogsByDateTable {
        return new CloudFrontAccessLogsByDateTable(this, `${this.resourceIdPrefix}-table-by-date`, {
            accessLogsBucket: this.bucket,
            database: this.database,
            folderName: AccessLogsAnalysis.ACCESS_LOGS_FOLDER_GROUPED_BY_DATE,
        });
    }

    protected createAccessLogsParquetTable(): AccessLogsParquetTable {
        return new AccessLogsParquetTable(this, `${this.resourceIdPrefix}-table-transformed`, {
            accessLogsBucket: this.bucket,
            database: this.database,
            folderName: AccessLogsAnalysis.ACCESS_LOGS_FOLDER_TRANSFORMED,
        });
    }

    /**
     * Returns rules to
     * <ul>replaces the last part of an IP address (IPv4 and IPv6)</ul>
     * <ul>optionally remove all cookies, that are not whitelisted</ul>
     * <ul>optionally decode quotes in cookies</ul>
     */
    protected getColumnTransformationRules(props: CloudFrontAccessLogsAnalysisProps): ColumnTransformationRules {
        return {
            request_ip: "regexp_replace(request_ip, '(.*\\.|:).*', '$1xxx')",
            cookie: props.accessLogCookies
                ? `replace( array_join( regexp_extract_all( cookie, '(${props.accessLogCookies.join(
                    '|'
                )})=[^;]+' ), ';' ), '%2522', '"' )`
                : undefined,
        };
    }
}
