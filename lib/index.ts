#!/usr/bin/env node
import {App} from "aws-cdk-lib";
import {NuxtAppStack, NuxtAppStackProps} from "./stack/nuxt-app-stack";
import {NuxtAppAssetsCleanupProps, NuxtAppAssetsCleanupStack} from "./stack/nuxt-app-assets-cleanup-stack";

// Extract the environment vars
const requiredEnvVars: {[key: string]: string} = {
    environment: process.env.ENVIRONMENT || '',
    project: process.env.CDK_PROJECT || '',
    service: process.env.CDK_SERVICE || '',
    domain: process.env.CDK_DOMAIN || '',
    region: process.env.CDK_DEFAULT_REGION || '',
    account: process.env.CDK_DEFAULT_ACCOUNT || '',
    certificateArn: process.env.CDK_TLS_CERTIFICATE_ARN || '',
    hostedZoneId: process.env.CDK_HOSTED_ZONE_ID || '',
    sentryDsn: process.env.SENTRY_DSN || '',
};

// Validate the environment vars
Object.keys(requiredEnvVars).forEach(envKey => {
    if (!requiredEnvVars[envKey] || requiredEnvVars[envKey] === '') {
        throw new Error(`${envKey} is missing in environment!`);
    }
})

const app: App = new App();

const domainParts = requiredEnvVars.domain.split('.');

const appStackProps: NuxtAppStackProps = {
    project: requiredEnvVars.project,
    service: requiredEnvVars.service,
    baseDomain: domainParts[0],
    subDomain: domainParts.length > 1 ? domainParts[1] : undefined,
    globalTlsCertificateArn: requiredEnvVars.certificateArn,
    env: { account: requiredEnvVars.account, region: requiredEnvVars.region },
    environment: requiredEnvVars.environment,
    hostedZoneId: requiredEnvVars.hostedZoneId
};
const appStack = new NuxtAppStack(app, `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);

const cleanupStackProps: NuxtAppAssetsCleanupProps = {
    project: requiredEnvVars.project,
    service: `${requiredEnvVars.service}-assets-cleanup`,
    staticAssetsBucket: appStack.staticAssetsBucket,
    env: { account: requiredEnvVars.account, region: requiredEnvVars.region },
    environment: requiredEnvVars.environment,
    sentryDsn: requiredEnvVars.sentryDsn,
};
new NuxtAppAssetsCleanupStack(app, `${cleanupStackProps.project}-${cleanupStackProps.service}-${cleanupStackProps.environment}-stack`, cleanupStackProps);