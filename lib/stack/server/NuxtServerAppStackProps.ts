import {type NuxtAppStackProps} from "../NuxtAppStackProps";
import {type WafConfig} from "../waf/WafConfig";

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
     * Whether to enable (HTTPS only) API access to the Nuxt app via the `/api` path which support all HTTP methods.
     * See https://nuxt.com/docs/guide/directory-structure/server#recipes for details.
     */
    readonly enableApi?: boolean;

    /**
     * Whether to enable reporting of CloudFront access logs via Athena.
     */
    readonly enableAccessLogsAnalysis?: boolean;

    /**
     * Array of cookie names to include in the access logs (whitelist).
     */
    readonly accessLogCookies?: string[];

    /**
     * The number of days to retain static assets of outdated deployments in the S3 bucket.
     * Useful to allow users to still access old assets after a new deployment when they are still browsing on an old version.
     * Defaults to 30 days.
     */
    readonly outdatedAssetsRetentionDays?: number;

    /**
     * An array of HTTP headers to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for headers that do not affect the response.
     *
     * Only the Cloudfront default headers are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    readonly forwardHeaders?: string[];

    /**
     * An array of HTTP headers to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for headers that might affect the response, e.g., 'Authorization'.
     *
     * Only the Cloudfront default headers are forwarded,
     * but no headers are included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    readonly cacheKeyHeaders?: string[];

    /**
     * An array of cookies to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for cookies that do not affect the response.
     *
     * No cookies are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    readonly forwardCookies?: string[];

    /**
     * An array of cookies to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for cookies that might affect the response, e.g., authentication cookies.
     *
     * No cookies are forwarded or included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    readonly cacheKeyCookies?: string[];

    /**
     * An array of query params to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
     * This should only be used for query params that do not affect the response and are required on SSR requests.
     *
     * All query params are forwarded by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html}
     */
    readonly forwardQueryParams?: string[];

    /**
     * An array of query params to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
     * This should be used for query params that affect the response and are required on SSR requests, e.g., filters.
     *
     * All query params are forwarded and included in the cache key by default.
     *
     * {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html}
     */
    readonly cacheKeyQueryParams?: string[];

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
    readonly denyCacheKeyQueryParams?: string[];

    /**
     * An array of headers to pass to the Nuxt app on SSR requests.
     * The more headers are passed, the weaker the cache performance will be, as the cache key
     * is based on the headers.
     * No headers are passed by default.
     *
     * @deprecated Use {@see cacheKeyHeaders} instead.
     */
    readonly allowHeaders?: string[];

    /**
     * An array of cookies to pass to the Nuxt app on SSR requests.
     * The more cookies are passed, the weaker the cache performance will be, as the cache key
     * is based on the cookies.
     * No cookies are passed by default.
     *
     * @deprecated Use {@see cacheKeyCookies} instead.
     */
    readonly allowCookies?: string[];

    /**
     * An array of query param keys to pass to the Nuxt app on SSR requests.
     * The more query params are passed, the weaker the cache performance will be, as the cache key
     * is based on the query params.
     * Note that this config can not be combined with {@see denyQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     *
     * @deprecated Use {@see cacheKeyQueryParams} instead.
     */
    readonly allowQueryParams?: string[];

    /**
     * An array of query param keys to deny passing to the Nuxt app on SSR requests.
     * It might be useful to prevent specific external query params, e.g., fbclid, utm_campaign, ...,
     * to improve cache performance, as the cache key is based on the specified query params.
     * Note that this config can not be combined with {@see allowQueryParams}.
     * If both are specified, the {@see denyQueryParams} will be ignored.
     * All query params are passed by default.
     *
     * @deprecated Use {@see denyCacheKeyQueryParams} instead.
     */
    readonly denyQueryParams?: string[];

    /**
     * An array of path patterns for server endpoints that should be routed to the SSR origin (API Gateway → Lambda)
     * instead of the default S3 "file" behavior.
     * 
     * This is useful for server routes that generate dynamic content but use file-like URLs.
     * For example, `@nuxtjs/sitemap` creates a `/sitemap.xml` endpoint that dynamically generates XML content,
     * and `@nuxt/image` uses file-like URLs to serve dynamically processed images.
     * 
     * Note: This is different from `enableSitemap` which serves pre-generated static sitemap files from S3.
     * Use `serverRoutes` when you need the Lambda to handle requests and generate content on-the-fly.
     * 
     * Examples: `['/sitemap.xml', '/robots.txt', '/__sitemap__/*', '/_ipx/*']`
     */
    readonly serverRoutes?: string[];

    /**
     * AWS WAF configuration to protect the CloudFront distribution.
     * When enabled, provides protection against common web exploits, bots, and DDoS attacks.
     * See {@see WafConfig} for available configuration options.
     */
    readonly wafConfig?: WafConfig;
}