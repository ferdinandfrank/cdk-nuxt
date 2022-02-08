#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

const deploymentFolder = '.nuxt/cdk-deployment';

shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentFolder}/.nuxt/dist`);

shell.cp('-r', '.nuxt/dist/server', `${deploymentFolder}/.nuxt/dist`);

shell.cp(path.join(__dirname, '../server/lambda-handler.js'), deploymentFolder);

shell.cp('.env', deploymentFolder);
shell.cp('nuxt.config.js', deploymentFolder);

shell.exec(`yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"`);
