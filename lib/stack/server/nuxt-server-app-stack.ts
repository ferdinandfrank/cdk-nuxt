import {Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    BehaviorOptions,
    CacheCookieBehavior,
    CachedMethods,
    CacheHeaderBehavior,
    CachePolicy,
    CacheQueryStringBehavior,
    Distribution, HttpVersion,
    ICachePolicy,
    IOriginAccessIdentity,
    OriginAccessIdentity,
    OriginProtocolPolicy,
    PriceClass,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {Architecture, Code, Function, LayerVersion, Runtime, Tracing} from "aws-cdk-lib/aws-lambda";
import {
    BlockPublicAccess,
    Bucket,
    BucketAccessControl,
    BucketEncryption,
    IBucket,
    ObjectOwnership
} from "aws-cdk-lib/aws-s3";
import {AaaaRecord, ARecord, HostedZone, IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {BucketDeployment, CacheControl, Source, StorageClass} from "aws-cdk-lib/aws-s3-deployment";
import {HttpOrigin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {HttpMethod} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {HttpLambdaIntegration} from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import {DomainName, EndpointType, HttpApi, SecurityPolicy} from "@aws-cdk/aws-apigatewayv2-alpha";
import {getNuxtAppStaticAssetConfigs, StaticAssetConfig} from "../nuxt-app-static-assets";
import * as fs from "fs";
import {Rule, RuleTargetInput, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {NuxtAppStackProps} from "../nuxt-app-stack-props";
import * as path from "path";

/**
 * Defines the props required for the {@see NuxtServerAppStack}.
 */
export interface NuxtServerAppStackProps extends NuxtAppStackProps {

    /**
     * The ARN of the certificate to use at the ApiGateway for the Nuxt app to make it accessible via the custom domain
     * and to provide the custom domain to the Nuxt app via the 'Host' header for server side rendering use cases.
     * The certificate must be issued in the same region as specified via 'env.region' as ApiGateway works regionally.
     */
    readonly regionalTlsCertificateArn: string;

    /**
     * The file name (without extension) of the Lambda entrypoint within the 'server' directory exporting a handler.
     * Defaults to "index".
     */
    readonly entrypoint?: string;

    /**
     * A JSON serialized string of environment variables to pass to the Lambda function.
     */
    readonly entrypointEnv?: string;

    /**
     * The memory size to apply to the Nuxt app's Lambda.
     * Defaults to 1792MB (optimized for costs and performance for standard Nuxt apps).
     */
    readonly memorySize?: number;

    /**
     * Whether to enable AWS X-Ray for the Nuxt Lambda function.
     */
    readonly enableTracing?: boolean;

    /**
     * Whether to enable a global Sitemap bucket which is permanently accessible through multiple deployments.
     */
    readonly enableSitemap?: boolean;

    /**
     * An array of headers to pass to the Nuxt app on SSR requests.
     * The more headers are passed, the weaker the cache performance will be, as the cache key
     * is based on the headers.
     * No headers are passed by default.
     */
    readonly allowHeaders?: string[];

    /**
     * An array of cookies to pass to the Nuxt app on SSR requests.
     * The more cookies are passed, the weaker the cache performance will be, as the cache key
     * is based on the cookies.
     * No cookies are passed by default.
     */
    readonly allowCookies?: string[];

    /**
     * An array of query param keys to pass to the Nuxt app on SSR requests.
     * The more query params are passed, the weaker the cache performance will be, as the cache key
     * is based on the query params.
     * Note that this config can not be combined with {@see denyQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     */
    readonly allowQueryParams?: string[];

    /**
     * An array of query param keys to deny passing to the Nuxt app on SSR requests.
     * It might be useful to prevent specific external query params, e.g., fbclid, utm_campaign, ...,
     * to improve cache performance, as the cache key is based on the specified query params.
     * Note that this config can not be combined with {@see allowQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     */
    readonly denyQueryParams?: string[];
}

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
     * The identifier for the current deployment that is used as S3 folder name
     * to store the static assets of the Nuxt app.
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
    public staticAssetsBucket: IBucket;

    /**
     * The S3 bucket where the sitemap assets gets stored.
     */
    public sitemapBucket: IBucket|undefined;

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
        this.deploymentRevision = new Date().toISOString();
        this.staticAssetConfigs = getNuxtAppStaticAssetConfigs(props.srcDir, props.rootDir ?? '.');
        this.cdnAccessIdentity = this.createCdnAccessIdentity();
        this.staticAssetsBucket = this.createStaticAssetsBucket();

        if (props.enableSitemap) {
            this.sitemapBucket = this.createSitemapBucket();
        }

        this.appLambdaFunction = this.createAppLambdaFunction(props);
        this.apiGateway = this.createApiGateway(props);
        this.cdn = this.createCloudFrontDistribution(props);
        this.configureDeployments();
        this.createDnsRecords(props);
        this.createAppPingRule(props);

        // Static assets cleanup resources
        this.cleanupLambdaFunction = this.createCleanupLambdaFunction(props);
        this.createCleanupTriggerRule();
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
    private createStaticAssetsBucket(): IBucket {
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
            runtime: Runtime.NODEJS_16_X,
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
     *
     * @param props
     * @private
     */
    private createCleanupLambdaFunction(props: NuxtServerAppStackProps): Function {
        const functionName: string = `${this.resourceIdPrefix}-cleanup-function`;

        const result: Function = new Function(this, functionName, {
            functionName: functionName,
            description: `Auto-deletes the outdated static assets in the ${this.staticAssetsBucket.bucketName} S3 bucket.`,
            runtime: Runtime.NODEJS_16_X,
            architecture: Architecture.ARM_64,
            layers: [new LayerVersion(this, `${this.resourceIdPrefix}-layer`, {
                layerVersionName: `${this.resourceIdPrefix}-layer`,
                code: Code.fromAsset(path.join(__dirname, '../../functions/assets-cleanup/build/layer')),
                compatibleRuntimes: [Runtime.NODEJS_16_X],
                description: `Provides the node_modules required for the ${this.resourceIdPrefix} lambda function.`
            })],
            handler: 'index.handler',
            code: Code.fromAsset(path.join(__dirname, '../../functions/assets-cleanup/build/app')),
            timeout: Duration.minutes(1),
            memorySize: 128,
            logRetention: RetentionDays.TWO_WEEKS,
            environment: {
                STATIC_ASSETS_BUCKET: this.staticAssetsBucket.bucketName,
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
            defaultBehavior: this.createNuxtAppRouteBehavior(props),
            additionalBehaviors: this.setupCloudFrontRouting(props),
            priceClass: PriceClass.PRICE_CLASS_100, // Use only North America and Europe
        });
    }

    /**
     * Creates a behavior for the CloudFront distribution to route incoming requests to the Nuxt render Lambda function (via API gateway).
     * Additionally, this automatically redirects HTTP requests to HTTPS.
     *
     * @private
     */
    private createNuxtAppRouteBehavior(props: NuxtServerAppStackProps): BehaviorOptions {
        return {
            origin: new HttpOrigin(`${this.apiGateway.httpApiId}.execute-api.${this.region}.amazonaws.com`, {
                connectionAttempts: 2,
                connectionTimeout: Duration.seconds(2),
                readTimeout: Duration.seconds(10),
                protocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
            }),
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
            compress: true,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            originRequestPolicy: undefined,
            cachePolicy: this.createSsrCachePolicy(props),
        };
    }

    private setupCloudFrontRouting(props: NuxtServerAppStackProps): Record<string, BehaviorOptions> {
        let routingBehaviours: Record<string, BehaviorOptions> = {};

        // Specific ones first
        if (props.enableSitemap) {
            routingBehaviours = {...routingBehaviours, ...this.createSitemapRouteBehavior()};
        }

        routingBehaviours = {...routingBehaviours, ...this.createStaticAssetsRouteBehavior()};

        return routingBehaviours;
    }

    /**
     * Creates a cache policy for the Nuxt app route behavior of the CloudFront distribution.
     * Even though we don't want to cache SSR requests, we still have to create this cache policy in order to
     * forward required cookies, query params and headers. This doesn't make any sense, because if nothing
     * is cached, one would expect, that anything would/could be forwarded, but anyway...
     */
    private createSsrCachePolicy(props: NuxtServerAppStackProps): ICachePolicy {
        return new CachePolicy(this, `${this.resourceIdPrefix}-cache-policy`, {
            cachePolicyName: `${this.resourceIdPrefix}-cdn-cache-policy`,
            comment: `Defines which request data to pass to the ${this.resourceIdPrefix} origin and how the cache key is calculated.`,
            defaultTtl: Duration.seconds(0),
            minTtl: Duration.seconds(0),
            maxTtl: Duration.days(365),
            queryStringBehavior: props.allowQueryParams ? CacheQueryStringBehavior.allowList(...props.allowQueryParams) : (props.denyQueryParams ? CacheQueryStringBehavior.denyList(...props.denyQueryParams) : CacheQueryStringBehavior.all()),
            headerBehavior: props.allowHeaders ? CacheHeaderBehavior.allowList(...props.allowHeaders) : CacheHeaderBehavior.none(),
            cookieBehavior: props.allowCookies ? CacheCookieBehavior.allowList(...props.allowCookies) : CacheCookieBehavior.none(),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
        });
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
                originPath: this.deploymentRevision,
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
     * In order to enable a zero-downtime deployment, we use a new subdirectory (revision) for every deployment.
     * The previous versions are retained to allow clients to continue to work with an older revision but gets cleaned up
     * after a specified period of time via the Lambda function in the {@see NuxtAppAssetsCleanupStack}.
     */
    private configureDeployments(): BucketDeployment[] {
        // Returns a deployment for every configured static asset type to respect the different cache settings
        return this.staticAssetConfigs.filter(asset => fs.existsSync(asset.source)).map((asset, assetIndex) => {
            return new BucketDeployment(this, `${this.resourceIdPrefix}-assets-deployment-${assetIndex}`, {
                sources: [Source.asset(asset.source)],
                destinationBucket: this.staticAssetsBucket,
                destinationKeyPrefix: this.deploymentRevision + asset.target,
                prune: false,
                storageClass: StorageClass.STANDARD,
                exclude: ['*'],
                include: [asset.pattern],
                cacheControl: asset.cacheControl,
                contentType: asset.contentType,
                distribution: asset.invalidateOnChange ? this.cdn : undefined,
                distributionPaths: asset.invalidateOnChange ? [`/${asset.pattern}`] : undefined,
                logRetention: RetentionDays.ONE_DAY,
                memoryLimit: 256 // Some Nuxt applications have a lot of assets to deploy whereby the function might run out of memory
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
}
