// 게임 3 검사. 결과는 #out 에 "PASS 이름" / "FAIL 이름 — 까닭" 한 줄씩, 맨 끝에 합계.
'use strict';
(function () {
var g3 = window.G3, TS = g3.TS, CFG = g3.CFG;
var lines = [], pass = 0, fail = 0, group = '';
function ok(cond, name, why) { var n = group + ' ' + name; if (cond) { pass++; lines.push('PASS ' + n); } else { fail++; lines.push('FAIL ' + n + (why !== undefined ? ' — ' + why : '')); } }
function sim(sec) { var n = Math.round(sec * 60); for (var i = 0; i < n; i++) g3.update(1 / 60); }
function clearKeys() { ['left', 'right', 'up', 'jump', 'atk', 'ult'].forEach(function (k) { g3.release(k); }); }
// 시험용 맵: 평평한 땅 (열 0~59), 필요하면 더 만든다
function flat(extra) { return { id: 'T', name: 'T', chars: [0, 1, 2], theme: 'forest', build: function () { var m = g3.Builder(60); m.floor(0, 59).at(5, 13); if (extra) extra(m); return m; } }; }
function start(def, ch) { clearKeys(); g3.startLevel(def, { test: true }); if (ch != null) g3.P.char = ch; sim(0.1); }
function G() { return g3.G; } function P() { return g3.P; }
// 문 앞에 서서 ↑ 를 눌러 문을 연다 (2026-11-24 사용자: 모든 스테이지는 문에서 ↑). 여는 연출을 기다린다
function openDoor() { var d = G().door; P().x = d.x + d.w / 2 - P().w / 2; P().y = d.y + d.h - P().h; P().vx = 0; sim(0.05); g3.press('up'); g3.update(1 / 60); g3.release('up'); sim(3.0); }
function run(fn, name) { try { fn(); } catch (e) { ok(false, name || 'error', e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : String(e)); } }

// ---------- 작업 1: 바탕 ----------
group = '[바탕]';
run(function () {
  start(flat());
  ok(P().onGround, '처음에 땅에 선다');
  var y0 = P().y, minY = y0; g3.press('jump'); for (var i = 0; i < 60; i++) { g3.update(1 / 60); minY = Math.min(minY, P().y); }
  var h = (y0 - minY) / TS; ok(h > 2.3 && h < 3, '점프 높이 약 2.7칸 (2.3~3)', h.toFixed(2)); g3.release('jump');
  start(flat()); g3.press('right'); sim(0.4); var x0 = P().x; g3.press('jump'); sim(0.02); var air = 0; while (!P().onGround && air < 120) { g3.update(1 / 60); air++; } var reach = (P().x - x0) / TS;
  ok(reach > 3 && reach < 4.3, '달리며 점프 거리 약 3.7칸 (3~4.3)', reach.toFixed(2)); clearKeys();
  // 코요테 타임: 땅을 벗어난 직후 0.08초 안의 점프도 된다
  start(flat(function (m) { for (var c = 12; c < 20; c++) for (var r = 14; r < 17; r++) m.g[r][c] = ' '; }));
  P().x = 11 * TS + 4; P().vx = CFG.run; g3.press('right'); var t = 0; while (P().onGround && t < 60) { g3.update(1 / 60); t++; } sim(0.05); g3.press('jump'); sim(0.05);
  ok(P().vy < 0, '코요테 타임: 떨어지기 시작한 뒤 0.05초의 점프도 된다', P().vy.toFixed(0)); clearKeys();
});
run(function () {   // 2026-11-24 reviewer 뒤 고침: 얼음 표시가 땅에서 꺼짐, 월드 문은 생명의 잔이 있어야 열림
  start(flat()); P().onIce = true; sim(0.2); ok(P().onIce === false, '얼음 위가 아니면 얼음 표시가 꺼진다 (떨어진 뒤 돌아올 자리가 계속 바뀜)', 'onIce ' + P().onIce);
  g3.startLevel(4, { test: true }); var d = G().door; P().x = d.x + d.w / 2 - P().w / 2; P().y = d.y + d.h - P().h; P().vx = 0; sim(0.05); g3.press('up'); g3.update(1 / 60); g3.release('up'); sim(0.1);
  ok(!G().doorAnim && G().mode === 'play', '생명의 잔 없이 월드 클리어 문은 열리지 않는다', 'anim ' + !!G().doorAnim + ' mode ' + G().mode);
});
run(function () {   // 2026-11-24 사용자: 떨어지면 체력 1칸을 잃고 떨어지기 전 마지막 발판에서 다시
  start(flat(function (m) { for (var c = 20; c < 30; c++) for (var r = 14; r < 17; r++) m.g[r][c] = ' '; }));
  P().x = 17 * TS; P().y = 13 * TS - P().h; sim(0.2); var sx = P().x;
  P().x = 24 * TS; P().y = 10 * TS; var tt = 0; while (G().hp === 3 && tt < 200) { g3.update(1 / 60); tt++; }
  ok(G().hp === 2 && G().hitThisRun && P().x <= sx + 1 && P().x >= sx - 1.5 * TS - 1 && P().lockIn > 0 && G().runTime > 0.5, '틈에 떨어지면 체력 1칸을 잃고 마지막으로 디딘 자리(낭떠러지 끝이면 왔던 쪽으로 한 칸 반 안쪽)에서 다시, 잠깐 방향키를 받지 않음', 'hp ' + G().hp + ' x ' + Math.round(P().x) + ' (디딘 자리 ' + Math.round(sx) + ')');
  G().hp = 1; P().inv = 0; P().x = 24 * TS; P().y = 10 * TS; tt = 0; while (G().hp > 0 && tt < 200) { g3.update(1 / 60); tt++; } sim(1.0);
  ok(G().hp === 3 && G().runTime < 1.0 && Math.abs(P().x - 5 * TS - 4) < 6, '마지막 체력에서 떨어지면 스테이지 처음에서 다시', 'hp ' + G().hp + ' x ' + Math.round(P().x));
});
run(function () {
  start(flat(function (m) { m.goal(20, 13); }));
  P().x = 20 * TS + 4; sim(0.3); ok(G().mode === 'play', '문에 닿기만 해서는 클리어되지 않는다 (↑ 로 연다)', G().mode); openDoor();
  ok(G().mode === 'clear', '문 앞에서 ↑ 를 누르면 문이 열리고 클리어', G().mode);
  ok(g3.menus.clear.isOpen() && g3.menus.clear.selected() === 0, '클리어 화면은 "다음 스테이지"가 먼저 골라져 있다');
  ok(G().lastGot.join() === '1,1,0', '안 맞고 보물 없이 깨면 별 [1,1,0]', G().lastGot.join());
});
run(function () {
  start(flat(function (m) { m.ent('g', 10, 13); }));
  P().x = 9 * TS; G().enemies[0].t = 0; sim(0.4);   // 슬라임은 가까운 플레이어 쪽으로 기어 온다 (2026-11-24)
  ok(G().hp === 2 && G().hitThisRun, '적에 닿으면 체력 1칸 줄고 "맞음"이 남는다', 'hp ' + G().hp);
  var hp = G().hp; sim(0.3); ok(G().hp === hp, '맞은 뒤 무적 시간 동안은 더 줄지 않는다');
  G().hp = 1; P().inv = 0; P().skill = null; var e = G().enemies[0]; if (e) { e.x = P().x; e.y = P().y + P().h - e.h; e.stun = 0; } sim(0.05);
  ok(G().dying > 0, '체력이 다 닳으면 쓰러진다'); sim(1.0); ok(G().hp === 3 && G().runTime < 0.5, '쓰러지면 스테이지 처음에서 다시 (체력 3)', 'hp ' + G().hp);
});
run(function () {
  start(flat(function (m) { m.ent('T', 12, 13); }));
  P().x = 12 * TS + 4; sim(0.1); ok(G().treasure, '보물을 얻는다');
  start(flat(function (m) { m.ent('T', 12, 13); m.goal(20, 13); })); P().x = 12 * TS + 4; sim(0.1); openDoor();
  ok(G().lastGot && G().lastGot.join() === '1,1,1', '보물을 얻고 안 맞고 깨면 별 셋', G().lastGot && G().lastGot.join());
});

// ---------- 작업 2: 태그와 세 기술 ----------
group = '[태그]';
run(function () {
  start(flat(), 0);
  ok(G().stack === 3, '스택은 3 으로 시작 (2026-11-24 2 에서 3)');
  ok(g3.tag(0) === true && G().stack === 2 && P().char === 0 && P().skill && P().skill.type === 'dash' && G().lastTag.self, '지금 캐릭터의 키는 자기 기술 (스택 1 을 쓴다)'); sim(0.5); G().stack = 3; G().regen = 0;
  ok(g3.tag(1) === true && G().stack === 2 && P().char === 1, '태그하면 그 캐릭터로 바뀌고 스택 1 을 쓴다');
  ok(P().skill && P().skill.type === 'slide', '태그하면 기술이 저절로 나간다 (NORMAL 에서도, T01)');
  ok(G().lastTag.perfect === false, '적이 없으면 NORMAL (T01)');
  sim(0.6); g3.tag(0); sim(0.6); g3.tag(2); ok(G().stack === 0, '세 번 태그하면 스택 0 (이동 연계 기회가 지난 뒤)');
  sim(0.4); ok(g3.tag(0) === false, '스택 0 이면 태그가 안 된다');
  sim(1.7); ok(G().stack >= 1, '2초 뒤 스택 1 이 찬다', G().stack);
  start({ id: 'T', name: 'T', chars: [0, 1], theme: 'forest', build: function () { var m = g3.Builder(40); m.floor(0, 39).at(5, 13); return m; } }, 0);
  ok(g3.tag(2) === false, '1-1 처럼 바람이 없는 스테이지에서는 D 키가 아무 일도 하지 않는다');
});
run(function () {
  start(flat(), 1); P().face = 1; var x0 = P().x; g3.tag(0); sim(CFG.dashT + 0.02);
  var d = (P().x - x0) / TS; ok(d > 5.5 && d < 7, '빨강 돌진 약 6칸', d.toFixed(2));
  start(flat(), 0); P().face = 1; x0 = P().x; var y0 = P().y; g3.press('right'); g3.tag(1); sim(CFG.slideT + 0.02);
  d = (P().x - x0); ok(Math.abs(d - CFG.slideDist) < 14, '파랑 활주: 캐릭터 폭의 5배 (120)', d.toFixed(0)); clearKeys();
  ok(G().ice && G().ice.segs.length > 3 && G().ice.done, '활주하면 얼음 길이 생긴다 (T07)');
  start(flat(), 0); y0 = P().y + P().h; g3.press('up'); g3.tag(1); g3.release('up'); sim(CFG.slideT + 0.05);
  var pil = G().ice && G().ice.segs.filter(function (s) { return s.pillar; })[0];
  ok(pil && Math.abs((y0 - pil.y) - CFG.upDist) < 8, '파랑 상(위): 짧게 올라가고 얼음 기둥이 남는다', pil && (y0 - pil.y).toFixed(0));
  sim(0.3); ok(P().onGround && Math.abs(P().y + P().h - pil.y) < 1, '얼음 기둥 꼭대기에 선다');
  start(flat(), 0); g3.press('right'); g3.press('up'); x0 = P().x; y0 = P().y; g3.tag(1); sim(CFG.slideT); clearKeys();
  ok(P().x - x0 > 70 && y0 - P().y > 70, '파랑 우상: 비스듬히 오른다', (P().x - x0).toFixed(0) + ',' + (y0 - P().y).toFixed(0));
  start(flat(), 0); y0 = P().y; var minY = y0; g3.tag(2); for (var i = 0; i < 50; i++) { g3.update(1 / 60); minY = Math.min(minY, P().y); }
  d = (y0 - minY) / TS; ok(d > 6.5, '바람 상승 기류: 7칸 가까이 솟는다', d.toFixed(2));
});
run(function () {
  // T08, T09: 얼음 길은 태그해도 남고 다른 캐릭터가 밟는다. 1.5초 뒤 사라지고 0.3초 전부터 금
  start(flat(function (m) { for (var c = 12; c < 30; c++) for (var r = 14; r < 17; r++) m.g[r][c] = ' '; }), 0);
  P().x = 13 * TS; P().y = 9 * TS; P().vy = 0; P().face = 1; g3.press('right'); g3.tag(1); sim(CFG.slideT + 0.01); clearKeys();
  var segY = G().ice.segs[2].y; P().vx = 0; sim(0.05); g3.tag(0); sim(CFG.dashT + 0.05);
  ok(G().ice && G().ice.segs.length > 0, '태그해도 얼음 길이 남는다 (T08)');
  P().x = G().ice.segs[2].x; P().y = segY - 80; P().vy = 0; P().vx = 0; sim(0.35);
  ok(P().onGround && Math.abs(P().y + P().h - segY) < 1, '다른 캐릭터가 얼음 길 위에 선다 (T08)', (P().y + P().h - segY).toFixed(1));
  start(flat(), 0); g3.tag(1); sim(CFG.slideT + 0.01); var life0 = G().ice.life; sim(1.25); ok(G().ice && G().ice.life < CFG.iceWarn, '사라지기 0.3초 전부터 금이 간다 (T09)'); sim(0.35); ok(!G().ice, '다 만들어진 뒤 1.5초면 사라진다 (T09)', life0);
  start(flat(), 0); g3.tag(1); sim(0.5); var first = G().ice; sim(2.0); g3.tag(1 === P().char ? 0 : 1); if (P().char !== 1) { sim(0.4); g3.tag(1); } ok(G().ice !== first, '새 길을 만들면 옛 길은 사라진다 (하나만)');
});

// ---------- 작업 3: 적과 PERFECT ----------
group = '[PERFECT]';
function fight(build) { start(flat(build), 1); P().face = 1; }
run(function () {
  fight(function (m) { m.ent('g', 9, 13); });
  g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; }
  ok(!!G().perfect, '기술이 적에 맞으면 PERFECT 기회가 생긴다');
  var g0 = G().gauge; ok(g0 === CFG.gaugeNormal, '기술이 적을 맞히면 게이지 +10', g0);
  var stack = G().stack; sim(0.1); g3.tag(1);
  ok(G().lastTag.perfect === true, '맞은 직후 0.25초 안의 태그는 PERFECT (T02)');
  ok(G().stack === stack - 1 && P().skill.dmgMul === CFG.perfectDmgMul, 'PERFECT 면 스택은 돌려받지 않고, 들어오는 기술 대미지 1.5배 (2026-11-24 사용자, 예전 T02 의 돌려받기를 바꿈)', stack + '→' + G().stack);
  ok(G().echoes.length === 1, 'PERFECT 면 에코가 남는다 (T02)');
  ok(G().gauge === g0 + CFG.gaugePerfect, 'PERFECT 면 게이지 +25', G().gauge);
  ok(G().pops.some(function (p) { return p.text === 'PERFECT'; }) && G().flash > 0, "'PERFECT' 글자와 번쩍임 (타이밍 피드백)");
});
run(function () {
  fight(); g3.tag(0); sim(0.1); g3.tag(1); ok(G().lastTag.perfect === false, '허공에 쓴 기술 뒤의 태그는 NORMAL (T03)');
  fight(function (m) { m.ent('g', 9, 13); }); g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; } sim(0.3); g3.tag(1);
  ok(G().lastTag.perfect === false, '0.25초가 지난 태그는 NORMAL (T04)');
  fight(function (m) { m.ent('g', 9, 13); m.ent('g', 10, 13); }); g3.tag(0); sim(0.28);
  var hits = P().skill ? P().skill.hit.length : -1; var pg = G().perfect && G().perfect.skill;
  ok(hits === 2 && pg && pg.perfectGiven, '두 적을 맞혀도 기술 한 번에 PERFECT 기회는 한 번 (T12)', hits);
});
run(function () {
  // T05: PERFECT 로 나온 기술이 맞으면 다시 기회
  fight(function (m) { m.ent('g', 9, 13); m.ent('g', 17, 13); m.ent('g', 18, 13); });
  g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; } G().enemies.slice(1).forEach(function (e, i) { e.x = P().x - 2 + i * 6; e.t = 0.6; }); g3.tag(2);   // 클로에 상승이 발밑 적을 맞힘 (오필리아 활주는 대미지 없음)
  var firstWin = G().perfect; t = 0; while ((G().perfect === firstWin || G().perfect.kind === 'move') && t < 40) { g3.update(1 / 60); t++; }
  ok(G().perfect && G().perfect !== firstWin && !G().perfect.used, '태그로 나온 기술이 맞으면 다시 PERFECT 기회 (T05)');
  var pw0 = G().perfect, stk = G().stack, tr = g3.tag(0); ok(G().lastTag.perfect, '이어서 PERFECT (T05)', 'tag ' + tr + ' stack ' + stk + ' kind ' + (pw0 && pw0.kind) + ' used ' + (pw0 && pw0.used) + ' left ' + (pw0 && (pw0.until - G().time).toFixed(2)) + ' chain ' + G().lastTag.chain);
});
run(function () {
  fight(function (m) { m.ent('g', 7, 13); }); P().char = 0; G().enemies[0].x = P().x + P().w + 16; g3.press('atk'); sim(0.2); clearKeys();
  var e = G().enemies[0]; ok(e && e.hp < 3, '기본 공격 F 가 적을 맞힌다'); ok(!G().perfect, '기본 공격으로는 PERFECT 기회가 생기지 않는다');
  ok(G().gauge === 0, '기본 공격은 게이지를 채우지 않는다');
});
run(function () {
  fight(); g3.press('right'); g3.tag(0); sim(0.1); g3.tag(2); clearKeys();
  ok(G().lastTag.perfect === false && G().gauge === 0, '순수 이동 중 태그는 보상 없이 기술만 (T06)');
});
run(function () {
  // T10: 빨강 돌진은 공중 적을 맞히며 멈추지 않는다
  fight(function (m) { m.ent('f', 9, 12); });
  var f = G().enemies[0]; f.bx = 9 * TS; f.by = P().y + 8; f.y = P().y + 8; f.x = 9 * TS; f.t = 0;   // 공중 적의 출렁임 시작점을 고정 (처음엔 무작위라 가끔 돌진 길 밖에 있었음)
  g3.tag(0); var vx0 = P().vx; sim(0.2);
  ok(f.hp < 2 && P().skill && P().skill.type === 'dash' && Math.abs(P().vx - vx0) < 1, '돌진이 공중 적을 맞히고도 멈추지 않는다 (T10)', 'hp ' + f.hp);
  ok(G().hp === 3, '돌진 중에는 적에 닿아도 다치지 않는다');
});
run(function () {
  // 에코가 적을 마저 때린다
  fight(function (m) { m.ent('g', 9, 13); m.ent('g', 13, 13); });
  g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; } g3.tag(2);
  sim(0.3); var e2 = G().enemies.filter(function (e) { return e.x > 12 * TS; })[0];
  ok(e2 && e2.hp < 3, '에코(나가는 빨강의 돌진)가 남은 공격을 마저 한다', e2 && e2.hp);
});

