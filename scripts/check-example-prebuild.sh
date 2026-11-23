#!/usr/bin/env bash
# Prebuilds example/ twice, the second time without --clean, and checks that the plugin's output
# is correct and the same both times. (On SDK 58 prebuild regenerates ios/ either way, so the iOS
# comparison checks that the output is reproducible; the unit tests cover re-applying the plugin
# to an existing project.) Needs the plugin built (npm run build) and the example's dependencies
# installed.
set -euo pipefail

NSE=KiroraNotificationService

cd "$(dirname "$0")/../example"
export CI=1 EXPO_NO_TELEMETRY=1

snapshot="$(mktemp -d)"
trap 'rm -rf "$snapshot"' EXIT

npx expo prebuild --clean --no-install
cp -R ios android "$snapshot/"
npx expo prebuild --no-install

fail() { echo "check-example-prebuild: $*" >&2; exit 1; }

pbxproj=$(ls ios/*.xcodeproj/project.pbxproj)

# The second prebuild must give the same project. Expo 58 regenerates ios/ on every prebuild,
# with or without --clean, so the extension's Xcode objects get new random IDs each time:
# compare project.pbxproj with its 24-character IDs masked.
diff -r --exclude=project.pbxproj "$snapshot/ios" ios || fail 'ios/ changed on the second prebuild'
mask_ids() { sed -E 's/[0-9A-F]{24}/<id>/g' "$1"; }
diff <(mask_ids "$snapshot/$pbxproj") <(mask_ids "$pbxproj") || fail 'project.pbxproj changed on the second prebuild'
diff -r "$snapshot/android" android || fail 'android/ changed on the second prebuild'

targets=$(grep -c 'isa = PBXNativeTarget' "$pbxproj")
[ "$targets" -eq 2 ] || fail "expected 2 Xcode targets (app + extension), found $targets"
grep -q "PRODUCT_BUNDLE_IDENTIFIER = \"io.kirora.demo.shop.$NSE\"" "$pbxproj" || fail 'extension bundle identifier missing'
# Its module must not be KiroraNotificationService, or it shadows the pod it imports.
grep -q 'PRODUCT_MODULE_NAME = KiroraNotificationServiceApp;' "$pbxproj" || fail 'extension module name missing'

blocks=$(grep -c "^target '$NSE' do" ios/Podfile)
[ "$blocks" -eq 1 ] || fail "expected 1 extension target in the Podfile, found $blocks"
[ -f "ios/$NSE/NotificationService.swift" ] || fail 'NotificationService.swift missing'
grep -q 'aps-environment' ios/*/*.entitlements || fail 'aps-environment entitlement missing'

[ -f android/app/src/main/res/drawable-xxxhdpi/kirora_notification_icon.png ] || fail 'Android icon missing'
grep -q 'io.kirora.default_notification_icon' android/app/src/main/AndroidManifest.xml || fail 'icon meta-data missing'
grep -q 'kirora_notification_color' android/app/src/main/res/values/colors.xml || fail 'colour resource missing'

echo 'check-example-prebuild: ok'
