import {type StackProps} from "aws-cdk-lib";

/**
 * Defines the common props required to deploy Nuxt apps on AWS.
 */
export interface NuxtAppStackProps extends StackProps {

    /**
     * A string identifier for the project the Nuxt app is part of.
     * A project might have multiple different services.
     */
    readonly project: string;

    /**
     * A string identifier for the project's service the Nuxt app is created for.
     * This can be seen as the name of the Nuxt app.
     */
    readonly service: string;

    /**
     * A string to identify the environment of the Nuxt app. This enables us
     * to deploy multiple different environments of the same Nuxt app, e.g., production and development.
     */
    readonly environment: string;

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
     * The ARN of the certificate to use on CloudFront for the Nuxt app to make it accessible via HTTPS.
     * The certificate must be issued for the specified domain in us-east-1 (global) regardless of the
     * region specified via 'env.region' as CloudFront only works globally.
     */
    readonly globalTlsCertificateArn: string;

    /**
     * The path to the root directory of the Nuxt app (at which the `nuxt.config.ts` file is located).
     * Defaults to '.'.
     */
    readonly rootDir?: string;

}