// ---------- 작업 4: 게이지와 합동 필살기 ----------
group = '[필살기]';
run(function () {
  start(flat(function (m) { m.ent('g', 12, 13); m.ent('g', 40, 13); })); G().gauge = 100; g3.press('ult'); sim(0.05); clearKeys();
  ok(!!G().ult && G().gauge === 0, 'E 로 합동 필살기, 게이지 0 (T11)');
  sim(3.6); ok(!G().ult, '합동 필살기 체인 에코 ver.2 는 3.1초 (맞을 때 멈칫 0.3초를 더해 약 3.4초) 뒤 끝난다 (2026-11-24)'); var near = G().enemies.filter(function (e) { return e.x < 20 * TS; })[0], far = G().enemies.filter(function (e) { return e.x > 30 * TS; })[0];
  ok(!near || near.hp <= 0 || near.dead, '가까운 적은 필살기에 맞는다'); ok(far && far.hp === 3, '화면 밖 먼 적은 맞지 않는다 (범위: 화면 전체)');
  start(flat()); G().gauge = 60; g3.press('ult'); sim(0.05); clearKeys(); ok(!G().ult, '게이지가 차지 않으면 쓸 수 없다');
});

// ---------- 작업 5·6: 스테이지 ----------
group = '[스테이지]';
run(function () {
  ok(g3.LEVELS.length === 5, '스테이지 다섯 (1-1 ~ 1-5)');
  g3.LEVELS.forEach(function (def, i) {
    var lv = g3.parseLevel(def);
    ok(!!lv.start, def.id + ' 시작 자리');
    ok(!!lv.door, def.id + (def.boss ? ' 보스 뒤 월드 클리어 문' : ' 골인 문'));
    ok(lv.ents.filter(function (e) { return e.type === 'T'; }).length === 1, def.id + ' 숨겨진 보물 하나');
    ok(i === 0 ? def.chars.join() === '0,1' : def.chars.join() === '0,1,2', def.id + (i === 0 ? ' 는 빨강·파랑 둘' : ' 는 셋'));
    // 태그로만 지나는 곳: 점프로 못 넘는 틈(5칸 이상) 또는 점프로 못 오르는 벽(3칸 이상)
    var col = []; for (var c = 0; c < lv.w; c++) { var top = -1; for (var r = 0; r < 17; r++) if (lv.g[r][c] === '#') { top = r; break; } col.push(top); }
    var gap = 0, maxGap = 0, maxRise = 0;
    for (c = 0; c < lv.w; c++) { if (col[c] < 0) { gap++; maxGap = Math.max(maxGap, gap); } else gap = 0; if (c > 0 && col[c] >= 0 && col[c - 1] >= 0) maxRise = Math.max(maxRise, col[c - 1] - col[c]); }
    ok(maxGap >= 5 || maxRise >= 3, def.id + ' 태그로만 지나는 곳 (틈 ' + maxGap + '칸, 벽 ' + maxRise + '칸)');
    ok(lv.hints.length >= 1, def.id + ' 처음 겪는 장애물 앞 짧은 키 표시');
  });
  ok(g3.LEVELS[2].build().hints.some(function (h) { return h.text.indexOf('PERFECT') >= 0; }), '1-3 에 PERFECT 연습 자리');
  ok(g3.LEVELS[1].build().hints.some(function (h) { return h.text.indexOf('[D]') === 0; }), '1-2 에서 클로에 키 [D] 를 처음 알린다');
  ok(g3.LEVELS[3].build().hints.some(function (h) { return h.text.indexOf('[E]') >= 0; }), '1-4 에서 필살기 키 [E] 를 처음 알린다');
  start(0); ok(g3.activeHint() && g3.activeHint().text.indexOf('이동') >= 0, '1-1 처음 자리에서 이동 키 표시');
  ok(P().char === 0, '스테이지는 빨강으로 시작');
});
// 봇이 주요 틈과 벽을 실제로 넘어 본다 (태그 순서를 주고)
function bot(levelIdx, col, row, ch, tags, goalCol, opts) {
  opts = opts || {};
  clearKeys(); g3.startLevel(levelIdx, { test: true }); var p = P();
  p.x = col * TS + 4; p.y = (row + 1) * TS - p.h; p.char = ch; p.vx = 0; p.vy = 0; G().enemies = []; sim(0.05);
  g3.press('right'); if (opts.up) g3.press('up');
  var ti = 0, lastTagT = -1, t = 0, jumped = false;
  for (var f = 0; f < 60 * (opts.maxT || 6); f++) {
    t += 1 / 60; p = P();
    if (G().runTime < t - 0.5) return false;                                  // 떨어져 처음으로 돌아감
    if (p.onGround && !p.skill) {
      var ac = Math.floor((p.x + p.w + 4) / TS), br = Math.floor((p.y + p.h + 2) / TS);
      var onIce = G().ice && G().ice.segs.some(function (s) { return Math.abs(s.y - (p.y + p.h)) < 1; });
      var iceAhead = onIce && G().ice.segs.some(function (s) { return s.x > p.x + 20 && Math.abs(s.y - (p.y + p.h)) < 12; });
      var edge = G().lv.g[br] && G().lv.g[br][ac] !== '#' && G().lv.g[br][ac] !== '=' && !iceAhead;
      if (edge || (opts.jumpWall && p.hitWall)) { g3.press('jump'); jumped = true; }
      if (opts.tagOnWall && p.hitWall && ti < tags.length && t - lastTagT > 0.3) { g3.tag(tags[ti++]); lastTagT = t; }
    } else if (!p.skill && ti < tags.length && t - lastTagT > 0.2 && (p.vy > -60 || opts.tagEarly) && !p.onGround) { g3.tag(tags[ti++]); lastTagT = t; }
    if (!p.onGround && p.vy > 0) g3.release('jump');
    g3.update(1 / 60);
    if (P().x >= goalCol * TS && P().onGround) { clearKeys(); return true; }
  }
  clearKeys(); return false;
}
run(function () {
  ok(bot(0, 24, 13, 0, [1], 34), '1-1 첫 7칸 틈: 빨강에서 파랑 얼음 길로 건넌다');
  ok(bot(0, 44, 13, 1, [0], 54), '1-1 둘째 7칸 틈: 파랑에서 빨강 돌진으로 건넌다');
  ok(bot(0, 44, 13, 0, [1], 54), '1-1 둘째 7칸 틈: 빨강이면 파랑 얼음 길로도 건넌다 (길 둘)');
  ok(bot(0, 61, 13, 0, [1], 66, { up: true, tagOnWall: true, jumpWall: true }), '1-1 4칸 벽: 위로 얼음 기둥 + 점프');
  ok(bot(0, 93, 13, 1, [0], 102), '1-1 마지막 6칸 틈: 돌진으로 건넌다');
  ok(bot(1, 9, 13, 0, [2], 13, { tagOnWall: true }), '1-2 5칸 벽: 바람으로 오른다');
  ok(bot(1, 58, 13, 1, [0], 68), '1-2 7칸 틈: 돌진으로 건넌다');
  ok(bot(2, 8, 13, 0, [1, 2], 23, { tagEarly: false }) || bot(2, 8, 13, 2, [0, 1], 23), '1-3 12칸 틈: 태그 두 번 (돌진 → 얼음 길 등)');
  ok(bot(3, 98, 13, 0, [1, 2], 102, { up: true, tagOnWall: true, jumpWall: true, tagEarly: true }) || bot(3, 98, 13, 1, [2], 102, { tagOnWall: true }), '1-4 7칸 벽: 오른다');
  ok(bot(4, 5, 13, 1, [0], 15), '1-5 7칸 틈: 돌진으로 건넌다');
  ok(bot(0, 61, 13, 0, [1], 66, { up: true, jumpWall: true }), '1-1 4칸 벽: 점프 + 비스듬한 얼음 길로도 오른다 (길 둘)');
  ok(bot(1, 98, 13, 0, [1], 107), '1-2 마지막 6칸 틈: 얼음 길로 건넌다');
  ok(bot(2, 26, 13, 0, [2], 31, { jumpWall: true }), '1-3 7칸 벽: 점프 + 바람');
  ok(bot(2, 77, 13, 0, [1, 2], 82, { up: true, tagOnWall: true, jumpWall: true }), '1-3 9칸 벽: 얼음 기둥 + 점프 + 바람 (태그 두 번)');
  ok(bot(3, 38, 13, 1, [0], 49), '1-4 8칸 틈: 돌진으로 건넌다');
  ok(bot(3, 68, 8, 0, [1, 2], 81) || bot(3, 68, 8, 1, [0, 1], 81), '1-4 10칸 틈: 태그 두 번');
  ok(bot(3, 117, 13, 1, [0], 127), '1-4 마지막 7칸 틈: 돌진으로 건넌다');
  ok(bot(4, 17, 13, 0, [2], 21, { jumpWall: true }) || bot(4, 17, 13, 0, [1], 21, { up: true, tagOnWall: true, jumpWall: true }), '1-5 5칸 벽: 오른다');
});

