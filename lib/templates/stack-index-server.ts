#!/usr/bin/env node
import {NuxtServerAppStack, type NuxtServerAppStackProps, App} from "cdk-nuxt";

const appStackProps: NuxtServerAppStackProps = {
    /**
     * The AWS environment (account/region) where this stack will be deployed.
     */
    env: {
        // The ID of your AWS account on which to deploy the stack.
        account: 'XXXXXXXX',

        // The AWS region where to deploy the Nuxt app.
        region: 'eu-central-1'
    },

    /**
     * A string identifier for the project the Nuxt app is part of.
     * A project might have multiple different services.
     */
    project: 'my-project',

    /**
     * A string identifier for the project's service the Nuxt app is created for.
     * This can be seen as the name of the Nuxt app.
     */
    service: 'nuxt-app',

    /**
     * A string to identify the environment of the Nuxt app. This enables us
     * to deploy multiple different environments of the same Nuxt app, e.g., production and development.
     */
    environment: 'dev',

    /**
     * The domain (without the protocol) at which the Nuxt app shall be publicly available.
     * A DNS record will be automatically created in Route53 for the domain.
     * This also supports subdomains.
     * Examples: "example.com", "sub.example.com"
     */
    domain: 'example.com',

    /**
     * The ARN of the certificate to use on CloudFront for the Nuxt app to make it accessible via HTTPS.
     * The certificate must be issued for the specified domain in us-east-1 (global) regardless of the
     * region specified via 'env.region' as CloudFront only works globally.
     */
    globalTlsCertificateArn: 'arn:aws:acm:us-east-1:XXXXXXXXXX:certificate/XXXXXXXXXXXXXXXXX',

    /**
     * The ARN of the certificate to use at the ApiGateway for the Nuxt app to make it accessible via the custom domain
     * and to provide the custom domain to the Nuxt app via the 'Host' header for server side rendering use cases.
     * The certificate must be issued in the same region as specified via 'env.region' as ApiGateway works regionally.
     */
    regionalTlsCertificateArn: 'arn:aws:acm:eu-central-1:XXXXXXXXXX:certificate/XXXXXXXXXXXXXXXXX',

    /**
     * The id of the hosted zone to create a DNS record for the specified domain.
     */
    hostedZoneId: 'XXXXXXXXXXXXX',

    /**
     * The path to the root directory of the Nuxt app (at which the `nuxt.config.ts` file is located).
     * Defaults to '.'.
     */
    rootDir: '.',

    /**
     * The memory size to apply to the Nuxt app's Lambda.
     * Defaults to 1792MB (optimized for costs and performance for standard Nuxt apps).
     */
    memorySize: 1792,

    /**
     * Whether to enable AWS X-Ray for the Nuxt Lambda function.
     */
    enableTracing: false,

    /**
     * Whether to enable (HTTPS only) API access to the Nuxt app via the `/api` path which support all HTTP methods.
     * See https://nuxt.com/docs/guide/directory-structure/server#recipes for details.
     */
    enableApi: true,

    /**
     * Whether to enable a global Sitemap bucket which is permanently accessible through multiple deployments.
     */
    enableSitemap: false,

    /**
     * An array of path patterns for server endpoints that should be routed to the SSR origin (API Gateway → Lambda)
     * instead of the default S3 "file" behavior.
     * 
     * This is useful for server routes that generate dynamic content but use file-like URLs.
     * For example, @nuxtjs/sitemap creates a `/sitemap.xml` endpoint that dynamically generates XML content,
     * and @nuxt/image uses file-like URLs to serve dynamically processed images.
     * 
     * Note: This is different from `enableSitemap` which serves pre-generated static sitemap files from S3.
     * Use `serverRoutes` when you need the Lambda to handle requests and generate content on-the-fly.
     * 
     * Examples: ['/sitemap.xml', '/robots.txt', '/__sitemap__/*', '/_ipx/*']
     */
    serverRoutes: [],

    /**
     * Whether to enable reporting of CloudFront access logs via Athena.
     */
    enableAccessLogsAnalysis: false,

    /**
     * Array of cookie names to include in the access logs (whitelist).
     */
    accessLogCookies: [],

    /**
     * The number of days to retain static assets of outdated deployments in the S3 bucket.
     * Useful to allow users to still access old assets after a new deployment when they are still browsing on an old version.
     * Defaults to 30 days.
     */
    outdatedAssetsRetentionDays: 30,

    /**
     * An array of HTTP headers to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for headers that do not affect the response.
     *
     * No headers are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    forwardHeaders: [],

    /**
     * An array of HTTP headers to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for headers that might affect the response, e.g., 'Authorization'.
     *
     * No headers are forwarded or included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    cacheKeyHeaders: [],

    /**
     * An array of cookies to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for cookies that do not affect the response.
     *
     * No cookies are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    forwardCookies: [],

    /**
     * An array of cookies to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for cookies that might affect the response, e.g., authentication cookies.
     *
     * No cookies are forwarded or included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    cacheKeyCookies: [],

    /**
     * An array of query params to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for query params that do not affect the response and are required on SSR requests.
     *
     * All query params are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    forwardQueryParams: [],

    /**
     * An array of query params to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for query params that affect the response and are required on SSR requests, e.g., filters.
     *
     * All query params are forwarded and included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    cacheKeyQueryParams: [],

    /**
     * An array of query params to prevent forwarding to the Nuxt app and to not include in the cache key for objects that are cached at CloudFront edge locations.
     * When set, all query params that are not specified in this array will be forwarded to the Nuxt app and included in the cache key.
     * This should be used for query params that do not affect the response and are not required on SSR requests, e.g., 'fbclid' or 'utm_campaign'.
     *
     * If both {@see cacheKeyQueryParams} and {@see denyCacheKeyQueryParams} are specified, the {@see denyCacheKeyQueryParams} will be ignored.
     * All query params are forwarded and included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    denyCacheKeyQueryParams: [],

    /**
     * Stack tags that will be applied to all the taggable resources and the stack itself.
     */
    tags: {
        service: 'nuxt-app'
    },
};

new NuxtServerAppStack(new App(), `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);