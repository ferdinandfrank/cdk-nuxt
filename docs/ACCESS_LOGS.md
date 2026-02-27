# Access Logs Analysis

This package provides built-in support for analyzing CloudFront access logs using Amazon Athena. This feature allows you to gain insights into your Nuxt app's traffic patterns, user behavior, and performance metrics.

## Overview

When enabled, the access logs analysis feature:
- Captures CloudFront access logs to an S3 bucket
- Automatically partitions logs by date for efficient querying
- Creates Athena tables for querying logs using SQL
- Supports custom cookie tracking for detailed analytics

## Enabling Access Logs Analysis

To enable access logs analysis, set the `enableAccessLogsAnalysis` prop to `true` in your stack configuration:

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  enableAccessLogsAnalysis: true,
});
```

### Additional Dependencies

When enabling access logs analysis, you need to install an additional dependency:

```bash
# Using pnpm
pnpm add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0

# Using npm
npm install --save-dev @aws-cdk/aws-glue-alpha@2.214.0-alpha.0

# Using yarn
yarn add -D @aws-cdk/aws-glue-alpha@2.214.0-alpha.0
```

## Configuration Options

### accessLogCookies

You can specify which cookies to include in the access logs for analysis:

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  enableAccessLogsAnalysis: true,
  accessLogCookies: ['session_id', 'user_preference', 'tracking_id'],
});
```

This is useful for:
- Tracking user sessions
- Analyzing user preferences
- Correlating requests with specific users
- Custom analytics tracking

**Note:** Only the cookies specified in this array will be logged. This helps reduce log size and focuses on relevant data.

### anonymizeAccessLogClientIp

Controls whether the client IP address is anonymized in the access logs. When enabled (default), the last octet of IPv4 addresses and the last group of IPv6 addresses are replaced with `xxx` before the logs are stored.

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  enableAccessLogsAnalysis: true,
  anonymizeAccessLogClientIp: false, // disable anonymization (see legal note below!)
});
```

#### ⚖️ Legal Note – GDPR / DSGVO

> **TL;DR:** IP anonymization is enabled by default. Disable it only if you have a valid legal basis and have updated your privacy policy accordingly.

Under the **General Data Protection Regulation (GDPR)** and the CJEU judgment **C‑582/14 (Breyer v. Germany)**, IP addresses are classified as **personal data**, because they can potentially be used to identify a natural person.

**If you keep `anonymizeAccessLogClientIp: true` (default):**
- The stored IP addresses can no longer be attributed to an individual.
- The logs no longer contain personal data in this regard.
- No specific legal basis is required for IP storage in the logs.

**If you set `anonymizeAccessLogClientIp: false`:**
You must fulfill the following requirements:

| Requirement | Details |
|---|---|
| **Legal basis (Art. 6 GDPR)** | You need a valid legal basis, e.g. *legitimate interest* (Art. 6 para. 1 lit. f) for security monitoring or abuse prevention, or *fulfillment of a legal obligation* (lit. c). |
| **Privacy policy** | The processing of IP addresses must be documented and communicated to users in your privacy policy (Art. 13/14 GDPR). |
| **Data minimization (Art. 5 GDPR)** | The retention period must be limited to what is strictly necessary. Set `expireTransformedLogsAfter` to a short period (e.g. 30–90 days). |
| **Data Processing Agreement** | If a third party processes the data on your behalf (e.g. AWS, Athena), a Data Processing Agreement (DPA/AV-Vertrag) must be in place. |

> ⚠️ **Disclaimer:** This is not legal advice. Always consult a qualified data protection officer (DPO) or legal counsel before disabling IP anonymization, especially if you operate in the EU or serve EU users.

## Created AWS Resources

When access logs analysis is enabled, the following AWS resources are created:

### S3 Bucket
- **Purpose:** Stores CloudFront access logs
- **Naming:** `{project}-{service}-{environment}-access-logs`
- **Retention:** Logs are retained indefinitely by default
- **Partitioning:** Logs are automatically partitioned by date for efficient querying

### Athena Database
- **Purpose:** Provides a SQL interface for querying logs
- **Naming:** `{project}_{service}_{environment}_logs_db`

### Athena Tables
- **Raw Logs Table:** Contains the raw CloudFront access logs
- **Partitioned Table:** Contains logs partitioned by date for faster queries
- **Aggregated Tables:** Pre-computed views for common analytics queries (if configured)

### Lambda Functions
- **Partitioning Function:** Automatically creates daily partitions for new logs
- **Group-by-Date Function:** Aggregates logs by date for reporting

### EventBridge Rules
- **Partition Creator:** Runs daily to create new partitions
- **Log Aggregator:** Runs periodically to aggregate log data

## Querying Access Logs

Once enabled, you can query your access logs using Amazon Athena in the AWS Console:

### Example Queries

#### Get most called pages in the last 24 hours
```sql
SELECT
    uri,
    AVG(time_taken) * 1000 AS avg_time,
    COUNT(*) AS total_count,
    100.0 * SUM(CASE WHEN result_type = 'Hit' THEN 1 ELSE 0 END) / COUNT(*) as cache_perc,
    SUM(CASE WHEN result_type = 'Hit' THEN 1 ELSE 0 END) as hit_count,
    SUM(CASE WHEN result_type IN ('RefreshHit') THEN 1 ELSE 0 END) as refresh_count,
    SUM(CASE WHEN result_type IN ('Miss') THEN 1 ELSE 0 END) as miss_count,
    SUM(CASE WHEN result_type IN ('Error') THEN 1 ELSE 0 END) as error_count
