
/**
 * Defines the interface of the props in the nuxt.config.js that we need to access during
 * the CDK deployment.
 */
export interface NuxtConfig {

    readonly srcDir?: string;
    readonly build?: {
        publicPath?: string
    };
}