// ---------- 보스 ----------
group = '[보스]';
run(function () {
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0];
  ok(!!b && b.state === 'sleep', '1-5 보스는 다가가기 전에는 잔다');
  P().x = 52 * TS; P().y = 13 * TS - P().h + TS; sim(0.1); ok(b.state === 'roar', '다가가면 깨어난다');
  sim(1.0 + 1.3); ok(b.state === 'tele', '패턴 전에 예고(텔레그래프)가 있다', b.state);
  sim(0.9); ok(b.state === 'wave' && G().waves.length === 2, '충격파 패턴', b.state);
  var hp0 = G().hp; P().inv = 0; P().x = G().waves[0].x - 4; sim(0.05); ok(G().hp < hp0, '충격파에 닿으면 다친다');
  var t = 0; while (b.state !== 'recover' && t < 200) { g3.update(1 / 60); t++; } ok(b.state === 'recover', '패턴 뒤 빈틈');
  var h1 = b.hp; P().char = 1; P().skill = null; P().inv = 0; P().x = b.x - 40; P().y = b.y + b.h - P().h; P().face = 1; g3.tag(0); sim(0.2);
  ok(h1 - b.hp === CFG.skillDmg * 2, '빈틈에는 대미지 2배', h1 - b.hp); ok(!!G().perfect, '보스를 기술로 맞히면 PERFECT 기회');
  b.hp = Math.floor(b.max / 2); P().x = 50 * TS; P().skill = null; sim(0.05); ok(b.state === 'kneel', '체력 절반에서 무방비 구간', b.state);
  b.hp = 0; sim(0.1); var ch = G().items.filter(function (i) { return i.type === 'C'; })[0];
  ok(b.state === 'dead' && !!ch && G().wallOpen && G().lv.g[10][78] === ' ', '쓰러뜨리면 빛나는 상자가 떨어지고 보스 뒤 벽이 열린다 (2026-11-24)');
  sim(1.0); var hpb = G().hp; P().inv = 9; P().x = ch.x; P().y = ch.y + ch.h - P().h; sim(0.05); ok(!ch.opening, '상자는 닿기만 해서는 열리지 않는다');
  g3.press('up'); g3.update(1 / 60); g3.release('up');
  ok(ch.opening > 0 && G().hpMax === 4 && G().hp === 4 && !!G().relicPop, '↑ 로 상자를 열면 생명의 잔: 최대 체력 4, 늘어난 칸까지 체력이 가득, 획득 판', 'max ' + G().hpMax + ' hp ' + G().hp + ' open ' + ch.opening + ' pop ' + !!G().relicPop);
  P().x = 84 * TS; sim(0.3); ok(P().x > 80 * TS, '열린 벽 너머로 갈 수 있다', Math.round(P().x / TS));
  openDoor(); ok(G().mode === 'gameclear' && g3.menus.gameclear.isOpen(), '월드 클리어 문에서 ↑ → 생명의 잔 넷을 끼우고 문이 열린 뒤 게임 클리어 화면', G().mode);
});
run(function () {
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0];
  P().x = 52 * TS; sim(0.1); sim(1.0 + 1.3 + 0.9); var t = 0; while (b.state !== 'idle' && t < 400) { g3.update(1 / 60); t++; } P().x = 50 * TS; P().inv = 5; t = 0; while (b.state !== 'tele' && t < 200) { g3.update(1 / 60); t++; } sim(0.85);
  ok(b.state === 'charge', '두 번째 패턴은 돌진', b.state);
  t = 0; while (b.state === 'charge' && t < 300) { g3.update(1 / 60); t++; } ok(b.state === 'recover' && b.x >= b.arenaL - 1, '돌진은 경기장 벽에서 멈추고 빈틈');
});
run(function () {   // 2026-11-24 보스 움직임: 걷기와 내려찍기
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0];
  P().x = 52 * TS; sim(0.1); sim(1.0); P().inv = 99; var x0 = b.x; P().x = b.arenaL + 2 * TS; sim(0.6);
  ok(b.state === 'idle' && b.x < x0, '서 있는 동안 플레이어 쪽으로 걸어온다', Math.round(x0) + ' → ' + Math.round(b.x));
  var t = 0; while (!(b.state === 'tele' && b.pattern === 'slam') && t < 2000) { g3.update(1 / 60); t++; }
  ok(b.state === 'tele' && b.pattern === 'slam', '세 번째 패턴은 내려찍기 (충격파 → 돌진 → 내려찍기)', b.state + ' ' + b.pattern);
  P().x = b.arenaL + 6 * TS; sim(0.79); var tx = b.tx; sim(0.2);
  ok(b.state === 'slam' && b.y < b.y0 - 40, '뛰어오른다', Math.round(b.y0 - b.y));
  t = 0; while (b.state === 'slam' && t < 200) { g3.update(1 / 60); t++; }
  ok(b.state === 'recover' && Math.abs(b.x - tx) < 2 && b.y === b.y0, '예고한 자리(그림자)에 떨어진다');
  P().inv = 0; P().skill = null; var hp0 = G().hp; b.state = 'slam'; b.st = 0.75 - 0.01; b.jx0 = b.x; b.tx = b.x; P().x = b.x + b.w / 2 + 70; P().y = b.y0 + b.h - P().h; sim(0.1);
  ok(G().hp < hp0, '떨어질 때 가까이 땅에 서 있으면 다친다');
});
run(function () {   // 2026-11-24 보스 반격 (게임 2 의 반격)
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0];
  P().x = 52 * TS; sim(0.1); P().inv = 99; var t = 0; while (b.state !== 'tele' && t < 400) { g3.update(1 / 60); t++; }
  P().x = b.x - 120; P().skill = null; sim(0.2); var hp0 = b.hp, st0 = G().stack;
  ok(!b.countered && g3.tag(1) && b.state === 'tele', '예고 초반의 태그는 반격이 아니다 (그냥 태그)', b.state);
  t = 0; while (b.state === 'tele' && b.st < 0.6 && t < 60) { g3.update(1 / 60); t++; } P().skill = null; P().char = 0; G().stack = 3; hp0 = b.hp; ok(b.state === 'tele' && b.st >= 0.8 - CFG.counterWin, '예고 마지막 0.3초', b.st.toFixed(2));
  g3.tag(2); ok(b.state === 'stagger' && hp0 - b.hp === CFG.counterDmg, '그때 태그하면 반격: 대미지 6, 보스 공격이 취소되고 비틀거림', b.state + ' ' + (hp0 - b.hp));
  ok(G().waves.length === 0 && !!G().counterFx, '충격파가 나가지 않고, 노란 마름모가 꽉 차는 성공 표시');
  sim(2.3); ok(b.state === 'idle' || b.state === 'tele', '비틀거림 뒤 다시 움직인다', b.state + ' st ' + b.st.toFixed(2) + ' hp ' + b.hp + ' mode ' + G().mode + ' hs ' + G().hitstop + ' dying ' + G().dying + ' php ' + G().hp);
});

