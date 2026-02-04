# AWS WAF for Nuxt Applications

This CDK extension provides a configurable AWS WAF (Web Application Firewall) to protect your Nuxt applications from common web threats.

## Features

- **Protection against common exploits**: SQL injection, XSS, and other OWASP Top 10 threats
- **Bot protection**: Block automated bots (optional, paid feature)
- **Rate Limiting**: DDoS protection through per-IP request rate limiting
- **Geo-blocking**: Block requests from specific countries
- **IP Whitelist/Blacklist**: Manual control over allowed/blocked IPs
- **AWS Managed Rules**: Pre-configured rule sets from AWS

## Important: Region Requirement

> **AWS WAF for CloudFront must be deployed in the `us-east-1` region**, regardless of where your Nuxt app is deployed. This is an AWS requirement for CloudFront-scoped WAF resources.

## Usage

There are two ways to use WAF with your Nuxt app:

1. **Using `CloudFrontWafStack`** (recommended) - Provides full WAF configuration
2. **Using a custom WAF ARN** - Reference any existing WAF Web ACL

### Option 1: CloudFrontWafStack (Recommended)

This is the recommended approach for most users. It creates a dedicated WAF stack in `us-east-1` with full configuration options:

```typescript
import { 
  App, 
  CloudFrontWafStack, 
  NuxtServerAppStack, 
  type NuxtServerAppStackProps 
} from 'cdk-nuxt';

const app = new App();

// 1. Create WAF stack in us-east-1 (required for CloudFront)
const wafStack = new CloudFrontWafStack(app, 'my-app-waf-stack', {
  name: 'my-app-waf',
   config: {
    metricsPrefix: 'my-app',
    rateLimit: 2000,
    // ... other WAF configuration
  },
  env: {
    account: '123456789012',
    // region: 'us-east-1', // us-east-1 will be enforced
  },
});

// 2. Create Nuxt app stack in your desired region
const appStackProps: NuxtServerAppStackProps = {
  // ... your app configuration
  webAclArn: wafStack.webAclArn, // Reference the WAF ARN
  env: {
    account: '123456789012',
    region: 'eu-central-1', // Can be any region
  }
};

new NuxtServerAppStack(app, 'my-app-stack', appStackProps);
```

### Option 2: Custom WAF ARN

If you already have an existing WAF Web ACL or manage it separately, you can simply reference its ARN:

```typescript
import { App, NuxtServerAppStack } from 'cdk-nuxt';

new NuxtServerAppStack(new App(), 'my-app-stack', {
  // ... your app configuration
  webAclArn: 'arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-web-acl/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111',
  env: {
    region: 'eu-central-1', // Can be any region
  }
});
```

**Use cases for custom WAF ARN:**
- You manage WAF centrally across multiple applications
- You have custom WAF rules defined elsewhere
- You use Terraform or another IaC tool for WAF management
- You need to share a single WAF across multiple CloudFront distributions

### Advanced Configuration

When using `CloudFrontWafStack`, you can customize the WAF behavior with the following options:

```typescript
const wafConfig: WafConfig = {
  
  // AWS Managed Rules (recommended for Nuxt)
  enableCommonRuleSet: true,              // Standard protection (enabled by default)
  enableKnownBadInputsRuleSet: true,      // Known malicious inputs (enabled by default)
  enableAmazonIpReputationRuleSet: true,  // Amazon Threat Intelligence (enabled by default)
  enableAnonymousIpRuleSet: false,        // VPN/Proxy blocking (disabled by default)
  enableBotControlRuleSet: false,         // Bot Control - PAID FEATURE! (disabled by default)
  
  // Rate Limiting
  rateLimit: 2000,                        // Max 2000 requests per IP in 5 minutes (default)
  
  // Geo-blocking
  blockedCountries: ['CN', 'RU', 'KP'],   // ISO 3166-1 alpha-2 country codes
  
  // IP Lists
  allowedIpAddresses: [
    '203.0.113.0/24',                     // Your office network
  ],
  blockedIpAddresses: [
    '198.51.100.42/32',                   // Known attacker IP
  ],
  
  // CloudWatch Metrics
  metricsPrefix: 'WafMetrics',                 // Prefix for CloudWatch metrics
  
  // Custom Rules (added at the end)
  customRules: [
    {
      name: 'BlockSpecificUserAgent',
      statement: {
        byteMatchStatement: {
          searchString: 'BadBot',
          fieldToMatch: { singleHeader: { name: 'user-agent' } },
          textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
          positionalConstraint: 'CONTAINS'
        }
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'BlockSpecificUserAgent'
      }
    }
  ],
};
```

