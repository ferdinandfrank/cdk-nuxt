import {Bucket} from "aws-cdk-lib/aws-s3";
import {Duration} from "aws-cdk-lib";

export interface AccessLogsAnalysisProps {
    /**
     * Expression to prepend to any created resources
     */
    readonly resourcePrefix: string;

    readonly bucket: Bucket;

    /**
     * Logs in the raw table will be deleted after this period. Default: 7 days.
     */
    readonly expireRawLogsAfter?: Duration;

    /**
     * Logs in the intermediate date group table will be deleted after this period. Default: 7 days.
     */
    readonly expireIntermediateLogsAfter?: Duration;

    /**
     * Logs in the transformed table will be deleted after this period. Default: 180 days.
     */
    readonly expireTransformedLogsAfter?: Duration;

    /**
     * Whether to anonymize the client IP address in the access logs by replacing the last octet (IPv4)
     * or the last group (IPv6) with 'xxx'.
     *
     * **GDPR/Legal note:** IP addresses are considered personal data under the GDPR (cf. CJEU judgment C‑582/14).
     * If you disable anonymization, you must ensure a legal basis under Art. 6 GDPR (e.g. legitimate interest),
     * document it in your privacy policy, and limit the retention period to what is strictly necessary.
     * When in doubt, consult a data protection officer or legal counsel before disabling this option.
     *
     * Defaults to `true`.
     */
    readonly anonymizeClientIp?: boolean;
}