// ---------- 태그 신호 (2026-11-24 사용자 "좋은 판정을 얻을 수 있을 때 시각적인 피드백") ----------
group = '[태그신호]';
run(function () {
  start(flat(function (m) { m.ent('g', 9, 13); }), 1); P().face = 1;   // 오필리아 활주는 대미지가 없어 (2026-11-24) 플레아 돌진으로 맞힘
  g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 60) { g3.update(1 / 60); t++; }
  ok(!!G().perfect && G().perfect.len === CFG.perfectWin && G().perfect.until > G().time, '기술이 맞으면 태그 기회(마름모)가 0.25초 열린다');
  g3.tag(2); ok(!!G().cutin && G().cutin.ci === 2, 'PERFECT 면 들어오는 캐릭터 얼굴 컷인');
  sim(0.6); ok(!G().cutin, '컷인은 0.5초 뒤 사라진다');
});

// ---------- 이동 연계와 돌려받기 제한 (2026-11-24 사용자 3번) ----------
group = '[연계]';
run(function () {
  start(flat(), 0); P().face = 1; g3.tag(0);                          // 빨강 자기 기술: 돌진 (0.3초)
  sim(CFG.dashT - 0.08); var st = G().stack;
  ok(!!G().perfect && G().perfect.kind === 'move', '이동 기술이 끝나 갈 때 이동 연계 기회(마름모)가 열린다');
  g3.tag(1); ok(G().lastTag.chain === true && G().lastTag.perfect === false, '그 안에 태그하면 연계 (PERFECT 는 아님)');
  ok(G().stack === st, '연계면 쓴 스택 1 을 돌려받는다', st + ' → ' + G().stack);
  ok(P().skill.chained && Math.abs(Math.abs(P().skill.vx) - CFG.slideDist / CFG.slideT * CFG.chainBoost) < 1, '연계로 나온 활주는 1.25배 빠르게 (더 멀리)', P().skill.vx);
  sim(CFG.slideT - 0.08); g3.tag(0); sim(CFG.dashT - 0.08); st = G().stack; g3.tag(1);
  ok(G().lastTag.chain === true && G().stack === st - 1, '3초 안에 같은 캐릭터(파랑)로 다시 연계하면 돌려받지 못한다', st + ' → ' + G().stack);
  sim(CFG.refundLock); G().stack = 2; P().skill = null; P().char = 0; g3.tag(0); sim(CFG.dashT - 0.08); st = G().stack; g3.tag(1);
  ok(G().stack === st, '3초가 지나면 다시 돌려받는다', st + ' → ' + G().stack);
  sim(1); P().skill = null; ok(g3.tag(2) && G().lastTag.chain === false, '이동 기술이 끝나고 한참 뒤의 태그는 그냥 태그');
});

