import {Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Certificate} from "aws-cdk-lib/aws-certificatemanager";
import {
    AllowedMethods,
    BehaviorOptions,
    CachedMethods,
    CachePolicy,
    Distribution,
    IOriginAccessIdentity,
    OriginAccessIdentity,
    PriceClass,
    SecurityPolicyProtocol,
    ViewerProtocolPolicy,
    Function, FunctionCode, FunctionEventType
} from "aws-cdk-lib/aws-cloudfront";
import {BlockPublicAccess, Bucket, BucketAccessControl, IBucket} from "aws-cdk-lib/aws-s3";
import {AaaaRecord, ARecord, HostedZone, IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {BucketDeployment, CacheControl, Source, StorageClass} from "aws-cdk-lib/aws-s3-deployment";
import {S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {getNuxtAppStaticAssetConfigs, StaticAssetConfig} from "../nuxt-app-static-assets";
import * as fs from "fs";
import {NuxtAppStackProps} from "../nuxt-app-stack-props";
import * as path from "path";

/**
 * Defines the props required for the {@see NuxtStaticAppStack}.
 */
export interface NuxtStaticAppStackProps extends NuxtAppStackProps {}

/**
 * CDK stack to deploy a static generated Nuxt app (target=static) on AWS with S3 and CloudFront.
 */
export class NuxtStaticAppStack extends Stack {

    /**
     * The identifier prefix of the resources created by the stack.
     *
     * @private
     */
    private readonly resourceIdPrefix: string;

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
     * The configs for the static assets of the Nuxt app that shall be publicly available.
     *
     * @private
     */
    private staticAssetConfigs: StaticAssetConfig[];

    /**
     * The CloudFront distribution to route incoming requests to the S3 bucket (with caching).
     *
     * @private
     */
    private readonly cdn: Distribution;

    constructor(scope: Construct, id: string, props: NuxtStaticAppStackProps) {
        super(scope, id, props);

        this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;
        this.staticAssetConfigs = getNuxtAppStaticAssetConfigs(props.nuxtConfig);
        this.cdnAccessIdentity = this.createCdnAccessIdentity();
        this.staticAssetsBucket = this.createStaticAssetsBucket();
        this.cdn = this.createCloudFrontDistribution(props);
        this.configureDeployments();
        this.createDnsRecords(props);
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
            bucketName,
            // The bucket and all of its objects can be deleted, because all the content is managed in this project
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,

            // We only want the files to be reachable by our custom domain to prevent duplicate content issues
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL
        });

        bucket.grantRead(this.cdnAccessIdentity);

        return bucket;
    }

    /**
     * Creates the CloudFront distribution that routes incoming requests to the S3 bucket (with caching).
     *
     * @param props
     * @private
     */
    private createCloudFrontDistribution(props: NuxtStaticAppStackProps): Distribution {
        const cdnName = `${this.resourceIdPrefix}-cdn`;

        return new Distribution(this, cdnName, {
            domainNames: [props.domain],
            comment: cdnName,
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018,
            certificate: Certificate.fromCertificateArn(this, `${this.resourceIdPrefix}-global-certificate`, props.globalTlsCertificateArn),
            defaultBehavior: this.createNuxtStaticAppRouteBehavior(),
            priceClass: PriceClass.PRICE_CLASS_100, // Use only North America and Europe
            errorResponses: [404, 403].map(errorCode => {
                return {
                    ttl: Duration.seconds(10),
                    httpStatus: errorCode,
                    responseHttpStatus: errorCode,
                    responsePagePath: '/200.html'
                }
            })
        });
    }

    /**
     * Creates a behavior for the CloudFront distribution to route incoming requests to the S3 bucket.
     * Additionally, this automatically redirects HTTP requests to HTTPS.
     *
     * @private
     */
    private createNuxtStaticAppRouteBehavior(): BehaviorOptions {

        const redirectFunction = new Function(this, `${this.resourceIdPrefix}-redirect-to-index`, {
            functionName: `${this.resourceIdPrefix}-redirect-to-index`,
            comment: `Redirects incoming requests to the ${this.resourceIdPrefix} service to their corresponding S3 bucket file.`,
            code: FunctionCode.fromFile({
                filePath: path.join(__dirname, '../../functions/cloudfront/redirect-to-index.js')
            }),
        });

        return {
            origin: new S3Origin(this.staticAssetsBucket, {
                connectionAttempts: 2,
                connectionTimeout: Duration.seconds(3),
                originAccessIdentity: this.cdnAccessIdentity
            }),
            compress: true,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            functionAssociations: [{
                function: redirectFunction,
                eventType: FunctionEventType.VIEWER_REQUEST,
            }]
        };
    }

    /**
     * Uploads the assets of the Nuxt app as defined in {@see getNuxtStaticAppStaticAssetConfigs} to the S3 bucket.
     * In order to enable a zero-downtime deployment, we use a new subdirectory (revision) for every deployment.
     * The previous versions are retained to allow clients to continue to work with an older revision but gets cleaned up
     * after a specified period of time via the Lambda function in the {@see NuxtStaticAppAssetsCleanupStack}.
     */
    private configureDeployments(): BucketDeployment[] {
        const defaultCacheConfig = [
            CacheControl.setPublic(),
            CacheControl.maxAge(Duration.days(365)),
            CacheControl.fromString('immutable'),
        ];

        // Returns a deployment for every configured static asset type to respect the different cache settings
        return this.staticAssetConfigs.filter(asset => fs.existsSync(asset.source)).map((asset, assetIndex) => {
            return new BucketDeployment(this, `${this.resourceIdPrefix}-assets-deployment-${assetIndex}`, {
                sources: [Source.asset(asset.source)],
                destinationBucket: this.staticAssetsBucket,
                destinationKeyPrefix: asset.target,
                prune: false,
                storageClass: StorageClass.STANDARD,
                exclude: ['*'],
                include: [asset.pattern],
                cacheControl: asset.cacheControl ?? defaultCacheConfig,
                contentType: asset.contentType,
                distribution: asset.invalidateOnChange ? this.cdn : undefined,
                distributionPaths: asset.invalidateOnChange ? (asset.pattern.endsWith('.html') ? ['/*'] : [`/${asset.pattern}`]) : undefined,
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
    private findHostedZone(props: NuxtStaticAppStackProps): IHostedZone {
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
    private createDnsRecords(props: NuxtStaticAppStackProps): void {
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
}
