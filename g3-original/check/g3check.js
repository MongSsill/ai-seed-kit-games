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
run(function () {
  start(flat(function (m) { for (var c = 20; c < 30; c++) for (var r = 14; r < 17; r++) m.g[r][c] = ' '; }));
  P().x = 24 * TS; P().y = 10 * TS; var tt = 0; while (P().y < 17 * TS + 70 && G().runTime > 0.01 && tt < 200) { g3.update(1 / 60); tt++; } sim(0.1);
  ok(G().runTime < 1.0 && G().hp === 3 && Math.abs(P().x - 5 * TS - 4) < 6, '틈에 떨어지면 스테이지 처음에서 다시', 'runTime ' + G().runTime.toFixed(2) + ' x ' + P().x.toFixed(0));
});
run(function () {
  start(flat(function (m) { m.goal(20, 13); }));
  P().x = 20 * TS + 4; sim(0.1);
  ok(G().mode === 'clear', '문에 들어가면 클리어', G().mode);
  ok(g3.menus.clear.isOpen() && g3.menus.clear.selected() === 0, '클리어 화면은 "다음 스테이지"가 먼저 골라져 있다');
  ok(G().lastGot.join() === '1,1,0', '안 맞고 보물 없이 깨면 별 [1,1,0]', G().lastGot.join());
});
run(function () {
  start(flat(function (m) { m.ent('g', 10, 13); }));
  P().x = 9 * TS; sim(0.2);
  ok(G().hp === 2 && G().hitThisRun, '적에 닿으면 체력 1칸 줄고 "맞음"이 남는다', 'hp ' + G().hp);
  var hp = G().hp; sim(0.3); ok(G().hp === hp, '맞은 뒤 무적 시간 동안은 더 줄지 않는다');
  G().hp = 1; P().inv = 0; P().skill = null; var e = G().enemies[0]; if (e) { e.x = P().x; e.y = P().y + P().h - e.h; e.stun = 0; } sim(0.05);
  ok(G().dying > 0, '체력이 다 닳으면 쓰러진다'); sim(1.0); ok(G().hp === 3 && G().runTime < 0.5, '쓰러지면 스테이지 처음에서 다시 (체력 3)', 'hp ' + G().hp);
});
run(function () {
  start(flat(function (m) { m.ent('T', 12, 13); }));
  P().x = 12 * TS + 4; sim(0.1); ok(G().treasure, '보물을 얻는다');
  start(flat(function (m) { m.ent('T', 12, 13); m.goal(20, 13); })); P().x = 12 * TS + 4; sim(0.1); P().x = 20 * TS + 4; sim(0.1);
  ok(G().lastGot && G().lastGot.join() === '1,1,1', '보물을 얻고 안 맞고 깨면 별 셋', G().lastGot && G().lastGot.join());
});

