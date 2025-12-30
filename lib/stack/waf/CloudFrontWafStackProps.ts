import { WafConfig } from "./WafConfig";
import type { StackProps } from "aws-cdk-lib";

/**
 * Defines the props required for the {@see CloudFrontWafStack}.
 */
export interface CloudFrontWafStackProps extends StackProps {

    /**
     * The name prefix for the Web ACL and related resources.
     */
    readonly name: string;

    /**
     * WAF configuration options.
     */
    readonly config?: WafConfig;
}