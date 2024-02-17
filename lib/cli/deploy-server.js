#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const logPrefix = 'CDK Nuxt Deployment';
shell.echo(`${logPrefix}: Starting deployment for dynamic Nuxt app...`);

const rootFolder = process.cwd();
const deploymentSourceFolder = '.output/server';

const yarnVersion = shell.exec('yarn -v', {silent:true}).stdout
const isYarn1 = yarnVersion && yarnVersion.startsWith('1.');
const yarnInstallCommand = isYarn1 ? 'yarn install --frozen-lockfile' : 'yarn install --immutable';
const yarnFunctionsInstallCommand = `${yarnInstallCommand} && ${isYarn1 ? 'yarn install-layer' : 'yarn install-layer-berry'}`;

// Refresh the cdk output folder to have a clean state and prevent persisting outdated outputs
shell.echo(`${logPrefix}: Deleting outdated CDK files...`);
shell.rm('-rf', 'cdk.out');

// Preparing the assets cleanup Lambda function
shell.echo(`${logPrefix}: Installing the assets cleanup Lambda function...`);
shell.cd(path.join(__dirname, '../functions/assets-cleanup'));
if (shell.exec(yarnFunctionsInstallCommand).code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of assets cleanup Lambda function failed.`);
    shell.exit(1);
}
shell.echo(`${logPrefix}: Building the assets cleanup Lambda function...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Build of assets cleanup Lambda function failed.`);
    shell.exit(1);
}
shell.cd(rootFolder);

// Preparing the access logs analysis group-by-date Lambda function
shell.echo(`${logPrefix}: Installing the access logs analysis group-by-date Lambda function...`);
shell.cd(path.join(__dirname, '../functions/access-logs-analysis/group-by-date'));
if (shell.exec(yarnFunctionsInstallCommand).code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of access logs analysis group-by-date Lambda function failed.`);
    shell.exit(1);
}
shell.echo(`${logPrefix}: Building the access logs analysis group-by-date Lambda function...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Build of access logs analysis group-by-date Lambda function failed.`);
    shell.exit(1);
}
shell.cd(rootFolder);

// Preparing the access logs analysis partitioning Lambda function
shell.echo(`${logPrefix}: Installing the access logs analysis partitioning Lambda function...`);
shell.cd(path.join(__dirname, '../functions/access-logs-analysis/partitioning'));
if (shell.exec(yarnFunctionsInstallCommand).code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of access logs analysis partitioning Lambda function failed.`);
    shell.exit(1);
}
shell.echo(`${logPrefix}: Building the access logs analysis partitioning Lambda function...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Build of access logs analysis partitioning Lambda function failed.`);
    shell.exit(1);
}
shell.cd(rootFolder);

// Install the Nuxt app dependencies
shell.echo(`${logPrefix}: Installing app dependencies...`);
if (shell.exec(yarnInstallCommand).code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of app dependencies failed.`);
    shell.exit(1);
}

// Build the Nuxt app
shell.echo(`${logPrefix}: Building app...`);
if (shell.exec('yarn build').code !== 0) {
    shell.echo(`${logPrefix} Error: Building app failed.`);
    shell.exit(1);
}

// Copy the custom Nuxt app Lambda entry point files
if (shell.test('-d', 'server')) {
    shell.echo(`${logPrefix}: Copying custom Lambda handler files from 'server' directory...`);
    shell.cp('-r', 'server/.', deploymentSourceFolder);
}

// Run the deployment
shell.echo(`${logPrefix}: Deploying to AWS via CDK...`);
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts" ' + process.argv.slice(2)).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);

