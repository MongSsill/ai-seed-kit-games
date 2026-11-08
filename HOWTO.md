# 쓰는 법

## 처음 한 번 (0 준비)

1. Claude 요금제에 가입한다 (무료 요금제에는 Claude Code 가 없다).
2. Claude Code 를 설치한다. Windows 는 PowerShell 을 열고 `irm https://claude.ai/install.ps1 | iex` 를 붙여 넣는다. Mac 은 터미널에서 `curl -fsSL https://claude.ai/install.sh | bash`. 끝나면 새 창을 열고 `claude --version` 으로 확인한다. 공식 안내: https://code.claude.com/docs/en/setup
3. Windows 라면 Git for Windows 를 설치한다 (https://git-scm.com/downloads). 저장과 올리기에 쓴다.
4. 받은 압축 파일을 풀어 문서 폴더 같은 곳에 둔다. games 폴더가 이 작업실이고 home 폴더가 본부다.
5. GitHub 계정을 만든다 (https://github.com, 무료). 작업을 온라인에 저장하고 게임 링크를 만드는 데 쓴다.
6. games 폴더에서 터미널을 열고 `claude` 를 실행해 로그인한다. Windows 11 은 폴더 빈 곳에서 마우스 오른쪽 버튼을 눌러 "터미널에서 열기"를 고른다.
7. `/start` 를 입력하고 물음에 답한다. "이 폴더를 내 GitHub 에 공개 저장소로 올리고 싶어"라고 말하면 순서를 안내한다.
8. CLAUDE.md 의 일하는 규칙에서 한 줄을 내 말로 고친다. `/end` 로 저장한다.
9. 새 대화를 열어 `/start` 가 이어받는지 본다.

터미널이 낯설면 Claude 데스크톱 앱에서 같은 폴더를 열어 쓸 수도 있다. 이 키트는 터미널에서만 시험했다.

## 매일

1. `/start` — 지금 게임(둘 이상이면 고른다)과 단계, 오늘 할 한 가지를 정한다.
2. 일한다. 한 번에 하나씩 바꾸고 직접 해 본다.
3. `/end` — 실험 로그와 상태가 남고 저장된다.
4. 게임 하나를 끝낼 때 `/retro` — 막혔던 것을 모아 이 폴더를 하나 고친다.

## 이 폴더가 자라는 방식

- 고쳐 준 일과 AI가 틀렸던 것은 LESSONS.md 장부에 쌓인다.
- 두 번 반복되면 규칙이 되고, 세 번 설명한 절차는 명령이 된다. 규칙이 있는데도 어겨지면 더 구체적으로 고치거나 검사로 바꾼다.
- 바꾸는 것은 한 번에 하나이고 내가 고른다. 바꾼 기록은 LESSONS.md 의 "고친 이력"에 남는다.
- 규칙 파일(CLAUDE.md)은 40줄을 넘기지 않는다. 넣을 때 뺄 것을 같이 본다.
- Claude가 .claude/ 안의 명령이나 역할 파일을 만들거나 고치려 할 때 승인 요청이 뜨면, 내용을 읽고 승인한다. 읽지 않고 승인하지 않는다.

## 링크로 올리기 (E 단계)

저장소의 Settings 에서 Pages 를 열고 "Deploy from a branch" 를 고른 뒤 브랜치와 폴더(root)를 정해 Save 를 누른다. 주소는 `https://<아이디>.github.io/<저장소 이름>/` 이고 게임은 그 뒤에 게임 폴더 이름을 붙인다. 반영까지 10분쯤 걸릴 수 있다. 올린 뒤에는 다른 기기에서 실제로 열어 확인한다. 공식 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
