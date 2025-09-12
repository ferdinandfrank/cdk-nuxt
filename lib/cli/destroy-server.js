#!/usr/bin/env node

const shell = require("shelljs");
const logPrefix = 'CDK Nuxt Destroy';

const pm = process.env.npm_config_user_agent?.includes('pnpm') ? 'pnpm' : (process.env.npm_config_user_agent?.includes('yarn') ? 'yarn' : 'npm');
const tsNodeCmd = pm === 'pnpm' ? 'pnpm ts-node' : pm === 'yarn' ? 'yarn ts-node' : 'npx ts-node';
const cdkCmd = pm === 'pnpm' ? 'pnpm cdk' : pm === 'yarn' ? 'yarn cdk' : 'npx cdk';

shell.echo(`${logPrefix}: Destroying stack on AWS via CDK...`);

const extraArgs = process.argv.slice(2).join(' ');
const cmd = `${cdkCmd} destroy --require-approval never --all --app="${tsNodeCmd} stack/index.ts" ${extraArgs}`;
if (shell.exec(cmd).code !== 0) {
    shell.echo(`${logPrefix} Error: CDK destroy failed.`);
    shell.exit(1);
}

shell.echo(`${logPrefix}: CDK destroy successful.`);

