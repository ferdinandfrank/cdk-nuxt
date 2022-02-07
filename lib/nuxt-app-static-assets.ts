import {CacheControl} from "aws-cdk-lib/aws-s3-deployment";
import {Duration} from "aws-cdk-lib";

interface StaticAssetConfig {
    pattern: string, // The pattern to use for accessing the files
    contentType: string, // The type of the files to upload
    source: string, // The local directory to upload the files from
    target: string, // The remote path at which to make the uploaded files accessible
    cacheControl?: CacheControl[] // The custom cache settings
}

const buildAssetsSourcePath = './.nuxt/dist/client';
const buildAssetsTargetPath = '/assets/'; // Must match 'build.publicPath' in nuxt.config.js

const customAssetsSourcePath = './src/static';
const customAssetsTargetPath = '/';

// Defines the paths with their cache settings that shall be public available in our app
// These should match the files in 'src/.nuxt/dist/client' and 'static'
export const NuxtAppStaticAssets: StaticAssetConfig[] = [

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
        pattern: 'sw.js',
        target: buildAssetsTargetPath,
        source: buildAssetsSourcePath,
        contentType: 'application/javascript; charset=UTF-8',
        cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
    },
    {
        pattern: 'sw.js.map',
        target: buildAssetsTargetPath,
        source: buildAssetsSourcePath,
        contentType: 'application/json; charset=UTF-8',
        cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(1))],
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
        pattern: 'manifest.json',
        source: customAssetsSourcePath,
        target: customAssetsTargetPath,
        contentType: 'application/json; charset=UTF-8',
        cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.days(2))],
    },
];