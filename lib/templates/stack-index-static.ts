#!/usr/bin/env node
import {App} from "aws-cdk-lib";
import {NuxtStaticAppStack, NuxtStaticAppStackProps} from "cdk-nuxt";
const NuxtConfig = require('../nuxt.config');

const appStackProps: NuxtStaticAppStackProps = {
    // The AWS environment (account/region) where this stack will be deployed.
    env: {
        // The ID of your AWS account on which to deploy the stack.
        account: 'XXXXXXXX',

        // The AWS region where to deploy the Nuxt app.
        region: 'eu-central-1'
    },

    // A string identifier for the project the Nuxt app is part of. A project might have multiple different services.
    project: 'my-project',

    // A string identifier for the project's service the Nuxt app is created for. This can be seen as the name of the Nuxt app.
    service: 'nuxt-app',

    // A string to identify the environment of the Nuxt app.
    environment: 'dev',

    // The domain (without the protocol) at which the Nuxt app shall be publicly available.
    domain: 'example.com',

    // The ARN of the certificate to use on CloudFront for the Nuxt app to make it accessible via HTTPS.
    // The certificate must be issued for the specified domain in us-east-1 (global) regardless of the
    // region specified via 'env.region' as CloudFront only works globally.
    globalTlsCertificateArn: 'arn:aws:acm:us-east-1:XXXXXXXXXX:certificate/XXXXXXXXXXXXXXXXX',

    // The id of the hosted zone to create a DNS record for the specified domain.
    hostedZoneId: 'XXXXXXXXXXXXX',

    // The nuxt.config.js of the Nuxt app.
    nuxtConfig: NuxtConfig,

    // Stack tags that will be applied to all the taggable resources and the stack itself.
    tags: {
        service: 'nuxt-app'
    },
};

new NuxtStaticAppStack(new App(), `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);