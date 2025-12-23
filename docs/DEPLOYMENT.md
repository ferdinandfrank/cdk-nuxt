# Deployment Guide

This guide covers everything you need to know about deploying your Nuxt app to AWS using this package.

## Prerequisites

Before deploying, ensure you have:
- An [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
- Completed the [Quick Start](../README.md#quick-start) steps
- Built your Nuxt app at least once locally

## First-Time Setup

### 1. Bootstrap CDK

Deploying stacks with the AWS CDK requires dedicated Amazon S3 buckets and other containers to be available to AWS CloudFormation during deployment. This process is called **bootstrapping** and is **only required once** per AWS account and region.

To bootstrap, run:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

**Example:**
```bash
cdk bootstrap aws://123456789012/eu-central-1
```

**Note:** Replace `ACCOUNT-NUMBER` with your AWS account ID and `REGION` with your desired AWS region (e.g., `eu-central-1`, `us-east-1`).

For more details, see the [AWS CDK Getting Started Guide](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html).

---

## Deployment Methods

### Method 1: Quick Deploy (Recommended)

The simplest way to build and deploy your Nuxt app:

```bash
node_modules/.bin/cdk-nuxt-deploy-server
```

This command will:
1. Build your Nuxt app using your package manager's `build` script
2. Deploy the CDK stack to AWS
3. Upload static assets to S3
4. Update the Lambda function with the new code

---

### Method 2: Manual Deploy

For more control over the deployment process, you can run commands separately.

#### Using pnpm

```bash
# Build the Nuxt app
pnpm build

# Deploy to AWS
pnpm cdk deploy --require-approval never --all --app="pnpm ts-node stack/index.ts"
```

#### Using npm

```bash
# Build the Nuxt app
npm run build

# Deploy to AWS
npx cdk deploy --require-approval never --all --app="npx ts-node stack/index.ts"
```

#### Using Yarn

```bash
# Build the Nuxt app
yarn build

# Deploy to AWS
yarn cdk deploy --require-approval never --all --app="yarn ts-node stack/index.ts"
```

---

### Method 3: Custom TypeScript Configuration

If your Nuxt app's TypeScript configuration conflicts with the CDK stack requirements, you can use a separate TypeScript configuration for deployment.

1. Create a `tsconfig.cdk.json` file in your project root:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "inlineSourceMap": true,
    "inlineSources": true,
    "experimentalDecorators": true
  },
  "exclude": ["node_modules", "cdk.out"]
}
```

2. Deploy with the custom configuration:

#### Using pnpm

```bash
pnpm build
pnpm cdk deploy --require-approval never --all --app="pnpm ts-node --project=tsconfig.cdk.json stack/index.ts"
```

#### Using npm

```bash
npm run build
npx cdk deploy --require-approval never --all --app="npx ts-node --project=tsconfig.cdk.json stack/index.ts"
```

#### Using Yarn

```bash
yarn build
yarn cdk deploy --require-approval never --all --app="yarn ts-node --project=tsconfig.cdk.json stack/index.ts"
```

---

## Continuous Deployment with GitHub Actions

Automate your deployments by setting up GitHub Actions to deploy on every push to a specific branch.

### Setup

1. Create an IAM user in AWS for CI/CD deployments with appropriate permissions
2. Add the following secrets to your GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_DEFAULT_REGION`

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches:
      - main # or master, or any other branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4
        
      # Enable if using Yarn >= 2  
      # - name: Enable Corepack for Yarn
      #   run: corepack enable

      - name: Configure Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm' # or 'yarn' or 'npm'

      - name: Install dependencies
        run: |
          pnpm install --frozen-lockfile
          # or: npm ci
          # or: yarn install --frozen-lockfile
          # or: yarn install --immutable (Yarn >= 2)

      - name: Build and deploy to AWS
        run: node_modules/.bin/cdk-nuxt-deploy-server
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION }}
```

### Multi-Environment Deployment

To deploy to different environments based on the branch:

```yaml
name: Deploy

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source code
        uses: actions/checkout@v4

      - name: Configure Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: node_modules/.bin/cdk-nuxt-deploy-server
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID_PROD }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}
          AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION }}
          
      - name: Deploy to Staging
        if: github.ref == 'refs/heads/develop'
        run: node_modules/.bin/cdk-nuxt-deploy-server
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID_STAGING }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY_STAGING }}
          AWS_DEFAULT_REGION: ${{ secrets.AWS_DEFAULT_REGION }}
