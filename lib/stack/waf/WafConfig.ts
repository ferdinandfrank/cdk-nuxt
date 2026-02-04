/**
 * Configuration options for AWS WAF Web ACL.
 */
export interface WafConfig {

    /**
     * Whether to enable AWS managed rule for common exploits (SQL injection, XSS, etc.).
     * This rule group contains rules that block request patterns associated with exploitation
     * of vulnerabilities specific to web applications.
     * @default true
     */
    readonly enableCommonRuleSet?: boolean;

    /**
     * Whether to enable AWS managed rule for known bad inputs.
     * This rule group contains rules to block request patterns known to be invalid
     * and associated with exploitation or discovery of vulnerabilities.
     * @default true
     */
    readonly enableKnownBadInputsRuleSet?: boolean;

    /**
     * Whether to enable AWS managed rule for anonymous IP addresses.
     * This rule group contains rules to block requests from services that allow
     * obfuscation of viewer identity (VPNs, proxies, Tor nodes, hosting providers).
     * @default false
     */
    readonly enableAnonymousIpRuleSet?: boolean;

    /**
     * Whether to enable AWS managed rule for Amazon IP reputation list.
     * This rule group contains rules based on Amazon threat intelligence.
     * @default true
     */
    readonly enableAmazonIpReputationRuleSet?: boolean;

    /**
     * Whether to enable AWS managed rule for bot control.
     * This rule group provides protection against automated bots.
     * Note: This is a paid feature with additional costs.
     * @default false
     */
    readonly enableBotControlRuleSet?: boolean;

    /**
     * The maximum number of requests allowed from a single IP within a 5-minute period
     * to protect against DDoS attacks.
     * Can be disabled by setting it to `undefined`.
     * @default 2000
     */
    readonly rateLimit?: number | undefined;

    /**
     * Array of country codes (ISO 3166-1 alpha-2) to block.
     * Example: ['CN', 'RU', 'KP']
     */
    readonly blockedCountries?: string[];

    /**
     * Custom IP addresses or CIDR ranges to block.
     * Example: ['192.0.2.0/24', '198.51.100.42/32']
     */
    readonly blockedIpAddresses?: string[];

    /**
     * Custom IP addresses or CIDR ranges to allow (bypass all rules).
     * Example: ['203.0.113.0/24']
     */
    readonly allowedIpAddresses?: string[];

    /**
     * CloudWatch metrics name prefix for the WAF.
     * @default 'WafMetrics'
     */
    readonly metricsPrefix?: string;

    /**
     * Custom WAF rules to add at the end of the rule set.
     * These rules will be appended after all built-in managed rules.
     *
     * Note: Do not set the `priority` field - it will be automatically assigned.
     *
     * Example:
     * ```typescript
     * customRules: [{
     *   name: 'BlockSpecificUserAgent',
     *   statement: {
     *     byteMatchStatement: {
     *       searchString: 'BadBot',
     *       fieldToMatch: { singleHeader: { name: 'user-agent' } },
     *       textTransformations: [{ priority: 0, type: 'LOWERCASE' }],
     *       positionalConstraint: 'CONTAINS'
     *     }
     *   },
     *   action: { block: {} },
     *   visibilityConfig: {
     *     sampledRequestsEnabled: true,
     *     cloudWatchMetricsEnabled: true,
     *     metricName: 'BlockSpecificUserAgent'
     *   }
     * }]
     * ```
     */
    readonly customRules?: Omit<import('aws-cdk-lib/aws-wafv2').CfnWebACL.RuleProperty, 'priority'>[];
}

/**
 * Default configuration for WAF optimized for Nuxt applications.
 */
export const DEFAULT_NUXT_WAF_CONFIG: Partial<WafConfig> = {
    enableCommonRuleSet: true,
    enableKnownBadInputsRuleSet: true,
    enableAnonymousIpRuleSet: false,
    enableAmazonIpReputationRuleSet: true,
    enableBotControlRuleSet: false,
    rateLimit: 2000,
    metricsPrefix: 'WafMetrics',
};