## Deployment

When using `CloudFrontWafStack`:

1. **First deployment**: Both stacks will be deployed together
   ```bash
   cdk deploy --all
   ```

2. **Updating WAF only**: Deploy just the WAF stack
   ```bash
   cdk deploy my-app-waf-stack
   ```

3. **Updating the app**: Deploy just the app stack
   ```bash
   cdk deploy my-app-stack
   ```

When using a custom WAF ARN, the WAF is managed independently and only the app stack needs to be deployed.

2. **Updating WAF only**: Deploy just the WAF stack
   ```bash
   cdk deploy my-app-waf-stack
   ```

3. **Updating the app**: Deploy just the app stack
   ```bash
   cdk deploy my-app-stack
   ```

## Default Configuration for Nuxt

The default configuration is optimized for Nuxt applications:

```typescript
{
  enableCommonRuleSet: true,              // Protection against SQL injection, XSS, etc.
  enableKnownBadInputsRuleSet: true,      // Protection against known vulnerabilities
  enableAmazonIpReputationRuleSet: true,  // Amazon Threat Intelligence
  enableAnonymousIpRuleSet: false,        // No VPN blocking (to avoid blocking legitimate users)
  enableBotControlRuleSet: false,         // Not enabled (paid feature)
  rateLimit: 2000,                        // DDoS protection: 2000 requests per IP in 5 minutes
  metricsPrefix: 'WafMetrics',
}
```

## Costs

- **Basic WAF**: ~$5-10/month for a typical Nuxt application
- **Bot Control Rule Set**: Additional ~$10/month + $1 per 1M requests
- **Rate Limiting**: No additional costs
- **Managed Rules**: Included in base costs

Detailed pricing: https://aws.amazon.com/waf/pricing/

## CloudWatch Metrics

The WAF automatically creates CloudWatch metrics for:

- Blocked/allowed requests per rule
- Rate limit violations
- Geo-blocking events
- Overall Web ACL metrics

Find metrics in CloudWatch under: `AWS/WAFV2` with the configured `metricsPrefix`.

## Best Practices

1. **Start with default settings**: These provide good protection without blocking legitimate users.

2. **Monitor the metrics**: Regularly check CloudWatch metrics to identify false positives.

3. **Adjust rate limiting**: 
   - For public websites: 2000-5000 requests/5min
   - For APIs: 100-500 requests/5min
   - For internal tools: 50-100 requests/5min

4. **Bot Control only when needed**: Enable Bot Control Rule only if you have a real bot problem (additional costs!).

5. **Geo-blocking with caution**: Only block countries from which you definitely don't expect legitimate users.

## Custom Rules

You can add fully custom WAF rules that will be appended at the end of the built-in rules. Custom rules allow you to implement specific blocking or allowing logic based on your application's needs.

### Important Notes

- **Priority is automatic**: Do not specify the `priority` field - it will be automatically assigned to ensure custom rules are added after all built-in rules.
- **Rule order matters**: Custom rules are executed in the order they are defined in the array.
- **Bypass with IP allowlist**: IPs in the `allowedIpAddresses` list will bypass all rules, including custom rules.

### Example: Block Specific User Agent

Block requests from a specific bot based on the User-Agent header:

```typescript
customRules: [
  {
    name: 'BlockSpecificUserAgent',
    statement: {
      byteMatchStatement: {
        searchString: 'BadBot',
        fieldToMatch: { singleHeader: { name: 'user-agent' } },
        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
        positionalConstraint: 'CONTAINS'
      }
    },
    action: { block: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: 'BlockSpecificUserAgent'
    }
  }
]
```