// ---------- 작업 2: 태그와 세 기술 ----------
group = '[태그]';
run(function () {
  start(flat(), 0);
  ok(G().stack === 2, '스택은 2 로 시작');
  ok(g3.tag(0) === true && G().stack === 1 && P().char === 0 && P().skill && P().skill.type === 'dash' && G().lastTag.self, '지금 캐릭터의 키는 자기 기술 (스택 1 을 쓴다)'); sim(0.5); G().stack = 2; G().regen = 0;
  ok(g3.tag(1) === true && G().stack === 1 && P().char === 1, '태그하면 그 캐릭터로 바뀌고 스택 1 을 쓴다');
  ok(P().skill && P().skill.type === 'slide', '태그하면 기술이 저절로 나간다 (NORMAL 에서도, T01)');
  ok(G().lastTag.perfect === false, '적이 없으면 NORMAL (T01)');
  sim(0.4); g3.tag(0); ok(G().stack === 0, '두 번 태그하면 스택 0');
  sim(0.4); ok(g3.tag(1) === false, '스택 0 이면 태그가 안 된다');
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
  g3.tag(0); var t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; }
  ok(!!G().perfect, '기술이 적에 맞으면 PERFECT 기회가 생긴다');
  var g0 = G().gauge; ok(g0 === CFG.gaugeNormal, '기술이 적을 맞히면 게이지 +10', g0);
  var stack = G().stack; sim(0.1); g3.tag(1);
  ok(G().lastTag.perfect === true, '맞은 직후 0.25초 안의 태그는 PERFECT (T02)');
  ok(G().stack === stack, 'PERFECT 면 쓴 스택 1 을 돌려받는다 (T02)', stack + '→' + G().stack);
  ok(G().echoes.length === 1, 'PERFECT 면 에코가 남는다 (T02)');
  ok(G().gauge === g0 + CFG.gaugePerfect, 'PERFECT 면 게이지 +25', G().gauge);
  ok(G().pops.some(function (p) { return p.text === 'PERFECT'; }) && G().flash > 0, "'PERFECT' 글자와 번쩍임 (타이밍 피드백)");
});
run(function () {
  fight(); g3.tag(0); sim(0.1); g3.tag(1); ok(G().lastTag.perfect === false, '허공에 쓴 기술 뒤의 태그는 NORMAL (T03)');
  fight(function (m) { m.ent('g', 9, 13); }); g3.tag(0); var t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; } sim(0.3); g3.tag(1);
  ok(G().lastTag.perfect === false, '0.25초가 지난 태그는 NORMAL (T04)');
  fight(function (m) { m.ent('g', 9, 13); m.ent('g', 10, 13); }); g3.tag(0); sim(0.2);
  var hits = P().skill ? P().skill.hit.length : -1; var pg = G().perfect && G().perfect.skill;
  ok(hits === 2 && pg && pg.perfectGiven, '두 적을 맞혀도 기술 한 번에 PERFECT 기회는 한 번 (T12)', hits);
});
run(function () {
  // T05: PERFECT 로 나온 기술이 맞으면 다시 기회
  fight(function (m) { m.ent('g', 9, 13); m.ent('g', 17, 13); m.ent('g', 18, 13); });
  g3.tag(0); var t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; } g3.tag(1);
  var firstWin = G().perfect; t = 0; while (G().perfect === firstWin && t < 40) { g3.update(1 / 60); t++; }
  ok(G().perfect && G().perfect !== firstWin && !G().perfect.used, '태그로 나온 기술이 맞으면 다시 PERFECT 기회 (T05)');
  g3.tag(0); ok(G().lastTag.perfect, '이어서 PERFECT (T05)');
});
run(function () {
  fight(function (m) { m.ent('g', 7, 13); }); P().char = 0; g3.press('atk'); sim(0.2); clearKeys();
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
  g3.tag(0); var t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; } g3.tag(2);
  sim(0.3); var e2 = G().enemies.filter(function (e) { return e.x > 12 * TS; })[0];
  ok(e2 && e2.hp < 3, '에코(나가는 빨강의 돌진)가 남은 공격을 마저 한다', e2 && e2.hp);
});

// ---------- 작업 4: 게이지와 합동 필살기 ----------
group = '[필살기]';
run(function () {
  start(flat(function (m) { m.ent('g', 12, 13); m.ent('g', 40, 13); })); G().gauge = 100; g3.press('ult'); sim(0.05); clearKeys();
  ok(!!G().ult && G().gauge === 0, 'E 로 합동 필살기, 게이지 0 (T11)');
  sim(1.2); var near = G().enemies.filter(function (e) { return e.x < 20 * TS; })[0], far = G().enemies.filter(function (e) { return e.x > 30 * TS; })[0];
  ok(!near || near.hp <= 0 || near.dead, '가까운 적은 필살기에 맞는다'); ok(far && far.hp === 3, '먼 적은 맞지 않는다');
  start(flat()); G().gauge = 60; g3.press('ult'); sim(0.05); clearKeys(); ok(!G().ult, '게이지가 차지 않으면 쓸 수 없다');
});

