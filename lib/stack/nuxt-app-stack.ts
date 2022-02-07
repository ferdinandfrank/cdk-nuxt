import {Duration, RemovalPolicy, Stack, Tags} from 'aws-cdk-lib';
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
import {NuxtAppStaticAssets} from "./nuxt-app-static-assets";
import {AppStackProps} from "./app-stack-props";
import * as fs from "fs";

export interface NuxtAppStackProps extends AppStackProps {
  readonly baseDomain: string;
  readonly subDomain?: string;

  // Used by the CDN, must be issued in us-east-1 (global)
  readonly globalTlsCertificateArn: string;

  readonly hostedZoneId: string;
}

export class NuxtAppStack extends Stack {
  private readonly resourceIdPrefix: string;
  private readonly deploymentRevision: string;
  private readonly tlsCertificate: ICertificate;
  private readonly cdnAccessIdentity: IOriginAccessIdentity;
  public staticAssetsBucket: IBucket;
  private readonly layer: LayerVersion;
  private readonly lambdaFunction: Function;
  private apiGateway: HttpApi;
  private readonly httpsForwardingBehavior: BehaviorOptions;
  private readonly cdn: Distribution;
  private readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: NuxtAppStackProps) {
    super(scope, id, props);

    Tags.of(scope).add('project', props.project);
    Tags.of(scope).add('domain', props.subDomain ? `${props.subDomain}.${props.baseDomain}` : props.baseDomain);
    Tags.of(scope).add('service', props.service);
    Tags.of(scope).add('environment', props.environment);

    this.resourceIdPrefix = `${props.project}-${props.service}-${props.environment}`;
    this.deploymentRevision = new Date().toISOString();
    this.tlsCertificate = this.findTlsCertificate(props);
    this.cdnAccessIdentity = this.createCdnAccessIdentity();
    this.staticAssetsBucket = this.createStaticAssetsBucket();
    this.layer = this.createSsrLambdaLayer();
    this.lambdaFunction = this.createLambdaFunction();
    this.apiGateway = this.createApiGateway();
    this.httpsForwardingBehavior = this.createHttpsForwardingBehavior();
    this.cdn = this.createCloudFrontDistribution(props);
    this.configureDeployments();
    this.hostedZone = this.findHostedZone(props);
    this.createDnsRecords(props);
  }

  private findTlsCertificate(props: NuxtAppStackProps): ICertificate {
    return Certificate.fromCertificateArn(this, `${this.resourceIdPrefix}-tls-certificate`, props.globalTlsCertificateArn);
  }

  private createCdnAccessIdentity(): IOriginAccessIdentity {
    const originAccessIdentityName = `${this.resourceIdPrefix}-cdn-s3-access`;
    return new OriginAccessIdentity(this, originAccessIdentityName);
  }

  private createStaticAssetsBucket(): IBucket {
    const bucketName = `${this.resourceIdPrefix}-assets`;
    const bucket = new Bucket(this, bucketName, {
      accessControl: BucketAccessControl.AUTHENTICATED_READ,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName,
      // the bucket and all of its objects can be deleted, because all the content is managed in this project
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.grantReadWrite(this.cdnAccessIdentity);

    return bucket;
  }

  private createSsrLambdaLayer(): LayerVersion {
    const layerName = `${this.resourceIdPrefix}-ssr-layer`;
    return new LayerVersion(this, layerName, {
      layerVersionName: layerName,
      code: Code.fromAsset('./server/layer'),
      compatibleRuntimes: [Runtime.NODEJS_12_X],
      description: `Contains node_modules required for server-side of ${this.resourceIdPrefix}.`,
    });
  }

  private createLambdaFunction(): Function {
    const funcName = `${this.resourceIdPrefix}-function`;

    return new Function(this, funcName, {
      functionName: funcName,
      runtime: Runtime.NODEJS_12_X,
      architecture: Architecture.ARM_64,
      layers: [this.layer],
      handler: 'lambda-handler.render',
      code: Code.fromAsset('.nuxt/cdk-deployment', {
        exclude: ['**.svg', '**.ico', '**.png', '**.jpg', 'chunk.*.js*', 'bundle.*.js*', 'bundle.*.js*', 'sw.js*'],
      }),
      timeout: Duration.seconds(10),
      memorySize: 512,
      logRetention: RetentionDays.ONE_MONTH,
      environment: {},
      allowPublicSubnet: false
    });
  }

  private createApiGateway(): HttpApi {
    const lambdaIntegration = new HttpLambdaIntegration(`${this.resourceIdPrefix}-lambda-integration`, this.lambdaFunction);
    const apiName = `${this.resourceIdPrefix}-api`;
    const apiGateway = new HttpApi(this, apiName, {
      apiName,
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

  private createHttpsForwardingBehavior(): BehaviorOptions {
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
   * Eventhough we don't want to cache SSR requests, we still have to create a cache policy, in order to
   * forward required cookies, query params and headers. This doesn't make any sense, because if nothing
   * is cached, one would expect, that anything would/could be forwarded, but anyway...
   */
  private createSsrCachePolicy(): ICachePolicy {

    // The headers to pass to the app
    const headers = [
      'User-Agent', // Required to distinguish between mobile and desktop template
      'Authorization', // For authorization
    ];

    return new CachePolicy(this, `${this.resourceIdPrefix}-cache-policy`, {
      cachePolicyName: `${this.resourceIdPrefix}-cdn-cache-policy`,
      comment: `Passes all required request data to the ${this.resourceIdPrefix} origin.`,
      defaultTtl: Duration.seconds(0),
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(1), // the max TTL must not be 0 for a cache policy
      queryStringBehavior: CacheQueryStringBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(...headers),
      cookieBehavior: CacheCookieBehavior.all(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });
  }

  private createCloudFrontDistribution(props: NuxtAppStackProps): Distribution {
    const cdnName = `${this.resourceIdPrefix}-cdn`;

    return new Distribution(this, cdnName, {
      domainNames: props.subDomain ? [`${props.subDomain}.${props.baseDomain}`] : [props.baseDomain, `*.${props.baseDomain}`],
      comment: `${this.resourceIdPrefix}-redirect`,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2018,
      certificate: this.tlsCertificate,
      defaultBehavior: this.httpsForwardingBehavior,
      additionalBehaviors: this.createStaticAssetBehaviors(),
      priceClass: PriceClass.PRICE_CLASS_100, // Use only North America and Europe
    });
  }

  private createStaticAssetBehaviors(): Record<string, BehaviorOptions> {
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
    NuxtAppStaticAssets.forEach(asset => {
      rules[`${asset.target}${asset.pattern}`] = staticAssetsCacheConfig
    })

    return rules
  }

  /**
   * In order to enable a zero-downtime deployment, we use a new subdirectory (revision) for every deployment.
   * The previous versions are retained to allow clients to continue to work with an older revision.
   */
  private configureDeployments(): BucketDeployment[] {
    const defaultCacheConfig = [
      CacheControl.setPublic(),
      CacheControl.maxAge(Duration.days(365)),
      CacheControl.fromString('immutable'),
    ];

    // Returns a deployment for every configured static asset type to respect the different cache settings
    return NuxtAppStaticAssets.filter(asset => fs.existsSync(asset.source)).map((asset, assetIndex) => {
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

  private findHostedZone(props: NuxtAppStackProps): IHostedZone {
    return HostedZone.fromHostedZoneAttributes(this, `${this.resourceIdPrefix}-hosted-zone`, {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.baseDomain,
    });
  }

  private createDnsRecords(props: NuxtAppStackProps): void {
    const dnsTarget = RecordTarget.fromAlias(new CloudFrontTarget(this.cdn));

    // Create a record for IPv4
    new ARecord(this, `${this.resourceIdPrefix}-ipv4-record`, {
      recordName: props.subDomain ? `${props.subDomain}.${props.baseDomain}` : props.baseDomain,
      zone: this.hostedZone,
      target: dnsTarget,
    });

    // Create a record for IPv6
    new AaaaRecord(this, `${this.resourceIdPrefix}-ipv6-record`, {
      recordName: props.subDomain ? `${props.subDomain}.${props.baseDomain}` : props.baseDomain,
      zone: this.hostedZone,
      target: dnsTarget,
    });
  }
}