### Example: Block Specific URL Path

Block access to an admin path except from allowed IPs:

```typescript
customRules: [
  {
    name: 'BlockAdminPath',
    statement: {
      byteMatchStatement: {
        searchString: '/admin',
        fieldToMatch: { uriPath: {} },
        textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
        positionalConstraint: 'STARTS_WITH'
      }
    },
    action: { block: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: 'BlockAdminPath'
    }
  }
]
```

### Example: Rate Limit for Specific Endpoint

Apply a more restrictive rate limit to a specific API endpoint:

```typescript
customRules: [
  {
    name: 'RateLimitApiEndpoint',
    statement: {
      rateBasedStatement: {
        limit: 100,  // 100 requests per 5 minutes
        aggregateKeyType: 'IP',
        scopeDownStatement: {
          byteMatchStatement: {
            searchString: '/api/expensive-operation',
            fieldToMatch: { uriPath: {} },
            textTransformations: [{ priority: 0, type: 'NONE' }],
            positionalConstraint: 'EXACTLY'
          }
        }
      }
    },
    action: { block: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: 'RateLimitApiEndpoint'
    }
  }
]
```

### Example: Allow Only Specific HTTP Methods

Block all requests except GET and POST:

```typescript
customRules: [
  {
    name: 'AllowOnlyGetPost',
    statement: {
      notStatement: {
        statement: {
          orStatement: {
            statements: [
              {
                byteMatchStatement: {
                  searchString: 'GET',
                  fieldToMatch: { method: {} },
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                  positionalConstraint: 'EXACTLY'
                }
              },
              {
                byteMatchStatement: {
                  searchString: 'POST',
                  fieldToMatch: { method: {} },
                  textTransformations: [{ priority: 0, type: 'NONE' }],
                  positionalConstraint: 'EXACTLY'
                }
              }
            ]
          }
        }
      }
    },
    action: { block: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: 'AllowOnlyGetPost'
    }
  }
]
```

### Example: Block Requests Without Referer

Require a referer header for certain paths (simple CSRF protection):

```typescript
customRules: [
  {
    name: 'RequireReferer',
    statement: {
      andStatement: {
        statements: [
          {
            byteMatchStatement: {
              searchString: '/api/',
              fieldToMatch: { uriPath: {} },
              textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
              positionalConstraint: 'STARTS_WITH'
            }
          },
          {
            notStatement: {
              statement: {
                sizeConstraintStatement: {
                  fieldToMatch: { singleHeader: { name: 'referer' } },
                  comparisonOperator: 'GT',
                  size: 0,
                  textTransformations: [{ priority: 0, type: 'NONE' }]
                }
              }
            }
          }
        ]
      }
    },
    action: { block: {} },
    visibilityConfig: {
      sampledRequestsEnabled: true,
      cloudWatchMetricsEnabled: true,
      metricName: 'RequireReferer'
    }
  }
]
```

### Available Statement Types

AWS WAF supports many statement types for custom rules:

- **ByteMatchStatement**: Match strings in requests (headers, body, URI, etc.)
- **SqliMatchStatement**: Detect SQL injection attempts
- **XssMatchStatement**: Detect cross-site scripting attempts
- **SizeConstraintStatement**: Match based on size of request components
- **GeoMatchStatement**: Match based on country of origin
- **IPSetReferenceStatement**: Match against IP sets
- **RegexPatternSetReferenceStatement**: Match against regex patterns
- **RateBasedStatement**: Rate limiting per IP
- **AndStatement**, **OrStatement**, **NotStatement**: Combine multiple statements

For complete documentation, see: [AWS WAF Rule Statement Documentation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statements.html)

## Troubleshooting

### Legitimate users are being blocked

1. Check CloudWatch metrics to identify which rule is blocking
2. Temporarily disable individual rules to find the cause
3. Add the IP to the whitelist or adjust rate limits

### High WAF costs

1. Disable `enableBotControlRuleSet` (biggest cost driver)
2. Check if all enabled rules are needed
3. Consider adjusting `rateLimit` to a lower value if appropriate for your use case

