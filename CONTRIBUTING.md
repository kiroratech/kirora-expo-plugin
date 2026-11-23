# Contributing

```sh
npm install --legacy-peer-deps
npm test                               # build and unit tests
./scripts/check-example-prebuild.sh    # prebuilds example/ twice and checks it
```

CI runs both on every push to `main` and every pull request.

The [example app](example/README.md) is the end-to-end check on devices.
