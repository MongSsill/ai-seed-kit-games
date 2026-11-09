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
  var CHAR_HP = 7;             // 한 캐릭터는 보스 공격에 7번 맞으면 쓰러진다
  var DODGE_CD = 1.0;          // 회피 다시 쓰기까지 (초). 셋이 함께 쓰는 하나
  var DODGE_DIST = 100;        // 회피로 미끄러지는 거리
  var DODGE_TIME = 0.18;       // 회피 움직임 시간 (초)
  var DODGE_INVULN = 0.3;      // 회피 뒤 맞지 않는 시간 (초)
  var COUNTER_DMG = 30;        // 회피 반격 대미지
  var TAG_CD = 15;             // 태그 쿨타임 (초). 들어온 캐릭터에 걸리고 캐릭터마다 돈다
  var TAG_INVULN = 0.5;        // 태그 때 맞지 않는 시간 (초)
  var TAG_COUNTER_DMG = 50;    // 태그 반격 대미지 (노란 전조에 맞춘 태그. 거리 무관)
  var TAG_ATTACK_DMG = 25;     // 태그 공격 대미지 (전조와 무관하거나 붉은 전조 중의 태그. 거리 무관)
  var TELEGRAPH = 0.5;         // 전조가 보이는 시간 (초). 이 동안이 반격 창이다
  var ACTIVE = 0.15;           // 공격 범위가 실제로 번쩍이는 시간 (초). 맞는 판정은 시작 순간 한 번
  var RECOVER = 0.6;           // 공격 뒤 보스가 멈춰 있는 시간 (초)
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
      chars: [{ hp: CHAR_HP, tagCd: 0 }, { hp: CHAR_HP, tagCd: 0 }, { hp: CHAR_HP, tagCd: 0 }],
      attackCd: 0,
      dodgeCd: 0,
      dodge: null,        // 회피 중이면 { dir, t }
      invuln: 0,          // 맞지 않는 시간
      counters: 0,        // 반격 성공 횟수 (셋 합쳐). 그로기 게이지
      hurt: 0,            // 맞은 뒤 붉게 보이는 시간
      boss: { x: 0, y: 0, hp: BOSS_HP, flash: 0, phase: 'wait', t: 1.5, attack: null, last: -1 },
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
    if (k === 'Shift') doDodge();
    if (k === ' ') doTag();
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
    // 전조 0.5초 안에, 그 공격 범위 안에서 회피하면 회피 반격 (노란색도 붉은색도)
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
    if (b.phase === 'telegraph' && a && !a.countered && a.p.color === 'yellow') {
      // 태그 반격: 노란 전조 0.5초 안. 거리 무관. 셋의 태그 쿨타임이 모두 초기화된다
      a.countered = true;
      g.counters += 1;
      for (var i = 0; i < 3; i++) g.chars[i].tagCd = 0;
      damageBoss(TAG_COUNTER_DMG, '태그 반격!');
      onCounter('tag');
    } else {
      // 태그 공격: 들어온 캐릭터가 멀리서도 보스를 한 번 친다
      damageBoss(TAG_ATTACK_DMG, '태그 공격');
      tone(440, 0.1, 'triangle', 0.07, 660);
    }
  }

  // 반격 성공 순간의 연출. 작업 7 에서 채운다
  function onCounter(kind) {
    tone(1200, 0.12, 'square', 0.08, 1800);
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
    // 보스와 겹치지 않게 밀어냄
    var d = dist(g.player, g.boss);
    var minD = BOSS_R + PLAYER_R;
    if (d < minD && d > 0.01) {
      g.player.x = g.boss.x + (g.player.x - g.boss.x) / d * minD;
      g.player.y = g.boss.y + (g.player.y - g.boss.y) / d * minD;
    }
    g.attackCd = Math.max(0, g.attackCd - dt);
    g.dodgeCd = Math.max(0, g.dodgeCd - dt);
    for (var ci = 0; ci < 3; ci++) g.chars[ci].tagCd = Math.max(0, g.chars[ci].tagCd - dt);
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
        // 돌진은 보스가 직선 끝으로 옮겨 간다
        if (a.p.id === 'dash') {
          b.x = clamp(a.ox + a.dir.x * a.p.len, -FLOOR + BOSS_R, FLOOR - BOSS_R);
          b.y = clamp(a.oy + a.dir.y * a.p.len, -FLOOR + BOSS_R, FLOOR - BOSS_R);
        }
        if (!a.countered && inAttack(a, g.player.x, g.player.y)) hitPlayer();
        tone(a.p.id === 'burst' ? 90 : 160, 0.2, 'square', 0.08, 60);
        b.phase = 'active';
        b.t = ACTIVE;
      }
    } else if (b.phase === 'active') {
      if (b.t <= 0) { b.phase = 'recover'; b.t = RECOVER; }
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
  function drawTelegraph() {
    var b = game.boss, a = b.attack;
    if (!a) return;
    var red = a.p.color === 'red';
    if (b.phase === 'telegraph') {
      // 옅은 범위 + 바깥에서 줄어드는 테두리. 테두리가 범위에 닿으면 공격
      var k = clamp(b.t / TELEGRAPH, 0, 1);
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
    drawPillar(g.player.x, g.player.y, PLAYER_R, 34, g.hurt > 0 ? '#ff1744' : c.color, g.dodge ? 0.5 : 1);
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
    drawCharCards();
  }
  // 아래쪽 캐릭터 카드 셋: 체력 7칸
  function drawCharCards() {
    var g = game;
    var cw = 150, gap = 16, x0 = (W - (cw * 3 + gap * 2)) / 2, y0 = H - 62;
    for (var i = 0; i < 3; i++) {
      var c = g.chars[i], x = x0 + i * (cw + gap);
      var active = i === g.cur, dead = c.hp <= 0;
      ctx.fillStyle = active ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y0, cw, 54);
      if (active) { ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y0 + 1, cw - 2, 52); }
      ctx.fillStyle = dead ? '#555' : CHARS[i].color;
      ctx.fillRect(x + 8, y0 + 8, 14, 14);
      ctx.fillStyle = dead ? '#888' : '#fff';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(CHARS[i].name + (dead ? ' (쓰러짐)' : ''), x + 28, y0 + 20);
      for (var k = 0; k < CHAR_HP; k++) {
        ctx.fillStyle = k < c.hp ? '#66bb6a' : '#333';
        ctx.fillRect(x + 8 + k * 19, y0 + 30, 16, 8);
      }
      drawCardExtra(i, x, y0, cw);
    }
  }
  function drawCardExtra(i, x, y0, cw) { /* 뒤 작업에서 쿨타임과 게이지를 더한다 */ }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!game) { drawFloor(); return; }
    drawFloor();
    drawTelegraph();
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
