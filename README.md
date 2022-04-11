# CDK Nuxt Plugin

<p>
    <a href="https://github.com/ferdinandfrank/cdk-nuxt/actions/workflows/publish.yml"><img alt="Build" src="https://img.shields.io/github/workflow/status/ferdinandfrank/cdk-nuxt/Publish?logo=github" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="Version" src="https://img.shields.io/npm/v/cdk-nuxt.svg" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="License" src="https://img.shields.io/npm/l/cdk-nuxt.svg" /></a>
</p>

Easily deploy Nuxt applications via CDK on AWS including the following features:

- Fast responses via [Lambda](https://aws.amazon.com/lambda/) (`target=server`) or [S3](https://aws.amazon.com/s3/) (`target=static`)
- Publicly available by a custom domain (or subdomain) via [Route53](https://aws.amazon.com/route53/) and [API Gateway](https://aws.amazon.com/api-gateway/) (`target=server`)
- Automatic redirects from HTTP to HTTPS via [CloudFront](https://aws.amazon.com/cloudfront/)
- Automatic upload of the build files for CSR and static assets to [S3](https://aws.amazon.com/s3/) with optimized caching rules
- Scheduled pings of the Nuxt app to keep the Lambda warm for fast responses via [EventBridge](https://aws.amazon.com/eventbridge/) rules (`target=server`)
- Automatic cleanup of outdated static assets and build files (`target=server`)

> :warning: **This package might not support every Nuxt config yet.** But feel free to give it a try and open an issue or a PR if necessary.

## Prerequisites

- This package currently relies on using [yarn](https://yarnpkg.com/) instead of npm for deployment. Therefore, make sure to have yarn available on the deployment system.
- You need an [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/?nc1=h_ls) to create and deploy the required resources for the Nuxt app on AWS.

## Installation

Two CDK stacks can be used to deploy a Nuxt app to AWS using this package depending on the [app's target setting](https://nuxtjs.org/docs/configuration-glossary/configuration-target#the-target-property).
Therefore, follow the installation steps for your corresponding target setting.

### Target: 'server'

1. Install the package and its required dependencies:
    ```bash
    yarn add cdk-nuxt --dev # The package itself
    yarn add ts-node typescript --dev # To compile the CDK stacks via typescript
    yarn add aws-cdk@2.15.0 --dev # CDK cli with this exact version for the deployment
    yarn add @vendia/serverless-express nuxt-start # To make the Nuxt app renderable via the default Lambda handler (not required when using your own Lambda handler)
    ```

2. Move the `nuxt` dependency to `devDependencies` as we installed `nuxt-start` to start our Nuxt app.<br/>Also, make sure that only the dependencies required for server-side rendering (SSR) are listed under `dependencies` to have the Lambda function and its layer as small as possible for better performance and to respect the [Lambda size limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html). Every other dependency should be under `devDependencies`. 
   
3. Move the `devDependencies` section in the `package.json` file above the `dependencies` section. This enables the deployment code to fully remove the `devDependencies` section while installing the Lambda layer for the `node_modules` to only keep the modules required for SSR and to keep it as small as possible.

After the installation steps the `package.json` file should look something like this:

```json
{
  "name": "nuxt-app",
  "devDependencies": {
    "aws-cdk": "2.15.0",
    "cdk-nuxt": "^X.X.X",
    "nuxt": "^X.X.X",
    "ts-node": "^X.X.X",
    "typescript": "^X.X.X"
  },
  "dependencies": {
    "@vendia/serverless-express": "^X.X.X",
    "nuxt-start": "^X.X.X"
  }
}
```

### Target: 'static'

Install the package and its required dependencies:
 ```bash
 yarn add cdk-nuxt --dev # The package itself
 yarn add ts-node typescript --dev # To compile the CDK stacks via typescript
 yarn add aws-cdk@2.15.0 --dev # CDK cli with this exact version for the deployment
 ```

## Setup

Again, follow the steps according to the [app's target setting](https://nuxtjs.org/docs/configuration-glossary/configuration-target#the-target-property).

### Target: 'server'
1. Replace the `export default` part of your Nuxt configuration file (`nuxt.config.js`) with `module.exports =`, so it fits the following format:
   ```js
   // Change "export default" => "module.exports ="
   module.exports = {
     target: 'server',
     ...
   }
   ```
2. [Create an AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/?nc1=h_ls), if you don't have one yet. Then login into the AWS console and note the `Account ID`. You will need it in step 6.
3. [Create a hosted zone in Route53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) for the desired domain, if you don't have one yet.<br/>This is required to create DNS records for the domain to make the Nuxt app publicly available on that domain.<br/>On the hosted zone details you should see the `Hosted zone ID` of the hosted zone. You will need it in step 6.
4. [Request a public **regional** certificate in the AWS Certificate Manager (ACM)](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) for the desired domain in your desired region, e.g., `eu-central-1`, and validate it, if you don't have one yet.<br/>This is required to make the Nuxt app accessible via the custom domain and to provide the custom domain to the Nuxt app via the 'Host' header for server side rendering use cases.<br/>Take note of the displayed `ARN` for the certificate. You will need it in step 6.
5. [Request a public **global** certificate in the AWS Certificate Manager (ACM)](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) for the desired domain in `us-east-1` (**global**) and validate it, if you don't have one yet.<br/>This is required to provide the Nuxt app via HTTPS on the public internet.<br/>Take note of the displayed `ARN` for the certificate. You will need it in step 6.<br/>**Important: The certificate must be issued in us-east-1 (global) regardless of the region used for the Nuxt app itself as it will be attached to the Cloudfront distribution which works globally.**
6. Run the following command to automatically create the required CDK stack entrypoint at `stack/index.ts`. This file defines the config how the Nuxt app will be deployed via CDK. You should adapt the file to the project's needs, especially the props `env.account` (setup step 2), `hostedZoneId` (setup step 3), `regionalTlsCertificateArn` (setup step 4) and `globalTlsCertificateArn` (setup step 5).

   ```bash
   node_modules/.bin/cdk-nuxt-init-server
   ```

   > :warning: It's recommended using a `.env` file or another secrets file to import the sensitive secrets into the `stack/index.ts` file.

### Target: 'static'
1. [Create an AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/?nc1=h_ls), if you don't have one yet. Then login into the AWS console and note the `Account ID`. You will need it in step 4.
2. [Create a hosted zone in Route53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html) for the desired domain, if you don't have one yet.<br/>This is required to create DNS records for the domain to make the Nuxt app publicly available on that domain.<br/>On the hosted zone details you should see the `Hosted zone ID` of the hosted zone. You will need it in step 4.
3. [Request a public **global** certificate in the AWS Certificate Manager (ACM)](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) for the desired domain in `us-east-1` (**global**) and validate it, if you don't have one yet.<br/>This is required to provide the Nuxt app via HTTPS on the public internet.<br/>Take note of the displayed `ARN` for the certificate. You will need it in step 4.<br/>**Important: The certificate must be issued in us-east-1 (global) regardless of the region used for the Nuxt app itself as it will be attached to the Cloudfront distribution which works globally.**
4. Run the following command to automatically create the required CDK stack entrypoint at `stack/index.ts`. This file defines the config how the Nuxt app will be deployed via CDK. You should adapt the file to the project's needs, especially the props `env.account` (setup step 1), `hostedZoneId` (setup step 2), and `globalTlsCertificateArn` (setup step 3).

   ```bash
   node_modules/.bin/cdk-nuxt-init-static
   ```

   > :warning: It's recommended using a `.env` file or another secrets file to import the sensitive secrets into the `stack/index.ts` file.

## Build and Deploy

After the installation and the setup you are already good to go to build the Nuxt app and to deploy it to AWS with this package.
Again, follow the steps according to the [app's target setting](https://nuxtjs.org/docs/configuration-glossary/configuration-target#the-target-property).

### Target: 'server'
1. Install the dependencies for the Nuxt app including the `devDependencies` as these are required to successfully build the app:
   ```bash
   yarn install --production=false
   ```
2. Build the Nuxt app with the build settings you need for the app:
   ```bash
   yarn build
   ```
3. Run the CDK deployment:
   ```bash
   node_modules/.bin/cdk-nuxt-deploy-server
   ```
   The deployment script will take care of installing only the dependencies that are required for the Nuxt app and deploying the Nuxt build files to AWS according to the stack settings in `stack/index.ts`.<br/>See the section Used AWS Resources for details on which resources will exactly be created on AWS.

#### Optional: Customize the Lambda handler

The package takes advantage of the `nuxt-start` and `aws-lambda` modules to automatically provide a Lambda handler for the Nuxt app. 
If you need more control over the entrypoint of the Lambda function, e.g., for adding additional logging or performance monitoring, feel free to specify your own handler within a file `server/index.js` within your root directory.
If a file `server/index.js` exists, the package will use this file as the entrypoint for the Lambda.
The file `server/index.js` must export a function called `handler` to work properly.
Feel free to take the following content of the package's default handler as a template:

```js
const serverlessExpress = require('@vendia/serverless-express');
const config = require('./nuxt.config.js');
const { Nuxt } = require('nuxt-start');

const nuxt = new Nuxt({
   ...config,
   dev: false,
   _start: true,
})
const app = nuxt.server.app;

let serverlessExpressInstance = null;
async function initNuxt(event, context) {
   await nuxt.ready();
   serverlessExpressInstance = serverlessExpress({ app })

   return serverlessExpressInstance(event, context)
}

exports.handler = async (event, context) => {
   if (serverlessExpressInstance) {
      return serverlessExpressInstance(event, context)
   }

   return await initNuxt(event, context)
}
```

### Target: 'static'
1. Install the dependencies for the Nuxt app including the `devDependencies` as these are required to successfully build the app:
   ```bash
   yarn install --production=false
   ```
2. Build the Nuxt app with the build settings you need for the app:
   ```bash
   yarn generate
   ```
3. Run the CDK deployment:
   ```bash
   node_modules/.bin/cdk-nuxt-deploy-static
   ```
   The deployment script will take care of deploying the Nuxt build files to AWS according to the stack settings in `stack/index.ts`.<br/>See the section Used AWS Resources for details on which resources will exactly be created on AWS.


## Optional: Automatically deploy on every push (CD) via [GitHub Actions](https://github.com/features/actions)

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
    strategy:
      matrix:
        node-version: [ 14.x ]
    steps:
      - name: Checkout source code
        uses: actions/checkout@v2

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node-version }}

      # Init cache to speed up yarn install
      - name: Get yarn cache directory path
        id: yarn-cache-dir-path
        run: echo "::set-output name=dir::$(yarn cache dir)"

      - uses: actions/cache@v2
        with:
          path: ${{ steps.yarn-cache-dir-path.outputs.dir }}
          key: ${{ runner.os }}-node-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-node-

      # Optionally copy any secrets from the GitHub repository secrets to the deployment project directory right here

      - name: Install dependencies
        run: yarn install --production=false # Important to install devDependencies for the build

      - name: Build project
        run: yarn build # (or yarn generate)

      - name: Deploy to AWS
        run: node_modules/.bin/cdk-nuxt-deploy-server # (or node_modules/.bin/cdk-nuxt-deploy-static)
        env:
           # Create an IAM user on AWS for the deployment and create the appropriate secrets in the GitHub repository secrets
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION }}
```

## Advanced: Used AWS Resources

Two CDK stacks can be used to deploy a Nuxt app to AWS using this package depending on the [app's target setting](https://nuxtjs.org/docs/configuration-glossary/configuration-target#the-target-property).

### NuxtServerAppStack ([`target=server`](https://nuxtjs.org/docs/features/deployment-targets))

This stack is responsible for deploying dynamic Nuxt apps (`target=server`) to AWS.
The following AWS resources will be created by this stack:

- [Lambda](https://aws.amazon.com/lambda/): 
  - A Lambda function to render the Nuxt app including a separated Lambda layer to provide the `node_modules` of the Nuxt app required for server-side rendering.
  - A Lambda function that deletes the outdated static assets of the Nuxt app from S3.
- [S3](https://aws.amazon.com/s3/): A bucket to store the client files of the Nuxt build (`.nuxt/dist/client`) and the custom static files of the Nuxt app (`static`) with optimized cache settings.
- [Route53](https://aws.amazon.com/route53/): Two DNS records (`A` for IPv4 and `AAAA` for IPv6) in the configured hosted zone to make the Nuxt app available on the internet via the configured custom domain.
- [API Gateway](https://aws.amazon.com/api-gateway/): An HTTP API to make the Nuxt Lambda function publicly available.
- [CloudFront](https://aws.amazon.com/cloudfront/): A distribution to route incoming requests to the Nuxt Lambda function (via the API Gateway) and the S3 bucket to serve the static assets for the Nuxt app.
- [EventBridge](https://aws.amazon.com/eventbridge/): 
  - A scheduled rule to ping the Nuxt app's Lambda function every 5 minutes in order to keep it warm and to speed up initial SSR requests.
  - A scheduled rule to trigger the cleanup Lambda function for deleting the outdated static assets of the Nuxt app from S3 every tuesday at 03:30 AM GMT.

### NuxtStaticAppStack ([`target=static`](https://nuxtjs.org/docs/features/deployment-targets))

This stack is responsible for deploying static Nuxt apps (`target=static`) to AWS.
The following AWS resources will be created by this stack:

- [S3](https://aws.amazon.com/s3/): A bucket configured as website host to provide the files of the Nuxt build (`dist`) including the custom static files of the Nuxt app (`static`) with optimized cache settings.
- [Route53](https://aws.amazon.com/route53/): Two DNS records (`A` for IPv4 and `AAAA` for IPv6) in the configured hosted zone to make the Nuxt app available on the internet via the configured custom domain.
- [CloudFront](https://aws.amazon.com/cloudfront/): A distribution to route incoming requests to the S3 bucket to serve the Nuxt app.
