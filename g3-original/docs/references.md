# Chain Echo 레퍼런스·에셋 정리

2026-11-24 · 이 파일이 기준본이다. claude.ai 문서(https://claude.ai/artifact/KmPA2Vgb9P5nRRfc3WaJgg)에서 옮겨 왔고, 앞으로는 이 파일만 고친다.

## 전제

이 문서는 기획서 Chain_Echo_Game_Design_Spec_v0.1.md(2026-11-23)와 docs/problem.md(2026-11-24, 미결정 항목의 초기 확정값)를 기준으로, 구현 전에 모아야 할 레퍼런스와 만들어야 할 에셋을 정리한다. 레퍼런스는 아직 열린 결정의 근거, 에셋은 First Playable(§10.1)부터 1-5까지 필요한 리소스다. 2026-11-24에 problem.md를 반영했고, 바뀐 곳은 아래 변경 이력에 적었다.

- 제출: 넷마블 네오 채용 포트폴리오. 웹 게임 + 유튜브 플레이 영상 링크 + 개발 과정 아티팩트.
- [변경 11-24] 캐릭터 3종은 몬길: 스타다이브의 플레아·클로에·오필리아를 모티브로 도트화한다. 원작 그림과 소리는 넣지 않는다(problem.md). 대응은 빨강=플레아, 파랑=오필리아, 바람=클로에 (오너 확인 11-24).
- [변경 11-24] 1-1은 전체적으로 밝은 숲 맵. 1-2~1-5 테마는 미정.
- 원작 IP의 2D 플랫포머 확장이라는 구상이므로 원작과의 차별화 근거를 함께 챙긴다.
- 우선순위는 기획서 §0 그대로: 태그의 핵심 재미 > 단계별 학습 > 연출·콘텐츠 규모.
- 캐릭터 이름 빨강/파랑/바람은 임시 식별명이다.

## 변경 이력

바뀐 표의 행은 첫 칸에 [변경 11-24], 새로 들어간 행은 [추가 11-24]로 표시했다.

| 날짜 | 근거 | 바뀐 곳 |
| --- | --- | --- |
| 2026-11-24 | 결정 기록 2026-11-23 게임 3 엔진: 웹 (HTML + game.js, 빌드 도구·외부 라이브러리 없음). Phaser 는 버린 후보. 이 문서가 Phaser 를 가정했던 것을 고침 | 구현 레퍼런스, 구현 링크, 가정 |
| 2026-11-24 | 오너 동의 (결정 기록 2026-11-24 "게임 3 공개와 라이선스"): 폰트는 Galmuri·Neo둥근모, SFX 생성은 ChipTone, 유튜브 일부공개, 시작 화면·문서에 IP 활용 게임 고지. 게임 링크 자리는 미정 | 라이선스 확인 결과, UI 레퍼런스, 출처 후보, 확인 필요 |
| 2026-11-24 | 오너 지시: 캐릭터 모티브 플레아·클로에·오필리아, 1-1 밝은 숲 | 전제, 아트 레퍼런스, 타일셋 에셋 |
| 2026-11-24 | problem.md: 원작 그림·소리 안 넣음. 1-1은 빨강·파랑만, 바람은 1-2부터 | 전제, 아트 레퍼런스 |
| 2026-11-24 | problem.md: 스테이지 목록 1-1~1-5, 별 3개, 숨겨진 보물, 골인 문, 클리어 화면, 시작 화면 조작 안내, 장애물 앞 짧은 키 안내 | 레벨 디자인·UI 레퍼런스, 타일셋·UI·사운드 에셋 |
| 2026-11-24 | problem.md: 체력 3칸 공용, 게임 오버 없음, 재시작은 스테이지 처음(체크포인트 없음) | UI·타일셋 에셋, 확인 필요 |
| 2026-11-24 | problem.md: PERFECT 0.25초·기술 타격만·1회 1기회, 스택 2·2초·시작 2 | 핵심 시스템 표 |
| 2026-11-24 | problem.md: 파랑 5방향(좌·우·좌상·우상·상), 상 방향은 얼음 기둥 발판 | 핵심 시스템 표 임시 발판 행, 캐릭터·VFX 에셋, 가정 |
| 2026-11-24 | problem.md: 태그는 자유 선택, 캐릭터별 태그 키 셋, 직접 기술 키 없음, 등장 위치는 이전 자리 | 핵심 시스템 표, 캐릭터·UI 에셋 |

## 레퍼런스 목록

우선순위 1(핵심 시스템·구현·원작 분석)은 First Playable 전에, 2(레벨 디자인)는 Stage 1~2 설계 전에, 3(아트·UI·사운드)은 연출 단계에 필요하다. 각 항목의 "결정에 쓰는 곳"은 기획서 §11 번호다.

### 1. 핵심 시스템 (우선순위 1)

| 주제 | 레퍼런스 | 무엇을 볼 것인가 | 결정에 쓰는 곳 |
| --- | --- | --- | --- |
| [변경 11-24] 태그 + 자동 기술 발동 | 명조: 워더링 웨이브 변주 스킬 | 교체 시 조건부 기술 자동 발동 구조, 교체 연출 길이 | 결정됨(problem.md): 자유 선택, 캐릭터별 태그 키 셋, 직접 기술 키 없음. 이제 체감 비교용 |
| [변경 11-24] 태그 + 자동 기술 발동 | 원신 파티 교체 | 캐릭터별 숫자 키 교체의 체감, 교체 쿨타임 표시 | 캐릭터별 태그 키 HUD |
| 원작 태그 구조 | 몬길: 스타다이브 | 교체 타이밍, 교체 시 효과, 합동기 연출. 차별화 비교표의 기준 | 차별화 근거 |
| 에코(잔류 공격) | 드래곤볼 파이터즈 어시스트, 마블 vs 캡콤 태그 | 나가는 캐릭터가 공격을 마무리하는 연출 길이와 반투명 처리 | §11-10 에코 프레임 |
| [변경 11-24] PERFECT 판정 피드백 | Hi-Fi Rush, 세키로 패리, 리듬 게임 판정 | 성공 시 플래시·효과음·히트스톱 길이 | 결정됨: 0.25초, 기술 타격만, 기술 1회 1기회. 체감 검증용 |
| [변경 11-24] 돌진 이동 | Celeste 대시, 메가맨 X 대시, 카타나 제로 | 거리·속도·잔상, 공격 판정 붙은 돌진의 피격 처리 | 결정됨: 일반 적에 안 멈춤, 보스 큰 공격은 못 막음. 속도·거리는 해 보며 |
| 수직 상승 | Ori의 바시·상승 기류, 할로우 나이트 | 상승 높이와 공중 제어, 상승 중 공격 판정 | 바람 공격 판정은 해 보며 정함 |
| [변경 11-24] 임시 발판 | 마리오·Celeste 사라지는 발판, 인크레더블 프로즌 얼음 길 | 소멸 예고 피드백, 단방향 통과, 상 방향 얼음 기둥이 발판으로 남는 모습 | 결정됨: 5방향, 유지 1.5초, 0.3초 전 균열, 경로 1개만 |
| 3인 합동 필살기 | 몬길 합동기, 드래곤볼 파이터즈 메테오, 페르소나 5 총공격 | 컷 구성과 길이, 기존 애니메이션 재활용 방식 | §6.2 |

### 2. 레벨 디자인 (우선순위 2)

| 주제 | 레퍼런스 | 무엇을 볼 것인가 | 쓰는 곳 |
| --- | --- | --- | --- |
| 텍스트 없는 학습 구조 | 슈퍼마리오 3D월드 4단계 레벨 구조, Celeste 1장, 포탈 초반 챔버 | 도입→전개→변주→결론을 지형만으로 만드는 방법 | 1-1~1-4 |
| [변경 11-24] 처음 겪는 장애물 앞 짧은 키 안내 | Celeste 첫 대시 안내, 할로우 나이트 능력 획득 안내 | 안내 노출 시점, 한 번만 띄우는 조건, 바람 태그 키·필살기 키 첫 등장 처리 | problem.md 안내 규칙 |
| [추가 11-24] 스테이지 목록·별 | 뉴 슈퍼마리오 브라더스(스테이지 목록, 스타 코인), Celeste 챕터 선택 | 잠금 표시, 별 3개 조건 표시, 베스트 기록 | 스테이지 목록·클리어 화면 |
| [추가 11-24] 숨겨진 보물 배치 | 뉴 슈퍼마리오 스타 코인, Celeste 딸기, 쇼벨 나이트 보물 | 보이되 닿기 어려운 배치, 태그 기술로만 닿는 자리 | 스테이지마다 보물 1개 |
| 검증형 보스 | 메가맨 X 인트로 보스, 할로우 나이트 가짜 기사, 컵헤드 | 패턴 수(3~4개), 텔레그래프 길이, 빈틈 구간 | 1-5 |
| 분석 자료 | GMTK 레벨 디자인 영상, Maddy Thorson의 Celeste·TowerFall 물리 글, GDC "Juice it or lose it" | 코요테 타임·입력 버퍼·타격감 수치 | 구현 전반 |

### 3. 아트·연출 (우선순위 3, 원작 자료는 1)

| 주제 | 레퍼런스 | 무엇을 볼 것인가 |
| --- | --- | --- |
| [변경 11-24] 원작 캐릭터 3종 | 몬길: 스타다이브의 플레아, 클로에, 오필리아 공식 일러스트·인게임 모델·스킬 연출·대사 톤 | 실루엣·색 배치·기술 모티프. 원작 그림은 넣지 않으므로 도트화가 원작을 알아볼 수 있게 유지하는지 판단. 빨강/파랑/바람 대응 확인 필요 |
| IP 확장 사례 | Convergence(리그 오브 레전드 2D 플랫포머), Prince of Persia: The Lost Crown, 소닉 매니아 | 원작의 무엇을 유지하고 무엇을 바꿨는지 |
| [추가 11-24] 밝은 숲 타일셋 | 쇼벨 나이트 평원, 소닉 매니아 그린 힐, 커비 시리즈 숲 스테이지, 아울보이 | 밝은 채도에서 발판·배경·낙사 구간이 한눈에 구분되는 색 배치 |
| 도트 캐릭터 규격 | 32px급: Dead Cells, 카타나 제로, Blasphemous / 소형: Celeste | 기존 도트 에셋 크기가 확인되면 한쪽만 남김 |
| 기술 VFX | Dead Cells, 카타나 제로, 커비 시리즈의 픽셀 이펙트 | 화염 트레일, 얼음 생성→균열→파괴, 얼음 기둥, 바람 소용돌이 |
| 에코 잔상 | Celeste 대시 잔상, 격투게임 어시스트 실루엣 | 틴트·알파만으로 가능한지 |

### 4. UI·HUD (우선순위 3)

| 주제 | 레퍼런스 |
| --- | --- |
| [변경 11-24] 캐릭터별 태그 키 + 대기 캐릭터 표시 | 원신·명조 파티 HUD(숫자 키가 붙은 아이콘), 드래곤볼 파이터즈 포트레이트 열 |
| 태그 스택 표시 | Celeste 머리색 변화(캐릭터에 녹이는 방식) vs 격투게임 미터 |
| [추가 11-24] 체력 3칸 | 젤다 하트, 할로우 나이트 마스크 |
| [추가 11-24] 스테이지 목록·클리어 화면 | 뉴 슈퍼마리오 브라더스, Celeste 챕터 선택·클리어 화면 |
| 판정 텍스트 | Hi-Fi Rush, 리듬 게임 PERFECT 표기 |
| [변경 11-24] 한글 픽셀 폰트 | Galmuri, Neo둥근모 (둘 다 OFL 1.1). 둥근모꼴 블로그 배포판은 라이선스 근거가 깔끔하지 않아 쓰지 않음 |

### 5. 사운드 (우선순위 3)

| 주제 | 레퍼런스 |
| --- | --- |
| PERFECT 성공음 | Hi-Fi Rush 판정음, 세키로 패리음, 리듬 게임 Perfect음. NORMAL과 즉시 구분 |
| 기술 SFX | 화염/얼음/바람 톤 분리 |
| BGM | 스테이지용 1, 보스용 1 |

### 6. 구현 (우선순위 1)

[변경 11-24] 게임 3 엔진은 웹 (HTML + game.js, 빌드 도구·외부 라이브러리 없음, 결정 기록 2026-11-23). 물리 엔진 없이 충돌을 직접 짜므로 엔진 예제보다 원리 글이 쓸모 있다.

| 주제 | 레퍼런스 | 쓰는 곳 |
| --- | --- | --- |
| [변경 11-24] 단방향·경사 발판 | Celeste·TowerFall 물리 글(직접 짜는 충돌 구조), 게임 1·2 의 game.js | §4.2 얼음 경로, 가장 큰 기술 리스크 |
| [변경 11-24] 히트스톱·입력 버퍼 | Celeste 물리 글, 사쿠라이 히트스톱 칼럼, 카운터 기반 입력 버퍼 글 | §2.4 PERFECT 윈도우 |
| 다단히트 1회 제한 | 히트 ID·이벤트 ID 관리 패턴 | §5.3 |
| [변경 11-24] 웹 배포 | GitHub Pages (게임 1·2 와 같은 방식, ENGINES.md 웹), 대비책 itch.io | 제출 링크. 자리는 미정 (라이선스 확인 결과 아래 참고) |
| 포트폴리오 영상 | 채용용 게임플레이 영상 구성(첫 10초 핵심 재미, 1~2분, 타임스탬프) | 유튜브 영상 |

## 레퍼런스 링크 (2026-11-24 수집)

위 레퍼런스 목록의 항목을 실제로 열어 볼 수 있는 링크. 열어서 내용을 확인한 것만 실었고, 찾지 못한 것은 "미확인"으로 남기고 이유를 적었다. 유튜브·위키 링크는 사라질 수 있어 제출 전에 한 번 더 확인한다.

### 레벨 디자인

| 항목 | 링크 | 한 줄 설명 |
| --- | --- | --- |
| 4단계 레벨 구조 | [GMTK: Super Mario 3D World's 4 Step Level Design](https://www.youtube.com/watch?v=dBmIkEvEBtA) | 도입·전개·반전·결말 구조. 1-1~1-4 설계의 기본 틀 |
| Celeste 레벨 디자인 | [GDC: Designing Celeste (Maddy Thorson)](https://gdcvault.com/play/1024307/Level-Design-Workshop-Designing-Celeste) | 레벨 디자인 워크숍, 무료 강연 |
| Celeste 조작감 | [GMTK: Why Does Celeste Feel So Good to Play?](https://www.youtube.com/watch?v=yorTG9at90g) | 코요테 타임, 입력 버퍼 등 조작감 요소 |
| Portal 학습 설계 | [Game Developer: Player Learning in Portal](https://www.gamedeveloper.com/design/analysis-of-game-concepts-and-player-learning-in-portal) | 챔버별 개념 도입 순서 분석 |
| Portal 포스트모템 | [Valve GDC 2008 Portal Post-Mortem (PDF)](https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_PortalPostMortem.pdf) | Valve 공식 발표 노트 |
| Celeste·TowerFall 물리 | [Celeste & TowerFall Physics](https://maddymakesgames.com/articles/celeste_and_towerfall_physics/) | Solid/Actor 충돌 구조 원문. 코요테 타임 언급은 없음 |
| 타격감 | [Juice it or lose it](https://www.youtube.com/watch?v=Fy0aCDmgnxg) | 2012 강연 공식 영상 |
| 스테이지 목록·수집 요소 | [Super Mario Wiki: Star Coin](https://www.mariowiki.com/Star_Coin) | NSMB 스타 코인 개수·해금 규칙 |
| 숨겨진 수집 요소 | [Celeste Wiki: Strawberries](https://celeste.ink/wiki/Strawberries) | 챕터별 딸기 배치 |
| Shovel Knight 보물 배치 | 미확인 | 위키 사이트가 자동 접속을 막아 검증 못 함. 직접 검색 필요 |
| 검증형 보스: 메가맨 X | [Sequelitis: Mega Man Classic vs. Mega Man X](https://www.youtube.com/watch?v=8FpigqfcvlM) | 인트로 스테이지의 무언 교습 분석 |
| 검증형 보스: 할로우 나이트 | [False Knight (Fextralife)](https://hollowknight.wiki.fextralife.com/False+Knight) | 3페이즈 패턴·스태거 정리 |
| 보스 텔레그래프 | [GMTK: How Cuphead's Bosses (Try to) Kill You](https://www.youtube.com/watch?v=F8T6Ul4aHTI) | 예고 동작·패턴 가독성 |
| 보스 텔레그래프 (보조) | [Dissecting Design: Cuphead](https://www.gamedeveloper.com/design/dissecting-design-cuphead) | 보스 디자인·밸런스 기사 |

### 구현

[변경 11-24] 게임 3 은 웹 (HTML + game.js) 이라 Phaser·Vite 행은 "[해당 없음]"으로 표시해 남겨 둔다. 쓸모 있는 것은 히트스톱, 입력 버퍼, itch.io, 포트폴리오 영상 행이다.

| 항목 | 링크 | 한 줄 설명 |
| --- | --- | --- |
| [해당 없음] 단방향 발판 | [Arcade Body API](https://docs.phaser.io/api-documentation/class/physics-arcade-body) | body.checkCollision.down=false로 아래에서 통과 |
| [해당 없음] 단방향 발판 (타입) | [ArcadeBodyCollision typedef](https://docs.phaser.io/api-documentation/typedef/types-physics-arcade) | checkCollision 플래그 정의 |
| [해당 없음] Arcade 개요 | [Arcade Physics concepts](https://docs.phaser.io/phaser/concepts/physics/arcade) | 월드 설정·충돌 플래그 |
| [해당 없음] 충돌 방향 예제 | [collision direction.js](https://github.com/phaserjs/examples/blob/master/public/src/physics/arcade/collision%20direction.js) | touching.up/down으로 방향 판별 |
| [해당 없음] 타일맵 충돌 | [TilemapLayerBase API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemaplayerbase) | setCollision, setCollisionByProperty |
| [해당 없음] 경사 충돌 (Matter) | [matter platformer with wall jumping.js](https://github.com/phaserjs/examples/blob/master/public/src/tilemap/collision/matter%20platformer%20with%20wall%20jumping.js) | Tiled 충돌 형상(경사 포함) 변환 예제. 얼음 경로 대각 발판 판단용 |
| [해당 없음] Matter 개요 | [Matter Physics concepts](https://docs.phaser.io/phaser/concepts/physics/matter) | Arcade에서 Matter로 전환할지 판단 자료 |
| 히트스톱 | [Sakurai on Hitstop (Source Gaming)](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/) | 히트스톱 길이·진동 기법 |
| 코요테 타임·입력 버퍼 | [GameMaker: Advanced Jump Mechanics](https://gamemaker.io/en/blog/flynn-advanced-jump-mechanics) | 카운터 기반 구현. PERFECT 윈도우도 같은 방식 |
| [해당 없음] 프로젝트 템플릿 | [phaserjs/template-vite-ts](https://github.com/phaserjs/template-vite-ts) | 공식 TS+Vite 템플릿. README는 Phaser 4 기준이라 버전 확인 |
| [해당 없음] 웹 배포 | [Vite: Deploying a Static Site](https://vite.dev/guide/static-deploy) | GitHub Pages base 설정·Actions 워크플로 |
| 웹 배포 (itch.io) | [itch.io HTML5 docs](https://itch.io/docs/creators/html5) | ZIP 루트에 index.html, 용량 제한 |
| 포트폴리오 영상 | [Breaking into Game Design Part 2: Portfolio](https://www.gamedeveloper.com/design/breaking-into-game-design-part-2-build-your-portfolio) | 작품별 90초 이내 영상, 디자인 과정 설명 권장 |
| 포트폴리오 영상 (보조) | [Portfolio tips from a Creative Assembly vet](https://www.gamedeveloper.com/design/game-design-portfolio-building-tips-from-a-creative-assembly-vet) | 프로젝트별 영상 구성 팁 |

### 핵심 시스템·원작·IP 확장

원작 캐릭터 DB에 따르면 플레아는 불 속성, 오필리아는 얼음 속성, 클로에는 바람 속성이다. 게임 2 도 빨강 용 여자=플레아, 파랑 얼음 왕녀=오필리아, 초록 바람 격투가=클로에로 썼다 (STATE.md). 게임 3 도 빨강=플레아, 파랑=오필리아, 바람=클로에 (오너 확인 11-24, "4는 맞아"). 원작에도 "교체 스킬"이 있으므로 차별화 비교표에서 그 자리를 먼저 짚어야 한다.

| 항목 | 링크 | 한 줄 설명 |
| --- | --- | --- |
| 몬길 공식 사이트 | [stardive.netmarble.com](https://stardive.netmarble.com/ko) | 캐릭터·세계관·PV |
| 몬길 공식 캐릭터 | [공식 캐릭터 페이지](https://stardive.netmarble.com/ko/character) | 브라우저에서 열어야 목록이 보임 |
| 몬길 공식 유튜브 | [@Stardive_KR](https://www.youtube.com/@Stardive_KR) | 공식 한국 채널 |
| 플레아 | [GameWith 플레아 DB](https://gamewith.ai/mongil-stardive/ko/character-db/flare) | 5성 불 속성. 일러스트·교체 스킬·필살기 |
| 오필리아 | [GameWith 오필리아 DB](https://gamewith.ai/mongil-stardive/ko/character-db/ophelia) | 5성 얼음 난투. 일러스트·스킬 |
| 클로에 | [게임메카 클로에 소개](https://www.gamemeca.com/view.php?gid=1782119) | 5성 바람 격투. 세부 수치는 없음 |
| 클로에 (일본어) | [GameWith JP 클로에](https://gamewith.jp/gamedb/12334/articles/64703) | 신캐 소개 기사 |
| 원작 교체 스킬 정리 | [게임조선 스킬 미리보기](https://www.gamechosun.co.kr/webzine/article/view.php?no=221354) | 플레아·오필리아 교체/특수/궁극 스킬 |
| 원작 태그 전투 설명 | [게임와이 쇼케이스 기사](http://www.gamey.kr/news/articleView.html?idxno=3016750) | 3인 실시간 태그, 연계 공격, 버스트 시스템 |
| 원작 게임플레이 트레일러 | [공식 트레일러](https://www.youtube.com/watch?v=9mIcUlSwjyU) | 태그 교체 전투 장면 |
| 원작 개발자 토크 | [DEV TALK](https://www.youtube.com/watch?v=fLivgqyRwmc) | 캐릭터 스킬 소개 방송 |
| 원작 합동기 전용 영상 | 미확인 | 합동기만 다룬 공식 영상은 없음. 트레일러에서 장면 찾기 |
| 명조 변주 스킬 | [Intro Skill (Fandom)](https://wutheringwaves.fandom.com/wiki/Intro_Skill) | 교체 진입 시 자동 발동 |
| 명조 아웃트로 스킬 | [Outro Skill (Fandom)](https://wutheringwaves.fandom.com/wiki/Outro_Skill) | 퇴장 캐릭터가 발동. 에코와 가장 가까운 기존 사례 |
| 원신 파티 교체 | [Party (Fandom)](https://genshin-impact.fandom.com/wiki/Party) | 교체 쿨다운 규칙 |
| 원신 조작 | [GameWith 조작 가이드](https://gamewith.net/genshin-impact/article/show/40478) | 1~4 숫자 키 교체 |
| 원신 교체 지연 | [KQM 프레임 자료](https://library.keqingmains.com/evidence/combat-mechanics/frames) | 교체 지연 약 90ms. 태그 반응 속도 기준 |
| DBFZ 어시스트·태그 | [Dustloop DBFZ Mechanics](https://www.dustloop.com/w/DBFZ/Mechanics) | Z Assist, Z Change, Meteor |
| DBFZ 어시스트 영상 | [Tag & Assist Tutorial](https://www.youtube.com/watch?v=qyBTPk-eWzc) | 어시스트 호출 시연 |
| DBFZ 어시스트 기초 | [rooflemonger 강좌](https://www.youtube.com/watch?v=uG-4lwfP5Bw) | 어시스트 기초 |
| MvC2 어시스트 | [Liquipedia MvC2](https://liquipedia.net/fighters/Marvel_vs._Capcom_2/Game_Information) | 어시스트 용도 설명 |
| Hi-Fi Rush 비트 판정 | [The Loadout: Combos](https://www.theloadout.com/hi-fi-rush/combos) | Beat Hit, 링·심벌 타이밍 피드백 |
| Hi-Fi Rush 전투 해설 | [팬 전투 해설](https://psychangels.neocities.org/shrines/hifishrine/combat) | 비트 어긋남 패널티 |
| Sekiro 패리 | [Deflection (Fextralife)](https://sekiroshadowsdietwice.wiki.fextralife.com/Deflection) | 12프레임(0.2초) 윈도우. 0.25초 비교 기준 |
| Celeste 대시 | [Celeste Wiki: Dash](https://celeste.ink/wiki/Dash) | 속도·지속시간·충전 상세 |
| Celeste 이동 기술 | [Moves (Fandom)](https://celestegame.fandom.com/wiki/Moves) | 기본·응용 기술 |
| 메가맨 X 대시 | [Dash (Fandom)](https://megaman.fandom.com/wiki/Dash) | 대시·대시 점프 |
| Katana ZERO 능력 | [Zero (wiki.gg)](https://katanazero.wiki.gg/wiki/Zero) | 베기·구르기·벽점프 |
| Ori 배시 | [Bash (Fandom)](https://oriandtheblindforest.fandom.com/wiki/Bash) | 도약 시그니처 스킬 |
| Ori 런치 | [Launch (Fandom)](https://oriandtheblindforest.fandom.com/wiki/Launch) | 임의 방향 도약. 바람 상승 기준 |
| 마리오 도넛 발판 | [Donut Block](https://www.mariowiki.com/Donut_Block) | 1초 밟으면 떨어지는 발판. 소멸 예고 기준 |
| Celeste 낙하 발판 | [Falling Platforms (Fandom)](https://celestegame.fandom.com/wiki/Falling_Platforms) | 밟으면 떨어지는 발판 |
| 프로즌 얼음 길 | [LEGO Incredibles: Meet Frozone](https://www.youtube.com/watch?v=UpSLm0mo9Zk) | WB Games 공식, 아이스 슬라이드 시연 |
| DBFZ 메테오 | [Meteor Attack (Fandom)](https://dragonballfighterz.fandom.com/wiki/Meteor_Attack) | 레벨3 연출 목록 |
| 페르소나5 총공격 | [All-Out Attack (Fandom)](https://megamitensei.fandom.com/wiki/All-Out_Attack) | 피니시 컷인 |
| CONVERGENCE | [공식 사이트](https://convrgencegame.com/en-us/) | 리그 오브 레전드 2D 플랫포머 |
| Prince of Persia: The Lost Crown | [Ubisoft 공식](https://www.ubisoft.com/en-gb/game/prince-of-persia/the-lost-crown) | 3D 시리즈의 2D 회귀 |
| 소닉 매니아 | [Steam (SEGA)](https://store.steampowered.com/app/584400/Sonic_Mania/) | IP 팬층 겨냥 2D 재해석 |

### 아트·UI·사운드·에셋 출처

라이선스는 각 페이지 원문을 열어 확인했다. 결론은 바로 아래 "라이선스 확인 결과"가 우선이다. CC-BY는 출처 표기가 필요하다.

| 항목 | 링크 | 라이선스 | 한 줄 설명 |
| --- | --- | --- | --- |
| Dead Cells 아트 | [80.lv 케이스 스터디](https://80.lv/articles/case-study-dead-cells-character-art-pipeline) | - | 3D→픽셀 캐릭터 파이프라인 |
| Katana ZERO | [Steam](https://store.steampowered.com/app/460950/Katana_ZERO/) | - | 공식 스토어 페이지 |
| Blasphemous | [The Game Kitchen](https://thegamekitchen.com/blasphemous/) | - | 개발사 공식 |
| Celeste | [celestegame.com](https://www.celestegame.com/) | - | 공식 사이트, 프레스킷 |
| 불·얼음·바람 픽셀 VFX | [Saint11 픽셀아트 튜토리얼](https://saint11.art/blog/pixel-art-tutorials/) | - | Fire, Ice, Wind, Explosion, Smoke 포함 |
| 바람 소용돌이 | [Pixelblog 33: Wind Effects](https://slynyrd.com/blog/2021/7/16/pixelblog-33-wind-effects) | - | 소용돌이·나뭇잎 기법 |
| 얼음 깨짐 전용 | 미확인 | - | 전용 튜토리얼 없음. Saint11의 Ice·Breaking 항목으로 대체 |
| 대시 잔상 | [Pixel Art Shaders: Afterimage](https://nojoule.itch.io/pixel-art-shaders/devlog/1123150/afterimage-effect-added) | - | 팔레트 기반 잔상 효과 (Godot 예시) |
| 숲 타일셋 | [Woods Tileset and Background](https://karsiori.itch.io/woods-tileset-and-background) | CC0 1.0 | 32px 숲 타일 86종 + 배경 7레이어 |
| 숲 타일셋 | [Critters: Flower Woods](https://foozlecc.itch.io/critters-flower-woods) | CC0 1.0 | 밝은 꽃숲 플랫포머 타일 |
| 숲 타일셋 | [SunnyLand Forest (OGA)](https://opengameart.org/content/sunnyland-forest) | CC0 (아트만) | 밝은 16비트 숲 타일 |
| 숲 타일셋 | [SunnyLand 원본 팩](https://ansimuz.itch.io/sunny-land-pixel-game-art) | CC0 1.0 (아트만) | 캐릭터·적·타일·VFX·음악 |
| 플랫포머 타일셋 | [Pixel Adventure 1](https://pixelfrog-assets.itch.io/pixel-adventure-1) | CC0 1.0 | 밝고 귀여운 타일·캐릭터 |
| 숲 타일셋 | [Forest Tileset 1 (OGA)](https://opengameart.org/content/forest-tileset-1) | CC-BY 4.0 | 16px 숲 타일 2변형. 출처 표기 필요 |
| 밝은 숲 색감 | [Green Hill Zone (Wikipedia)](https://en.wikipedia.org/wiki/Green_Hill_Zone) | - | 색 구성 영감, Sonic Mania 재해석 |
| Shovel Knight 평원 | 미확인 | - | 위키 자동 접속 차단. 직접 검색 |
| Galmuri | [GitHub](https://github.com/quiple/galmuri) · [공식 페이지](https://quiple.dev/font/galmuri) | OFL 1.1 | 한글 픽셀 폰트 |
| [변경 11-24] 둥근모꼴 | [배포 페이지](https://cactus.tistory.com/193) | 불명확 | 쓰지 않음. 아래 라이선스 확인 결과 참고 |
| Neo둥근모 | [공식 사이트](https://neodgm.dalgona.dev/) · [GitHub](https://github.com/neodgm/neodgm) | OFL 1.1 | Neo둥근모·Code·Pro |
| 키 아이콘 | [Kenney Input Prompts](https://kenney.nl/assets/input-prompts) | CC0 | 키보드·패드 아이콘 1,500개, 64px |
| 키 아이콘 (픽셀) | [Input Prompts Pixel 16×](https://kenney-assets.itch.io/input-prompts-pixel-16) | CC0 1.0 | 16px 픽셀 입력 아이콘 약 800개 |
| UI 팩 | [Kenney UI Pack](https://kenney.nl/assets/ui-pack) | CC0 | 버튼·패널·슬라이더 |
| UI 효과음 | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 | UI 클릭음 100개 |
| 파티 HUD | [Wuthering Waves UI 해설](https://www.ludo.guide/guide/wuthering-waves/getting-started/understanding-the-ui) | - | HP·스킬 슬롯·파티 표시 |
| 체력 칸 | [Heart Container (SSB Wiki)](https://www.ssbwiki.com/Heart_Container) | - | 젤다 하트 기원 |
| 체력 칸 | [Health Mask (Fextralife)](https://hollowknight.wiki.fextralife.com/Health+Mask) | - | 할로우 나이트 마스크 |
| freesound | [freesound.org](https://freesound.org/) · [라이선스 FAQ](https://freesound.org/help/faq/#licenses) | CC0 / CC BY / CC BY-NC 혼재 | 음원별 라이선스 확인 필수 |
| OGA 효과음 | [OpenGameArt Sound Effect 검색](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=13) | 개별 확인 | 효과음 목록 |
| 레트로 SFX 팩 | [512 Sound Effects 8-bit style](https://opengameart.org/content/512-sound-effects-8-bit-style) | CC0 | 8비트 효과음 512개 |
| [변경 11-24] SFX 생성 | [jsfxr](https://sfxr.me/) | 생성음 라이선스 명시 없음 | 쓰지 않음. ChipTone으로 대체 |
| SFX 생성 | [ChipTone](https://sfbgames.itch.io/chiptone) | 생성물 CC0 | 무료 효과음 생성 툴 |

### 라이선스 확인 결과 (2026-11-24, 각 페이지의 원문을 열어 확인)

제출용으로 쓸 수 있는 것과 조심할 것을 나눔. 표의 라이선스 칸과 다른 점은 여기가 우선.

| 구분 | 에셋 | 확인된 조건 |
| --- | --- | --- |
| 그대로 사용 가능 (CC0, 표기 불필요) | Woods Tileset, Flower Woods, SunnyLand 아트, Pixel Adventure 1, Kenney 3종, Input Prompts Pixel 16, 512 Sound Effects, ChipTone 생성음 | 상업 이용·수정 허용. Kenney 로고만 따로 쓰지 않기 |
| 출처 표기 필수 | Forest Tileset 1 (CC-BY 4.0) | 크레딧에 "CookieEfedu, OpenGameArt, CC BY 4.0" 표기 |
| 출처 표기 필수 | SunnyLand 팩에 들어 있는 데모 음악 | 아트는 CC0지만 음악(Pascal Belisle)은 크레딧 필수. 안 쓰는 게 간단 |
| 게임 임베드 가능 (OFL 1.1) | Galmuri, Neo둥근모 | 폰트 파일 단독 판매 금지, 수정판은 원래 이름 사용 금지. 게임에 넣기만 하는 건 문제 없음 |
| 피하기 | 둥근모꼴 (블로그 배포 페이지) | 본문은 퍼블릭 도메인이라는데 블로그 하단 배지가 CC BY-NC-ND. 같은 계보의 Neo둥근모(OFL)를 쓰는 게 안전 |
| 피하기 | jsfxr (sfxr.me) 생성음 | 툴은 Unlicense지만 생성된 소리의 라이선스가 어디에도 없음. ChipTone(CC0 명시)으로 대체 |
| 개별 확인 | freesound, OpenGameArt 검색 결과 | 음원별로 CC0 / CC BY / CC BY-NC가 섞임. BY-NC는 피하고, BY는 제목·작성자·링크·라이선스를 크레딧에 |

[변경 11-24] 원작 IP 공개 방침 (결정 기록 2026-11-24 "게임 3 공개와 라이선스"). 가장 큰 위험은 무료 에셋이 아니라 원작 IP다. 이 게임은 몬길: 스타다이브 캐릭터 콘셉트를 차용한 IP 활용 게임이다 (결정 기록 2026-11-23). IP 보유사에 포트폴리오로 제출하는 것 자체는 문제가 되기 어렵지만, 영상과 게임을 아무나 찾을 수 있게 두는 것은 다른 이야기다. 그래서 다음처럼 한다.

- 유튜브는 일부공개(링크로만 열림).
- 게임 링크 자리는 미정. 결정 기록 2026-11-06 에 저장소를 공개로 두고 GitHub Pages 로 올리기로 했고, 공고는 "로그인 없이 볼 수 있도록"을 요구한다. 검색에 덜 잡히게 할지는 그 줄과 함께 다시 정한다.
- 시작 화면과 문서에 "몬길: 스타다이브 캐릭터 콘셉트를 차용한 IP 활용 게임, 비영리 창작 게임입니다 (2026-11-24 "비영리 채용 포트폴리오용" 에서 바꿈)"이라고 밝힌다.
- 원작 그림·소리는 넣지 않는다(problem.md). 레퍼런스 게임 스크린샷은 문서 안에서 인용 출처를 밝히는 선에서만 쓴다.

## 필요한 에셋 목록

FP = First Playable(§10.1) 필수. FP 에셋은 색 사각형·직선 등 플레이스홀더로 시작해도 되고, 영상에 나오는 비주얼은 연출 단계에서 채운다. 아직 열린 결정에 걸린 에셋은 "보류"로 표기했다.

### 캐릭터 3종 (빨강·파랑·바람)

모티브는 빨강=플레아, 파랑=오필리아, 바람=클로에. [변경 11-24] 게임 2 의 도트(g2-slice/assets/char-red·blue·green.png, 높이 320)를 그대로 줄여 쓴다 (화면 높이 약 64, 빨강 돌진은 dragon.png). 처음엔 플랫포머용으로 다시 뽑기로 했다가 같은 날 오너가 "C 게임 2 원본"을 고름. 따로 움직이는 동작 그림은 없고 기울기·튐·숨쉬기로 움직임을 낸다.

| 애니메이션 | 대상 | FP | 비고 |
| --- | --- | --- | --- |
| idle, run, jump, fall, land | 3인 공통 | O | |
| [변경 11-24] 기본 공격 | 3인 공통 | O | 기본 공격으로는 PERFECT 불가 확정 |
| 피격, 사망 | 3인 공통 | O | 체력 3칸 공용 |
| [변경 11-24] 태그 등장 / 태그 퇴장 | 3인 공통 | O | 짧게. 등장 위치 확정: 이전 캐릭터 자리 |
| 용 변신 → 화염 돌진 루프 → 변신 해제 | 빨강 | O | 돌진 루프는 2~3프레임으로 충분 |
| [변경 11-24] 활주 포즈 (좌·우·좌상·우상·상) | 파랑 | O | 5방향 확정. 상은 짧게 올라가고 얼음 기둥을 남김 |
| 상승 포즈 → 공중 정지 | 바람 | △ | FP에서는 선택. 1-2부터 등장 |
| 에코 잔상 버전 | 3인 기술 | O | 별도 스프라이트 없이 틴트·알파로 처리 추천 |
| 필살기 컷인 포트레이트 | 3인 | X | 기존 기술 애니메이션 재활용 + 마무리 이펙트(§6.2) |

### 기술·전투 VFX

| 에셋 | FP | 비고 |
| --- | --- | --- |
| 화염 돌진 트레일, 돌진 종료 불티 | O | |
| [변경 11-24] 얼음 경로 타일: 생성 / 유지 / 균열(소멸 0.3초 전) / 파괴 | O | 수평용, 대각용, 상 방향 얼음 기둥용 3종 |
| 상승 기류 소용돌이 | △ | 바람 포함 시 |
| 히트 스파크, 히트스톱 플래시 | O | |
| PERFECT 성공 링/플래시 | O | NORMAL과 시각적으로 즉시 구분 |
| PERFECT 가능 구간 표시 | O | 디버그 HUD용. 정식 UI에 넣을지는 테스트 후 판단 |
| [추가 11-24] 별·보물 획득 이펙트 | X | |
| 게이지 100% 예고 | X | 1-4 |
| 합동 필살기 마무리 이펙트 | X | 1-4~1-5 |

### 적·보스

| 에셋 | FP | 비고 |
| --- | --- | --- |
| 지상 일반 적 1종: idle, 이동, 피격·경직, 사망 | O | Stage 2 학습용 |
| 공중 적 1종 | X | 빨강 돌진 검증(T10), Stage 3 |
| 보스 1체: idle, 지면 충격파, 전방 돌진, 빈틈(무방비), 피격, 사망 | X | Stage 5. 패턴 미결정(§8.4) |
| 보스 충격파·돌진 텔레그래프 이펙트 | X | |

### 타일셋·배경

| 에셋 | FP | 비고 |
| --- | --- | --- |
| [변경 11-24] 지형 타일셋 (1-1 밝은 숲): 평지, 벽, 단방향 발판, 낙사 경계 | O | 1-1 테마 확정: 밝은 숲. 경사 타일은 얼음 경로 충돌 정책 후 결정 |
| [변경 11-24] 배경 레이어 (숲 패럴랙스 2~3장) | X | 1-2~1-5 테마 미정. 숲 테마를 변형해 공유하는 가정 |
| [변경 11-24] 골인 문 (닫힘/열림) | X | 체크포인트 없음: 재시작은 스테이지 처음(problem.md) |
| [추가 11-24] 숨겨진 보물 오브젝트 (미획득/획득) | X | 스테이지마다 1개 |
| 위험 지대 표시(낙사, 가시 등) | X | 기믹 추가 억제(§12.2), 낙사만 우선 |

### UI·HUD

| 에셋 | FP | 비고 |
| --- | --- | --- |
| 디버그 HUD: 현재 캐릭터, 태그 스택, PERFECT 가능 시간 | O | 텍스트만, §12.3 |
| [변경 11-24] 캐릭터 포트레이트 3종 + 캐릭터별 태그 키 표시 | △ | 판 중 항상 보임(problem.md). 대기 캐릭터 2명과 각자의 키 |
| [변경 11-24] 태그 스택 아이콘 2칸 | △ | 판 중 보임. 스택 2 확정 |
| 연계 게이지 바 | X | 1-4 |
| PERFECT / NORMAL 판정 텍스트 | O | |
| [변경 11-24] 체력 3칸 | △ | 확정: 3칸 공용, 피격 시 1칸 |
| [변경 11-24] 키 아이콘 (←→↑, Space, 태그 A S D, F, Shift, E. 같은 날 키 배치 (가)로 바뀜) | X | 시작 화면 조작 안내 + 처음 겪는 장애물 앞 짧은 안내 |
| [추가 11-24] 스테이지 목록 화면: 1-1~1-5 칸, 잠금, 별 3개 | X | 별은 판마다 따로 얻어 쌓이고 브라우저에 저장 ([변경 11-24]) |
| [추가 11-24] 클리어 화면: 걸린 시간, 별, 다음 스테이지/목록 버튼 | X | 게임 클리어 화면 1종 별도. [변경 11-24] 1-5 는 보스 격파 뒤 따로 클리어 연출 (다음 맵으로 가는 특정 아이템 등, 추후 정함) |
| [추가 11-24] IP 활용 고지 문구 | X | 시작 화면에 표시 |
| [변경 11-24] 한글 픽셀 폰트 | O | Galmuri 또는 Neo둥근모 (OFL 1.1) |

### 사운드

| 에셋 | FP | 비고 |
| --- | --- | --- |
| 점프, 착지, 기본 공격, 히트, 피격 | X | 기존 무료 SFX로 충분 |
| 태그 교체음, PERFECT 성공음 | △ | PERFECT음은 판정 피드백의 핵심, 빨리 넣을 가치 있음 |
| 화염 돌진, 얼음 생성·균열·파괴, 바람 상승 | X | |
| 게이지 충전 완료, 필살기 | X | |
| 보스 충격파·돌진, 적 사망 | X | |
| [추가 11-24] 별·보물 획득, 스테이지 클리어 징글 | X | |
| BGM: 스테이지 1, 보스 1 | X | 원작 소리는 넣지 않음 |

### 출처 후보 (라이선스 확인 결과 참고)

- 픽셀 VFX·타일: itch.io, OpenGameArt (CC0 우선)
- UI 아이콘·키 프롬프트·SFX: Kenney (CC0)
- SFX: 512 Sound Effects(CC0), ChipTone 생성음(CC0), freesound는 음원별 확인
- [변경 11-24] 한글 픽셀 폰트: Galmuri, Neo둥근모 (OFL 1.1)

## 확인이 필요한 것과 가정

아래가 확인되면 에셋 표의 "보류"와 캐릭터 "보유" 열을 채울 수 있다.

- [x] 기존 도트화 캐릭터 에셋: 게임 2 의 g2-slice/assets/char-red·blue·green.png (높이 320). g3-original/assets/ 에 복사해 그대로 줄여 쓴다 (11-24)
- [ ] [추가 11-24] 게임 링크를 어디에 둘지 (결정 기록 2026-11-06 게임 링크 줄과 함께)
- [x] [추가 11-24] 빨강=플레아, 파랑=오필리아, 바람=클로에 (오너 확인 11-24)
- [x] [변경 11-24] 한글 픽셀 폰트와 무료 에셋의 라이선스: 원문 확인 완료. 결과는 "라이선스 확인 결과" 참고

이 문서가 쓴 가정:

- [변경 11-24] 엔진은 웹 (HTML + game.js, 빌드 도구·외부 라이브러리 없음). 결정 기록 2026-11-23 에서 정했고, 기획서 9.1 의 Phaser + TypeScript + Vite 는 버린 후보다. 처음 이 문서는 Phaser 를 가정했다가 고쳤다.
- [변경 11-24] 이전에는 파랑 활주 방향을 4방향(좌/우/좌상/우상)으로 에셋을 산정했다. problem.md에서 5방향(좌·우·좌상·우상·상)으로 확정되어 그에 맞게 바꿨다.
- [변경 11-24] 1-1만 밝은 숲으로 확정됐고 1-2~1-5 테마는 미정이라, 숲 테마를 변형해 공유한다고 가정했다.
- [변경 11-24] 체력은 problem.md의 3칸 공용으로 확정되어 확인 항목에서 뺐다.
- 에셋 개수는 요약일 뿐, 시간 예산이나 제작 방법(직접 제작 / 무료 에셋 / AI 생성)은 정하지 않았다.
