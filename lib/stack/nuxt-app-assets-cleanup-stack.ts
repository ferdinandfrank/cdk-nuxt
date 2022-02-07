import {IBucket} from "aws-cdk-lib/aws-s3";
import {Duration, Stack} from "aws-cdk-lib";
import {AppStackProps} from "./app-stack-props";
import {Architecture, Code, LayerVersion, Runtime, Function} from "aws-cdk-lib/aws-lambda";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {Construct} from "constructs";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import * as path from "path";

export interface NuxtAppAssetsCleanupProps extends AppStackProps {
    readonly staticAssetsBucket: IBucket;
    readonly sentryDsn: string;
}

/**
 * Contains a scheduled lambda function, that deletes outdated static assets of the PWA from S3.
 */
export class NuxtAppAssetsCleanupStack extends Stack {

    private readonly resourceIdPrefix: string;
    private staticAssetsBucket: IBucket;
    private readonly layer: LayerVersion;
    private readonly lambdaFunction: Function;
    private scheduledRule: Rule;

    constructor(scope: Construct, id: string, props: NuxtAppAssetsCleanupProps) {
        super(scope, id, props);

        this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;
        this.staticAssetsBucket = props.staticAssetsBucket;
        this.layer = this.createLayer();
        this.lambdaFunction = this.createLambdaFunction(props);
        this.scheduledRule = this.createRule(props);
    }

    private createLayer(): LayerVersion {
        const layerName = `${this.resourceIdPrefix}-layer`;

        return new LayerVersion(this, layerName, {
            layerVersionName: layerName,
            code: Code.fromAsset(path.join(__dirname, 'functions/assets_cleanup/build/layer')),
            compatibleRuntimes: [Runtime.NODEJS_14_X],
        });
    }

    private createLambdaFunction(props: NuxtAppAssetsCleanupProps): Function {
        const functionName: string = `${this.resourceIdPrefix}-function`;

        const result: Function = new Function(this, functionName, {
            functionName: functionName,
            runtime: Runtime.NODEJS_14_X,
            architecture: Architecture.ARM_64,
            layers: [this.layer],
            handler: `index.handler`,
            code: Code.fromAsset(path.join(__dirname, 'functions/assets_cleanup/build/app')),
            timeout: Duration.minutes(1),
            memorySize: 128,
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                STATIC_ASSETS_BUCKET: this.staticAssetsBucket.bucketName,
                SENTRY_DSN: props.sentryDsn,
                ENVIRONMENT: props.environment,
                AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                NODE_OPTIONS: '--enable-source-maps',
            },
        });

        // grant function access to S3 bucket
        this.staticAssetsBucket.grantRead(result);
        this.staticAssetsBucket.grantDelete(result);

        return result;
    }

    private createRule(props: NuxtAppAssetsCleanupProps): Rule {
        const ruleName = `${this.resourceIdPrefix}-scheduled-rule`;

        // Schedule every tuesday at 03:30 AM GMT
        return new Rule(this, ruleName, {
            ruleName,
            description: `Triggers a cleanup of outdated static assets of the ${props.project} app.`,
            enabled: true,
            schedule: Schedule.cron({weekDay: '3', hour: '3', minute: '30'}),
            targets: [new LambdaFunction(this.lambdaFunction)],
        });
    }
}