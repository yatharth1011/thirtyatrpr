#!/bin/sh
# Publish mini/index.html (build/mini.py) to the repo's gh-pages branch -> https://yatharth1011.github.io/thirtyatrpr/
# Builds the branch in a throwaway repo, so the working checkout never switches branches.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/thirty-mini.XXXXXX")"
cp "$ROOT/mini/index.html" "$TMP/index.html"
cp "$ROOT/mini/index.html" "$TMP/404.html"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "Publish THIRTY@RPR mini" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -f "$(git -C "$ROOT" remote get-url origin)" gh-pages
rm -rf "$TMP"
echo "published gh-pages"
