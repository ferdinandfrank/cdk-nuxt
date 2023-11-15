import {Database} from "@aws-cdk/aws-glue-alpha";
import {Bucket} from "aws-cdk-lib/aws-s3";

export interface AccessLogsTableProps {
    readonly database: Database;
    readonly accessLogsBucket: Bucket;
    readonly folderName: string;
}