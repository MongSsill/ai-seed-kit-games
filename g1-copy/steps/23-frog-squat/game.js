// 게임 1 완전 카피 (원작: 길건너친구들. 그림과 소리는 원작 것을 쓰지 않고 도형과 직접 만든 소리로 한다)
// 좌표 약속: col 은 0 ~ COLS-1 (왼쪽이 0). row 는 앞으로 갈수록 커진다 (시작 줄이 0).
// 수치는 docs/decisions.md 의 짐작 수치다. 해 보고 고친다.

(function () {
  'use strict';

  // ===== 설정 =====
  var COLS = 9;            // 가로 칸 수
  var ROWS_ON_SCREEN = 14; // 세로로 보이는 줄 수
  var CELL = 48;           // 한 칸의 픽셀 크기
  var START_ROW = 0;       // 시작 줄. 기록은 여기서 0 으로 센다
  var LINE_GAP = 5;        // 뒤처짐 선은 캐릭터 뒤 5칸에서 시작한다
  var LINE_SPEED = 0.5;    // 뒤처짐 선은 2초에 한 칸 (1초에 0.5칸) 올라온다
  var BACK_LIMIT = 4;      // 뒤로 4번 연속 이동하면 게임 오버
  var TOP_MARGIN = 8;      // 캐릭터 위로 최소 이만큼의 줄이 보이게 화면이 따라간다 (플레이 중 캐릭터는 아래에서 6번째 줄)
  var CAMERA_EASE = 0.05;  // 그림용 화면이 미끄러지듯 따라가는 빠르기 (0.15초면 거의 다 따라간다)
  var WRAP_EXTRA = 2;      // 차는 화면 양옆 바깥으로 이만큼 더 달린 뒤 반대편에서 다시 나온다
  var TRAIN_LEN = 12;      // 열차 길이 (칸)
  var TRAIN_WARN = 1.0;    // 열차 예고 사인이 먼저 보이는 시간 (초)
  var TRAIN_PASS = 0.5;    // 열차가 줄을 다 지나가는 시간 (초)
  var CAR_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#00897b'];
  var ROAD_SPEED = [0.6, 1.5]; // 차 빠르기는 줄마다 평균의 0.6~1.5배 (숫자가 작을수록 빠르다)
  var ROAD_SPEED_DIFF = 0.35;  // 같은 방향으로 붙은 두 찻길은 빠르기가 이만큼 넘게 다르다
  var CAR_GAP_SEC = [1.3, 2.8]; // 차 사이 틈은 1.3~2.8초 동안 차가 가는 거리 (적어도 2.5칸)
  var BODY = [8 / 48, 40 / 48]; // 캐릭터가 치이는 판정: 몸통 그림 폭 (한 칸 48픽셀 중 8~40). 세 캐릭터 모두 같다
  var CAR_FRONT_CUT = 3 / 48;   // 차 판정 앞머리: 그림 끝에 맞춘다 (차 그림은 칸 끝에서 3픽셀 안쪽)
  var CAR_TAIL_CUT = 15 / 48;   // 차 판정 꼬리: 그림보다 12픽셀 더 짧게. 지나간 차 꼬리에 치이지 않게 (짐작한 수치, 해 보고 조정)
  var LOG_EXTRA = 3;       // 통나무는 길어서 화면 바깥으로 3칸 더 간 뒤 반대편에서 나온다
  var LOG_SEC = 0.75;      // 통나무 한 칸 평균 0.75초 (차보다 느리다)
  var LOG_SPEED = [0.7, 1.4]; // 통나무 빠르기는 줄마다 평균의 0.7~1.4배
  var LOG_SPEED_DIFF = 0.3;   // 붙은 두 통나무 줄은 빠르기가 이만큼 넘게 다르다
  var LOG_GAP = [1.2, 3.0];   // 통나무 사이 물은 1.2~3칸 (물 구간이 3칸을 넘지 않는다)
  var LOG_INSET = 2 / 48;     // 통나무 그림은 칸 끝에서 2픽셀 안쪽. 캐릭터 몸통 그림이 이 안에 들게 선다
  var WATER = 0, PAD = 1, SUNK = 2; // 고인 물 줄의 칸 값: 물, 사라지는 발판, 가라앉은 자리
  var FROG_STREAK = 15;    // 개구리 해금: 한 판에서 연속 전진 15번
  var BULL_HITS = 30;      // 황소 해금: 여러 판에 걸쳐 차나 열차에 치인 횟수 30번
  var FROG_HOLD = 0.5;     // 개구리: 앞 키를 0.5초 누르고 있다가 떼면 두 칸 점프
  var FROG_SQUAT = [1.12, 0.8]; // 개구리가 앞 키를 누르고 있는 동안 웅크린 모양 (가로, 세로 배율. 모아도 그대로)
  var BULL_SAFE_TIME = 1.0; // 황소가 막아 준 뒤 잠깐 다시 치이지 않는 시간 (초)
  var DEATH_TIME = 0.9;    // 죽는 모습을 보여 준 뒤 결과창을 띄우기까지 (초)
  // 건너갈 수 있나 검사: 찻길과 통나무 덩어리를 만들 때 사람처럼 움직이는 봇이 먼저 건너 본다
  var BOT_DECIDE = 0.25;   // 봇은 0.25초에 한 번 판단한다
  var BOT_LOOK = 1.0;      // 앞 칸이 1초 비어 있어야 들어간다
  var BOT_DANGER = 0.35;   // 지금 칸에 0.35초 안에 차가 오면 뒤로 물러난다
  var BOT_LIMIT = 10;      // 10초 안에 건너야 한다 (붉은 선)
  var BOT_DT = 0.05;       // 봇이 시간을 보내는 단위 (초)
  var BOT_TRIALS = 6;      // 도착 시각과 서 있는 칸을 바꿔 6번 건너 본다
  var BOT_NEED = 5;        // 6번 중 5번 이상 건너야 그 덩어리를 쓴다
  var SEG_TRIES = 30;      // 다시 만드는 횟수 한도
  var FAR_ROW = 100;       // 확인용 ?far 로 시작하는 줄
  var BELL_RINGS = 4;      // 열차 예고 종: 예고 1초 동안 땡 네 번 (0.25초마다)
  var BEST_FLASH = 2.0;    // 최고 기록을 넘긴 순간 "최고 기록!" 글자를 보여 주는 시간 (가장자리 빛은 앞 1초)
  var FX_BAND = 76;        // 반짝이와 색종이는 화면 위쪽 이 높이(픽셀) 안에서만 흩날린다 (앞줄을 가리지 않게)
  var CHARS = [
    { id: 'basic', name: '기본' },
    { id: 'frog', name: '개구리' },
    { id: 'bull', name: '황소' }
  ];

  // ===== 화면 요소 =====
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  canvas.width = COLS * CELL;
  canvas.height = ROWS_ON_SCREEN * CELL;

  var titleEl = document.getElementById('title');
  var overEl = document.getElementById('over');
  var startBtn = document.getElementById('start-btn');
  var restartBtn = document.getElementById('restart-btn');
  var overReasonEl = document.getElementById('over-reason');
  var overScoreEl = document.getElementById('over-score');

  var overBestEl = document.getElementById('over-best');
  var overNewBestEl = document.getElementById('over-newbest');
  var chooseBtn = document.getElementById('choose-btn');
  var questFrogEl = document.getElementById('q-frog');
  var questBullEl = document.getElementById('q-bull');

  function show(el, on) {
    if (on) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

  // ===== 저장 (localStorage: 이 기기, 이 브라우저에 남는다. 브라우저를 닫았다 열어도 남는다) =====
  var SAVE_KEY = 'g1-copy-save-v1';
  function loadSave() {
    var d = { best: 0, carHits: 0, bestStreak: 0, frog: false, bull: false };
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        for (var k in d) if (o && typeof o[k] === typeof d[k]) d[k] = o[k];
      }
    } catch (e) { /* 저장을 못 쓰는 창(시크릿 창 등)에서도 게임은 돌아간다 */ }
    return d;
  }
  function writeSave() {
    if (farStart || testUnlock) return; // 확인용 ?far, ?test 판은 저장하지 않는다 (진짜 기록이 부풀지 않게)
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 저장 못 해도 계속 */ }
  }
  // 확인용 주소: index.html?test 는 캐릭터를 모두 잠깐 풀어 준다 (최고 기록, 치인 횟수도 저장하지 않음). index.html?reset 은 저장을 지운다
  // index.html?far 는 100칸 앞에서 시작한다 (어려워진 판을 바로 보려고. 저장하지 않음)
  var search = (window.location && window.location.search) || '';
  var farStart = search.indexOf('far') >= 0;
  if (search.indexOf('reset') >= 0) {
    try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
  }
  var save = loadSave();
  var testUnlock = search.indexOf('test') >= 0;

  function isUnlocked(id) {
    return id === 'basic' || testUnlock || save[id] === true;
  }
  var chosen = 'basic'; // 고른 캐릭터

  // ===== 소리 (파일 없이 브라우저가 직접 만든다. 브라우저는 버튼이나 키를 누른 뒤에만 소리를 허락한다) =====
  var audio = null;
  var stepSounds = 0; // 낸 걸음 소리 수 (테스트용)
  var deathSounds = []; // 낸 게임 오버 소리 종류 (테스트용)
  var bellSounds = 0;   // 낸 열차 종소리 수 (테스트용)
  var fanfareSounds = 0; // 낸 팡파레 수 (테스트용)
  var knockSounds = 0;  // 황소가 날려 버린 소리 수 (테스트용)
  var noiseBuf = null;  // 쾅, 퐁당, 휘이잉에 쓰는 지직거리는 소리 (한 번만 만든다)
  function initAudio() {
    if (audio) {
      if (audio.state === 'suspended' && audio.resume) audio.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { audio = new AC(); } catch (e) { audio = null; }
  }
  function playStep() { // 톡: 아주 짧게 높은 음에서 낮은 음으로
    if (!audio) return;
    stepSounds += 1;
    var t = audio.currentTime;
    var osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620 + Math.random() * 60, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 음 하나: at 초 뒤에 f0 에서 f1 로 바뀌며 dur 초 동안 작아진다
  function tone(type, f0, f1, at, dur, vol) {
    var t = audio.currentTime + at;
    var osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // 지직거리는 소리를 거름망(filter)에 걸러 낸다. 거름망 주파수가 f0 에서 f1 로 바뀐다
  function noise(at, dur, vol, filterType, f0, f1) {
    if (!noiseBuf) {
      noiseBuf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate); // 1초 분량
      var data = noiseBuf.getChannelData(0);
      for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    var t = audio.currentTime + at;
    var src = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
    src.buffer = noiseBuf;
    filter.type = filterType;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // 게임 오버 소리: 끝난 까닭마다 다르다
  function playDeath(kind) {
    if (!audio) return;
    deathSounds.push(kind);
    if (kind === 'car') { // 쾅: 짧게 부서지는 소리와 낮은 쿵
      noise(0, 0.25, 0.5, 'lowpass', 2500, 300);
      tone('sine', 150, 45, 0, 0.25, 0.5);
    } else if (kind === 'train') { // 콰앙: 더 크고 길게
      noise(0, 0.7, 0.7, 'lowpass', 1800, 120);
      tone('sawtooth', 110, 35, 0, 0.6, 0.3);
    } else if (kind === 'drift') { // 쉬이익: 물살에 쓸려 멀어지는 소리
      noise(0, 0.6, 0.22, 'bandpass', 1400, 250);
      tone('sine', 520, 200, 0, 0.55, 0.1);
    } else if (kind === 'water') { // 퐁당: 짧게 올라가는 물방울 소리 둘과 가벼운 물 튀는 소리
      tone('sine', 380, 1150, 0, 0.09, 0.45);
      tone('sine', 260, 760, 0.1, 0.12, 0.35);
      noise(0, 0.15, 0.08, 'highpass', 3000, 1500);
    } else if (kind === 'hole') { // 휘이잉: 아래로 떨어진다
      tone('sine', 900, 110, 0, 0.75, 0.3);
    } else if (kind === 'line') { // 뿌우: 낮게 두 번 내려간다
      tone('square', 233, 220, 0, 0.2, 0.12);
      tone('square', 175, 150, 0.22, 0.45, 0.12);
    } else if (kind === 'back') { // 끼룩: 날아오는 새의 울음. "끼"는 짧게 올라가고 "룩"은 내려간다
      tone('sawtooth', 1400, 2200, 0, 0.11, 0.06);
      tone('triangle', 1400, 2200, 0, 0.11, 0.1);
      tone('sawtooth', 1900, 1000, 0.13, 0.17, 0.06);
      tone('triangle', 1900, 1000, 0.13, 0.17, 0.1);
    }
  }

  // 황소가 차나 열차를 날려 버릴 때. 차는 쿵 부딪힌 뒤 휘이잉 하고 낮아지며 멀어진다 (무게감은 열차보다 가볍게)
  // 열차는 더 묵직하게: 쾅과 쇠 울림 뒤에 더 낮은 휘이잉 (치여 죽는 콰앙과 구별되게 날아가는 소리를 남긴다)
  function playKnock(kind) {
    if (!audio) return;
    knockSounds += 1;
    if (kind === 'train') {
      noise(0, 0.3, 0.7, 'lowpass', 900, 120);        // 쾅
      tone('sine', 80, 35, 0, 0.35, 0.6);
      tone('triangle', 330, 300, 0, 0.25, 0.12);       // 쇠 울림
      noise(0.12, 0.6, 0.15, 'bandpass', 1200, 150);  // 낮은 휘이잉
      return;
    }
    noise(0, 0.15, 0.55, 'lowpass', 1200, 200);     // 쿵
    tone('sine', 110, 50, 0, 0.18, 0.45);
    noise(0.05, 0.55, 0.2, 'bandpass', 2600, 350);  // 휘이잉
    tone('triangle', 950, 260, 0.05, 0.55, 0.08);
  }

  // 팡파레 (빠바밤!): 도·미·솔을 빠르게 올리고 높은 도를 조금 길게. 최고 기록을 넘긴 순간과 해금한 판의 결과창에서
  function playFanfare() {
    if (!audio) return;
    fanfareSounds += 1;
    tone('square', 523, 523, 0, 0.09, 0.09);
    tone('square', 659, 659, 0.08, 0.09, 0.09);
    tone('square', 784, 784, 0.16, 0.09, 0.09);
    tone('square', 1047, 1047, 0.24, 0.3, 0.1);
    tone('triangle', 1047, 1047, 0.24, 0.3, 0.12);
  }

  // 열차 예고 종: 땡
  function playBell() {
    if (!audio) return;
    bellSounds += 1;
    tone('triangle', 1450, 1400, 0, 0.22, 0.16);
    tone('sine', 2180, 2100, 0, 0.15, 0.07);
  }

  var effects = []; // 날아가는 차, 반짝이 같은 잠깐 보이는 것들

  // ===== 상태 =====
  var mode = 'title'; // title(시작 화면) | playing(플레이 중) | over(결과창)
  var s = null;       // 이번 판의 상태

  function newRun() {
    s = {
      col: Math.floor(COLS / 2),
      row: START_ROW,
      maxRow: START_ROW,                  // 가장 멀리 간 줄. 뒤로 가도 줄지 않는다
      cameraBottom: START_ROW - LINE_GAP, // 화면 맨 아래 줄 번호 (규칙용, 칸 단위). 위로만 올라간다
      viewBottom: START_ROW - LINE_GAP,   // 그림용 화면 맨 아래 위치. cameraBottom 을 미끄러지듯 따라간다
      line: START_ROW - LINE_GAP,         // 뒤처짐 선의 위치 (줄 단위, 소수)
      backCount: 0,                       // 뒤로 연속 이동한 횟수
      time: 0,
      reason: '',
      char: chosen,                       // 이번 판 캐릭터
      streak: 0,                          // 지금 연속 전진 횟수 (개구리 해금 과제)
      runBestStreak: 0,                   // 이번 판 연속 전진 최고
      unlocked: [],                       // 이번 판에 새로 푼 캐릭터
      shieldUsed: false,                  // 황소 막기를 썼나
      invuln: 0,                          // 황소가 막아 준 뒤 남은 무적 시간
      charge: null,                       // 개구리가 앞 키를 누르고 있는 시간 (누르지 않으면 null)
      prevBest: save.best,                // 이 판을 시작할 때의 최고 기록
      bestShown: false,                   // 이번 판에 최고 기록을 넘겼나
      bestFlash: 0,                       // "최고 기록!" 글자를 보여 줄 남은 시간
      deathKind: '',                      // 어떻게 끝났나 (죽는 모습을 고른다)
      hitDir: 0,                          // 치인 차나 열차가 가던 방향
      driftSpeed: 0,                      // 떠내려간 통나무의 빠르기
      dieT: 0,                            // 끝난 뒤 지난 시간
      overShown: false                    // 결과창을 띄웠나
    };
    effects = [];
    resetRows();
    if (farStart) placeFar();
  }

  // 확인용 ?far: 100칸 앞의 첫 풀밭 줄, 가운데에 가장 가까운 빈 칸에서 시작한다
  function placeFar() {
    var r = START_ROW + FAR_ROW;
    while (getRow(r).type !== 'grass') r++;
    var cells = getRow(r).cells, c = -1;
    for (var k = 0; k < COLS; k++) {
      if (cells[k] === FREE && (c < 0 || Math.abs(k - 4) < Math.abs(c - 4))) c = k;
    }
    s.row = r;
    s.col = c;
    s.maxRow = r;
    s.cameraBottom = r - LINE_GAP;
    s.viewBottom = s.cameraBottom;
    s.line = r - LINE_GAP;
    s.prevBest = 0; // 최고 기록 이펙트는 띄우지 않는다
  }

  function score() {
    return s.maxRow - START_ROW;
  }

  // ===== 줄 만들기 =====
  var FREE = 0, TREE = 1, ROCK = 2, HOLE = 3, SIGN = 4; // 풀밭 칸의 값: 빈 칸, 나무, 돌, 빈 공간(구멍), 표지판
  var rows = {};  // 줄 번호 → 그 줄의 내용
  var gen = null; // 다음 줄을 만들 때 쓰는 기억

  function mod(a, n) { return ((a % n) + n) % n; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // lo~hi 에서 아무 수나 고른다. avoid 가 있으면 avoid 와 diff 넘게 떨어진 수만 (양쪽 중 남는 쪽에서)
  function randApart(lo, hi, avoid, diff) {
    if (avoid === null) return rand(lo, hi);
    var below = Math.max(0, avoid - diff - lo), above = Math.max(0, hi - (avoid + diff));
    var x = rand(0, below + above);
    return x < below ? lo + x : avoid + diff + (x - below);
  }

  // 어려워지는 정도: 시작 줄에서 0, 앞으로 갈수록 서서히 올라 100칸에서 1, 그 뒤로는 1 그대로
  function difficulty(r) { return Math.max(0, Math.min(1, (r - START_ROW) / 100)); }

  function emptyCells() {
    var a = [];
    for (var i = 0; i < COLS; i++) a.push(FREE);
    return a;
  }

  function resetRows() {
    rows = {};
    gen = {
      next: START_ROW + 4,           // 여기부터 무작위. 시작 줄부터 3줄 앞까지는 빈 풀밭
      lastType: 'grass',
      segType: 'grass',
      segLeft: 0,
      safeCol: Math.floor(COLS / 2), // 풀밭이 이어질 때 늘 비워 두는 칸 (지나갈 길)
      free: false,                   // 바로 앞 줄이 옆으로 마음대로 다닐 수 있는 줄이었나
      lastLogDir: 0,                 // 바로 앞 줄이 통나무 줄이면 그 방향 (이웃한 통나무 줄은 반대로 흐른다)
      prevRow: null,                 // 바로 앞 줄 (붙은 줄끼리 빠르기를 다르게 하려고)
      queue: [],                     // 덩어리째 만들어 둔 줄 가운데 아직 놓지 않은 줄
      rerolls: 0,                    // 봇이 못 건너서 다시 만든 덩어리 수 (테스트용)
      gaveUp: 0                      // 다시 만들어도 끝내 못 고친 덩어리 수 (테스트에서 0 인지 본다)
    };
    for (var r = START_ROW - LINE_GAP - 1; r < gen.next; r++) {
      var cells = emptyCells();
      if (r < START_ROW) { cells[0] = TREE; cells[COLS - 1] = TREE; }
      if (r === START_ROW - 2) for (var k = 2; k <= 6; k++) cells[k] = SIGN; // 시작 지점 "최고 기록" 표지판
      rows[r] = { type: 'grass', cells: cells };
    }
  }

  function getRow(r) {
    while (gen.next <= r) {
      if (!gen.queue.length) gen.queue = makeSegmentRows(gen.next);
      rows[gen.next] = gen.queue.shift();
      gen.next += 1;
    }
    return rows[r] || { type: 'grass', cells: emptyCells() };
  }

  // 같은 종류가 몇 줄 이어지는 덩어리를 고른다.
  // 풀밭(쉼터) 덩어리와 위험한 줄 덩어리(찻길, 철길, 강)가 번갈아 오고,
  // 어려워지면 위험한 덩어리가 쉼터 없이 두세 개 이어질 수 있다.
  function pickSegment(r) {
    var t = difficulty(r);
    // 줄 10개 중 비율: 풀밭 4·찻길 3·철길 1·강 2 → 풀밭 2·찻길 4·철길 2·강 2
    var grassShare = lerp(4, 2, t) / 10;
    var share = { road: lerp(3, 4, t), rail: lerp(1, 2, t), river: 2 };
    // 한 덩어리의 줄 수. 찻길 연속 차선 2~4 → 3~6
    var len = {
      grass: [1, 2],
      road: [Math.round(lerp(2, 3, t)), Math.round(lerp(4, 6, t))],
      rail: [1, 2],
      river: [1, 3]
    };
    function avg(k) { return (len[k][0] + len[k][1]) / 2; }

    // 위험한 덩어리를 고르는 무게 = 줄 수 비율 / 덩어리 평균 길이
    var types = ['road', 'rail', 'river'];
    var weights = {}, total = 0, meanLen = 0, i;
    for (i = 0; i < types.length; i++) { weights[types[i]] = share[types[i]] / avg(types[i]); total += weights[types[i]]; }
    for (i = 0; i < types.length; i++) meanLen += weights[types[i]] / total * avg(types[i]);

    // 위험한 덩어리 다음에 쉼터가 올 확률. 풀밭 비율이 맞도록 거꾸로 계산한다
    var restChance = Math.min(1, meanLen * grassShare / (avg('grass') * (1 - grassShare)));

    var type;
    if (gen.lastType !== 'grass' && Math.random() < restChance) {
      type = 'grass';
    } else {
      // 같은 종류를 바로 다시 고르지 않는다
      var pickTotal = 0;
      for (i = 0; i < types.length; i++) if (types[i] !== gen.lastType) pickTotal += weights[types[i]];
      var x = Math.random() * pickTotal;
      for (i = 0; i < types.length; i++) {
        if (types[i] === gen.lastType) continue;
        type = types[i];
        if (x < weights[types[i]]) break;
        x -= weights[types[i]];
      }
    }
    gen.segType = type;
    gen.segLeft = randInt(len[type][0], len[type][1]);
  }

  // 덩어리 하나를 한꺼번에 만든다. 찻길과 강은 봇이 먼저 건너 보고, 못 건너면 처음부터 다시 만든다
  function makeSegmentRows(r) {
    pickSegment(r);
    var type = gen.segType, n = gen.segLeft;
    var keep = { safeCol: gen.safeCol, free: gen.free, lastLogDir: gen.lastLogDir, prevRow: gen.prevRow };
    var list = [];
    for (var tries = 1; tries <= SEG_TRIES; tries++) {
      gen.safeCol = keep.safeCol;
      gen.free = keep.free;
      gen.lastLogDir = keep.lastLogDir;
      gen.prevRow = keep.prevRow;
      list = [];
      for (var i = 0; i < n; i++) list.push(makeRow(type, difficulty(r + i)));
      if (type !== 'road' && type !== 'river') break;
      if (canCross(list)) break;
      gen.rerolls += 1;
      if (tries === SEG_TRIES) gen.gaveUp += 1;
    }
    gen.lastType = type;
    return list;
  }

  function makeRow(type, t) {
    var row;
    if (type === 'grass') row = makeGrassRow(t);
    else if (type === 'road') row = makeRoadRow(t, gen.prevRow);
    else if (type === 'rail') row = makeRailRow(t);
    else row = makeRiverRow(t, gen.prevRow);
    gen.lastLogDir = isLogRow(row) ? row.dir : 0;
    gen.prevRow = row;
    return row;
  }

  function makeGrassRow(t) {
    // 바로 앞 줄에서 옆으로 마음대로 다닐 수 있었으면 지나갈 칸을 새로 고른다
    if (gen.free) gen.safeCol = randInt(0, COLS - 1);
    var cells = emptyCells();
    var n = randInt(0, 3); // 나무와 돌 0~3개
    for (var i = 0; i < n; i++) cells[randInt(0, COLS - 1)] = Math.random() < 0.6 ? TREE : ROCK;
    if (Math.random() < 0.3) { // 풀밭 줄의 30% 에 빈 공간 1~3칸
      var h = randInt(1, 3);
      for (var j = 0; j < h; j++) {
        var c = randInt(0, COLS - 1);
        if (cells[c] === FREE) cells[c] = HOLE;
      }
    }
    cells[gen.safeCol] = FREE; // 지나갈 칸은 반드시 남긴다
    gen.free = false;
    return { type: 'grass', cells: cells };
  }

  // 찻길: 한 방향으로 차가 돈다. 차 한 칸 평균 0.5초 (어려워지면 0.3초)
  // 줄마다 빠르기를 크게 다르게 하고, 차 사이 틈은 칸이 아니라 시간으로 정한다 (빠른 줄은 차가 드문드문, 느린 줄은 촘촘)
  function makeRoadRow(t, prev) {
    gen.free = true;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var sameDir = prev && prev.type === 'road' && prev.dir === dir;
    var f = randApart(ROAD_SPEED[0], ROAD_SPEED[1], sameDir ? prev.f : null, ROAD_SPEED_DIFF);
    var secPerCell = lerp(0.5, 0.3, t) * f;
    var L = COLS + WRAP_EXTRA * 2; // 차가 한 바퀴 도는 길이
    var wrapGap = Math.max(2.5, CAR_GAP_SEC[0] / secPerCell);
    var cars = [];
    var x = rand(0, 3);
    while (true) {
      var len = Math.random() < 0.25 ? 2 : 1;  // 넷에 하나는 긴 트럭
      if (cars.length && x + len > L - wrapGap) break; // 한 바퀴 이어지는 곳에도 틈을 남긴다
      cars.push({ base: x, len: len, color: CAR_COLORS[randInt(0, CAR_COLORS.length - 1)] });
      x += len + Math.max(2.5, rand(CAR_GAP_SEC[0], CAR_GAP_SEC[1]) / secPerCell);
    }
    return { type: 'road', dir: dir, f: f, speed: dir / secPerCell, L: L, extra: WRAP_EXTRA, offset: rand(0, L), cars: cars };
  }

  // 철길: 기다림 → 예고 사인 1초 → 열차가 0.5초 안에 지나감 → 다시 기다림
  function makeRailRow(t) {
    gen.free = true;
    return { type: 'rail', dir: Math.random() < 0.5 ? 1 : -1, phase: 'wait', timer: rand(1.5, 6), trainX: 0, trainSpeed: 0 };
  }

  // 강: 넷에 하나는 고인 물에 사라지는 발판이 떠 있는 줄, 나머지는 통나무(움직이는 발판)가 떠내려가는 줄
  function makeRiverRow(t, prev) {
    if (Math.random() < 0.25) {
      if (gen.free) gen.safeCol = randInt(0, COLS - 1);
      var pads = [];
      for (var c = 0; c < COLS; c++) pads.push(Math.random() < 0.4 ? PAD : WATER);
      pads[gen.safeCol] = PAD; // 앞뒤 줄과 이어지는 칸에는 반드시 발판
      gen.free = false;
      return { type: 'river', still: true, pads: pads };
    }
    gen.free = true;
    var dir = gen.lastLogDir ? -gen.lastLogDir : (Math.random() < 0.5 ? 1 : -1);
    var f = randApart(LOG_SPEED[0], LOG_SPEED[1], prev && isLogRow(prev) ? prev.f : null, LOG_SPEED_DIFF);
    var L = COLS + LOG_EXTRA * 2;
    // 통나무 길이를 먼저 정하고(3칸 → 2칸), 남은 물을 통나무 사이 틈으로 나눈다
    var lens = [], total = 0;
    do {
      var len = Math.random() < t ? 2 : 3;
      lens.push(len);
      total += len;
    } while (L - total > lens.length * LOG_GAP[1]);
    var gaps = splitWater(L - total, lens.length);
    var logs = [], x = 0;
    for (var i = 0; i < lens.length; i++) {
      logs.push({ base: x, len: lens[i] });
      x += lens[i] + gaps[i];
    }
    return { type: 'river', still: false, dir: dir, f: f, speed: dir / (LOG_SEC * f), L: L, extra: LOG_EXTRA, offset: rand(0, L), cars: logs };
  }

  // 물 water 칸을 n 개의 틈으로 나눈다. 틈마다 1.2~3칸
  function splitWater(water, n) {
    var gaps = [], i, left = water - n * LOG_GAP[0];
    for (i = 0; i < n; i++) gaps.push(LOG_GAP[0]);
    while (left > 1e-6) {
      var room = [];
      for (i = 0; i < n; i++) if (gaps[i] < LOG_GAP[1] - 1e-6) room.push(i);
      if (!room.length) break;
      var j = room[randInt(0, room.length - 1)];
      var add = Math.min(left, LOG_GAP[1] - gaps[j], rand(0.1, 0.6));
      gaps[j] += add;
      left -= add;
    }
    return gaps;
  }

  // ===== 건너갈 수 있나 (줄을 만들 때 검사) =====
  // 이어진 찻길 줄과 이어진 통나무 줄마다 봇이 6번 건너 보고, 5번 이상 건너면 쓴다
  function canCross(list) {
    var i = 0;
    while (i < list.length) {
      var kind = list[i].type === 'road' ? 'road' : (isLogRow(list[i]) ? 'log' : '');
      if (!kind) { i++; continue; }
      var lanes = [];
      while (i < list.length && (kind === 'road' ? list[i].type === 'road' : isLogRow(list[i]))) lanes.push(list[i++]);
      var crossed = 0;
      for (var k = 0; k < BOT_TRIALS; k++) if (botCross(lanes, kind, k * 1.3, (k * 3 + 1) % COLS)) crossed++;
      if (crossed < BOT_NEED) return false;
    }
    return true;
  }

  // 사람처럼 바로 앞 줄만 보고 움직이는 봇. 지금부터 t0 초 뒤에 col 칸 풀밭에 도착했다고 보고 건너 본다
  function botCross(lanes, kind, t0, col) {
    var n = lanes.length, lane = 0, t = t0, next = t0;
    while (t - t0 < BOT_LIMIT) {
      if (t >= next - 1e-9) {
        next += BOT_DECIDE;
        if (lane === n) return true; // 마지막 줄에서 앞으로 나가면 끝
        var ahead = lanes[lane], here = lane > 0 ? lanes[lane - 1] : null;
        if (kind === 'road') {
          if (roadFreeFor(ahead, col, t, BOT_LOOK)) lane += 1;
          else if (here && !roadFreeFor(here, col, t, BOT_DANGER) && (lane === 1 || roadFreeFor(lanes[lane - 2], col, t, BOT_DANGER))) lane -= 1;
        } else {
          var land = logCellAt(ahead, col, t);
          if (land !== null && onScreen(land + ahead.speed * BOT_LOOK)) { lane += 1; col = land; }
          else if (here && !onScreen(col + here.speed * 1.0)) { // 끝으로 밀려 가면 흐름 반대로 한 칸
            var nc = col - (here.speed > 0 ? 1 : -1), on = logCellAt(here, nc, t);
            if (nc >= 0 && nc <= COLS - 1 && on !== null) col = on;
          }
        }
      }
      t += BOT_DT;
      if (lane > 0) {
        var row = lanes[lane - 1];
        if (kind === 'road') {
          if (carAtCell(row, col, t)) return false;
        } else {
          col += row.speed * BOT_DT;
          if (!onScreen(col)) return false;
        }
      }
    }
    return false;
  }

  function roadFreeFor(row, col, t, sec) {
    for (var u = 0; u <= sec + 1e-9; u += BOT_DT) if (carAtCell(row, col, t + u)) return false;
    return true;
  }

  function onScreen(col) {
    return col >= -0.5 && col <= COLS - 0.5;
  }

  function isLogRow(row) {
    return row.type === 'river' && !row.still;
  }

  // 차와 통나무의 지금 왼쪽 끝 위치 (칸 단위). carXAt 은 지금부터 t 초 뒤의 위치
  function carX(row, car) {
    return carXAt(row, car, 0);
  }
  function carXAt(row, car, t) {
    return mod(car.base + row.offset + row.speed * t, row.L) - row.extra;
  }

  // 그 찻길의 col 칸에 t 초 뒤 닿아 있는 차 (없으면 null). 줄을 만들 때 봇만 쓴다
  // 봇은 캐릭터보다 넓은 판정(몸통 0.15~0.85, 차 전체 길이)으로 건너 봐서, 넉넉히 건너갈 수 있는 판만 남긴다
  function carAtCell(row, col, t) {
    var a = col + 0.15, b = col + 0.85; // 봇 몸통 (칸보다 조금 작게)
    for (var i = 0; i < row.cars.length; i++) {
      var car = row.cars[i], x = carXAt(row, car, t);
      if (x < b && x + car.len > a) return car;
    }
    return null;
  }

  // 캐릭터가 그 찻길의 col 칸에서 지금 치이는 차 (없으면 null). 차 앞머리는 그림 끝, 꼬리는 그림보다 짧게 본다
  function carHitting(row, col) {
    var a = col + BODY[0], b = col + BODY[1];
    var cutL = row.dir > 0 ? CAR_TAIL_CUT : CAR_FRONT_CUT; // 오른쪽으로 가는 차는 왼쪽 끝이 꼬리
    var cutR = row.dir > 0 ? CAR_FRONT_CUT : CAR_TAIL_CUT;
    for (var i = 0; i < row.cars.length; i++) {
      var car = row.cars[i], x = carX(row, car);
      if (x + cutL < b && x + car.len - cutR > a) return car;
    }
    return null;
  }

  // 통나무 줄의 col 에 t 초 뒤 서면 올라서는 통나무 칸의 위치 (물이면 null). 줄을 만들 때 봇만 쓴다
  function logCellAt(row, col, t) {
    var center = col + 0.5;
    for (var i = 0; i < row.cars.length; i++) {
      var x = carXAt(row, row.cars[i], t), len = row.cars[i].len;
      if (center >= x && center <= x + len) return x + Math.min(len - 1, Math.max(0, Math.floor(center - x)));
    }
    return null;
  }

  // 캐릭터가 통나무 줄의 col 에 서면 서는 자리 (물이면 null). 사는지는 가운데 점이 통나무 위인지로 본다
  // 몸통 그림이 통나무 그림 안이면 그 자리 그대로 (옆으로 옮기지 않아 곧게 앞으로 간다), 끝 밖으로 삐져나오면 그만큼만 안쪽으로 민다
  function logLandAt(row, col) {
    var center = col + 0.5;
    for (var i = 0; i < row.cars.length; i++) {
      var x = carX(row, row.cars[i]), len = row.cars[i].len;
      if (center >= x && center <= x + len) return Math.min(x + len - LOG_INSET - BODY[1], Math.max(x + LOG_INSET - BODY[0], col));
    }
    return null;
  }

  // 지금 칸에서 강 위에 서 있을 수 있나. 통나무 위면 끝에 걸치지 않게 선다
  function standOnRiver() {
    var row = getRow(s.row);
    if (row.still) return row.pads[s.col] === PAD;
    var x = logLandAt(row, s.col);
    if (x === null) return false;
    s.col = x;
    return true;
  }

  // 사라지는 발판: 밟았던 발판은 떠나면 가라앉는다
  function leaveCell(row, col) {
    if (row.type === 'river' && row.still && row.pads[col] === PAD) row.pads[col] = SUNK;
  }

  function updateRail(row, dt) {
    row.timer -= dt;
    if (row.phase === 'wait' && row.timer <= 0) {
      row.phase = 'warn';
      row.bells = 0; // 이번 예고에 울린 종 수
      row.timer = TRAIN_WARN;
    } else if (row.phase === 'warn' && row.timer <= 0) {
      row.phase = 'pass';
      row.trainX = row.dir > 0 ? -TRAIN_LEN : COLS;
      row.trainSpeed = row.dir * (COLS + TRAIN_LEN) / TRAIN_PASS;
    } else if (row.phase === 'pass') {
      row.trainX += row.trainSpeed * dt;
      if ((row.dir > 0 && row.trainX >= COLS) || (row.dir < 0 && row.trainX <= -TRAIN_LEN)) {
        row.phase = 'wait';
        row.timer = rand(3, 7);
      }
    }
  }

  // 화면에 보이는 줄의 차와 열차를 움직인다
  function updateRows(dt) {
    // 그림용 화면이 아직 따라오는 중이면 그 아래 줄도 움직인다 (화면에 보이므로)
    var from = Math.max(s.cameraBottom - 3, Math.min(s.cameraBottom, Math.floor(s.viewBottom))) - 1;
    for (var r = from; r <= s.cameraBottom + ROWS_ON_SCREEN + 1; r++) {
      var row = getRow(r);
      if (row.type === 'road' || isLogRow(row)) row.offset += row.speed * dt;
      else if (row.type === 'rail') {
        updateRail(row, dt);
        // 붉은 불이 깜빡이는 동안, 화면에 보이고 붉은 선 앞에 있는 철길이면 땡땡 종이 울린다 (불이 켜진 때부터 0, 0.25, 0.5, 0.75초)
        // 붉은 선이 철길 줄의 아래 끝을 넘으면 지나간 곳이라 울리지 않는다
        if (row.phase === 'warn' && mode === 'playing' && r > s.line && r >= s.cameraBottom && r < s.cameraBottom + ROWS_ON_SCREEN) {
          var due = Math.min(BELL_RINGS, Math.floor((TRAIN_WARN - row.timer) / (TRAIN_WARN / BELL_RINGS) + 1e-6) + 1);
          if (row.bells < due) {
            row.bells = due;
            playBell();
          }
        }
      }
    }
  }

  // 그 칸에 차나 열차가 닿아 있으면 무엇인지 돌려준다
  function trafficAt(r, col) {
    var row = getRow(r);
    var a = col + BODY[0], b = col + BODY[1]; // 캐릭터 몸통 그림 폭
    if (row.type === 'road') {
      var car = carHitting(row, col);
      if (car) return { kind: 'car', row: row, car: car, r: r };
    } else if (row.type === 'rail' && row.phase === 'pass') {
      if (row.trainX < b && row.trainX + TRAIN_LEN > a) return { kind: 'train', row: row, r: r };
    }
    return null;
  }

  function checkTraffic() {
    var hit = trafficAt(s.row, s.col);
    if (hit) onHit(hit);
  }

  function onHit(hit) {
    if (s.invuln > 0) return;
    if (s.char === 'bull' && !s.shieldUsed) { // 황소: 차나 열차에 치여 죽는 것을 한 판에 한 번 막아 준다
      s.shieldUsed = true;
      s.invuln = BULL_SAFE_TIME;
      knockAway(hit);
      return;
    }
    s.hitDir = hit.row.dir; // 열차에 치이면 이쪽으로 날아간다
    gameOver(hit.kind === 'train' ? '열차에 치였다' : '차에 치였다', hit.kind);
  }

  // 황소가 막은 차나 열차를 길에서 치우고, 온 쪽으로 빙글빙글 날려 보낸다
  function knockAway(hit) {
    playKnock(hit.kind);
    if (hit.kind === 'car') {
      var i = hit.row.cars.indexOf(hit.car);
      if (i >= 0) hit.row.cars.splice(i, 1);
      effects.push({ type: 'car', r: hit.r, x: carX(hit.row, hit.car), len: hit.car.len, dir: hit.row.dir, color: hit.car.color, vx: -hit.row.dir * 14, t: 0 });
    } else {
      effects.push({ type: 'train', r: hit.r, x: hit.row.trainX, dir: hit.row.dir, vx: -hit.row.dir * 30, t: 0 });
      hit.row.phase = 'wait';
      hit.row.timer = rand(3, 7);
    }
  }

  function cellAt(r, c) {
    var row = getRow(r);
    return row.type === 'grass' ? row.cells[c] : FREE;
  }

  function isBlocked(r, c) {
    var v = cellAt(r, c);
    return v === TREE || v === ROCK || v === SIGN;
  }

  function startRun() {
    initAudio(); // 시작 버튼이나 Enter 를 누른 바로 그때 소리를 켠다
    newRun();
    mode = 'playing';
    show(titleEl, false);
    show(overEl, false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function gameOver(reason, kind) {
    if (mode !== 'playing') return;
    s.reason = reason;
    s.deathKind = kind || 'line';
    playDeath(s.deathKind);
    mode = 'over';
    // 황소 해금 과제: 차나 열차에 치여 죽은 횟수 (황소가 막아 준 것은 여기까지 오지 않아 세지 않는다)
    if (kind === 'car' || kind === 'train') {
      save.carHits += 1;
      if (!save.bull && save.carHits >= BULL_HITS) { save.bull = true; s.unlocked.push('bull'); }
    }
    s.newBest = score() > save.best;
    if (s.newBest) save.best = score();
    writeSave();
    overReasonEl.textContent = reason;
    overScoreEl.textContent = String(score());
    overBestEl.textContent = String(save.best);
    show(overNewBestEl, s.newBest);
    showQuests();
    s.dieT = 0; // 결과창은 죽는 모습을 보여 준 뒤에 띄운다 (update 에서)
    s.overShown = false;
  }

  // 플레이 중 최고 기록을 넘긴 순간: 기록 숫자 둘레에 반짝이, 화면 위 두 모서리에서 색종이 (모두 위쪽 띠 안에서만)
  function burst() {
    var colors = ['#ffd54f', '#ffffff', '#ff8a65', '#c6ff00', '#4fc3f7', '#f06292'];
    for (var i = 0; i < 20; i++) {
      effects.push({ type: 'spark', px: canvas.width / 2, py: 26, vx: rand(-200, 200), vy: rand(-90, 30), g: 160, life: 1.0, color: colors[i % 4], t: 0 });
    }
    for (i = 0; i < 28; i++) {
      var left = i % 2 === 0;
      effects.push({ type: 'confetti', px: left ? 0 : canvas.width, py: rand(0, 10), vx: (left ? 1 : -1) * rand(60, 220), vy: rand(0, 70), g: 60, life: 1.2,
        color: colors[i % colors.length], rot: rand(0, Math.PI), spin: rand(-12, 12), t: 0 });
    }
  }

  // 결과창: 개구리와 황소 해금 과제를 달성했는지
  function showQuests() {
    var frogNew = s.unlocked.indexOf('frog') >= 0, bullNew = s.unlocked.indexOf('bull') >= 0;
    // 잠긴 캐릭터는 이름 대신 ? (해금되는 순간에 이름을 보여 준다)
    questFrogEl.textContent = frogNew ? '개구리 해금! 연속 전진 ' + FROG_STREAK + '/' + FROG_STREAK + ' 달성'
      : save.frog ? '개구리: 해금됨'
      : '? 해금 과제: 연속 전진 최고 ' + save.bestStreak + '/' + FROG_STREAK + ' (이번 판 ' + s.runBestStreak + ')';
    questFrogEl.className = frogNew ? 'quest done' : 'quest';
    questBullEl.textContent = bullNew ? '황소 해금! 차에 치인 횟수 ' + BULL_HITS + '/' + BULL_HITS + ' 달성'
      : save.bull ? '황소: 해금됨'
      : '? 해금 과제: 차에 치인 횟수 ' + save.carHits + '/' + BULL_HITS;
    questBullEl.className = bullNew ? 'quest done' : 'quest';
  }

  // ===== 캐릭터 고르는 화면 =====
  function progressText(id) {
    if (id === 'frog') return save.frog ? '해금됨' : '연속 전진 최고 ' + save.bestStreak + '/' + FROG_STREAK;
    if (id === 'bull') return save.bull ? '해금됨' : '차에 치인 횟수 ' + save.carHits + '/' + BULL_HITS;
    return '처음부터 열림';
  }

  function refreshCards() {
    for (var i = 0; i < CHARS.length; i++) {
      var c = CHARS[i], open = isUnlocked(c.id);
      document.getElementById('card-' + c.id).className = 'card' + (open ? '' : ' locked') + (chosen === c.id ? ' selected' : '');
      document.getElementById('name-' + c.id).textContent = open ? c.name : '?';
      var hint = document.getElementById('hint-' + c.id); // 아래 설명 줄의 이름 (기본 캐릭터는 없음)
      if (hint) hint.textContent = open ? c.name : '?';
      document.getElementById('prog-' + c.id).textContent = progressText(c.id);
      var pic = document.getElementById('pic-' + c.id), pctx = pic.getContext('2d');
      pctx.clearRect(0, 0, pic.width, pic.height);
      drawCharacter(pctx, c.id, 0, 0, pic.width, { silhouette: !open }); // 잠긴 캐릭터는 검정 실루엣
      if (!open) {
        pctx.fillStyle = '#fff';
        pctx.font = 'bold 30px sans-serif';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText('?', pic.width / 2, pic.height / 2 + 2);
      }
    }
  }

  function cycleChar(dir) {
    var i = 0;
    for (var k = 0; k < CHARS.length; k++) if (CHARS[k].id === chosen) i = k;
    for (var step = 1; step <= CHARS.length; step++) {
      var j = mod(i + dir * step, CHARS.length);
      if (isUnlocked(CHARS[j].id)) { chosen = CHARS[j].id; break; }
    }
    refreshCards();
  }

  function goToTitle() {
    mode = 'title';
    newRun(); // 시작 화면 뒤에 보일 새 판
    show(overEl, false);
    show(titleEl, true);
    refreshCards();
  }

  // 개구리: 두 칸 앞이 나무나 돌이면 한 칸만
  function frogJump() {
    if (!tryMove(0, 2)) tryMove(0, 1);
  }

  // ===== 이동 =====
  function tryMove(dcol, drow) {
    if (mode !== 'playing') return false;
    var newRow = s.row + drow;
    var newCol = s.col + dcol;
    if (!isLogRow(getRow(newRow))) newCol = Math.round(newCol); // 통나무 줄이 아니면 칸에 맞춘다
    if (dcol !== 0 && (newCol < 0 || newCol > COLS - 1)) return false; // 옆으로는 판 밖으로 못 나간다
    if (newRow < s.cameraBottom) return false;         // 화면 아래 끝 밖으로는 못 간다
    if (isBlocked(newRow, newCol)) return false;       // 나무와 돌에는 막히기만 한다
    var fromRow = getRow(s.row), fromCol = s.col;
    s.col = newCol;
    s.row = newRow;
    leaveCell(fromRow, fromCol);
    afterMove(dcol, drow);
    return true;
  }

  // 실제로 한 칸 움직인 뒤에 한 번 부른다 (막혀서 못 간 입력에는 부르지 않는다)
  function afterMove(dcol, drow) {
    playStep();

    // 뒤로 4번 연속: 실제로 뒤로 가면 1 더하고, 앞이나 옆으로 실제로 가면 0 으로
    if (drow < 0) s.backCount += 1;
    else s.backCount = 0;

    // 가장 멀리 간 줄을 넘을 때만 기록이 오른다
    if (s.row > s.maxRow) s.maxRow = s.row;

    // 이번 판에 최고 기록을 넘기는 순간 (처음 하는 판은 빼고)
    if (!s.bestShown && s.prevBest > 0 && score() > s.prevBest) {
      s.bestShown = true;
      s.bestFlash = BEST_FLASH;
      burst();
      playFanfare();
    }

    // 앞으로 가면 뒤처짐 선도 캐릭터 뒤 5칸까지 끌려 올라온다 (내려가지는 않는다)
    if (drow > 0 && s.row - LINE_GAP > s.line) s.line = s.row - LINE_GAP;

    // 화면이 캐릭터를 따라 올라간다 (내려오지는 않는다)
    var wantBottom = s.row + TOP_MARGIN - (ROWS_ON_SCREEN - 1);
    if (wantBottom > s.cameraBottom) s.cameraBottom = wantBottom;

    if (s.backCount >= BACK_LIMIT) { gameOver('새가 낚아채갔다', 'back'); return; }
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다', 'line'); return; }
    if (cellAt(s.row, s.col) === HOLE) { gameOver('빈 공간에 빠졌다', 'hole'); return; }
    if (getRow(s.row).type === 'river' && !standOnRiver()) { gameOver('물에 빠졌다', 'water'); return; }
    checkTraffic();
    if (mode !== 'playing') return; // 차나 열차에 치인 걸음
    countStreak(drow);
  }

  // 개구리 해금 과제: 실제로 앞으로 가서 살아남은 걸음만 센다 (죽는 걸음은 세지 않는다).
  // 옆이나 뒤로 실제로 가면 0. 개구리를 쓰는 중에는 따지지 않는다
  function countStreak(drow) {
    if (s.char === 'frog') return;
    if (drow > 0) s.streak += 1;
    else s.streak = 0;
    if (s.streak > s.runBestStreak) s.runBestStreak = s.streak;
    if (s.streak > save.bestStreak) { save.bestStreak = s.streak; writeSave(); }
    if (!save.frog && s.streak >= FROG_STREAK) { save.frog = true; s.unlocked.push('frog'); writeSave(); }
  }

  // ===== 키 =====
  var KEYS = {
    ArrowUp: [0, 1], KeyW: [0, 1],
    ArrowDown: [0, -1], KeyS: [0, -1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (mode === 'title' || mode === 'over') {
        e.preventDefault();
        startRun();
      }
      return;
    }
    if (mode === 'over' && e.code === 'Escape') { goToTitle(); return; }
    var d = KEYS[e.code];
    if (!d) return;
    e.preventDefault();
    if (e.repeat) return; // 키를 꾹 눌러도 한 칸만
    if (mode === 'title') { // 시작 화면: 왼쪽 오른쪽으로 캐릭터 고르기
      if (d[0] !== 0) cycleChar(d[0]);
      return;
    }
    if (mode !== 'playing') return;
    if (s.char === 'frog' && d[1] === 1) { // 개구리: 앞 키를 떼면 한 칸, 0.5초 넘게 누르고 있다가 떼면 두 칸
      if (s.charge === null) s.charge = 0;
      return;
    }
    tryMove(d[0], d[1]);
  });

  window.addEventListener('keyup', function (e) {
    var d = KEYS[e.code];
    if (!d || d[1] !== 1 || mode !== 'playing' || s.charge === null) return;
    var full = s.charge >= FROG_HOLD;
    s.charge = null;
    if (full) frogJump(); // 0.5초 넘게 모았다가 떼면 두 칸
    else tryMove(0, 1);   // 그 전에 떼면 한 칸
  });

  startBtn.addEventListener('click', function () { if (mode !== 'playing') startRun(); });
  restartBtn.addEventListener('click', function () { if (mode !== 'playing') startRun(); });
  chooseBtn.addEventListener('click', function () { if (mode === 'over') goToTitle(); });
  CHARS.forEach(function (c) {
    document.getElementById('card-' + c.id).addEventListener('click', function () {
      if (mode === 'title' && isUnlocked(c.id)) { chosen = c.id; refreshCards(); }
    });
  });

  // ===== 매 화면마다 =====
  function update(dt) {
    // 그림용 화면은 규칙용 화면 위치를 미끄러지듯 따라간다 (이징)
    s.viewBottom += (s.cameraBottom - s.viewBottom) * (1 - Math.exp(-dt / CAMERA_EASE));
    if (Math.abs(s.cameraBottom - s.viewBottom) < 0.01) s.viewBottom = s.cameraBottom; // 0.5 픽셀보다 덜 남으면 딱 맞춘다
    updateRows(dt); // 시작 화면과 결과창 뒤에서도 차는 다닌다
    updateEffects(dt);
    if (mode === 'over' && !s.overShown) {
      s.dieT += dt;
      if (s.dieT >= DEATH_TIME) {
        s.overShown = true;
        show(overEl, true);
        if (s.unlocked.length) playFanfare(); // 이번 판에 캐릭터를 풀었으면 결과창이 뜰 때 팡파레
      }
    }
    if (mode !== 'playing') return;
    s.time += dt;
    s.line += LINE_SPEED * dt;
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다', 'line'); return; }
    if (s.invuln > 0) s.invuln -= dt;
    if (s.bestFlash > 0) s.bestFlash -= dt;
    if (s.charge !== null) s.charge += dt; // 개구리가 점프를 모으는 시간. 뛰는 것은 키를 뗄 때
    var here = getRow(s.row);
    if (isLogRow(here)) { // 통나무를 탄 채로 함께 떠내려간다
      s.col += here.speed * dt;
      if (s.col < -0.5 || s.col > COLS - 0.5) {
        s.driftSpeed = here.speed; // 끝난 뒤에도 이 빠르기로 흘러가 화면 밖으로 사라진다
        gameOver('통나무를 탄 채 화면 밖으로 떠내려갔다', 'drift');
        return;
      }
    }
    checkTraffic();
  }

  function updateEffects(dt) {
    for (var i = effects.length - 1; i >= 0; i--) {
      var e = effects[i];
      e.t += dt;
      if (e.type === 'spark' || e.type === 'confetti') {
        e.px += e.vx * dt;
        e.py += e.vy * dt;
        e.vy += e.g * dt;
        if (e.spin) e.rot += e.spin * dt;
        if (e.t > e.life || e.py > FX_BAND) effects.splice(i, 1); // 위쪽 띠 밖으로 나가면 바로 사라진다
        continue;
      }
      e.x += e.vx * dt;
      if (e.t > 1.0) effects.splice(i, 1);
    }
  }

  // ===== 그리기 =====
  // 줄 번호 → 화면 y 픽셀 (그림용 화면 기준). 정수 픽셀로 맞춰 줄 사이에 틈이 보이지 않게 한다
  function rowToY(row) {
    return Math.round((ROWS_ON_SCREEN - 1 - (row - s.viewBottom)) * CELL);
  }

  // 칸 왼쪽 위 (x, y) 에서 pts 꼭짓점을 이어 칠한다. line 이 있으면 테두리도
  function fillPoly(x, y, pts, fill, line) {
    ctx.beginPath();
    ctx.moveTo(x + pts[0][0], y + pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i][0], y + pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (line) {
      ctx.strokeStyle = line;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawRowBase(r) {
    var row = getRow(r);
    var y = rowToY(r);
    var x;
    if (row.type === 'grass') {
      if (r < START_ROW) ctx.fillStyle = (r % 2 === 0) ? '#8d8d6e' : '#7f7f63'; // 시작 줄 뒤쪽
      else ctx.fillStyle = (r % 2 === 0) ? '#4caf50' : '#43a047';
      ctx.fillRect(0, y, canvas.width, CELL);
    } else if (row.type === 'road') {
      ctx.fillStyle = '#50535c';
      ctx.fillRect(0, y, canvas.width, CELL);
      if (getRow(r + 1).type === 'road') { // 바로 위 줄도 찻길이면 차선 점선
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (x = 6; x < canvas.width; x += 36) ctx.fillRect(x, y - 1, 18, 3);
      }
    } else if (row.type === 'rail') {
      ctx.fillStyle = '#7a6a5c';
      ctx.fillRect(0, y, canvas.width, CELL);
      ctx.fillStyle = '#5a4636'; // 침목
      for (x = 4; x < canvas.width; x += 16) ctx.fillRect(x, y + 8, 7, CELL - 16);
      ctx.fillStyle = '#c9c9c9'; // 레일 두 줄
      ctx.fillRect(0, y + 13, canvas.width, 4);
      ctx.fillRect(0, y + CELL - 17, canvas.width, 4);
    } else {
      ctx.fillStyle = row.still ? '#2f7fc4' : '#3b8fd6'; // 고인 물은 조금 더 짙게
      ctx.fillRect(0, y, canvas.width, CELL);
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; // 물결
      for (x = ((r * 37) % 60 + 60) % 60; x < canvas.width; x += 60) ctx.fillRect(x, y + 14 + ((r % 3) + 3) % 3 * 6, 20, 2);
    }
  }

  function drawCar(px, y, len, dir, color) {
    var w = len * CELL - 6, h = 30, left = px + 3, top = y + 9;
    ctx.fillStyle = '#222'; // 바퀴
    ctx.fillRect(left + 5, top - 3, 10, 4);
    ctx.fillRect(left + w - 15, top - 3, 10, 4);
    ctx.fillRect(left + 5, top + h - 1, 10, 4);
    ctx.fillRect(left + w - 15, top + h - 1, 10, 4);
    ctx.fillStyle = color;
    ctx.fillRect(left, top, w, h);
    if (len > 1) { // 트럭 짐칸
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(dir > 0 ? left + 4 : left + 22, top + 4, w - 26, h - 8);
    }
    ctx.fillStyle = 'rgba(210,235,255,0.9)'; // 앞 유리 (가는 쪽)
    ctx.fillRect(dir > 0 ? left + w - 13 : left + 3, top + 5, 10, h - 10);
  }

  function drawTrain(px, y, dir) {
    for (var k = 0; k < TRAIN_LEN; k += 3) { // 3칸짜리 칸이 넷
      var left = px + k * CELL + 2, w = 3 * CELL - 4;
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(left, y + 5, w, CELL - 10);
      ctx.fillStyle = '#ffcdd2';
      for (var wx = left + 10; wx < left + w - 14; wx += 26) ctx.fillRect(wx, y + 13, 14, CELL - 26);
    }
  }

  // 예고 사인: 철길 왼쪽 끝 신호등. 기다릴 때는 꺼져 있고, 예고와 지나갈 때는 깜빡인다
  function drawSignal(row, y) {
    var on = row.phase !== 'wait' && Math.floor(row.timer / 0.12) % 2 === 0;
    if (row.phase !== 'wait') {
      ctx.fillStyle = on ? 'rgba(229,57,53,0.30)' : 'rgba(229,57,53,0.12)';
      ctx.fillRect(0, y, canvas.width, CELL);
    }
    ctx.fillStyle = '#333';
    ctx.fillRect(4, y + 4, 16, CELL - 8);
    ctx.fillStyle = on ? '#ff1744' : '#5d1a1a';
    ctx.beginPath(); ctx.arc(12, y + 16, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, y + 32, 6, 0, Math.PI * 2); ctx.fill();
  }

  // 줄 위의 것들: 풀밭의 나무·돌·빈 공간, 찻길의 차, 철길의 신호등과 열차
  function drawRowThings(r) {
    var row = getRow(r);
    var y = rowToY(r);
    var i;
    if (row.type === 'road') {
      for (i = 0; i < row.cars.length; i++) {
        var car = row.cars[i];
        drawCar(carX(row, car) * CELL, y, car.len, row.dir, car.color);
      }
      return;
    }
    if (row.type === 'rail') {
      drawSignal(row, y);
      if (row.phase === 'pass') drawTrain(row.trainX * CELL, y, row.dir);
      return;
    }
    if (row.type === 'river') {
      if (row.still) {
        for (i = 0; i < COLS; i++) {
          var cx = i * CELL + CELL / 2, cy = y + CELL / 2;
          if (row.pads[i] === PAD) { // 연잎 모양 발판
            ctx.fillStyle = '#7cb342';
            ctx.beginPath(); ctx.arc(cx, cy, 17, 0.35, Math.PI * 2 - 0.35); ctx.lineTo(cx, cy); ctx.fill();
            ctx.fillStyle = '#9ccc65';
            ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 6, 0, Math.PI * 2); ctx.fill();
          } else if (row.pads[i] === SUNK) { // 가라앉은 자리: 물결만 남는다
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
          }
        }
      } else {
        for (i = 0; i < row.cars.length; i++) { // 통나무
          var lx = carX(row, row.cars[i]) * CELL, lw = row.cars[i].len * CELL;
          ctx.fillStyle = '#8d6e63';
          ctx.fillRect(lx + 2, y + 8, lw - 4, CELL - 16);
          ctx.fillStyle = '#6d4c41';
          ctx.fillRect(lx + 2, y + 8, lw - 4, 4);
          ctx.fillStyle = '#a1887f';
          ctx.beginPath(); ctx.arc(lx + lw - 10, y + CELL / 2, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      return;
    }
    if (row.type !== 'grass') return;
    for (var c = 0; c < COLS; c++) {
      var x = c * CELL, v = row.cells[c];
      if (v === TREE) {
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(x + 20, y + 28, 8, 14);
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.arc(x + 24, y + 22, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#388e3c';
        ctx.beginPath(); ctx.arc(x + 20, y + 18, 7, 0, Math.PI * 2); ctx.fill();
      } else if (v === ROCK) { // 각진 돌: 그림자, 몸통과 진한 테두리, 밝은 윗면, 어두운 아랫면
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(x + 24, y + 39, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
        fillPoly(x, y, [[7, 35], [5, 25], [12, 14], [24, 9], [36, 12], [43, 23], [40, 35], [26, 39]], '#6d6d6d', '#3a3a3a');
        fillPoly(x, y, [[12, 14], [24, 9], [36, 12], [31, 20], [17, 21]], '#8c8c8c');
        fillPoly(x, y, [[7, 35], [12, 30], [36, 30], [40, 35], [26, 39]], '#555555');
      } else if (v === SIGN && (c === 0 || row.cells[c - 1] !== SIGN)) { // 표지판: 이어진 칸을 한 판자로
        var n = 0;
        while (c + n < COLS && row.cells[c + n] === SIGN) n++;
        var w = n * CELL;
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x + 16, y + 28, 6, 18);
        ctx.fillRect(x + w - 22, y + 28, 6, 18);
        ctx.fillStyle = '#bcaaa4';
        ctx.fillRect(x + 4, y + 2, w - 8, 30);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5.5, y + 3.5, w - 11, 27);
        ctx.fillStyle = '#3e2723';
        ctx.font = 'bold 17px "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('최고 기록 ' + save.best, x + w / 2, y + 18);
      } else if (v === HOLE) {
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6);
        ctx.strokeStyle = '#33424f';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 4.5, y + 4.5, CELL - 9, CELL - 9);
      }
    }
  }

  function drawGridLines() {
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    for (var c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, canvas.height);
      ctx.stroke();
    }
  }

  // 캐릭터 그림 (도형만). c 는 그릴 곳, size 는 한 변 픽셀. silhouette 이면 검정 실루엣
  function drawCharacter(c, id, x, y, size, opts) {
    opts = opts || {};
    var u = size / 48; // 한 칸 48픽셀 기준으로 그린 것을 크기에 맞춘다
    function rect(px, py, w, h, color) {
      c.fillStyle = opts.silhouette ? '#000' : color;
      c.fillRect(x + px * u, y + py * u, w * u, h * u);
    }
    function circle(px, py, r, color) {
      c.fillStyle = opts.silhouette ? '#000' : color;
      c.beginPath();
      c.arc(x + px * u, y + py * u, r * u, 0, Math.PI * 2);
      c.fill();
    }
    if (id === 'frog') {
      rect(9, 13, 30, 27, '#43a047');  // 몸
      rect(13, 27, 22, 11, '#a5d6a7'); // 배
      circle(15, 13, 7, '#43a047');    // 눈두덩
      circle(33, 13, 7, '#43a047');
      circle(15, 13, 4, '#ffffff');
      circle(33, 13, 4, '#ffffff');
      circle(15, 13, 2, '#111111');
      circle(33, 13, 2, '#111111');
    } else if (id === 'bull') {
      rect(5, 8, 9, 5, '#eeeeee');     // 뿔
      rect(34, 8, 9, 5, '#eeeeee');
      rect(5, 3, 4, 7, '#eeeeee');
      rect(39, 3, 4, 7, '#eeeeee');
      rect(9, 10, 30, 30, '#6d4c41');  // 몸
      rect(13, 28, 22, 10, '#f8bbd0'); // 코
      rect(17, 31, 3, 4, '#5d4037');
      rect(28, 31, 3, 4, '#5d4037');
      rect(15, 17, 5, 5, '#111111');   // 눈
      rect(28, 17, 5, 5, '#111111');
    } else {
      rect(8, 8, 32, 32, '#ffd54f');   // 몸
      rect(16, 16, 5, 5, '#222222');   // 눈
      rect(27, 16, 5, 5, '#222222');
      rect(20, 26, 8, 4, '#ff8f00');   // 부리
    }
  }

  // 새: 뒤로 4번 연속 가면 날아와 캐릭터를 낚아채 간다. (bx, by) 는 몸 가운데, d 는 나는 방향 (1 이면 오른쪽)
  function drawBird(bx, by, d, t) {
    var wingY = -10 - 18 * Math.sin(t * 40); // 날갯짓: 날개 끝이 위아래로
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(d, 1); // 머리가 나는 쪽을 본다
    ctx.fillStyle = '#3e2723'; // 꼬리
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-30, -6); ctx.lineTo(-30, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5d4037'; // 몸
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4e342e'; // 날개
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-14, wingY - 12); ctx.lineTo(8, -3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fafafa'; // 머리
    ctx.beginPath(); ctx.arc(19, -5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb300'; // 부리
    ctx.beginPath(); ctx.moveTo(25, -8); ctx.lineTo(33, -4); ctx.lineTo(25, -1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111111'; // 눈
    ctx.fillRect(19, -8, 3, 3);
    ctx.strokeStyle = '#ffb300'; // 발
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-5, 7); ctx.lineTo(-7, 15); ctx.moveTo(5, 7); ctx.lineTo(3, 15); ctx.stroke();
    ctx.restore();
  }

  // 끝나는 모습: 차는 찌그러짐, 열차는 날아감, 통나무에 떠내려가면 흘러가 사라짐, 물은 가라앉으며 출렁임, 빈 공간은 작아지며 떨어짐, 뒤로 4번은 새가 낚아챔, 붉은 선은 흔들리며 흐려짐
  function drawDeath(x, y) {
    var t = s.dieT, kind = s.deathKind, i;
    if (kind === 'car') { // 차에 치이면 찌그러진다
      var k = Math.min(1, t / 0.12);
      ctx.save();
      ctx.translate(x + CELL / 2, y + CELL - 6);
      ctx.scale(1 + 0.45 * k, 1 - 0.72 * k);
      drawCharacter(ctx, s.char, -CELL / 2, -CELL + 6, CELL);
      ctx.restore();
    } else if (kind === 'train') { // 열차에 치이면 열차가 가는 쪽으로 빙글빙글 돌며 날아가 화면 밖으로 사라진다
      var dir = s.hitDir || 1, lift = Math.sin(Math.min(1, t / DEATH_TIME) * Math.PI);
      ctx.save();
      ctx.translate(x + CELL / 2 + dir * 700 * t, y + CELL / 2 - 90 * t);
      ctx.rotate(dir * 14 * t);
      ctx.scale(1 + 0.5 * lift, 1 + 0.5 * lift); // 떠오르듯 커졌다가 작아진다
      drawCharacter(ctx, s.char, -CELL / 2, -CELL / 2, CELL);
      ctx.restore();
    } else if (kind === 'drift') { // 통나무를 탄 채 떠내려가면 그대로 흘러가 화면 밖으로 사라진다
      drawCharacter(ctx, s.char, x + s.driftSpeed * CELL * t, y, CELL);
    } else if (kind === 'water') {
      var cx = Math.max(0, Math.min(COLS - 1, s.col)) * CELL + CELL / 2, cy = y + CELL / 2;
      var sink = Math.min(1, t / 0.4);
      if (sink < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - sink;
        ctx.translate(cx, cy + sink * 8);
        ctx.scale(1 - sink * 0.6, 1 - sink * 0.6);
        drawCharacter(ctx, s.char, -CELL / 2, -CELL / 2, CELL);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      for (i = 0; i < 3; i++) { // 퍼져 나가는 물결 셋
        var rt = t - i * 0.15;
        if (rt <= 0) continue;
        ctx.globalAlpha = Math.max(0, 1 - rt / 0.8);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 6 + rt * 45, (6 + rt * 45) * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#bbdefb';
      ctx.globalAlpha = Math.max(0, 1 - t / 0.6);
      for (i = 0; i < 6; i++) { // 튀는 물방울
        var ang = (i + 0.5) / 6 * Math.PI;
        ctx.fillRect(cx + Math.cos(ang) * 50 * t - 3, cy - Math.sin(ang) * 140 * t + 300 * t * t - 3, 6, 6);
      }
      ctx.restore();
    } else if (kind === 'hole') {
      var f = Math.min(1, t / 0.5);
      if (f < 1) {
        ctx.save();
        ctx.translate(x + CELL / 2, y + CELL / 2);
        ctx.rotate(f * 3);
        ctx.scale(1 - f, 1 - f);
        drawCharacter(ctx, s.char, -CELL / 2, -CELL / 2, CELL);
        ctx.restore();
      }
    } else if (kind === 'back') { // 뒤로 4번 연속: 캐릭터에서 먼 쪽 위에서 새가 날아와 낚아채고 화면 위로 데려간다
      var hx = x + CELL / 2, d = hx < canvas.width / 2 ? -1 : 1;
      var grab = 0.35, bx, by; // 0.35초에 캐릭터 머리 위에 닿는다
      if (t < grab) {
        var e = 1 - Math.pow(1 - t / grab, 2); // 다가올수록 느려진다
        bx = hx - d * 260 * (1 - e);
        by = -60 + (y - 6 + 60) * e;
        drawCharacter(ctx, s.char, x, y, CELL);
      } else {
        var p = Math.min(1, (t - grab) / (DEATH_TIME - grab)), up = p * p; // 점점 빠르게 날아오른다
        bx = hx + d * 200 * up;
        by = y - 6 + (-120 - (y - 6)) * up;
        ctx.save();
        ctx.translate(bx, by + 6 + CELL / 2);
        ctx.rotate(Math.sin(t * 12) * 0.15); // 매달려 흔들린다
        drawCharacter(ctx, s.char, -CELL / 2, -CELL / 2, CELL);
        ctx.restore();
      }
      drawBird(bx, by, d, t);
    } else {
      var shake = Math.sin(t * 60) * 4 * Math.max(0, 1 - t / 0.5);
      ctx.save();
      ctx.globalAlpha = Math.max(0.25, 1 - t);
      drawCharacter(ctx, s.char, x + shake, y, CELL);
      ctx.restore();
    }
  }

  function drawPlayer() {
    var x = s.col * CELL;
    var y = rowToY(s.row);
    if (mode === 'over' && s.deathKind) { drawDeath(x, y); return; }
    if (s.invuln > 0 && Math.floor(s.invuln * 10) % 2 === 0) return; // 황소가 막아 준 뒤 깜빡임
    if (s.charge !== null) { // 개구리가 앞 키를 누르고 있는 동안: 누르자마자 웅크린다 (움직이는 것은 뗄 때)
      ctx.save();
      ctx.translate(x + CELL / 2, y + CELL - 8); // 발밑(몸통 그림 아래 끝)을 기준으로 눌린다
      ctx.scale(FROG_SQUAT[0], FROG_SQUAT[1]);
      drawCharacter(ctx, s.char, -CELL / 2, -CELL + 8, CELL);
      ctx.restore();
    } else {
      drawCharacter(ctx, s.char, x, y, CELL);
    }
    if (s.charge !== null) { // 개구리 점프를 모으는 중: 둘레에 차오르는 원
      ctx.strokeStyle = '#c6ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + CELL / 2, 23, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, s.charge / FROG_HOLD));
      ctx.stroke();
    }
  }

  // 뒤처짐 선: 선 아래는 어둡게, 선은 붉게
  function drawLine() {
    var y = rowToY(s.line - 1); // 선이 있는 곳 = s.line 줄의 아래 끝
    if (y >= canvas.height) y = canvas.height;
    ctx.fillStyle = 'rgba(30, 0, 20, 0.45)';
    ctx.fillRect(0, y, canvas.width, canvas.height - y);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(0, y - 3, canvas.width, 4);
  }

  // 황소가 날려 보낸 차와 열차
  function drawEffects() {
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.type === 'spark') continue;
      var len = e.type === 'train' ? TRAIN_LEN : e.len;
      var w = len * CELL, px = e.x * CELL, py = rowToY(e.r) - e.t * 260;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - e.t);
      ctx.translate(px + w / 2, py + CELL / 2);
      ctx.rotate(-e.dir * e.t * 9);
      ctx.scale(1 + e.t * 0.6, 1 + e.t * 0.6);
      if (e.type === 'train') drawTrain(-w / 2, -CELL / 2, e.dir);
      else drawCar(-w / 2, -CELL / 2, e.len, e.dir, e.color);
      ctx.restore();
    }
  }

  function drawSparks() {
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      if (e.type !== 'spark' && e.type !== 'confetti') continue;
      ctx.globalAlpha = Math.max(0, 1 - e.t / e.life);
      ctx.fillStyle = e.color;
      if (e.type === 'spark') {
        ctx.fillRect(e.px - 3, e.py - 3, 6, 6);
      } else { // 색종이: 돌아가는 작은 직사각형
        ctx.save();
        ctx.translate(e.px, e.py);
        ctx.rotate(e.rot);
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // 최고 기록을 넘긴 순간: 화면 가장자리 금색 빛이 1초 동안 두 번 반짝인다 (판 안쪽은 가리지 않는다)
  function drawBestGlow() {
    var t = BEST_FLASH - s.bestFlash;
    if (s.bestFlash <= 0 || t > 1.0) return;
    ctx.globalAlpha = Math.abs(Math.sin(t * Math.PI * 2)) * 0.85;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    var record = s.bestShown; // 최고 기록을 넘긴 뒤에는 기록 칸이 금색
    ctx.fillStyle = record ? 'rgba(255,193,7,0.92)' : 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvas.width / 2 - 40, 8, 80, 36);
    ctx.fillStyle = record ? '#3e2723' : '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score()), canvas.width / 2, 26);
    if (s.bestFlash > 0) {
      ctx.globalAlpha = Math.min(1, s.bestFlash);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
      ctx.fillText('최고 기록!', canvas.width / 2, 62);
      ctx.globalAlpha = 1;
    }
    if (s.char === 'bull') { // 황소 막기가 남았는지. 상자는 글자 폭에 맞춘다 (양옆 여백 6픽셀)
      var label = s.shieldUsed ? '막기 다 씀' : '막기 1번 남음';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(8, 8, ctx.measureText(label).width + 12, 30);
      ctx.fillStyle = s.shieldUsed ? '#9e9e9e' : '#ffd54f';
      ctx.textAlign = 'left';
      ctx.fillText(label, 14, 23);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var r, bottom = Math.floor(s.viewBottom); // 화면이 따라오는 중에는 줄 하나가 더 걸쳐 보인다
    for (r = bottom; r <= bottom + ROWS_ON_SCREEN; r++) drawRowBase(r);
    drawGridLines();
    for (r = bottom + ROWS_ON_SCREEN; r >= bottom; r--) drawRowThings(r);
    drawPlayer();
    drawEffects();
    drawLine();
    drawBestGlow();
    drawHud();
    drawSparks();
  }

  // ===== 시작 =====
  var lastTs = 0;
  function frame(ts) {
    var dt = lastTs ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05; // 창을 내렸다 올려도 한 번에 크게 건너뛰지 않게
    update(dt);
    draw();
    window.requestAnimationFrame(frame);
  }

  newRun(); // 시작 화면 뒤에 보일 판
  refreshCards();
  window.requestAnimationFrame(frame);

  // 테스트용: 브라우저 없이 규칙을 검사할 때 상태를 읽는다
  window.__g1debug = function () {
    return { mode: mode, s: s, rows: rows, getRow: getRow, carX: carX, gen: gen, botCross: botCross, save: save, chosen: chosen, effects: effects, stepSounds: stepSounds, rowToY: rowToY, fanfareSounds: fanfareSounds, knockSounds: knockSounds, FX_BAND: FX_BAND, deathSounds: deathSounds, bellSounds: bellSounds, farStart: farStart, audioOn: !!audio, difficulty: difficulty, T: { FREE: FREE, TREE: TREE, ROCK: ROCK, HOLE: HOLE, PAD: PAD, SUNK: SUNK } };
  };
})();