FROM access_logs_database.access_logs_table_transformed
WHERE date > now() - interval '1' day and uri not like '/_nuxt%'
GROUP BY uri
ORDER BY total_count desc;
```

#### Analyze request by status code in the last 24 hours
```sql
SELECT 
  status,
  COUNT(*) as count
FROM access_logs_database.access_logs_table_transformed
WHERE date > now() - interval '1' day
GROUP BY status
ORDER BY count DESC;
```


## Cost Considerations

Access logs analysis incurs costs for:
- **S3 Storage:** Storing access log files (typically minimal)
- **Athena Queries:** Charged per TB of data scanned
- **Lambda Executions:** Partitioning and aggregation functions (minimal)

### Cost Optimization Tips

1. **Partition by Date:** Already configured automatically to reduce query costs
2. **Limit Query Scope:** Use `WHERE date = 'YYYY-MM-DD'` to scan only specific dates
3. **Use Aggregated Tables:** Query pre-aggregated views when available
4. **Set Log Retention:** Configure S3 lifecycle rules to delete old logs if not needed
5. **Compress Logs:** CloudFront logs are automatically gzipped to reduce storage costs

## Best Practices

1. **Monitor Storage Growth:** Regularly check S3 bucket size and implement retention policies
2. **Use Date Filters:** Always filter by date when querying to minimize costs
3. **Cookie Selection:** Only track essential cookies to reduce log size
4. **Regular Analysis:** Set up scheduled queries for routine analytics
5. **Data Privacy:** Ensure compliance with privacy regulations when logging user data

## Troubleshooting

### Logs Not Appearing

If logs don't appear in Athena:
1. Check that CloudFront distribution is receiving traffic
2. Verify S3 bucket permissions allow CloudFront to write logs
3. Wait up to 24 hours for CloudFront to deliver first logs
4. Check EventBridge rules are enabled and running

### Query Errors

Common issues and solutions:
- **"Table not found":** Ensure partitions are created (run partition Lambda manually if needed)
- **"Permission denied":** Verify Athena has access to the S3 bucket
- **"Corrupted data":** Check S3 bucket for incomplete log files

### High Costs

If Athena costs are higher than expected:
- Review queries to ensure they use date partitions
- Reduce query frequency
- Implement log retention policies
- Consider using CloudWatch Insights for recent data

## Disabling Access Logs

To disable access logs analysis, set `enableAccessLogsAnalysis` to `false` and redeploy:

```typescript
new NuxtServerAppStack(app, 'MyNuxtApp', {
  // ...other props
  enableAccessLogsAnalysis: false,
});
```

**Warning:** This will delete the Athena database and tables. The S3 bucket with logs will be retained but can be manually deleted if no longer needed.

