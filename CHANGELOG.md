# Changelog


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

