#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const deploymentFolder = '.nuxt/cdk-deployment';
const deploymentSourceFolder = `${deploymentFolder}/src`;
const deploymentLayerFolder = `${deploymentFolder}/layer/nodejs`;

const logPrefix = 'Nuxt Deployment';

// Refresh the deployment folder to have a clean state
shell.echo(`${logPrefix}: Refreshing deployment folder [${deploymentFolder}]...`);
shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentSourceFolder}/.nuxt/dist`);
shell.mkdir('-p', deploymentLayerFolder);

// Preparing the assets cleanup lambda function
shell.echo(`${logPrefix}: Installing the assets cleanup lambda function...`);
shell.cd(path.join(__dirname, '../functions/assets_cleanup'));
if (shell.exec('yarn install --frozen-lockfile && yarn install-layer').code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of assets cleanup lambda function failed.`);
    shell.exit(1);
}
shell.echo(`${logPrefix}: Building the assets cleanup lambda function...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Build of assets cleanup lambda function failed.`);
    shell.exit(1);
}
shell.cd(process.cwd());

// Copy our files required for SSR
shell.echo(`${logPrefix}: Copying ssr files to deployment folder...`);
shell.cp('-r', '.nuxt/dist/server', `${deploymentSourceFolder}/.nuxt/dist`);
shell.cp(path.join(__dirname, '../functions/app/index.js'), deploymentSourceFolder);

// Copy the config files
shell.echo(`${logPrefix}: Copying config files to deployment folder...`);
shell.cp('.env', deploymentSourceFolder);
shell.cp('nuxt.config.js', deploymentSourceFolder);

// Prepare the Lambda layer for the node_modules required for SSR of the Nuxt app
shell.echo(`${logPrefix}: Preparing the node_modules lambda layer in deployment folder...`);
shell.cp('package.json', deploymentLayerFolder);
shell.cp('yarn.lock', deploymentLayerFolder);
shell.cd(deploymentLayerFolder);
if (shell.exec('yarn install --production --frozen-lockfile').code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of lambda layer failed.`);
    shell.exit(1);
}
shell.cd(process.cwd());

// Run the deployment
shell.echo(`${logPrefix}: Running CDK deployment...`);
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"').code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);

