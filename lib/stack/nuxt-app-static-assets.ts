import {CacheControl} from "aws-cdk-lib/aws-s3-deployment";
import {Duration} from "aws-cdk-lib";

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
    cacheControl?: CacheControl[],

    /**
     * Whether to invalidate the files matching the config's pattern in the distribution's edge caches after the files are uploaded to the destination bucket.
     */
    invalidateOnChange?: boolean;
}

/**
 * Retrieves the custom static assets of the Nuxt app that shall be publicly available.
 */
const getNuxtAppCustomAssetConfigs = (): StaticAssetConfig[] => {

    // The custom assets of server Nuxt apps are located in the src 'static' folder
    // The custom assets of static Nuxt apps are located in the build files 'dist' folder
    const customAssetsSourcePath = `./.output/public`;
    const customAssetsTargetPath = '/';

    return [
        {
            pattern: '*.txt', // E.g., robots.txt, ads.txt, ...
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'text/plain; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
        },
        {
            pattern: '*.xml', // E.g., sitemap.xml ...
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'text/xml; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
        },
        {
            pattern: '.well-known/*', // Files for native app links
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'application/json; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
        },
        {
            pattern: '*.ico', // Favicon
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/x-icon',
        },
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
            pattern: '*.svg',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/svg+xml',
        },
        {
            pattern: '*.js',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'application/javascript; charset=UTF-8',
            // The js files in the custom static directory are usually not versioned
            // whereby we want to prevent any caching issues when updating them -> cache for only 2 days
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(2))],
        }
    ];
};

/**
 * Retrieves the static assets of the Nuxt app that are generated by the build of the app.
 */
const getNuxtAppBuildAssetConfigs = (): StaticAssetConfig[] => {

    // The build assets required for CSR that are generated by 'nuxt build'
    const buildAssetsSourcePath = './.output/public/_nuxt';
    const buildAssetsTargetPath = ('/_nuxt/'); // Must match 'build.publicPath' in nuxt.config.js

    return [

        // Build Assets
        {
            pattern: '*.js',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/javascript; charset=UTF-8',
        },
        {
            pattern: '*.css',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'text/css; charset=UTF-8',
        },
        {
            pattern: '*.html',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'text/html; charset=UTF-8',
            // We do not want to cache html files on the browser as we want to be able to publish new changes quickly
            // However, we do cache the html files on CloudFront for a performance boost and invalidate the cache on every deployment
            cacheControl: [CacheControl.setPublic(), CacheControl.sMaxAge(Duration.days(7))],
            invalidateOnChange: true
        },

        // Manifest created by PWA module
        {
            pattern: 'manifest.*.json',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/json; charset=UTF-8'
        },
        {
            pattern: '*.png',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/png',
        },
        {
            pattern: '*.jpg',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/jpg',
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
        }
    ]
};

/**
 * Retrieves the static assets of the Nuxt app that shall be publicly available.
 */
export const getNuxtAppStaticAssetConfigs = (): StaticAssetConfig[] => {
    return [...getNuxtAppBuildAssetConfigs(), ...getNuxtAppCustomAssetConfigs()];
};