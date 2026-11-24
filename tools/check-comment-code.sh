#!/bin/sh
# 주석에 묻힌 코드 검사 (2026-11-25 게임 3 회고, 장부 90·99): 줄 끝 "// 주석" 뒤에 코드를 이어 붙이면 그 코드는 실행되지 않는다.
# 쓰는 법: sh tools/check-comment-code.sh 파일.js [파일.js ...]
# 결과: 문제 줄마다 "FAIL [주석에 묻힌 코드] 파일:줄 — 내용" 을 찍고, 하나라도 있으면 끝 코드 1. 없으면 "OK [주석에 묻힌 코드] 0줄" 과 끝 코드 0.
# 잡는 것: 주석 안에 "이름 = 값 … ;" 처럼 대입하고 ; 로 끝나는 코드. 일부러 그렇게 쓴 줄은 줄 끝에 lint-ok 를 붙이면 넘어간다.
bad=0
for f in "$@"; do
  out=$(awk -v F="$f" '
    /lint-ok/ { next }
    {
      line = $0; pos = 0; n = length(line)
      for (i = 1; i < n; i++) {
        if (substr(line, i, 2) == "//" && (i == 1 || substr(line, i - 1, 1) != ":")) {
          pre = substr(line, 1, i - 1)
          q1 = gsub(/\x27/, "&", pre); q2 = gsub(/"/, "&", pre)
          if (q1 % 2 == 0 && q2 % 2 == 0) { pos = i; break }
        }
      }
      if (!pos) next
      c = substr(line, pos + 2)
      if (c ~ /[A-Za-z_$][A-Za-z0-9_$.]*(\[[^]]*\])? *(=|\+=|-=) *[^= ]/ && c ~ /(;|\);|\} *;?) *$/) {
        printf "FAIL [주석에 묻힌 코드] %s:%d — %s\n      → 주석 뒤 코드를 새 줄로 옮기세요 (일부러면 줄 끝에 lint-ok)\n", F, NR, substr(line, pos, 110)
      }
    }' "$f")
  if [ -n "$out" ]; then echo "$out"; bad=1; fi
done
if [ $bad -eq 0 ]; then echo "OK [주석에 묻힌 코드] 0줄"; fi
exit $bad
