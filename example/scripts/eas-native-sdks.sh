#!/usr/bin/env bash
# EAS Build's pre-install hook (package.json "eas-build-pre-install"): until the Kirora native SDKs
# are on Maven Central and CocoaPods, fetch them from GitHub on the build machine.
#   Android: kirora-android, published to this machine's Maven Local (app.config.js adds mavenLocal()).
#   iOS:     kirora-ios, checked out where KIRORA_IOS_SDK_PATH points (see eas.json), which the
#            plugin's ios.localSdkPath turns into the Podfile's `pod 'Kirora', :path => …`.
# KIRORA_ANDROID_REF / KIRORA_IOS_REF pick a commit, branch or tag (default: main). eas.json pins
# the commits the vendored @kirora/react-native was tested against, so a change on main can't
# break a build; move them together with the tarball.
# It also compiles @kirora/expo-plugin, which the example links with `file:..`: its build/ is not
# committed. Delete the SDK steps once the SDKs are published.
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

if [ "$platform" = "android" ]; then
  fetch_ref https://github.com/kiroratech/kirora-android.git "${KIRORA_ANDROID_REF:-main}" .kirora/kirora-android
  # Its own Gradle home: EAS's ~/.gradle/init.gradle adds a Maven mirror to every project, which
  # kirora-android's settings refuse (repositories are declared in settings only). Maven Local
  # stays ~/.m2, where the app's build looks.
  (cd .kirora/kirora-android && GRADLE_USER_HOME="$PWD/../gradle-home" ./gradlew :kirora-sdk:publishToMavenLocal :kirora-sdk-push:publishToMavenLocal --console=plain -q)
  echo "Kirora Android SDK $(git -C .kirora/kirora-android rev-parse --short HEAD) is in Maven Local"
elif [ "$platform" = "ios" ]; then
  dest="${KIRORA_IOS_SDK_PATH:-.kirora/kirora-ios}"
  fetch_ref https://github.com/kiroratech/kirora-ios.git "${KIRORA_IOS_REF:-main}" "$dest"
  echo "Kirora iOS SDK $(git -C "$dest" rev-parse --short HEAD) is at $dest"
fi
