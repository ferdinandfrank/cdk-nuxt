import {Bucket, EventType, NotificationKeyFilter} from 'aws-cdk-lib/aws-s3';
import {Construct} from 'constructs';
import {CfnWorkGroup} from 'aws-cdk-lib/aws-athena';
import {CloudFrontAccessLogsByDateTable} from './CloudFrontAccessLogsByDateTable';
import {AccessLogsParquetTable} from './AccessLogsParquetTable';
import {Architecture, Code, Function, LayerVersion, Runtime} from 'aws-cdk-lib/aws-lambda';
import {Rule, RuleTargetInput, Schedule} from 'aws-cdk-lib/aws-events';
import {AssetHashType, CfnTag, Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Column, Database} from '@aws-cdk/aws-glue-alpha';
import {S3EventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import {RetentionDays} from 'aws-cdk-lib/aws-logs';
import {Effect, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {LambdaFunction} from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';
import {AccessLogsAnalysisProps} from "./AccessLogsAnalysisProps";
import {ColumnTransformationRules} from "../../functions/access-logs-analysis/partitioning/types";
import {execSync} from "node:child_process";
import * as fs from "fs";

/**
 * Provides the AWS resources to analyze access logs. This construct is derived from the official AWS sample
 * CloudFormation stack:
 * {@link https://github.com/aws-samples/amazon-cloudfront-access-logs-queries/blob/mainline/template.yaml}
 */
export abstract class AccessLogsAnalysis extends Construct {

    protected static readonly ACCESS_LOGS_FOLDER_UNPROCESSED = 'unprocessed';
    protected static readonly ACCESS_LOGS_FOLDER_GROUPED_BY_DATE = 'by-date';
    protected static readonly ACCESS_LOGS_FOLDER_TRANSFORMED = 'transformed';
    protected static readonly ACCESS_LOGS_FOLDER_ATHENA_RESULTS = 'athena-query-results';

    protected readonly resourceIdPrefix: string;
    protected readonly bucket: Bucket;
    protected readonly workgroup: CfnWorkGroup;
    protected readonly database: Database;
    protected readonly accessLogsByDateTable: CloudFrontAccessLogsByDateTable;
    protected readonly accessLogsParquetTable: AccessLogsParquetTable;
    protected readonly groupByDateLayer: LayerVersion;
    protected readonly groupByDateLambda: Function;
    protected readonly partitioningLayer: LayerVersion;
    protected readonly createPartitionLambda: Function;
    protected readonly transformPartitionLambda: Function;
    protected readonly createPartitionsScheduler: Rule;
    protected readonly transformPartitionsScheduler: Rule;

    protected constructor(scope: Construct, id: string, props: AccessLogsAnalysisProps) {
        super(scope, id);
        this.resourceIdPrefix = props.resourcePrefix;
        this.bucket = props.bucket;
        this.setupLifecycleRules(props);
        this.workgroup = this.createWorkgroup();
        this.database = this.createGlueDatabase();
        this.accessLogsByDateTable = this.createAccessLogsByDateTable();
        this.accessLogsParquetTable = this.createAccessLogsParquetTable();
        this.groupByDateLayer = this.createGroupByDateLayer();
        this.groupByDateLambda = this.createGroupByDateLambda();
        this.partitioningLayer = this.createPartitioningLayer();
        this.createPartitionLambda = this.createCreatePartitionLambda();
        this.transformPartitionLambda = this.createTransformPartitionLambda();
        this.createPartitionsScheduler = this.createCreatePartitionsScheduler();
        this.transformPartitionsScheduler = this.createTransformPartitionsScheduler(props);
    }

    private setupLifecycleRules(props: AccessLogsAnalysisProps): void {
        // cleanup raw and partitioned access logs after a configurable time range

        this.bucket.addLifecycleRule({
            id: `${this.resourceIdPrefix}-cleanup-unprocessed`,
            prefix: `${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_UNPROCESSED}/*`,
            expiration: props.expireRawLogsAfter ?? Duration.days(7),
        });

        this.bucket.addLifecycleRule({
            id: `${this.resourceIdPrefix}-cleanup-grouped`,
            prefix: `${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_GROUPED_BY_DATE}/*`,
            expiration: props.expireIntermediateLogsAfter ?? Duration.days(7),
        });

        this.bucket.addLifecycleRule({
            id: `${this.resourceIdPrefix}-cleanup-transformed`,
            prefix: `${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_TRANSFORMED}/*`,
            expiration: props.expireTransformedLogsAfter ?? Duration.days(180),
        });

        /* CHECKME: delete query results after 1 week
        this.bucket.addLifecycleRule({
          id: `${this.resourceIdPrefix}-cleanup-query-results`,
          prefix: `${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_ATHENA_RESULTS}/*`,
          expiration: Duration.days(7),
        });
        */
    }

    private createWorkgroup(): CfnWorkGroup {
        const workgroupName = `${this.resourceIdPrefix}-workgroup`;

        // due to a current bug, the tags are not automatically assigned to the workgroup
        // note, that the keys must be converted to lower case
        const tags: CfnTag[] = Stack.of(this)
            .tags.renderTags()
            .map((tag: { Key: string; Value: string }) => ({key: tag.Key, value: tag.Value}));

        return new CfnWorkGroup(this, workgroupName, {
            name: workgroupName,
            recursiveDeleteOption: true,
            workGroupConfiguration: {
                publishCloudWatchMetricsEnabled: false,
                resultConfiguration: {
                    outputLocation: `s3://${this.bucket.bucketName}/${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_ATHENA_RESULTS}`,
                },
                enforceWorkGroupConfiguration: true
            },
            tags,
        });
    }

    private createGlueDatabase(): Database {
        const databaseName = `${this.resourceIdPrefix}-database`;
        return new Database(this, databaseName, {
            // Athena doesn't support dashes in database/table names
            databaseName: databaseName.replace(/-/g, '_'),
        });
    }

    protected abstract createAccessLogsByDateTable(): CloudFrontAccessLogsByDateTable;

    protected abstract createAccessLogsParquetTable(): CloudFrontAccessLogsByDateTable;

    private createGroupByDateLayer(): LayerVersion {
        const layerVersionName = `${this.resourceIdPrefix}-group-by-date-dependencies`;
        const functionDirPath = path.join(__dirname, '../../functions/access-logs-analysis/group-by-date');

        return new LayerVersion(this, layerVersionName, {
            layerVersionName,
            compatibleArchitectures: [Architecture.ARM_64, Architecture.X86_64],
            compatibleRuntimes: [Runtime.NODEJS_18_X, Runtime.NODEJS_20_X],
            code: Code.fromAsset(functionDirPath, {
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    command: ['sh', '-c', 'echo "Docker build not supported. Please install yarn."'],
                    image: Runtime.NODEJS_20_X.bundlingImage,
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('yarn install', {
                                    cwd: functionDirPath
                                });
                            } catch {
                                return false;
                            }

                            fs.cpSync(`${functionDirPath}/node_modules`, `${outputDir}/nodejs/node_modules`, {
                                recursive: true,
                            });
                            return true
                        },
                    }
                }
            }),
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    private createPartitioningLayer(): LayerVersion {
        const layerVersionName = `${this.resourceIdPrefix}-partitioning-dependencies`;
        const functionDirPath = path.join(__dirname, '../../functions/access-logs-analysis/partitioning');

        return new LayerVersion(this, layerVersionName, {
            layerVersionName,
            compatibleArchitectures: [Architecture.ARM_64, Architecture.X86_64],
            compatibleRuntimes: [Runtime.NODEJS_18_X, Runtime.NODEJS_20_X],
            code: Code.fromAsset(functionDirPath, {
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    command: ['sh', '-c', 'echo "Docker build not supported. Please install yarn."'],
                    image: Runtime.NODEJS_20_X.bundlingImage,
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('yarn install', {
                                    cwd: functionDirPath
                                });
                            } catch {
                                return false;
                            }
                            fs.cpSync(`${functionDirPath}/node_modules`, `${outputDir}/nodejs/node_modules`, {
                                recursive: true,
                            });
                            return true
                        },
                    }
                }
            }),
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }

    /**
     * A Lambda function to be triggered whenever a new access log is created.
     * It moves the raw access logs into a sub folder hierarchy by year, month, day and hour.
     */
    private createGroupByDateLambda(): Function {
        const functionName = `${this.resourceIdPrefix}-group-by-date`;
        const functionDirPath = path.join(__dirname, '../../functions/access-logs-analysis/group-by-date');

        const lambda = new Function(this, functionName, {
            functionName,
            architecture: Architecture.ARM_64,
            runtime: Runtime.NODEJS_20_X,
            code: Code.fromAsset(functionDirPath, {
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    command: ['sh', '-c', 'echo "Docker build not supported. Please install yarn."'],
                    image: Runtime.NODEJS_20_X.bundlingImage,
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('yarn install && yarn build', {
                                    cwd: functionDirPath
                                });
                            } catch {
                                return false;
                            }
                            fs.cpSync(`${functionDirPath}/build/app`, outputDir, {
                                recursive: true
                            });
                            return true
                        },
                    }
                }
            }),
            memorySize: 512,
            timeout: Duration.seconds(20),
            handler: 'index.handler',
            layers: [this.groupByDateLayer],
            events: [
                new S3EventSource(this.bucket, {
                    events: [EventType.OBJECT_CREATED],
                    filters: [this.getUnprocessedObjectsFilter()],
                }),
            ],
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                NODE_OPTIONS: '--enable-source-maps',
                TARGET_FOLDER: AccessLogsAnalysis.ACCESS_LOGS_FOLDER_GROUPED_BY_DATE,
                RAW_ACCESS_LOG_FILE_PATTERN: this.getRawAccessLogFilePattern().source,
            },
        });

        this.bucket.grantReadWrite(lambda);
        this.bucket.grantDelete(lambda, `${AccessLogsAnalysis.ACCESS_LOGS_FOLDER_UNPROCESSED}/*`);

        return lambda;
    }

    protected abstract getUnprocessedObjectsFilter(): NotificationKeyFilter;

    /** The pattern to identify unprocessed access logs depends on the producing source */
    protected abstract getRawAccessLogFilePattern(): RegExp;

    /**
     * Creates a new partition for the upcoming hour in the access log database.
     */
    private createCreatePartitionLambda(): Function {
        const functionName = `${this.resourceIdPrefix}-create-part`;
        const functionDirPath = path.join(__dirname, '../../functions/access-logs-analysis/partitioning');

        const lambda = new Function(this, functionName, {
            functionName,
            architecture: Architecture.ARM_64,
            runtime: Runtime.NODEJS_20_X,
            code: Code.fromAsset(functionDirPath, {
                exclude: ['transform-partition*', '*.d.ts'],
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    command: ['sh', '-c', 'echo "Docker build not supported. Please install yarn."'],
                    image: Runtime.NODEJS_20_X.bundlingImage,
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('yarn install && yarn build', {
                                    cwd: functionDirPath
                                });
                            } catch {
                                return false;
                            }
                            fs.cpSync(`${functionDirPath}/build/app`, outputDir, {
                                recursive: true
                            });
                            return true
                        },
                    }
                }
            }),
            memorySize: 128,
            timeout: Duration.seconds(20),
            handler: 'create-partition.handler',
            layers: [this.partitioningLayer],
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                NODE_OPTIONS: '--enable-source-maps',
                WORKGROUP: this.workgroup.name,
                DATABASE: this.database.databaseName,
                TABLE: this.accessLogsByDateTable.tableName,
            },
        });

        // grant access to S3 bucket and to execute Athena queries which create new partitions
        this.bucket.grantReadWrite(lambda);
        lambda.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'athena:StartQueryExecution',
                    'athena:GetQueryExecution',
                    'glue:CreateDatabase',
                    'glue:CreatePartition',
                    'glue:GetDatabase',
                    'glue:GetTable',
                    'glue:BatchCreatePartition',
                ],
                resources: ['*'],
            })
        );

        return lambda;
    }

    /**
     * Transforms partitions from the Hive format to Parquet.
     */
    private createTransformPartitionLambda(): Function {
        const functionName = `${this.resourceIdPrefix}-transform-part`;

        const lambda = new Function(this, functionName, {
            functionName,
            architecture: Architecture.ARM_64,
            runtime: Runtime.NODEJS_20_X,
            code: Code.fromAsset(path.join(__dirname, '../../functions/access-logs-analysis/partitioning/build/app'), {
                exclude: ['create-partition*', '*.d.ts'],
                assetHashType: AssetHashType.OUTPUT,
                bundling: {
                    image: Runtime.NODEJS_20_X.bundlingImage,
                    local: {
                        tryBundle(outputDir: string): boolean {
                            try {
                                execSync('cd ' + path.join(__dirname, '../../functions/access-logs-analysis/partitioning') + ' && yarn install && yarn build');
                            } catch {
                                return false;
                            }

                            fs.cpSync(path.join(__dirname, '../../functions/access-logs-analysis/partitioning/build/app'), outputDir, {
                                recursive: true
                            });
                            return true
                        },
                    }
                }
            }),
            memorySize: 128,
            timeout: Duration.seconds(20),
            handler: 'transform-partition.handler',
            layers: [this.partitioningLayer],
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                NODE_OPTIONS: '--enable-source-maps',
                WORKGROUP: this.workgroup.name,
                DATABASE: this.database.databaseName,
                SOURCE_TABLE: this.accessLogsByDateTable.tableName,
                TARGET_TABLE: this.accessLogsParquetTable.tableName,
            },
        });

        // grant access to S3 bucket and to execute Athena queries which create new partitions
        this.bucket.grantReadWrite(lambda);
        lambda.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    'athena:StartQueryExecution',
                    'athena:GetQueryExecution',
                    'glue:CreateDatabase',
                    'glue:CreatePartition',
                    'glue:GetDatabase',
                    'glue:GetTable',
                    'glue:BatchCreatePartition',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                    'glue:CreateTable',
                    'glue:DeleteTable',
                    'glue:DeletePartition',
                ],
                resources: ['*'],
            })
        );

        return lambda;
    }

    private createCreatePartitionsScheduler(): Rule {
        const ruleName = `${this.resourceIdPrefix}-create-part-sched`;
        return new Rule(this, ruleName, {
            ruleName,
            schedule: Schedule.cron({minute: '55'}),
            targets: [new LambdaFunction(this.createPartitionLambda, {retryAttempts: 10})],
        });
    }

    private createTransformPartitionsScheduler(props: AccessLogsAnalysisProps): Rule {
        const ruleName = `${this.resourceIdPrefix}-transform-part-sched`;
        return new Rule(this, ruleName, {
            ruleName,
            schedule: Schedule.cron({minute: '1'}),
            targets: [
                new LambdaFunction(this.transformPartitionLambda, {
                    event: this.getTransformPartitionInvocationProps(props),
                    retryAttempts: 10,
                }),
            ],
        });
    }

    private getTransformPartitionInvocationProps(props: AccessLogsAnalysisProps): RuleTargetInput {
        return RuleTargetInput.fromObject({
            columnNames: [
                ...this.accessLogsParquetTable.columns,
                ...(this.accessLogsParquetTable.partitionKeys as Column[]),
            ].map(column => column.name),
            columnTransformations: this.getColumnTransformationRules(props),
        });
    }

    /**
     * Needs to return the log source specific column transformation rules
     * (e.g. to anonymize IP addresses).
     */
    protected abstract getColumnTransformationRules(props: AccessLogsAnalysisProps): ColumnTransformationRules;
}