// ---------- 작업 5·6: 스테이지 ----------
group = '[스테이지]';
run(function () {
  ok(g3.LEVELS.length === 5, '스테이지 다섯 (1-1 ~ 1-5)');
  g3.LEVELS.forEach(function (def, i) {
    var lv = g3.parseLevel(def);
    ok(!!lv.start, def.id + ' 시작 자리');
    ok(def.boss ? !lv.door : !!lv.door, def.id + (def.boss ? ' 는 문 대신 보스' : ' 골인 문'));
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
  ok(g3.LEVELS[1].build().hints.some(function (h) { return h.text.indexOf('D') === 0; }), '1-2 에서 바람 키를 처음 알린다');
  ok(g3.LEVELS[3].build().hints.some(function (h) { return h.text.indexOf('E') === 0; }), '1-4 에서 필살기 키를 처음 알린다');
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
  b.hp = 0; sim(0.1); ok(b.state === 'dead' && G().items.some(function (i) { return i.type === 'K'; }), '쓰러뜨리면 클리어 물건이 나온다');
  var k = G().items.filter(function (i) { return i.type === 'K'; })[0]; sim(1.0); P().x = k.x; P().y = k.y; P().inv = 1; sim(0.05);
  ok(G().mode === 'gameclear' && g3.menus.gameclear.isOpen(), '물건을 얻으면 게임 클리어 화면', G().mode + ' hp ' + G().hp + ' dying ' + G().dying + ' items ' + G().items.length + ' k ' + Math.round(k.x) + ',' + Math.round(k.y) + ' got ' + k.got + ' p ' + Math.round(P().x) + ',' + Math.round(P().y));
});
run(function () {
  start(4); var b = G().enemies.filter(function (e) { return e.type === 'B'; })[0];
  P().x = 52 * TS; sim(0.1); sim(1.0 + 1.3 + 0.9); var t = 0; while (b.state !== 'idle' && t < 400) { g3.update(1 / 60); t++; } P().x = 50 * TS; P().inv = 5; t = 0; while (b.state !== 'tele' && t < 200) { g3.update(1 / 60); t++; } sim(0.85);
  ok(b.state === 'charge', '두 번째 패턴은 돌진', b.state);
  t = 0; while (b.state === 'charge' && t < 300) { g3.update(1 / 60); t++; } ok(b.state === 'recover' && b.x >= b.arenaL - 1, '돌진은 경기장 벽에서 멈추고 빈틈');
});

// ---------- 작업 7: 메뉴·별·잠금 ----------
group = '[메뉴]';
run(function () {
  g3.resetSave();
  ok(g3.unlocked(0) && !g3.unlocked(1), '처음에는 1-1 만 열려 있다');
  g3.showSelect(0); ok(document.getElementById('st-1').innerHTML.indexOf('🔒') >= 0, '잠긴 스테이지는 목록에 자물쇠');
  start(0); P().x = G().door.x + 4; P().y = G().door.y + 20; G().test = false; G().hitThisRun = true; sim(0.1);
  ok(g3.starsOf('1-1').join() === '1,0,0', '1-1 을 깨면 별이 남는다', g3.starsOf('1-1').join());
  ok(g3.unlocked(1), '1-1 을 깨면 1-2 가 열린다');
  start(0); G().test = false; G().treasure = true; G().hitThisRun = true; P().x = G().door.x + 4; P().y = G().door.y + 20; sim(0.1);
  ok(g3.starsOf('1-1').join() === '1,0,1', '다시 해서 얻은 별이 앞 별에 더해진다 (판마다 따로 쌓임)', g3.starsOf('1-1').join());
  g3.reloadSave(); ok(g3.starsOf('1-1').join() === '1,0,1', '창을 닫았다 열어도 별이 남는다 (브라우저 저장)');
  var before = JSON.stringify(g3.SAVE); start(1, { test: true }); P().x = G().door.x + 4; P().y = G().door.y + 20; sim(0.1);
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
run(function () {
  // 자기 기술에는 PERFECT 가 없다
  start(flat(function (m) { m.ent('g', 9, 13); m.ent('g', 16, 13); }), 0); P().face = 1;
  g3.tag(0); var t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; } sim(0.25);
  var st = G().stack; g3.tag(0);
  ok(G().lastTag.self && G().lastTag.perfect === false && G().echoes.length === 0 && G().stack === st - 1, '맞힌 직후 자기 기술을 써도 PERFECT·에코 없이 스택만 쓴다');
  // PERFECT +1 표시
  start(flat(function (m) { m.ent('g', 9, 13); }), 1); P().face = 1; g3.tag(0); t = 0; while (!G().perfect && t < 40) { g3.update(1 / 60); t++; } g3.tag(1);
  ok(G().lastTag.perfect && G().stackFlash > 0, 'PERFECT 로 스택을 돌려받으면 HUD 에 +1 반짝임');
});
document.getElementById('out').textContent = lines.join('\n') + '\n합계 ' + pass + ' 통과, ' + fail + ' 실패';
})();
