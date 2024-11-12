import {type NuxtAppStackProps} from "../NuxtAppStackProps";

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