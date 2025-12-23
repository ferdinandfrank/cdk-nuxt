# AWS WAF for Nuxt Applications

This CDK extension provides a configurable AWS WAF (Web Application Firewall) to protect your Nuxt applications from common web threats.

## Features

- **Protection against common exploits**: SQL injection, XSS, and other OWASP Top 10 threats
- **Bot protection**: Block automated bots (optional, paid feature)
- **Rate Limiting**: DDoS protection through per-IP request rate limiting
- **Geo-blocking**: Block requests from specific countries
- **IP Whitelist/Blacklist**: Manual control over allowed/blocked IPs
- **AWS Managed Rules**: Pre-configured rule sets from AWS

## Usage

### Basic Configuration

```typescript
import { NuxtServerAppStack, WafConfig } from 'cdk-nuxt';

const wafConfig: WafConfig = {
  enabled: true,
};

new NuxtServerAppStack(this, 'MyNuxtApp', {
  // ... other props
  wafConfig,
});
```

### Advanced Configuration

```typescript
const wafConfig: WafConfig = {
  enabled: true,
  
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
  metricsPrefix: 'MyApp',                 // Prefix for CloudWatch metrics
};
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

## Troubleshooting

### Legitimate users are being blocked

1. Check CloudWatch metrics to identify which rule is blocking
2. Temporarily disable individual rules to find the cause
3. Add the IP to the whitelist or adjust rate limits

### High WAF costs

1. Disable `enableBotControlRuleSet` (biggest cost driver)
2. Check if all enabled rules are needed
3. Consider adjusting `rateLimit` to a lower value if appropriate for your use case

