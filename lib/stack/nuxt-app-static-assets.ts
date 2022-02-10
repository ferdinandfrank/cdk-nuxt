import {CacheControl} from "aws-cdk-lib/aws-s3-deployment";
import {Duration} from "aws-cdk-lib";
import {NuxtConfig} from "./nuxt-config";

export interface StaticAssetConfig {
    /**
     * The file pattern for the incoming requests that should be forwarded to the target path in the static assets S3 bucket
     * with the appropriate cache and content settings defined in the same object.
     */
    pattern: string,

    /**
     * The local directory to upload the files from.
     */
    source: string,

    /**
     * The remote path at which to make the uploaded files from source accessible.
     */
    target: string,

    /**
     * The content type to set for the files in the source folder when uploading them to the target.
     */
    contentType: string,

    /**
     * The cache settings to use for the uploaded source files when accessing them on the target path with the specified pattern.
     */
    cacheControl?: CacheControl[]
}

/**
 * Retrieves the static assets of the Nuxt app that shall be publicly available.
 * These should match the files in '.nuxt/dist/client' and 'static'.
 */
export const getNuxtAppStaticAssetConfigs = (nuxtConfig: NuxtConfig): StaticAssetConfig[] => {

    const buildAssetsSourcePath = './.nuxt/dist/client';
    const buildAssetsTargetPath = nuxtConfig.build?.publicPath ?? '/_nuxt/'; // Must match 'build.publicPath' in nuxt.config.js

    const customAssetsSourcePath = `.${nuxtConfig.srcDir ? (nuxtConfig.srcDir + '/') : ''}/static`;
    const customAssetsTargetPath = '/';

    return [

        // Build Assets
        {
            pattern: '*.js',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/javascript; charset=UTF-8',
        },
        {
            pattern: '*.js.map',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/json; charset=UTF-8',
        },
        {
            pattern: '*.css',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'text/css; charset=UTF-8',
        },

        // Manifest created by PWA module
        {
            pattern: 'manifest.*.json',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/json; charset=UTF-8'
        },
        {
            pattern: '*.svg',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/svg+xml',
        },
        {
            pattern: '*.eot',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/vnd.ms-fontobject',
        },
        {
            pattern: '*.ttf',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/font-sfnt',
        },
        {
            pattern: '*.woff',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'font/woff',
        },
        {
            pattern: '*.woff2',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'font/woff2',
        },

        // Custom Static Assets
        {
            pattern: '*.png',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/png',
        },
        {
            pattern: '*.jpg',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/jpg',
        },
        {
            pattern: 'robots.txt',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'text/plain; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
        },
        {
            pattern: 'sw.js',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'application/javascript; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(2))],
        },
    ]
};