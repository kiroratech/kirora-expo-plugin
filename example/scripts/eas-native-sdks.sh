#!/usr/bin/env bash
# EAS Build's pre-install hook (package.json "eas-build-pre-install"): until Kirora's iOS pods are on
# CocoaPods, fetch kirora-ios from GitHub on the build machine, checked out where
# KIRORA_IOS_SDK_PATH points (see eas.json). The plugin's ios.localSdkPath turns it into the
# Podfile's `pod 'Kirora', :path => …`. Android uses the SDK on Maven Central.
# KIRORA_IOS_REF picks a commit, branch or tag (default: main). eas.json pins the commit the
# vendored @kirora/react-native was tested against, so a change on main can't break a build; move
# it together with the tarball.
# It also compiles @kirora/expo-plugin, which the example links with `file:..`: its build/ is not
# committed. Delete the iOS step once the pods are published.
set -euo pipefail

# A shallow checkout of one ref, which may be a commit (git clone --branch takes only names).
fetch_ref() {
  rm -rf "$3" && mkdir -p "$3"
  git -C "$3" init -q
  git -C "$3" fetch -q --depth 1 "$1" "$2"
  git -C "$3" checkout -q FETCH_HEAD
}

cd "$(dirname "$0")/.."
platform="${EAS_BUILD_PLATFORM:-}"

(cd .. && npm ci --legacy-peer-deps --ignore-scripts && npm run build)

if [ "$platform" = "ios" ]; then
  dest="${KIRORA_IOS_SDK_PATH:-.kirora/kirora-ios}"
  fetch_ref https://github.com/kiroratech/kirora-ios.git "${KIRORA_IOS_REF:-main}" "$dest"
  echo "Kirora iOS SDK $(git -C "$dest" rev-parse --short HEAD) is at $dest"
fi