// ---------- 일반 몬스터 움직임 (2026-11-24 사용자 "조금씩 이동하고, 플레이어의 위치에 기반", "시선이 플레이어에게") ----------
group = '[몬스터]';
run(function () {   // 2026-11-24 사용자 "박쥐가 캐릭터 앞까지만 가고 부딪히지 않고, 캐릭터가 점프하면 본인도 올라가는 버그"
  start(flat(function (m) { m.ent('f', 14, 9); }), 0); var f = G().enemies[0]; P().x = 12 * TS; P().y = 13 * TS - P().h; P().inv = 0;
  var hp0 = G().hp, dived = false, t = 0; while (G().hp === hp0 && t < 360) { g3.update(1 / 60); if (f.mode === 'dive') dived = true; t++; P().inv = Math.min(P().inv, 0); }
  ok(dived && G().hp < hp0, '박쥐가 내리꽂아 캐릭터에 부딪힌다', 'dive ' + dived + ' hp ' + G().hp);
  start(flat(function (m) { m.ent('f', 14, 9); }), 0); f = G().enemies[0]; P().x = 12 * TS; P().inv = 99; f.mt = -99;   // 내리꽂기 전 맴돌기만
  sim(1); var y1 = f.y; P().y = 7 * TS; P().vy = -400; sim(0.3);
  ok(Math.abs(f.y - y1) < 14, '캐릭터가 점프해도 박쥐 높이는 따라 오르지 않는다', Math.round(y1) + ' → ' + Math.round(f.y));
});
run(function () {
  start(flat(function (m) { m.ent('g', 14, 13); m.ent('f', 30, 9); }), 0); P().inv = 99;
  var s = G().enemies[0], f = G().enemies[1];
  P().x = 10 * TS; s.t = 0; var x0 = s.x; sim(0.5);
  ok(s.face === -1 && s.x < x0, '플레이어가 왼쪽 가까이 있으면 슬라임은 왼쪽을 보고 다가온다', Math.round(x0) + ' → ' + Math.round(s.x));
  P().x = 17 * TS; sim(0.6); ok(s.face === 1, '플레이어가 오른쪽으로 가면 오른쪽을 본다');
  P().x = 55 * TS; P().y = 13 * TS - P().h; var sx = s.sx; sim(4);
  ok(Math.abs(s.x - sx) <= 1.5 * TS + 4, '멀면 제자리 근처(1.5칸)만 천천히 오간다', Math.round(s.x - sx));
  P().x = 27 * TS; P().y = 13 * TS - P().h; var fx0 = f.x; sim(1.0);
  ok(f.x < fx0 && f.face === -1, '박쥐는 가까운 플레이어 쪽으로 날아오며 그쪽을 본다', Math.round(fx0) + ' → ' + Math.round(f.x));
  P().x = 14 * TS; sim(5); ok(Math.abs(f.x - f.bx) > 4 * TS, '박쥐는 제자리에서 멀리 따라온다 (2026-11-24 4 → 12칸, 내리꽂을 때는 그 너머까지)', Math.round(f.x - f.bx));
  start(flat(function (m) { m.ent('g', 40, 13); }), 0); var s2 = G().enemies[0], sx2 = s2.x; P().inv = 99; P().x = 24 * TS; P().y = 13 * TS - P().h; sim(1.5);
  ok(s2.aware && s2.face === -1 && s2.x < sx2 - 30, '16칸 떨어진 플레이어도 알아채고 다가온다 (예전 6칸, 3배로)', Math.round(sx2 - s2.x));
});

