#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");
require('dotenv').config()

const deploymentFolder = '.nuxt/cdk-deployment';

shell.rm('-rf', deploymentFolder);
shell.mkdir('-p', `${deploymentFolder}/.nuxt/dist`);

shell.cp('-r', '.nuxt/dist/server', `${deploymentFolder}/.nuxt/dist`);

shell.cp(path.join(__dirname, '../server/lambda-handler.js'), deploymentFolder);

shell.cp('.env', deploymentFolder);
shell.cp('nuxt.config.js', deploymentFolder);

const entryPoint = path.join(__dirname, '../index.ts')
shell.exec(`yarn cdk deploy --require-approval never --all --app="yarn ts-node ${entryPoint}"`);
