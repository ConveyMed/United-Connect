#!/usr/bin/env bash
# Generic iOS release pipeline for Capacitor apps.
# Web build -> cap sync ios -> Xcode archive -> export IPA -> upload to App Store Connect.
#
# Usage:
#   ASC_KEY_ID=XXXXXXXXXX \
#   ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
#   ASC_KEY_PATH=~/Apps/p8-keys/AuthKey_XXXXXXXXXX.p8 \
#   ./scripts/ios-release.sh
#
# Prerequisites per app (one-time):
#   1. ios/App/ExportOptions.plist exists (method=app-store, teamID set)
#   2. App record exists in App Store Connect
#   3. ASC API key for the relevant Apple Developer team

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${ASC_KEY_ID:?Set ASC_KEY_ID in your env}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID in your env}"
: "${ASC_KEY_PATH:?Set ASC_KEY_PATH to the absolute path of your AuthKey_*.p8}"

# altool reads the key from ~/.appstoreconnect/private_keys/ by default
mkdir -p "$HOME/.appstoreconnect/private_keys"
KEY_DEST="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
[ -f "$KEY_DEST" ] || cp "$ASC_KEY_PATH" "$KEY_DEST"

echo "=== 1/5  Web build ==="
npm run build

echo "=== 2/5  Capacitor sync (iOS) ==="
rm -rf "$ROOT/ios/App/build"
npx cap sync ios

echo "=== 3/5  Xcode archive ==="
cd "$ROOT/ios/App"
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  -allowProvisioningUpdates \
  clean archive

echo "=== 4/5  Export signed IPA ==="
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates

IPA_PATH="$(ls build/*.ipa | head -1)"
echo "Built IPA: $IPA_PATH"

echo "=== 5/5  Upload to App Store Connect ==="
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"

echo
echo "Done. Build uploaded. It will appear in TestFlight after processing (5-30 min)."
echo "Then run: (cd ios/App && fastlane submit)   to submit for App Store review."
