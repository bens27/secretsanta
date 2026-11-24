#!/usr/bin/env bash
# Builds "Secret Santa.app" into macos/build/.
#
#   macos/build.sh              # release build
#   macos/build.sh --debug      # debug build (Web Inspector enabled)
#
# Environment:
#   PUBLIC_URL  Where "Copy Secret Link" links point (default: the GitHub Pages site).
#   YARN        Command used to run yarn (default: `yarn`, falling back to `npx corepack yarn`).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/.." && pwd)"

configuration=release
if [[ "${1:-}" == "--debug" ]]; then
  configuration=debug
fi

public_url="${PUBLIC_URL:-https://bens27.github.io/secretsanta}"

if [[ -n "${YARN:-}" ]]; then
  read -r -a yarn <<<"$YARN"
elif command -v yarn >/dev/null 2>&1; then
  yarn=(yarn)
else
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  yarn=(npx -y corepack@latest yarn)
fi

echo "==> Building web UI"
web_out="$here/build/web"
rm -rf "$web_out"
(cd "$repo" && "${yarn[@]}" install --immutable >/dev/null && VITE_PUBLIC_URL="$public_url" "${yarn[@]}" vite build --outDir "$web_out" --emptyOutDir >/dev/null)

echo "==> Building Swift app ($configuration)"
(cd "$here" && swift build -c "$configuration" --product SecretSanta >/dev/null)
binary="$(cd "$here" && swift build -c "$configuration" --show-bin-path)/SecretSanta"

echo "==> Assembling bundle"
app="$here/build/Secret Santa.app"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$binary" "$app/Contents/MacOS/SecretSanta"
cp "$here/Info.plist" "$app/Contents/Info.plist"
mv "$web_out" "$app/Contents/Resources/web"

# App icon from the homepage illustration.
iconset="$here/build/AppIcon.iconset"
rm -rf "$iconset" && mkdir -p "$iconset"
square="$here/build/icon-1024.png"
sips -s format png --resampleHeightWidth 1024 1024 "$repo/static/cats.png" --out "$square" >/dev/null
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$square" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  sips -z "$((size * 2))" "$((size * 2))" "$square" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$iconset" -o "$app/Contents/Resources/AppIcon.icns"
rm -rf "$iconset" "$square"

# Ad-hoc signature, enough to run locally. Use a Developer ID to distribute.
codesign --force --deep --sign - "$app" >/dev/null 2>&1

echo "==> Built $app"
