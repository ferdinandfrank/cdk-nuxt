import {Construct} from 'constructs';
import {CfnWebACL, CfnIPSet} from 'aws-cdk-lib/aws-wafv2';
import {type WafConfig, DEFAULT_NUXT_WAF_CONFIG} from './WafConfig';

/**
 * Properties for CloudFrontWebAcl construct.
 */
export interface CloudFrontWebAclProps {
    /**
     * The name prefix for the Web ACL and related resources.
     */
    readonly name: string;

    /**
     * WAF configuration options.
     */
    readonly config: WafConfig;
}

/**
 * A construct that creates an AWS WAF Web ACL for CloudFront distributions.
 * Provides protection against common web exploits, bots, and DDoS attacks.
 */
export class CloudFrontWebAcl extends Construct {
    /**
     * The Web ACL resource.
     */
    public readonly webAcl: CfnWebACL;

    constructor(scope: Construct, id: string, props: CloudFrontWebAclProps) {
        super(scope, id);

        const config = {...DEFAULT_NUXT_WAF_CONFIG, ...props.config};
        const rules: CfnWebACL.RuleProperty[] = [];
        let priority = 0;

        // IP allowlist (highest priority - bypasses all other rules)
        if (config.allowedIpAddresses && config.allowedIpAddresses.length > 0) {
            const allowedIpSet = this.createIpSet(`${props.name}-allowed-ips`, config.allowedIpAddresses);
            rules.push({
                name: 'AllowedIpAddresses',
                priority: priority++,
                statement: {
                    ipSetReferenceStatement: {
                        arn: allowedIpSet.attrArn,
                    },
                },
                action: {allow: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}AllowedIps`,
                },
            });
        }

        // IP blocklist
        if (config.blockedIpAddresses && config.blockedIpAddresses.length > 0) {
            const blockedIpSet = this.createIpSet(`${props.name}-blocked-ips`, config.blockedIpAddresses);
            rules.push({
                name: 'BlockedIpAddresses',
                priority: priority++,
                statement: {
                    ipSetReferenceStatement: {
                        arn: blockedIpSet.attrArn,
                    },
                },
                action: {block: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}BlockedIps`,
                },
            });
        }

        // Geo-blocking
        if (config.blockedCountries && config.blockedCountries.length > 0) {
            rules.push({
                name: 'GeoBlocking',
                priority: priority++,
                statement: {
                    geoMatchStatement: {
                        countryCodes: config.blockedCountries,
                    },
                },
                action: {block: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}GeoBlocking`,
                },
            });
        }

        // Rate limiting (DDoS protection)
        // Exclude static assets (build files, chunks) from rate limiting
        if (config.rateLimit) {
            rules.push({
                name: 'RateLimiting',
                priority: priority++,
                statement: {
                    rateBasedStatement: {
                        limit: config.rateLimit,
                        aggregateKeyType: 'IP',
                        // Exclude requests to /_nuxt/* paths (build files)
                        scopeDownStatement: {
                            notStatement: {
                                statement: {
                                    byteMatchStatement: {
                                        searchString: '/_nuxt/',
                                        fieldToMatch: {
                                            uriPath: {},
                                        },
                                        textTransformations: [{
                                            priority: 0,
                                            type: 'NONE',
                                        }],
                                        positionalConstraint: 'STARTS_WITH',
                                    },
                                },
                            },
                        },
                    },
                },
                action: {block: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}RateLimit`,
                },
            });
        }

        // AWS Managed Rules - Common Rule Set
        if (config.enableCommonRuleSet) {
            rules.push({
                name: 'AWSManagedRulesCommonRuleSet',
                priority: priority++,
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesCommonRuleSet',
                    },
                },
                overrideAction: {none: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}CommonRuleSet`,
                },
            });
        }

        // AWS Managed Rules - Known Bad Inputs
        if (config.enableKnownBadInputsRuleSet) {
            rules.push({
                name: 'AWSManagedRulesKnownBadInputsRuleSet',
                priority: priority++,
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    },
                },
                overrideAction: {none: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}KnownBadInputs`,
                },
            });
        }

        // AWS Managed Rules - Anonymous IP List
        if (config.enableAnonymousIpRuleSet) {
            rules.push({
                name: 'AWSManagedRulesAnonymousIpList',
                priority: priority++,
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesAnonymousIpList',
                    },
                },
                overrideAction: {none: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}AnonymousIpList`,
                },
            });
        }

        // AWS Managed Rules - Amazon IP Reputation List
        if (config.enableAmazonIpReputationRuleSet) {
            rules.push({
                name: 'AWSManagedRulesAmazonIpReputationList',
                priority: priority++,
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesAmazonIpReputationList',
                    },
                },
                overrideAction: {none: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}AmazonIpReputation`,
                },
            });
        }

        // AWS Managed Rules - Bot Control
        if (config.enableBotControlRuleSet) {
            rules.push({
                name: 'AWSManagedRulesBotControlRuleSet',
                priority: priority++,
                statement: {
                    managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesBotControlRuleSet',
                    },
                },
                overrideAction: {none: {}},
                visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: `${config.metricsPrefix}BotControl`,
                },
            });
        }

        // Custom rules (added at the end with automatically assigned priorities)
        if (config.customRules && config.customRules.length > 0) {
            config.customRules.forEach((customRule) => {
                rules.push({
                    ...customRule,
                    priority: priority++,
                } as CfnWebACL.RuleProperty);
            });
        }

        // Create the Web ACL
        this.webAcl = new CfnWebACL(this, 'WebAcl', {
            name: props.name,
            scope: 'CLOUDFRONT',
            defaultAction: {allow: {}},
            rules,
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: `${config.metricsPrefix}WebAcl`,
            },
        });
    }

    /**
     * Creates an IP set for WAF rules.
     */
    private createIpSet(name: string, addresses: string[]): CfnIPSet {
        return new CfnIPSet(this, name, {
            name,
            scope: 'CLOUDFRONT',
            ipAddressVersion: 'IPV4',
            addresses,
        });
    }
}

