// 게임 2 큰 게임의 일부 (원작: 몬길: 스타다이브의 보스전 태그 반격. 그림과 소리는 원작 것을 쓰지 않고 도형과 직접 만든 소리로 한다)
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
  var BOSS_HP = 4000;          // 보스 체력 (AI 가 2분 언저리로 잡은 값. 해 보고 고친다)
  var ATTACK_CD = 0.35;        // 기본 공격 다시 쓰기까지 (초)
  var ATTACK_RANGE = 60;       // 기본 공격이 닿는 거리 (보스 가장자리에서)
  var ATTACK_DMG = 10;
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

  // ===== 2.5D 투영: 바닥 좌표 (x, y, 높이 z) → 화면 좌표 =====
  var OX = W / 2, OY = 236;
  var COS = 0.866, SIN = 0.5;
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
      attackCd: 0,
      boss: { x: 0, y: 0, hp: BOSS_HP, flash: 0 },
      hits: [],           // 맞은 자리 숫자 연출
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
    elResultReason.textContent = reason;
    elResultTime.textContent = fmtTime(g.clock);
    elRankWrap.classList.add('hidden');
    elResult.classList.remove('hidden');
    if (win) tone(660, 0.5, 'triangle', 0.12, 990); else tone(220, 0.6, 'sawtooth', 0.1, 110);
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
    if (state !== 'fight') return;
    if (k === 'a' || k === 'A' || k === 'ㅁ') doAttack();
  }
  function onKeyUp(e) { keys[e.key] = false; }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);

  // ===== 기본 공격 =====
  function doAttack() {
    var g = game;
    if (g.attackCd > 0) return;
    g.attackCd = ATTACK_CD;
    var d = dist(g.player, g.boss);
    if (d <= BOSS_R + PLAYER_R + ATTACK_RANGE) {
      damageBoss(ATTACK_DMG);
      tone(520, 0.06, 'square', 0.05);
    } else {
      tone(200, 0.05, 'square', 0.03);
    }
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

  function update(dt) {
    var g = game;
    if (!g) return;
    g.stateT += dt;
    if (state === 'intro') {
      if (g.stateT >= INTRO_TIME) { state = 'fight'; g.stateT = 0; }
      return;
    }
    if (state !== 'fight') return;

    g.clock += dt;
    if (g.clock >= LIMIT) { g.clock = LIMIT; finish(false, '3분이 지났다'); return; }

    // 이동
    var m = moveDir();
    if (m) {
      g.player.x = clamp(g.player.x + m.x * MOVE_SPEED * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.player.y = clamp(g.player.y + m.y * MOVE_SPEED * dt, -FLOOR + PLAYER_R, FLOOR - PLAYER_R);
      g.facing = m;
    }
    // 보스와 겹치지 않게 밀어냄
    var d = dist(g.player, g.boss);
    var minD = BOSS_R + PLAYER_R;
    if (d < minD && d > 0.01) {
      g.player.x = g.boss.x + (g.player.x - g.boss.x) / d * minD;
      g.player.y = g.boss.y + (g.player.y - g.boss.y) / d * minD;
    }
    g.attackCd = Math.max(0, g.attackCd - dt);
    g.boss.flash = Math.max(0, g.boss.flash - dt);
    for (var i = g.hits.length - 1; i >= 0; i--) { g.hits[i].t -= dt; g.hits[i].z += 40 * dt; if (g.hits[i].t <= 0) g.hits.splice(i, 1); }
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
  function drawBoss() {
    var b = game.boss;
    var h = state === 'intro' ? 20 + 60 * clamp(game.stateT / INTRO_TIME, 0, 1) : 80;
    drawPillar(b.x, b.y, BOSS_R, h, b.flash > 0 ? '#ffffff' : '#8e24aa');
    if (state === 'intro') {
      var s = project(b.x, b.y, 110);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('보스 등장', s.x, s.y - 20 * Math.sin(game.stateT * 3));
    }
  }
  function drawPlayer() {
    var g = game;
    var c = CHARS[g.cur];
    drawPillar(g.player.x, g.player.y, PLAYER_R, 34, c.color);
    // 바라보는 방향 표시
    var tip = project(g.player.x + g.facing.x * PLAYER_R * 1.6, g.player.y + g.facing.y * PLAYER_R * 1.6, 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  function drawHits() {
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < game.hits.length; i++) {
      var h = game.hits[i];
      var s = project(h.x, h.y, h.z);
      ctx.globalAlpha = clamp(h.t / 0.3, 0, 1);
      ctx.fillStyle = '#fff';
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
    // 보스 체력
    var bw = 320, bx = (W - bw) / 2, by = 14;
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, 18);
    ctx.fillStyle = '#b71c1c'; ctx.fillRect(bx, by, bw * g.boss.hp / BOSS_HP, 14);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('보스 ' + g.boss.hp + ' / ' + BOSS_HP, W / 2, by + 11);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!game) { drawFloor(); return; }
    drawFloor();
    // 화면 위쪽에 있는 것부터 그려 아래쪽이 앞에 보이게 한다
    var order = [{ y: game.boss.x + game.boss.y, f: drawBoss }, { y: game.player.x + game.player.y, f: drawPlayer }];
    order.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < order.length; i++) order[i].f();
    drawHits();
    drawHud();
  }

  // ===== 메인 루프 =====
  function frame(ts) {
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  draw();
  requestAnimationFrame(frame);
})();
