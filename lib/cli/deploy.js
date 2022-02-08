#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const deploymentFolder = '.nuxt/cdk-deployment';

// Refresh the deployment folder to a clean state
shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentFolder}/.nuxt/dist`);

// Copy our Nuxt files required for SSR
shell.cp('-r', '.nuxt/dist/server', `${deploymentFolder}/.nuxt/dist`);

// Copy the Lambda entrypoint to our deployment folder
shell.cp(path.join(__dirname, '../functions/app/index.js'), deploymentFolder);

// Copy the config files
shell.cp('.env', deploymentFolder);
shell.cp('nuxt.config.js', deploymentFolder);

// Run the deployment
shell.exec(`yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"`);
