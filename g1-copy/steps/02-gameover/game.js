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
  }

  function score() {
    return s.maxRow - START_ROW;
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
    if (mode !== 'playing') return;
    s.time += dt;
    s.line += LINE_SPEED * dt;
    if (s.line >= s.row) gameOver('붉은 선에 따라잡혔다');
  }

  // ===== 그리기 =====
  // row 번호를 화면 y 좌표(그 칸의 위쪽 끝)로 바꾼다
  function rowToY(row) {
    return (ROWS_ON_SCREEN - 1 - (row - s.cameraBottom)) * CELL;
  }

  function drawRowBase(r) {
    var y = rowToY(r);
    if (r < START_ROW) ctx.fillStyle = (r % 2 === 0) ? '#8d8d6e' : '#7f7f63'; // 시작 줄 뒤쪽
    else ctx.fillStyle = (r % 2 === 0) ? '#4caf50' : '#43a047';
    ctx.fillRect(0, y, canvas.width, CELL);
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
    for (var r = s.cameraBottom; r < s.cameraBottom + ROWS_ON_SCREEN; r++) drawRowBase(r);
    drawGridLines();
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
  window.__g1debug = function () { return { mode: mode, s: s }; };
})();
