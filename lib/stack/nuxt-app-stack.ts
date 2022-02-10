import {Duration, RemovalPolicy, Stack} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Certificate, ICertificate} from "aws-cdk-lib/aws-certificatemanager";
import {
  AllowedMethods,
  BehaviorOptions, CacheCookieBehavior,
  CachedMethods, CacheHeaderBehavior,
  CachePolicy, CacheQueryStringBehavior,
  Distribution, ICachePolicy,
  IOriginAccessIdentity, OriginAccessIdentity, OriginProtocolPolicy, PriceClass,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy
} from "aws-cdk-lib/aws-cloudfront";
import {Architecture, Code, LayerVersion, Runtime, Function} from "aws-cdk-lib/aws-lambda";
import {BlockPublicAccess, Bucket, BucketAccessControl, IBucket} from "aws-cdk-lib/aws-s3";
import {ARecord, AaaaRecord, HostedZone, IHostedZone, RecordTarget} from "aws-cdk-lib/aws-route53";
import {BucketDeployment, CacheControl, Source, StorageClass} from "aws-cdk-lib/aws-s3-deployment";
import {HttpOrigin, S3Origin} from "aws-cdk-lib/aws-cloudfront-origins";
import {CloudFrontTarget} from "aws-cdk-lib/aws-route53-targets";
import {HttpMethod} from "aws-cdk-lib/aws-stepfunctions-tasks";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import {HttpApi} from "@aws-cdk/aws-apigatewayv2-alpha";
import {getNuxtAppStaticAssetConfigs, StaticAssetConfig} from "./nuxt-app-static-assets";
import {AppStackProps} from "./app-stack-props";
import * as fs from "fs";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {NuxtConfig} from "./nuxt-config";

/**
 * Defines the props required for the {@see NuxtAppStack}.
 */
export interface NuxtAppStackProps extends AppStackProps {
  /**
   * The domain (without the protocol) at which the Nuxt app shall be publicly available.
   * A DNS record will be automatically created in Route53 for the domain.
   * This also supports subdomains.
   * Examples: "example.com", "sub.example.com"
   */
  readonly domain: string;

  /**
   * The id of the hosted zone to create a DNS record for the specified domain.
   */
  readonly hostedZoneId: string;

  /**
   * The ARN of the certificate to use for the Nuxt app to make it accessible via HTTPS.
   * The certificate must be issued for the specified domain in us-east-1 (global) regardless of the
   * region used for the Nuxt app itself.
   */
  readonly globalTlsCertificateArn: string;

  /**
   * The nuxt.config.js of the Nuxt app.
   */
  readonly nuxtConfig: NuxtConfig;
}

/**
 * Creates a lambda function that renders the Nuxt app and is publicly reachable via a specified domain.
 */
export class NuxtAppStack extends Stack {

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
   * The certificate to use for the Nuxt app to make it accessible via HTTPS.
   *
   * @private
   */
  private readonly tlsCertificate: ICertificate;

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
   * The lambda function to render the Nuxt app on the server side.
   *
   * @private
   */
  private readonly lambdaFunction: Function;

  /**
   * The API gateway to make the lambda function to render the Nuxt app publicly available.
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
   * The cloudfront distribution to route incoming requests to the Nuxt lambda function (via the API gateway)
   * or the S3 assets folder (with caching).
   *
   * @private
   */
  private readonly cdn: Distribution;

  constructor(scope: Construct, id: string, props: NuxtAppStackProps) {
    super(scope, id, props);

    this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;
    this.deploymentRevision = new Date().toISOString();
    this.staticAssetConfigs = getNuxtAppStaticAssetConfigs(props.nuxtConfig);
    this.tlsCertificate = this.findTlsCertificate(props);
    this.cdnAccessIdentity = this.createCdnAccessIdentity();
    this.staticAssetsBucket = this.createStaticAssetsBucket();
    this.lambdaFunction = this.createLambdaFunction();
    this.apiGateway = this.createApiGateway();
    this.cdn = this.createCloudFrontDistribution(props);
    this.configureDeployments();
    this.createDnsRecords(props);
    this.createPingRule();
  }

  /**
   * Finds the certificate to use for providing HTTPS requests to our Nuxt app.
   *
   * @param props
   * @private
   */
  private findTlsCertificate(props: NuxtAppStackProps): ICertificate {
    return Certificate.fromCertificateArn(this, `${this.resourceIdPrefix}-tls-certificate`, props.globalTlsCertificateArn);
  }

  /**
   * Creates the identity to access our S3 deployment asset files via the cloudfront distribution.
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
      accessControl: BucketAccessControl.AUTHENTICATED_READ,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName,
      // The bucket and all of its objects can be deleted, because all the content is managed in this project
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.grantReadWrite(this.cdnAccessIdentity);

    return bucket;
  }

  /**
   * Creates a lambda layer with the node_modules required to render the Nuxt app on the server side.
   *
   * @private
   */
  private createSsrLambdaLayer(): LayerVersion {
    const layerName = `${this.resourceIdPrefix}-ssr-layer`;
    return new LayerVersion(this, layerName, {
      layerVersionName: layerName,
      code: Code.fromAsset('.nuxt/cdk-deployment/layer'),
      compatibleRuntimes: [Runtime.NODEJS_12_X],
      description: `Provides the node_modules required for SSR of ${this.resourceIdPrefix}.`,
    });
  }

