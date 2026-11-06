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

  function show(el, on) {
    if (on) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }

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
      reason: ''
    };
    resetRows();
  }

  function score() {
    return s.maxRow - START_ROW;
  }

  // ===== 줄 만들기 =====
  var FREE = 0, TREE = 1, ROCK = 2, HOLE = 3; // 풀밭 칸의 값: 빈 칸, 나무, 돌, 빈 공간(구멍)
  var rows = {};  // 줄 번호 → 그 줄의 내용
  var gen = null; // 다음 줄을 만들 때 쓰는 기억

  function mod(a, n) { return ((a % n) + n) % n; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // 앞으로 갈수록 0 에서 1 로 (작업 6번에서 채운다. 지금은 늘 처음 값)
  function difficulty(r) { return 0; }

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
      free: false                    // 바로 앞 줄이 옆으로 마음대로 다닐 수 있는 줄이었나
    };
    for (var r = START_ROW - LINE_GAP - 1; r < gen.next; r++) {
      var cells = emptyCells();
      if (r < START_ROW) { cells[0] = TREE; cells[COLS - 1] = TREE; }
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
    return { type: 'road', dir: dir, speed: dir / secPerCell, L: L, offset: rand(0, L), cars: cars };
  }

  // 철길: 기다림 → 예고 사인 1초 → 열차가 0.5초 안에 지나감 → 다시 기다림
  function makeRailRow(t) {
    gen.free = true;
    return { type: 'rail', dir: Math.random() < 0.5 ? 1 : -1, phase: 'wait', timer: rand(1.5, 6), trainX: 0, trainSpeed: 0 };
  }

  // 강에서 움직이는 발판은 작업 5번에서 채운다
  function makeRiverRow(t) { gen.free = true; return { type: 'river' }; }

  function carX(row, car) {
    return mod(car.base + row.offset, row.L) - WRAP_EXTRA;
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
      if (row.type === 'road') row.offset += row.speed * dt;
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
        if (x < b && x + car.len > a) return { kind: 'car', row: row, car: car };
      }
    } else if (row.type === 'rail' && row.phase === 'pass') {
      if (row.trainX < b && row.trainX + TRAIN_LEN > a) return { kind: 'train', row: row };
    }
    return null;
  }

  function checkTraffic() {
    var hit = trafficAt(s.row, s.col);
    if (hit) onHit(hit);
  }

  function onHit(hit) {
    gameOver(hit.kind === 'train' ? '열차에 치였다' : '차에 치였다');
  }

  function cellAt(r, c) {
    var row = getRow(r);
    return row.type === 'grass' ? row.cells[c] : FREE;
  }

  function isBlocked(r, c) {
    var v = cellAt(r, c);
    return v === TREE || v === ROCK;
  }

  function startRun() {
    newRun();
    mode = 'playing';
    show(titleEl, false);
    show(overEl, false);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function gameOver(reason) {
    if (mode !== 'playing') return;
    s.reason = reason;
    mode = 'over';
    overReasonEl.textContent = reason;
    overScoreEl.textContent = String(score());
    show(overEl, true);
  }

  // ===== 이동 =====
  function tryMove(dcol, drow) {
    if (mode !== 'playing') return false;
    var newCol = s.col + dcol;
    var newRow = s.row + drow;
    if (newCol < 0 || newCol > COLS - 1) return false; // 옆으로는 판 밖으로 못 나간다
    if (newRow < s.cameraBottom) return false;         // 화면 아래 끝 밖으로는 못 간다
    if (isBlocked(newRow, newCol)) return false;       // 나무와 돌에는 막히기만 한다
    s.col = newCol;
    s.row = newRow;
    afterMove(dcol, drow);
    return true;
  }

  // 실제로 한 칸 움직인 뒤에 한 번 부른다 (막혀서 못 간 입력에는 부르지 않는다)
  function afterMove(dcol, drow) {
    // 뒤로 4번 연속: 실제로 뒤로 가면 1 더하고, 앞이나 옆으로 실제로 가면 0 으로
    if (drow < 0) s.backCount += 1;
    else s.backCount = 0;

    // 가장 멀리 간 줄을 넘을 때만 기록이 오른다
    if (s.row > s.maxRow) s.maxRow = s.row;

    // 앞으로 가면 뒤처짐 선도 캐릭터 뒤 5칸까지 끌려 올라온다 (내려가지는 않는다)
    if (drow > 0 && s.row - LINE_GAP > s.line) s.line = s.row - LINE_GAP;

    // 화면이 캐릭터를 따라 올라간다 (내려오지는 않는다)
    var wantBottom = s.row + TOP_MARGIN - (ROWS_ON_SCREEN - 1);
    if (wantBottom > s.cameraBottom) s.cameraBottom = wantBottom;

    if (s.backCount >= BACK_LIMIT) { gameOver('뒤로 4번 연속 갔다'); return; }
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다'); return; }
    if (cellAt(s.row, s.col) === HOLE) { gameOver('빈 공간에 빠졌다'); return; }
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
    var d = KEYS[e.code];
    if (!d) return;
    e.preventDefault();
    if (e.repeat) return; // 키를 꾹 눌러도 한 칸만
    if (mode === 'playing') tryMove(d[0], d[1]);
  });

  startBtn.addEventListener('click', function () { if (mode !== 'playing') startRun(); });
  restartBtn.addEventListener('click', function () { if (mode !== 'playing') startRun(); });

  // ===== 매 화면마다 =====
  function update(dt) {
    updateRows(dt); // 시작 화면과 결과창 뒤에서도 차는 다닌다
    if (mode !== 'playing') return;
    s.time += dt;
    s.line += LINE_SPEED * dt;
    if (s.line >= s.row) { gameOver('붉은 선에 따라잡혔다'); return; }
    checkTraffic();
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
      ctx.fillStyle = '#3b8fd6';
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

  function drawPlayer() {
    var x = s.col * CELL;
    var y = rowToY(s.row);
    var pad = 8;
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 16, y + 16, 5, 5);
    ctx.fillRect(x + CELL - 21, y + 16, 5, 5);
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

  function drawHud() {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvas.width / 2 - 40, 8, 80, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score()), canvas.width / 2, 26);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var r;
    for (r = s.cameraBottom; r < s.cameraBottom + ROWS_ON_SCREEN; r++) drawRowBase(r);
    drawGridLines();
    for (r = s.cameraBottom + ROWS_ON_SCREEN - 1; r >= s.cameraBottom; r--) drawRowThings(r);
    drawPlayer();
    drawLine();
    drawHud();
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
  window.requestAnimationFrame(frame);

  // 테스트용: 브라우저 없이 규칙을 검사할 때 상태를 읽는다
  window.__g1debug = function () {
    return { mode: mode, s: s, rows: rows, getRow: getRow, T: { FREE: FREE, TREE: TREE, ROCK: ROCK, HOLE: HOLE } };
  };
})();