```

**Note:** You'll need separate stack configurations for each environment (different `environment` values in your `stack/index.ts`).

---

## Post-Deployment

### Verify Deployment

After deployment completes:

1. **Check CloudFormation:** Go to AWS Console → CloudFormation → Verify stack status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`
2. **Test Domain:** Visit your configured domain to verify the app is accessible
3. **Check Logs:** Go to CloudWatch → Log Groups → Check for any errors

### Update DNS (First Deployment Only)

If this is your first deployment and you're using a custom domain:

1. The deployment creates DNS records automatically in Route53
2. Wait for DNS propagation (can take up to 48 hours, usually much faster)
3. Test with `dig` or `nslookup`:
   ```bash
   dig www.example.com
   ```

### Cache Invalidation

After deployment, CloudFront may still serve cached versions of your pages. To force an update:

```bash
# Get your CloudFront distribution ID from AWS Console
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

**Note:** The first 1,000 invalidation paths per month are free, additional paths are charged.

---

## Rollback

If you need to rollback to a previous version:

### Option 1: Redeploy Previous Code

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Deploy
node_modules/.bin/cdk-nuxt-deploy-server

# Return to latest code
git checkout main
```

### Option 2: CloudFormation Rollback

1. Go to AWS Console → CloudFormation
2. Select your stack
3. Click "Stack actions" → "Roll back stack"

**Warning:** This only rolls back infrastructure changes, not code changes.

---

## Destroying the Stack

To completely remove the stack and all its resources:

```bash
node_modules/.bin/cdk-nuxt-destroy-server
```

**Warning:** This will delete:
- Lambda functions
- S3 buckets (including access logs if enabled)
- CloudFront distribution
- API Gateway
- All other resources created by the stack

**Note:** Some resources (like S3 buckets with versioning or CloudFront distributions) may take time to fully delete.

---

## Troubleshooting

### Deployment Fails: "Stack already exists"

**Solution:** The stack name might conflict. Check your `project`, `service`, and `environment` values in `stack/index.ts`.

### Deployment Fails: "Certificate not found"

**Solution:** Verify your certificate ARNs are correct and the certificates are validated.

### Deployment Fails: "Hosted zone not found"

**Solution:** Verify your `hostedZoneId` is correct.

### Domain Not Accessible After Deployment

**Possible causes:**
1. DNS propagation delay (wait up to 48 hours)
2. Certificate not validated (check AWS Certificate Manager)
3. Wrong hosted zone ID (verify in Route53)

### Lambda Function Errors

**Check CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/YOUR-FUNCTION-NAME --follow
```

### High Costs After Deployment

**Possible causes:**
1. Too many Lambda invocations (low cache hit ratio - see [Caching Documentation](CACHING.md))
2. Access logs analysis enabled (check Athena query costs)
3. Large Lambda function size (reduce dependencies)

**Solution:** Monitor AWS Cost Explorer and adjust configuration accordingly.

---

## Best Practices

### 1. Use Environment Variables

Store sensitive configuration in environment variables or AWS Secrets Manager:

```typescript
// stack/index.ts
import * as dotenv from 'dotenv';
dotenv.config();

new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...
  globalTlsCertificateArn: process.env.GLOBAL_CERT_ARN!,
  regionalTlsCertificateArn: process.env.REGIONAL_CERT_ARN!,
});
```

### 2. Test in Staging First

Always test changes in a staging environment before deploying to production:

```typescript
const environment = process.env.DEPLOY_ENV || 'staging';

new NuxtServerAppStack(app, `MyNuxtApp-${environment}`, {
  environment,
  domain: environment === 'production' 
    ? 'www.example.com' 
    : `staging.example.com`,
  // ...
});
```

### 3. Monitor Deployments

Set up CloudWatch alarms for:
- Lambda errors
- Lambda duration
- API Gateway 4xx/5xx errors
- CloudFront 4xx/5xx errors

### 4. Version Your Stack

Use git tags to version your deployments:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 5. Document Environment-Specific Configuration

Keep a separate document for each environment's specific configuration (certificate ARNs, domain names, etc.).

---

## Next Steps

- [Configure caching](CACHING.md) to optimize performance
- [Enable WAF](WAF.md) for security
- [Set up access logs analysis](ACCESS_LOGS.md) for insights
- Review [Configuration Reference](CONFIGURATION.md) for all options

