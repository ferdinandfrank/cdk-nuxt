# Configuration Reference

This document provides a complete reference for all configuration options available in the `NuxtServerAppStack` construct.

## Required Properties

### project
**Type:** `string`

A string identifier for the project the Nuxt app is part of. A project might have multiple different services.

**Example:** `'my-company'`

---

### service
**Type:** `string`

A string identifier for the project's service the Nuxt app is created for. This can be seen as the name of the Nuxt app.

**Example:** `'website'`, `'admin-panel'`, `'api'`

---

### environment
**Type:** `string`

A string to identify the environment of the Nuxt app. This enables you to deploy multiple different environments of the same Nuxt app.

**Example:** `'production'`, `'staging'`, `'development'`

---

### domain
**Type:** `string`

The domain (without the protocol) at which the Nuxt app shall be publicly available. A DNS record will be automatically created in Route53 for the domain. This also supports subdomains.

**Examples:** 
- `'example.com'`
- `'www.example.com'`
- `'app.example.com'`

---

### hostedZoneId
**Type:** `string`

The ID of the Route53 hosted zone to create a DNS record for the specified domain.

**Example:** `'Z1234567890ABC'`

**How to find:** Go to Route53 in AWS Console → Hosted zones → Select your domain → Copy "Hosted zone ID"

---

### globalTlsCertificateArn
**Type:** `string`

The ARN of the certificate to use on CloudFront for the Nuxt app to make it accessible via HTTPS.

**Requirements:**
- Must be issued for the specified domain
- Must be issued in `us-east-1` (global) region
- Must be validated

**Example:** `'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'`

**Note:** CloudFront only works with certificates in `us-east-1`, regardless of your app's region.

---

### regionalTlsCertificateArn
**Type:** `string`

The ARN of the certificate to use at the API Gateway for the Nuxt app to make it accessible via the custom domain and to provide the custom domain to the Nuxt app via the 'Host' header for server-side rendering.

**Requirements:**
- Must be issued for the specified domain
- Must be issued in the same region as your app (via `env.region`)
- Must be validated

**Example:** `'arn:aws:acm:eu-central-1:123456789012:certificate/87654321-4321-4321-4321-210987654321'`

---

## Optional Properties

### rootDir
**Type:** `string`  
**Default:** `'.'`

The path to the root directory of the Nuxt app (where the `nuxt.config.ts` file is located).

**Example:** `'./apps/frontend'`

---

### entrypoint
**Type:** `string`  
**Default:** `'index'`

The file name (without extension) of the Lambda entrypoint within the 'server' directory exporting a handler.

**Example:** `'handler'`, `'main'`

---

### entrypointEnv
**Type:** `string`

A JSON serialized string of environment variables to pass to the Lambda function.

**Example:** 
```typescript
entrypointEnv: JSON.stringify({
  API_URL: 'https://api.example.com',
  FEATURE_FLAG: 'true',
})
```

---

### memorySize
**Type:** `number`  
**Default:** `1792`

The memory size (in MB) to allocate to the Nuxt app's Lambda function.

**Recommendations:**
- Small apps: `512` - `1024` MB
- Standard apps: `1792` MB (default, optimized for cost/performance)
- Large apps: `2048` - `3008` MB

**Note:** Higher memory also increases CPU power. The default `1792` MB provides a good balance.

---

### enableTracing
**Type:** `boolean`  
**Default:** `false`

Whether to enable AWS X-Ray tracing for the Nuxt Lambda function. This helps debug performance issues and trace requests through AWS services.

**Use case:** Debugging production issues, performance monitoring

---

### enableApi
**Type:** `boolean`  
**Default:** `false`

Whether to enable (HTTPS only) API access to the Nuxt app via the `/api` path which supports all HTTP methods.

**Use case:** When your Nuxt app includes API routes that need to be publicly accessible.

