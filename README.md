# AWS CDK Nuxt Deployment Stack (Nuxt 3 & Nuxt 4)

<p>
    <a href="https://github.com/ferdinandfrank/cdk-nuxt/actions/workflows/publish.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/ferdinandfrank/cdk-nuxt/publish.yml?logo=github" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="Version" src="https://img.shields.io/npm/v/cdk-nuxt.svg" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="Downloads" src="https://img.shields.io/npm/dm/cdk-nuxt.svg"></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="License" src="https://img.shields.io/npm/l/cdk-nuxt.svg" /></a>
</p>

Easily deploy Nuxt applications (Nuxt 3 and Nuxt 4) via CDK on AWS, including the following features:

- Fast responses via [AWS Lambda](https://aws.amazon.com/lambda/)
- Publicly available by a custom domain (or subdomain) via [Route53](https://aws.amazon.com/route53/) and [API Gateway](https://aws.amazon.com/api-gateway/)
- Automatic redirects from HTTP to HTTPS via [CloudFront](https://aws.amazon.com/cloudfront/)
- Automatic upload of the build files for CSR and static assets to [S3](https://aws.amazon.com/s3/) with optimized caching rules
- Scheduled pings of the Nuxt app to keep the Lambda warm for fast responses via [EventBridge](https://aws.amazon.com/eventbridge/) rules
- Automatic cleanup of outdated static assets and build files
- Access logs analysis via [Athena](https://aws.amazon.com/athena/) for the Nuxt app's CloudFront distribution

## Table of Contents

- [Prerequisites](#prerequisites)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Setup](#setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Destroy the Stack](#destroy-the-stack)
- [Reference: Created AWS Resources](#reference-created-aws-resources)
- [Guidelines](#guidelines)

## Prerequisites

- You need an [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/?nc1=h_ls) to create and deploy the required resources for the Nuxt app on AWS.
- You can use your preferred package manager: pnpm, npm, or Yarn. The examples below show commands for each where relevant.

## Compatibility

This package is compatible with the following Nuxt versions:
- Nuxt 3 (latest stable)
- Nuxt 4 (RC and stable)

Notes:
- Make sure to set Nitro's preset to `aws-lambda` as shown below.
- If you encounter any version-specific issues, please open an issue on GitHub.

## Installation

This library ships compiled JS and small CLI helpers. To use it in your CDK app, install the following in your project.

Required peer dependencies (must be installed in your project):
- aws-cdk-lib ^2.214.0
- constructs ^10.4.2

Optional peer dependency (only if you use Access Logs Analysis features):
- @aws-cdk/aws-glue-alpha 2.214.0-alpha.0

The package itself:
- cdk-nuxt (usually as a devDependency in your infrastructure repo)

Dev-time tools for TypeScript CDK apps (not required at runtime of this package):
- typescript and ts-node
- AWS CDK CLI (aws-cdk) is optional; you can also use `npx cdk`.

Choose your package manager:

Using pnpm:
```bash
pnpm add -D cdk-nuxt aws-cdk-lib@^2.214.0 constructs@^10.4.2
# Optional (only if you enable Access Logs Analysis):
pnpm add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
# If your CDK app is written in TypeScript:
pnpm add -D typescript ts-node
# Optional convenience:
pnpm add -D aws-cdk@^2.214.0
```

Using npm:
```bash
npm install --save-dev cdk-nuxt aws-cdk-lib@^2.214.0 constructs@^10.4.2
# Optional (only if you enable Access Logs Analysis):
npm install --save-dev @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
# If your CDK app is written in TypeScript:
npm install --save-dev typescript ts-node
# Optional convenience:
npm install --save-dev aws-cdk@^2.214.0
```

Using Yarn:
```bash
yarn add -D cdk-nuxt aws-cdk-lib@^2.214.0 constructs@^10.4.2
# Optional (only if you enable Access Logs Analysis):
yarn add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
# If your CDK app is written in TypeScript:
yarn add -D typescript ts-node
# Optional convenience:
yarn add -D aws-cdk@^2.214.0
```

Notes:
- aws-cdk-lib and constructs are declared as peerDependencies to avoid duplicate installations and version skew with your application's CDK setup.
- If you don’t use Access Logs Analysis, you don’t need @aws-cdk/aws-glue-alpha.
- This package targets aws-cdk-lib 2.214.x; keep your project's aws-cdk-lib within the 2.214.x range for the best compatibility.

## Setup

1. Set the Nitro preset on your Nuxt configuration file (`nuxt.config.js`) to `aws-lambda`:
    ```js
    export default defineNuxtConfig({
        ...
        nitro: {
            preset: 'aws-lambda'
        },
        ...      
    });
    ```
   See https://nitro.unjs.io/deploy/providers/aws for more details.
2. Remove `"type": "module"` from your `package.json` file, if it exists.
   This is required to make the CDK stack work. Click [here](https://github.com/ferdinandfrank/cdk-nuxt/issues/3) for details. 
3. [Create an AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/?nc1=h_ls), if you don't have one yet. Then login into the AWS console and note the `Account ID`. You will need it in step 7.
4. [Create a hosted zone in Route53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) for the desired domain, if you don't have one yet.<br/>This is required to create DNS records for the domain to make the Nuxt app publicly available on that domain.<br/>On the hosted zone details you should see the `Hosted zone ID` of the hosted zone. You will need it in step 7.
5. [Request a public **regional** certificate in the AWS Certificate Manager (ACM)](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) for the desired domain in your desired region, e.g., `eu-central-1`, and validate it, if you don't have one yet.<br/>This is required to make the Nuxt app accessible via the custom domain and to provide the custom domain to the Nuxt app via the 'Host' header for server side rendering use cases.<br/>Take note of the displayed `ARN` for the certificate. You will need it in step 7.
6. [Request a public **global** certificate in the AWS Certificate Manager (ACM)](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) for the desired domain in `us-east-1` (**global**) and validate it, if you don't have one yet.<br/>This is required to provide the Nuxt app via HTTPS on the public internet.<br/>Take note of the displayed `ARN` for the certificate. You will need it in step 7.<br/>**Important: The certificate must be issued in us-east-1 (global) regardless of the region used for the Nuxt app itself as it will be attached to the Cloudfront distribution which works globally.**
7. Run the following command to automatically create the required CDK stack entrypoint at `stack/index.ts`. This file defines the config how the Nuxt app will be deployed via CDK. You should adapt the file to the project's needs, especially the props `env.account` (setup step 3), `hostedZoneId` (setup step 4), `regionalTlsCertificateArn` (setup step 5) and `globalTlsCertificateArn` (setup step 6).

   ```bash
   node_modules/.bin/cdk-nuxt-init-server
   ```

   > :warning: It's recommended using a `.env` file or another secrets file to import the sensitive secrets into the `stack/index.ts` file.

## Configuration

The `NuxtServerAppStack` construct can be configured via the following props:

### project: string
A string identifier for the project the Nuxt app is part of.
A project might have multiple different services.

### service: string
A string identifier for the project's service the Nuxt app is created for.
This can be seen as the name of the Nuxt app.

### environment: string
A string to identify the environment of the Nuxt app. This enables us
to deploy multiple different environments of the same Nuxt app, e.g., production and development.

### domain: string
The domain (without the protocol) at which the Nuxt app shall be publicly available.
A DNS record will be automatically created in Route53 for the domain.
This also supports subdomains.
Examples: "example.com", "sub.example.com"

### hostedZoneId: string
The id of the hosted zone to create a DNS record for the specified domain.

### globalTlsCertificateArn: string
The ARN of the certificate to use on CloudFront for the Nuxt app to make it accessible via HTTPS.
The certificate must be issued for the specified domain in us-east-1 (global) regardless of the
region specified via 'env.region' as CloudFront only works globally.

### regionalTlsCertificateArn: string
The ARN of the certificate to use at the ApiGateway for the Nuxt app to make it accessible via the custom domain
and to provide the custom domain to the Nuxt app via the 'Host' header for server side rendering use cases.
The certificate must be issued in the same region as specified via 'env.region' as ApiGateway works regionally.

### rootDir?: string;
The path to the root directory of the Nuxt app (at which the `nuxt.config.ts` file is located).
Defaults to '.'.

### entrypoint?: string
The file name (without extension) of the Lambda entrypoint within the 'server' directory exporting a handler.
Defaults to "index".

### entrypointEnv?: string
A JSON serialized string of environment variables to pass to the Lambda function.

### memorySize?: number
The memory size to apply to the Nuxt app's Lambda.
Defaults to 1792MB (optimized for costs and performance for standard Nuxt apps).

### enableTracing?: boolean
Whether to enable AWS X-Ray for the Nuxt Lambda function.

### enableApi?: boolean
Whether to enable (HTTPS only) API access to the Nuxt app via the `/api` path which support all HTTP methods. 
See https://nuxt.com/docs/guide/directory-structure/server#recipes for details.

### enableSitemap?: boolean
Whether to enable a global Sitemap bucket which is permanently accessible through multiple deployments.

### enableAccessLogsAnalysis?: boolean
Whether to enable access logs analysis for the Nuxt app's CloudFront distribution via Athena.

### accessLogCookies?: string[]
An array of cookies to include for reporting in the access logs analysis.
Only has an effect when `enableAccessLogsAnalysis` is set to `true`.

### outdatedAssetsRetentionDays?: number
The number of days to retain static assets of outdated deployments in the S3 bucket.
Useful to allow users to still access old assets after a new deployment when they are still browsing on an old version.
Defaults to 30 days.

### forwardHeaders?: string[]
An array of HTTP headers to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
This should only be used for headers that do not affect the response.

No headers are forwarded by default.

### cacheKeyHeaders?: string[]
An array of HTTP headers to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
This should be used for headers that might affect the response, e.g., 'Authorization'.

No headers are forwarded or included in the cache key by default.

### forwardCookies?: string[]
An array of cookies to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
This should only be used for cookies that do not affect the response.

No cookies are forwarded by default.

### cacheKeyCookies?: string[]
An array of cookies to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
This should be used for cookies that might affect the response, e.g., authentication cookies.

No cookies are forwarded or included in the cache key by default.

### forwardQueryParams?: string[]
An array of query params to forward to the Nuxt app on origin requests without affecting the cache key at CloudFront edge locations.
This should only be used for query params that do not affect the response and are required on SSR requests.

All query params are forwarded by default.

### cacheKeyQueryParams?: string[]
An array of query params to forward to the Nuxt app and to include in the cache key for objects that are cached at CloudFront edge locations.
This should be used for query params that affect the response and are required on SSR requests, e.g., filters.

All query params are forwarded and included in the cache key by default.

### denyCacheKeyQueryParams?: string[]
An array of query params to prevent forwarding to the Nuxt app and to not include in the cache key for objects that are cached at CloudFront edge locations.
When set, all query params that are not specified in this array will be forwarded to the Nuxt app and included in the cache key.
This should be used for query params that do not affect the response and are not required on SSR requests, e.g., 'fbclid' or 'utm_campaign'.

If both `cacheKeyQueryParams` and `denyCacheKeyQueryParams` are specified, the `denyCacheKeyQueryParams` will be ignored.
All query params are forwarded and included in the cache key by default.


## Deployment

After the installation and the setup, you are already good to go to build the Nuxt app and to deploy it to AWS with this package
by following the steps below:

### 1. Bootstrap CDK
Deploying stacks with the AWS CDK requires dedicated Amazon S3 buckets and other containers to be available to AWS CloudFormation during deployment. 
Creating this is called bootstrapping and is **only required once** per account and region. 
To bootstrap, run the following command:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

See https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html for details.

### 2. Build and Deploy

By running the following script, the Nuxt app will be built (using your package manager's `build` script)
and the CDK stack will be deployed to AWS.

```bash
node_modules/.bin/cdk-nuxt-deploy-server
```

Alternatively, you can run the following commands separately to customize the deployment process. Choose your package manager:

Using pnpm:
```bash
pnpm build
pnpm cdk deploy --require-approval never --all --app="pnpm ts-node stack/index.ts"
```

Using npm:
```bash
npm run build
npx cdk deploy --require-approval never --all --app="npx ts-node stack/index.ts"
```

Using Yarn:
```bash
yarn build
yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"
```

#### Deploy with a custom TypeScript configuration
Depending on your Nuxt app's TypeScript configuration and the setup of your stack, you might need a different TypeScript configuration for the CDK stack.
You can do so by creating a `tsconfig.cdk.json` file in the root directory of your project and adjust the deployment command accordingly (choose your package manager):

Using pnpm:
```bash
pnpm build
pnpm cdk deploy --require-approval never --all --app="pnpm ts-node --project=tsconfig.cdk.json stack/index.ts"
```

Using npm:
```bash
npm run build
npx cdk deploy --require-approval never --all --app="npx ts-node --project=tsconfig.cdk.json stack/index.ts"
```

Using Yarn:
```bash
yarn build
yarn cdk deploy --require-approval never --all --app="yarn ts-node --project=tsconfig.cdk.json stack/index.ts"
```

## Destroy the Stack

If you want to destroy the stack and all its resources (including storage, e.g., access logs), run the following script:

```bash
node_modules/.bin/cdk-nuxt-destroy-server
```

## Reference: Created AWS Resources

In the following, you can find an overview of the AWS resources that will be created by this package for reference.

### NuxtServerAppStack

This stack is responsible for deploying dynamic Nuxt apps to AWS.
This stack will create the following AWS resources:

- [Lambda](https://aws.amazon.com/lambda/):
    - A Lambda function to render the Nuxt app including a separated Lambda layer to provide the `node_modules` of the Nuxt app required for server-side rendering.
    - A Lambda function that deletes the outdated static assets of the Nuxt app from S3.
- [S3](https://aws.amazon.com/s3/):
    - A bucket to store the client files and static assets of the Nuxt build (`.nuxt/dist/client`) with optimized cache settings.
    - A bucket to store the CloudFront access logs for analysis via Athena. Only created if `enableAccessLogsAnalysis` is set to `true`.
- [Route53](https://aws.amazon.com/route53/): Two DNS records (`A` for IPv4 and `AAAA` for IPv6) in the configured hosted zone to make the Nuxt app available on the internet via the configured custom domain.
- [API Gateway](https://aws.amazon.com/api-gateway/): An HTTP API to make the Nuxt Lambda function publicly available.
- [CloudFront](https://aws.amazon.com/cloudfront/): A distribution to route incoming requests to the Nuxt Lambda function (via the API Gateway) and the S3 bucket to serve the static assets for the Nuxt app.
- [EventBridge](https://aws.amazon.com/eventbridge/):
    - A scheduled rule to ping the Nuxt app's Lambda function every 5 minutes in order to keep it warm and to speed up initial SSR requests.
    - A scheduled rule to trigger the cleanup Lambda function for deleting the outdated static assets of the Nuxt app from S3 every tuesday at 03:30 AM GMT.
- [Athena](https://aws.amazon.com/athena/): A database and table to analyze the access logs of the Nuxt app's CloudFront distribution. Only created if `enableAccessLogsAnalysis` is set to `true`.

## Guidelines

In the following, you can find some guidelines for the deployment and usages of this package.

### Automatically deploy on every push (CD) via [GitHub Actions](https://github.com/features/actions)

Feel free to copy the following GitHub Actions YAML file content into a YAML file at `.github/workflows/deploy.yml` to automatically build and deploy the Nuxt app to AWS on every push to a specific branch.<br/>This only works if you're using GitHub for the project's VCS repository.

```yaml
name: Deploy

on:
  push:
    branches:
      - master # Feel free to use another branch name

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4
        
      # Enable if using Yarn >= 2  
      # - name: Enable Corepack for Yarn
      #   run: corepack enable

      - name: Configure Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm' # or 'yarn' or 'npm'

      - name: Install dependencies
        run: |
          pnpm install --frozen-lockfile
          # or: npm ci
          # or: yarn install --frozen-lockfile # or `yarn install --immutable` for Yarn >= 2

      - name: Build and deploy to AWS
        run: node_modules/.bin/cdk-nuxt-deploy-server # Or run a customized deployment, see 'Build and Deploy' section
        env:
           # Create an IAM user on AWS for the deployment and create the appropriate secrets in the GitHub repository secrets
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION }}
```
