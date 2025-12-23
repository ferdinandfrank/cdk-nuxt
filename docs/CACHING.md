# CloudFront Caching Configuration

This document explains how to configure CloudFront caching behavior for your Nuxt app to optimize performance and control which data is forwarded to your Lambda function.

## Overview

CloudFront acts as a CDN (Content Delivery Network) between your users and your Nuxt app. It caches responses at edge locations worldwide to reduce latency and costs. However, not all requests should be cached the same way.

This package allows you to control:
- Which headers, cookies, and query parameters are forwarded to your Lambda
- Which of these values affect the cache key (and thus cache behavior)
- How CloudFront caches different types of requests

## Cache Key Basics

A **cache key** determines whether CloudFront can serve a cached response or needs to forward the request to your origin (Lambda function).

- If two requests have the same cache key → CloudFront serves the cached response
- If the cache key differs → CloudFront forwards the request to Lambda

The cache key can include:
- Request path (always included)
- Headers
- Cookies  
- Query parameters

## Configuration Options

### Headers

#### forwardHeaders
Headers to forward to your Lambda **without** affecting the cache key.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  forwardHeaders: ['CloudFront-Viewer-Country', 'CloudFront-Is-Mobile-Viewer'],
});
```

**Use case:** Headers that your app needs but don't affect the response (e.g., for logging).

**Default:** No headers are forwarded (only CloudFront default headers).

#### cacheKeyHeaders
Headers to forward to your Lambda **and include in the cache key**.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyHeaders: ['Authorization', 'Accept-Language'],
});
```

**Use case:** Headers that affect the response (e.g., authentication, language preference).

**Default:** No headers are included in the cache key (only CloudFront default headers are forwarded).

**Warning:** Including many headers in the cache key reduces cache hit ratio and increases costs.

### Cookies

#### forwardCookies
Cookies to forward to your Lambda **without** affecting the cache key.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  forwardCookies: ['analytics_id', 'preferences'],
});
```

**Use case:** Cookies your app needs but don't affect the rendered response.

**Default:** No cookies are forwarded.

#### cacheKeyCookies
Cookies to forward to your Lambda **and include in the cache key**.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyCookies: ['session_id', 'user_theme'],
});
```

**Use case:** Cookies that affect the response (e.g., user session, personalization).

**Default:** No cookies are forwarded or included in the cache key.

**Warning:** Including cookies in the cache key significantly reduces cache efficiency.

### Query Parameters

#### forwardQueryParams
Query parameters to forward to your Lambda **without** affecting the cache key.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  forwardQueryParams: ['utm_source', 'utm_campaign', 'fbclid'],
});
```

**Use case:** Tracking parameters that your app logs but don't affect the response.

**Default:** All query parameters are forwarded.

**Note:** This setting controls which parameters are forwarded to your Lambda without being part of the cache key. This is typically used in combination with `cacheKeyQueryParams` or `denyCacheKeyQueryParams` to control caching behavior.

#### cacheKeyQueryParams
Query parameters to forward to your Lambda **and include in the cache key**.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyQueryParams: ['page', 'category', 'sort'],
});
```

**Use case:** Query parameters that affect the response (e.g., pagination, filters).

**Default:** All query parameters are forwarded and included in the cache key.

**Warning:** Including many query parameters in the cache key reduces cache hit ratio.

#### denyCacheKeyQueryParams
Query parameters to **exclude** from being forwarded and from the cache key.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  denyCacheKeyQueryParams: ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign'],
});
```

**Use case:** Explicitly exclude tracking parameters that don't affect the response.

**Default:** All query parameters are forwarded and included in the cache key.

**Note:** If both `cacheKeyQueryParams` and `denyCacheKeyQueryParams` are specified, `denyCacheKeyQueryParams` is ignored.

## Common Scenarios

### Scenario 1: Public Static Site
A public Nuxt app with no user-specific content.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  // No headers, cookies, or query params in cache key (defaults)
  denyCacheKeyQueryParams: ['fbclid', 'gclid', 'utm_source', 'utm_medium', 'utm_campaign'],
});
```

**Result:** Maximum cache efficiency, lowest costs.

