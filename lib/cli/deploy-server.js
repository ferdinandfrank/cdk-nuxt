#!/usr/bin/env node

const shell = require("shelljs");

const logPrefix = 'CDK Nuxt Deployment';
shell.echo(`${logPrefix}: Starting deployment for dynamic Nuxt app...`);

const pm = process.env.npm_config_user_agent?.includes('pnpm') ? 'pnpm' : (process.env.npm_config_user_agent?.includes('yarn') ? 'yarn' : 'npm');
const buildCmd = pm === 'pnpm' ? 'pnpm build' : pm === 'yarn' ? 'yarn build' : 'npm run build';
const tsNodeCmd = pm === 'pnpm' ? 'pnpm ts-node' : pm === 'yarn' ? 'yarn ts-node' : 'npx ts-node';
const cdkCmd = pm === 'pnpm' ? 'pnpm cdk' : pm === 'yarn' ? 'yarn cdk' : 'npx cdk';

const deploymentSourceFolder = '.output/server';

// Refresh the cdk output folder to have a clean state and prevent persisting outdated outputs
shell.echo(`${logPrefix}: Deleting outdated CDK files...`);
shell.rm('-rf', 'cdk.out');

// Build the Nuxt app
shell.echo(`${logPrefix}: Building app...`);
if (shell.exec(buildCmd).code !== 0) {
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
const extraArgs = process.argv.slice(2).join(' ');
const cmd = `${cdkCmd} deploy --require-approval never --all --app="${tsNodeCmd} stack/index.ts" ${extraArgs}`;
if (shell.exec(cmd).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK deployment failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK deployment successful.`);