// ---------- 표지판 안내 (2026-11-24 사용자 "표지판을 만들어서 설명을 볼 수 있게") ----------
group = '[표지판]';
run(function () {
  start(0); var hs = G().lv.hints, all = hs.length;
  ok(all === 5, '1-1 에 표지판 5개', all);
  P().x = hs[1].c * TS + 100; P().y = 13 * TS - P().h; sim(0.1); ok(g3.activeHint && !g3.activeHint(), '표지판에서 2칸 넘게 떨어지면 말풍선이 닫혀 있다');
  P().x = hs[1].c * TS; sim(0.1); var h = g3.activeHint(); ok(h === hs[1] && h.read, '가까이 가면 그 표지판의 말풍선이 열리고 읽은 것으로 남는다');
  ok(G().lv.hints.concat(g3.LEVELS.slice(1).reduce(function (a, d) { return a.concat(g3.parseLevel(d).hints); }, [])).every(function (x) { return x.text.split(/\n|\|\|/).length <= 4; }), '모든 표지판 글은 네 줄까지 (2026-11-24 사용자 문장)');
});

// ---------- 판정: 기본 공격 사거리와 보스 판정 둘 (2026-11-24 사용자 "리치 소폭 증가, 히트박스 명확하게") ----------
group = '[판정]';
run(function () {   // 2026-11-24 사용자 "클로에가 스킬을 쓸 때 아래에서부터 위까지 전부 판정"
  start(flat(function (m) { m.ent('g', 20, 13); }), 0); var en = G().enemies[0]; en.x = 40 * TS; P().face = 1;
  var y0 = P().y; g3.tag(2); sim(0.15); ok(P().y < y0 - 60, '클로에 상승: 높이 솟구친다', Math.round(y0 - P().y));
  en.x = P().x; en.y = y0 + P().h - en.h; en.t = 0.6; sim(1 / 60);
  ok(en.hp < 3, '솟구친 뒤에도 출발한 발밑(아래)의 적까지 맞는다', en.hp);
});
run(function () {
  ok(CFG.atkReach === 40, '기본 공격은 앞으로 40 픽셀', CFG.atkReach);
  start(flat(function (m) { m.ent('g', 20, 13); }), 0); var en = G().enemies[0]; en.vx = 0;
  P().face = 1; P().x = en.x - P().w - 34; P().y = en.y + en.h - P().h; g3.press('atk'); g3.update(1 / 60); g3.release('atk'); sim(0.1);
  ok(en.hp < 3, '34 픽셀 떨어진 적도 기본 공격이 맞힌다 (예전 30 이면 빗나감)', en.hp);
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0]; b.state = 'idle'; b.st = -9; var c = b.x + b.w / 2;
  P().inv = 0; P().skill = null; P().face = 1; P().x = c - 90 - P().w; P().y = b.y + b.h - P().h; var hp0 = G().hp, bh = b.hp;
  g3.press('atk'); g3.update(1 / 60); g3.release('atk'); sim(0.1);
  ok(b.hp < bh, '골렘 그림의 팔(가운데에서 85 픽셀 안)을 치면 맞는다', bh + ' → ' + b.hp);
  ok(G().hp === hp0, '팔 언저리에 서 있어도 몸통(가운데 80 폭)에 닿지 않으면 다치지 않는다', hp0 + ' → ' + G().hp);
});