### Scenario 2: Multi-language Site
A site that serves different languages based on user preference.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyHeaders: ['Accept-Language'],
  denyCacheKeyQueryParams: ['fbclid', 'utm_source'],
});
```

**Result:** Separate cache for each language, good cache efficiency.

### Scenario 3: Authenticated App
An app with user authentication and personalization.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyHeaders: ['Authorization'],
  cacheKeyCookies: ['session_id'],
  forwardCookies: ['analytics_id'], // Forward but don't cache
  cacheKeyQueryParams: ['page', 'filter'],
  denyCacheKeyQueryParams: ['utm_source', 'fbclid'],
});
```

**Result:** User-specific caching, higher costs but necessary for personalization.

### Scenario 4: E-commerce Site
A site with product filtering and sorting.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  cacheKeyQueryParams: ['category', 'sort', 'page', 'price_min', 'price_max'],
  denyCacheKeyQueryParams: ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'],
  cacheKeyCookies: ['currency', 'region'],
});
```

**Result:** Efficient caching for product pages while excluding tracking parameters.

## Best Practices

### 1. Start Minimal
Begin with minimal cache key components and add only what's necessary:
```typescript
// Start here
denyCacheKeyQueryParams: ['fbclid', 'utm_source', 'utm_campaign'],
```

### 2. Separate Concerns
Use different configurations for different behaviors:
- `forward*` for values you need in your app but don't affect the response
- `cacheKey*` for values that affect what's rendered

### 3. Exclude Tracking Parameters
Always exclude common tracking parameters from the cache key:
```typescript
denyCacheKeyQueryParams: [
  'fbclid', 'gclid', 'msclkid', // Ad tracking
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', // Analytics
],
```

### 4. Monitor Cache Hit Ratio
Check CloudFront metrics in AWS Console:
- High cache hit ratio (>70%) = good configuration
- Low cache hit ratio (<30%) = too many cache key components

### 5. Test Your Configuration
Test different scenarios:
```bash
# Should return cached response (same cache key)
curl https://example.com/page?utm_source=facebook
curl https://example.com/page?utm_source=twitter

# Should return different responses (different cache key)
curl https://example.com/page?lang=en
curl https://example.com/page?lang=de
```

## Cache Behavior for Different Origins

### Static Assets (S3)
Files in `.nuxt/dist/client` are served from S3:
- Aggressive caching (1 year)
- No headers, cookies, or query params affect caching
- Immutable files (versioned filenames)

### Server Rendered Pages (Lambda)
Pages rendered by your Nuxt app:
- Configurable caching (via the props described above)
- Cache key depends on your configuration
- Default cache TTL is managed by CloudFront

### API Routes (Lambda)
API endpoints (if `enableApi: true`):
- No caching by default
- All headers, cookies, and query params forwarded
- Suitable for dynamic, user-specific data

## Troubleshooting

### Issue: Pages not updating after deployment
**Cause:** Aggressive caching
**Solution:** Invalidate CloudFront cache after deployment:
```bash
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### Issue: High Lambda costs
**Cause:** Low cache hit ratio (too many unique cache keys)
**Solution:** Reduce cache key components, especially cookies and headers

### Issue: Wrong content served to users
**Cause:** Missing cache key component
**Solution:** Add the affecting header/cookie/query param to `cacheKey*` configuration

### Issue: Personalization not working
**Cause:** Personalization values not forwarded
**Solution:** Add required values to `forward*` or `cacheKey*` configuration

## Performance Impact

| Configuration | Cache Hit Ratio | Lambda Invocations | Cost | Personalization |
|--------------|-----------------|-------------------|------|-----------------|
| No cache keys | 90-95% | Very Low | Lowest | None |
| Language only | 70-80% | Low | Low | Language |
| + Auth cookies | 30-50% | Medium | Medium | User-specific |
| + Many params | 10-20% | High | High | Full |

## Advanced: Custom Cache Policies

For advanced use cases, you can create custom CloudFront cache policies by extending the `NuxtServerAppStack` class and overriding the CloudFront configuration.

Refer to the [AWS CloudFront documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html) for more details on cache policies.

