// 게임 2 큰 게임의 일부 (원작: 몬길: 스타다이브의 보스전 태그 반격. 그림과 소리는 원작 것을 쓰지 않는다. 캐릭터는 이 파일 안에서 그린 도트, 보스는 사용자가 만든 골렘 그림(assets/golem.png), 소리는 직접 만든 짧은 소리)
// 좌표 약속: 바닥은 평면이고 보스가 (0, 0). 화면에는 비스듬히 내려다본 2.5D 쿼터뷰로 그린다 (project 함수).
// 수치는 docs/problem.md 의 초기 수치다. 바꾸면 problem.md "바뀐 값" 표에 적는다.

(function () {
  'use strict';

  // ===== 설정 =====
  var W = 720, H = 480;        // 캔버스 크기
  var FLOOR = 200;             // 바닥은 -200 ~ 200 의 정사각형
  var BOSS_R = 30;             // 보스 반지름 (지름 60)
  var START_DIST = BOSS_R * 2 * 3; // 시작 거리: 보스 지름의 3배 (가운데끼리)
  var PLAYER_R = 14;           // 캐릭터 반지름
  var MOVE_SPEED = 170;        // 이동 빠르기 (바닥 단위/초)
  var INTRO_TIME = 3.0;        // 보스 연출 (초)
  var LIMIT = 180;             // 제한 시간 (초)
  var BOSS_HP = 6500;          // 보스 체력 (AI 가 봇 시뮬레이션으로 2분 언저리에 맞춘 값. 해 보고 고친다)
  var ATTACK_RANGE = 60;       // 기본 공격이 닿는 거리 (보스 가장자리에서)
  // 기본 공격은 꾹 누르면 1타 → 2타 → 3타로 이어진다 (2026-11-22 손맛). 3타는 크게. 1초에 넣는 대미지는 전(0.35초마다 10)과 거의 같다
  var COMBO_DMG = [10, 10, 15];
  var COMBO_CD = [0.35, 0.35, 0.5]; // 다음 타까지 (초). 3타 뒤는 숨 고르기
  var COMBO_RESET = 0.6;       // 다음 타를 칠 수 있게 된 뒤 이만큼 쉬면 다시 1타부터
  var CHAR_HP = 7;             // 한 캐릭터는 보스 공격에 7번 맞으면 쓰러진다
  var DODGE_CD = 1.0;          // 회피 다시 쓰기까지 (초). 셋이 함께 쓰는 하나
  var DODGE_DIST = 100;        // 회피로 미끄러지는 거리
  var DODGE_TIME = 0.18;       // 회피 움직임 시간 (초)
  var DODGE_INVULN = 0.3;      // 회피 뒤 맞지 않는 시간 (초)
  var COUNTER_DMG = 30;        // 회피 반격 대미지
  var TAG_CD = 15;             // 태그 쿨타임 (초). 들어온 캐릭터에 걸리고 캐릭터마다 돈다
  var TAG_INVULN = 0.5;        // 태그 때 맞지 않는 시간 (초)
  var TAG_COUNTER_DMG = 50;    // 태그 반격 대미지 (노란 전조에 맞춘 태그. 회피 반격처럼 그 공격 범위 안에 있을 때만. 첫 판 뒤 "거리 무관"에서 바꿈)
  var TAG_ATTACK_DMG = 25;     // 태그 공격 대미지 (반격이 아닌 태그. TAG_RANGE 안에서만 들어간다)
  var TAG_RANGE = 170;         // 태그 공격이 닿는 거리 (보스 가장자리에서). 특수 스킬과 같다. 첫 판 뒤 "거리 무관"에서 바꿈
  var SPECIAL_CD = 8;          // 특수 스킬 다시 쓰기까지 (초). 캐릭터마다 따로 돌고 쉬는 동안에도 줄어든다
  var SPECIAL_RANGE = 170;     // 특수 스킬이 닿는 거리 (보스 가장자리에서)
  var SPECIAL_DMG = 40;
  var ULT_MAX = 100;           // 궁극 게이지 (캐릭터마다 따로)
  var ULT_BASIC = 4;           // 기본 공격을 맞히면 차는 양
  var ULT_SPECIAL = 15;        // 특수 스킬을 맞히면 차는 양
  var ULT_DMG = 120;           // 궁극 스킬 대미지 (거리 무관)
  var GROGGY_NEED = 10;        // 반격이 셋 합쳐 10번이면 그로기 게이지가 찬다
  var GROGGY_ANIM = 2.8;       // 그로기 액션 연출 (초). 기록에는 영향 없음. 2.0 → 2.8 (2026-11-22 고양이·눈 클로즈업을 넣으며)
  // 연출 네 장면이 시작하는 때 (초): 고양이가 날아감 → 보스에 맞아 보라·분홍 폭발 → 지금 캐릭터 눈 클로즈업 → 빛 고리로 구속
  var GROGGY_PHASES = [['cat', 0], ['burst', 0.7], ['eyes', 1.05], ['bind', 2.1]];
  var GROGGY_TIME = 8;         // 무력화 (초). 연출이 끝난 뒤부터 센다
  var GROGGY_MULT = 2;         // 무력화 동안 받는 대미지 배율
  var GROGGY_HIT = 150;        // 그로기 액션이 들어가는 순간의 대미지
  var HITSTOP = 0.6;           // 반격 성공 순간 느려지는 시간 (실제 초). 이 동안 시계는 멈춘다. 첫 판 뒤 0.3 에서 바꿈 (느껴지지 않았다)
  var SLOW_SCALE = 0.3;        // 느려지는 동안 게임 시간은 실제의 30% (슬로우모션). 첫 판 뒤 15% 에서 바꿈
  var ZOOM = 1.2;              // 반격 성공 순간 카메라가 캐릭터 쪽으로 더 확대되는 배율 (카메라가 이미 1.6배라 1.45 → 1.2. 2026-11-22)
  var SAVE_KEY = 'g2-slice-rank'; // 랭킹판 저장 이름 (이 브라우저에만 남는다)
  var RANK_MAX = 5;            // 성공한 판만 클리어타임이 짧은 순으로 5개
  var TEST = /[?&]test\b/.test(window.location.search); // ?test: 그로기 게이지가 찬 채로 시작, 예시 랭킹, 저장 안 함
  var TEST_RANKS = [52.31, 77.08, 98.5, 121.44, 149.9];
  var TELEGRAPH = 0.65;        // 전조가 보이는 시간 (초). 이 동안이 반격 창이다. 첫 판 뒤 0.5 → 0.8 (촉박했다) → 0.65 (걸어서 피해졌다. 2026-11-22)
  var RANGE_SHOW = TELEGRAPH;  // 바닥의 공격 범위가 보이는 시간. 마름모와 함께 전조 내내 (마지막 0.4초만 보이게 했더니 마름모만 보고 반격하게 되어 다시 함께. 2026-11-22)
  var ACTIVE = 0.15;           // 공격 범위가 실제로 번쩍이는 시간 (초). 맞는 판정은 시작 순간 한 번
  var RECOVER = 0.6;           // 공격 뒤 보스가 멈춰 있는 시간 (초)
  var DASH_TIME = 0.25;        // 돌진 때 보스가 직선 끝까지 미끄러지는 시간 (초). 첫 판 뒤 순간이동에서 바꿈
  var BOSS_WAIT = [1.4, 2.2];  // 다음 공격까지 기다리는 시간 (초, 이 사이에서 무작위. 2분 언저리에 맞춘 값)
  var BOSS_SPEED = 70;         // 보스가 플레이어에게 다가가는 빠르기
  var BOSS_KEEP = 110;         // 이 거리보다 멀면 다가온다
  // 패턴 4개: 노란 셋(부채꼴, 둘레 원, 돌진)과 붉은 하나(넓은 원). 붉은 것은 태그 반격이 안 된다
  var PATTERNS = [
    { id: 'fan', color: 'yellow', r: 150, half: Math.PI * 0.28, weight: 30 },   // 앞쪽 부채꼴 (각 100도)
    { id: 'ring', color: 'yellow', r: 100, weight: 25 },                        // 보스 둘레 원 내려찍기
    { id: 'dash', color: 'yellow', len: 230, half: 36, weight: 25 },            // 플레이어 쪽 직선 돌진
    { id: 'burst', color: 'red', r: 175, weight: 20 }                           // 보스 중심 넓은 원 폭발
  ];
  var CHARS = [
    { name: '빨강', color: '#ef5350' },
    { name: '파랑', color: '#42a5f5' },
    { name: '초록', color: '#66bb6a' }
  ];

  // ===== 화면 요소 =====
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var elTitle = document.getElementById('title');
  var elResult = document.getElementById('result');
  var elResultTitle = document.getElementById('result-title');
  var elResultReason = document.getElementById('result-reason');
  var elResultTime = document.getElementById('result-time');
  var elRankWrap = document.getElementById('rank-wrap');
  var elRankTable = document.getElementById('rank-table');
  var elGroggy = document.getElementById('groggy');

  // ===== 캐릭터 도트 그림 (2026-11-22) =====
  // 40 x 64 칸에 모양(타원, 다각형, 선)으로 그린 뒤, 칸마다 그 캐릭터의 색 중 가장 가까운 색으로 맞추고 바깥에 진한 테두리 1칸을 두른다.
  // 오른쪽을 비스듬히(3/4) 보는 모습. 왼쪽을 볼 때는 뒤집어 그린다. 원작 캐릭터를 옮기지 않고 콘셉(용 여자, 얼음 왕녀, 바람 격투가)만 살려 새로 지었다
  var SPR_W = 40, SPR_H = 64;
  var SPRITE_SCALE = 1.25;     // 바닥 단위로 한 칸 크기. 카메라 1.6배에서 화면 2픽셀
  var SPR_OUTLINE = '#1b1424';
  var SKIN = { S: '#f8d6c0', s: '#dca68c', o: SPR_OUTLINE }; // o: 안쪽 경계선 (팔과 몸 사이 등)
  var SPRITE_DEFS = [
    { // 빨강 · 용 여자: 주황빛 붉은 머리, 뒤로 휜 상아색 뿔, 비늘 꼬리, 검붉은 비늘 가슴판, 짧은 망토, 비늘 정강이 갑옷
      pal: { H: '#e0522f', h: '#9a2a1a', l: '#ff8a4a', W: '#f1e6c8', w: '#b9a57f', A: '#8a2232', a: '#561424', G: '#e8b54a', C: '#c42d34', c: '#7e1b22',
        B: '#2b2233', K: '#7a2030', k: '#4a1220', T: '#c9352b', t: '#f2a45e', E: '#f5b52e', e: '#3a1d2e' },
      draw: function (P, pose) {
        if (pose !== 'a3') P.blobs([[15, 41, 3.8], [11, 45, 3.4], [8, 49, 3], [6, 53, 2.6], [7, 57, 2.2], [10, 60, 1.6], [13, 61, 1]], 'T'); // 꼬리
        if (pose !== 'a3') P.blobs([[12, 46, 1.4], [9, 50, 1.2], [7.5, 54, 1]], 't');
        P.poly([[14, 21], [9, 38], [13, 40], [18, 30], [21, 22]], 'C'); P.poly([[12, 30], [9, 38], [13, 40]], 'c'); // 망토
        P.rect(21, 44, 5, 16, 'k'); P.poly([[21, 59], [27, 59], [28, 63], [21, 63]], 'k'); // 먼 다리
        if (pose === 'a1') { P.rect(25, 22, 6, 3, 'a'); P.rect(30, 22, 4, 3, 's'); P.ell(34.5, 23.5, 1.8, 1.8, 's'); P.poly([[35, 21], [39.5, 19.5], [36, 22.5]], 'W'); P.poly([[36, 23], [39.5, 23.5], [36, 24.5]], 'W'); P.poly([[35, 25], [39.5, 27.5], [35.5, 26]], 'W'); } // 먼 팔: 1타 오른손 할퀴기
        else { P.rect(25, 22, 3, 8, 'a'); P.rect(26, 29, 3, 5, 's'); P.ell(28, 35, 2, 2, 's'); } // 먼 팔
        P.poly([[15, 21], [26, 21], [26, 29], [25, 36], [16, 36], [15, 29]], 'A'); P.poly([[15, 21], [19, 21], [18, 36], [16, 36], [15, 29]], 'a');
        P.line(17, 26, 24, 26, 'a', 1); P.line(17, 30, 24, 30, 'a', 1); P.line(16, 22, 25, 22, 'G', 1); P.rect(16, 35, 10, 2, 'G'); // 비늘 줄, 금 테
        P.poly([[15, 37], [26, 37], [26, 43], [21, 44], [20, 41], [19, 44], [14, 43]], 'B'); // 반바지
        P.rect(15, 43, 4, 4, 'S'); P.rect(14, 47, 6, 13, 'K'); P.rect(14, 47, 6, 2, 'G'); P.rect(17, 49, 3, 10, 'k'); P.poly([[13, 59], [21, 59], [23, 63], [13, 63]], 'K'); // 가까운 다리
        if (pose === 'a3') { P.blobs([[22, 41, 3.6], [26, 41, 3.4], [30, 39.5, 3], [33.5, 37, 2.6], [36, 33.5, 2.2], [37.5, 30, 1.6], [38, 27.5, 1]], 'T'); P.blobs([[27, 39.5, 1.3], [31, 37.5, 1.1], [34.5, 35, 1]], 't'); } // 3타 꼬리 휘두르기 (몸 앞으로)
        if (pose === 'a2') { P.rect(11, 22, 4, 5, 'A'); P.poly([[13, 24], [27, 25], [27, 28], [13, 28]], 'A'); P.rect(26, 25, 5, 3, 'K'); P.ell(32, 26.5, 1.8, 1.8, 'S'); P.poly([[33, 24], [37.5, 22], [34, 25.5]], 'W'); P.poly([[33.5, 26], [38, 26.5], [33.5, 27.5]], 'W'); P.poly([[33, 28], [37, 30.5], [33.5, 28.8]], 'W'); P.line(14, 28, 27, 28, 'o', 1); } // 가까운 팔: 2타 왼손 할퀴기 (몸 앞을 가로질러)
        else { P.rect(11, 22, 4, 8, 'A'); P.rect(11, 29, 4, 3, 'S'); P.rect(11, 32, 4, 3, 'K'); P.ell(13, 36.5, 2, 2, 'S'); P.line(15, 23, 15, 34, 'o', 1); } // 가까운 팔 (몸과 사이에 선)
        P.rect(19, 17, 4, 5, 'S'); P.rect(19, 18, 4, 1, 's');
        P.ell(18.5, 10, 8.5, 8.5, 'H'); P.poly([[11, 8], [17, 8], [17, 20], [13, 22], [10, 15]], 'h'); // 뒷머리
        P.poly([[11, 5], [4, 7], [10, 10]], 'H'); P.poly([[11, 12], [5, 16], [11, 15]], 'h'); // 뒤로 뻗친 꽁지
        P.ell(22, 11.5, 6.5, 7, 'S'); P.rect(25, 14, 3, 3, 's');
        P.poly([[14, 4], [29, 4], [29, 9], [27, 7], [25, 10], [23, 7], [20, 10], [17, 9], [15, 11]], 'H'); P.poly([[17, 3], [24, 3], [21, 5]], 'l'); // 앞머리
        P.poly([[17, 5], [14, 2], [10, 1], [7, 2], [11, 3], [14, 7]], 'W'); P.poly([[23, 3], [21, 0.5], [17, 0], [20, 2.5]], 'w'); // 뿔
        P.px(19, 11, 'e'); P.px(20, 11, 'e'); P.px(19, 12, 'E'); P.px(20, 12, 'e'); P.px(25, 11, 'e'); P.px(25, 12, 'E'); P.px(24, 15, 's'); // 눈, 입
      }
    },
    { // 파랑 · 얼음 왕녀: 하늘빛 올림머리, 얼음 결정 왕관과 지팡이, 흰 털 깃 망토, 발까지 오는 하늘색 드레스, 얼음 어깨 장식
      pal: { H: '#bfe4f6', h: '#79acd0', l: '#eefaff', X: '#7fe6ff', x: '#e2fbff', D: '#6cb2e4', d: '#3c7db4', L: '#a9d9f6', F: '#f5f7fb', f: '#c3cddc',
        R: '#dfe5ee', r: '#8b97aa', E: '#36b3ee', e: '#25304a' },
      draw: function (P, pose) {
        if (pose === 'a1' || pose === 'a2') { var sy = pose === 'a1' ? 0 : 5; P.line(21, 35 + sy, 36, 21 + sy, 'r', 2); P.line(21, 34.5 + sy, 36, 20.5 + sy, 'R', 1); P.poly([[37, 15 + sy], [40, 19.5 + sy], [36.5, 23 + sy], [33.5, 18.5 + sy]], 'X'); P.poly([[37, 16.5 + sy], [38.5, 19.5 + sy], [36.5, 21 + sy]], 'x'); } // 1·2타: 지팡이를 앞으로 겨눔
        else if (pose === 'a3') { P.line(23, 17, 35, 45, 'r', 2); P.line(22.5, 17, 34.5, 45, 'R', 1); P.poly([[35, 43], [39, 47], [36, 52], [32, 47.5]], 'X'); P.poly([[35.5, 45], [37, 47.5], [35.5, 49.5]], 'x'); } // 3타: 지팡이로 내려찍음
        else { P.line(32, 12, 32, 63, 'r', 2); P.line(31.5, 12, 31.5, 63, 'R', 1); P.poly([[32, 2], [35.5, 7], [32, 13], [28.5, 7]], 'X'); P.poly([[32, 3.5], [33.5, 7], [32, 9]], 'x'); } // 지팡이
        P.poly([[15, 33], [26, 33], [33, 62], [7, 62]], 'D'); P.poly([[22, 33], [26, 33], [33, 62], [24, 62]], 'd'); P.poly([[10, 50], [13, 62], [7, 62]], 'L'); P.rect(7, 61, 26, 2, 'F'); // 드레스 치마, 털 밑단
        if (pose === 'a1' || pose === 'a2') { var ay = pose === 'a1' ? 0 : 5; P.rect(25, 22, 3, 4, 'd'); P.poly([[26, 24], [29, 25 + ay], [29, 28 + ay], [26, 27]], 'd'); P.ell(30, 27 + ay, 2, 2, 'S'); } // 먼 팔: 지팡이를 앞으로
        else if (pose === 'a3') { P.rect(25, 22, 3, 5, 'd'); P.poly([[26, 25], [29, 30], [27, 32], [25, 27]], 'd'); P.ell(29, 31.5, 2, 2, 'S'); } // 먼 팔: 내려찍기
        else { P.rect(25, 22, 3, 7, 'd'); P.rect(27, 28, 3, 4, 'S'); P.ell(30.5, 31, 2, 2, 'S'); } // 먼 팔 (지팡이를 쥠)
        P.poly([[15, 21], [26, 21], [25, 33], [16, 33]], 'D'); P.poly([[22, 21], [26, 21], [25, 33], [22, 33]], 'd'); P.line(20, 23, 20, 32, 'L', 1); // 몸통
        P.rect(12, 22, 4, 9, 'L'); P.rect(13, 30, 3, 4, 'S'); P.ell(15, 35, 2, 2, 'S'); // 가까운 팔
        P.ell(20, 22, 8.5, 3.5, 'F'); P.ell(21, 23.5, 7, 1.6, 'f'); // 털 깃
        P.poly([[10, 22], [13, 17], [15, 22]], 'X'); P.poly([[25, 21], [28, 17], [29, 22]], 'x'); // 얼음 어깨 장식
        P.rect(19, 17, 4, 4, 'S');
        P.ell(19, 10, 8, 8, 'H'); P.ell(11, 9, 4, 4, 'H'); P.ell(10.5, 10, 2.5, 2.5, 'h'); P.poly([[12, 13], [17, 12], [17, 18], [13, 17]], 'h'); // 뒷머리와 올림머리
        P.ell(22, 11.5, 6.5, 7, 'S'); P.rect(25, 14, 3, 3, 's');
        P.poly([[14, 4], [29, 4], [29, 8], [26, 7], [23, 9], [20, 7], [17, 9], [15, 10]], 'H'); P.poly([[18, 4], [25, 4], [22, 6]], 'l'); P.poly([[27, 8], [29, 8], [28, 16]], 'H'); // 앞머리, 옆 머리 한 가닥
        P.poly([[15, 4.5], [16.5, 0.5], [18.5, 3.5], [21, 0], [23.5, 3.5], [25.5, 0.5], [27, 4.5]], 'X'); P.px(21, 1, 'x'); // 얼음 왕관
        P.px(19, 11, 'e'); P.px(20, 11, 'e'); P.px(19, 12, 'E'); P.px(20, 12, 'e'); P.px(25, 11, 'e'); P.px(25, 12, 'E'); P.px(24, 15, 's');
      }
    },
    { // 초록 · 바람 격투가: 짙은 녹색 짧은 머리와 날리는 머리띠 끈, 팔에 감은 붕대, 몸을 감아 날리는 연두색 바람 띠, 민소매 도복, 허리띠, 발목을 감싼 헐렁한 바지
      pal: { H: '#2f7f50', h: '#1b4d31', l: '#53b47a', G: '#3fa262', g: '#25703f', M: '#b9f6d0', m: '#73d69c', P: '#ece5cf', p: '#b8b096',
        V: '#f4f1e8', v: '#c9c3b3', O: '#6b4a2e', E: '#2fbf6a', e: '#20301f' },
      draw: function (P, pose) {
        P.path([[27, 21], [19, 17], [10, 19], [4, 26], [6, 33], [2, 40], [3, 46]], 'm', 2.4); P.path([[26, 21], [19, 17.5], [10, 19.5], [4.5, 26]], 'M', 1.2); // 바람 띠
        P.path([[13, 6], [6, 4], [1, 7]], 'v', 1.6); P.path([[13, 7], [5, 9], [2, 13]], 'V', 1.4); // 머리띠 끈
        P.poly([[21, 42], [27, 42], [28, 57], [22, 57]], 'p'); P.rect(22, 56, 6, 4, 'v'); P.poly([[22, 60], [28, 60], [29, 63], [22, 63]], 'O'); // 먼 다리
        if (pose === 'a2') { P.rect(25, 22, 6, 3, 'S'); P.rect(30, 22, 5, 3, 'V'); P.ell(36.5, 23.5, 2.5, 2.5, 'S'); } // 먼 팔: 2타 스트레이트
        else { P.rect(25, 22, 3, 5, 'S'); P.poly([[27, 26], [30, 20], [32, 21], [29, 27]], 'V'); P.ell(31, 19.5, 2.2, 2.2, 'S'); } // 먼 팔 (주먹을 올림)
        P.poly([[15, 21], [26, 21], [26, 36], [15, 36]], 'G'); P.poly([[22, 21], [26, 21], [26, 36], [22, 36]], 'g'); P.poly([[18, 21], [23, 21], [20.5, 25]], 'S'); // 도복
        P.poly([[15, 36], [26, 36], [27, 42], [14, 42]], 'G'); P.poly([[22, 36], [26, 36], [27, 42], [22, 42]], 'g');
        P.rect(14, 34, 13, 3, 'M'); P.poly([[14, 35], [6, 40], [8, 42], [14, 37]], 'm'); // 허리띠와 날리는 끝
        if (pose === 'a3') { P.poly([[15, 40], [22, 37], [35, 33], [35, 38], [22, 43], [16, 45]], 'P'); P.line(20, 41, 33, 36, 'p', 1); P.rect(33, 33, 3, 5, 'V'); P.poly([[36, 32.5], [39.5, 33.5], [39.5, 38], [36, 38]], 'O'); } // 가까운 다리: 3타 돌려차기 (옆으로 뻗음)
        else { P.poly([[14, 41], [21, 41], [21, 57], [14, 57]], 'P'); P.line(17, 44, 16, 55, 'p', 1); P.rect(14, 55, 7, 4, 'V'); P.poly([[13, 60], [21, 60], [23, 63], [13, 63]], 'O'); } // 가까운 다리
        if (pose === 'a1') { P.rect(12, 22, 4, 5, 'S'); P.rect(15, 24, 9, 3, 'S'); P.rect(23, 24, 7, 3, 'V'); P.ell(31.5, 25.5, 2.5, 2.5, 'S'); P.line(15, 27, 29, 27, 'o', 1); } // 가까운 팔: 1타 잽
        else { P.rect(12, 22, 4, 6, 'S'); P.poly([[13, 27], [17, 25], [20, 28], [15, 30]], 'V'); P.ell(20.5, 27.5, 2.5, 2.5, 'S'); } // 가까운 팔 (가슴 앞 주먹)
        P.rect(19, 17, 4, 4, 'S');
        P.ell(19.5, 9.5, 8, 8, 'H'); P.poly([[12, 4], [6, 2], [11, 8]], 'H'); P.poly([[12, 10], [6, 12], [12, 14]], 'h'); P.poly([[13, 14], [17, 13], [17, 18], [14, 18]], 'h'); // 짧은 뻗친 머리
        P.ell(22, 11.5, 6.5, 7, 'S'); P.rect(25, 14, 3, 3, 's');
        P.poly([[14, 3], [18, 0.5], [21, 3], [24, 0.5], [27, 3], [29, 6], [27, 9], [24, 7], [21, 10], [18, 8], [15, 10]], 'H'); P.poly([[19, 2], [23, 2], [21, 4]], 'l'); // 앞머리
        P.rect(14, 5, 15, 2, 'V'); // 머리띠
        P.px(19, 11, 'e'); P.px(20, 11, 'e'); P.px(19, 12, 'E'); P.px(20, 12, 'e'); P.px(25, 11, 'e'); P.px(25, 12, 'E'); P.px(24, 15, 's');
      }
    }
  ];
  function hexRgb(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function buildSprite(def, pose) {
    var SW = def.w || SPR_W, SH = def.h || SPR_H; // 캐릭터는 40 x 64, 고양이·눈 그림은 따로 크기를 준다
    var cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    var x = cv.getContext && cv.getContext('2d');
    if (!x || typeof x.getImageData !== 'function') return null;
    var pal = {}, k;
    for (k in SKIN) pal[k] = SKIN[k];
    for (k in def.pal) pal[k] = def.pal[k];
    var P = {
      ell: function (cx, cy, rx, ry, c) { x.fillStyle = pal[c]; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); },
      poly: function (pts, c) { x.fillStyle = pal[c]; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fill(); },
      rect: function (rx, ry, w, h, c) { x.fillStyle = pal[c]; x.fillRect(rx, ry, w, h); },
      px: function (px, py, c) { x.fillStyle = pal[c]; x.fillRect(px, py, 1, 1); },
      line: function (x0, y0, x1, y1, c, w) { x.strokeStyle = pal[c]; x.lineWidth = w || 1; x.beginPath(); x.moveTo(x0 + 0.5, y0 + 0.5); x.lineTo(x1 + 0.5, y1 + 0.5); x.stroke(); },
      path: function (pts, c, w) { x.strokeStyle = pal[c]; x.lineWidth = w || 1; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.stroke(); },
      blobs: function (list, c) { for (var i = 0; i < list.length; i++) P.ell(list[i][0], list[i][1], list[i][2], list[i][2], c); }
    };
    def.draw(P, pose || 'idle');
    // 칸마다 가장 가까운 색으로 맞추고 (반쯤 비친 칸은 비우거나 채운다), 바깥 테두리 1칸
    var id = x.getImageData(0, 0, SW, SH);
    if (!id || !id.data) return null; // 브라우저 없이 검사할 때
    var d = id.data;
    var cols = []; for (k in pal) cols.push(hexRgb(pal[k]));
    var solid = new Uint8Array(SW * SH);
    for (var i = 0; i < SW * SH; i++) {
      var o = i * 4;
      if (d[o + 3] < 110) { d[o + 3] = 0; continue; }
      var best = 0, bd = 1e9;
      for (var j = 0; j < cols.length; j++) { var dr = d[o] - cols[j][0], dg = d[o + 1] - cols[j][1], db = d[o + 2] - cols[j][2], dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; best = j; } }
      d[o] = cols[best][0]; d[o + 1] = cols[best][1]; d[o + 2] = cols[best][2]; d[o + 3] = 255; solid[i] = 1;
    }
    var oc = hexRgb(SPR_OUTLINE);
    for (var yy = 0; yy < SH; yy++) for (var xx = 0; xx < SW; xx++) {
      var n = yy * SW + xx;
      if (solid[n]) continue;
      if ((xx > 0 && solid[n - 1]) || (xx < SW - 1 && solid[n + 1]) || (yy > 0 && solid[n - SW]) || (yy < SH - 1 && solid[n + SW])) {
        d[n * 4] = oc[0]; d[n * 4 + 1] = oc[1]; d[n * 4 + 2] = oc[2]; d[n * 4 + 3] = 255;
      }
    }
    x.putImageData(id, 0, 0);
    // 왼쪽을 보는 그림 (뒤집기)과 맞았을 때 붉은 그림
    var flip = document.createElement('canvas'); flip.width = SW; flip.height = SH;
    var fx = flip.getContext('2d'); fx.translate(SW, 0); fx.scale(-1, 1); fx.drawImage(cv, 0, 0);
    var red = document.createElement('canvas'); red.width = SW; red.height = SH;
    var rx2 = red.getContext('2d'); rx2.drawImage(cv, 0, 0); rx2.globalCompositeOperation = 'source-atop'; rx2.fillStyle = 'rgba(255,40,60,0.65)'; rx2.fillRect(0, 0, SW, SH);
    var redFlip = document.createElement('canvas'); redFlip.width = SW; redFlip.height = SH;
    var rf = redFlip.getContext('2d'); rf.translate(SW, 0); rf.scale(-1, 1); rf.drawImage(red, 0, 0);
    return { right: cv, left: flip, redRight: red, redLeft: redFlip };
  }
  // 캐릭터마다 자세 넷: 서 있기, 기본 공격 1타·2타·3타 (2026-11-22 "캐릭터에 맞는 때리는 모션")
  var POSES = ['idle', 'a1', 'a2', 'a3'];
  var SPRITES = SPRITE_DEFS.map(function (d) {
    var o = {};
    for (var i = 0; i < POSES.length; i++) { o[POSES[i]] = buildSprite(d, POSES[i]); if (!o[POSES[i]]) return null; }
    return o;
  });

  // ===== 그로기 진입 연출 그림 (2026-11-22, 사용자가 준 원작 화면의 장면 순서만 참고하고 그림은 새로 그림) =====
  // 고양이 (16 x 12): 몸을 만 주황 고양이. 보스에게 던져진다
  var CAT_DEF = { w: 16, h: 12,
    pal: { O: '#f29b4b', q: '#c06a2a', W: '#fff3e0', P: '#f48fb1' },
    draw: function (P) {
      P.path([[3.5, 7], [1.5, 4.5], [2.5, 2]], 'O', 1.8);
      P.ell(8, 7, 6, 4.2, 'O'); P.line(5, 4, 6, 7, 'q', 1); P.line(8, 3.5, 8.5, 6.5, 'q', 1); P.ell(8.5, 8.6, 3.5, 1.8, 'W');
      P.ell(12, 5, 3.6, 3.2, 'O'); P.poly([[9.5, 3], [10.5, 0], [12, 2.5]], 'O'); P.poly([[12.5, 2.5], [14.5, 0.5], [15, 3.5]], 'O');
      P.px(11, 5, 'o'); P.px(13, 5, 'o'); P.px(12, 6, 'P');
      P.ell(6, 10.5, 1.3, 1, 'W'); P.ell(10, 10.5, 1.3, 1, 'W');
    }
  };
  // 눈 클로즈업 (64 x 20): 지금 캐릭터의 앞머리와 두 눈. 빨강은 세로로 찢어진 용의 눈동자, 초록은 머리띠
  function eyeDef(hair, hairDark, iris, irisDark, slit, band) {
    return { w: 64, h: 20,
      pal: { H: hair, h: hairDark, E: iris, e: irisDark, W: '#fdfbf7', L: '#ffffff', V: '#f4f1e8' },
      draw: function (P) {
        P.rect(0, 0, 64, 20, 'S'); P.rect(0, 6, 64, 2, 's');
        P.poly([[0, 0], [64, 0], [64, 5], [58, 8], [53, 4], [47, 9], [41, 4], [35, 7], [29, 3], [23, 8], [17, 4], [11, 9], [5, 5], [0, 7]], 'H');
        P.line(14, 1, 11, 8, 'h', 1); P.line(33, 1, 35, 6, 'h', 1); P.line(50, 1, 47, 8, 'h', 1);
        if (band) P.rect(0, 0, 64, 2, 'V');
        [[18, 1], [46, -1]].forEach(function (ey) {
          var cx = ey[0], m = ey[1]; // m: 왼눈 1, 오른눈 -1. 두 눈을 거울처럼 그리고 속눈썹 끝을 바깥쪽으로 뺀다
          P.ell(cx, 12.5, 7, 3.2, 'W');
          P.ell(cx + 0.5, 12.6, 3, 3.4, 'E');
          if (slit) P.rect(cx, 10, 1, 5, 'e'); else P.ell(cx + 0.5, 12.9, 1.4, 1.6, 'e');
          P.px(cx - 1, 11, 'L'); P.px(cx + 2, 13, 'L');
          P.path([[cx - 8 * m, 11], [cx - 5 * m, 9], [cx, 8.5], [cx + 5 * m, 9], [cx + 8 * m, 10.5]], 'o', 2);
          P.path([[cx - 8 * m, 10.8], [cx - 10 * m, 9.2]], 'o', 1.5);
          P.path([[cx - 6, 15.5], [cx, 16.3], [cx + 6, 15.5]], 's', 1);
        });
      }
    };
  }
  var EYE_DEFS = [
    eyeDef('#e0522f', '#9a2a1a', '#f5b52e', '#3a1d2e', true, false),   // 빨강 · 용 여자
    eyeDef('#bfe4f6', '#79acd0', '#36b3ee', '#25304a', false, false),  // 파랑 · 얼음 왕녀
    eyeDef('#2f7f50', '#1b4d31', '#2fbf6a', '#20301f', false, true)    // 초록 · 바람 격투가
  ];
  var CAT_IMG = buildSprite(CAT_DEF, 'idle');
  var EYE_IMGS = EYE_DEFS.map(function (d) {
    var s = buildSprite(d, 'idle');
    return s ? { img: s.right, red: tinted(s.right, 'rgba(255,40,80,0.9)'), cyan: tinted(s.right, 'rgba(40,230,255,0.9)') } : null;
  });

  // ===== 보스 그림 (2026-11-22): 사용자가 만든 바위 골렘 도트 그림 (assets/golem.png, 347 x 320 으로 줄임) =====
  // 맞았을 때 하얗게, 무력화 때 보랏빛으로 물든 그림을 미리 만든다. 그림을 못 읽으면 (브라우저 없이 검사할 때 등) 예전 기둥
  var BOSS_ANCHOR_X = 0.45;    // 그림 가로에서 발 가운데 자리
  var BOSS_IMG = null;
  function tinted(img, color) {
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  }
  if (typeof Image !== 'undefined') {
    var golem = new Image();
    golem.onload = function () {
      BOSS_IMG = { img: golem, w: golem.width, h: golem.height, white: tinted(golem, 'rgba(255,255,255,0.75)'), stun: tinted(golem, 'rgba(110,60,200,0.45)') };
    };
    golem.src = 'assets/golem.png';
  }

  // ===== 2.5D 투영: 바닥 좌표 (x, y, 높이 z) → 화면 좌표 =====
  var OX = W / 2, OY = 236;
  var COS = 0.866, SIN = 0.42; // 0.5 → 0.42: 바닥을 덜 내려다본다 (2026-11-22 "탑다운 느낌"을 줄이려고)
  // 카메라: 캐릭터와 보스의 가운데를 따라가며 1.6배로 당겨 본다 (2026-11-22). 1.6배보다 당기면 넓은 원(반지름 175)이 화면 가로를 넘는다
  var CAM_ZOOM = 1.6;
  var CAM_Y = 335;             // 따라가는 점이 놓이는 화면 높이 (위아래 화면 표시를 피해서)
  var BOSS_H = 112;            // 보스 그림 높이 (그림만. 캐릭터 그림이 커져서 80 → 100, 골렘 그림으로 112)
  function project(x, y, z) {
    return { x: OX + (x - y) * COS, y: OY + (x + y) * SIN - (z || 0) };
  }
  // 화면 방향키 → 바닥 방향 (위 키를 누르면 화면 위로 가게)
  var SCREEN_UP = { x: -0.7071, y: -0.7071 };
  var SCREEN_RIGHT = { x: 0.7071, y: -0.7071 };

  // ===== 상태 =====
  var state = 'title';   // title, intro, fight, result
  var keys = {};
  var game = null;
  var lastTs = 0;

  function newGame() {
    var p = { x: START_DIST * 0.7071, y: START_DIST * 0.7071 }; // 보스에서 지름 3배, 화면 아래쪽
    return {
      stateT: 0,          // 지금 상태에 들어온 뒤 흐른 시간
      clock: 0,           // 싸운 시간 (제한 시간과 클리어타임. 연출 동안은 멈춤)
      player: p,
      facing: { x: -0.7071, y: -0.7071 },
      cur: 0,             // 지금 나와 있는 캐릭터 번호
      chars: [
        { hp: CHAR_HP, tagCd: 0, specialCd: 0, ult: 0 },
        { hp: CHAR_HP, tagCd: 0, specialCd: 0, ult: 0 },
        { hp: CHAR_HP, tagCd: 0, specialCd: 0, ult: 0 }
      ],
      ultCount: [0, 0, 0], // 캐릭터마다 궁극 스킬을 쓴 횟수 (결과창에 보여 playtest.md 에 적게)
      attackCd: 0,
      combo: 0,           // 다음에 나갈 기본 공격 (0 = 1타)
      comboIdle: 0,       // 다음 타를 칠 수 있게 된 뒤 쉰 시간
      swing: null,        // 기본 공격 몸짓 { t, i, dir } (내딛기)
      faceLeft: false,    // 캐릭터 그림이 화면 왼쪽을 보는지
      shake: 0, shakeAmp: 0, // 화면 흔들림 남은 시간과 세기 (그림만)
      cam: { x: p.x / 2, y: p.y / 2 }, // 카메라가 보는 바닥 점 (캐릭터와 보스의 가운데를 따라간다)
      dodgeCd: 0,
      dodge: null,        // 회피 중이면 { dir, t }
      invuln: 0,          // 맞지 않는 시간
      counters: TEST ? GROGGY_NEED : 0, // 반격 성공 횟수 (셋 합쳐). 그로기 게이지. ?test 는 찬 채로 시작
      groggy: 0,          // 무력화 남은 시간
      groggyFrom: null,   // 그로기 액션 연출의 출발점 (플레이어 자리)
      gPhase: null,       // 그로기 연출의 지금 장면 (바뀔 때 소리를 낸다)
      hurt: 0,            // 맞은 뒤 붉게 보이는 시간
      slow: 0,            // 반격 성공 뒤 느려지는 남은 시간 (실제 초)
      flash: 0,           // 화면 번쩍임 남은 시간
      zoom: 1,            // 카메라 배율
      zoomAt: null,       // 확대 중심 (바닥 좌표)
      boss: { x: 0, y: 0, hp: BOSS_HP, flash: 0, phase: 'wait', t: 1.5, attack: null, last: -1, dash: null }, // dash: 미끄러지는 중이면 { fx, fy, tx, ty }
      hits: [],           // 맞은 자리 숫자 연출
      fx: [],             // 바닥 연출 (특수 스킬 고리, 궁극 고리)
      result: null
    };
  }

  // ===== 소리 (직접 만든 짧은 소리) =====
  var audio = null;
  function tone(freq, dur, type, vol, slide) {
    try {
      if (!audio) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = new AC();
      }
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, audio.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, audio.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* 소리가 안 나도 게임은 계속 */ }
  }

  // ===== 도움 함수 =====
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function fmtTime(t) {
    var m = Math.floor(t / 60), s = t - m * 60;
    return (m > 0 ? m + ':' : '') + (m > 0 && s < 10 ? '0' : '') + s.toFixed(2);
  }

  // ===== 보스에게 대미지 =====
  function damageBoss(amount, label) {
    var g = game;
    if (g.boss.hp <= 0) return;
    if (g.groggy > 0) amount *= GROGGY_MULT; // 무력화 동안 2배
    g.boss.hp = Math.max(0, g.boss.hp - amount);
    g.boss.flash = 0.12;
    g.hits.push({ x: g.boss.x, y: g.boss.y, z: 70, t: 0.6, text: label || String(amount) });
    if (g.boss.hp <= 0) finish(true, '');
  }

  // ===== 끝내기 =====
  function finish(win, reason) {
    var g = game;
    g.result = { win: win, time: g.clock, reason: reason };
    state = 'result';
    elResultTitle.textContent = win ? '격파 성공' : '격파 실패';
    elResultTitle.className = win ? 'win' : 'lose';
    var ults = '궁극 스킬 쓴 횟수: ' + CHARS.map(function (c, i) { return c.name + ' ' + g.ultCount[i]; }).join(' · ');
    elResultReason.textContent = (reason ? reason + ' · ' : '') + ults;
    elResultTime.textContent = fmtTime(g.clock);
    if (win) {
      // 성공하면 늘 랭킹판을 보여 주고, 5위 안이면 그 줄이 빛난다. ?test 판은 저장하지 않는다
      var list = loadRank();
      var me = { t: Math.round(g.clock * 100) / 100, d: new Date().toISOString().slice(0, 10) };
      list.push(me);
      list.sort(function (a, b) { return a.t - b.t; });
      var myIdx = list.indexOf(me);
      list = list.slice(0, RANK_MAX);
      if (!TEST) saveRank(list);
      renderRank(list, myIdx < RANK_MAX ? myIdx : -1, me);
      elRankWrap.classList.remove('hidden');
    } else {
      elRankWrap.classList.add('hidden');
    }
    elResult.classList.remove('hidden');
    if (win) tone(660, 0.5, 'triangle', 0.12, 990); else tone(220, 0.6, 'sawtooth', 0.1, 110);
  }

  // ===== 랭킹판 저장 (localStorage: 이 기기, 이 브라우저에 남는다. 닫았다 열어도 남는다) =====
  function loadRank() {
    if (TEST) return TEST_RANKS.map(function (t) { return { t: t, d: '예시' }; });
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveRank(list) {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(list)); } catch (e) { /* 저장 못 해도 계속 */ }
  }
  function renderRank(list, myIdx, me) {
    elRankTable.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var tr = document.createElement('tr');
      if (i === myIdx) tr.className = 'me';
      tr.innerHTML = '<td>' + (i + 1) + '위</td><td>' + fmtTime(list[i].t) + '</td><td>' + list[i].d + '</td>';
      elRankTable.appendChild(tr);
    }
    if (myIdx < 0) {
      var tr2 = document.createElement('tr');
      tr2.innerHTML = '<td colspan="3" class="small">이번 판 ' + fmtTime(me.t) + ' 은 5위 안에 들지 못했다</td>';
      elRankTable.appendChild(tr2);
    }
  }

  // ===== 시작 =====
  function startGame() {
    game = newGame();
    state = 'intro';
    elTitle.classList.add('hidden');
    elResult.classList.add('hidden');
    elGroggy.classList.add('hidden');
    tone(110, 1.2, 'sawtooth', 0.1, 55);
  }

  // ===== 입력 =====
  function onKeyDown(e) {
    var k = e.key;
    if (k === ' ' || k.indexOf('Arrow') === 0) e.preventDefault();
    if (e.repeat) return;
    keys[k] = true;
    if (k === 'Enter') {
      if (state === 'title' || state === 'result') startGame();
      return;
    }
    if (k === 'f' || k === 'F' || k === 'ㄹ') { if (state === 'groggyWait') doGroggy(); return; }
    if (state !== 'fight') return;
    if (k === 'a' || k === 'A' || k === 'ㅁ') doAttack();
    if (k === 'Shift') doDodge();
    if (k === ' ') doTag();
    if (k === 's' || k === 'S' || k === 'ㄴ') doSpecial();
    if (k === 'd' || k === 'D' || k === 'ㅇ') doUlt();
  }
  function onKeyUp(e) {
    keys[e.key] = false;
    // A 는 Shift 를 누른 채면 'A', 한글 자판이면 'ㅁ' 로 들어온다. 누를 때와 뗄 때 글자가 달라도 멈추게 셋을 함께 뗀다 (2026-11-22 reviewer: Shift 를 먼저 떼면 공격이 안 멈췄다)
    if (e.key === 'a' || e.key === 'A' || e.key === 'ㅁ') { keys.a = false; keys.A = false; keys['ㅁ'] = false; }
  }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  document.getElementById('groggy-btn').addEventListener('click', function () { if (state === 'groggyWait') doGroggy(); });

  // ===== 기본 공격 =====
  function doAttack() {
    var g = game;
    if (g.attackCd > 0) return;
    var i = g.combo;
    g.attackCd = COMBO_CD[i];
    g.combo = (i + 1) % 3;
    g.comboIdle = 0;
    var d = dist(g.player, g.boss) || 1;
    var dir = { x: (g.boss.x - g.player.x) / d, y: (g.boss.y - g.player.y) / d };
    var sd = i === 2 ? 0.26 : 0.2;             // 때리는 자세를 보이는 시간 (3타는 길게)
    g.swing = { t: sd, d: sd, i: i, dir: dir };
    var hit = d <= BOSS_R + PLAYER_R + ATTACK_RANGE;
    var fd = i === 2 ? 0.3 : 0.22;             // 이펙트 시간. 빗나가면 앞쪽 허공에 그린다
    g.fx.push({ kind: 'atk', ch: g.cur, i: i, x: g.player.x, y: g.player.y, tx: hit ? g.boss.x : g.player.x + dir.x * 50, ty: hit ? g.boss.y : g.player.y + dir.y * 50,
      ang: Math.atan2(dir.y, dir.x), t: fd, d: fd });
    if (hit) {
      damageBoss(COMBO_DMG[i]);
      gainUlt(ULT_BASIC);
      g.shake = i === 2 ? 0.2 : 0.08; g.shakeAmp = i === 2 ? 6 : 2.5;
      tone(i === 2 ? 330 : 520, i === 2 ? 0.12 : 0.06, 'square', i === 2 ? 0.08 : 0.05, i === 2 ? 160 : 0);
    } else {
      tone(200, 0.05, 'square', 0.03);
    }
  }

  // ===== 특수 스킬과 궁극 스킬 =====
  function gainUlt(amount) {
    var c = game.chars[game.cur];
    c.ult = Math.min(ULT_MAX, c.ult + amount);
  }
  function doSpecial() {
    var g = game, c = g.chars[g.cur];
    if (c.specialCd > 0) { tone(180, 0.06, 'square', 0.03); return; }
    c.specialCd = SPECIAL_CD;
    g.fx.push({ kind: 'special', x: g.player.x, y: g.player.y, t: 0.35, color: CHARS[g.cur].color });
    if (dist(g.player, g.boss) <= BOSS_R + SPECIAL_RANGE) {
      damageBoss(SPECIAL_DMG, '특수 ' + SPECIAL_DMG);
      gainUlt(ULT_SPECIAL);
      tone(380, 0.18, 'sawtooth', 0.08, 760);
    } else {
      tone(300, 0.12, 'sawtooth', 0.04, 150);
    }
  }
  function doUlt() {
    var g = game, c = g.chars[g.cur];
    if (c.ult < ULT_MAX) { tone(180, 0.06, 'square', 0.03); return; }
    c.ult = 0;
    g.ultCount[g.cur] += 1;
    g.fx.push({ kind: 'ult', x: g.boss.x, y: g.boss.y, t: 0.6, color: CHARS[g.cur].color });
    damageBoss(ULT_DMG, '궁극 ' + ULT_DMG);
    tone(200, 0.5, 'sawtooth', 0.12, 900);
  }

  // ===== 회피와 회피 반격 =====
  function doDodge() {
    var g = game;
    if (g.dodgeCd > 0) return;
    g.dodgeCd = DODGE_CD;
    var m = moveDir();
    if (!m) {
      // 키를 안 누르고 있으면 보스에서 멀어지는 쪽으로
      var d = dist(g.player, g.boss) || 1;
      m = { x: (g.player.x - g.boss.x) / d, y: (g.player.y - g.boss.y) / d };
    }
    g.dodge = { dir: m, t: DODGE_TIME };
    g.invuln = Math.max(g.invuln, DODGE_INVULN);
    var b = g.boss;
    // 전조 0.65초 안에, 그 공격 범위 안에서 회피하면 회피 반격 (노란색도 붉은색도)
    if (b.phase === 'telegraph' && b.attack && !b.attack.countered && inAttack(b.attack, g.player.x, g.player.y)) {
      b.attack.countered = true;
      g.counters += 1;
      damageBoss(COUNTER_DMG, '회피 반격!');
      onCounter('dodge');
    } else {
      tone(700, 0.05, 'sine', 0.04, 1200);
    }
  }
  // ===== 태그 =====
  // 다음 순서 캐릭터가 나온다. 다음 순서가 쿨타임이면 그다음, 둘 다 쿨타임이거나 혼자 남았으면 안 된다. 쓰러진 캐릭터는 건너뛴다
  function tagTarget() {
    var g = game;
    for (var k = 1; k <= 2; k++) {
      var i = (g.cur + k) % 3;
      if (g.chars[i].hp > 0 && g.chars[i].tagCd <= 0) return i;
    }
    return -1;
  }
  function doTag() {
    var g = game;
    var next = tagTarget();
    if (next < 0) { tone(180, 0.08, 'square', 0.04); return; }
    g.cur = next;
    g.chars[next].tagCd = TAG_CD;
    g.invuln = Math.max(g.invuln, TAG_INVULN);
    var b = g.boss;
    var a = b.attack;
    if (b.phase === 'telegraph' && a && !a.countered && a.p.color === 'yellow' && inAttack(a, g.player.x, g.player.y)) {
      // 태그 반격: 노란 전조 0.65초 안에, 그 공격 범위 안에서만 (회피 반격과 같은 조건). 셋의 태그 쿨타임이 모두 초기화된다
      a.countered = true;
      g.counters += 1;
      for (var i = 0; i < 3; i++) g.chars[i].tagCd = 0;
      damageBoss(TAG_COUNTER_DMG, '태그 반격!');
      onCounter('tag');
    } else if (dist(g.player, g.boss) <= BOSS_R + TAG_RANGE) {
      // 태그 공격: 들어온 캐릭터가 보스를 한 번 친다 (보스 가장자리에서 170 안)
      damageBoss(TAG_ATTACK_DMG, '태그 공격');
      tone(440, 0.1, 'triangle', 0.07, 660);
    } else {
      // 멀면 캐릭터만 바뀐다
      g.hits.push({ x: g.player.x, y: g.player.y, z: 50, t: 0.6, text: '너무 멀다' });
      tone(300, 0.1, 'triangle', 0.04, 200);
    }
  }

  // 반격 성공 순간: 0.6초 슬로우모션 (게임 시간 30%), 화면 번쩍임, 소리, 캐릭터 쪽으로 카메라 확대 (도형 판의 클로즈업). 확대는 느려지는 동안 유지된다
  function onCounter(kind) {
    var g = game;
    g.slow = HITSTOP;
    g.flash = 0.25;
    g.zoom = ZOOM;
    g.zoomAt = { x: g.player.x, y: g.player.y };
    tone(kind === 'tag' ? 1400 : 1200, 0.14, 'square', 0.09, 2000);
    tone(330, 0.25, 'triangle', 0.06);
    checkGroggy();
  }

  // ===== 그로기 =====
  // 게이지가 다 차면 판이 멈추고 버튼이 생긴다. 누를 때까지 멈춰 있다 (시계도 멈춤)
  function checkGroggy() {
    var g = game;
    if (state !== 'fight' || g.counters < GROGGY_NEED || g.groggy > 0) return;
    state = 'groggyWait';
    g.stateT = 0;
    g.boss.attack = null; g.boss.dash = null; g.boss.phase = 'wait'; g.boss.t = 1.0;
    elGroggy.classList.remove('hidden');
    tone(880, 0.4, 'triangle', 0.1, 1320);
  }
  function doGroggy() {
    var g = game;
    state = 'groggyAnim';
    g.stateT = 0;
    g.groggyFrom = { x: g.player.x, y: g.player.y };
    g.gPhase = 'cat';
    elGroggy.classList.add('hidden');
    tone(500, 0.3, 'sine', 0.08, 1000);
  }
  function endGroggyAnim() {
    var g = game;
    state = 'fight';
    g.stateT = 0;
    g.groggy = GROGGY_TIME;
    g.boss.phase = 'stunned'; g.boss.attack = null; g.boss.dash = null;
    damageBoss(GROGGY_HIT, '그로기!');
    g.fx.push({ kind: 'ult', x: g.boss.x, y: g.boss.y, t: 0.6, color: '#ff7043' });
    tone(120, 0.6, 'sawtooth', 0.14, 40);
  }

  // ===== 갱신 =====
  function moveDir() {
    var ux = 0, uy = 0;
    if (keys.ArrowUp) { ux += SCREEN_UP.x; uy += SCREEN_UP.y; }
    if (keys.ArrowDown) { ux -= SCREEN_UP.x; uy -= SCREEN_UP.y; }
    if (keys.ArrowRight) { ux += SCREEN_RIGHT.x; uy += SCREEN_RIGHT.y; }
    if (keys.ArrowLeft) { ux -= SCREEN_RIGHT.x; uy -= SCREEN_RIGHT.y; }
    var l = Math.sqrt(ux * ux + uy * uy);
    if (l < 0.01) return null;
    return { x: ux / l, y: uy / l };
  }

  function update(dt, slowed) {
    var g = game;
    if (!g) return;
    g.stateT += dt;
    if (state === 'intro') {
      if (g.stateT >= INTRO_TIME) { state = 'fight'; g.stateT = 0; checkGroggy(); }
      return;
    }
    if (state === 'groggyAnim') {
      // 장면이 바뀌는 순간에 소리와 번쩍임
      var ph = groggyPhase();
      if (ph !== g.gPhase) {
        g.gPhase = ph;
        if (ph === 'burst') { g.flash = 0.2; tone(160, 0.5, 'sawtooth', 0.12, 60); tone(700, 0.2, 'square', 0.06, 1400); }
        if (ph === 'eyes') tone(300, 0.25, 'triangle', 0.07, 1200);
        if (ph === 'bind') tone(1320, 0.3, 'sine', 0.08, 1760);
      }
      if (g.stateT >= GROGGY_ANIM) endGroggyAnim();
      return;
    }
    if (state !== 'fight') return;

    if (!slowed) g.clock += dt; // 느려지는 연출 동안은 시계가 멈춘다
    if (g.clock >= LIMIT) { g.clock = LIMIT; finish(false, '3분이 지났다'); return; }

    // 이동 (회피 중이면 회피 방향으로 미끄러진다)
    var m = moveDir();
    if (g.dodge) {
      var sp = DODGE_DIST / DODGE_TIME;
      g.player.x = clamp(g.player.x + g.dodge.dir.x * sp * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.player.y = clamp(g.player.y + g.dodge.dir.y * sp * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.dodge.t -= dt;
      if (g.dodge.t <= 0) g.dodge = null;
    } else if (m) {
      g.player.x = clamp(g.player.x + m.x * MOVE_SPEED * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.player.y = clamp(g.player.y + m.y * MOVE_SPEED * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.facing = m;
    }
    // 보스와 겹치지 않게 밀어냄 (돌진으로 미끄러져 오는 보스에게도 밀린다)
    var d = dist(g.player, g.boss);
    var minD = BOSS_R + PLAYER_R;
    if (d < minD) {
      var ux, uy;
      if (d > 0.01) { ux = (g.player.x - g.boss.x) / d; uy = (g.player.y - g.boss.y) / d; }
      else { // 딱 겹치면 바닥 가장자리 쪽으로 (바닥 한가운데면 아래쪽으로)
        var dc = Math.hypot(g.player.x, g.player.y);
        if (dc > 0.01) { ux = g.player.x / dc; uy = g.player.y / dc; } else { ux = 0; uy = 1; }
      }
      g.player.x = clamp(g.boss.x + ux * minD, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.player.y = clamp(g.boss.y + uy * minD, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      // 벽이나 구석이라 캐릭터를 밀어낼 자리가 없으면 보스를 바닥 가운데 쪽으로 밀어낸다 (첫 판 뒤 "모서리에 몰리면 보스에게 껴서 갇힌다"로 더함)
      var d2 = dist(g.player, g.boss);
      if (d2 < minD - 0.5) {
        var vx, vy;
        if (d2 > 0.01) { vx = (g.boss.x - g.player.x) / d2; vy = (g.boss.y - g.player.y) / d2; }
        else { var dp = Math.hypot(g.player.x, g.player.y) || 1; vx = -g.player.x / dp; vy = -g.player.y / dp; }
        g.boss.x = clamp(g.player.x + vx * minD, -FLOOR + BOSS_R, FLOOR - BOSS_R);
        g.boss.y = clamp(g.player.y + vy * minD, -FLOOR + BOSS_R, FLOOR - BOSS_R);
      }
    }
    // A 를 누르고 있으면 기본 공격이 이어진다 (첫 판 뒤 "탁탁 누르기 힘들다"로 더함. 2026-11-22 부터 1타 → 2타 → 3타, 사이는 COMBO_CD)
    if (keys.a || keys.A || keys['ㅁ']) { doAttack(); if (state !== 'fight') return; }
    g.attackCd = Math.max(0, g.attackCd - dt);
    if (g.attackCd <= 0) { g.comboIdle += dt; if (g.comboIdle > COMBO_RESET) g.combo = 0; }
    if (g.swing) { g.swing.t -= dt; if (g.swing.t <= 0) g.swing = null; }
    g.dodgeCd = Math.max(0, g.dodgeCd - dt);
    for (var ci = 0; ci < 3; ci++) {
      g.chars[ci].tagCd = Math.max(0, g.chars[ci].tagCd - dt);
      g.chars[ci].specialCd = Math.max(0, g.chars[ci].specialCd - dt);
    }
    for (var fi = g.fx.length - 1; fi >= 0; fi--) { g.fx[fi].t -= dt; if (g.fx[fi].t <= 0) g.fx.splice(fi, 1); }
    g.invuln = Math.max(0, g.invuln - dt);
    g.hurt = Math.max(0, g.hurt - dt);
    g.boss.flash = Math.max(0, g.boss.flash - dt);
    updateBoss(dt);
    if (state !== 'fight') return;
    for (var i = g.hits.length - 1; i >= 0; i--) { g.hits[i].t -= dt; g.hits[i].z += 40 * dt; if (g.hits[i].t <= 0) g.hits.splice(i, 1); }
  }

  // ===== 보스 패턴 =====
  function pickPattern(last) {
    var total = 0, i;
    for (i = 0; i < PATTERNS.length; i++) if (i !== last) total += PATTERNS[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < PATTERNS.length; i++) {
      if (i === last) continue;
      r -= PATTERNS[i].weight;
      if (r <= 0) return i;
    }
    return last === 0 ? 1 : 0;
  }
  // 전조가 시작되는 순간의 보스 위치와 플레이어 방향으로 모양을 고정한다 (그래야 보고 피할 수 있다)
  function makeAttack(idx) {
    var g = game, p = PATTERNS[idx];
    var dx = g.player.x - g.boss.x, dy = g.player.y - g.boss.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    return { idx: idx, p: p, ox: g.boss.x, oy: g.boss.y, dir: { x: dx / d, y: dy / d }, angle: Math.atan2(dy, dx), countered: false };
  }
  // 점 (x, y) 가 공격 범위 안인가
  function inAttack(a, x, y) {
    var p = a.p, dx = x - a.ox, dy = y - a.oy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (p.id === 'ring' || p.id === 'burst') return d <= p.r + PLAYER_R * 0.5;
    if (p.id === 'fan') {
      if (d > p.r + PLAYER_R * 0.5) return false;
      var da = Math.atan2(dy, dx) - a.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      return Math.abs(da) <= p.half;
    }
    // dash: 보스에서 dir 방향으로 len 만큼의 직선. 폭은 half 의 두 배
    var along = dx * a.dir.x + dy * a.dir.y;
    var side = Math.abs(dx * -a.dir.y + dy * a.dir.x);
    return along >= -BOSS_R && along <= p.len && side <= p.half + PLAYER_R * 0.5;
  }
  function hitPlayer() {
    var g = game;
    if (g.invuln > 0) return;
    var c = g.chars[g.cur];
    c.hp -= 1;
    g.hurt = 0.3;
    tone(140, 0.15, 'sawtooth', 0.1, 70);
    if (c.hp <= 0) {
      // 쓰러지면 다음 순서의 살아 있는 캐릭터가 바로 나온다
      var next = nextAlive(g.cur);
      if (next < 0) { finish(false, '셋이 모두 쓰러졌다'); return; }
      g.cur = next;
      tone(300, 0.3, 'triangle', 0.08, 150);
    }
  }
  function nextAlive(from) {
    for (var k = 1; k <= 2; k++) { var i = (from + k) % 3; if (game.chars[i].hp > 0) return i; }
    return -1;
  }
  function updateBoss(dt) {
    var g = game, b = g.boss;
    if (b.phase === 'stunned') {
      // 무력화: 게이지가 줄어드는 동안 움직이지도 공격하지도 않는다
      g.groggy -= dt;
      if (g.groggy <= 0) { g.groggy = 0; g.counters = 0; b.phase = 'wait'; b.t = 1.0; }
      return;
    }
    b.t -= dt;
    if (b.phase === 'wait') {
      // 멀면 다가온다
      var d = dist(b, g.player);
      if (d > BOSS_KEEP) {
        b.x += (g.player.x - b.x) / d * BOSS_SPEED * dt;
        b.y += (g.player.y - b.y) / d * BOSS_SPEED * dt;
      }
      if (b.t <= 0) {
        var idx = pickPattern(b.last);
        b.last = idx;
        b.attack = makeAttack(idx);
        b.phase = 'telegraph';
        b.t = TELEGRAPH;
        tone(PATTERNS[idx].color === 'red' ? 330 : 880, 0.12, 'sine', 0.06);
      }
    } else if (b.phase === 'telegraph') {
      if (b.t <= 0) {
        var a = b.attack;
        // 돌진은 보스가 DASH_TIME 에 걸쳐 직선 끝까지 미끄러진다 (active 단계에서 움직임). 맞는 판정은 전조에서 본 직선 전체로 지금 한 번
        if (a.p.id === 'dash') {
          b.dash = { fx: a.ox, fy: a.oy,
            tx: clamp(a.ox + a.dir.x * a.p.len, -FLOOR + BOSS_R, FLOOR - BOSS_R),
            ty: clamp(a.oy + a.dir.y * a.p.len, -FLOOR + BOSS_R, FLOOR - BOSS_R) };
        }
        if (!a.countered && inAttack(a, g.player.x, g.player.y)) hitPlayer();
        tone(a.p.id === 'burst' ? 90 : 160, 0.2, 'square', 0.08, 60);
        b.phase = 'active';
        b.t = a.p.id === 'dash' ? DASH_TIME : ACTIVE;
      }
    } else if (b.phase === 'active') {
      if (b.dash) {
        // 처음에 빠르고 끝에서 느려지며 미끄러진다
        var k = 1 - clamp(b.t / DASH_TIME, 0, 1);
        var e = 1 - (1 - k) * (1 - k);
        b.x = b.dash.fx + (b.dash.tx - b.dash.fx) * e;
        b.y = b.dash.fy + (b.dash.ty - b.dash.fy) * e;
      }
      if (b.t <= 0) {
        if (b.dash) { b.x = b.dash.tx; b.y = b.dash.ty; b.dash = null; }
        b.phase = 'recover'; b.t = RECOVER;
      }
    } else if (b.phase === 'recover') {
      if (b.t <= 0) { b.phase = 'wait'; b.attack = null; b.t = BOSS_WAIT[0] + Math.random() * (BOSS_WAIT[1] - BOSS_WAIT[0]); }
    }
  }

  // ===== 그리기 =====
  function floorPoly(pts) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var s = project(pts[i].x, pts[i].y, 0);
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    }
    ctx.closePath();
  }
  function floorCircle(cx, cy, r, from, to) {
    // 바닥의 원(또는 부채꼴)을 점 32개로 이어 그린다. 투영하면 저절로 납작한 타원이 된다
    var pts = [];
    var a0 = from === undefined ? 0 : from, a1 = to === undefined ? Math.PI * 2 : to;
    var isFan = from !== undefined;
    if (isFan) pts.push({ x: cx, y: cy });
    for (var i = 0; i <= 32; i++) {
      var a = a0 + (a1 - a0) * i / 32;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    floorPoly(pts);
  }
  function drawFloor() {
    ctx.fillStyle = '#2b3245';
    floorPoly([{ x: -FLOOR, y: -FLOOR }, { x: FLOOR, y: -FLOOR }, { x: FLOOR, y: FLOOR }, { x: -FLOOR, y: FLOOR }]);
    ctx.fill();
    ctx.strokeStyle = '#3a4360';
    ctx.lineWidth = 1;
    for (var i = -FLOOR; i <= FLOOR; i += 50) {
      var a = project(i, -FLOOR, 0), b = project(i, FLOOR, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      a = project(-FLOOR, i, 0); b = project(FLOOR, i, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  // 바닥에 선 기둥 모양 (그림자 타원 + 몸통 + 머리)
  function drawPillar(x, y, r, h, color, alpha) {
    var base = project(x, y, 0);
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(base.x, base.y, r * COS * 1.15, r * SIN * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(base.x - r * 0.75, base.y - h, r * 1.5, h);
    ctx.beginPath(); ctx.ellipse(base.x, base.y - h, r * 0.75, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(base.x - r * 0.75, base.y - h, r * 0.35, h);
    ctx.globalAlpha = 1;
  }
  function attackPath(a, scale) {
    var p = a.p, s = scale || 1;
    if (p.id === 'fan') floorCircle(a.ox, a.oy, p.r * s, a.angle - p.half, a.angle + p.half);
    else if (p.id === 'dash') {
      var nx = -a.dir.y * p.half * s, ny = a.dir.x * p.half * s;
      var ex = a.ox + a.dir.x * p.len * s, ey = a.oy + a.dir.y * p.len * s;
      floorPoly([{ x: a.ox + nx, y: a.oy + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }, { x: a.ox - nx, y: a.oy - ny }]);
    } else floorCircle(a.ox, a.oy, p.r * s);
  }
  // 전조 중에 무엇을 보이나: 보스 위 마름모는 전조 내내, 바닥 범위는 마지막 RANGE_SHOW 초 (지금은 둘이 같아 함께 뜬다)
  function telegraphView() {
    var b = game && game.boss;
    if (!b || b.phase !== 'telegraph' || !b.attack) return null;
    return { marker: true, range: b.t <= RANGE_SHOW, k: clamp(b.t / RANGE_SHOW, 0, 1) };
  }
  function drawTelegraph() {
    var b = game.boss, a = b.attack;
    if (!a) return;
    var red = a.p.color === 'red';
    if (b.phase === 'telegraph') {
      // 마지막 RANGE_SHOW 초: 옅은 범위 + 바깥에서 줄어드는 테두리. 테두리가 범위에 닿으면 공격
      var v = telegraphView();
      if (!v.range) return;
      var k = v.k;
      ctx.fillStyle = red ? 'rgba(239,83,80,0.22)' : 'rgba(255,213,79,0.22)';
      attackPath(a, 1); ctx.fill();
      ctx.strokeStyle = red ? '#ef5350' : '#ffd54f';
      ctx.lineWidth = 3;
      attackPath(a, 1 + 0.5 * k); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      attackPath(a, 1); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (b.phase === 'active') {
      ctx.fillStyle = red ? 'rgba(239,83,80,0.75)' : 'rgba(255,213,79,0.75)';
      attackPath(a, 1); ctx.fill();
    } else if (b.phase === 'recover') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      attackPath(a, 1); ctx.fill();
    }
  }
  // 보스 위 마름모 (반격할 수 있는 때). 노란색은 회피·태그, 붉은색은 회피만.
  // 바깥 마름모가 2.4배 크기에서 줄어들어 (처음 3배는 위쪽 체력 막대에 닿아 줄임), 공격이 나가는 순간 안쪽 마름모와 딱 겹치며 꽉 찬다 (바닥 테두리와 같은 박자)
  var MARK_S = 13;             // 안쪽 마름모 크기 (가운데에서 꼭짓점까지)
  function diamondPath(x, y, s) {
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
  }
  // 바깥 마름모 크기: 전조 시작에 2.4배, 공격이 나가는 순간 MARK_S (안쪽과 같다)
  function markerOuter() {
    var b = game && game.boss;
    if (!b || b.phase !== 'telegraph' || !b.attack) return null;
    return MARK_S * (1 + 1.4 * clamp(b.t / TELEGRAPH, 0, 1));
  }
  function drawMarker() {
    var b = game.boss, a = b.attack;
    if (!a || (b.phase !== 'telegraph' && b.phase !== 'active')) return;
    var tele = b.phase === 'telegraph';
    var col = a.p.color === 'red' ? '#ff5252' : '#ffd740';
    var o = project(b.x, b.y, BOSS_H + 34);
    var k = tele ? clamp(b.t / TELEGRAPH, 0, 1) : 0;   // 1 → 0. 0 이 되는 때가 공격이 나가는 때
    // 안쪽: 속이 차오르다가 공격 순간 꽉 찬다
    diamondPath(o.x, o.y, MARK_S);
    ctx.fillStyle = col; ctx.globalAlpha = tele ? 0.12 + 0.4 * (1 - k) : 1; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
    if (tele) {
      // 바깥: 줄어드는 테두리
      diamondPath(o.x, o.y, markerOuter());
      ctx.globalAlpha = 0.4 + 0.6 * (1 - k);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // 공격이 나간 순간: 하얀 테두리가 퍼지며 사라진다
      var e = 1 - clamp(b.t / (a.p.id === 'dash' ? DASH_TIME : ACTIVE), 0, 1);
      diamondPath(o.x, o.y, MARK_S * (1 + 0.7 * e));
      ctx.globalAlpha = 1 - e; ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  function drawFx() {
    for (var i = 0; i < game.fx.length; i++) {
      var f = game.fx[i];
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = clamp(f.t / 0.3, 0, 1);
      if (f.kind === 'special') {
        ctx.lineWidth = 4;
        floorCircle(f.x, f.y, (BOSS_R + SPECIAL_RANGE) * (1 - f.t / 0.35)); ctx.stroke();
      } else if (f.kind === 'ult') {
        ctx.lineWidth = 8;
        floorCircle(f.x, f.y, 40 + 200 * (1 - f.t / 0.6)); ctx.stroke();
        ctx.fillStyle = f.color; ctx.globalAlpha *= 0.3;
        floorCircle(f.x, f.y, 40 + 200 * (1 - f.t / 0.6)); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  // 기본 공격 이펙트: 캐릭터마다 다르다 (캐릭터 그림 앞에 그린다. 2026-11-22 "캐릭터에 맞는 때리는 모션")
  // 빨강: 할퀴기 \ · 할퀴기 / · 꼬리 휘두르기, 파랑: 얼음 조각 · 얼음 조각 · 얼음 가시, 초록: 잽 · 스트레이트 · 돌려차기
  function arcPath(cx, cy, r, from, to, z) {
    ctx.beginPath();
    for (var si = 0; si <= 14; si++) {
      var aa = from + (to - from) * si / 14;
      var sp = project(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r, z);
      if (si === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
    }
  }
  function strokeTwice(wOut, cOut, wIn, cIn) { ctx.lineWidth = wOut; ctx.strokeStyle = cOut; ctx.stroke(); ctx.lineWidth = wIn; ctx.strokeStyle = cIn; ctx.stroke(); }
  function burst(x, y, r, n, col, rot) { // 뾰족한 별 모양 튀김
    ctx.fillStyle = col; ctx.beginPath();
    for (var k = 0; k < n * 2; k++) {
      var a = rot + Math.PI * k / n, rr = k % 2 ? r * 0.4 : r;
      if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }
  function drawAttacks() {
    for (var i = 0; i < game.fx.length; i++) {
      var f = game.fx[i];
      if (f.kind !== 'atk') continue;
      var prog = 1 - f.t / f.d;
      var bt = project(f.tx, f.ty, 52); // 맞는 자리 (보스 몸 가운데쯤)
      ctx.globalAlpha = clamp(f.t / (f.d * 0.6), 0, 1);
      if (f.ch === 0) {
        if (f.i < 2) {
          // 할퀴기: 붉은 세 줄 자국이 그어진다 (1타 \, 2타 /)
          var sgn = f.i === 0 ? 1 : -1, len = 34 * Math.min(1, prog * 2.2);
          for (var c = -1; c <= 1; c++) {
            var ox = bt.x + c * 9 - 17 * sgn, oy = bt.y + c * 3 - 17;
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + len * sgn, oy + len);
            strokeTwice(5, '#ff5a3c', 2, '#fff3e0');
          }
        } else {
          // 꼬리 휘두르기: 캐릭터 둘레로 넓은 붉은 호와 불티
          arcPath(f.x, f.y, 50, f.ang - 1.5, f.ang - 1.5 + 3 * Math.min(1, prog * 1.6), 16);
          strokeTwice(9, '#ff7043', 3, '#ffe0b2');
          for (var e = 0; e < 6; e++) {
            var ea = f.ang - 1.2 + e * 0.5, er = 50 + prog * 20;
            var ep = project(f.x + Math.cos(ea) * er, f.y + Math.sin(ea) * er, 16 + prog * 30 + e * 3);
            ctx.fillStyle = e % 2 ? '#ffb74d' : '#ff5722'; ctx.fillRect(ep.x - 2, ep.y - 2, 4, 4);
          }
        }
      } else if (f.ch === 1) {
        if (f.i < 2) {
          // 얼음 조각: 지팡이 끝에서 맞는 자리로 날아가 부서진다
          var st = project(f.x + Math.cos(f.ang) * 22, f.y + Math.sin(f.ang) * 22, 44);
          var kk = Math.min(1, prog * 1.8);
          var px = st.x + (bt.x - st.x) * kk, py = st.y + (bt.y - st.y) * kk;
          if (kk < 1) {
            ctx.strokeStyle = 'rgba(180,240,255,0.7)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(st.x + (px - st.x) * 0.4, st.y + (py - st.y) * 0.4); ctx.lineTo(px, py); ctx.stroke();
            ctx.fillStyle = '#7fe6ff'; diamondPath(px, py, 6); ctx.fill();
            ctx.fillStyle = '#ffffff'; diamondPath(px, py, 2.5); ctx.fill();
          } else {
            burst(bt.x, bt.y, 14 + prog * 6, 6, '#b3f0ff', prog * 2);
          }
        } else {
          // 내려찍기: 맞는 자리 앞 바닥에서 얼음 가시 넷이 솟는다
          var grow = Math.min(1, prog * 2.5), reach = dist({ x: f.tx, y: f.ty }, { x: f.x, y: f.y });
          for (var s2 = 0; s2 < 4; s2++) {
            var sa = f.ang + (s2 - 1.5) * 0.45, sr = reach * 0.55 + (s2 % 2) * 8;
            var g0 = project(f.x + Math.cos(sa) * sr, f.y + Math.sin(sa) * sr, 0), hg = (22 + (s2 % 2) * 10) * grow;
            ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.moveTo(g0.x - 7, g0.y); ctx.lineTo(g0.x, g0.y - hg); ctx.lineTo(g0.x + 7, g0.y); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(g0.x - 2, g0.y); ctx.lineTo(g0.x, g0.y - hg); ctx.lineTo(g0.x + 3, g0.y); ctx.closePath(); ctx.fill();
          }
        }
      } else {
        // 초록: 주먹·발이 닿는 자리에 하얀 튀김과 바람 고리. 3타 돌려차기는 넓은 바람 호
        var big = f.i === 2, rr = (f.i === 0 ? 12 : f.i === 1 ? 16 : 22) * (0.6 + prog);
        if (big) { arcPath(f.x, f.y, 46, f.ang + 1.6, f.ang + 1.6 - 3.2 * Math.min(1, prog * 1.7), 30); strokeTwice(8, '#73d69c', 3, '#e8fff0'); }
        burst(bt.x, bt.y - 4, rr, big ? 8 : 6, '#ffffff', prog);
        ctx.strokeStyle = '#73d69c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(bt.x, bt.y - 4, rr * 1.4, rr * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  // ===== 그로기 진입 연출 그리기 =====
  function groggyPhase() {
    if (state !== 'groggyAnim') return null;
    var ph = GROGGY_PHASES[0][0];
    for (var i = 0; i < GROGGY_PHASES.length; i++) if (game.stateT >= GROGGY_PHASES[i][1]) ph = GROGGY_PHASES[i][0];
    return ph;
  }
  // 버튼을 기다리는 동안: 캐릭터 둘레에 하늘색 회오리가 감아 오르고 조각이 날린다
  function drawTornado() {
    var g = game, t = g.stateT;
    for (var j = 0; j < 3; j++) {
      ctx.beginPath();
      for (var z = 0; z <= 110; z += 5) {
        var a = t * 7 + z * 0.07 + j * 2.09, r = 22 + z * 0.22;
        var sp = project(g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r, z);
        if (z === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
      }
      ctx.globalAlpha = 0.75; strokeTwice(4, '#26c6da', 1.5, '#e0f7fa');
    }
    for (var k = 0; k < 8; k++) {
      var zz = (t * 60 + k * 14) % 110, aa = t * 5 + k * 0.8, rr = 30 + zz * 0.2;
      var q = project(g.player.x + Math.cos(aa) * rr, g.player.y + Math.sin(aa) * rr, zz);
      ctx.globalAlpha = 1 - zz / 110; ctx.fillStyle = k % 2 ? '#b2ebf2' : '#80deea';
      ctx.fillRect(q.x - 2, q.y - 3, 4, 6);
    }
    ctx.globalAlpha = 1;
  }
  // 고양이가 날아가고, 보스에 맞아 터지고, 빛 고리가 감긴다 (바닥 좌표에서 그림)
  function drawGroggyWorld() {
    var g = game, b = g.boss, t = g.stateT, f = g.groggyFrom;
    var bt = project(b.x, b.y, 60);
    if (t < 0.7) {
      var k = t / 0.7, e = k * k * (3 - 2 * k);
      var o = project(f.x + (b.x - f.x) * e, f.y + (b.y - f.y) * e, 40 + Math.sin(e * Math.PI) * 70 + 20 * e);
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(t * 14);
      if (CAT_IMG) { ctx.imageSmoothingEnabled = false; ctx.drawImage(CAT_IMG.right, -19, -14, 38, 28); }
      else { ctx.fillStyle = '#f29b4b'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,30,0.85)'; ctx.strokeText('그로기!', o.x, o.y + 36); ctx.fillText('그로기!', o.x, o.y + 36);
    } else if (t < 1.05) {
      // 보라·분홍 폭발: 가운데 빛과 바깥으로 튀는 조각
      var p = (t - 0.7) / 0.35;
      ctx.globalAlpha = 1 - p * 0.6;
      ctx.fillStyle = '#ff80ab'; ctx.beginPath(); ctx.arc(bt.x, bt.y, 18 + 40 * p, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e040fb'; ctx.beginPath(); ctx.arc(bt.x, bt.y, 10 + 24 * p, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(bt.x, bt.y, 6 + 10 * (1 - p), 0, Math.PI * 2); ctx.fill();
      for (var s3 = 0; s3 < 10; s3++) {
        var a3 = s3 * 0.628 + 0.3, r1 = 20 + 50 * p, r2 = r1 + 18 * (1 - p) + 6;
        ctx.fillStyle = s3 % 2 ? '#ffffff' : '#f8bbd0';
        ctx.beginPath(); ctx.moveTo(bt.x + Math.cos(a3 - 0.08) * r1, bt.y + Math.sin(a3 - 0.08) * r1 * 0.8);
        ctx.lineTo(bt.x + Math.cos(a3) * r2, bt.y + Math.sin(a3) * r2 * 0.8);
        ctx.lineTo(bt.x + Math.cos(a3 + 0.08) * r1, bt.y + Math.sin(a3 + 0.08) * r1 * 0.8); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (t >= 2.1) {
      // 빛 고리 셋이 보스를 조여 구속한다
      var pb = clamp((t - 2.1) / 0.6, 0, 1);
      [20, 55, 90].forEach(function (zr, n) {
        var rad = 80 - 44 * Math.min(1, pb * 1.4 + n * 0.1);
        var c = project(b.x, b.y, zr);
        ctx.beginPath(); ctx.ellipse(c.x, c.y, rad * COS * 1.41, rad * SIN * 1.41, 0, 0, Math.PI * 2);
        strokeTwice(6, '#ffca28', 2, '#fffde7');
      });
    }
  }
  // 지금 캐릭터의 눈 클로즈업이 화면을 가로지른다: 어둡게 + 위아래 검은 띠 + 색이 어긋난 눈 + 속도선 (화면 좌표)
  function drawCutIn() {
    var g = game, t = g.stateT - 1.05, d = 1.05;
    var slide = t < 0.12 ? (1 - t / 0.12) : t > d - 0.12 ? -(t - (d - 0.12)) / 0.12 : 0; // 오른쪽에서 들어와 왼쪽으로 나간다
    var dx = slide * W;
    ctx.fillStyle = 'rgba(5,4,10,0.6)'; ctx.fillRect(0, 0, W, H);
    var by = 140, bh = 200;
    ctx.fillStyle = '#0c0a12'; ctx.fillRect(0, by - 14, W, 14); ctx.fillRect(0, by + bh, W, 14);
    var ey = EYE_IMGS[g.cur];
    ctx.save();
    ctx.beginPath(); ctx.rect(0, by, W, bh); ctx.clip();
    ctx.fillStyle = SKIN.S; ctx.fillRect(0, by, W, bh);
    if (ey) {
      ctx.imageSmoothingEnabled = false;
      var ix = Math.round(W / 2 - 320 + dx), iy = by;
      // 색이 어긋난 두 벌은 눈 그림 안쪽에만 (밖으로 삐져나오면 세로 줄이 생긴다)
      ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, 640, 200); ctx.clip();
      ctx.globalAlpha = 0.45; ctx.drawImage(ey.red, ix - 6, iy, 640, 200); ctx.drawImage(ey.cyan, ix + 6, iy, 640, 200);
      ctx.restore();
      ctx.globalAlpha = 1; ctx.drawImage(ey.img, ix, iy, 640, 200);
    }
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff';
    for (var i = 0; i < 9; i++) { var lx = (W - ((t * 1800 + i * 137) % (W + 200))); ctx.fillRect(lx, by + 12 + i * 21, 120, 2); }
    ctx.globalAlpha = 1;
    for (var k = 0; k < 6; k++) { var sx = (k * 113 + t * 300) % W, sy = by + 20 + (k * 47) % 160; ctx.fillStyle = k % 2 ? '#ffb74d' : '#ff7043'; ctx.fillRect(sx + dx, sy, 4, 4); }
    ctx.restore();
  }
  function drawBoss() {
    var b = game.boss;
    var h = state === 'intro' ? 20 + (BOSS_H - 20) * clamp(game.stateT / INTRO_TIME, 0, 1) : BOSS_H;
    var stunned = b.phase === 'stunned';
    if (BOSS_IMG) {
      // 골렘 그림: 발밑 그림자, 캐릭터 쪽을 보게 뒤집기, 맞으면 하얗게, 무력화면 보랏빛으로 조금 주저앉는다
      var base = project(b.x, b.y, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(base.x, base.y, BOSS_R * COS * 1.7, BOSS_R * SIN * 1.7, 0, 0, Math.PI * 2); ctx.fill();
      var pl = project(game.player.x, game.player.y, 0);
      if (pl.x > base.x + 6) b.faceRight = true; else if (pl.x < base.x - 6) b.faceRight = false;
      var hh = stunned ? BOSS_H * 0.92 : h, ww = hh * BOSS_IMG.w / BOSS_IMG.h;
      ctx.save();
      ctx.translate(base.x, base.y);
      if (b.faceRight) ctx.scale(-1, 1);
      ctx.drawImage(b.flash > 0 ? BOSS_IMG.white : stunned ? BOSS_IMG.stun : BOSS_IMG.img, -ww * BOSS_ANCHOR_X, -hh, ww, hh);
      ctx.restore();
    } else {
      drawPillar(b.x, b.y, BOSS_R, stunned ? BOSS_H * 0.7 : h, b.flash > 0 ? '#ffffff' : stunned ? '#5e35b1' : '#8e24aa');
    }
    if (stunned) {
      var top = project(b.x, b.y, BOSS_H);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('무력화 ' + game.groggy.toFixed(1), top.x, top.y);
    }
    if (state === 'groggyAnim') drawGroggyWorld();
    if (state === 'intro') {
      var s = project(b.x, b.y, BOSS_H + 30);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('보스 등장', s.x, s.y - 20 * Math.sin(game.stateT * 3));
    }
  }
  function drawPlayer() {
    var g = game;
    var c = CHARS[g.cur];
    // 기본 공격 몸짓: 보스 쪽으로 살짝 내딛었다 돌아온다 (그림만. 판정 자리는 그대로)
    var lx = 0, ly = 0;
    if (g.swing) { var ls = Math.sin(Math.PI * (1 - g.swing.t / g.swing.d)) * (g.swing.i === 2 ? 10 : 6); lx = g.swing.dir.x * ls; ly = g.swing.dir.y * ls; }
    var spr = SPRITES[g.cur];
    if (!spr) { // 그림을 못 만들었으면 (브라우저 없이 검사할 때) 예전 기둥
      drawPillar(g.player.x + lx, g.player.y + ly, PLAYER_R, 34, g.hurt > 0 ? '#ff1744' : c.color, g.dodge ? 0.5 : 1);
      return;
    }
    // 바라보는 쪽: 공격 중이면 보스 쪽, 아니면 움직인 쪽 (화면에서 왼쪽이면 뒤집은 그림)
    var fd = g.swing ? g.swing.dir : g.facing;
    var sxd = fd.x - fd.y;
    if (Math.abs(sxd) > 0.05) g.faceLeft = sxd < 0;
    var base = project(g.player.x + lx, g.player.y + ly, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(base.x, base.y, PLAYER_R * COS * 1.2, PLAYER_R * SIN * 1.2, 0, 0, Math.PI * 2); ctx.fill();
    var ps = spr[g.swing ? 'a' + (g.swing.i + 1) : 'idle']; // 때리는 동안은 그 타의 자세
    var img = g.hurt > 0 ? (g.faceLeft ? ps.redLeft : ps.redRight) : (g.faceLeft ? ps.left : ps.right);
    // 칸이 고르게 보이게 화면 좌표에서 정수 위치로 그린다
    var m = ctx.getTransform ? ctx.getTransform() : null;
    ctx.save();
    ctx.globalAlpha = g.dodge ? 0.5 : 1;
    ctx.imageSmoothingEnabled = false;
    if (m && m.a) {
      var px = m.a * base.x + m.c * base.y + m.e, py = m.b * base.x + m.d * base.y + m.f;
      var sc = m.a * SPRITE_SCALE;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(img, Math.round(px - (SPR_W / 2) * sc), Math.round(py - (SPR_H - 1) * sc), Math.round(SPR_W * sc), Math.round(SPR_H * sc));
    } else {
      ctx.drawImage(img, base.x - (SPR_W / 2) * SPRITE_SCALE, base.y - (SPR_H - 1) * SPRITE_SCALE, SPR_W * SPRITE_SCALE, SPR_H * SPRITE_SCALE);
    }
    ctx.restore();
  }
  function drawHits() {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < game.hits.length; i++) {
      var h = game.hits[i];
      var s = project(h.x, h.y, h.z);
      ctx.globalAlpha = clamp(h.t / 0.3, 0, 1);
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,30,0.85)'; ctx.strokeText(h.text, s.x, s.y); // 하얗게 번쩍이는 보스 위에서도 읽히게
      ctx.fillText(h.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
  }
  function drawHud() {
    var g = game;
    // 남은 시간
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = g.clock > LIMIT - 30 ? '#ff7043' : '#fff';
    ctx.fillText('남은 시간 ' + fmtTime(Math.max(0, LIMIT - g.clock)), 14, 30);
    if (TEST) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#ffd54f'; ctx.fillText('?test 확인용 (저장 안 함)', 14, 44); }
    // 보스 체력
    var bw = 320, bx = (W - bw) / 2, by = 14;
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, 18);
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(bx, by, bw * g.boss.hp / BOSS_HP, 14);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('보스 ' + g.boss.hp + ' / ' + BOSS_HP, W / 2, by + 11);
    // 그로기 게이지 (보스 체력 밑). 무력화 동안은 줄어든다
    var gy = by + 22;
    var ratio = g.groggy > 0 ? g.groggy / GROGGY_TIME : clamp(g.counters / GROGGY_NEED, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, gy - 2, bw + 4, 12);
    ctx.fillStyle = g.groggy > 0 ? '#ff7043' : '#ffa726'; ctx.fillRect(bx, gy, bw * ratio, 8);
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(g.groggy > 0 ? '무력화 ' + g.groggy.toFixed(1) + '초' : '그로기 ' + g.counters + ' / ' + GROGGY_NEED, bx + bw + 8, gy + 8);
    drawCharCards();
    drawSkillIcons();
  }
  // 왼쪽 아래 캐릭터 카드 셋: 이름, 체력 7칸, 태그 쿨타임 (캐릭터마다 돌아서 카드에 둔다)
  var CARD_W = 130, CARD_GAP = 12, CARD_X = 14, CARD_Y = H - 62;
  function drawCharCards() {
    var g = game;
    for (var i = 0; i < 3; i++) {
      var c = g.chars[i], x = CARD_X + i * (CARD_W + CARD_GAP), y0 = CARD_Y;
      var active = i === g.cur, dead = c.hp <= 0;
      ctx.fillStyle = active ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y0, CARD_W, 54);
      if (active) { ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 1, CARD_W - 2, 52); }
      ctx.fillStyle = dead ? '#555' : CHARS[i].color;
      ctx.fillRect(x + 8, y0 + 8, 14, 14);
      ctx.fillStyle = dead ? '#888' : '#fff';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(CHARS[i].name + (dead ? ' (쓰러짐)' : ''), x + 28, y0 + 20);
      if (!dead && !active) {
        ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillStyle = c.tagCd > 0 ? '#9e9e9e' : '#80deea';
        ctx.fillText(c.tagCd > 0 ? '태그 ' + c.tagCd.toFixed(1) : '태그 OK', x + CARD_W - 6, y0 + 20);
      }
      for (var k = 0; k < CHAR_HP; k++) {
        ctx.fillStyle = k < c.hp ? '#66bb6a' : '#333';
        ctx.fillRect(x + 8 + k * 17, y0 + 32, 14, 10);
      }
    }
  }
  // 오른쪽 아래 스킬 아이콘 넷: Shift 회피(셋이 함께), Space 태그(들어올 캐릭터), S 특수, D 궁극 (지금 캐릭터의 것)
  var ICON = 48, ICON_GAP = 6, ICON_Y = H - 14 - 48, ICON_X0 = W - 14 - (48 * 4 + 6 * 3);
  // 아이콘 하나. left: 쿨타임 남은 비율 (0 이면 쓸 수 있음). mid: 가운데 글자. fill: 아래에서 차오르는 게이지 비율. glow: 번쩍임
  function drawIcon(x, key, name, left, mid, ready, fill, fillColor, glow) {
    var y = ICON_Y;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, ICON, ICON);
    if (fill > 0) { ctx.fillStyle = fillColor; ctx.globalAlpha = 0.55; ctx.fillRect(x, y + ICON * (1 - fill), ICON, ICON * fill); ctx.globalAlpha = 1; }
    if (left > 0) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, y + ICON * (1 - left), ICON, ICON * left); } // 어두운 덮개가 아래로 줄어든다
    ctx.strokeStyle = ready ? '#ffd54f' : '#666';
    ctx.lineWidth = ready ? 2 : 1;
    if (glow) { ctx.lineWidth = 3; ctx.strokeStyle = (Math.floor(Date.now() / 150) % 2) ? '#fff' : '#ffd54f'; }
    ctx.strokeRect(x + 0.5, y + 0.5, ICON - 1, ICON - 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = ready ? '#fff' : '#bdbdbd';
    ctx.font = 'bold ' + (key.length > 1 ? 12 : 15) + 'px sans-serif';
    ctx.fillText(key, x + ICON / 2, y + 16);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = ready ? '#ffd54f' : '#e0e0e0';
    ctx.fillText(mid, x + ICON / 2, y + 31);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#bdbdbd';
    ctx.fillText(name, x + ICON / 2, y + 44);
  }
  function drawSkillIcons() {
    var g = game, c = g.chars[g.cur];
    var x = ICON_X0, step = ICON + ICON_GAP;
    // Shift 회피
    drawIcon(x, 'Shift', '회피', g.dodgeCd / DODGE_CD, g.dodgeCd > 0 ? g.dodgeCd.toFixed(1) : 'OK', g.dodgeCd <= 0, 0, null, false);
    // Space 태그: 들어올 캐릭터 이름을 그 색으로. 안 되면 가장 빨리 돌아오는 쿨타임
    var next = tagTarget();
    var mid = 'X', left = 0;
    if (next >= 0) mid = CHARS[next].name;
    else {
      var soon = 0;
      for (var i = 0; i < 3; i++) if (i !== g.cur && g.chars[i].hp > 0 && (soon === 0 || g.chars[i].tagCd < soon)) soon = g.chars[i].tagCd;
      if (soon > 0) { mid = soon.toFixed(1); left = soon / TAG_CD; }
    }
    drawIcon(x + step, 'Space', '태그', left, mid, next >= 0, 0, null, false);
    if (next >= 0) { ctx.fillStyle = CHARS[next].color; ctx.fillRect(x + step + ICON - 12, ICON_Y + 4, 8, 8); }
    // S 특수 (지금 캐릭터)
    drawIcon(x + step * 2, 'S', '특수', c.specialCd / SPECIAL_CD, c.specialCd > 0 ? c.specialCd.toFixed(1) : 'OK', c.specialCd <= 0, 0, null, false);
    // D 궁극 (지금 캐릭터): 게이지가 캐릭터 색으로 차오르고, 다 차면 번쩍인다
    var full = c.ult >= ULT_MAX;
    drawIcon(x + step * 3, 'D', '궁극', 0, full ? 'OK' : Math.floor(c.ult) + '%', full, c.ult / ULT_MAX, CHARS[g.cur].color, full);
  }
  // 카메라가 캐릭터와 보스의 가운데를 부드럽게 따라가고, 흔들림이 줄어든다 (실제 시간으로)
  function updateCamera(dt) {
    var g = game;
    if (!g) return;
    var k = Math.min(1, dt * 6);
    g.cam.x += ((g.player.x + g.boss.x) / 2 - g.cam.x) * k;
    g.cam.y += ((g.player.y + g.boss.y) / 2 - g.cam.y) * k;
    g.shake = Math.max(0, g.shake - dt);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!game) { drawFloor(); return; }
    var g = game;
    // 따라가는 카메라 (+ 기본 공격이 맞을 때 흔들림)
    ctx.save();
    var sx = 0, sy = 0;
    if (g.shake > 0) { var q = g.shakeAmp * Math.min(1, g.shake / 0.08); sx = Math.sin(g.stateT * 97) * q; sy = Math.cos(g.stateT * 83) * q; }
    var cs = project(g.cam.x, g.cam.y, 0);
    ctx.translate(W / 2 + sx, CAM_Y + sy); ctx.scale(CAM_ZOOM, CAM_ZOOM); ctx.translate(-cs.x, -cs.y);
    // 카메라 확대 (반격 성공 순간 캐릭터 쪽으로)
    var zoomed = g.zoom > 1.001 && g.zoomAt;
    if (zoomed) {
      var c = project(g.zoomAt.x, g.zoomAt.y, 20);
      ctx.save();
      ctx.translate(c.x, c.y); ctx.scale(g.zoom, g.zoom); ctx.translate(-c.x, -c.y);
    }
    drawFloor();
    drawTelegraph();
    drawFx();
    // 화면 위쪽에 있는 것부터 그려 아래쪽이 앞에 보이게 한다
    var order = [{ y: g.boss.x + g.boss.y, f: drawBoss }, { y: g.player.x + g.player.y, f: drawPlayer }];
    order.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < order.length; i++) order[i].f();
    drawAttacks();
    if (state === 'groggyWait') drawTornado();
    drawMarker();
    drawHits();
    if (zoomed) ctx.restore();
    ctx.restore();
    if (g.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.6 * g.flash / 0.25).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    drawHud();
    if (state === 'groggyAnim' && groggyPhase() === 'eyes') drawCutIn();
  }

  // ===== 메인 루프 =====
  function frame(ts) {
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    var slowed = false;
    if (game) {
      if (game.slow > 0) { game.slow -= dt; slowed = true; }
      game.flash = Math.max(0, game.flash - dt);
      if (!slowed) game.zoom += (1 - game.zoom) * Math.min(1, dt * 8);
    }
    update(slowed ? dt * SLOW_SCALE : dt, slowed);
    updateCamera(dt);
    draw();
    requestAnimationFrame(frame);
  }
  draw();
  requestAnimationFrame(frame);

  // 브라우저 없이 검사할 때 쓰는 고리. 보통 플레이에서는 아무 일도 하지 않는다
  if (typeof window.__G2_TEST_HOOK__ === 'function') {
    window.__G2_TEST_HOOK__({
      getState: function () { return state; },
      getGame: function () { return game; },
      step: function (dt) { // frame 과 같은 순서로 한 틱 돌린다
        var slowed = false;
        if (game) {
          if (game.slow > 0) { game.slow -= dt; slowed = true; }
          game.flash = Math.max(0, game.flash - dt);
          if (!slowed) game.zoom += (1 - game.zoom) * Math.min(1, dt * 8);
        }
        update(slowed ? dt * SLOW_SCALE : dt, slowed);
        updateCamera(dt);
      },
      key: function (k) { onKeyDown({ key: k, preventDefault: function () {} }); },
      keyUp: function (k) { onKeyUp({ key: k }); },
      inAttack: inAttack, makeAttack: makeAttack, draw: draw, telegraphView: telegraphView, markerOuter: markerOuter, groggyPhase: groggyPhase, sprites: SPRITES,
      consts: { LIMIT: LIMIT, BOSS_HP: BOSS_HP, GROGGY_NEED: GROGGY_NEED, TAG_CD: TAG_CD, DODGE_CD: DODGE_CD, SPECIAL_CD: SPECIAL_CD, ULT_MAX: ULT_MAX, CHAR_HP: CHAR_HP, TELEGRAPH: TELEGRAPH, RANGE_SHOW: RANGE_SHOW, GROGGY_TIME: GROGGY_TIME, GROGGY_ANIM: GROGGY_ANIM, INTRO_TIME: INTRO_TIME, HITSTOP: HITSTOP, SLOW_SCALE: SLOW_SCALE, START_DIST: START_DIST, PATTERNS: PATTERNS, TAG_RANGE: TAG_RANGE, DASH_TIME: DASH_TIME, BOSS_R: BOSS_R, COMBO_DMG: COMBO_DMG, COMBO_CD: COMBO_CD, COMBO_RESET: COMBO_RESET, ZOOM: ZOOM, MARK_S: MARK_S, GROGGY_PHASES: GROGGY_PHASES }
    });
  }
})();
