// 게임 2 브라우저 없이 검사. 사용법: node g2check.js <game.js 경로> [sim]
'use strict';
var fs = require('fs');
var vm = require('vm');
var path = process.argv[2];
var src = fs.readFileSync(path, 'utf8');

function makeEl(id) {
  var cls = [];
  var el = {
    id: id, textContent: '', innerHTML: '', className: '', children: [],
    classList: {
      add: function (c) { if (cls.indexOf(c) < 0) cls.push(c); },
      remove: function (c) { var i = cls.indexOf(c); if (i >= 0) cls.splice(i, 1); },
      contains: function (c) { return cls.indexOf(c) >= 0; }
    },
    addEventListener: function () {},
    appendChild: function (c) { el.children.push(c); },
    getContext: function () { return ctxProxy; }
  };
  return el;
}
var ctxProxy = new Proxy({}, { get: function (t, k) { return function () {}; }, set: function () { return true; } });
var store = {};
function load(search, seedRandom) {
  var els = {};
  var hook = null;
  var window = {
    location: { search: search || '' },
    localStorage: {
      getItem: function (k) { return k in store ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    },
    __G2_TEST_HOOK__: function (h) { hook = h; }
  };
  var document = {
    getElementById: function (id) { return els[id] || (els[id] = makeEl(id)); },
    createElement: function (tag) { return makeEl(tag); },
    addEventListener: function () {}
  };
  var ctx = { window: window, document: document, requestAnimationFrame: function () {}, console: console, Math: Math, Date: Date, JSON: JSON, Array: Array, String: String, Number: Number, Object: Object, RegExp: RegExp };
  ctx.window.AudioContext = undefined;
  if (seedRandom) { var s = seedRandom; ctx.Math = Object.create(Math); ctx.Math.random = function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  hook.els = els;
  hook.run = function (sec, dt) { dt = dt || 1 / 60; var n = Math.round(sec / dt); for (var i = 0; i < n; i++) hook.step(dt); };
  return hook;
}

var pass = 0, fail = 0, groups = {};
function check(group, name, cond, info) {
  groups[group] = (groups[group] || 0) + 1;
  if (cond) pass++; else { fail++; console.log('  FAIL [' + group + '] ' + name + (info !== undefined ? ' -> ' + JSON.stringify(info) : '')); }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-6); }

// ---- 1. 시작, 연출, 시계 ----
(function () {
  var h = load('');
  var G = '시작';
  check(G, '처음은 title', h.getState() === 'title');
  h.key('Enter');
  check(G, 'Enter 로 intro', h.getState() === 'intro');
  var g = h.getGame();
  check(G, '시작 거리 = 보스 지름 3배', near(Math.hypot(g.player.x - g.boss.x, g.player.y - g.boss.y), h.consts.START_DIST, 0.5), Math.hypot(g.player.x, g.player.y));
  h.run(2.9);
  check(G, '2.9초 뒤 아직 intro', h.getState() === 'intro');
  check(G, 'intro 동안 시계 0', g.clock === 0);
  h.run(0.2);
  check(G, '3초 뒤 fight', h.getState() === 'fight');
  h.run(1.0);
  check(G, '싸우는 동안 시계 흐름 (약 1초)', g.clock > 0.9 && g.clock < 1.2, g.clock);
  check(G, '시작 화면 숨김', h.els.title.classList.contains('hidden'));
  // 이동: 위 키
  var y0 = g.player.x + g.player.y;
  h.key('ArrowUp'); h.run(0.5); h.keyUp('ArrowUp');
  check(G, '위 키로 화면 위쪽(x+y 감소)', g.player.x + g.player.y < y0);
  // 3분 제한
  g.clock = h.consts.LIMIT - 0.05; g.boss.phase = 'wait'; g.boss.t = 99;
  h.run(0.2);
  check(G, '3분이 지나면 result', h.getState() === 'result');
  check(G, '격파 실패 글', h.els['result-title'].textContent === '격파 실패');
  check(G, '실패 이유', h.els['result-reason'].textContent.indexOf('3분') === 0, h.els['result-reason'].textContent);
  check(G, '실패에는 랭킹 숨김', h.els['rank-wrap'].classList.contains('hidden'));
  h.key('Enter');
  check(G, '결과창에서 Enter 로 다시', h.getState() === 'intro');
})();

// ---- 2. 패턴 모양 ----
(function () {
  var h = load('');
  h.key('Enter'); h.run(3.1);
  var g = h.getGame();
  var G = '모양';
  g.boss.x = 0; g.boss.y = 0; g.player.x = 100; g.player.y = 0;
  var fan = h.makeAttack(0), ring = h.makeAttack(1), dash = h.makeAttack(2), burst = h.makeAttack(3);
  check(G, '부채꼴: 정면 100 안', h.inAttack(fan, 100, 0));
  check(G, '부채꼴: 정면 160 밖', !h.inAttack(fan, 160, 0));
  check(G, '부채꼴: 뒤쪽 밖', !h.inAttack(fan, -100, 0));
  check(G, '부채꼴: 옆 90도 밖', !h.inAttack(fan, 0, 100));
  check(G, '부채꼴: 40도 안', h.inAttack(fan, Math.cos(0.7) * 100, Math.sin(0.7) * 100));
  check(G, '둘레 원: 90 안', h.inAttack(ring, 0, 90));
  check(G, '둘레 원: 120 밖', !h.inAttack(ring, 0, -120));
  check(G, '돌진: 앞 200 안', h.inAttack(dash, 200, 10));
  check(G, '돌진: 앞 250 밖', !h.inAttack(dash, 250, 0));
  check(G, '돌진: 옆 60 밖', !h.inAttack(dash, 100, 60));
  check(G, '돌진: 뒤 밖', !h.inAttack(dash, -60, 0));
  check(G, '넓은 원: 160 안', h.inAttack(burst, -160, 0));
  check(G, '넓은 원: 200 밖', !h.inAttack(burst, 0, 200));
  check(G, '붉은 것은 burst 하나', h.consts.PATTERNS.filter(function (p) { return p.color === 'red'; }).length === 1);
  check(G, '노란 것 셋', h.consts.PATTERNS.filter(function (p) { return p.color === 'yellow'; }).length === 3);
})();

// 전조가 시작될 때까지 돌린다
function untilTelegraph(h, wantColor) {
  var g = h.getGame();
  for (var i = 0; i < 100000; i++) {
    h.step(1 / 60);
    if (h.getState() !== 'fight') return false;
    if (g.boss.phase === 'telegraph' && g.boss.t > h.consts.TELEGRAPH - 0.05 && (!wantColor || g.boss.attack.p.color === wantColor)) return true;
  }
  return false;
}
function fresh(search, seed) {
  var h = load(search, seed);
  h.key('Enter'); h.run(3.1);
  return h;
}

// ---- 3. 맞기, 체력, 쓰러짐 ----
(function () {
  var h = fresh('', 7);
  var g = h.getGame();
  var G = '맞기';
  var ok = untilTelegraph(h);
  check(G, '전조가 온다', ok);
  // 범위 안에 서 있게 플레이어를 범위 안 점으로 옮김
  var a = g.boss.attack;
  g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60;
  check(G, '옮긴 자리는 범위 안', h.inAttack(a, g.player.x, g.player.y), a.p.id);
  var hp0 = g.chars[g.cur].hp;
  h.run(0.6);
  check(G, '전조 끝에 맞아 체력 -1', g.chars[g.cur].hp === hp0 - 1, [hp0, g.chars[g.cur].hp]);
  // 쓰러지면 다음 캐릭터
  g.chars[0].hp = 1; g.cur = 0;
  untilTelegraph(h);
  a = g.boss.attack; g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60; g.invuln = 0;
  h.run(0.6);
  check(G, '0 이 되면 다음 캐릭터(1)', g.cur === 1 && g.chars[0].hp <= 0, [g.cur, g.chars[0].hp]);
  // 셋이 다 쓰러지면 실패
  g.chars[1].hp = 1; g.chars[2].hp = 0;
  untilTelegraph(h);
  a = g.boss.attack; g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60; g.invuln = 0;
  h.run(0.6);
  check(G, '셋이 다 쓰러지면 result', h.getState() === 'result');
  check(G, '실패 이유 글', h.els['result-reason'].textContent.indexOf('셋이 모두') === 0, h.els['result-reason'].textContent);
})();

// ---- 4. 회피와 회피 반격 ----
(function () {
  var G = '회피';
  var colors = ['yellow', 'red'];
  for (var ci = 0; ci < 2; ci++) {
    var h = fresh('', 11 + ci);
    var g = h.getGame();
    var ok = untilTelegraph(h, colors[ci]);
    check(G, colors[ci] + ' 전조가 온다', ok);
    var a = g.boss.attack;
    g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60;
    var hp0 = g.chars[g.cur].hp, c0 = g.counters, bhp = g.boss.hp, tag0 = g.chars[g.cur].tagCd = 9;
    h.key('Shift');
    check(G, colors[ci] + ' 범위 안 회피 → 반격 +1', g.counters === c0 + 1);
    check(G, colors[ci] + ' 반격이 보스 체력을 깎음', g.boss.hp < bhp);
    check(G, colors[ci] + ' 회피 반격은 태그 쿨타임 초기화 안 함', g.chars[g.cur].tagCd === 9);
    check(G, colors[ci] + ' 느려짐 시작', g.slow > 0);
    var clk = g.clock;
    h.run(0.25);
    check(G, colors[ci] + ' 느려지는 동안 시계 멈춤', g.clock === clk, [clk, g.clock]);
    check(G, colors[ci] + ' 느려짐이 0.6초 간다 (0.25초 뒤 아직)', g.slow > 0.3, g.slow);
    check(G, colors[ci] + ' 느려지는 동안 확대 유지', g.zoom > 1.4, g.zoom);
    h.run(0.4);
    check(G, colors[ci] + ' 0.65초 뒤 느려짐 끝', g.slow <= 0, g.slow);
    h.run(0.8);
    check(G, colors[ci] + ' 반격한 공격에는 안 맞음', g.chars[g.cur].hp === hp0);
  }
  // 범위 밖 회피는 반격 아님. 쿨타임 1초
  var h2 = fresh('', 21);
  var g2 = h2.getGame();
  untilTelegraph(h2);
  var a2 = g2.boss.attack; g2.player.x = a2.ox - a2.dir.x * 190; g2.player.y = a2.oy - a2.dir.y * 190; // 반대쪽 멀리
  g2.player.x = Math.max(-190, Math.min(190, g2.player.x)); g2.player.y = Math.max(-190, Math.min(190, g2.player.y));
  check(G, '옮긴 자리는 범위 밖', !h2.inAttack(a2, g2.player.x, g2.player.y), a2.p.id);
  var c0 = g2.counters;
  h2.key('Shift');
  check(G, '범위 밖 회피는 반격 아님', g2.counters === c0);
  check(G, '회피 쿨타임 1초 시작', near(g2.dodgeCd, h2.consts.DODGE_CD));
  h2.run(0.5);
  var cd = g2.dodgeCd;
  h2.key('Shift');
  check(G, '쿨타임 중 다시 못 씀', near(g2.dodgeCd, cd, 0.001));
  h2.run(0.6);
  check(G, '1초 뒤 쿨타임 0', g2.dodgeCd === 0);
  // 전조 밖 회피: 피하기만. 회피로 미끄러짐
  g2.boss.phase = 'wait'; g2.boss.attack = null; g2.boss.t = 99;
  var px = g2.player.x;
  g2.player.x = 0; g2.player.y = 150;
  h2.key('Shift'); h2.run(0.3);
  check(G, '회피로 미끄러짐 (약 100)', near(Math.hypot(g2.player.x, g2.player.y - 150), 100, 15), Math.hypot(g2.player.x, g2.player.y - 150));
  // 회피 쿨타임은 태그해도 이어서 돈다 (셋이 함께 쓰는 하나)
  g2.dodgeCd = 0.7; g2.chars.forEach(function (c) { c.tagCd = 0; });
  h2.key(' ');
  check(G, '태그해도 회피 쿨타임 그대로', near(g2.dodgeCd, 0.7));
})();

// ---- 5. 태그 ----
(function () {
  var G = '태그';
  var h = fresh('', 31);
  var g = h.getGame();
  g.boss.phase = 'wait'; g.boss.attack = null; g.boss.t = 99;
  var bhp = g.boss.hp;
  h.key(' ');
  check(G, '다음 순서(1)로 바뀜', g.cur === 1);
  check(G, '들어온 캐릭터에 15초', near(g.chars[1].tagCd, h.consts.TAG_CD));
  check(G, '나머지는 0', g.chars[0].tagCd === 0 && g.chars[2].tagCd === 0);
  check(G, '태그 공격이 170 안(시작 자리 180)에서 들어감', g.boss.hp < bhp);
  check(G, '태그 때 0.5초 무적', near(g.invuln, 0.5));
  // 멀면 태그 공격이 안 들어간다 (첫 판 뒤 바꿈)
  g.chars[2].tagCd = 0; g.player.x = 190; g.player.y = -190; var bhpFar = g.boss.hp;
  h.key(' ');
  check(G, '멀리서(268) 태그 → 캐릭터는 바뀜', g.cur === 2);
  check(G, '멀리서 태그 공격은 안 들어감', g.boss.hp === bhpFar, [bhpFar, g.boss.hp]);
  g.cur = 1; g.chars[2].tagCd = 0; g.player.x = 127; g.player.y = 127; // 시작 자리로
  h.run(1.0);
  check(G, '쿨타임이 캐릭터마다 줄어듦', near(g.chars[1].tagCd, 14, 0.05), g.chars[1].tagCd);
  h.key(' ');
  check(G, '다음 순서(2)로', g.cur === 2);
  h.key(' ');
  check(G, '0 은 OK 라 0 으로', g.cur === 0);
  h.key(' ');
  check(G, '1, 2 둘 다 쿨타임이면 안 바뀜', g.cur === 0, g.cur);
  g.chars[2].tagCd = 0;
  h.key(' ');
  check(G, '1 이 쿨타임이면 건너 2 로', g.cur === 2, g.cur);
  // 쓰러진 캐릭터 건너뛰기, 혼자 남으면 안 됨
  g.chars.forEach(function (c) { c.tagCd = 0; });
  g.chars[0].hp = 0; g.cur = 2;
  h.key(' ');
  check(G, '쓰러진 0 을 건너 1 로', g.cur === 1);
  g.chars[2].hp = 0;
  h.key(' ');
  check(G, '혼자 남으면 태그 안 됨', g.cur === 1);
  // 태그 반격 (노란) : 그 공격 범위 안에서만 (첫 판 뒤 "거리 무관"에서 바꿈), 셋 모두 초기화
  var h3 = fresh('', 41);
  var g3 = h3.getGame();
  check(G, '노란 전조가 온다', untilTelegraph(h3, 'yellow'));
  var a3 = g3.boss.attack;
  g3.player.x = 190; g3.player.y = -190; // 범위 밖 멀리
  check(G, '멀리는 범위 밖', !h3.inAttack(a3, g3.player.x, g3.player.y));
  var cFar = g3.counters, curFar = g3.cur;
  h3.key(' ');
  check(G, '범위 밖 태그는 반격 아님', g3.counters === cFar);
  check(G, '범위 밖 태그라도 캐릭터는 바뀜', g3.cur !== curFar);
  g3.cur = curFar; g3.chars.forEach(function (c) { c.tagCd = 0; });
  g3.player.x = a3.ox + a3.dir.x * 60; g3.player.y = a3.oy + a3.dir.y * 60; // 범위 안
  check(G, '옮긴 자리는 범위 안', h3.inAttack(a3, g3.player.x, g3.player.y), a3.p.id);
  g3.chars[0].tagCd = 5; g3.chars[2].tagCd = 5;
  var c0 = g3.counters, hp0 = g3.chars[1].hp;
  h3.key(' ');
  check(G, '노란 전조 중 범위 안 태그 → 태그 반격 +1', g3.counters === c0 + 1);
  check(G, '셋의 태그 쿨타임 모두 0', g3.chars.every(function (c) { return c.tagCd === 0; }), g3.chars.map(function (c) { return c.tagCd; }));
  check(G, '태그 반격 느려짐', g3.slow > 0);
  h3.run(1.0);
  check(G, '반격한 공격에 안 맞음', g3.chars[g3.cur].hp === hp0);
  // 붉은 전조 중 태그: 태그 공격만
  var h4 = fresh('', 51);
  var g4 = h4.getGame();
  check(G, '붉은 전조가 온다', untilTelegraph(h4, 'red'));
  var a4 = g4.boss.attack;
  g4.player.x = a4.ox + 50; g4.player.y = a4.oy;
  c0 = g4.counters; var bhp4 = g4.boss.hp;
  h4.key(' ');
  check(G, '붉은 전조 중 태그는 반격 아님', g4.counters === c0);
  check(G, '그래도 태그 공격은 들어감', g4.boss.hp < bhp4);
  check(G, '들어온 캐릭터 15초 그대로', near(g4.chars[g4.cur].tagCd, 15));
})();

// ---- 6. 특수 스킬과 궁극 ----
(function () {
  var G = '스킬';
  var h = fresh('', 61);
  var g = h.getGame();
  g.boss.phase = 'wait'; g.boss.attack = null; g.boss.t = 99;
  g.player.x = 60; g.player.y = 0; // 보스 가장자리에서 30 (기본 공격 범위 안)
  // A 를 누르고 있으면 0.35초마다 이어진다 (첫 판 뒤 더함)
  var bhpHold = g.boss.hp;
  h.key('a'); h.run(1.0);
  var held = bhpHold - g.boss.hp;
  check(G, 'A 누르고 1초: 기본 공격 3번쯤 (0, 0.35, 0.7초)', held >= 30 && held <= 40, held);
  h.keyUp('a'); h.run(1.0);
  check(G, 'A 떼면 더 안 나감', bhpHold - g.boss.hp === held, bhpHold - g.boss.hp);
  g.chars[g.cur].ult = 0;
  var bhp = g.boss.hp;
  h.key('a');
  check(G, '기본 공격 들어감', g.boss.hp === bhp - 10);
  check(G, '기본 공격으로 궁극 +4', g.chars[0].ult === 4);
  h.key('a');
  check(G, '0.35초 안 다시 못 침', g.boss.hp === bhp - 10);
  h.key('s');
  check(G, '특수 스킬 40', g.boss.hp === bhp - 50);
  check(G, '특수로 궁극 +15', g.chars[0].ult === 19);
  check(G, '특수 쿨타임 8', near(g.chars[0].specialCd, h.consts.SPECIAL_CD));
  h.key('s');
  check(G, '쿨타임 중 특수 안 나감', g.boss.hp === bhp - 50);
  g.chars[2].specialCd = 8;
  h.run(2.0);
  check(G, '쉬는 캐릭터(2)의 특수 쿨도 줄어듦', near(g.chars[2].specialCd, 6, 0.05), g.chars[2].specialCd);
  h.key('d');
  check(G, '게이지 안 차면 궁극 안 나감', g.ultCount[0] === 0);
  g.chars[0].ult = 100; g.player.x = 190; g.player.y = 190; bhp = g.boss.hp;
  h.key('d');
  check(G, '궁극은 거리 무관 120', g.boss.hp === bhp - 120);
  check(G, '궁극 쓴 횟수 +1 (캐릭터 0)', g.ultCount[0] === 1 && g.ultCount[1] === 0);
  check(G, '궁극 게이지 0 으로', g.chars[0].ult === 0);
  // 궁극 게이지는 캐릭터마다 따로
  g.chars.forEach(function (c) { c.tagCd = 0; });
  h.key(' ');
  check(G, '태그 뒤 다른 캐릭터 게이지는 0', g.chars[1].ult === 0);
  g.player.x = 60; g.player.y = 0; g.attackCd = 0;
  h.key('a');
  check(G, '캐릭터 1 의 게이지만 +4', g.chars[1].ult === 4 && g.chars[0].ult === 0);
  // 특수 범위 밖
  g.player.x = 190; g.player.y = 190; g.chars[1].specialCd = 0; bhp = g.boss.hp;
  h.key('s');
  check(G, '특수 범위 밖이면 안 들어감 (쿨타임은 돎)', g.boss.hp === bhp && g.chars[1].specialCd > 0);
})();

// ---- 7. 그로기 ----
(function () {
  var G = '그로기';
  var h = fresh('', 71);
  var g = h.getGame();
  g.counters = h.consts.GROGGY_NEED - 1;
  check(G, '노란 전조가 온다', untilTelegraph(h, 'yellow'));
  var a = g.boss.attack;
  g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60;
  h.key('Shift');
  check(G, '10번째 반격 → groggyWait', h.getState() === 'groggyWait', h.getState());
  check(G, '버튼 보임', !h.els.groggy.classList.contains('hidden'));
  var clk = g.clock;
  h.run(2.0);
  check(G, '기다리는 동안 시계 멈춤', g.clock === clk);
  check(G, '기다리는 동안 보스 전조 없음', g.boss.attack === null);
  h.key('f');
  check(G, 'F → groggyAnim', h.getState() === 'groggyAnim');
  check(G, '버튼 숨김', h.els.groggy.classList.contains('hidden'));
  h.run(1.0);
  check(G, '연출 중 시계 멈춤', g.clock === clk);
  check(G, '1초 뒤 아직 연출', h.getState() === 'groggyAnim');
  var bhp = g.boss.hp;
  h.run(1.1);
  check(G, '2초 뒤 fight 로', h.getState() === 'fight');
  check(G, '무력화 8초 시작 (틱 오차 안)', near(g.groggy, h.consts.GROGGY_TIME, 0.15), g.groggy);
  check(G, '보스 stunned', g.boss.phase === 'stunned');
  check(G, '그로기 액션 대미지', g.boss.hp < bhp);
  g.player.x = 60; g.player.y = 0; g.attackCd = 0; bhp = g.boss.hp;
  h.key('a');
  check(G, '무력화 중 대미지 2배 (20)', g.boss.hp === bhp - 20, bhp - g.boss.hp);
  h.run(4.0);
  check(G, '4초 뒤 무력화 약 4초 남음, 보스 공격 없음', near(g.groggy, 4, 0.1) && g.boss.attack === null, g.groggy);
  check(G, '무력화 중 시계는 흐름', g.clock > clk + 3.5);
  h.run(4.2);
  check(G, '8초 뒤 무력화 끝, 반격 횟수 0', g.groggy === 0 && g.counters === 0 && g.boss.phase === 'wait', [g.groggy, g.counters, g.boss.phase]);
  // 클릭으로도 (버튼 핸들러는 doGroggy 를 state 로 가림) - F 로 fight 중 누르면 무시
  h.key('f');
  check(G, 'fight 중 F 는 아무 일 없음', h.getState() === 'fight');
})();

// ---- 8. 랭킹판과 ?test ----
(function () {
  var G = '랭킹';
  for (var k in store) delete store[k];
  var times = [100, 80, 120, 60, 140, 90, 70];
  var h;
  for (var i = 0; i < times.length; i++) {
    h = fresh('', 81 + i);
    var g = h.getGame();
    g.clock = times[i];
    g.boss.phase = 'wait'; g.boss.attack = null; g.boss.t = 99;
    g.boss.hp = 5; g.player.x = 60; g.player.y = 0; g.attackCd = 0;
    h.key('a');
    check(G, '판 ' + (i + 1) + ' 격파 성공', h.getState() === 'result' && h.els['result-title'].textContent === '격파 성공');
  }
  var saved = JSON.parse(store['g2-slice-rank']);
  check(G, '5개만 남음', saved.length === 5, saved.length);
  check(G, '짧은 순 정렬', saved.map(function (r) { return r.t; }).join(',') === '60,70,80,90,100', saved.map(function (r) { return r.t; }));
  check(G, '성공하면 랭킹 보임', !h.els['rank-wrap'].classList.contains('hidden'));
  var rows = h.els['rank-table'].children;
  check(G, '마지막 판(70) 은 2위 줄이 빛남', rows[1] && rows[1].className === 'me', rows.map(function (r) { return r.className; }));
  check(G, '결과에 궁극 횟수', h.els['result-reason'].textContent.indexOf('궁극 스킬 쓴 횟수') >= 0, h.els['result-reason'].textContent);
  // 5위 밖 성공
  h = fresh('', 99); var g9 = h.getGame();
  g9.clock = 170; g9.boss.phase = 'wait'; g9.boss.attack = null; g9.boss.t = 99; g9.boss.hp = 5; g9.player.x = 60; g9.player.y = 0;
  h.key('a');
  rows = h.els['rank-table'].children;
  check(G, '5위 밖이면 빛나는 줄 없음 + 안내 줄', rows.length === 6 && rows.every(function (r) { return r.className !== 'me'; }) && rows[5].innerHTML.indexOf('5위 안에') >= 0);
  check(G, '5위 밖 판은 저장 안 바뀜', JSON.parse(store['g2-slice-rank']).length === 5 && JSON.parse(store['g2-slice-rank'])[4].t === 100);
  // ?test
  var before = store['g2-slice-rank'];
  var ht = load('?test');
  ht.key('Enter');
  check(G, '?test 는 게이지 찬 채로 시작', ht.getGame().counters === ht.consts.GROGGY_NEED);
  ht.run(3.1);
  check(G, '?test 는 싸움 시작 즉시 groggyWait', ht.getState() === 'groggyWait', ht.getState());
  ht.key('f'); ht.run(2.1);
  var gt = ht.getGame();
  gt.clock = 10; gt.boss.hp = 5; gt.player.x = 60; gt.player.y = 0; gt.attackCd = 0;
  ht.key('a');
  check(G, '?test 격파 성공', ht.getState() === 'result');
  rows = ht.els['rank-table'].children;
  check(G, '?test 랭킹은 예시 5개 + 내 줄 (6줄, 1위 빛남)', rows.length === 5 && rows[0].className === 'me' && rows[1].innerHTML.indexOf('예시') >= 0, rows.length);
  check(G, '?test 는 저장 안 함', store['g2-slice-rank'] === before);
})();

// ---- 9. 그리기가 상태마다 터지지 않음 ----
(function () {
  var G = '그리기';
  var h = load('');
  try { h.draw(); check(G, 'title 그리기', true); } catch (e) { check(G, 'title 그리기', false, e.message); }
  h.key('Enter');
  try { h.run(1); h.draw(); check(G, 'intro 그리기', true); } catch (e) { check(G, 'intro 그리기', false, e.message); }
  try { h.run(2.2); untilTelegraph(h); h.draw(); check(G, 'telegraph 그리기', true); } catch (e) { check(G, 'telegraph 그리기', false, e.message); }
  try { h.run(0.55); h.draw(); check(G, 'active 그리기', true); } catch (e) { check(G, 'active 그리기', false, e.message); }
  var g = h.getGame();
  try { g.counters = 10; g.boss.phase = 'telegraph'; untilTelegraph(h, 'yellow'); var a = g.boss.attack; g.player.x = a.ox + a.dir.x * 60; g.player.y = a.oy + a.dir.y * 60; h.key('Shift'); h.draw(); check(G, 'groggyWait + zoom 그리기', h.getState() === 'groggyWait', h.getState()); } catch (e) { check(G, 'groggyWait 그리기', false, e.message); }
  try { h.run(0.5); h.key('f'); h.run(1); h.draw(); check(G, 'groggyAnim 그리기', true); } catch (e) { check(G, 'groggyAnim 그리기', false, e.message); }
  try { h.run(1.2); h.draw(); check(G, 'stunned 그리기', g.boss.phase === 'stunned'); } catch (e) { check(G, 'stunned 그리기', false, e.message); }
  // 돌진은 0.25초에 걸쳐 미끄러진다 (첫 판 뒤 순간이동에서 바꿈)
  var hd = fresh('', 300), gd = hd.getGame();
  var okDash = false;
  for (var tries = 0; tries < 30 && !okDash; tries++) { untilTelegraph(hd); okDash = gd.boss.attack && gd.boss.attack.p.id === 'dash'; if (!okDash) hd.run(1.5); }
  check(G, '돌진 전조가 온다', okDash);
  if (okDash) {
    var ad = gd.boss.attack, sx = ad.ox, sy = ad.oy;
    gd.player.x = 190; gd.player.y = 190;
    hd.run(hd.consts.TELEGRAPH + 0.05);
    var moved1 = Math.hypot(gd.boss.x - sx, gd.boss.y - sy);
    check(G, '전조 끝 직후 보스는 조금만 움직임 (순간이동 아님)', moved1 > 0 && moved1 < ad.p.len * 0.6, moved1);
    hd.run(0.1);
    var moved2 = Math.hypot(gd.boss.x - sx, gd.boss.y - sy);
    check(G, '0.1초 뒤 더 나아감', moved2 > moved1, [moved1, moved2]);
    hd.run(0.2);
    var moved3 = Math.hypot(gd.boss.x - sx, gd.boss.y - sy);
    var endD = Math.hypot(Math.max(-170, Math.min(170, ad.ox + ad.dir.x * ad.p.len)) - sx, Math.max(-170, Math.min(170, ad.oy + ad.dir.y * ad.p.len)) - sy);
    check(G, '0.25초 뒤 직선 끝 (바닥 안으로 자른 자리)', near(moved3, endD, 0.5), [moved3, endD]);
    check(G, '미끄러진 뒤 recover', gd.boss.phase === 'recover', gd.boss.phase);
  }
  // 돌진이 보스를 바닥 밖으로 내보내지 않는다 (여러 판)
  var out = 0;
  for (var s = 0; s < 20; s++) {
    var hh = fresh('', 200 + s); var gg = hh.getGame();
    for (var i = 0; i < 60 * 40 && hh.getState() === 'fight'; i++) { hh.step(1 / 60); if (Math.abs(gg.boss.x) > 200 || Math.abs(gg.boss.y) > 200) out++; }
  }
  check(G, '40초 x 20판 동안 보스가 바닥 밖으로 안 나감', out === 0, out);
})();

console.log('검사 ' + (pass + fail) + '개: 통과 ' + pass + ', 실패 ' + fail);
console.log('묶음별: ' + Object.keys(groups).map(function (k) { return k + ' ' + groups[k]; }).join(' + '));

// ---- 봇 시뮬레이션: 2분 언저리인가 ----
if (process.argv[3] === 'sim') {
  function sim(seed, skill) {
    var h = fresh('', seed); var g = h.getGame(); var dt = 1 / 60; var t = 0; var lastTele = null;
    var hits = 0, counters = 0;
    while (h.getState() !== 'result' && t < 400) {
      if (h.getState() === 'groggyWait') h.key('f');
      if (h.getState() === 'fight') {
        var b = g.boss, d = Math.hypot(g.player.x - b.x, g.player.y - b.y);
        var c = g.chars[g.cur];
        // 보스 쪽으로 다가감 (한 번에 전부)
        if (d > 70 && !g.dodge) { var k = (d - 65) / d; g.player.x += (b.x - g.player.x) * Math.min(1, 170 * dt / (d - 65 || 1)); g.player.y += (b.y - g.player.y) * Math.min(1, 170 * dt / (d - 65 || 1)); }
        if (b.phase === 'telegraph' && b.attack && b.attack !== lastTele) {
          // 전조 시작 뒤 0.2초쯤에 반응. 성공 확률 skill
          if (b.t < h.consts.TELEGRAPH - 0.2) {
            lastTele = b.attack;
            if (Math.random() < skill) {
              var inside = h.inAttack(b.attack, g.player.x, g.player.y);
              var canTag = b.attack.p.color === 'yellow' && g.chars.some(function (cc, i) { return i !== g.cur && cc.hp > 0 && cc.tagCd <= 0; });
              if (canTag && Math.random() < 0.5) { var c0 = g.counters; h.key(' '); if (g.counters > c0) counters++; }
              else if (inside && g.dodgeCd <= 0) { var c1 = g.counters; h.key('Shift'); if (g.counters > c1) counters++; }
              else if (g.dodgeCd <= 0) h.key('Shift');
            }
          }
        }
        if (b.phase !== 'telegraph') lastTele = null;
        if (c.ult >= 100) h.key('d');
        if (c.specialCd <= 0 && d < 200) h.key('s');
        if (g.attackCd <= 0 && d < 100) h.key('a');
      }
      var hpBefore = g.chars.reduce(function (s, c) { return s + c.hp; }, 0);
      h.step(dt); t += dt;
      var hpAfter = g.chars.reduce(function (s, c) { return s + c.hp; }, 0);
      if (hpAfter < hpBefore) hits++;
    }
    return { win: g.result && g.result.win, clock: g.clock, real: t, hits: hits, counters: counters, ults: g.ultCount.slice() };
  }
  [0.9, 0.7, 0.5].forEach(function (skill) {
    var res = [];
    for (var s = 0; s < 8; s++) res.push(sim(1000 + s * 7, skill));
    var wins = res.filter(function (r) { return r.win; });
    var avg = wins.length ? wins.reduce(function (a, r) { return a + r.clock; }, 0) / wins.length : 0;
    console.log('반응 성공률 ' + skill + ': 8판 중 성공 ' + wins.length + ', 성공 판 평균 클리어 ' + avg.toFixed(1) + '초, 클리어들 ' + wins.map(function (r) { return r.clock.toFixed(0); }).join('/') + ', 맞은 횟수 평균 ' + (res.reduce(function (a, r) { return a + r.hits; }, 0) / res.length).toFixed(1) + ', 반격 평균 ' + (res.reduce(function (a, r) { return a + r.counters; }, 0) / res.length).toFixed(1) + ', 궁극 평균 ' + (res.reduce(function (a, r) { return a + r.ults.reduce(function (x, y) { return x + y; }, 0); }, 0) / res.length).toFixed(1) + ', 실제 시간 평균 ' + (res.reduce(function (a, r) { return a + r.real; }, 0) / res.length).toFixed(0) + '초');
  });
}
