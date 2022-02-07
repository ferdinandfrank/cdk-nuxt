#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");

shell.rm('-rf', 'deployment');
shell.mkdir('-p', 'deployment/.nuxt/dist"');

shell.cp('-r', '.nuxt/dist/server', 'deployment/.nuxt/dist');

shell.cp(path.join(__dirname, '../server/lambda-handler.js'), 'deployment');

shell.cp('.env', 'deployment');
shell.cp('nuxt.config.js', 'deployment');

shell.cd(path.join(__dirname));
shell.exec('yarn cdk deploy --app="yarn ts-node lib/index.ts"');
