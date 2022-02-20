#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const logPrefix = 'CDK Nuxt Deployment';
shell.echo(`${logPrefix}: Starting deployment...`);

const deploymentFolder = '.nuxt/cdk-deployment';
const deploymentSourceFolder = `${deploymentFolder}/src`;
const deploymentLayerFolder = `${deploymentFolder}/layer/nodejs`;
const rootFolder = process.cwd();

// Refresh the cdk output folder to have a clean state and prevent persisting outdated outputs
shell.echo(`${logPrefix}: Deleting outdated CDK files...`);
shell.rm('-rf', 'cdk.out');

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
shell.cd(rootFolder);

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
shell.cp('.yarnclean', deploymentLayerFolder);
shell.cd(deploymentLayerFolder);

// We do not want to install any dependencies listed under 'devDendencies'
// Usually the --production flag should do the trick but somehow still installs some dev dependencies in some cases
const osSystem = shell.exec('echo $OSTYPE');
const isMac = osSystem.startsWith('darwin')
if (isMac) {
    shell.exec('sed -i \'\' \'/\\"devDependencies\\"/,/}/ d\' package.json')
} else {
    shell.exec('sed -i \'/\\"devDependencies\\"/,/}/ d\' package.json')
}

if (shell.exec('yarn install --production --frozen-lockfile').code !== 0) {
    shell.echo(`${logPrefix} Error: Installation of lambda layer failed.`);
    shell.exit(1);
}
shell.cd(rootFolder);

// Run the deployment
shell.echo(`${logPrefix}: Running deployment to AWS via CDK...`);
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts" ' + process.argv.slice(2)).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);

