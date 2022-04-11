#!/usr/bin/env node

const shell = require("shelljs");

const logPrefix = 'CDK Nuxt Deployment';
shell.echo(`${logPrefix}: Starting deployment for static Nuxt app...`);

// Refresh the cdk output folder to have a clean state and prevent persisting outdated outputs
shell.echo(`${logPrefix}: Deleting outdated CDK files...`);
shell.rm('-rf', 'cdk.out');

// Run the deployment
shell.echo(`${logPrefix}: Running deployment to AWS via CDK...`);
if (shell.exec('yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts" ' + process.argv.slice(2)).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);