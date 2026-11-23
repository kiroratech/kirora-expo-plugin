#!/usr/bin/env bash
# EAS Build's pre-install hook (package.json "eas-build-pre-install"): compiles @kirora/expo-plugin,
# which the example links with `file:..`: its build/ is not committed. The native SDKs need
# nothing here: Android's is on Maven Central, and @kirora/react-native bundles the iOS SDK.
set -euo pipefail
cd "$(dirname "$0")/../.."
npm ci --legacy-peer-deps --ignore-scripts
npm run build
