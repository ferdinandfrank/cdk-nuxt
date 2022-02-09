import {StackProps} from "aws-cdk-lib";

/**
 * Defines the common props required for the individual stacks
 * of our Nuxt CDK app.
 */
export interface AppStackProps extends StackProps {

    /**
     * A string identifier for the project the Nuxt app is part of.
     * A project might have multiple different services.
     */
    readonly project: string;

    /**
     * A string identifier for the project's service the Nuxt app is created for.
     * This can be seen as the name of the Nuxt app.
     */
    readonly service: string;

    /**
     * A string to identify the environment of the Nuxt app. This enables us
     * to deploy multiple different environments of the same Nuxt app, e.g., production and development.
     */
    readonly environment: string;
}