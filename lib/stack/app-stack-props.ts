import {StackProps} from "aws-cdk-lib";

export interface AppStackProps extends StackProps {
    readonly project: string;
    readonly service: string;
    readonly environment: string;
}