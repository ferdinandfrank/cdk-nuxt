# Repository Guidelines

## Overview

`cdk-nuxt` is an npm library (not an app) that provides AWS CDK constructs to deploy Nuxt 3/4 applications on AWS. It is published to npm and consumed by Nuxt projects that want to deploy to AWS.

## Project Structure & Module Organization
This package exposes CDK constructs and CLI helpers for deploying Nuxt apps on AWS.

- `index.ts`, `index.js`, `index.d.ts`: public package entry points.
- `lib/stack/server`: core `NuxtServerAppStack` and related props.
- `lib/stack/waf`: CloudFront WAF stack and configuration types.
- `lib/stack/access-logs-analysis`: Athena/Glue resources for log analytics.
- `lib/functions/**`: Lambda handler source for cleanup and access-log jobs.
- `lib/cli/*.js`: packaged CLI commands (`init`, `deploy`, `destroy`).
- `lib/templates`: template stack files generated for consumers.
- `docs/`: user-facing configuration and deployment documentation.

## Build, Test, and Development Commands
Use `pnpm` (lockfile is committed with `pnpm-lock.yaml`).

- `pnpm install --frozen-lockfile`: install root dependencies.
- `pnpm -C lib/functions/assets-cleanup install --frozen-lockfile`: install nested Lambda deps (repeat for the two access-log function folders).
- `pnpm build`: compile root TypeScript (`tsc`).
- `pnpm run prepack`: build root + all Lambda bundles/layers; run before publishing.
- `pnpm run prepack:assets-cleanup`: build only the assets-cleanup Lambda function.
- `pnpm run prepack:access-logs-analysis`: build only the access-logs-analysis Lambda functions.
- `pnpm run release`: build first, then run changelogen to release a new version.
- `pnpm run release:check`: release gate (currently runs build checks).

The TypeScript source compiles to JS alongside (`.js` and `.d.ts` files live next to `.ts` files). `lib/templates/` is excluded from compilation.

## Architecture

### Package Structure

The library exports from `index.ts`:
- `NuxtServerAppStack` — main CDK stack class for deploying Nuxt SSR apps
- `NuxtServerAppStackProps` — props interface for the stack
- `CloudFrontWafStack` / `CloudFrontWebAcl` / `CloudFrontWafStackProps` — optional WAF stack (must be deployed in us-east-1)
- `WafConfig` / `DEFAULT_NUXT_WAF_CONFIG` — WAF configuration types
- `App` — re-exported from aws-cdk-lib

### Core Stack: `lib/stack/server/NuxtServerAppStack.ts`

The main CDK stack that creates:
1. **S3 bucket** — stores static assets from `.output/public` (with revision-based cleanup)
2. **Lambda function** — runs Nuxt SSR from `.output/server` (with optional Lambda Layer for node_modules)
3. **API Gateway (HTTP API)** — routes requests to Lambda with custom domain
4. **CloudFront distribution** — CDN in front of both S3 (static) and API Gateway (SSR)
5. **Route53 records** — A + AAAA records for the custom domain
6. **EventBridge rules** — Lambda warming every 5 min; asset cleanup weekly

Static assets use `NuxtAppStaticAssets.ts` to define cache behaviors: `_nuxt/*` (immutable, 365 days), `.well-known/*` (1 day), and general public files (1 day CDN / 1 hour browser).

### Lambda Functions (built separately)

- `lib/functions/assets-cleanup/` — Node.js Lambda that deletes outdated S3 assets by comparing object metadata `revision` timestamps
- `lib/functions/access-logs-analysis/group-by-date/` — groups raw CloudFront access logs by date
- `lib/functions/access-logs-analysis/partitioning/` — converts logs to Parquet format for Athena

Each Lambda function has its own `package.json` and build step. Their compiled output is included in the npm package via the `files` field.

### WAF Stack: `lib/stack/waf/`

`CloudFrontWafStack` is a separate CDK stack that **must** be deployed in `us-east-1` regardless of the app region (AWS WAF requirement for CloudFront). The WAF ARN is then passed to `NuxtServerAppStack` via `webAclArn`.

### CLI Scripts: `lib/cli/`

Three CLI scripts registered as npm `bin` entries:
- `cdk-nuxt-init-server` — scaffolds `stack/index.ts` from `lib/templates/stack-index-server.ts`
- `cdk-nuxt-deploy-server` — builds the Nuxt app, copies `server/` dir into `.output/server/`, then runs `cdk deploy`
- `cdk-nuxt-destroy-server` — runs `cdk destroy`

### Props Hierarchy

```
StackProps (aws-cdk-lib)
  └── NuxtAppStackProps (project, service, environment, domain, hostedZoneId, globalTlsCertificateArn, rootDir)
        └── NuxtServerAppStackProps (regionalTlsCertificateArn, + all SSR/caching/feature flags)
```

### Key Design Decisions

- **Deployment revision tracking**: Each deployment writes an `app-revision` file to S3 with a timestamp. Static assets in `_nuxt/` get a `revision` metadata tag. The cleanup Lambda uses these timestamps to delete assets older than `outdatedAssetsRetentionDays` (default 30 days).
- **Caching**: Query params, headers, and cookies affecting cache key are all configurable via props. The deprecated `allowHeaders`/`allowCookies`/`allowQueryParams`/`denyQueryParams` props are superseded by more granular `cacheKey*` and `forward*` props.
- **`serverRoutes`**: Path patterns that should route to Lambda (API Gateway) instead of S3 — used for dynamically-generated "file-like" URLs (e.g. `/sitemap.xml` from `@nuxtjs/sitemap`).
- **`additionalBehaviors`**: Array of `NuxtCloudFrontBehavior` for custom CloudFront cache policies and/or CloudFront Functions on specific path patterns.

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode enabled in `tsconfig.json`).
- Match existing formatting in touched files (imports, quote style, semicolons, spacing).
- Use PascalCase for stacks/classes/types (for example `NuxtServerAppStack`, `CloudFrontWafStackProps`).
- Keep prop/type files co-located with their stack module and suffix with `Props`/`Config` where appropriate.
- Export public APIs through root `index.ts`.

## Testing Guidelines
There is currently no dedicated unit test suite in this repository. Minimum validation for each change:

1. Run `pnpm build` in the repository root.
2. Run function-specific builds for affected Lambda folders (for example `pnpm -C lib/functions/access-logs-analysis/partitioning run build`).
3. For behavior/config changes, update docs in `docs/` and verify generated template expectations in `lib/templates/stack-index-server.ts`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits as seen in history: `feat:`, `fix:`, `chore:`, `chore(release):`.
- Keep commits focused; include docs/changelog-relevant updates with code changes.
- PRs should include:
  - clear summary and motivation,
  - linked issue (if available),
  - risk notes for infrastructure changes (CloudFront, Lambda, WAF, logs),
  - any required consumer migration steps.
- Target the active development branch (`develop`) unless a maintainer asks otherwise.
