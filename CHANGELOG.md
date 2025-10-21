# Changelog


## v2.17.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.14.0...v2.17.0)

### 🚀 Enhancements

- Add serverRoutes prop for dynamic server endpoints with file-like URLs ([2106d2e](https://github.com/ferdinandfrank/cdk-nuxt/commit/2106d2e))

### 🏡 Chore

- **release:** V2.15.0 ([51a0694](https://github.com/ferdinandfrank/cdk-nuxt/commit/51a0694))
- **release:** V2.16.0 ([8d13b43](https://github.com/ferdinandfrank/cdk-nuxt/commit/8d13b43))

### ❤️ Contributors

- Daniel Petrovaliev ([@dpetrovaliev](https://github.com/dpetrovaliev))
- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.16.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.15.0...v2.16.0)

### 🚀 Enhancements

- Add serverRoutes prop for dynamic server endpoints with file-like URLs ([2106d2e](https://github.com/ferdinandfrank/cdk-nuxt/commit/2106d2e))

### ❤️ Contributors

- Daniel Petrovaliev ([@dpetrovaliev](https://github.com/dpetrovaliev))

## v2.15.0


### 🚀 Enhancements

- Add `serverRoutes` prop to route file-like paths to SSR origin instead of S3
- Add support to route Nuxt I18n translation routes via Lambda ([19721eb](https://github.com/ferdinandfrank/cdk-nuxt/commit/19721eb))
- Add origin request policy for Nuxt app and enhance cache key configuration ([162ea7d](https://github.com/ferdinandfrank/cdk-nuxt/commit/162ea7d))
- Integrate changelogen for automated release notes ([c995286](https://github.com/ferdinandfrank/cdk-nuxt/commit/c995286))
- Enhance props template with detailed header and query param management ([a77140d](https://github.com/ferdinandfrank/cdk-nuxt/commit/a77140d))
- Support multiple package managers in deployment scripts ([7f3d5d0](https://github.com/ferdinandfrank/cdk-nuxt/commit/7f3d5d0))
- Optimize names of Lambda handler ([87b0441](https://github.com/ferdinandfrank/cdk-nuxt/commit/87b0441))
- Prevent the creation of a custom origin request policy if no explicit config is provided ([c5dc0cb](https://github.com/ferdinandfrank/cdk-nuxt/commit/c5dc0cb))
- Add cache config for localization files (_i18n) from @nuxtjs/i18n module ([91fe8a7](https://github.com/ferdinandfrank/cdk-nuxt/commit/91fe8a7))
- Add cache config for localization files (_i18n) from @nuxtjs/i18n module" ([164285b](https://github.com/ferdinandfrank/cdk-nuxt/commit/164285b))

### 🩹 Fixes

- Correct argument handling in CDK deployment command ([1ea0516](https://github.com/ferdinandfrank/cdk-nuxt/commit/1ea0516))
- Expand API Gateway methods to support write methods for api routes ([a01d905](https://github.com/ferdinandfrank/cdk-nuxt/commit/a01d905))
- Use correct import for HttpMethod ([28aab90](https://github.com/ferdinandfrank/cdk-nuxt/commit/28aab90))
- Ensure directory exists before writing app revision file ([6ed20c4](https://github.com/ferdinandfrank/cdk-nuxt/commit/6ed20c4))
- Update logIncludesCookies to depend on enableAccessLogsAnalysis prop ([077338f](https://github.com/ferdinandfrank/cdk-nuxt/commit/077338f))
- Remove outdated aws-cdk dependency from pnpm-lock.yaml ([91817a3](https://github.com/ferdinandfrank/cdk-nuxt/commit/91817a3))
- Correct scheduled cleanup rule to run on Tuesday at 03:30 AM GMT ([e437a7f](https://github.com/ferdinandfrank/cdk-nuxt/commit/e437a7f))
- Update NODE_AUTH_TOKEN to use NPM_TOKEN for package publication ([a85003f](https://github.com/ferdinandfrank/cdk-nuxt/commit/a85003f))
- Update registry URL in publish workflow to use npmjs.org ([cb331c6](https://github.com/ferdinandfrank/cdk-nuxt/commit/cb331c6))
- Enable fetching tags in publish workflow ([0bc40f0](https://github.com/ferdinandfrank/cdk-nuxt/commit/0bc40f0))
- Format verification step in publish workflow for clarity ([672b1f3](https://github.com/ferdinandfrank/cdk-nuxt/commit/672b1f3))
- Bump version to 2.5.1 in package.json ([ad42fdc](https://github.com/ferdinandfrank/cdk-nuxt/commit/ad42fdc))
- Reorder pnpm setup step in workflows ([9d62c63](https://github.com/ferdinandfrank/cdk-nuxt/commit/9d62c63))
- Set correct package version ([635a52c](https://github.com/ferdinandfrank/cdk-nuxt/commit/635a52c))
- Update step name in release PR workflow ([e9942c2](https://github.com/ferdinandfrank/cdk-nuxt/commit/e9942c2))
- Prevent release version jumps ([c3d010d](https://github.com/ferdinandfrank/cdk-nuxt/commit/c3d010d))
- Remove redundant command and backmerge master into develop ([6c0c9b4](https://github.com/ferdinandfrank/cdk-nuxt/commit/6c0c9b4))
- Adjust workflows and prepack scripts for streamlined package builds ([d659ebc](https://github.com/ferdinandfrank/cdk-nuxt/commit/d659ebc))
- Simplify release workflow by removing redundant version check step ([24dc2c4](https://github.com/ferdinandfrank/cdk-nuxt/commit/24dc2c4))
- Adjust version to npm registry ([3b311ca](https://github.com/ferdinandfrank/cdk-nuxt/commit/3b311ca))
- Change base branch for automated release PRs from master to develop ([fdf9107](https://github.com/ferdinandfrank/cdk-nuxt/commit/fdf9107))
- Change base branch for automated release PRs from master to develop" ([5488603](https://github.com/ferdinandfrank/cdk-nuxt/commit/5488603))
- Adjust version to npm registry ([15ea6e7](https://github.com/ferdinandfrank/cdk-nuxt/commit/15ea6e7))
- Update workflow badge link in README ([8d1a6fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/8d1a6fc))
- Add id-token permission to publish-on-merge workflow ([e6e83f0](https://github.com/ferdinandfrank/cdk-nuxt/commit/e6e83f0))
- Remove id-token permission from publish-on-merge workflow ([775fbcc](https://github.com/ferdinandfrank/cdk-nuxt/commit/775fbcc))
- Attempt to fix release process ([dc60493](https://github.com/ferdinandfrank/cdk-nuxt/commit/dc60493))
- Attempt to fix release process ([2f3ecfd](https://github.com/ferdinandfrank/cdk-nuxt/commit/2f3ecfd))
- Attempt to fix release process ([f62c91d](https://github.com/ferdinandfrank/cdk-nuxt/commit/f62c91d))
- Attempt to fix release process ([376a20b](https://github.com/ferdinandfrank/cdk-nuxt/commit/376a20b))
- Prevent requiring @aws-cdk/aws-glue-alpha package when access logs analysis is disabled ([18f70a2](https://github.com/ferdinandfrank/cdk-nuxt/commit/18f70a2))

### 💅 Refactors

- Replace `fs.existsSync` with direct `existsSync` import and remove unused `fs` import ([09f310e](https://github.com/ferdinandfrank/cdk-nuxt/commit/09f310e))
- Replace `logRetention` with explicitly defined LogGroups for Lambda functions ([e3c4de8](https://github.com/ferdinandfrank/cdk-nuxt/commit/e3c4de8))
- Migrate logRetention to logGroup for BucketDeployment ([afe20c8](https://github.com/ferdinandfrank/cdk-nuxt/commit/afe20c8))

### 📖 Documentation

- Update README to clarify AWS CDK version requirements and usage options ([79f4449](https://github.com/ferdinandfrank/cdk-nuxt/commit/79f4449))
- Update README to reflect support for Nuxt 4 ([738a6ea](https://github.com/ferdinandfrank/cdk-nuxt/commit/738a6ea))
- Update README to correct type for outdatedAssetsRetentionDays ([80092d8](https://github.com/ferdinandfrank/cdk-nuxt/commit/80092d8))
- Update build badge link in README ([cd5ddcb](https://github.com/ferdinandfrank/cdk-nuxt/commit/cd5ddcb))
- Update installation instructions and clarify dependencies in README ([13c3610](https://github.com/ferdinandfrank/cdk-nuxt/commit/13c3610))
- Simplify installation steps in readme ([855a4fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/855a4fc))

### 🏡 Chore

- Update dependencies to latest versions ([94704a4](https://github.com/ferdinandfrank/cdk-nuxt/commit/94704a4))
- Migrate from yarn to pnpm for dependency management ([58a95b1](https://github.com/ferdinandfrank/cdk-nuxt/commit/58a95b1))
- Update build and publish workflows to use 'pnpm run' and adjust branch triggers ([1615e35](https://github.com/ferdinandfrank/cdk-nuxt/commit/1615e35))
- Remove unused fs dependency ([008f713](https://github.com/ferdinandfrank/cdk-nuxt/commit/008f713))
- Add `skipLibCheck` to tsconfig for faster builds ([0ca3d37](https://github.com/ferdinandfrank/cdk-nuxt/commit/0ca3d37))
- Re-run release ([84e2c4d](https://github.com/ferdinandfrank/cdk-nuxt/commit/84e2c4d))
- Simplify workflows by removing build and updating publish flow; add release PR automation ([34d0abe](https://github.com/ferdinandfrank/cdk-nuxt/commit/34d0abe))
- **release:** V2.7.0 ([34e8629](https://github.com/ferdinandfrank/cdk-nuxt/commit/34e8629))
- **release:** V2.9.0 ([bbc92a4](https://github.com/ferdinandfrank/cdk-nuxt/commit/bbc92a4))
- **release:** V2.9.0 ([e9369e2](https://github.com/ferdinandfrank/cdk-nuxt/commit/e9369e2))
- **release:** V2.10.1 ([7d63bee](https://github.com/ferdinandfrank/cdk-nuxt/commit/7d63bee))
- **release:** V2.10.2 ([53d3c5e](https://github.com/ferdinandfrank/cdk-nuxt/commit/53d3c5e))
- **release:** V2.10.3 ([9d4ce58](https://github.com/ferdinandfrank/cdk-nuxt/commit/9d4ce58))
- **release:** V2.10.6 ([3210cf1](https://github.com/ferdinandfrank/cdk-nuxt/commit/3210cf1))
- **release:** V2.10.8 ([18595a2](https://github.com/ferdinandfrank/cdk-nuxt/commit/18595a2))
- Sync release v back to develop ([0850da8](https://github.com/ferdinandfrank/cdk-nuxt/commit/0850da8))
- **release:** V2.11.0 ([4418731](https://github.com/ferdinandfrank/cdk-nuxt/commit/4418731))
- Sync release v2.11.0 back to develop ([e4b6ba0](https://github.com/ferdinandfrank/cdk-nuxt/commit/e4b6ba0))
- **release:** V2.12.0 ([d1d51d5](https://github.com/ferdinandfrank/cdk-nuxt/commit/d1d51d5))
- Sync release v2.12.0 back to develop ([d6ca777](https://github.com/ferdinandfrank/cdk-nuxt/commit/d6ca777))
- Move CDK dependencies to devDependencies in pnpm-lock.yaml ([00f04e6](https://github.com/ferdinandfrank/cdk-nuxt/commit/00f04e6))
- **release:** V2.12.1 ([c1f066a](https://github.com/ferdinandfrank/cdk-nuxt/commit/c1f066a))
- Sync release v2.12.1 back to develop ([8a80b47](https://github.com/ferdinandfrank/cdk-nuxt/commit/8a80b47))
- Remove unused CLI commands from package.json ([1c7561e](https://github.com/ferdinandfrank/cdk-nuxt/commit/1c7561e))
- **release:** V2.12.2 ([e2c5431](https://github.com/ferdinandfrank/cdk-nuxt/commit/e2c5431))
- Sync release v2.12.2 back to develop ([d01c004](https://github.com/ferdinandfrank/cdk-nuxt/commit/d01c004))
- **release:** V2.12.3 ([0ca7691](https://github.com/ferdinandfrank/cdk-nuxt/commit/0ca7691))
- Sync release v2.12.3 back to develop ([acf5f86](https://github.com/ferdinandfrank/cdk-nuxt/commit/acf5f86))
- **release:** V2.13.0 ([6365e4a](https://github.com/ferdinandfrank/cdk-nuxt/commit/6365e4a))
- Sync release v2.13.0 back to develop ([abf48db](https://github.com/ferdinandfrank/cdk-nuxt/commit/abf48db))
- **release:** V2.14.0 ([b86de92](https://github.com/ferdinandfrank/cdk-nuxt/commit/b86de92))

### 🤖 CI

- Simplify release ([55f6eb3](https://github.com/ferdinandfrank/cdk-nuxt/commit/55f6eb3))
- Simplify release ([e5161c9](https://github.com/ferdinandfrank/cdk-nuxt/commit/e5161c9))
- Add GITHUB_TOKEN to changelog generation step ([1b14b81](https://github.com/ferdinandfrank/cdk-nuxt/commit/1b14b81))
- Configure git user for changelog generation ([a3f678a](https://github.com/ferdinandfrank/cdk-nuxt/commit/a3f678a))
- Simplify release" ([b6f4962](https://github.com/ferdinandfrank/cdk-nuxt/commit/b6f4962))
- Simplify release"" ([8cda087](https://github.com/ferdinandfrank/cdk-nuxt/commit/8cda087))
- Attempt to simplify release process ([b881624](https://github.com/ferdinandfrank/cdk-nuxt/commit/b881624))
- Attempt to fix release process ([32f4a67](https://github.com/ferdinandfrank/cdk-nuxt/commit/32f4a67))
- Read version from package.json for GitHub release ([493a894](https://github.com/ferdinandfrank/cdk-nuxt/commit/493a894))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.14.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.13.0...v2.14.0)

### 🚀 Enhancements

- Add cache config for localization files (_i18n) from @nuxtjs/i18n module" ([164285b](https://github.com/ferdinandfrank/cdk-nuxt/commit/164285b))

### 🏡 Chore

- Sync release v2.13.0 back to develop ([abf48db](https://github.com/ferdinandfrank/cdk-nuxt/commit/abf48db))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.13.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.12.3...v2.13.0)

### 🚀 Enhancements

- Add cache config for localization files (_i18n) from @nuxtjs/i18n module ([91fe8a7](https://github.com/ferdinandfrank/cdk-nuxt/commit/91fe8a7))

### 🏡 Chore

- Sync release v2.12.3 back to develop ([acf5f86](https://github.com/ferdinandfrank/cdk-nuxt/commit/acf5f86))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.12.3

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.12.2...v2.12.3)

### 🩹 Fixes

- Prevent requiring @aws-cdk/aws-glue-alpha package when access logs analysis is disabled ([18f70a2](https://github.com/ferdinandfrank/cdk-nuxt/commit/18f70a2))

### 📖 Documentation

- Simplify installation steps in readme ([855a4fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/855a4fc))

### 🏡 Chore

- Sync release v2.12.2 back to develop ([d01c004](https://github.com/ferdinandfrank/cdk-nuxt/commit/d01c004))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.12.2

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.12.1...v2.12.2)

### 🏡 Chore

- Sync release v2.12.1 back to develop ([8a80b47](https://github.com/ferdinandfrank/cdk-nuxt/commit/8a80b47))
- Remove unused CLI commands from package.json ([1c7561e](https://github.com/ferdinandfrank/cdk-nuxt/commit/1c7561e))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.12.1

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.12.0...v2.12.1)

### 📖 Documentation

- Update installation instructions and clarify dependencies in README ([13c3610](https://github.com/ferdinandfrank/cdk-nuxt/commit/13c3610))

### 🏡 Chore

- Sync release v2.12.0 back to develop ([d6ca777](https://github.com/ferdinandfrank/cdk-nuxt/commit/d6ca777))
- Move CDK dependencies to devDependencies in pnpm-lock.yaml ([00f04e6](https://github.com/ferdinandfrank/cdk-nuxt/commit/00f04e6))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.12.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.11.0...v2.12.0)

### 🚀 Enhancements

- Prevent the creation of a custom origin request policy if no explicit config is provided ([c5dc0cb](https://github.com/ferdinandfrank/cdk-nuxt/commit/c5dc0cb))

### 🏡 Chore

- Sync release v2.11.0 back to develop ([e4b6ba0](https://github.com/ferdinandfrank/cdk-nuxt/commit/e4b6ba0))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.11.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.10.8...v2.11.0)

### 🚀 Enhancements

- Optimize names of Lambda handler ([87b0441](https://github.com/ferdinandfrank/cdk-nuxt/commit/87b0441))

### 💅 Refactors

- Migrate logRetention to logGroup for BucketDeployment ([afe20c8](https://github.com/ferdinandfrank/cdk-nuxt/commit/afe20c8))

### 🏡 Chore

- Sync release v back to develop ([0850da8](https://github.com/ferdinandfrank/cdk-nuxt/commit/0850da8))

### 🤖 CI

- Read version from package.json for GitHub release ([493a894](https://github.com/ferdinandfrank/cdk-nuxt/commit/493a894))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.10.8

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.10.7...v2.10.8)

### 🩹 Fixes

- Attempt to fix release process ([dc60493](https://github.com/ferdinandfrank/cdk-nuxt/commit/dc60493))
- Attempt to fix release process ([2f3ecfd](https://github.com/ferdinandfrank/cdk-nuxt/commit/2f3ecfd))
- Attempt to fix release process ([f62c91d](https://github.com/ferdinandfrank/cdk-nuxt/commit/f62c91d))
- Attempt to fix release process ([376a20b](https://github.com/ferdinandfrank/cdk-nuxt/commit/376a20b))

### 📖 Documentation

- Update build badge link in README ([cd5ddcb](https://github.com/ferdinandfrank/cdk-nuxt/commit/cd5ddcb))

### 🤖 CI

- Simplify release" ([b6f4962](https://github.com/ferdinandfrank/cdk-nuxt/commit/b6f4962))
- Simplify release"" ([8cda087](https://github.com/ferdinandfrank/cdk-nuxt/commit/8cda087))
- Attempt to simplify release process ([b881624](https://github.com/ferdinandfrank/cdk-nuxt/commit/b881624))
- Attempt to fix release process ([32f4a67](https://github.com/ferdinandfrank/cdk-nuxt/commit/32f4a67))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.10.6

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.10.5...v2.10.6)

### 🩹 Fixes

- Attempt to fix release process ([dc60493](https://github.com/ferdinandfrank/cdk-nuxt/commit/dc60493))
- Attempt to fix release process ([2f3ecfd](https://github.com/ferdinandfrank/cdk-nuxt/commit/2f3ecfd))

### 📖 Documentation

- Update build badge link in README ([cd5ddcb](https://github.com/ferdinandfrank/cdk-nuxt/commit/cd5ddcb))

### 🤖 CI

- Simplify release" ([b6f4962](https://github.com/ferdinandfrank/cdk-nuxt/commit/b6f4962))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.10.3

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.10.2...v2.10.3)

### 🩹 Fixes

- Adjust version to npm registry ([15ea6e7](https://github.com/ferdinandfrank/cdk-nuxt/commit/15ea6e7))
- Update workflow badge link in README ([8d1a6fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/8d1a6fc))
- Add id-token permission to publish-on-merge workflow ([e6e83f0](https://github.com/ferdinandfrank/cdk-nuxt/commit/e6e83f0))
- Remove id-token permission from publish-on-merge workflow ([775fbcc](https://github.com/ferdinandfrank/cdk-nuxt/commit/775fbcc))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.10.2

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.10.1...v2.10.2)

### 🩹 Fixes

- Adjust version to npm registry ([15ea6e7](https://github.com/ferdinandfrank/cdk-nuxt/commit/15ea6e7))
- Update workflow badge link in README ([8d1a6fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/8d1a6fc))
- Add id-token permission to publish-on-merge workflow ([e6e83f0](https://github.com/ferdinandfrank/cdk-nuxt/commit/e6e83f0))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.10.1

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.9.0...v2.10.1)

### 🩹 Fixes

- Change base branch for automated release PRs from master to develop" ([5488603](https://github.com/ferdinandfrank/cdk-nuxt/commit/5488603))
- Adjust version to npm registry ([15ea6e7](https://github.com/ferdinandfrank/cdk-nuxt/commit/15ea6e7))
- Update workflow badge link in README ([8d1a6fc](https://github.com/ferdinandfrank/cdk-nuxt/commit/8d1a6fc))

### 🏡 Chore

- **release:** V2.7.0 ([34e8629](https://github.com/ferdinandfrank/cdk-nuxt/commit/34e8629))
- **release:** V2.9.0 ([bbc92a4](https://github.com/ferdinandfrank/cdk-nuxt/commit/bbc92a4))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

## v2.9.0

[compare changes](https://github.com/ferdinandfrank/cdk-nuxt/compare/v2.4.0...v2.9.0)

### 🚀 Enhancements

- Add support to route Nuxt I18n translation routes via Lambda ([19721eb](https://github.com/ferdinandfrank/cdk-nuxt/commit/19721eb))
- Add origin request policy for Nuxt app and enhance cache key configuration ([162ea7d](https://github.com/ferdinandfrank/cdk-nuxt/commit/162ea7d))
- Integrate changelogen for automated release notes ([c995286](https://github.com/ferdinandfrank/cdk-nuxt/commit/c995286))
- Enhance props template with detailed header and query param management ([a77140d](https://github.com/ferdinandfrank/cdk-nuxt/commit/a77140d))
- Support multiple package managers in deployment scripts ([7f3d5d0](https://github.com/ferdinandfrank/cdk-nuxt/commit/7f3d5d0))

### 🩹 Fixes

- Correct argument handling in CDK deployment command ([1ea0516](https://github.com/ferdinandfrank/cdk-nuxt/commit/1ea0516))
- Expand API Gateway methods to support write methods for api routes ([a01d905](https://github.com/ferdinandfrank/cdk-nuxt/commit/a01d905))
- Use correct import for HttpMethod ([28aab90](https://github.com/ferdinandfrank/cdk-nuxt/commit/28aab90))
- Ensure directory exists before writing app revision file ([6ed20c4](https://github.com/ferdinandfrank/cdk-nuxt/commit/6ed20c4))
- Update logIncludesCookies to depend on enableAccessLogsAnalysis prop ([077338f](https://github.com/ferdinandfrank/cdk-nuxt/commit/077338f))
- Remove outdated aws-cdk dependency from pnpm-lock.yaml ([91817a3](https://github.com/ferdinandfrank/cdk-nuxt/commit/91817a3))
- Correct scheduled cleanup rule to run on Tuesday at 03:30 AM GMT ([e437a7f](https://github.com/ferdinandfrank/cdk-nuxt/commit/e437a7f))
- Update NODE_AUTH_TOKEN to use NPM_TOKEN for package publication ([a85003f](https://github.com/ferdinandfrank/cdk-nuxt/commit/a85003f))
- Update registry URL in publish workflow to use npmjs.org ([cb331c6](https://github.com/ferdinandfrank/cdk-nuxt/commit/cb331c6))
- Enable fetching tags in publish workflow ([0bc40f0](https://github.com/ferdinandfrank/cdk-nuxt/commit/0bc40f0))
- Format verification step in publish workflow for clarity ([672b1f3](https://github.com/ferdinandfrank/cdk-nuxt/commit/672b1f3))
- Bump version to 2.5.1 in package.json ([ad42fdc](https://github.com/ferdinandfrank/cdk-nuxt/commit/ad42fdc))
- Reorder pnpm setup step in workflows ([9d62c63](https://github.com/ferdinandfrank/cdk-nuxt/commit/9d62c63))
- Set correct package version ([635a52c](https://github.com/ferdinandfrank/cdk-nuxt/commit/635a52c))
- Update step name in release PR workflow ([e9942c2](https://github.com/ferdinandfrank/cdk-nuxt/commit/e9942c2))
- Prevent release version jumps ([c3d010d](https://github.com/ferdinandfrank/cdk-nuxt/commit/c3d010d))
- Remove redundant command and backmerge master into develop ([6c0c9b4](https://github.com/ferdinandfrank/cdk-nuxt/commit/6c0c9b4))
- Adjust workflows and prepack scripts for streamlined package builds ([d659ebc](https://github.com/ferdinandfrank/cdk-nuxt/commit/d659ebc))
- Simplify release workflow by removing redundant version check step ([24dc2c4](https://github.com/ferdinandfrank/cdk-nuxt/commit/24dc2c4))
- Adjust version to npm registry ([3b311ca](https://github.com/ferdinandfrank/cdk-nuxt/commit/3b311ca))
- Change base branch for automated release PRs from master to develop ([fdf9107](https://github.com/ferdinandfrank/cdk-nuxt/commit/fdf9107))

### 💅 Refactors

- Replace `fs.existsSync` with direct `existsSync` import and remove unused `fs` import ([09f310e](https://github.com/ferdinandfrank/cdk-nuxt/commit/09f310e))
- Replace `logRetention` with explicitly defined LogGroups for Lambda functions ([e3c4de8](https://github.com/ferdinandfrank/cdk-nuxt/commit/e3c4de8))

### 📖 Documentation

- Update README to clarify AWS CDK version requirements and usage options ([79f4449](https://github.com/ferdinandfrank/cdk-nuxt/commit/79f4449))
- Update README to reflect support for Nuxt 4 ([738a6ea](https://github.com/ferdinandfrank/cdk-nuxt/commit/738a6ea))
- Update README to correct type for outdatedAssetsRetentionDays ([80092d8](https://github.com/ferdinandfrank/cdk-nuxt/commit/80092d8))

### 🏡 Chore

- Update dependencies to latest versions ([94704a4](https://github.com/ferdinandfrank/cdk-nuxt/commit/94704a4))
- Migrate from yarn to pnpm for dependency management ([58a95b1](https://github.com/ferdinandfrank/cdk-nuxt/commit/58a95b1))
- Update build and publish workflows to use 'pnpm run' and adjust branch triggers ([1615e35](https://github.com/ferdinandfrank/cdk-nuxt/commit/1615e35))
- Remove unused fs dependency ([008f713](https://github.com/ferdinandfrank/cdk-nuxt/commit/008f713))
- Add `skipLibCheck` to tsconfig for faster builds ([0ca3d37](https://github.com/ferdinandfrank/cdk-nuxt/commit/0ca3d37))
- Re-run release ([84e2c4d](https://github.com/ferdinandfrank/cdk-nuxt/commit/84e2c4d))
- Simplify workflows by removing build and updating publish flow; add release PR automation ([34d0abe](https://github.com/ferdinandfrank/cdk-nuxt/commit/34d0abe))

### ❤️ Contributors

- Ferdinand Frank ([@ferdinandfrank](https://github.com/ferdinandfrank))

