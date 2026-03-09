# Repository Guidelines

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
- `pnpm run release:check`: release gate (currently runs build checks).

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
