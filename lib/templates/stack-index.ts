#!/usr/bin/env node
import {App} from "aws-cdk-lib";
import {NuxtAppStack, NuxtAppStackProps, NuxtAppAssetsCleanupProps, NuxtAppAssetsCleanupStack, AppStackProps} from "cdk-nuxt";
import * as NuxtConfig from "../nuxt.config";

const app: App = new App();

const commonProps: AppStackProps = {
    // The AWS environment (account/region) where this stack will be deployed.
    env: {
        account: 'XXXXXXXX',
        region: 'eu-central-1'
    },
    // A string identifier for the project the Nuxt app is part of. A project might have multiple different services.
    project: 'my-project',
    // A string identifier for the project's service the Nuxt app is created for. This can be seen as the name of the Nuxt app.
    service: 'nuxt-app',
    // A string to identify the environment of the Nuxt app.
    environment: 'dev',
    // Stack tags that will be applied to all the taggable resources and the stack itself.
    tags: {
        service: 'nuxt-app'
    }
};

const appStackProps: NuxtAppStackProps = {
    ...commonProps,
    // The domain (without the protocol) at which the Nuxt app shall be publicly available.
    domain: 'example.com',
    // The ARN of the certificate to use for the Nuxt app to make it accessible via HTTPS.
    // The certificate must be issued for the specified domain in us-east-1 (global) regardless of the region used for the Nuxt app itself.
    globalTlsCertificateArn: 'arn:aws:acm:us-east-1:XXXXXXXXXX:certificate/XXXXXXXXXXXXXXXXX',
    // The id of the hosted zone to create a DNS record for the specified domain.
    hostedZoneId: 'XXXXXXXXXXXXX',

    nuxtConfig: NuxtConfig
};
const appStack = new NuxtAppStack(app, `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);

const cleanupStackProps: NuxtAppAssetsCleanupProps = {
    ...commonProps,
    service: `${appStackProps.service}-assets-cleanup`,
    staticAssetsBucket: appStack.staticAssetsBucket,
};
new NuxtAppAssetsCleanupStack(app, `${cleanupStackProps.project}-${cleanupStackProps.service}-${cleanupStackProps.environment}-stack`, cleanupStackProps);