  /**
   * Creates the lambda function to render the Nuxt app.
   *
   * @private
   */
  private createLambdaFunction(): Function {
    const funcName = `${this.resourceIdPrefix}-function`;

    return new Function(this, funcName, {
      functionName: funcName,
      description: `Renders the ${this.resourceIdPrefix} Nuxt app.`,
      runtime: Runtime.NODEJS_12_X,
      architecture: Architecture.ARM_64,
      layers: [this.createSsrLambdaLayer()],
      handler: 'index.handler',
      code: Code.fromAsset('.nuxt/cdk-deployment/src', {
        exclude: ['**.svg', '**.ico', '**.png', '**.jpg', '**.js.map'],
      }),
      timeout: Duration.seconds(10),
      memorySize: 512,
      logRetention: RetentionDays.ONE_MONTH,
      allowPublicSubnet: false
    });
  }

  /**
   * Creates the API gateway to make the Nuxt app render lambda function publicly available.
   *
   * @private
   */
  private createApiGateway(): HttpApi {
    const lambdaIntegration = new HttpLambdaIntegration(`${this.resourceIdPrefix}-lambda-integration`, this.lambdaFunction);
    const apiName = `${this.resourceIdPrefix}-api`;
    const apiGateway = new HttpApi(this, apiName, {
      apiName,
      description: `Connects the ${this.resourceIdPrefix} cloudfront distribution with the ${this.resourceIdPrefix} lambda function to make it publicly available.`,
      // The app does not allow any cross-origin access by purpose: the app should not be embeddable anywhere
      corsPreflight: undefined,
      defaultIntegration: lambdaIntegration,
    });

    apiGateway.addRoutes({
      integration: lambdaIntegration,
      path: '/{proxy+}',
      methods: [HttpMethod.GET, HttpMethod.HEAD],
    });
    return apiGateway;
  }

  /**
   * Creates the cloudfront distribution that routes incoming requests to the Nuxt lambda function (via the API gateway)
   * or the S3 assets folder (with caching).
   *
   * @param props
   * @private
   */
  private createCloudFrontDistribution(props: NuxtAppStackProps): Distribution {
    const cdnName = `${this.resourceIdPrefix}-cdn`;

    return new Distribution(this, cdnName, {
      domainNames: [props.domain],
      comment: `${this.resourceIdPrefix}-redirect`,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018,
      certificate: this.tlsCertificate,
      defaultBehavior: this.createNuxtAppRouteBehavior(),
      additionalBehaviors: this.createStaticAssetsRouteBehavior(),
      priceClass: PriceClass.PRICE_CLASS_100, // Use only North America and Europe
    });
  }

  /**
   * Creates a behavior for the cloudfront distribution to route incoming requests to the Nuxt render lambda function (via API gateway).
   * Additionally, this automatically redirects HTTP requests to HTTPS.
   *
   * @private
   */
  private createNuxtAppRouteBehavior(): BehaviorOptions {
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
      cachePolicy: this.createSsrCachePolicy(),
    };
  }

  /**
   * Creates a cache policy for the Nuxt app route behavior of our cloudfront distribution.
   * Eventhough we don't want to cache SSR requests, we still have to create this cache policy in order to
   * forward required cookies, query params and headers. This doesn't make any sense, because if nothing
   * is cached, one would expect, that anything would/could be forwarded, but anyway...
   */
  private createSsrCachePolicy(): ICachePolicy {

    // The headers to make accessible in our Nuxt app code
    const headers = [
      'User-Agent', // Required to distinguish between mobile and desktop template
      'Authorization', // For authorization
    ];

    return new CachePolicy(this, `${this.resourceIdPrefix}-cache-policy`, {
      cachePolicyName: `${this.resourceIdPrefix}-cdn-cache-policy`,
      comment: `Passes all required request data to the ${this.resourceIdPrefix} origin.`,
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1), // The max TTL must not be 0 for a cache policy
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(...headers),
      cookieBehavior: CacheCookieBehavior.all(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
  }

  /**
   * Creates a behavior for the cloudfront distribution to route matching incoming requests for our static assets
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
   * Uploads the static assets of the Nuxt app as defined in {@see getNuxtAppStaticAssetConfigs} to the static assets S3 bucket.
   * In order to enable a zero-downtime deployment, we use a new subdirectory (revision) for every deployment.
   * The previous versions are retained to allow clients to continue to work with an older revision but gets cleaned up
   * after a specified period of time via the lambda function in the {@see NuxtAppAssetsCleanupStack}.
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
        destinationKeyPrefix: this.deploymentRevision + asset.target,
        prune: false,
        storageClass: StorageClass.STANDARD,
        exclude: ['*'],
        include: [asset.pattern],
        cacheControl: asset.cacheControl ?? defaultCacheConfig,
        contentType: asset.contentType,
      })
    });
  }

  /**
   * Resolves the hosted zone at which the DNS records shall be created to access our Nuxt app on the internet.
   *
   * @param props
   * @private
   */
  private findHostedZone(props: NuxtAppStackProps): IHostedZone {
    const domainParts = props.domain.split('.');

    return HostedZone.fromHostedZoneAttributes(this, `${this.resourceIdPrefix}-hosted-zone`, {
      hostedZoneId: props.hostedZoneId,
      zoneName: domainParts[domainParts.length - 1], // Support subdomains
    });
  }

  /**
   * Creates the DNS records to access our Nuxt app on the internet via our custom domain.
   *
   * @param props
   * @private
   */
  private createDnsRecords(props: NuxtAppStackProps): void {
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
   * Creates a scheduled rule to ping our Nuxt app lambda function every 5 minutes in order to keep it warm
   * and speed up initial SSR requests.
   *
   * @private
   */
  private createPingRule(): void {
    new Rule(this, `${this.resourceIdPrefix}-pinger-rule`, {
      ruleName: `${this.resourceIdPrefix}-pinger`,
      description: `Pings the lambda function of the ${this.resourceIdPrefix} app every 5 minutes to keep it warm.`,
      enabled: true,
      schedule: Schedule.rate(Duration.minutes(5)),
      targets: [new LambdaFunction(this.lambdaFunction)],
    });
  }
}
