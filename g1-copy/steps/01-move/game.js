// 게임 1 완전 카피 — 작업 1번: 격자 판, 캐릭터, 네 방향 이동, 기록 숫자
// 좌표 약속: col 은 0 ~ COLS-1 (왼쪽이 0). row 는 앞으로 갈수록 커진다 (시작 줄이 0).

(function () {
  'use strict';

  // ----- 판 크기 -----
  var COLS = 9;          // 가로 칸 수
  var ROWS_ON_SCREEN = 14; // 세로로 보이는 줄 수
  var CELL = 48;         // 한 칸의 픽셀 크기

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  canvas.width = COLS * CELL;
  canvas.height = ROWS_ON_SCREEN * CELL;

  // ----- 게임 상태 -----
  var START_ROW = 0;       // 시작 줄. 기록은 여기서 0 으로 센다
  var BOTTOM_ROW = -5;     // 화면 맨 아래 줄. 시작 위치는 여기서 5칸 앞
  var state = {
    col: Math.floor(COLS / 2),
    row: START_ROW,
    maxRow: START_ROW,     // 가장 멀리 간 줄. 뒤로 가도 줄지 않는다
    cameraBottom: BOTTOM_ROW // 화면 맨 아래에 보이는 줄 번호. 위로만 올라간다
  };

  function score() {
    return state.maxRow - START_ROW;
  }

  // ----- 이동 -----
  function move(dcol, drow) {
    var newCol = state.col + dcol;
    var newRow = state.row + drow;

    // 옆으로는 판 밖으로 못 나간다
    if (newCol < 0 || newCol >= COLS) return;
    // 뒤로는 화면 아래 끝까지만 (뒤처짐 선은 작업 2번에서)
    if (newRow < state.cameraBottom) return;

    state.col = newCol;
    state.row = newRow;

    // 가장 멀리 간 줄을 넘을 때만 기록이 오른다
    if (state.row > state.maxRow) {
      state.maxRow = state.row;
    }

    // 캐릭터가 화면 위쪽 가까이 가면 화면이 따라 올라간다 (내려오지는 않는다)
    var topMargin = 5; // 캐릭터 위로 최소 이만큼의 줄이 보이게
    var wantBottom = state.row + topMargin - (ROWS_ON_SCREEN - 1);
    if (wantBottom > state.cameraBottom) {
      state.cameraBottom = wantBottom;
    }

    draw();
  }

  var KEYS = {
    ArrowUp: [0, 1], KeyW: [0, 1],
    ArrowDown: [0, -1], KeyS: [0, -1],
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0]
  };

  window.addEventListener('keydown', function (e) {
    var d = KEYS[e.code];
    if (!d) return;
    e.preventDefault();
    if (e.repeat) return; // 키를 꾹 눌러도 한 칸만 (개구리 길게 누르기는 작업 7번에서)
    move(d[0], d[1]);
  });

  // ----- 그리기 -----
  // row 번호를 화면 y 좌표(칸의 위쪽)로 바꾼다
  function rowToY(row) {
    return (ROWS_ON_SCREEN - 1 - (row - state.cameraBottom)) * CELL;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 줄마다 색을 번갈아 칠해서 한 칸이 어디까지인지 보이게 한다
    for (var r = state.cameraBottom; r < state.cameraBottom + ROWS_ON_SCREEN; r++) {
      ctx.fillStyle = (r % 2 === 0) ? '#4caf50' : '#43a047';
      if (r < START_ROW) ctx.fillStyle = (r % 2 === 0) ? '#8d8d6e' : '#7f7f63'; // 시작 줄 뒤쪽은 다른 색
      ctx.fillRect(0, rowToY(r), canvas.width, CELL);
    }

    // 세로 칸 선
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (var c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, canvas.height);
      ctx.stroke();
    }

    // 캐릭터: 노란 네모 위에 검은 눈 두 개 (도형만 쓴다)
    var x = state.col * CELL;
    var y = rowToY(state.row);
    var pad = 8;
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 16, y + 16, 5, 5);
    ctx.fillRect(x + CELL - 21, y + 16, 5, 5);

    // 기록 숫자: 화면 위 가운데
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvas.width / 2 - 40, 8, 80, 36);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score()), canvas.width / 2, 26);
  }

  draw();
})();