See [Nuxt Server Routes](https://nuxt.com/docs/guide/directory-structure/server#recipes) for more details.

---

### enableSitemap
**Type:** `boolean`  
**Default:** `false`

Whether to enable a global Sitemap bucket which is permanently accessible through multiple deployments.

**Use case:** When you generate static sitemap files during build and want them to persist across deployments.

**Note:** This is different from `serverRoutes` which handles dynamic sitemap generation.

---

### serverRoutes
**Type:** `string[]`  
**Default:** `[]`

An array of path patterns for server endpoints that should be routed to the SSR origin (API Gateway → Lambda) instead of the default S3 "file" behavior.

**Use case:** Server routes that generate dynamic content but use file-like URLs.

**Examples:**
```typescript
serverRoutes: [
  '/sitemap.xml',        // Dynamic sitemap
  '/robots.txt',         // Dynamic robots.txt
  '/__sitemap__/*',      // @nuxtjs/sitemap routes
  '/_ipx/*',            // @nuxt/image routes
]
```

**Note:** These patterns take precedence over S3 file matching.

---

### enableAccessLogsAnalysis
**Type:** `boolean`  
**Default:** `false`

Whether to enable access logs analysis for the Nuxt app's CloudFront distribution via Amazon Athena.

**Additional dependency required:**
```bash
pnpm add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
```

See [Access Logs Documentation](ACCESS_LOGS.md) for details.

---

### accessLogCookies
**Type:** `string[]`  
**Default:** `[]`

An array of cookies to include for reporting in the access logs analysis.

**Requirements:** Only effective when `enableAccessLogsAnalysis` is `true`.

**Example:**
```typescript
accessLogCookies: ['session_id', 'user_preference', 'tracking_id']
```

---

### outdatedAssetsRetentionDays
**Type:** `number`  
**Default:** `30`

The number of days to retain static assets of outdated deployments in the S3 bucket.

**Use case:** Allows users to still access old assets after a new deployment when they are still browsing on an old version.

**Recommendations:**
- Fast-moving apps: `7` days
- Standard apps: `30` days (default)
- Conservative: `90` days

---

## Caching Configuration

For detailed information about caching configuration, see the [Caching Documentation](CACHING.md).

### forwardHeaders
**Type:** `string[]`  
**Default:** `[]`

HTTP headers to forward to the Nuxt app on origin requests **without** affecting the cache key at CloudFront edge locations.

**Use case:** Headers that your app needs but don't affect the response.

**Default behavior:** Only CloudFront default headers are forwarded. This option allows you to specify additional headers.

**Example:**
```typescript
forwardHeaders: ['CloudFront-Viewer-Country', 'CloudFront-Is-Mobile-Viewer']
```

---

### cacheKeyHeaders
**Type:** `string[]`  
**Default:** `[]`

HTTP headers to forward to the Nuxt app **and include in the cache key** for objects cached at CloudFront edge locations.

**Use case:** Headers that affect the response (e.g., authentication, language).

**Default behavior:** Only CloudFront default headers are forwarded, but no additional headers are included in the cache key. This option allows you to specify headers that should be included in the cache key.

**Example:**
```typescript
cacheKeyHeaders: ['Authorization', 'Accept-Language']
```

**Warning:** Including many headers reduces cache hit ratio and increases costs.

---

### forwardCookies
**Type:** `string[]`  
**Default:** `[]`

Cookies to forward to the Nuxt app on origin requests **without** affecting the cache key.

**Use case:** Cookies that your app needs but don't affect the response.

**Example:**
```typescript
forwardCookies: ['analytics_id', 'preferences']
```

---

### cacheKeyCookies
**Type:** `string[]`  
**Default:** `[]`

Cookies to forward to the Nuxt app **and include in the cache key** for objects cached at CloudFront edge locations.

**Use case:** Cookies that affect the response (e.g., session, personalization).

**Example:**
```typescript
cacheKeyCookies: ['session_id', 'user_theme']
```

**Warning:** Including cookies significantly reduces cache efficiency.

---

### forwardQueryParams
**Type:** `string[]`  
**Default:** All query parameters are forwarded

Query parameters to forward to the Nuxt app on origin requests **without** affecting the cache key.

**Use case:** Tracking parameters that your app logs but don't affect the response.

**Example:**
```typescript
forwardQueryParams: ['utm_source', 'utm_campaign', 'fbclid']
```

---

### cacheKeyQueryParams
**Type:** `string[]`  
**Default:** All query parameters are included in the cache key

Query parameters to forward to the Nuxt app **and include in the cache key** for objects cached at CloudFront edge locations.

**Use case:** Query parameters that affect the response (e.g., pagination, filters).

**Example:**
```typescript
cacheKeyQueryParams: ['page', 'category', 'sort']
```

---

### denyCacheKeyQueryParams
**Type:** `string[]`  
**Default:** `[]`

Query parameters to **prevent** from being forwarded and from being included in the cache key.

**Use case:** Explicitly exclude tracking parameters that don't affect the response.

**Example:**
```typescript
denyCacheKeyQueryParams: ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign']
```

**Note:** If both `cacheKeyQueryParams` and `denyCacheKeyQueryParams` are specified, `denyCacheKeyQueryParams` is ignored.

---

## Security Configuration

### wafConfig
**Type:** `WafConfig`  
**Default:** `undefined` (disabled)

AWS WAF configuration to protect the CloudFront distribution. When enabled, provides protection against common web exploits, bots, and DDoS attacks.

**Example:**
```typescript
wafConfig: {
  enabled: true,
  rateLimit: 2000,
  blockedCountries: ['CN', 'RU'],
}
```

See [WAF Documentation](WAF.md) for complete configuration options.

---

## Complete Configuration Example

```typescript
import { App } from 'aws-cdk-lib';
import { NuxtServerAppStack } from 'cdk-nuxt';

const appStackProps: NuxtServerAppStackProps = {
  // AWS Environment
  env: {
    account: process.env.AWS_ACCOUNT_ID,
    region: 'eu-central-1',
  },

  // Required Properties
  project: 'my-company',
  service: 'website',
  environment: 'production',
  domain: 'www.example.com',
  hostedZoneId: 'Z1234567890ABC',
  globalTlsCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/...',
  regionalTlsCertificateArn: 'arn:aws:acm:eu-central-1:123456789012:certificate/...',

  // Optional Properties
  memorySize: 1792,
  enableTracing: true,
  enableApi: true,
  enableSitemap: false,
  enableAccessLogsAnalysis: true,
  
  // Server Routes
  serverRoutes: [
    '/sitemap.xml',
    '/_ipx/*',
  ],

  // Access Logs
  accessLogCookies: ['session_id'],

  // Asset Retention
  outdatedAssetsRetentionDays: 30,

  // Caching Configuration
  cacheKeyHeaders: ['Accept-Language'],
  cacheKeyCookies: ['user_theme'],
  denyCacheKeyQueryParams: ['fbclid', 'utm_source', 'utm_campaign'],

  // WAF Configuration
  wafConfig: {
    enabled: true,
    enableCommonRuleSet: true,
    enableKnownBadInputsRuleSet: true,
    rateLimit: 2000,
  },

  // Environment Variables (optional)
  entrypointEnv: JSON.stringify({
    API_URL: 'https://api.example.com',
    NODE_ENV: 'production',
  }),
};

new NuxtServerAppStack(new App(), `${appStackProps.project}-${appStackProps.service}-${appStackProps.environment}-stack`, appStackProps);
```

