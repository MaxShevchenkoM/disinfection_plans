#!/usr/bin/env bash
# Збирає сайт із гілок main (прод -> /) і preprod (-> /preprod/) і пушить у gh-pages.
set -euo pipefail
cd "$(dirname "$0")"
git fetch -q origin main preprod
T=$(mktemp -d)
mkdir -p "$T/preprod"
# Сайт = index.html + css/ + js/ з кожної гілки (tests/ і службові файли не публікуються)
site(){ local ref=$1 dst=$2; local paths; paths=$(git ls-tree --name-only "$ref" | grep -E '^(index\.html|css|js)$' || true); git archive "$ref" $paths | tar -x -C "$dst"
  # мітка версії, щоб браузер не взяв старі css/js із кешу
  local v; v=$(git rev-parse --short "$ref"); sed -i -E "s#(src|href)=\"(js/[^\"]+\.js|css/[^\"]+\.css)\"#\1=\"\2?v=$v\"#g" "$dst/index.html"; }
site origin/main "$T"
site origin/preprod "$T/preprod"
echo 'window.PLAN_ENV={name:"prod",table:"plan_prod"};' > "$T/env.js"
echo 'window.PLAN_ENV={name:"preprod",table:"plan_preprod"};' > "$T/preprod/env.js"
touch "$T/.nojekyll"
W=$(mktemp -d)
git worktree add -q --detach "$W"
cd "$W"
git checkout -q --orphan gh-pages-tmp
git rm -rqf . >/dev/null
cp -r "$T"/. .
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "Публікація: main=$(git rev-parse --short origin/main) preprod=$(git rev-parse --short origin/preprod)"
git push -q -f origin HEAD:gh-pages
cd - >/dev/null
git worktree remove --force "$W"
git branch -D gh-pages-tmp >/dev/null 2>&1 || true
echo "Опубліковано"
