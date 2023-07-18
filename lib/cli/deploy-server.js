#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const logPrefix = 'CDK Nuxt Deployment';
shell.echo(`${logPrefix}: Starting deployment for dynamic Nuxt app...`);

const rootFolder = process.cwd();
const deploymentSourceFolder = '.output/server';

// Refresh the cdk output folder to have a clean state and prevent persisting outdated outputs
shell.echo(`${logPrefix}: Deleting outdated CDK files...`);
shell.rm('-rf', 'cdk.out');

// Preparing the assets cleanup lambda function
shell.echo(`${logPrefix}: Installing the assets cleanup lambda function...`);
shell.cd(path.join(__dirname, '../functions/assets-cleanup'));
if (shell.exec('yarn install --frozen-lockfile && yarn install-layer').code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of assets cleanup lambda function failed.`);
    shell.exit(1);
}
shell.echo(`${logPrefix}: Building the assets cleanup lambda function...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Build of assets cleanup lambda function failed.`);
    shell.exit(1);
}
shell.cd(rootFolder);

// Copy the Nuxt app Lambda entrypoints
shell.cp(path.join(__dirname, '../functions/app/sentry.js'), deploymentSourceFolder);

// Install the Nuxt app dependencies
shell.echo(`${logPrefix}: Installing app dependencies...`);
if (shell.exec('yarn install --frozen-lockfile').code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of app dependencies failed.`);
    shell.exit(1);
}

// Build the Nuxt app
shell.echo(`${logPrefix}: Building app...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Building app failed.`);
    shell.exit(1);
}

// Run the deployment
shell.echo(`${logPrefix}: Deploying to AWS via CDK...`);
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts" ' + process.argv.slice(2)).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);

