# Contributing

```sh
npm install --legacy-peer-deps
npm test                               # build and unit tests
./scripts/check-example-prebuild.sh    # prebuilds example/ twice and checks it
```

CI runs both on every push to `main` and every pull request.

The [example app](example/README.md) is the end-to-end check on devices.

## Releasing

Merging to `main` publishes to npm when `package.json`'s version isn't there yet
(`.github/workflows/release.yml`, as in kirora-web). `scripts/release-plan.mjs` picks the
dist-tag: a prerelease goes to `next`, an older maintenance version to `release-<major>.<minor>`,
anything else to `latest`. A merge that doesn't change the version publishes nothing.

To release, bump `version` in `package.json` and add a `CHANGELOG.md` entry in a pull request;
publishing happens when it merges. The workflow publishes only after the tests pass, and
publishes the tarball it packed, with provenance.

npm authenticates the workflow through trusted publishing (no token is stored). Setup, once:

1. Publish a placeholder from a maintainer's machine, since trusted publishing needs an existing
   package: with `version` set to `0.0.1-stage` locally (not committed), run
   `npm publish --tag stage --access public --provenance=false` (provenance only works from CI).
2. On npmjs.com, in the package's Settings → Trusted publishing → GitHub Actions: organization
   `kiroratech`, repository `kirora-expo-plugin`, workflow `release.yml`, environment `npm`.
3. In this repository's GitHub settings, create the environment `npm`.
