import {IBucket} from "aws-cdk-lib/aws-s3";
import {Duration, Stack} from "aws-cdk-lib";
import {AppStackProps} from "./app-stack-props";
import {Architecture, Code, LayerVersion, Runtime, Function} from "aws-cdk-lib/aws-lambda";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {Construct} from "constructs";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import * as path from "path";

/**
 * Defines the props required for the {@see NuxtAppAssetsCleanupStack}.
 */
export interface NuxtAppAssetsCleanupProps extends AppStackProps {
    /**
     * The S3 bucket where the static assets of the Nuxt app are located.
     */
    readonly staticAssetsBucket: IBucket;
}

/**
 * Creates a scheduled lambda function that deletes outdated static assets of the Nuxt app from S3
 * to keep it nice without any outdated files that aren't used anymore.
 */
export class NuxtAppAssetsCleanupStack extends Stack {

    /**
     * The identifier prefix of the resources created by the stack.
     *
     * @private
     */
    private readonly resourceIdPrefix: string;

    /**
     * A reference to the created lambda function that cleanups the outdated static assets of the Nuxt app.
     *
     * @private
     */
    private readonly lambdaFunction: Function;

    constructor(scope: Construct, id: string, props: NuxtAppAssetsCleanupProps) {
        super(scope, id, props);

        this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;
        this.lambdaFunction = this.createLambdaFunction(props);
        this.createRule(props);
    }

    /**
     * Creates the lambda function that cleanups the outdated static assets of the Nuxt app.
     *
     * @param props
     * @private
     */
    private createLambdaFunction(props: NuxtAppAssetsCleanupProps): Function {
        const functionName: string = `${this.resourceIdPrefix}-function`;

        const result: Function = new Function(this, functionName, {
            functionName: functionName,
            runtime: Runtime.NODEJS_14_X,
            architecture: Architecture.ARM_64,
            layers: [this.createNodeModulesLayer()],
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../functions/assets_cleanup/build/app')),
            timeout: Duration.minutes(1),
            memorySize: 128,
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                STATIC_ASSETS_BUCKET: props.staticAssetsBucket.bucketName,
                ENVIRONMENT: props.environment,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                NODE_OPTIONS: '--enable-source-maps',
            },
        });

        // grant function access to S3 bucket
        props.staticAssetsBucket.grantRead(result);
        props.staticAssetsBucket.grantDelete(result);

        return result;
    }

    /**
     * Creates a lambda layer for the cleanup function that holds the required node_modules.
     *
     * @private
     */
    private createNodeModulesLayer(): LayerVersion {
        return new LayerVersion(this, `${this.resourceIdPrefix}-layer`, {
            layerVersionName: `${this.resourceIdPrefix}-layer`,
            code: Code.fromAsset(path.join(__dirname, '../functions/assets_cleanup/build/layer')),
            compatibleRuntimes: [Runtime.NODEJS_14_X],
        });
    }

    /**
     * Creates a scheduled rule that runs every tuesday at 03:30 AM GMT to trigger
     * our cleanup lamda function.
     *
     * @param props
     * @private
     */
    private createRule(props: NuxtAppAssetsCleanupProps): void {
        new Rule(this, `${this.resourceIdPrefix}-scheduler-rule`, {
            ruleName: `${this.resourceIdPrefix}-scheduler`,
            description: `Triggers a cleanup of the outdated static assets at the ${props.staticAssetsBucket.bucketName} S3 bucket.`,
            enabled: true,
            schedule: Schedule.cron({weekDay: '3', hour: '3', minute: '30'}),
            targets: [new LambdaFunction(this.lambdaFunction)],
        });
    }
}