// ---------- 작업 7: 메뉴·별·잠금 ----------
group = '[메뉴]';
run(function () {
  g3.resetSave();
  ok(g3.unlocked(0) && !g3.unlocked(1), '처음에는 1-1 만 열려 있다');
  g3.showSelect(0); ok(document.getElementById('st-1').innerHTML.indexOf('🔒') >= 0, '잠긴 스테이지는 목록에 자물쇠');
  start(0); G().test = false; G().hitThisRun = true; openDoor();
  ok(g3.starsOf('1-1').join() === '1,0,0', '1-1 을 깨면 별이 남는다', g3.starsOf('1-1').join());
  ok(g3.unlocked(1), '1-1 을 깨면 1-2 가 열린다');
  start(0); G().test = false; G().treasure = true; G().hitThisRun = true; openDoor();
  ok(g3.starsOf('1-1').join() === '1,0,1', '다시 해서 얻은 별이 앞 별에 더해진다 (판마다 따로 쌓임)', g3.starsOf('1-1').join());
  g3.reloadSave(); ok(g3.starsOf('1-1').join() === '1,0,1', '창을 닫았다 열어도 별이 남는다 (브라우저 저장)');
  var before = JSON.stringify(g3.SAVE); start(1, { test: true }); openDoor();
  ok(JSON.stringify(g3.SAVE) === before, '?stage 확인용 판은 별을 남기지 않는다');
  g3.resetSave();
});
run(function () {
  start(0); g3.pauseGame(); ok(G().mode === 'pause' && g3.menus.pause.isOpen(), 'Esc 일시정지');
  var t0 = G().runTime; sim(0.5); ok(G().runTime === t0, '멈춘 동안 시간이 가지 않는다'); g3.resumeGame(); sim(0.2); ok(G().runTime > t0, '계속하기');
});


