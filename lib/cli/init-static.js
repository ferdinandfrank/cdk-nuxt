#!/usr/bin/env node

const shell = require("shelljs");
const path = require("path");
const fs = require("fs");

const logPrefix = 'CDK Nuxt Init';

shell.echo(`${logPrefix}: Initializing CDK stack index file for a static Nuxt app...`);

if (!fs.existsSync('stack')) {
    shell.mkdir('-p', 'stack');
    shell.cp(path.join(__dirname, '../templates/stack-index-static.ts'), 'stack/index.ts');
    shell.echo(`${logPrefix}: CDK stack index file created. Please adapt the file at 'stack/index.ts' to the project's needs.`);
} else {
    shell.echo(`${logPrefix}: CDK stack folder already exists.`);
}