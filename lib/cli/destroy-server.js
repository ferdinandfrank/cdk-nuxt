#!/usr/bin/env node

const shell = require("shelljs");
const logPrefix = 'CDK Nuxt Destroy';

shell.echo(`${logPrefix}: Destroying stack on AWS via CDK...`);
if (shell.exec('yarn cdk destroy --require-approval never --all --app="yarn ts-node stack/index.ts" ' + process.argv.slice(2)).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK destroy failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK destroy successful.`);

