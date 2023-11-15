import {CacheControl} from "aws-cdk-lib/aws-s3-deployment";
import {Duration} from "aws-cdk-lib";

export interface StaticAssetConfig {

    /**
     * The local directory to upload the files from.
     */
    source: string,

    /**
     * The file pattern that matches files to upload (recursively) from the source prop directory.
     * Also defines the pattern for the incoming requests that should be forwarded to the target path in the
     * static assets S3 bucket with the appropriate cache and content settings defined in the same object.
     */
    pattern: string,

    /**
     * An array of file patterns to exclude from the upload.
     */
    exclude?: string[],

    /**
     * The remote path at which to make the uploaded files from source accessible.
     */
    target: string,

    /**
     * The content type to set for the files in the source folder when uploading them to the target.
     * Useful to override force content types for specific files.
     */
    contentType?: string,

    /**
     * The cache settings to use for the uploaded source files when accessing them on the target path with the specified pattern.
     */
    cacheControl: CacheControl[],

    /**
     * Whether to invalidate the files matching the config's pattern in the distribution's edge caches after the files are uploaded to the destination bucket.
     */
    invalidateOnChange?: boolean;
}

/**
 * Retrieves the static assets of the Nuxt app that shall be publicly available.
 *
 * @param rootDir The path to the root directory of the Nuxt app at which the `.output` build folder is located.
 */
export const getNuxtAppStaticAssetConfigs = (rootDir: string = '.'): StaticAssetConfig[] => {
    const customAssetsSourcePath = `${rootDir}/.output/public`;
    const customAssetsTargetPath = '/';

    const configs: StaticAssetConfig[] = [

        // File to detect current deployment revision to delete outdated files of old deployments
        {
            pattern: 'app-revision',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'text/plain; charset=UTF-8',
            // Longer cache control since we automatically invalidate the revision file on every deployment
            cacheControl: [
                CacheControl.setPublic(),
                CacheControl.maxAge(Duration.seconds(10)),
                CacheControl.sMaxAge(Duration.days(14)),
            ],
            invalidateOnChange: true
        },

        // Build files
        {
            pattern: '_nuxt/*',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,

            // Build assets are hashed whereby they are immutable and can be cached for a long time
            cacheControl: [
                CacheControl.setPublic(),
                CacheControl.maxAge(Duration.days(365)),
                CacheControl.fromString('immutable'),
            ],
        },

        // Files for native app links
        {
            pattern: '.well-known/*',
            source: customAssetsSourcePath,
            target: customAssetsTargetPath,
            contentType: 'application/json; charset=UTF-8', // Explicitly provided as these file usually have no extension
            cacheControl: [
                CacheControl.setPublic(),
                CacheControl.maxAge(Duration.days(1)),
                CacheControl.sMaxAge(Duration.hours(1)),
            ],
        }
    ];

    // All custom files from the public dir, e.g., robots.txt, ads.txt, sitemap.xml, *.js, manifest.webmanifest, etc.
    configs.push({
        pattern: '?*.*', // exclude .gitignore and other hidden files
        exclude: configs.map(config => config.pattern), // exclude our specific configs
        source: customAssetsSourcePath,
        target: customAssetsTargetPath,

        // Custom assets might not be versioned whereby we want to prevent any caching issues when updating them
        // -> cache for only 1 day on CDN and 1 hour on browser
        cacheControl: [
            CacheControl.setPublic(),
            CacheControl.maxAge(Duration.days(1)),
            CacheControl.sMaxAge(Duration.hours(1)),
        ],
    })

    return configs;
};