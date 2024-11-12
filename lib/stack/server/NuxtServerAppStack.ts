import {Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    type BehaviorOptions,
    CacheCookieBehavior,
    CachedMethods,
    CacheHeaderBehavior,
    CachePolicy,
    CacheQueryStringBehavior,
    Distribution, HttpVersion,
    type IOriginAccessIdentity,
    OriginAccessIdentity,
    OriginProtocolPolicy,
    PriceClass,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {Architecture, Code, Function, Runtime, Tracing} from "aws-cdk-lib/aws-lambda";
import {
    BlockPublicAccess,
    Bucket,
    BucketAccessControl,
    BucketEncryption,
    ObjectOwnership
} from "aws-cdk-lib/aws-s3";
import {AaaaRecord, ARecord, HostedZone, type IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {BucketDeployment, Source, StorageClass} from "aws-cdk-lib/aws-s3-deployment";
import {HttpOrigin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {HttpMethod} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {getNuxtAppStaticAssetConfigs, type StaticAssetConfig} from "../NuxtAppStaticAssets";
import * as fs from "fs";
import {Rule, RuleTargetInput, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import * as path from "path";
import {writeFileSync} from "fs";
import {type NuxtServerAppStackProps} from "./NuxtServerAppStackProps";
import {CloudFrontAccessLogsAnalysis} from "../access-logs-analysis/CloudFrontAccessLogsAnalysis";
import {HttpLambdaIntegration} from "aws-cdk-lib/aws-apigatewayv2-integrations";
import {DomainName, EndpointType, HttpApi, SecurityPolicy} from "aws-cdk-lib/aws-apigatewayv2";

/**
 * CDK stack to deploy a dynamic Nuxt app (target=server) on AWS with Lambda, ApiGateway, S3 and CloudFront.
 */
export class NuxtServerAppStack extends Stack {

    /**
     * The identifier prefix of the resources created by the stack.
     *
     * @private
     */
    private readonly resourceIdPrefix: string;

    /**
     * The identifier for the current deployment that is used to tag the static assets of the deployment
     * to later be able to clean up outdated assets.
     *
     * @private
     */
    private readonly deploymentRevision: string;

    /**
     * The identity to use for accessing the deployment assets on S3.
     *
     * @private
     */
    private readonly cdnAccessIdentity: IOriginAccessIdentity;

    /**
     * The S3 bucket where the deployment assets gets stored.
     */
    public staticAssetsBucket: Bucket;

    /**
     * The S3 bucket where the access logs of the CloudFront distribution gets stored.
     */
    public accessLogsBucket: Bucket|undefined;

    /**
     * The S3 bucket where the sitemap assets gets stored.
     */
    public sitemapBucket: Bucket|undefined;

    /**
     * The Lambda function to render the Nuxt app on the server side.
     *
     * @private
     */
    private readonly appLambdaFunction: Function;

    /**
     * The Lambda function that cleanups the outdated static assets of the Nuxt app.
     *
     * @private
     */
    private readonly cleanupLambdaFunction: Function;

    /**
     * The API gateway to make the Lambda function to render the Nuxt app publicly available.
     *
     * @private
     */
    private apiGateway: HttpApi;

    /**
     * The configs for the static assets of the Nuxt app that shall be publicly available.
     *
     * @private
     */
    private staticAssetConfigs: StaticAssetConfig[];

    /**
     * The CloudFront distribution origin for the API gateway to route incoming requests to the Nuxt Lambda function.
     */
    private httpOrigin: HttpOrigin;

    /**
     * The cache policy for the Nuxt app route behaviors of the CloudFront distribution.
     */
    private appCachePolicy: CachePolicy;

    /**
     * The CloudFront distribution to route incoming requests to the Nuxt Lambda function (via the API gateway)
     * or the S3 assets folder (with caching).
     *
     * @private
     */
    private readonly cdn: Distribution;

    constructor(scope: Construct, id: string, props: NuxtServerAppStackProps) {
        super(scope, id, props);

        this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;

        // Nuxt app resources
        this.deploymentRevision = this.createDeploymentRevision(props);
        this.staticAssetConfigs = getNuxtAppStaticAssetConfigs(props.rootDir ?? '.');
        this.cdnAccessIdentity = this.createCdnAccessIdentity();
        this.staticAssetsBucket = this.createStaticAssetsBucket();

        if (props.enableAccessLogsAnalysis) {
            this.accessLogsBucket = this.createAccessLogsBucket();
            this.createAccessLogsAnalysis(props);
        }

        if (props.enableSitemap) {
            this.sitemapBucket = this.createSitemapBucket();
        }

        this.appLambdaFunction = this.createAppLambdaFunction(props);
        this.apiGateway = this.createApiGateway(props);
        this.httpOrigin = this.createNuxtAppHttpOrigin();
        this.appCachePolicy = this.createNuxtAppCachePolicy(props)
        this.cdn = this.createCloudFrontDistribution(props);
        this.configureDeployments();
        this.createDnsRecords(props);
        this.createAppPingRule(props);

        // Static assets cleanup resources
        this.cleanupLambdaFunction = this.createCleanupLambdaFunction(props);
        this.createCleanupTriggerRule();
    }

    /**
     * Creates the current deployment revision file in the public folder of the Nuxt app to be accessible
     * and returns the current revision.
     */
    private createDeploymentRevision(props: NuxtServerAppStackProps): string {
        const revisionFilePath = `${props.rootDir ?? '.'}/.output/public/app-revision`;
        const appRevision = new Date().toISOString();

        writeFileSync(revisionFilePath, appRevision, {encoding: 'utf-8'});

        return appRevision;
    }

    /**
     * Creates the identity to access the S3 deployment asset files via the CloudFront distribution.
     *
     * @private
     */
    private createCdnAccessIdentity(): IOriginAccessIdentity {
        const originAccessIdentityName = `${this.resourceIdPrefix}-cdn-s3-access`;
        return new OriginAccessIdentity(this, originAccessIdentityName);
    }

    /**
     * Creates the bucket to store the static deployment asset files of the Nuxt app.
     *
     * @private
     */
    private createStaticAssetsBucket(): Bucket {
        const bucketName = `${this.resourceIdPrefix}-assets`;
        const bucket = new Bucket(this, bucketName, {
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            bucketName,
            // The bucket and all of its objects can be deleted, because all the content is managed in this project
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
        });

        bucket.grantReadWrite(this.cdnAccessIdentity);

        return bucket;
    }

    /**
     * Creates the bucket to store the sitemap assets of the Nuxt app.
     *
     * @private
     */
    private createSitemapBucket(): Bucket {
        const bucketName = `${this.resourceIdPrefix}-sitemap`;
        const bucket = new Bucket(this, bucketName, {
            bucketName,
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            encryption: BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            // The bucket and all of its objects can be deleted, because all the content is managed in this project
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        bucket.grantReadWrite(this.cdnAccessIdentity);

        return bucket;
    }

    /**
     * Creates the Lambda function to render the Nuxt app.
     *
     * @private
     */
    private createAppLambdaFunction(props: NuxtServerAppStackProps): Function {
        const funcName = `${this.resourceIdPrefix}-app-function`;

        return new Function(this, funcName, {
            functionName: funcName,
            description: `Renders the ${this.resourceIdPrefix} Nuxt app.`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.ARM_64,
            handler: `${props.entrypoint ?? 'index'}.handler`,
            code: Code.fromAsset(`${props.rootDir ?? '.' }/.output/server`, {
                exclude: ['**.svg', '**.ico', '**.png', '**.jpg', '**.js.map'],
            }),
            timeout: Duration.seconds(10),
            memorySize: props.memorySize ?? 1792,
            logRetention: RetentionDays.ONE_MONTH,
            allowPublicSubnet: false,
            tracing: props.enableTracing ? Tracing.ACTIVE : Tracing.DISABLED,
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
                ...JSON.parse(props.entrypointEnv ?? '{}'),
            },
        });
    }

    /**
     * Creates the Lambda function that cleanups the outdated static assets of the Nuxt app.
     * Note that we use the bundled AWS SDK for Node to avoid the need for a custom layer
     * which restricts the consumer to a specific yarn or npm version.
     */
    private createCleanupLambdaFunction(props: NuxtServerAppStackProps): Function {
        const functionName: string = `${this.resourceIdPrefix}-cleanup-function`;
        const functionDirPath = path.join(__dirname, '../../functions/assets-cleanup');

        const result: Function = new Function(this, functionName, {
            functionName: functionName,
            description: `Auto-deletes the outdated static assets in the ${this.staticAssetsBucket.bucketName} S3 bucket.`,
            runtime: Runtime.NODEJS_20_X,
            architecture: Architecture.ARM_64,
            handler: 'index.handler',
            code: Code.fromAsset(`${functionDirPath}/build/app`, {
                exclude: ['*.d.ts']
            }),
            timeout: Duration.minutes(5),
            memorySize: 128,
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                STATIC_ASSETS_BUCKET: this.staticAssetsBucket.bucketName,
                OUTDATED_ASSETS_RETENTION_DAYS: `${props.outdatedAssetsRetentionDays ?? 30}`,
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

    /**
     * Creates the API gateway to make the Nuxt app render Lambda function publicly available.
     *
     * @private
     */
    private createApiGateway(props: NuxtServerAppStackProps): HttpApi {
        const apiName = `${this.resourceIdPrefix}-api`;
        const lambdaIntegration = new HttpLambdaIntegration(`${this.resourceIdPrefix}-lambda-integration`, this.appLambdaFunction);

        // We want the API gateway to be accessible by the custom domain name.
        // Even though we access the gateway via CloudFront (for auto http to https redirects), this is required
        // to be able to redirect the original 'Host' header to the Nuxt application, if requested.
        const domainName = new DomainName(this, `${this.resourceIdPrefix}-api-domain`, {
            domainName: props.domain,
            certificate: Certificate.fromCertificateArn(this, `${this.resourceIdPrefix}-regional-certificate`, props.regionalTlsCertificateArn),
            endpointType: EndpointType.REGIONAL,
            securityPolicy: SecurityPolicy.TLS_1_2
        });

        const apiGateway = new HttpApi(this, apiName, {
            apiName,
            description: `Connects the ${this.resourceIdPrefix} CloudFront distribution with the ${this.resourceIdPrefix} Lambda function to make it publicly available.`,
            // The app does not allow any cross-origin access by purpose: the app should not be embeddable anywhere
            corsPreflight: undefined,
            defaultIntegration: lambdaIntegration,
            defaultDomainMapping: {
                domainName: domainName
            }
        });

        apiGateway.addRoutes({
            integration: lambdaIntegration,
            path: '/{proxy+}',
            methods: [HttpMethod.GET, HttpMethod.HEAD],
        });

        return apiGateway;
    }

    /**
     * Creates the CloudFront distribution that routes incoming requests to the Nuxt Lambda function (via the API gateway)
     * or the S3 assets folder (with caching).
     *
     * @param props
     * @private
     */
    private createCloudFrontDistribution(props: NuxtServerAppStackProps): Distribution {
        const cdnName = `${this.resourceIdPrefix}-cdn`;

        return new Distribution(this, cdnName, {
            domainNames: [props.domain],
            comment: cdnName,
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018,
            certificate: Certificate.fromCertificateArn(this, `${this.resourceIdPrefix}-global-certificate`, props.globalTlsCertificateArn),
            httpVersion: HttpVersion.HTTP2_AND_3,
            defaultBehavior: this.createNuxtAppRouteBehavior(),
            additionalBehaviors: this.setupCloudFrontRouting(props),
            priceClass: PriceClass.PRICE_CLASS_100, // Use only North America and Europe
            logBucket: this.accessLogsBucket,
            logFilePrefix: props.enableAccessLogsAnalysis ? CloudFrontAccessLogsAnalysis.getLogFilePrefix() : undefined,
            logIncludesCookies: true,
        });
    }

    /**
     * Creates the CloudFront distribution behavior origin to route incoming requests to the Nuxt render Lambda function (via API gateway).
     */
    private createNuxtAppHttpOrigin(): HttpOrigin {
        return new HttpOrigin(`${this.apiGateway.httpApiId}.execute-api.${this.region}.amazonaws.com`, {
            connectionAttempts: 2,
            connectionTimeout: Duration.seconds(2),
            readTimeout: Duration.seconds(10),
            protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        });
    }

    /**
     * Creates a behavior for the CloudFront distribution to route incoming web requests
     * to the Nuxt render Lambda function (via API gateway).
     * Additionally, this automatically redirects HTTP requests to HTTPS.
     */
    private createNuxtAppRouteBehavior(): BehaviorOptions {
        return {
            origin: this.httpOrigin,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            compress: true,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            originRequestPolicy: undefined,
            cachePolicy: this.appCachePolicy
        };
    }

    private setupCloudFrontRouting(props: NuxtServerAppStackProps): Record<string, BehaviorOptions> {
        let routingBehaviours: Record<string, BehaviorOptions> = {};

        // Specific ones first
        if (props.enableApi) {
            routingBehaviours = {...routingBehaviours, ...this.createApiRouteBehavior()};
        }
        if (props.enableSitemap) {
            routingBehaviours = {...routingBehaviours, ...this.createSitemapRouteBehavior()};
        }

        routingBehaviours = {...routingBehaviours, ...this.createStaticAssetsRouteBehavior()};

        return routingBehaviours;
    }

    /**
     * Creates a cache policy for the Nuxt app route behavior of the CloudFront distribution.
     */
    private createNuxtAppCachePolicy(props: NuxtServerAppStackProps): CachePolicy {
        return new CachePolicy(this, `${this.resourceIdPrefix}-cache-policy`, {
            cachePolicyName: `${this.resourceIdPrefix}-cdn-cache-policy`,
            comment: `Defines which request data to pass to the ${this.resourceIdPrefix} origin and how the cache key is calculated.`,
            defaultTtl: Duration.seconds(0),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.days(365),
            queryStringBehavior: props.allowQueryParams?.length ? CacheQueryStringBehavior.allowList(...props.allowQueryParams) : (props.denyQueryParams?.length ? CacheQueryStringBehavior.denyList(...props.denyQueryParams) : CacheQueryStringBehavior.all()),
            headerBehavior: props.allowHeaders?.length ? CacheHeaderBehavior.allowList(...props.allowHeaders) : CacheHeaderBehavior.none(),
            cookieBehavior: props.allowCookies?.length ? CacheCookieBehavior.allowList(...props.allowCookies) : CacheCookieBehavior.none(),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
        });
    }

    /**
     * Creates a behavior for the CloudFront distribution to route matching Nuxt app API requests to the API gateway.
     */
    private createApiRouteBehavior(): Record<string, BehaviorOptions> {
        const apiBehavior: BehaviorOptions = {
            origin: this.httpOrigin,
            compress: true,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: this.appCachePolicy,
            viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY
        };

        const rules: Record<string, BehaviorOptions> = {};
        rules['/api/*'] = apiBehavior;

        return rules;
    }

    /**
     * Creates a behavior for the CloudFront distribution to route matching incoming requests for the static assets
     * to the S3 bucket that holds these static assets.
     *
     * @private
     */
    private createStaticAssetsRouteBehavior(): Record<string, BehaviorOptions> {
        const staticAssetsCacheConfig: BehaviorOptions = {
            origin: new S3Origin(this.staticAssetsBucket, {
                connectionAttempts: 2,
                connectionTimeout: Duration.seconds(3),
                originAccessIdentity: this.cdnAccessIdentity,
            }),
            compress: true,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        };

        const rules: Record<string, BehaviorOptions> = {};
        this.staticAssetConfigs.forEach(asset => {
            rules[`${asset.target}${asset.pattern}`] = staticAssetsCacheConfig
        })

        return rules
    }

    /**
     * Creates a behavior for the CloudFront distribution to route matching incoming requests for the sitemap assets
     * to the S3 bucket that holds these sitemap assets.
     *
     * @private
     */
    private createSitemapRouteBehavior(): Record<string, BehaviorOptions> {
        if (!this.sitemapBucket) {
            throw new Error("Sitemap bucket must exist before creating sitemap route behavior.");
        }

        const sitemapCacheConfig: BehaviorOptions = {
            origin: new S3Origin(this.sitemapBucket, {
                connectionAttempts: 2,
                connectionTimeout: Duration.seconds(3),
                originAccessIdentity: this.cdnAccessIdentity,
            }),
            compress: true,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        };

        const rules: Record<string, BehaviorOptions> = {};
        rules['*sitemap.xml'] = sitemapCacheConfig;
        rules['*sitemap-gone.xml'] = sitemapCacheConfig;
        rules['/sitemaps/*'] = sitemapCacheConfig;

        return rules;
    }

    /**
     * Uploads the static assets of the Nuxt app as defined in {@see getNuxtAppStaticAssetConfigs} to the static assets S3 bucket.
     * In order to enable a zero-downtime deployment with minimal storage load,
     * we deploy the static assets of every deployment into the same folder but mark them with a deployment revision.
     * By doing so, the files of previous deployments are retained to allow clients to continue to work with an older revision
     * but gets cleaned up after a specified period of time via the cleanup Lambda function.
     */
    private configureDeployments(): BucketDeployment[] {
        // Returns a deployment for every configured static asset type to respect the different cache settings
        return this.staticAssetConfigs.filter(asset => fs.existsSync(asset.source)).map((asset, assetIndex) => {
            return new BucketDeployment(this, `${this.resourceIdPrefix}-assets-deployment-${assetIndex}`, {
                sources: [Source.asset(asset.source, {
                    exclude: asset.exclude,
                })],
                destinationBucket: this.staticAssetsBucket,
                destinationKeyPrefix: asset.target.replace(/^\/+/g, ''), // Remove leading slash
                prune: false,
                storageClass: StorageClass.STANDARD,
                exclude: ['*'],
                include: [asset.pattern],
                cacheControl: asset.cacheControl,
                contentType: asset.contentType,
                distribution: asset.invalidateOnChange ? this.cdn : undefined,
                distributionPaths: asset.invalidateOnChange ? [`/${asset.pattern}`] : undefined,
                logRetention: RetentionDays.ONE_DAY,

                metadata: {
                    // Store build revision on every asset to allow cleanup of outdated assets
                    revision: this.deploymentRevision,
                },

                // Some Nuxt applications have a lot of assets to deploy whereby the function might run out of memory.
                // Additionally, a high memory limit might speed up deployments.
                memoryLimit: 1792
            })
        });
    }

    /**
     * Resolves the hosted zone at which the DNS records shall be created to access the Nuxt app on the internet.
     *
     * @param props
     * @private
     */
    private findHostedZone(props: NuxtServerAppStackProps): IHostedZone {
        const domainParts = props.domain.split('.');

        return HostedZone.fromHostedZoneAttributes(this, `${this.resourceIdPrefix}-hosted-zone`, {
            hostedZoneId: props.hostedZoneId,
            zoneName: domainParts[domainParts.length - 1], // Support subdomains
        });
    }

    /**
     * Creates the DNS records to access the Nuxt app on the internet via the custom domain.
     *
     * @param props
     * @private
     */
    private createDnsRecords(props: NuxtServerAppStackProps): void {
        const hostedZone = this.findHostedZone(props);
        const dnsTarget = RecordTarget.fromAlias(new CloudFrontTarget(this.cdn));

        // Create a record for IPv4
        new ARecord(this, `${this.resourceIdPrefix}-ipv4-record`, {
            recordName: props.domain,
            zone: hostedZone,
            target: dnsTarget,
        });

        // Create a record for IPv6
        new AaaaRecord(this, `${this.resourceIdPrefix}-ipv6-record`, {
            recordName: props.domain,
            zone: hostedZone,
            target: dnsTarget,
        });
    }

    /**
     * Creates a scheduled rule to ping the Nuxt app Lambda function every 5 minutes in order to keep it warm
     * and speed up initial SSR requests.
     *
     * @private
     */
    private createAppPingRule(props: NuxtServerAppStackProps): void {
        const fakeApiGatewayEventData = {
            "version": "2.0",
            "routeKey": "GET /{proxy+}",
            "rawPath": "/",
            "rawQueryString": "",
            "headers": {},
            "requestContext": {
                "domainName": props.domain,
                "http": {
                    "method": "GET",
                    "path": "/",
                    "protocol": "HTTP/1.1"
                }
            }
        };

        new Rule(this, `${this.resourceIdPrefix}-pinger-rule`, {
            ruleName: `${this.resourceIdPrefix}-pinger`,
            description: `Pings the Lambda function of the ${this.resourceIdPrefix} app every 5 minutes to keep it warm.`,
            enabled: true,
            schedule: Schedule.rate(Duration.minutes(5)),
            targets: [new LambdaFunction(this.appLambdaFunction, {
                event: RuleTargetInput.fromObject(fakeApiGatewayEventData)
            })],
        });
    }


    /**
     * Creates a scheduled rule that runs every tuesday at 03:30 AM GMT to trigger
     * our cleanup Lambda function.
     *
     * @private
     */
    private createCleanupTriggerRule(): void {
        new Rule(this, `${this.resourceIdPrefix}-scheduler-rule`, {
            ruleName: `${this.resourceIdPrefix}-scheduler`,
            description: `Triggers a cleanup of the outdated static assets at the ${this.staticAssetsBucket.bucketName} S3 bucket.`,
            enabled: true,
            schedule: Schedule.cron({weekDay: '3', hour: '3', minute: '30'}),
            targets: [new LambdaFunction(this.cleanupLambdaFunction)],
        });
    }

    /**
     * Creates a S3 bucket to store the access logs of the CloudFront distribution.
     */
    private createAccessLogsBucket(): Bucket {
        const bucketName = `${this.resourceIdPrefix}-access-logs`;
        const bucket = new Bucket(this, bucketName, {
            bucketName,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            // When the stack is destroyed, we expect everything to be deleted
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        bucket.grantReadWrite(this.cdnAccessIdentity);

        return bucket;
    }

    private createAccessLogsAnalysis(props: NuxtServerAppStackProps): CloudFrontAccessLogsAnalysis {
        if (!this.accessLogsBucket) {
            throw new Error('Access bucket not set');
        }
        return new CloudFrontAccessLogsAnalysis(this, `${this.resourceIdPrefix}-access-logs-analysis`, {
            bucket: this.accessLogsBucket,
            resourcePrefix: `${this.resourceIdPrefix}-access-logs`,
            accessLogCookies: props.accessLogCookies,
        });
    }
}