// ---------- 폼 바꾸기 (2026-11-24 결정: K 로 이동폼 ↔ 공격폼, 같은 날 키 배치 (가)로 Shift) ----------
group = '[폼]';
function form(k) { g3.press('form'); g3.update(1 / 60); g3.release('form'); }
run(function () {
  start(flat(function (m) { m.ent('g', 8, 13); }), 1); P().face = 1;
  ok(G().form === 'move', '스테이지는 이동폼으로 시작');
  form(); ok(G().form === 'atk', 'Shift 로 공격폼');
  var x0 = P().x; g3.tag(0); ok(P().skill && P().skill.type === 'claw', '공격폼에서 빨강 태그는 화염 할퀴기');
  var e = G().enemies[0]; e.x = P().x + P().w + 20; e.stun = 0; sim(0.1);
  ok(Math.abs(P().x - x0) < 2, '공격 기술은 그 자리에서 (움직이지 않는다)', (P().x - x0).toFixed(1));
  ok(e.hp < 3 && !!G().perfect, '앞의 적을 맞히고 PERFECT 기회가 생긴다', e.hp);
  g3.tag(1); ok(G().lastTag.perfect && P().skill.type === 'spikes', '공격폼 그대로 PERFECT 태그 → 파랑 얼음 가시');
  ok(G().form === 'atk', '태그해도 폼은 그대로');
  ok(G().echoes.length === 1 && G().echoes[0].type === 'claw', '에코는 나가는 캐릭터의 공격 기술 (화염 할퀴기)');
});
run(function () {
  start(flat(function (m) { m.ent('g', 8, 13); }), 0); P().face = 1; form();
  var e = G().enemies[0]; e.x = P().x + P().w + 30; g3.tag(1); sim(0.15);
  ok(e.stun > 0.6, '얼음 가시는 적을 오래 얼린다', e.stun.toFixed(2));
  start(flat(function (m) { m.ent('g', 8, 13); }), 0); P().face = 1; form();
  e = G().enemies[0]; e.x = P().x + P().w + 4; g3.tag(2); sim(0.08);
  ok(e.vy < 0, '회오리 어퍼컷은 적을 띄운다', e.vy.toFixed(0));
  start(flat(), 1); P().face = 1; form(); form(); var x0 = P().x; g3.tag(0); sim(CFG.dashT);
  ok(G().form === 'move' && P().x - x0 > 150, '다시 Shift 를 누르면 이동폼 (돌진이 앞으로 간다)');
  start(flat(), 0); form(); var s0 = G().stack; g3.tag(1); ok(G().stack === s0 - 1, '공격폼도 스택을 쓴다');
});

// ---------- 키 배치 (가): 오른손 이동, 왼손 행동 (2026-11-24) ----------
group = '[키배치]';
run(function () {
  var K = g3.KEYMAP;
  ok(K.KeyA === 'tag0' && K.KeyS === 'tag1' && K.KeyD === 'tag2', 'A S D 가 빨강·파랑·바람 태그');
  ok(K.KeyF === 'atk' && K.ShiftLeft === 'form' && K.ShiftRight === 'form' && K.KeyE === 'ult' && K.Space === 'jump', 'F 공격, Shift 폼, E 필살기, Space 점프');
  ok(K.ArrowLeft === 'left' && K.ArrowRight === 'right' && K.ArrowUp === 'up', '방향키로 이동');
  var old = ['KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyW', 'Digit1', 'Digit2', 'Digit3'].filter(function (c) { return K[c]; });
  var moves = Object.keys(K).filter(function (c) { return K[c] === 'left' || K[c] === 'right' || K[c] === 'up'; });
  ok(old.length === 0 && moves.length === 3, '옛 키(J K L U W 1 2 3)와 A D 이동이 없다');
  ok(g3.CHARS.map(function (c) { return c.key; }).join('') === 'ASD', 'HUD 캐릭터 칸의 키 글자가 A S D');
  start(flat(), 0); g3.press('tag1'); g3.update(1 / 60); g3.release('tag1'); ok(P().char === 1, 'S 를 누르면 파랑으로 태그');
});

// ---------- 자기 기술·PERFECT +1 (2026-11-24) ----------
group = '[자기기술]';
run(function () {   // 2026-11-24 사용자 "오필리아의 이동 스킬은 대미지를 가지면 안돼"
  start(flat(function (m) { m.ent('g', 8, 13); }), 1); var en = G().enemies[0]; en.x = P().x + 40; en.t = 0.9; P().face = 1; P().inv = 99;
  g3.tag(1); sim(0.4); ok(en.hp === 3 && !(G().perfect && G().perfect.kind !== 'move'), '오필리아 활주는 적을 지나가도 대미지를 주지 않는다 (PERFECT 기회도 없음)', en.hp);
});
run(function () {   // 2026-11-24 사용자: 태그하지 않고 쓰는 자기 기술은 쿨타임
  start(flat(), 1); P().face = 1; var st = G().stack;
  ok(g3.tag(1) && G().stack === st - 1, '자기 기술 (오필리아 활주)');
  sim(0.6); ok(g3.tag(1) === false && G().stack === st - 1, '2초 안에 다시 자기 기술은 안 된다 (스택도 쓰지 않음)');
  ok(g3.tag(0) && P().char === 0, '그동안에도 다른 캐릭터로 태그는 된다');
  sim(CFG.selfCD); P().skill = null; P().char = 1; ok(g3.tag(1) === true, '2초가 지나면 다시 자기 기술');
});
run(function () {
  // 자기 기술에는 PERFECT 가 없다
  start(flat(function (m) { m.ent('g', 9, 13); m.ent('g', 16, 13); }), 0); P().face = 1;
  g3.tag(0); var t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; } sim(0.25);
  var st = G().stack; G().selfCD = [0, 0, 0]; g3.tag(0);
  ok(G().lastTag.self && G().lastTag.perfect === false && G().echoes.length === 0 && G().stack === st - 1, '맞힌 직후 자기 기술을 써도 PERFECT·에코 없이 스택만 쓴다');
  // PERFECT +1 표시
  start(flat(function (m) { m.ent('g', 9, 13); }), 1); P().face = 1; g3.tag(0); t = 0; while (!(G().perfect && G().perfect.kind !== 'move') && t < 40) { g3.update(1 / 60); t++; } g3.tag(1);
  ok(G().lastTag.perfect && !(G().stackFlash > 0) && !!G().cueHit, 'PERFECT 는 스택 +1 없이 마름모가 꽉 차는 성공 표시'); sim(0.5); ok(!G().cueHit, '성공 표시는 0.35초 뒤 사라진다');
});
document.getElementById('out').textContent = lines.join('\n') + '\n합계 ' + pass + ' 통과, ' + fail + ' 실패';
})();
