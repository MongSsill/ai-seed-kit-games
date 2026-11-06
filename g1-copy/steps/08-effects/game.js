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
  var TOP_MARGIN = 5;      // 캐릭터 위로 최소 이만큼의 줄이 보이게 화면이 따라간다
  var WRAP_EXTRA = 2;      // 차는 화면 양옆 바깥으로 이만큼 더 달린 뒤 반대편에서 다시 나온다
  var TRAIN_LEN = 12;      // 열차 길이 (칸)
  var TRAIN_WARN = 1.0;    // 열차 예고 사인이 먼저 보이는 시간 (초)
  var TRAIN_PASS = 0.5;    // 열차가 줄을 다 지나가는 시간 (초)
  var CAR_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#00897b'];
  var LOG_EXTRA = 3;       // 통나무는 길어서 화면 바깥으로 3칸 더 간 뒤 반대편에서 나온다
  var WATER = 0, PAD = 1, SUNK = 2; // 고인 물 줄의 칸 값: 물, 사라지는 발판, 가라앉은 자리
  var FROG_STREAK = 15;    // 개구리 해금: 한 판에서 연속 전진 15번
  var BULL_HITS = 30;      // 황소 해금: 여러 판에 걸쳐 차나 열차에 치인 횟수 30번
  var FROG_HOLD = 1.0;     // 개구리: 앞 키를 1초 누르고 있으면 두 칸 점프
  var BULL_SAFE_TIME = 1.0; // 황소가 막아 준 뒤 잠깐 다시 치이지 않는 시간 (초)
  var DEATH_TIME = 0.9;    // 죽는 모습을 보여 준 뒤 결과창을 띄우기까지 (초)
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
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 저장 못 해도 계속 */ }
  }
  // 확인용 주소: index.html?test 는 캐릭터를 모두 잠깐 풀어 준다 (저장하지 않음). index.html?reset 은 저장을 지운다
  var search = (window.location && window.location.search) || '';
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

  var effects = []; // 날아가는 차, 반짝이 같은 잠깐 보이는 것들

  // ===== 상태 =====
  var mode = 'title'; // title(시작 화면) | playing(플레이 중) | over(결과창)
  var s = null;       // 이번 판의 상태

  function newRun() {
    s = {
      col: Math.floor(COLS / 2),
      row: START_ROW,
      maxRow: START_ROW,                  // 가장 멀리 간 줄. 뒤로 가도 줄지 않는다
      cameraBottom: START_ROW - LINE_GAP, // 화면 맨 아래 줄 번호. 위로만 올라간다
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
      dieT: 0,                            // 끝난 뒤 지난 시간
      overShown: false                    // 결과창을 띄웠나
    };
    effects = [];
    resetRows();
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
      lastLogDir: 0                  // 바로 앞 줄이 통나무 줄이면 그 방향 (이웃한 통나무 줄은 반대로 흐른다)
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
      rows[gen.next] = makeRow(gen.next);
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

  function makeRow(r) {
    if (gen.segLeft <= 0) pickSegment(r);
    gen.segLeft -= 1;
    var type = gen.segType;
    var t = difficulty(r);
    var row;
    if (type === 'grass') row = makeGrassRow(t);
    else if (type === 'road') row = makeRoadRow(t);
    else if (type === 'rail') row = makeRailRow(t);
    else row = makeRiverRow(t);
    gen.lastType = type;
    gen.lastLogDir = (row.type === 'river' && !row.still) ? row.dir : 0;
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

  // 찻길: 한 방향으로 차가 돈다. 차 한 칸 0.5초 (어려워지면 0.3초)
  function makeRoadRow(t) {
    gen.free = true;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var secPerCell = lerp(0.5, 0.3, t) * rand(0.85, 1.25);
    var L = COLS + WRAP_EXTRA * 2; // 차가 한 바퀴 도는 길이
    var cars = [];
    var x = rand(0, 3);
    while (true) {
      var len = Math.random() < 0.25 ? 2 : 1; // 넷에 하나는 긴 트럭
      if (x + len > L - 2.5) break;            // 한 바퀴 이어지는 곳에도 2.5칸 넘는 틈을 남긴다
      cars.push({ base: x, len: len, color: CAR_COLORS[randInt(0, CAR_COLORS.length - 1)] });
      x += len + rand(2.5, 5.5);               // 차 사이 틈 2.5~5.5칸
    }
    return { type: 'road', dir: dir, speed: dir / secPerCell, L: L, extra: WRAP_EXTRA, offset: rand(0, L), cars: cars };
  }

  // 철길: 기다림 → 예고 사인 1초 → 열차가 0.5초 안에 지나감 → 다시 기다림
  function makeRailRow(t) {
    gen.free = true;
    return { type: 'rail', dir: Math.random() < 0.5 ? 1 : -1, phase: 'wait', timer: rand(1.5, 6), trainX: 0, trainSpeed: 0 };
  }

  // 강: 넷에 하나는 고인 물에 사라지는 발판이 떠 있는 줄, 나머지는 통나무(움직이는 발판)가 떠내려가는 줄
  function makeRiverRow(t) {
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
    var secPerCell = rand(0.6, 0.9); // 통나무는 차보다 느리다
    var L = COLS + LOG_EXTRA * 2;
    var logs = [];
    var x = rand(0, 2);
    while (true) {
      var len = Math.random() < t ? 2 : 3; // 움직이는 발판 길이 3칸 → 2칸
      if (x + len > L - 1.2) break;
      logs.push({ base: x, len: len });
      x += len + rand(1.2, 3.0);            // 통나무 사이 틈 1.2~3칸
    }
    return { type: 'river', still: false, dir: dir, speed: dir / secPerCell, L: L, extra: LOG_EXTRA, offset: rand(0, L), cars: logs };
  }

  function isLogRow(row) {
    return row.type === 'river' && !row.still;
  }

  // 차와 통나무의 지금 왼쪽 끝 위치 (칸 단위)
  function carX(row, car) {
    return mod(car.base + row.offset, row.L) - row.extra;
  }

  // 지금 칸에서 강 위에 서 있을 수 있나. 통나무 위면 통나무 칸에 맞춰 선다
  function standOnRiver() {
    var row = getRow(s.row);
    if (row.still) return row.pads[s.col] === PAD;
    var center = s.col + 0.5;
    for (var i = 0; i < row.cars.length; i++) {
      var x = carX(row, row.cars[i]), len = row.cars[i].len;
      if (center >= x && center <= x + len) {
        var k = Math.min(len - 1, Math.max(0, Math.floor(center - x)));
        s.col = x + k;
        return true;
      }
    }
    return false;
  }

  // 사라지는 발판: 밟았던 발판은 떠나면 가라앉는다
  function leaveCell(row, col) {
    if (row.type === 'river' && row.still && row.pads[col] === PAD) row.pads[col] = SUNK;
  }

  function updateRail(row, dt) {
    row.timer -= dt;
    if (row.phase === 'wait' && row.timer <= 0) {
      row.phase = 'warn';
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
    for (var r = s.cameraBottom - 1; r <= s.cameraBottom + ROWS_ON_SCREEN + 1; r++) {
      var row = getRow(r);
      if (row.type === 'road' || isLogRow(row)) row.offset += row.speed * dt;
      else if (row.type === 'rail') updateRail(row, dt);
    }
  }

  // 그 칸에 차나 열차가 닿아 있으면 무엇인지 돌려준다
  function trafficAt(r, col) {
    var row = getRow(r);
    var a = col + 0.15, b = col + 0.85; // 캐릭터 몸통 (칸보다 조금 작게)
    if (row.type === 'road') {
      for (var i = 0; i < row.cars.length; i++) {
        var car = row.cars[i], x = carX(row, car);
        if (x < b && x + car.len > a) return { kind: 'car', row: row, car: car, r: r };
      }
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
    gameOver(hit.kind === 'train' ? '열차에 치였다' : '차에 치였다', hit.kind);
  }

  // 황소가 막은 차나 열차를 길에서 치우고, 온 쪽으로 빙글빙글 날려 보낸다
  function knockAway(hit) {
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

  // 플레이 중 최고 기록을 넘긴 순간: 기록 숫자 둘레에 반짝이
  function burst() {
    var colors = ['#ffd54f', '#ffffff', '#ff8a65', '#c6ff00'];
    for (var i = 0; i < 26; i++) {
      effects.push({ type: 'spark', px: canvas.width / 2, py: 26, vx: rand(-170, 170), vy: rand(-230, -40), color: colors[i % colors.length], t: 0 });
    }
  }

  // 결과창: 개구리와 황소 해금 과제를 달성했는지
  function showQuests() {
    var frogNew = s.unlocked.indexOf('frog') >= 0, bullNew = s.unlocked.indexOf('bull') >= 0;
    questFrogEl.textContent = frogNew ? '개구리 해금! 연속 전진 ' + FROG_STREAK + '/' + FROG_STREAK + ' 달성'
      : save.frog ? '개구리: 해금됨'
      : '개구리 해금 과제: 연속 전진 최고 ' + save.bestStreak + '/' + FROG_STREAK + ' (이번 판 ' + s.runBestStreak + ')';
    questFrogEl.className = frogNew ? 'quest done' : 'quest';
    questBullEl.textContent = bullNew ? '황소 해금! 차에 치인 횟수 ' + BULL_HITS + '/' + BULL_HITS + ' 달성'
      : save.bull ? '황소: 해금됨'
      : '황소 해금 과제: 차에 치인 횟수 ' + save.carHits + '/' + BULL_HITS;
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

    // 개구리 해금 과제: 실제로 앞으로 간 횟수만 센다. 옆이나 뒤로 실제로 가면 0. 개구리를 쓰는 중에는 따지지 않는다
    if (s.char !== 'frog') {
      if (drow > 0) s.streak += 1;
      else s.streak = 0;
      if (s.streak > s.runBestStreak) s.runBestStreak = s.streak;
      if (s.streak > save.bestStreak) { save.bestStreak = s.streak; writeSave(); }
      if (!save.frog && s.streak >= FROG_STREAK) { save.frog = true; s.unlocked.push('frog'); writeSave(); }
    }

    // 가장 멀리 간 줄을 넘을 때만 기록이 오른다
    if (s.row > s.maxRow) s.maxRow = s.row;

    // 이번 판에 최고 기록을 넘기는 순간 (처음 하는 판은 빼고)
    if (!s.bestShown && s.prevBest > 0 && score() > s.prevBest) {
      s.bestShown = true;
      s.bestFlash = 2.0;
      burst();
    }

    // 앞으로 가면 뒤처짐 선도 캐릭터 뒤 5칸까지 끌려 올라온다 (내려가지는 않는다)
    if (drow > 0 && s.row - LINE_GAP > s.line) s.line = s.row - LINE_GAP;

    // 화면이 캐릭터를 따라 올라간다 (내려오지는 않는다)
    var wantBottom = s.row + TOP_MARGIN - (ROWS_ON_SCREEN - 1);
    if (wantBottom > s.cameraBottom) s.cameraBottom = wantBottom;

    if (s.backCount >= BACK_LIMIT) { gameOver('뒤로 4번 연속 갔다', 'back'); return; }
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다', 'line'); return; }
    if (cellAt(s.row, s.col) === HOLE) { gameOver('빈 공간에 빠졌다', 'hole'); return; }
    if (getRow(s.row).type === 'river' && !standOnRiver()) { gameOver('물에 빠졌다', 'water'); return; }
    checkTraffic();
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
    if (s.char === 'frog' && d[1] === 1) { // 개구리: 앞 키를 떼면 한 칸, 1초 누르고 있으면 두 칸
      if (s.charge === null) s.charge = 0;
      return;
    }
    tryMove(d[0], d[1]);
  });

  window.addEventListener('keyup', function (e) {
    var d = KEYS[e.code];
    if (!d || d[1] !== 1 || mode !== 'playing' || s.charge === null) return;
    s.charge = null; // 1초가 되기 전에 뗐으면 한 칸
    tryMove(0, 1);
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
    updateRows(dt); // 시작 화면과 결과창 뒤에서도 차는 다닌다
    updateEffects(dt);
    if (mode === 'over' && !s.overShown) {
      s.dieT += dt;
      if (s.dieT >= DEATH_TIME) { s.overShown = true; show(overEl, true); }
    }
    if (mode !== 'playing') return;
    s.time += dt;
    s.line += LINE_SPEED * dt;
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다', 'line'); return; }
    if (s.invuln > 0) s.invuln -= dt;
    if (s.bestFlash > 0) s.bestFlash -= dt;
    if (s.charge !== null) {
      s.charge += dt;
      if (s.charge >= FROG_HOLD) {
        s.charge = null;
        frogJump();
        if (mode !== 'playing') return;
      }
    }
    var here = getRow(s.row);
    if (isLogRow(here)) { // 통나무를 탄 채로 함께 떠내려간다
      s.col += here.speed * dt;
      if (s.col < -0.5 || s.col > COLS - 0.5) { gameOver('통나무를 탄 채 화면 밖으로 떠내려갔다', 'water'); return; }
    }
    checkTraffic();
  }

  function updateEffects(dt) {
    for (var i = effects.length - 1; i >= 0; i--) {
      var e = effects[i];
      e.t += dt;
      if (e.type === 'spark') { e.px += e.vx * dt; e.py += e.vy * dt; e.vy += 320 * dt; }
      else e.x += e.vx * dt;
      if (e.t > 1.0) effects.splice(i, 1);
    }
  }

  // ===== 그리기 =====
  // row 번호를 화면 y 좌표(그 칸의 위쪽 끝)로 바꾼다
  function rowToY(row) {
    return (ROWS_ON_SCREEN - 1 - (row - s.cameraBottom)) * CELL;
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
      } else if (v === ROCK) {
        ctx.fillStyle = '#8e8e8e';
        ctx.fillRect(x + 8, y + 14, 32, 24);
        ctx.fillStyle = '#b0b0b0';
        ctx.fillRect(x + 12, y + 16, 14, 8);
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

  // 끝나는 모습: 차·열차는 찌그러짐, 물은 가라앉으며 출렁임, 빈 공간은 작아지며 떨어짐, 그 밖은 흔들리며 흐려짐
  function drawDeath(x, y) {
    var t = s.dieT, kind = s.deathKind, i;
    if (kind === 'car' || kind === 'train') {
      var k = Math.min(1, t / 0.12);
      ctx.save();
      ctx.translate(x + CELL / 2, y + CELL - 6);
      ctx.scale(1 + 0.45 * k, 1 - 0.72 * k);
      drawCharacter(ctx, s.char, -CELL / 2, -CELL + 6, CELL);
      ctx.restore();
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
    drawCharacter(ctx, s.char, x, y, CELL);
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
      if (e.type !== 'spark') continue;
      ctx.globalAlpha = Math.max(0, 1 - e.t);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.px - 3, e.py - 3, 6, 6);
    }
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
    if (s.char === 'bull') { // 황소 막기가 남았는지
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(8, 8, 100, 30);
      ctx.fillStyle = s.shieldUsed ? '#9e9e9e' : '#ffd54f';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.shieldUsed ? '막기 다 씀' : '막기 1번 남음', 14, 23);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var r;
    for (r = s.cameraBottom; r < s.cameraBottom + ROWS_ON_SCREEN; r++) drawRowBase(r);
    drawGridLines();
    for (r = s.cameraBottom + ROWS_ON_SCREEN - 1; r >= s.cameraBottom; r--) drawRowThings(r);
    drawPlayer();
    drawEffects();
    drawLine();
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
    return { mode: mode, s: s, rows: rows, getRow: getRow, carX: carX, save: save, chosen: chosen, effects: effects, stepSounds: stepSounds, audioOn: !!audio, difficulty: difficulty, T: { FREE: FREE, TREE: TREE, ROCK: ROCK, HOLE: HOLE, PAD: PAD, SUNK: SUNK } };
  };
})();
