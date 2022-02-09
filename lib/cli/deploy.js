#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const deploymentFolder = '.nuxt/cdk-deployment';
const deploymentSourceFolder = `${deploymentFolder}/src`;
const deploymentLayerFolder = `${deploymentFolder}/layer/nodejs`;

// Refresh the deployment folder to a clean state
shell.echo('Refreshing deployment folder...');
shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentSourceFolder}/.nuxt/dist`);
shell.mkdir('-p', deploymentLayerFolder);

// Preparing the assets cleanup lambda function
shell.echo('Preparing the assets cleanup lambda function...');
shell.cd(path.join(__dirname, '../functions/assets_cleanup'));
if (shell.exec('yarn install --frozen-lockfile && yarn install-layer').code !== 0) {
    shell.echo('Error: Installation of assets cleanup lambda function failed.');
    shell.exit(1);
}
if (shell.exec('yarn build').code !== 0) {
    shell.echo('Error: Build of assets cleanup lambda function failed.');
    shell.exit(1);
}
shell.cd('../../../../..');

// Copy our files required for SSR
shell.echo('Copying ssr files for Nuxt app...');
shell.cp('-r', '.nuxt/dist/server', `${deploymentSourceFolder}/.nuxt/dist`);
shell.cp(path.join(__dirname, '../functions/app/index.js'), deploymentSourceFolder);

// Prepare the Lambda layer for the node_modules required for SSR of the Nuxt app
shell.echo('Preparing the lambda layer for Nuxt app...');
shell.cp('package.json', deploymentLayerFolder);
shell.cp('yarn.lock', deploymentLayerFolder);
shell.cd(deploymentLayerFolder);
if (shell.exec('yarn install --production --frozen-lockfile').code !== 0) {
    shell.echo('Error: Installation of lambda layer failed.');
    shell.exit(1);
}
shell.cd('../../../..');

// Copy the config files
shell.echo('Copying config files...');
shell.cp('.env', deploymentSourceFolder);
shell.cp('nuxt.config.js', deploymentSourceFolder);

// Run the deployment
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"').code !== 0) {
    shell.echo('Error: CDK deployment failed.');
    shell.exit(1);
}

shell.echo('CDK deployment succeeded.');
