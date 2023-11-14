import {Bucket} from "aws-cdk-lib/aws-s3";
import {Duration} from "aws-cdk-lib";

export interface AccessLogsAnalysisProps {
    /**
     * Expression to prepend to any created resources
     */
    readonly resourcePrefix: string;

    readonly bucket: Bucket;

    /**
     * Logs in the raw table will be deleted after this period. Default: 7 days.
     */
    readonly expireRawLogsAfter?: Duration;

    /**
     * Logs in the intermediate date group table will be deleted after this period. Default: 7 days.
     */
    readonly expireIntermediateLogsAfter?: Duration;

    /**
     * Logs in the transformed table will be deleted after this period. Default: 180 days.
     */
    readonly expireTransformedLogsAfter?: Duration;
}