import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CloudFrontWebAcl } from './CloudFrontWebAcl';
import { CloudFrontWafStackProps } from "./CloudFrontWafStackProps";

/**
 * A separate stack for CloudFront WAF resources.
 * This stack must be deployed in us-east-1 region as required by AWS WAF for CloudFront.
 */
export class CloudFrontWafStack extends Stack {

    /**
     * The Web ACL construct.
     */
    public readonly webAcl: CloudFrontWebAcl;

    /**
     * The ARN of the Web ACL that can be used by CloudFront distributions.
     */
    public readonly webAclArn: string;

    constructor(scope: Construct, id: string, props: CloudFrontWafStackProps) {
        super(scope, id, {
            ...props,
            env: {
                ...props.env,
                region: 'us-east-1', // WAF for CloudFront must be in us-east-1
            },
            crossRegionReferences: true // Must be enabled to allow the consuming stack in another region to reference the WAF resources
        });

        this.webAcl = new CloudFrontWebAcl(this, `${id}-web-acl`, {
            name: props.name,
            config: props.config ?? {},
        });

        this.webAclArn = this.webAcl.webAcl.attrArn;
    }
}

