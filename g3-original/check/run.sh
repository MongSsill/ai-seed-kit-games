#!/bin/sh
# 게임 3 검사 돌리기: 크롬을 화면 없이 띄워 check/g3check.html 을 열고 결과 글을 뽑는다
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
D=$(cd "$(dirname "$0")" && pwd)
P=$(cygpath -w "$D")
"$CH" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=60000 --dump-dom "file:///${P//\//}/g3check.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p' | sed 's/<[^>]*>//g'
