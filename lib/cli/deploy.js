#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const deploymentFolder = '.nuxt/cdk-deployment';
const deploymentSourceFolder = `${deploymentFolder}/src`;
const deploymentLayerFolder = `${deploymentFolder}/layer/nodejs`;

// Refresh the deployment folder to a clean state
shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentSourceFolder}/.nuxt/dist`);
shell.mkdir('-p', deploymentLayerFolder);

// Copy our files required for SSR
shell.cp('-r', '.nuxt/dist/server', `${deploymentSourceFolder}/.nuxt/dist`);
shell.cp(path.join(__dirname, '../functions/app/index.js'), deploymentSourceFolder);

// Prepare the Lambda layer for the node_modules required for SSR
shell.cp('package.json', deploymentLayerFolder);
shell.cp('yarn.lock', deploymentLayerFolder);
shell.cd(deploymentLayerFolder);
shell.exec('yarn install --production --frozen-lockfile');
shell.cd('../../../..');

// Copy the config files
shell.cp('.env', deploymentSourceFolder);
shell.cp('nuxt.config.js', deploymentSourceFolder);

// Run the deployment
shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"');
