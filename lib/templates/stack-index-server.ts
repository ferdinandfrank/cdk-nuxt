#!/usr/bin/env node
import {App} from "aws-cdk-lib";
import {NuxtServerAppStack, NuxtServerAppStackProps} from "cdk-nuxt";

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
     * Whether to enable a global Sitemap bucket which is permanently accessible through multiple deployments.
     */
    enableSitemap: false,

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
     * An array of headers to pass to the Nuxt app on SSR requests.
     * The more headers are passed, the weaker the cache performance will be, as the cache key
     * is based on the headers.
     * No headers are passed by default.
     */
    allowHeaders: [],

    /**
     * An array of cookies to pass to the Nuxt app on SSR requests.
     * The more cookies are passed, the weaker the cache performance will be, as the cache key
     * is based on the cookies.
     * No cookies are passed by default.
     */
    allowCookies: [],

    /**
     * An array of query param keys to pass to the Nuxt app on SSR requests.
     * The more query params are passed, the weaker the cache performance will be, as the cache key
     * is based on the query params.
     * Note that this config can not be combined with {@see denyQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     */
    allowQueryParams: [],

    /**
     * An array of query param keys to deny passing to the Nuxt app on SSR requests.
     * It might be useful to prevent specific external query params, e.g., fbclid, utm_campaign, ...,
     * to improve cache performance, as the cache key is based on the specified query params.
     * Note that this config can not be combined with {@see allowQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     */
    denyQueryParams: [],

    /**
     * Stack tags that will be applied to all the taggable resources and the stack itself.
     */
    tags: {
        service: 'nuxt-app'
    },
};

new NuxtServerAppStack(new App(), `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);