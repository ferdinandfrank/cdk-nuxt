# AWS CDK Nuxt Deployment Stack (Nuxt 3 & Nuxt 4)

<p>
    <a href="https://github.com/ferdinandfrank/cdk-nuxt/actions/workflows/publish.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/ferdinandfrank/cdk-nuxt/publish.yml?logo=github" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="Version" src="https://img.shields.io/npm/v/cdk-nuxt.svg" /></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="Downloads" src="https://img.shields.io/npm/dm/cdk-nuxt.svg"></a>
    <a href="https://www.npmjs.com/package/cdk-nuxt"><img alt="License" src="https://img.shields.io/npm/l/cdk-nuxt.svg" /></a>
</p>

Easily deploy Nuxt applications (Nuxt 3 and Nuxt 4) via CDK on AWS, including the following features:

- ⚡ **Fast responses** via [AWS Lambda](https://aws.amazon.com/lambda/)
- 🌐 **Custom domain** support via [Route53](https://aws.amazon.com/route53/) and [CloudFront](https://aws.amazon.com/cloudfront/)
- 🔒 **Automatic HTTPS** with certificate management
- 📦 **Optimized static asset** delivery via [S3](https://aws.amazon.com/s3/)
- 🔥 **Lambda warming** via scheduled [EventBridge](https://aws.amazon.com/eventbridge/) pings
- 🗑️ **Automatic cleanup** of outdated assets
- 📊 **Access logs analysis** via [Athena](https://aws.amazon.com/athena/) ([docs](docs/ACCESS_LOGS.md))
- 🛡️ **WAF integration** for security ([docs](docs/WAF.md))
- ⚙️ **Flexible caching** configuration ([docs](docs/CACHING.md))

## Quick Links

- 📚 [Full Configuration Reference](docs/CONFIGURATION.md)
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md)
- 🛡️ [WAF Documentation](docs/WAF.md)
- 📊 [Access Logs Analysis](docs/ACCESS_LOGS.md)
- 🔄 [Caching Configuration](docs/CACHING.md)

## Table of Contents

- [Compatibility](#compatibility)
- [Quick Start](#quick-start)
- [AWS Resources Created](#aws-resources-created)
- [Documentation](#documentation)

## Compatibility

- ✅ Nuxt 3 (latest stable)
- ✅ Nuxt 4 (RC and stable)

## Quick Start

### 1. Installation

Install the package and its peer dependencies:

```bash
# Using pnpm (recommended)
pnpm add -D cdk-nuxt aws-cdk@^2.214.0 aws-cdk-lib@^2.214.0 constructs@^10.4.2 typescript ts-node

# Using npm
npm install --save-dev cdk-nuxt aws-cdk@^2.214.0 aws-cdk-lib@^2.214.0 constructs@^10.4.2 typescript ts-node

# Using yarn
yarn add -D cdk-nuxt aws-cdk@^2.214.0 aws-cdk-lib@^2.214.0 constructs@^10.4.2 typescript ts-node
```

**Optional:** If you plan to enable Access Logs Analysis:
```bash
pnpm add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
```

### 2. Configure Nuxt

Set the Nitro preset in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  nitro: {
    preset: 'aws-lambda'
  },
});
```

**Important:** Remove `"type": "module"` from your `package.json` if present ([why?](https://github.com/ferdinandfrank/cdk-nuxt/issues/3)).

### 3. AWS Prerequisites

Before deployment, you need:

1. **AWS Account** - [Create one](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/) if you don't have one
2. **Route53 Hosted Zone** - For your domain ([guide](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/AboutHZWorkingWith.html))
3. **SSL Certificates** - Two certificates for HTTPS:
   - **Global certificate** (us-east-1) for CloudFront ([request](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html))
   - **Regional certificate** (your region) for API Gateway ([request](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html))

### 4. Initialize CDK Stack

Generate the CDK stack configuration:

```bash
node_modules/.bin/cdk-nuxt-init-server
```

This creates `stack/index.ts` with a complete template including all available configuration options with sensible defaults.

**Update the following required values:**
- `env.account` and `env.region` - Your AWS account and region
- `project`, `service`, `environment` - Identifiers for your app
- `domain` - Your custom domain
- `hostedZoneId` - Your Route53 hosted zone ID  
- `globalTlsCertificateArn` - Certificate in us-east-1 for CloudFront
- `regionalTlsCertificateArn` - Certificate in your region for API Gateway

The full template can also be viewed here: [lib/templates/stack-index-server.ts](lib/templates/stack-index-server.ts)

For a complete list of all configuration options, see the [Configuration Reference](docs/CONFIGURATION.md).

> 💡 **Tip:** Use environment variables or a `.env` file to store sensitive values like certificate ARNs and AWS account IDs.

### 5. Bootstrap and Deploy

First-time setup (once per AWS account/region):
```bash
cdk bootstrap aws://YOUR_ACCOUNT_ID/YOUR_REGION
```

Deploy your app:
```bash
node_modules/.bin/cdk-nuxt-deploy-server
```

That's it! Your Nuxt app is now live on AWS. 🎉

For detailed deployment options and CI/CD setup, see the [Deployment Guide](docs/DEPLOYMENT.md).

## AWS Resources Created

When you deploy your Nuxt app, the following AWS resources are automatically created:

- **Lambda Functions:**
  - Main SSR function for rendering your Nuxt app
  - Lambda Layer for node_modules
  - Cleanup function for outdated assets

- **S3 Buckets:**
  - Static assets bucket (`.nuxt/dist/client`)
  - Access logs bucket (if enabled)
  
- **CloudFront:**
  - Global CDN distribution with HTTPS
  - Optimized cache behaviors for static and dynamic content
  
- **API Gateway:**
  - HTTP API for Lambda function access
  - Custom domain configuration
  
- **Route53:**
  - DNS records (A and AAAA) for your domain
  
- **EventBridge Rules:**
  - Lambda warming (every 5 minutes)
  - Asset cleanup (weekly, Tuesdays at 03:30 GMT)
  
- **Athena (optional):**
  - Database and tables for access log analysis
  - Automatic log partitioning

- **WAF (optional):**
  - Web Application Firewall for CloudFront distribution
  - Protection against common web exploits, bots, and DDoS attacks
  - Configurable managed rules and rate limiting

For more details on each resource and their configuration, see the [Deployment Guide](docs/DEPLOYMENT.md).

## Documentation

### Getting Started
- [Quick Start](#quick-start) - Get up and running quickly
- [Deployment Guide](docs/DEPLOYMENT.md) - Detailed deployment instructions, CI/CD setup
- [Configuration Reference](docs/CONFIGURATION.md) - Complete list of all configuration options

### Features
- [WAF Integration](docs/WAF.md) - Protect your app with AWS WAF
- [Access Logs Analysis](docs/ACCESS_LOGS.md) - Analyze traffic with Athena
- [Caching Configuration](docs/CACHING.md) - Optimize performance with CloudFront caching

### Advanced
- [Destroy the Stack](#destroy-the-stack) - Clean up resources

## Destroy the Stack

To completely remove all AWS resources created by this package:

```bash
node_modules/.bin/cdk-nuxt-destroy-server
```

⚠️ **Warning:** This permanently deletes all resources including S3 buckets and logs. This action cannot be undone.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/ferdinandfrank/cdk-nuxt/issues)
- 💬 [Discussions](https://github.com/ferdinandfrank/cdk-nuxt/discussions)
