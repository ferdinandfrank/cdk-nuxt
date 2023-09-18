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
    cacheControl: CacheControl[],

    /**
     * Whether to invalidate the files matching the config's pattern in the distribution's edge caches after the files are uploaded to the destination bucket.
     */
    invalidateOnChange?: boolean;
}

const defaultCacheConfig = [
    CacheControl.setPublic(),
    CacheControl.maxAge(Duration.days(365)),
    CacheControl.fromString('immutable'),
];

/**
 * Retrieves the custom static assets of the Nuxt app that shall be publicly available.
 *
 * @param srcDir The path to the directory within the root directory (`rootDir`) at which the `public` assets folder of the Nuxt app is located.
 * @param rootDir The path to the root directory of the Nuxt app at which the `.output` build folder is located.
 */
const getNuxtAppCustomAssetConfigs = (srcDir: string|undefined = undefined, rootDir: string = '.'): StaticAssetConfig[] => {

    // We copy the custom assets from the source directory to prevent overriding the build assets cache behavior
    // when copying from outputs directory
    const customAssetsSourcePath = `${rootDir}${srcDir ? `/${srcDir}` : ''}/public`;
    const customAssetsTargetPath = '/';

    return [
        {
            pattern: 'app-revision',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'text/plain; charset=UTF-8',
            cacheControl: [
                CacheControl.setPublic(),
                CacheControl.maxAge(Duration.seconds(10)),
                CacheControl.sMaxAge(Duration.days(14)),
            ],
            invalidateOnChange: true
        },
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
            pattern: 'manifest.webmanifest', // Manifest created by PWA module
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'application/manifest+json; charset=UTF-8',
            cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
        },
        {
            pattern: '*.ico', // Favicon
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/x-icon',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.png',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/png',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.jpg',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/jpg',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.svg',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'image/svg+xml',
            cacheControl: defaultCacheConfig
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
 *
 * @param rootDir The path to the root directory of the Nuxt app at which the `.output` build folder is located.
 */
const getNuxtAppBuildAssetConfigs = (rootDir: string = '.'): StaticAssetConfig[] => {

    // The build assets required for CSR that are generated by 'nuxt build'
    const buildAssetsSourcePath = `${rootDir}/.output/public/_nuxt`;
    const buildAssetsTargetPath = ('/_nuxt/');

    return [

        // Build Assets
        {
            pattern: '*.js',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/javascript; charset=UTF-8',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.js.map',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/json; charset=UTF-8',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.css',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'text/css; charset=UTF-8',
            cacheControl: defaultCacheConfig
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

        // Manifest created by legacy PWA module
        {
            pattern: 'manifest.*.json',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/json; charset=UTF-8',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.png',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/png',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.jpg',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/jpg',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.svg',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'image/svg+xml',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.eot',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/vnd.ms-fontobject',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.ttf',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'application/font-sfnt',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.woff',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'font/woff',
            cacheControl: defaultCacheConfig
        },
        {
            pattern: '*.woff2',
            target: buildAssetsTargetPath,
            source: buildAssetsSourcePath,
            contentType: 'font/woff2',
            cacheControl: defaultCacheConfig
        }
    ]
};

/**
 * Retrieves the static assets of the Nuxt app that shall be publicly available.
 *
 * @param srcDir The path to the directory within the root directory (`rootDir`) at which the `public` assets folder of the Nuxt app is located.
 * @param rootDir The path to the root directory of the Nuxt app at which the `.output` build folder is located.
 */
export const getNuxtAppStaticAssetConfigs = (srcDir: string|undefined = undefined, rootDir: string = '.'): StaticAssetConfig[] => {
    return [...getNuxtAppBuildAssetConfigs(rootDir), ...getNuxtAppCustomAssetConfigs(srcDir, rootDir)];
};