// 게임 3 Chain Echo (가칭) 데모 — 세 캐릭터를 태그로 이어 길을 여는 2D 플랫포머
// 기준 문서: docs/problem.md (끝나는 기준), docs/tasks.md (작업 1~8), docs/references.md (레퍼런스)
// 수치는 모두 초기값이다. 바꾸면 problem.md 의 "바뀐 값"과 결정 기록에 적는다.
'use strict';
(function () {

// ===== 수치 (problem.md 와 기획서의 초기값) =====
var TS = 32, ROWS = 17, W = 960, H = 544;
var CFG = {
  gravity: 1800, maxFall: 900,
  run: 190, jumpV: 560, coyote: 0.1, buffer: 0.12,      // 점프: 높이 약 2.7칸, 멀리 약 3.7칸 (작업 1, Celeste 코요테 타임·입력 버퍼)
  pw: 24, ph: 36,                                        // 캐릭터 크기 (폭 24)
  dashT: 0.3, dashV: 650,                                // 빨강 용 돌진: 약 6칸
  slideT: 0.35, slideDist: 120,                          // 파랑 활주: 0.35초, 캐릭터 폭의 5배
  upDist: 70,                                            // 파랑 상(위): 짧게 올라가고 얼음 기둥
  iceLife: 1.5, iceWarn: 0.3,                            // 얼음 경로: 다 만들어진 뒤 1.5초, 0.3초 전 금
  windV: 880, windT: 0.25,                               // 바람 상승 기류: 약 7칸
  stackMax: 3, stackRegen: 2, stackStart: 3,             // 태그 스택 (2026-11-24 사용자 "3번으로 늘리는 방안", 최대·시작 2 에서 3. 차는 속도 2초는 그대로)
  perfectWin: 0.25,                                      // PERFECT: 기술이 맞은 직후 0.25초
  chainLead: 0.15, chainWin: 0.27, chainBoost: 1.25,     // 이동 연계: 이동 기술이 끝나기 0.15초 전부터 0.27초 안에 태그하면 다음 기술이 1.25배 (2026-11-24 사용자 3번)
  counterWin: 0.3, counterRange: 300, counterDmg: 6,      // 보스 반격: 예고 마지막 0.3초 안에, 보스 가운데에서 300 픽셀 안에서 태그하면 반격 (대미지 6, 공격 취소. 2026-11-24 사용자, 게임 2 반격)
  perfectDmgMul: 1.5,                                    // PERFECT 로 나온 기술의 대미지 배율 (스택은 돌려받지 않음)
  selfCD: 2,                                             // 자기 기술 쿨타임: 태그 없이 지금 캐릭터 키로 기술을 쓰면 그 캐릭터는 2초 동안 다시 혼자 못 씀 (태그는 바로 됨)
  refundLock: 3,                                         // 돌려받기 제한: 어느 캐릭터로 태그해 스택을 돌려받으면, 그 캐릭터로는 3초 동안 다시 돌려받지 못한다 (사용자 "일정 시간동안 해당 태그로 돌려받기 제한")
  gaugeNormal: 10, gaugePerfect: 25,                     // 연계 게이지 (기획서 6.1 예시)
  hp: 3, hurtInv: 1.0,
  atkT: 0.15, atkCD: 0.3, atkReach: 40,                  // 기본 공격: 앞으로 40 픽셀 (2026-11-24 사용자 "리치 소폭 증가", 30 에서)
  hitstop: 0.06,
  skillDmg: 2, atkDmg: 1, echoDmg: 2, ultDmg: 6, ultBossDmg: 8,
  bossHp: 40
};
// 이름: 플레아(빨강·화염), 오필리아(파랑·빙결), 클로에(바람·격투). 게임 2 에서 쓴 이름 (몬길: 스타다이브 캐릭터 콘셉트 차용). 2026-11-24 사용자 "캐릭터 이름들도 빨강 파랑에서 수정해줘". 코드 안 id 는 red·blue·wind 그대로
var CHARS = [
  { id: 'red',  name: '플레아', key: 'A', color: '#e8503a', dark: '#8e2a1c', skill: '용 돌진' },
  { id: 'blue', name: '오필리아', key: 'S', color: '#4aa8ff', dark: '#1d5a9c', skill: '얼음 활주' },
  { id: 'wind', name: '클로에', key: 'D', color: '#46c98a', dark: '#1f7a4f', skill: '상승 기류' }
];

// ===== 맵 만들기 =====
// '#' 땅, '=' 위에서만 밟히는 발판. 칸 좌표는 (열, 줄), 줄 0 이 맨 위, 14 가 보통 땅 윗면.
function Builder(w) {
  var g = [];
  for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < w; c++) row.push(' '); g.push(row); }
  var m = { w: w, g: g, ents: [], hints: [], start: null, door: null };
  m.floor = function (x0, x1, top) { if (top == null) top = 14; for (var x = x0; x <= x1; x++) for (var r = top; r < ROWS; r++) g[r][x] = '#'; return m; };
  m.block = function (x0, x1, y0, y1) { for (var x = x0; x <= x1; x++) for (var r = y0; r <= y1; r++) g[r][x] = '#'; return m; };
  m.one = function (x0, x1, row) { for (var x = x0; x <= x1; x++) g[row][x] = '='; return m; };
  m.at = function (x, row) { m.start = { c: x, r: row }; return m; };
  m.goal = function (x, row) { m.door = { c: x, r: row }; return m; };
  m.ent = function (type, x, row) { m.ents.push({ type: type, c: x, r: row }); return m; };
  m.hint = function (x, text) { m.hints.push({ c: x, text: text }); return m; };
  return m;
}

// 스테이지 1-1 ~ 1-5 (problem.md 22·23줄, tasks.md 작업 5·6)
var LEVELS = [
  { id: '1-1', name: '1-1 발견 · 밝은 숲', chars: [0, 1], theme: 'forest', target: '45~60초',
    build: function () {
      var m = Builder(112);
      m.floor(0, 14).at(2, 13).hint(4, '이동 키 :[←] [→]\n점프 키 :[Space]');
      m.floor(17, 26);                                                      // 2칸 틈: 점프로
      m.hint(23, '[S] 오필리아 태그 스킬 - 얼음 길||방향키 방향으로 얼음 길을 생성하여 미끄러져 보자');
      m.floor(34, 46);                                                      // 7칸 틈: 파랑 얼음 길
      m.hint(37, '기본 공격 : [F]').ent('g', 42, 13);
      m.hint(45, '[A] 플레아 태그 스킬\n- 화염 돌진||전방으로 화염 돌진.\n돌진이 끝날 때 태그한다면 태그 수정을 하나 돌려받을 수 있다');
      m.floor(54, 64);                                                      // 7칸 틈: 빨강 돌진 또는 파랑 얼음 길
      m.hint(60, '[↑] 누른 채 [S]||얼음 기둥도 생성 가능하다');
      m.floor(65, 80, 10);                                                  // 4칸 벽: 얼음 기둥 + 점프, 또는 비스듬한 얼음 길
      m.one(73, 76, 6).ent('T', 75, 5);                                     // 보물: 벽 위에서 4칸 더
      m.floor(81, 95);
      m.floor(102, 111).goal(107, 13);                                      // 6칸 틈: 돌진 또는 얼음 길
      return m;
    } },
  { id: '1-2', name: '1-2 학습 · 태그 전투', chars: [0, 1, 2], theme: 'forest2', target: '60~90초',
    build: function () {
      var m = Builder(122);
      m.floor(0, 11).at(2, 13).hint(5, '[D] 클로에 태그 스킬\n- 어퍼 점프||위로 ~ 높이 ~ 어퍼 점프!');
      m.floor(12, 24, 9);                                                   // 5칸 벽: 바람, 또는 비스듬한 얼음 길 + 점프
      m.floor(25, 60);
      m.hint(28, '폼 체인지:[Shift]||공격 폼으로 적을 처치해보자');
      m.ent('g', 33, 13);                                                   // 혼자 있는 느린 적: 안전하게 때려 보기
      m.hint(41, 'PERFECT||타이밍을 맞춘다면 강한 공격을 사용할 수 있을지도?');
      m.ent('g', 45, 13).ent('f', 52, 10);
      m.floor(68, 85).ent('g', 74, 13).ent('f', 77, 10).ent('g', 81, 13);  // 7칸 틈
      m.one(88, 91, 7).ent('T', 89, 6);                                     // 보물: 7칸 위 (점프 + 바람, 또는 기둥 + 점프 + 바람)
      m.floor(86, 100);
      m.floor(107, 121).goal(116, 13);                                      // 6칸 틈
      return m;
    } },
  { id: '1-3', name: '1-3 응용 · 연속 태그', chars: [0, 1, 2], theme: 'forest3', target: '60~75초',
    build: function () {
      var m = Builder(122);
      m.floor(0, 10).at(2, 13).hint(6, '넓은 구멍에서는?||기술을 이어보자');
      m.floor(23, 29);                                                      // 12칸 틈: 태그 두 번
      m.floor(30, 40, 7);                                                   // 7칸 벽: 점프 + 바람, 또는 기둥 + 점프 + 바람
      m.hint(33, 'PERFECT 연습||[Shift] 공격폼 상태로 기술 적중 후 태그!').ent('g', 37, 6);
      m.floor(41, 54);
      m.ent('f', 57, 11).ent('f', 60, 9);                                   // 공중 적 위로 돌진해 뚫기 (T10)
      m.floor(63, 80);
      m.floor(81, 90, 5);                                                   // 9칸 벽: 기둥 + 점프 + 바람 (태그 두 번)
      m.one(94, 96, 11).ent('T', 95, 10);                                   // 보물: 높은 벽에서 틈으로 내려가며
      m.floor(101, 121).ent('g', 108, 13).goal(116, 13);
      return m;
    } },
  { id: '1-4', name: '1-4 숙달 · 복합 상황', chars: [0, 1, 2], theme: 'forest4', target: '75~105초',
    build: function () {
      var m = Builder(142);
      m.floor(0, 40).at(2, 13).hint(5, '체인 에코:[E]||연계 게이지를 가득 채워 모두 함께!');
      m.ent('g', 18, 13).ent('g', 24, 13).ent('f', 27, 10).ent('g', 31, 13);
      m.ent('f', 44, 11).ent('f', 46, 9);                                   // 8칸 틈 위의 공중 적
      m.floor(49, 59).floor(60, 70, 9).ent('g', 66, 8);                     // 5칸 벽 위의 적
      m.floor(81, 100);                                                     // 10칸 틈: 태그 두 번
      m.hint(83, '퍼퍼펑!||체인 에코!').ent('g', 86, 13).ent('g', 90, 13).ent('f', 92, 9).ent('g', 95, 13);
      m.floor(101, 110, 7).one(104, 106, 3).ent('T', 105, 2);               // 7칸 벽, 그 위 4칸에 보물
      m.floor(111, 119).floor(127, 141).goal(135, 13).ent('g', 131, 13);   // 7칸 틈
      return m;
    } },
  { id: '1-5', name: '1-5 최종 검증 · 보스', chars: [0, 1, 2], theme: 'temple', target: '90~150초', boss: true,
    build: function () {
      var m = Builder(96);
      m.floor(0, 7).at(2, 13);
      m.floor(15, 19).ent('f', 17, 10);                                    // 7칸 틈과 공중 적
      m.floor(20, 26, 9).one(23, 24, 5).ent('T', 23, 4);                   // 5칸 벽, 그 위에 보물
      m.floor(27, 95);
      m.hint(43, '주의하세요!||강력한 공격은 태그로 파훼할 수 있을지도?');
      m.one(52, 55, 10).one(70, 73, 10);                                   // 돌진을 피할 발판
      m.block(78, 78, 0, 16);                                              // 오른쪽 벽. 경기장은 열 48~77 (화면 한 장). 보스를 쓰러뜨리면 땅 위가 열린다 (openBossWall)
      m.goal(88, 13);                                                      // 열린 벽 너머 월드 클리어 문 (↑ 로 생명의 잔 넷을 끼워 연다)
      m.ent('B', 69, 13);
      return m;
    } }
];

function parseLevel(def) {
  var m = def.build();
  var lv = { id: def.id, name: def.name, chars: def.chars, theme: def.theme, target: def.target, boss: !!def.boss,
             w: m.w, g: m.g, pxW: m.w * TS, start: m.start, door: m.door, ents: m.ents, hints: m.hints };
  return lv;
}

// ===== 상태 =====
var TEST = !!window.G3_TEST;
var params = (function () { var o = {}; (window.location.search || '').replace(/^\?/, '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); o[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '1'); }); return o; })();
var DEBUG = !!params.debug;
var STAGE_PARAM = params.stage || null;
var SAVE_KEY = TEST ? 'g3-save-test' : 'g3-save';

var G = { mode: 'title', time: 0 };
var P = null;
var keys = {}, pressed = {};

function loadSave() { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && s.stars) return s; } catch (e) {} return { stars: {} }; }
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
var SAVE = loadSave();
function starsOf(id) { return (SAVE.stars[id] || [0, 0, 0]).slice(); }
function unlocked(i) { if (i === 0) return true; return starsOf(LEVELS[i - 1].id)[0] === 1; }
// 별은 판마다 따로 얻어 쌓인다 (problem.md 8줄): 이번 판의 별을 앞의 별에 더한다
function mergeStars(id, got) { var s = starsOf(id); for (var i = 0; i < 3; i++) s[i] = s[i] || got[i] ? 1 : 0; SAVE.stars[id] = s; return s; }

// ===== 칸 충돌 =====
function tileAt(c, r) {
  var lv = G.lv;
  if (c < 0 || c >= lv.w) return '#';
  if (r < 0 || r >= ROWS) return ' ';
  return lv.g[r][c];
}
function solidAt(c, r) { return tileAt(c, r) === '#'; }
function oneAt(c, r) { return tileAt(c, r) === '='; }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
// 보스 판정 둘 (사용자 "히트박스를 명확하게"): 맞는 판정은 그림의 몸통만큼 넓게 (그림 약 260x170 인데 예전 판정은 96x112 라 팔을 때려도 안 맞았다),
// 몸에 닿아 다치는 판정은 몸통 가운데로 좁게. 보스 밖의 적은 둘 다 자기 상자
function atkBox() { return { x: P.face > 0 ? P.x + P.w : P.x - CFG.atkReach, y: P.y + 2, w: CFG.atkReach, h: 32 }; }
function hurtBox(en) {   // 맞는 판정: 그림 크기 (슬라임 48×26, 박쥐 46×30, 보스 몸통)
  if (en.type === 'g') return { x: en.x + en.w / 2 - 24, y: en.y + en.h - 26, w: 48, h: 26 };
  if (en.type === 'f') return { x: en.x + en.w / 2 - 23, y: en.y + en.h / 2 - 15, w: 46, h: 30 };
  if (en.type !== 'B') return en; var w = 170, h = 150; return { x: en.x + en.w / 2 - w / 2, y: en.y + en.h - h, w: w, h: h }; }
function touchBox(en) {   // 닿아 다치는 판정: 몸 가운데만 (슬라임 30×20, 박쥐 22×18) — 그림 가장자리에 스쳤다고 다치지 않게
  if (en.type === 'g') return { x: en.x + en.w / 2 - 15, y: en.y + en.h - 20, w: 30, h: 20 };
  if (en.type === 'f') return { x: en.x + en.w / 2 - 11, y: en.y + en.h / 2 - 9, w: 22, h: 18 };
  if (en.type !== 'B') return en; var w = 80, h = 100; return { x: en.x + en.w / 2 - w / 2, y: en.y + en.h - h, w: w, h: h }; }

function moveBody(o, dt, opts) {
  opts = opts || {};
  var prevBottom = o.y + o.h;
  // 가로
  o.x += o.vx * dt;
  var top = Math.floor(o.y / TS), bot = Math.floor((o.y + o.h - 0.01) / TS), c, r;
  o.hitWall = false;
  if (o.vx > 0) { c = Math.floor((o.x + o.w - 0.01) / TS); for (r = top; r <= bot; r++) if (solidAt(c, r)) { o.x = c * TS - o.w; o.hitWall = true; break; } }
  else if (o.vx < 0) { c = Math.floor(o.x / TS); for (r = top; r <= bot; r++) if (solidAt(c, r)) { o.x = (c + 1) * TS; o.hitWall = true; break; } }
  // 얼음 길 위를 걸을 때 낮은 턱은 올라선다
  if (opts.ice && o.onGround && G.ice) {
    var b = o.y + o.h;
    for (var i = 0; i < G.ice.segs.length; i++) { var s = G.ice.segs[i]; if (o.x + o.w > s.x && o.x < s.x + s.w && s.y < b && s.y >= b - 10) { o.y = s.y - o.h; break; } }
  }
  // 세로
  o.y += o.vy * dt;
  o.onGround = false;
  var cl = Math.floor(o.x / TS), cr = Math.floor((o.x + o.w - 0.01) / TS);
  if (o.vy >= 0) {
    r = Math.floor((o.y + o.h - 0.01) / TS);
    for (c = cl; c <= cr; c++) {
      if (solidAt(c, r) || (oneAt(c, r) && prevBottom <= r * TS + 0.5)) { o.y = r * TS - o.h; o.vy = 0; o.onGround = true; break; }
    }
    if (!o.onGround && opts.ice && G.ice) {
      for (var j = 0; j < G.ice.segs.length; j++) { var sg = G.ice.segs[j];
        if (o.x + o.w > sg.x && o.x < sg.x + sg.w && prevBottom <= sg.y + 0.5 && o.y + o.h >= sg.y) { o.y = sg.y - o.h; o.vy = 0; o.onGround = true; o.onIce = true; break; } }
    }
  } else {
    r = Math.floor(o.y / TS);
    for (c = cl; c <= cr; c++) if (solidAt(c, r)) { o.y = (r + 1) * TS; o.vy = 0; break; }
  }
}

// ===== 스테이지 시작 =====
function startLevel(which, opts) {
  opts = opts || {};
  var idx = typeof which === 'number' ? which : -1;
  var def = idx >= 0 ? LEVELS[idx] : which;
  var lv = parseLevel(def);
  G.lv = lv; G.levelIndex = idx; G.test = !!opts.test || (STAGE_PARAM != null && !TEST);
  G.mode = 'play'; G.time = 0; G.runTime = 0;
  G.hp = CFG.hp; G.hpMax = CFG.hp; G.doorAnim = null; G.relicPop = null; G.heartNew = 0; G.wallOpen = false; G.stack = CFG.stackStart; G.regen = 0; G.gauge = 0;
  G.hitThisRun = false; G.treasure = false; G.perfect = null; G.cutin = null; G.cueHit = null; G.counterFx = null; G.slamFx = null; G.refundLock = [0, 0, 0]; G.selfCD = [0, 0, 0]; G.selfDeny = 0; G.ice = null;
  G.echoes = []; G.parts = []; G.pops = []; G.waves = []; G.items = [];
  G.flash = 0; G.hitstop = 0; G.ult = null; G.shake = 0; G.dying = 0; G.cleared = false;
  G.stats = { perfects: 0, tags: 0, normals: 0 };
  G.form = 'move';                                                         // 스테이지는 이동폼으로 시작
  P = { x: lv.start.c * TS + (TS - CFG.pw) / 2, y: (lv.start.r + 1) * TS - CFG.ph, w: CFG.pw, h: CFG.ph,
        vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, buf: 0, char: lv.chars[0], inv: 0, skill: null,
        atk: 0, atkCD: 0, atkHit: null, anim: 0 };
  P.safe = { x: P.x, y: P.y };   // 떨어지면 돌아올 자리: 마지막으로 두 발 모두 땅(칸·발판)을 디딘 곳
  G.enemies = [];
  lv.ents.forEach(function (e) {
    if (e.type === 'g') G.enemies.push({ type: 'g', x: e.c * TS + 4, y: (e.r + 1) * TS - 26, w: 26, h: 26, vx: -50, vy: 0, hp: 3, stun: 0, dead: 0, t: Math.random() * 6, sx: e.c * TS + 4, face: -1 });
    else if (e.type === 'f') G.enemies.push({ type: 'f', x: e.c * TS + 4, y: e.r * TS + 6, w: 24, h: 20, vx: 0, vy: 0, hp: 2, stun: 0, dead: 0, bx: e.c * TS + 4, by: e.r * TS + 6, t: Math.random() * 6, face: -1 });
    else if (e.type === 'T') G.items.push({ type: 'T', x: e.c * TS + 6, y: e.r * TS + 8, w: 20, h: 20, t: 0 });
    else if (e.type === 'B') G.enemies.push(makeBoss(e.c, e.r));
  });
  G.door = lv.door ? { x: lv.door.c * TS, y: (lv.door.r - 1) * TS, w: TS, h: TS * 2 } : null;
  G.cam = clampCam(P.x + P.w / 2 - W / 2);
  hideAll();
}
function clampCam(x) { return Math.max(0, Math.min(G.lv.pxW - W, x)); }

// ===== 보스 (1-5, problem.md 23줄. 패턴은 초기 규칙) =====
// 2026-11-24 사용자 "보스 움직임이 부자연스럽고 돌진 말고는 움직임이 없다": 서 있는 동안 플레이어 쪽으로 걸어오고 (돌아설 때 잠깐 멈춤),
// 패턴 셋을 돌아가며 쓴다 (충격파 → 돌진 → 내려찍기). 충격파는 땅을 따라 솟는 수정 가시, 내려찍기는 떨어질 자리를 그림자로 예고
function makeBoss(c, r) {
  return { type: 'B', x: c * TS, y: (r + 1) * TS - 112, y0: (r + 1) * TS - 112, w: 96, h: 112, vx: 0, vy: 0, hp: CFG.bossHp, max: CFG.bossHp,
           state: 'sleep', st: 0, face: -1, pi: 0, kneelDone: false, enraged: false, stun: 0, dead: 0, walk: 0, turn: 0, jy: 0,
           arenaL: 48 * TS, arenaR: 78 * TS, waveLeft: 0 };
}
var BOSS = { walkV: 46, walkVRage: 80, keep: 120, turnT: 0.25, slamT: 0.75, slamH: 190, slamR: 120, margin: 90 };   // 걸음 속도, 멈추는 거리, 돌아서기, 내려찍기 (시간·높이·땅 울림 반경)
var MON = { aggroX: 18 * TS, aggroY: 9 * TS, lose: 1.3, slimeV: 60, wanderV: 18, wander: 1.5 * TS, batV: 85, batDiveV: 260, batDiveEvery: 1.6, batLeash: 12 * TS, batHover: 56 };   // 일반 몬스터: 알아채는 거리 (2026-11-24 사용자 "추적 범위는 지금보다 3배": 6칸·3칸 → 18칸·9칸), 한 번 알아채면 그 1.3배 거리까지 따라옴, 슬라임 기는 속도·제자리 오가는 범위, 박쥐 속도·제자리에서 멀어지는 한계(4 → 12칸)·머리 위 높이
// 보스 반격 기회: 예고(0.8초)의 마지막 CFG.counterWin 초, 보스 가까이 (보스 머리 위 노란 마름모가 거의 다 줄어든 때)
function counterOpen(b) { return b.state === 'tele' && b.st >= 0.8 - CFG.counterWin && Math.abs(P.x + P.w / 2 - (b.x + b.w / 2)) < CFG.counterRange; }
function bossVulnerable(b) { return b.state === 'recover' || b.state === 'kneel' || b.state === 'stagger'; }
function bossSet(b, s) { b.state = s; b.st = 0; }
function updateBoss(b, dt) {
  if (b.hp <= 0) { if (b.state !== 'dead') { bossSet(b, 'dead'); b.y = b.y0; G.items.push({ type: 'C', x: b.x + b.w / 2 - 24, y: b.y + 40, w: 48, h: 34, vx: 0, vy: -260, t: 0, opening: 0 }); openBossWall(b); pop('격파!', b.x + b.w / 2, b.y, '#ffd24a', true); G.shake = 0.5; } b.dead += dt; return; }
  b.st += dt;
  var pcx = P.x + P.w / 2, bcx = b.x + b.w / 2, lo = b.arenaL + BOSS.margin, hi = b.arenaR - b.w - BOSS.margin;
  if (b.state === 'sleep') { if (pcx > b.arenaL + 3 * TS) { bossSet(b, 'roar'); pop('보스!', bcx, b.y - 10, '#ff7a5a', true); G.shake = 0.4; } return; }
  if (!b.kneelDone && b.hp <= b.max / 2 && b.state !== 'slam') { b.kneelDone = true; bossSet(b, 'kneel'); b.vx = 0; pop('무방비!', bcx, b.y - 10, '#7ad0ff', true); return; }
  if (b.hp <= b.max * 0.3) b.enraged = true;
  var idleT = b.enraged ? 0.7 : 1.2;
  switch (b.state) {
    case 'roar': if (b.st > 1.0) bossSet(b, 'idle'); break;
    case 'idle': b.moving = false;
      var want = pcx < bcx ? -1 : 1;
      if (want !== b.face) { b.turn += dt; if (b.turn > BOSS.turnT) { b.face = want; b.turn = 0; } }   // 돌아설 때 잠깐 멈춘다
      else if (Math.abs(pcx - bcx) > BOSS.keep) {                            // 플레이어 쪽으로 걸어온다
        var nx = Math.max(lo, Math.min(hi, b.x + b.face * (b.enraged ? BOSS.walkVRage : BOSS.walkV) * dt));
        b.moving = nx !== b.x; if (b.moving) b.walk += dt; b.x = nx;
      }
      if (b.st > idleT) { b.pattern = ['wave', 'charge', 'slam'][b.pi++ % 3]; b.tx = Math.max(lo, Math.min(hi, pcx - b.w / 2)); b.face = want; b.turn = 0; bossSet(b, 'tele'); }
      break;
    case 'tele':
      if (b.pattern === 'slam') b.tx = Math.max(lo, Math.min(hi, pcx - b.w / 2));   // 내려찍을 자리는 예고 동안 플레이어를 따라간다
      if (b.st > 0.8) {
        if (b.pattern === 'wave') { spawnWaves(b); b.waveLeft = b.enraged ? 1 : 0; bossSet(b, 'wave'); G.shake = 0.25; }
        else if (b.pattern === 'slam') { b.jx0 = b.x; bossSet(b, 'slam'); }
        else { b.vx = b.face * 520; bossSet(b, 'charge'); }
      } break;
    case 'wave': if (b.waveLeft > 0 && b.st > 0.45) { spawnWaves(b); b.waveLeft--; b.st = 0.01; G.shake = 0.2; } else if (b.st > 0.6 && b.waveLeft === 0) bossSet(b, 'recover'); break;
    case 'charge':
      b.x += b.vx * dt; if (Math.random() < 0.6) burst(b.x + b.w / 2 - b.face * 50, b.y + b.h - 4, '#b9a58a', 1);   // 흙먼지
      if (b.x < b.arenaL) { b.x = b.arenaL; b.vx = 0; G.shake = 0.3; bossSet(b, 'recover'); }
      else if (b.x + b.w > b.arenaR) { b.x = b.arenaR - b.w; b.vx = 0; G.shake = 0.3; bossSet(b, 'recover'); }
      break;
    case 'slam':                                                             // 뛰어올라 예고한 자리로 떨어진다
      var k = Math.min(1, b.st / BOSS.slamT);
      b.x = b.jx0 + (b.tx - b.jx0) * k; b.jy = -Math.sin(k * Math.PI) * BOSS.slamH; b.y = b.y0 + b.jy;
      if (k >= 1) {
        b.y = b.y0; b.jy = 0; G.shake = 0.4; bossSet(b, 'recover');
        G.slamFx = { x: b.x + b.w / 2, y: b.y0 + b.h, t: 0 };
        if (P.onGround && Math.abs(P.x + P.w / 2 - (b.x + b.w / 2)) < BOSS.slamR) hurt(b.x + b.w / 2);   // 땅이 울리는 반경 안에서 땅에 서 있으면 다친다 (뛰어 피함)
      }
      break;
    case 'recover': if (b.st > 1.6) bossSet(b, 'idle'); break;
    case 'stagger': if (b.st > 1.8) bossSet(b, 'idle'); break;   // 반격당해 비틀거림 (빈틈, 대미지 2배)
    case 'kneel': if (b.st > 4.0) bossSet(b, 'idle'); break;
  }
}
function spawnWaves(b) {   // 충격파: 양쪽으로 땅을 따라 솟는 수정 가시 (판정 40×30, 그림도 같은 크기)
  var y = b.y + b.h - 30;
  G.waves.push({ x: b.x - 40, y: y, w: 40, h: 30, vx: -320 }, { x: b.x + b.w, y: y, w: 40, h: 30, vx: 320 });
}

// ===== 입력 =====
// 키는 글자(e.key)가 아니라 자판 위치(e.code)로 읽는다. 한글 자판(ㅁ ㄴ ㅇ)이나 Shift 를 누른 채여도 같은 키로 들어온다
// 배치: 오른손 이동(← → ↑), 왼손 행동(Space 점프, A S D 태그, F 공격, Shift 폼, E 필살기). 2026-11-24 사용자 (가) 안
var KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', Space: 'jump',
               KeyA: 'tag0', KeyS: 'tag1', KeyD: 'tag2', KeyF: 'atk', ShiftLeft: 'form', ShiftRight: 'form', KeyE: 'ult' };
function press(name) { if (!keys[name]) pressed[name] = true; keys[name] = true; }
function release(name) { keys[name] = false; }

// ===== 태그와 기술 (problem.md 13~19줄) =====
function inputDir() { if (P && P.lockIn > 0) return { x: 0, up: false }; return { x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0), up: !!keys.up }; }   // 떨어져 돌아온 직후 잠깐은 방향키를 받지 않음 (2026-11-24 누르고 있던 방향키로 곧바로 다시 떨어지던 버그)
function tag(ci) {
  if (G.mode !== 'play' || G.ult || G.dying > 0) return false;
  if (G.lv.chars.indexOf(ci) < 0) return false;                          // 없는 캐릭터의 키는 아무 일도 하지 않는다
  if (G.stack < 1) { G.stackShake = 0.3; return false; }                 // 스택 0 이면 태그가 안 된다
  var cb = boss();
  if (cb && counterOpen(cb)) {                                           // 보스 반격: 보스 공격 예고가 끝나는 순간에 맞춘 태그 (게임 2 의 핵심 재미)
    damage(cb, CFG.counterDmg, 'counter'); bossSet(cb, 'stagger'); cb.vx = 0; cb.y = cb.y0; cb.jy = 0;
    G.counterFx = { t: 0, x: cb.x + cb.w / 2, y: cb.y0 - 122 };
    pop('반격!', P.x + P.w / 2, P.y - 84, '#ffd740', true);
    P.inv = Math.max(P.inv, 0.8); G.gauge = Math.min(100, G.gauge + CFG.gaugePerfect); G.stats.counters = (G.stats.counters || 0) + 1;
    G.flash = 0.25; G.hitstop = 0.2; G.shake = Math.max(G.shake, 0.3); G.cutin = { ci: ci, t: 0 };
    sfx('perfect');
  }
  if (ci === P.char) {                                                   // 지금 캐릭터의 키: 자기 기술 (스택 1, 바뀌는 것이 없으니 PERFECT·에코 없음)
    if (P.skill) return false;
    if (G.time < (G.selfCD[ci] || 0)) { pop('쿨타임', P.x + P.w / 2, P.y - 44, '#9aa6bb', false); G.selfDeny = 0.3; return false; }   // 2026-11-24 사용자: 태그 없이 쓰는 자기 기술은 쿨타임 (계속 혼자 쓰면 태그가 필요 없어져서)
    G.selfCD[ci] = G.time + CFG.selfCD;
    G.stack -= 1; G.stats.selfs = (G.stats.selfs || 0) + 1;
    startSkill(ci, inputDir()); G.lastTag = { t: G.time, perfect: false, self: true };
    return true;
  }
  var open = !!(G.perfect && G.time <= G.perfect.until && !G.perfect.used);
  var chain = open && G.perfect.kind === 'move';                            // 이동 연계 (이동 기술 끝 무렵의 태그)
  var perfect = open && !chain;                                             // PERFECT (기술이 적에게 맞은 직후의 태그)
  var prevChar = P.char, prevSkill = P.skill;
  G.stack -= 1; G.stats.tags++;
  if (chain) {
    G.perfect.used = true; G.stats.chains = (G.stats.chains || 0) + 1;
    refund(ci);
    pop('연계!', P.x + P.w / 2, P.y - 84, '#9fe6ff', true);
    G.flash = 0.06; G.shake = Math.max(G.shake, 0.08);
    sfx('perfect');
  } else if (perfect) {
    G.perfect.used = true;
    makeEcho(prevChar, prevSkill && prevSkill.t < prevSkill.dur ? prevSkill : null);
    // 2026-11-24 사용자 "퍼펙트시에 공격 스킬은 딜만 증가하고, 스택을 돌려받는건 제한": PERFECT 는 스택을 돌려받지 않고, 들어오는 기술의 대미지가 CFG.perfectDmgMul 배
    G.cutin = { ci: ci, t: 0 };                                             // 들어오는 캐릭터 얼굴이 화면을 가로지름 (2026-11-24 사용자 "태그 시 나타나는 표현")
    G.gauge = Math.min(100, G.gauge + CFG.gaugePerfect);
    G.stats.perfects++;
    pop('PERFECT', P.x + P.w / 2, P.y - 84, '#ffe14a', true);
    G.flash = 0.18; G.hitstop = CFG.hitstop; G.shake = Math.max(G.shake, 0.15);
    sfx('perfect');
  } else {
    G.stats.normals++;
    sfx('tag');
  }
  P.skill = null;
  P.char = ci;
  burst(P.x + P.w / 2, P.y + P.h / 2, CHARS[ci].color, 10);
  startSkill(ci, inputDir());
  if (perfect && P.skill) P.skill.dmgMul = CFG.perfectDmgMul;
  if (chain || perfect) G.cueHit = { t: 0, x: P.x + P.w / 2, y: P.y - 54 };   // 성공: 마름모가 하늘빛으로 꽉 차며 퍼진다 (게임 2 처럼)
  if (chain && P.skill && !isAtkType(P.skill.type)) {                       // 연계로 나온 이동 기술은 앞 기술의 기세를 이어 더 멀리 (1.25배)
    P.skill.vx *= CFG.chainBoost; P.skill.vy *= CFG.chainBoost; P.skill.chained = true; P.vx = P.skill.vx; P.vy = P.skill.vy;
  }
  G.lastTag = { t: G.time, perfect: perfect, chain: chain };
  return true;
}
// 스택 돌려받기. 같은 캐릭터로는 CFG.refundLock 초 동안 한 번만 (무한 돌진·점프 막기, 2026-11-24 사용자)
function refund(ci) {
  if (G.time < (G.refundLock[ci] || 0)) { pop('돌려받기 대기', P.x + P.w / 2, P.y - 40, '#9aa6bb', false); return false; }
  G.stack = Math.min(CFG.stackMax, G.stack + 1);
  G.stackFlash = 0.6;                                                       // HUD 스택 칸에 +1 과 반짝임
  G.refundLock[ci] = G.time + CFG.refundLock;
  return true;
}
// 공격폼 기술 (problem.md 폼 줄): 그 자리에서 앞을 넓게 때린다
var ATK = {
  claw:   { dur: 0.3,  w: 60, h: 16, from: 'skill', name: '화염 할퀴기' },  // 빨강
  spikes: { dur: 0.35, w: 86, h: 10, from: 'ice',   name: '얼음 가시' },    // 파랑: 얼려서 오래 멈춘다
  upper:  { dur: 0.3,  w: 22, h: 40, from: 'wind',  name: '회오리 어퍼컷' } // 바람: 적을 띄운다
};
function isAtkType(t) { return t === 'claw' || t === 'spikes' || t === 'upper'; }
// 기술 판정 (2026-11-24 사용자 "판정을 세밀하게", "클로에가 스킬을 쓸 때 아래에서부터 위까지 전부 판정"): 그려지는 이펙트와 같은 자리·크기
function skillHitbox(o, type, face) {
  var cx = o.x + o.w / 2, fy = o.y + o.h;
  if (type === 'claw' || type === 'spikes') { var a = ATK[type]; return { x: face > 0 ? o.x + o.w - 6 : o.x - a.w + 6, y: o.y - a.h, w: a.w, h: o.h + a.h + 2 }; }
  if (type === 'upper') return { x: cx - 40, y: fy - 112, w: 80, h: 114 };                       // 회오리 셋이 감아 오르는 기둥 전체 (발밑 ~ 머리 위 3칸)
  if (type === 'wind') { var y0 = o.windY0 !== undefined ? Math.max(o.windY0, fy) : fy + 40; return { x: cx - 22, y: o.y - 8, w: 44, h: y0 + 20 - (o.y - 8) }; }   // 솟구친 자리(발밑 회오리)부터 지금 머리 위까지 전부
  if (type === 'dash') return { x: face > 0 ? cx - 22 : cx - 52, y: o.y - 2, w: 74, h: o.h + 6 };     // 불길에 싸인 몸과 앞쪽 불덩이
  if (type === 'strike') return { x: face > 0 ? o.x : o.x - 40, y: o.y - 8, w: o.w + 40, h: o.h + 16 };
  return { x: o.x - 6, y: o.y - 6, w: o.w + 12, h: o.h + 12 };
}
function startSkill(ci, dir) {
  if (dir.x) P.face = dir.x;
  var s = { ci: ci, t: 0, hit: [], perfectGiven: false };
  if (G.form === 'atk') {
    s.type = ['claw', 'spikes', 'upper'][ci]; s.dur = ATK[s.type].dur; s.vx = 0; s.vy = ci === 2 ? -260 : 0;
    sfx(['dash', 'ice', 'wind'][ci]); P.skill = s; P.vx = 0; P.vy = Math.min(P.vy, s.vy); return;
  }
  if (ci === 0) { s.type = 'dash'; s.dur = CFG.dashT; s.vx = P.face * CFG.dashV; s.vy = 0; sfx('dash'); }
  else if (ci === 1) {
    var dx = dir.x, dy = dir.up ? -1 : 0;
    if (!dx && !dy) dx = P.face;
    var sp = CFG.slideDist / CFG.slideT;
    if (dy && !dx) { s.type = 'up'; s.dur = CFG.slideT; s.vx = 0; s.vy = -CFG.upDist / CFG.slideT; s.y0 = P.y + P.h; }
    else { var n = Math.sqrt(dx * dx + dy * dy); s.type = 'slide'; s.dur = CFG.slideT; s.vx = dx / n * sp; s.vy = dy / n * sp; }
    G.ice = { segs: [], done: false, life: CFG.iceLife };                   // 경로는 하나만 남는다
    sfx('ice');
  } else { P.windY0 = P.y + P.h; s.type = 'wind'; s.dur = CFG.windT; s.vx = P.vx * 0.5; s.vy = -CFG.windV; sfx('wind'); }
  P.skill = s;
  P.vx = s.vx; P.vy = s.vy;
}
function endSkill() {
  var s = P.skill; P.skill = null;
  if (!s) return;
  if (s.type === 'dash') { P.vx = P.face * CFG.run * 0.6; P.vy = 0; }
  else if (s.type === 'slide') { P.vy = 0; if (G.ice) G.ice.done = true; }
  else if (s.type === 'up') {
    // 얼음 기둥: 꼭대기가 발판으로 남는다
    var top = P.y + P.h;
    G.ice.segs.push({ x: P.x - 8, y: top, w: P.w + 16, h: 8, pillar: true, y0: s.y0 });
    G.ice.done = true; P.vy = 0; P.onGround = true;
  } else if (s.type === 'wind') { P.vy = -220; }
}
function skillBox(o) { return { x: o.x - 6, y: o.y - 6, w: o.w + 12, h: o.h + 12 }; }

function makeEcho(ci, skill) {
  // 에코: 나가는 캐릭터가 하던 기술의 남은 공격을 마저 하고 사라진다 (problem.md 15줄)
  var e = { ci: ci, x: P.x, y: P.y, w: P.w, h: P.h, t: 0, hit: [], face: P.face };
  if (skill) { e.type = skill.type; e.vx = isAtkType(skill.type) ? 0 : skill.vx; e.vy = isAtkType(skill.type) ? 0 : skill.vy; e.dur = Math.max(0.15, skill.dur - skill.t) + 0.1; if (isAtkType(skill.type)) e.hit = []; }
  else { e.type = 'strike'; e.vx = 0; e.vy = 0; e.dur = 0.3; }
  G.echoes.push(e);
}

function damage(en, n, from) {
  if (en.hp <= 0) return;
  var mult = en.type === 'B' && bossVulnerable(en) ? 2 : 1;
  var d = n * mult;
  en.hp -= d;
  pop(String(d), en.x + en.w / 2, en.y - 6, mult > 1 ? '#7ad0ff' : '#fff', false);
  burst(en.x + en.w / 2, en.y + en.h / 2, '#fff2b0', 6);
  sfx('hit');
  if (en.type !== 'B') {
    en.stun = from === 'ice' ? 0.9 : 0.4;                                // 얼음 가시는 오래 얼린다
    if (from === 'wind' && en.type === 'g') en.vy = -420;               // 바람은 적을 띄운다
    if (en.hp <= 0) { en.dead = 0.001; burst(en.x + en.w / 2, en.y + en.h / 2, '#ffffff', 12); }
  }
}
function skillHits(box, hitList, from, onFirst, mul) {
  var any = false;
  G.enemies.forEach(function (en) {
    if (en.hp <= 0 || en.dead || hitList.indexOf(en) >= 0) return;
    if (en.type === 'B' && en.state === 'sleep') return;
    if (!overlap(box, hurtBox(en))) return;
    hitList.push(en);
    damage(en, (from === 'atk' ? CFG.atkDmg : (from === 'echo' ? CFG.echoDmg : CFG.skillDmg)) * (mul || 1), from);
    any = true;
    if (onFirst) onFirst(en);
  });
  return any;
}

// ===== 다치기와 다시 하기 (problem.md 21줄) =====
function invulnerable() { return P.inv > 0 || !!P.skill || !!G.ult || G.dying > 0; }
function hurt(fromX) {
  if (invulnerable() || G.mode !== 'play') return;
  G.hp -= 1; G.hitThisRun = true; P.inv = CFG.hurtInv;
  P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * 220; P.vy = -320;
  G.shake = 0.25; G.flashRed = 0.2; sfx('hurt');
  if (G.hp <= 0) { G.dying = 0.7; }
}
function restartStage() {
  var idx = G.levelIndex, test = G.test;
  startLevel(idx >= 0 ? idx : G.lvDef, { test: test });
}

// ===== 클리어 (problem.md 24줄) =====
function clearStage() {
  if (G.cleared) return;
  G.cleared = true;
  var got = [1, G.hitThisRun ? 0 : 1, G.treasure ? 1 : 0];
  G.lastGot = got;
  var total = got.slice();
  if (!G.test && G.levelIndex >= 0) { total = mergeStars(G.lv.id, got); writeSave(SAVE); }
  sfx('clear');
  if (G.lv.boss) { G.mode = 'gameclear'; showGameClear(got); }
  else { G.mode = 'clear'; showClear(got, total); }
}

// ===== 한 걸음 =====
function update(dt) {
  if (G.mode !== 'play') { pressed = {}; return; }
  if (G.hitstop > 0) { G.hitstop -= dt; pressed = {}; return; }
  var steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  for (var i = 0; i < steps; i++) { step(h, i === 0); if (G.mode !== 'play') break; }
  pressed = {};
}
function step(dt, first) {
  G.time += dt;
  if (G.dying > 0) { G.dying -= dt; if (G.dying <= 0) restartStage(); return; }
  if (G.doorAnim) { G.doorAnim.t += dt; tickFx(dt); if (G.doorAnim.t >= doorDur()) clearStage(); return; }   // 문이 열리는 동안은 멈춤
  if (!G.ult) G.runTime += dt;
  // 입력
  if (first) {
    if (pressed.form && !G.ult) { G.form = G.form === 'move' ? 'atk' : 'move'; pop(G.form === 'atk' ? '공격폼' : '이동폼', P.x + P.w / 2, P.y - 20, G.form === 'atk' ? '#ff9a5a' : '#9fe6ff', false); sfx('tag'); }
    if (pressed.up) interact();   // ↑: 상자 열기·문 열기
    if (pressed.tag0) tag(0);
    if (pressed.tag1) tag(1);
    if (pressed.tag2) tag(2);
    if (pressed.ult && G.gauge >= 100 && !P.skill && !G.ult) { G.ult = { t: 0, hitDone: false }; G.gauge = 0; sfx('ult'); }
    if (pressed.atk && P.atkCD <= 0 && !P.skill && !G.ult) { P.atk = CFG.atkT; P.atkCD = CFG.atkCD; P.atkHit = []; sfx('atk'); }
    if (pressed.jump) P.buf = CFG.buffer;
  }
  if (G.stack !== G.lastStack) { G.lastStack = G.stack; G.stackT = G.time; }   // 머리 위 수정: 바뀐 때를 기억 (다 차 있고 그대로면 흐려짐)
  // 스택 회복
  if (G.stack < CFG.stackMax) { G.regen += dt; if (G.regen >= CFG.stackRegen) { G.regen -= CFG.stackRegen; G.stack++; } } else G.regen = 0;
  G.gauge = Math.min(100, G.gauge);
  // 합동 필살기 (problem.md 20줄): 빨강 돌진 → 파랑 활주 → 바람 상승 → 셋이 함께 마무리
  if (G.ult) {   // 합동 필살기 : 체인 에코 — ver.2 — 공격마다 한 번씩 맞힘 (용의 돌진·얼음비·폭풍 1씩, 합동 일격 3. 보스는 2씩). 범위는 화면 전체
    var ut0 = G.ult.t; G.ult.t += dt; G.ult.hits = G.ult.hits || 0; G.ultHits = (G.ultHits || []).filter(function (h) { h.t += dt; return h.t < 0.3; }); G.enemies.forEach(function (en) { if (en.hitFl > 0) en.hitFl -= dt; });
    while (G.ult.hits < ULT.hits.length && G.ult.t >= ULT.hits[G.ult.hits]) {
      var hi = G.ult.hits++; G.shake = hi === 3 ? 0.7 : 0.35; G.flash = hi === 3 ? 0.12 : 0.05; G.hitstop = hi === 3 ? 0.12 : 0.06; G.ultHits = G.ultHits || [];
      G.enemies.forEach(function (en) {
        if (en.hp <= 0 || (en.type === 'B' && en.state === 'sleep')) return;
        var ex = en.x + en.w / 2; if (ex > G.cam - 20 && ex < G.cam + W + 20) { damage(en, en.type === 'B' ? ULT.bossDmg[hi] : ULT.dmg[hi], 'ult'); en.hitFl = 0.12; G.ultHits.push({ x: ex, y: en.y + en.h / 2, t: 0, c: hi }); burst(ex, en.y + en.h / 2, ['#ff9a4a', '#9fe6ff', '#9affc8', '#fff2c0'][hi], 14); }   // 범위: 화면 전체. 맞은 적마다 속성 불꽃
      });
    }
    if (G.ult.t >= ULT.end) G.ult = null;
    tickFx(dt);
    return;
  }
  // 플레이어
  P.inv = Math.max(0, P.inv - dt); P.lockIn = Math.max(0, (P.lockIn || 0) - dt); P.atkCD -= dt; P.anim += dt;
  if (P.onGround && !P.skill) { var wd0 = P.walkDist || 0; P.walkDist = wd0 + Math.abs(P.vx) * dt; }   // 걸은 거리 (걸음 몸짓을 거리에 맞춤)
  if (P.skill) {
    var s = P.skill; s.t += dt;
    if (isAtkType(s.type)) { P.vx = 0; P.vy = s.type === 'upper' && s.t < 0.15 ? s.vy : Math.min(CFG.maxFall, P.vy + CFG.gravity * dt); }
    else { P.vx = s.vx; P.vy = s.vy; }
    moveBody(P, dt, { ice: s.type !== 'up' });
    if (s.type === 'slide' || s.type === 'up') {
      var fb = P.y + P.h, last = G.ice.segs[G.ice.segs.length - 1];
      if (s.type === 'slide' && (!last || Math.abs(last.x - (P.x - 4)) > 8 || Math.abs(last.y - fb) > 6)) G.ice.segs.push({ x: P.x - 4, y: fb, w: P.w + 8, h: 6 });
      if (G.ice.segs.length > 60) G.ice.segs.shift();
    }
    if (s.type !== 'slide' && s.type !== 'up') skillHits(   // 오필리아 이동 기술(활주·위)은 대미지 없음 (2026-11-24 사용자)
      skillHitbox(P, s.type, P.face), s.hit, isAtkType(s.type) ? ATK[s.type].from : (s.type === 'wind' ? 'wind' : 'skill'), function (en) {
      G.gauge = Math.min(100, G.gauge + CFG.gaugeNormal);
      if (!s.perfectGiven) { s.perfectGiven = true; G.perfect = { until: G.time + CFG.perfectWin, len: CFG.perfectWin, skill: s, used: false }; }  // 기술 한 번에 PERFECT 기회 한 번
    }, s.dmgMul);
    if (!isAtkType(s.type) && !s.chainGiven && s.t >= s.dur - CFG.chainLead && !(G.perfect && !G.perfect.used && G.time <= G.perfect.until)) {   // 이동 기술 끝 무렵: 이동 연계 기회 (마름모가 같이 뜬다)
      s.chainGiven = true; G.perfect = { until: G.time + CFG.chainWin, len: CFG.chainWin, skill: s, used: false, kind: 'move' };
    }
    if (s.t >= s.dur) endSkill();
    trail(P.x + P.w / 2, P.y + P.h / 2, CHARS[s.ci].color);
  } else {
    var dir = inputDir();
    var target = dir.x * CFG.run;
    var acc = P.onGround ? 1800 : 1100;
    if (P.vx < target) P.vx = Math.min(target, P.vx + acc * dt); else if (P.vx > target) P.vx = Math.max(target, P.vx - acc * dt);
    if (dir.x) P.face = dir.x;
    P.coyote = P.onGround ? CFG.coyote : P.coyote - dt;
    P.buf -= dt;
    if (P.buf > 0 && P.coyote > 0) { P.vy = -CFG.jumpV; P.buf = 0; P.coyote = 0; sfx('jump'); }
    if (!keys.jump && P.vy < -200) P.vy = -200;                             // 일찍 떼면 낮게
    P.vy = Math.min(CFG.maxFall, P.vy + CFG.gravity * dt);
    moveBody(P, dt, { ice: true });
  }
  // 기본 공격 (PERFECT 는 되지 않는다)
  if (P.atk > 0) {
    P.atk -= dt;
    var ab = atkBox();
    skillHits(ab, P.atkHit, 'atk', null);
  }
  // 보스가 깨어나면 경기장 밖으로 나가지 못한다
  var bb = boss(); if (bb && bb.state !== 'sleep' && bb.hp > 0 && P.x < bb.arenaL) { P.x = bb.arenaL; P.vx = Math.max(0, P.vx); }
  // 마지막으로 디딘 안전한 자리 (두 발 아래가 모두 땅·발판이고 얼음 길 위가 아닐 때)
  if (P.onGround && !P.onIce && !P.skill) {
    var fr2 = Math.floor((P.y + P.h + 2) / TS), cl = Math.floor((P.x + 2) / TS), cr = Math.floor((P.x + P.w - 2) / TS);
    if ((solidAt(cl, fr2) || oneAt(cl, fr2)) && (solidAt(cr, fr2) || oneAt(cr, fr2))) P.safe = { x: P.x, y: P.y, face: P.face };
  }
  // 떨어짐: 체력 1칸을 잃고 마지막으로 디딘 자리에서 다시 (2026-11-24 사용자). 체력이 다 닳으면 스테이지 처음에서 다시
  if (P.y > ROWS * TS + 60) {
    G.hp -= 1; G.hitThisRun = true; sfx('fall'); G.flashRed = 0.25; G.shake = 0.2;
    var sx = P.safe.x, back = -(P.safe.face || 1);   // 디딘 자리가 낭떠러지 끝이면 왔던 쪽으로 한 칸 반 물러난 땅에서 (그 자리도 땅일 때만)
    for (var bs = 3; bs >= 1; bs--) { var tx = P.safe.x + back * bs * TS / 2, ry = Math.floor((P.safe.y + P.h + 2) / TS), c0 = Math.floor((tx + 2) / TS), c1 = Math.floor((tx + P.w - 2) / TS); if ((solidAt(c0, ry) || oneAt(c0, ry)) && (solidAt(c1, ry) || oneAt(c1, ry)) && !solidAt(c0, ry - 1) && !solidAt(c1, ry - 1)) { sx = tx; break; } }
    P.x = sx; P.y = P.safe.y; P.vx = 0; P.vy = 0; P.skill = null; P.inv = CFG.hurtInv; P.lockIn = 0.45;
    if (G.hp <= 0) { G.dying = 0.7; }
    return;
  }
  // 얼음 길 수명
  if (G.ice && G.ice.done) { G.ice.life -= dt; if (G.ice.life <= 0) { G.ice.segs.forEach(function (s) { burst(s.x + s.w / 2, s.y, '#cfefff', 2); }); G.ice = null; } }
  // 에코
  G.echoes.forEach(function (e) {
    e.t += dt; e.x += e.vx * dt; e.y += e.vy * dt;
    var box = skillHitbox(e, e.type, e.face);
    if (e.type !== 'slide' && e.type !== 'up') skillHits(box, e.hit, 'echo', function () { G.gauge = Math.min(100, G.gauge + 5); });
  });
  G.echoes = G.echoes.filter(function (e) { return e.t < e.dur; });
  // 적
  G.enemies.forEach(function (en) {
    if (en.type === 'B') { updateBoss(en, dt); if (en.hp > 0 && !bossVulnerable(en) && en.state !== 'sleep' && overlap(P, touchBox(en))) hurt(en.x + en.w / 2); return; }
    if (en.dead) { en.dead += dt; return; }
    en.t += dt; en.stun = Math.max(0, en.stun - dt);
    if (en.type === 'g') {   // 슬라임: 플레이어가 가까우면 그쪽을 보고 조금씩 다가온다 (기었다 멈췄다), 멀면 제자리 근처를 천천히 오간다
      var pdx = P.x + P.w / 2 - (en.x + en.w / 2), pdy = P.y + P.h - (en.y + en.h), k2 = en.aware ? MON.lose : 1, near = Math.abs(pdx) < MON.aggroX * k2 && Math.abs(pdy) < MON.aggroY * k2; en.aware = near;   // 알아채면 다가오고, 더 멀어져야 놓친다
      var spd = 0;
      if (en.stun <= 0) {
        if (near) { en.face = pdx < 0 ? -1 : 1; spd = (en.t % 1) < 0.75 && Math.abs(pdx) > 6 ? MON.slimeV * en.face : 0; }
        else { if (en.x < en.sx - MON.wander) en.face = 1; else if (en.x > en.sx + MON.wander) en.face = -1; spd = MON.wanderV * en.face; }
      }
      en.vy = Math.min(CFG.maxFall, en.vy + CFG.gravity * dt);
      if (spd && en.onGround) {                                               // 낭떠러지 앞에서는 멈춘다 (멀 때는 돌아선다)
        var fx = spd < 0 ? en.x - 2 : en.x + en.w + 2, fr = Math.floor((en.y + en.h + 4) / TS), fc = Math.floor(fx / TS);
        if (!solidAt(fc, fr) && !oneAt(fc, fr)) { if (!near) en.face = -en.face; spd = 0; }
      }
      en.vx = spd;
      moveBody(en, dt);
      if (en.hitWall && !near) en.face = -en.face;
      if (en.y > ROWS * TS + 40) { en.hp = 0; en.dead = 1; }
    } else if (en.type === 'f') {   // 박쥐 (2026-11-24 고침: 앞까지만 오고 부딪히지 않음, 점프하면 같이 올라감): 제 높이에서 맴돌다가 때때로 그 순간의 플레이어 자리로 내리꽂고 다시 올라간다
      if (en.stun <= 0) {
        var fdx = P.x + P.w / 2 - (en.x + en.w / 2), k3 = en.aware ? MON.lose : 1, fnear = Math.abs(fdx) < MON.aggroX * k3 && Math.abs(P.y - en.by) < MON.aggroY * k3; en.aware = fnear;
        en.mode = en.mode || 'hover'; en.mt = (en.mt || 0) + dt;
        var tx, ty, spd = MON.batV;
        if (en.mode === 'dive') {                                               // 내리꽂기: 시작할 때 정한 자리로 빠르게
          tx = en.dx; ty = en.dy; spd = MON.batDiveV;
          if (en.mt > 0.9 || (Math.abs(en.x - tx) < 4 && Math.abs(en.y - ty) < 4)) { en.mode = 'rise'; en.mt = 0; }
        } else if (en.mode === 'rise') {                                        // 제 높이로 돌아감
          tx = en.x; ty = en.by; if (Math.abs(en.y - en.by) < 4 || en.mt > 1.2) { en.mode = 'hover'; en.mt = 0; }
        } else {                                                                 // 맴돌기: 플레이어 옆 위쪽, 높이는 제 높이 (플레이어 점프를 따라 오르지 않음)
          tx = fnear ? Math.max(en.bx - MON.batLeash, Math.min(en.bx + MON.batLeash, P.x + P.w / 2 - en.w / 2 - Math.sign(fdx || 1) * 70)) : en.bx + Math.sin(en.t * 1.2) * 40;
          ty = en.by + Math.sin(en.t * 2.2) * 8;
          if (fnear && en.mt > MON.batDiveEvery && Math.abs(fdx) < 7 * TS) { en.mode = 'dive'; en.mt = 0; en.dx = P.x + P.w / 2 - en.w / 2; en.dy = P.y + P.h / 2 - en.h / 2; }
        }
        var mx = tx - en.x, my = ty - en.y, md = Math.sqrt(mx * mx + my * my), step = Math.min(md, spd * dt);
        if (md > 0.5) { en.x += mx / md * step; en.y += my / md * step; }
        en.face = fnear ? (fdx < 0 ? -1 : 1) : (mx < -0.5 ? -1 : (mx > 0.5 ? 1 : en.face));
      }
    }
    if (en.hp > 0 && en.stun <= 0 && overlap(P, touchBox(en))) hurt(en.x + en.w / 2);
  });
  G.enemies = G.enemies.filter(function (en) { return !(en.dead && en.dead > 0.5 && en.type !== 'B'); });
  // 보스 충격파
  G.waves.forEach(function (w) { w.x += w.vx * dt; if (overlap(P, w)) hurt(w.x + w.w / 2); });
  G.waves = G.waves.filter(function (w) { var b = boss(); return b && w.x > b.arenaL - 40 && w.x < b.arenaR + 10; });
  // 물건 (보물, 1-5 클리어 물건)
  G.items.forEach(function (it) {
    it.t += dt;
    if (it.type === 'C') { it.vy = Math.min(600, (it.vy || 0) + CFG.gravity * 0.5 * dt); moveBody(it, dt); if (it.opening) it.opening += dt; return; }   // 보스 보상 상자: 떨어져 놓이고, ↑ 로 연다 (interact)
    if (!it.got && overlap(P, it)) {
      it.got = true;
      if (it.type === 'T') { G.treasure = true; pop('보물!', it.x + 10, it.y - 6, '#ffd24a', true); burst(it.x + 10, it.y + 10, '#ffd24a', 16); sfx('treasure'); }

    }
  });
  G.items = G.items.filter(function (it) { return !it.got; });
  // 문 (골인 지점에 도달해 문을 들어가면 클리어)
  if (G.relicPop) { G.relicPop.t += dt; if (G.relicPop.t > 2.4) G.relicPop = null; } G.heartNew = Math.max(0, (G.heartNew || 0) - dt);   // 문은 ↑ 로 연다 (interact)
  tickFx(dt);
}

// ===== 연출 =====
function pop(text, x, y, color, big) { G.pops.push({ text: text, x: x, y: y, t: 0, color: color, big: big }); }
function burst(x, y, color, n) { for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160; G.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.4 + Math.random() * 0.3, color: color, size: 3 + (Math.random() * 3 | 0) }); } }
function trail(x, y, color) { if (Math.random() < 0.6) G.parts.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 20, vx: 0, vy: -20, t: 0, life: 0.3, color: color, size: 4 }); }
function tickFx(dt) {
  G.parts.forEach(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; });
  G.parts = G.parts.filter(function (p) { return p.t < p.life; });
  G.pops.forEach(function (p) { p.t += dt; p.y -= 30 * dt; });
  G.pops = G.pops.filter(function (p) { return p.t < (p.big ? 1.0 : 0.6); });
  if (G.cutin) { G.cutin.t += dt; if (G.cutin.t > 0.5) G.cutin = null; }
  if (G.slamFx) { G.slamFx.t += dt; if (G.slamFx.t > 0.5) G.slamFx = null; }
  if (G.cueHit) { G.cueHit.t += dt; if (G.cueHit.t > 0.35) G.cueHit = null; }
  G.selfDeny = Math.max(0, (G.selfDeny || 0) - dt);
  if (G.counterFx) { G.counterFx.t += dt; if (G.counterFx.t > 0.35) G.counterFx = null; }
  G.flash = Math.max(0, G.flash - dt); G.stackFlash = Math.max(0, (G.stackFlash || 0) - dt); G.flashRed = Math.max(0, (G.flashRed || 0) - dt); G.shake = Math.max(0, G.shake - dt); G.stackShake = Math.max(0, (G.stackShake || 0) - dt);
}

// ===== 소리 (작업 8 에서 ChipTone 생성음으로 바꾼다. 지금은 코드로 낸 짧은 음) =====
var AC = null;
function sfx(name) {
  if (TEST) return;
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    var spec = { jump: [520, 0.08, 'square', 0.05], atk: [300, 0.06, 'square', 0.05], tag: [660, 0.08, 'triangle', 0.08], perfect: [1320, 0.25, 'triangle', 0.14],
      dash: [180, 0.18, 'sawtooth', 0.06], ice: [900, 0.15, 'sine', 0.07], wind: [400, 0.2, 'triangle', 0.06], hit: [220, 0.06, 'square', 0.06],
      hurt: [140, 0.2, 'sawtooth', 0.08], fall: [200, 0.3, 'sine', 0.07], treasure: [990, 0.2, 'triangle', 0.1], clear: [784, 0.4, 'triangle', 0.12], ult: [260, 0.6, 'sawtooth', 0.1] }[name];
    if (!spec) return;
    o.type = spec[2]; o.frequency.setValueAtTime(spec[0], t);
    if (name === 'perfect' || name === 'clear' || name === 'treasure') o.frequency.exponentialRampToValueAtTime(spec[0] * 1.5, t + spec[1]);
    if (name === 'fall' || name === 'hurt') o.frequency.exponentialRampToValueAtTime(spec[0] * 0.5, t + spec[1]);
    g.gain.setValueAtTime(spec[3], t); g.gain.exponentialRampToValueAtTime(0.0001, t + spec[1]);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + spec[1] + 0.02);
  } catch (e) {}
}

// ===== 그리기 (작업 1~7 은 도형. 작업 8 에서 도트 그림으로) =====
var cv = document.getElementById('game'), ctx = cv && cv.getContext ? cv.getContext('2d') : null;
var THEMES = {
  forest:  { sky: ['#8fd6ff', '#e3f6ff'], hill: '#7cc878', hill2: '#5aa85a', grass: '#62c24e', dirt: '#8a5a3b', dirt2: '#6f4730' },
  forest2: { sky: ['#9ccfee', '#f1f7e6'], hill: '#78b86e', hill2: '#4f9152', grass: '#58b347', dirt: '#86583a', dirt2: '#6a432c' },
  forest3: { sky: ['#ffc98f', '#ffeccf'], hill: '#8fb36a', hill2: '#5e8a4a', grass: '#6cb54a', dirt: '#8f5d3a', dirt2: '#6d452b' },
  forest4: { sky: ['#b39ddb', '#ffd8c2'], hill: '#7a9a6a', hill2: '#4f7350', grass: '#5ea84a', dirt: '#7d5236', dirt2: '#5e3d28' },
  temple:  { sky: ['#3a3a5c', '#8a7aa8'], hill: '#4b4b6b', hill2: '#36364f', grass: '#8a8fa8', dirt: '#5d5f78', dirt2: '#46485e' }
};
// ===== 도트 그림 (작업 8): 캐릭터 그림처럼 어두운 테두리와 명암이 있는 도트로, 작게 그린 뒤 2배로 키운다 =====
// 참고 (references.md): 밝은 숲 타일셋(쇼벨 나이트 평원, 소닉 매니아 그린 힐)의 색 배치 — 발판·배경·낙사 구간이 한눈에 갈리게
function lowres(w, h, fn, outline) {
  var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); fn(x);
  if (!outline) return c;
  var o = document.createElement('canvas'); o.width = w + 2; o.height = h + 2; var y = o.getContext('2d');
  [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(function (d) { y.drawImage(c, d[0], d[1]); });
  y.globalCompositeOperation = 'source-in'; y.fillStyle = outline; y.fillRect(0, 0, w + 2, h + 2);
  y.globalCompositeOperation = 'source-over'; y.drawImage(c, 1, 1); return o;
}
function rect(x, c, a, b, w, h) { x.fillStyle = c; x.fillRect(a, b, w, h); }
function rnd(seed) { var s = seed * 9301 + 49297; return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
var ART = null;
var PAL = {
  forest:  { top: '#62c94f', top2: '#9be36a', topD: '#2f7a2c', dirt: '#a06c44', dirtD: '#7d5233', dirtL: '#bd8a5c', stone: '#c9b89c', edge: '#3a2416', sky: ['#7fd0ff', '#d8f4ff'], far: '#a9dcc0', mid: '#5fae5a', midD: '#3f8a45', near: '#4a9a3f' },
  forest2: { top: '#5bbd47', top2: '#92dc62', topD: '#2b7029', dirt: '#9a6640', dirtD: '#774e30', dirtL: '#b78558', stone: '#c4b294', edge: '#382314', sky: ['#8fcbec', '#eef6dd'], far: '#b3d9b9', mid: '#5aa357', midD: '#3a8242', near: '#45913b' },
  forest3: { top: '#72bf4b', top2: '#a6df68', topD: '#3b7a2d', dirt: '#a46a42', dirtD: '#7f5032', dirtL: '#c08b5d', stone: '#cdb796', edge: '#3c2416', sky: ['#ffbf86', '#ffeacb'], far: '#d6c7a0', mid: '#7ea85a', midD: '#5a8545', near: '#5d9a43' },
  forest4: { top: '#64b04a', top2: '#98d865', topD: '#33682c', dirt: '#8f5d3b', dirtD: '#6c452c', dirtL: '#ad7a52', stone: '#bba98e', edge: '#33200f', sky: ['#a995d8', '#ffd3bf'], far: '#b9a9c9', mid: '#668f5f', midD: '#47704a', near: '#4f8243' },
  temple:  { top: '#5f7fa8', top2: '#a9c6ea', topD: '#2a3d5e', dirt: '#2e3f5f', dirtD: '#1d2a44', dirtL: '#4a6188', stone: '#6f8ab0', edge: '#0a1020', sky: ['#070d1f', '#18294a'], far: '#14223f', mid: '#0f1a33', midD: '#0a1326', near: '#0c162c', moss: '#3f7a8a' }   // 할로우 나이트처럼 깊은 남색 (사용자가 보인 화면)
};
// A broad, stepped crown shared by the woodland depth layers.
function woodlandCrown(x, cx, cy, w, h, color) {
  var outline = [[-50, 35], [-46, 4], [-35, -6], [-30, -25], [-14, -29],
    [-7, -47], [13, -48], [19, -34], [34, -32], [39, -14], [49, -6],
    [51, 23], [39, 37], [22, 35], [12, 47], [-14, 41], [-29, 49], [-42, 40]];
  x.fillStyle = color;
  x.beginPath();
  outline.forEach(function (point, i) {
    var px = Math.round(cx + point[0] * w / 100);
    var py = Math.round(cy + point[1] * h / 100);
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  });
  x.closePath();
  x.fill();
}
function buildWoodland() {
  var grove = [[24, 103, 90, 55], [97, 76, 110, 67], [182, 113, 102, 58],
    [260, 101, 78, 49], [308, 59, 113, 84], [395, 88, 124, 63],
    [482, 112, 105, 57], [558, 71, 118, 78]];
  return {
    far: lowres(600, 202, function (x) {
      for (var i = 0; i < 600; i += 2) {
        var rise = Math.sin(i * Math.PI / 150) * 13 + Math.sin(i * Math.PI / 60) * 6;
        rect(x, '#c8e5d4', i, 95 + (rise | 0), 2, 107 - (rise | 0));
      }
      var r = rnd(40);
      for (var j = 0; j < 28; j++) {
        var cx = j * 22 + r() * 14, cy = 84 + r() * 48, w = 32 + r() * 32, h = 22 + r() * 34;
        [-600, 0, 600].forEach(function (off) {
          woodlandCrown(x, cx + off, cy, w, h, '#b5d9c5');
          rect(x, '#b5d9c5', cx + off - 4, cy, 8, 202 - cy);
        });
      }
    }),
    mid: lowres(600, 172, function (x) {
      grove.forEach(function (tree) {
        var cx = tree[0], cy = tree[1], w = tree[2], h = tree[3];
        x.fillStyle = '#8aa797';
        x.beginPath();
        x.moveTo(cx - 9, 172); x.lineTo(cx - 3, cy + 22);
        x.lineTo(cx - 20, cy + 9); x.lineTo(cx - 17, cy + 5);
        x.lineTo(cx + 1, cy + 17); x.lineTo(cx + 15, cy + 1);
        x.lineTo(cx + 19, cy + 2); x.lineTo(cx + 6, cy + 26);
        x.lineTo(cx + 10, 172); x.fill();
        rect(x, '#a2b69c', cx - 4, cy + 28, 3, 144 - cy);
        [-600, 0, 600].forEach(function (off) {
          var px = cx + off;
          woodlandCrown(x, px, cy, w, h, '#78a28c');
          woodlandCrown(x, px + w * 0.21, cy + h * 0.07, w * 0.66, h * 0.73, '#86b497');
          woodlandCrown(x, px - w * 0.21, cy - h * 0.14, w * 0.61, h * 0.64, '#9bc3a0');
          woodlandCrown(x, px - w * 0.14, cy - h * 0.32, w * 0.32, h * 0.31, '#aed0a4');
        });
      });
      for (var i = 0; i < 600; i += 25) {
        var y = 161 + Math.sin(i * Math.PI / 75) * 5;
        [-600, 0, 600].forEach(function (off) {
          woodlandCrown(x, i + off, y, 55, 21, '#97bca0');
        });
      }
    }),
    edges: lowres(52, 90, function (x) {
      woodlandCrown(x, -7, 23, 108, 38, '#3e705b');
      woodlandCrown(x, 1, 10, 92, 29, '#507e62');
      woodlandCrown(x, 3, 38, 36, 37, '#376651');
      woodlandCrown(x, -7, 61, 42, 53, '#3e705b');
      woodlandCrown(x, 20, 13, 51, 19, '#638d6c');
    })
  };
}
function buildArt() {
  ART = { tiles: {}, bg: {} };
  ART.woodland = buildWoodland();
  Object.keys(PAL).forEach(function (k) {
    var p = PAL[k], temple = k === 'temple';
    function body(x, seed) {
      var r = rnd(seed);
      if (k === 'forest') {
        rect(x, '#9b704e', 0, 0, 16, 16);
        for (var f = 0; f < 4; f++) {
          var fx = r() * 14 | 0, fy = r() * 14 | 0, fw = 2 + (r() * 4 | 0);
          rect(x, '#8a6043', fx, fy, fw, 2);
          rect(x, '#8a6043', fx + 1, fy + 2, fw - 1, 1);
          rect(x, '#ac7e56', fx, fy - 1, fw - 1, 1);
        }
        var px = 2 + (r() * 8 | 0), py = 8 + (r() * 4 | 0);
        if (seed % 3 !== 0) {
          rect(x, '#72523d', px - 1, py + 1, 6, 3);
          rect(x, '#b49068', px, py, 4, 3);
          rect(x, '#c5aa80', px + 1, py, 3, 1);
        }
      } else if (temple) {  // 사원 돌벽: 벽돌과 줄눈
        rect(x, p.dirt, 0, 0, 16, 16); rect(x, p.dirtD, 0, 7, 16, 1); rect(x, p.dirtD, 0, 15, 16, 1);
        var o = seed % 2 ? 4 : 10; rect(x, p.dirtD, o, 0, 1, 7); rect(x, p.dirtD, (o + 8) % 16, 8, 1, 7);
        rect(x, p.dirtL, 1, 1, 3, 1); rect(x, p.dirtL, 9, 9, 3, 1);
        if (r() < 0.5) rect(x, p.dirtD, 3 + (r() * 8 | 0), 3 + (r() * 9 | 0), 2, 1);
      } else {       // 흙: 점과 돌
        rect(x, p.dirt, 0, 0, 16, 16);
        for (var i = 0; i < 7; i++) rect(x, p.dirtD, r() * 15 | 0, r() * 15 | 0, 2, 1);
        for (var j = 0; j < 3; j++) rect(x, p.dirtL, r() * 15 | 0, r() * 15 | 0, 1, 1);
        if (r() < 0.6) { var sx = 3 + (r() * 9 | 0), sy = 5 + (r() * 8 | 0); rect(x, p.dirtD, sx - 1, sy, 5, 3); rect(x, p.stone, sx, sy, 3, 2); rect(x, '#fff8', sx, sy, 1, 1); }
      }
    }
    var tops = [], fills = [];
    for (var v = 0; v < 3; v++) {
      fills.push(lowres(16, 16, (function (vv) { return function (x) { body(x, vv * 7 + 3); }; })(v)));
      tops.push(lowres(16, 16, (function (vv) { return function (x) {
        body(x, vv * 11 + 5); var r = rnd(vv + 1);
        if (k === 'forest') {
          rect(x, '#4f6840', 0, 1, 16, 5);
          rect(x, '#6b9c43', 0, 0, 16, 4);
          rect(x, '#9ec855', 0, 0, 16, 2);
          rect(x, '#d5ee99', 0, 0, 16, 1);
          rect(x, '#85ae4b', 1 + vv * 3, 2, 6, 2);
          rect(x, '#64833c', 3 + vv * 4, 4, 4, 2);
          rect(x, '#4f6840', 4 + vv * 4, 6, 2, 1);
          rect(x, '#c6e580', 2 + vv * 4, 1, 3, 1);
          return;
        }
        if (temple) { rect(x, p.top, 0, 0, 16, 3); rect(x, p.top2, 0, 0, 16, 1); rect(x, p.topD, 0, 3, 16, 1); if (vv !== 1) { rect(x, p.moss, 2 + vv * 4, 3, 4, 2); rect(x, p.moss, 3 + vv * 4, 5, 2, 2); } }
        else {
          rect(x, p.topD, 0, 4, 16, 2); rect(x, p.top, 0, 0, 16, 5); rect(x, p.top2, 0, 0, 16, 1);
          for (var i = 0; i < 4; i++) { var tx = r() * 14 | 0; rect(x, p.top, tx, 5, 2, 1 + (r() * 2 | 0)); }      // 늘어진 풀
          for (var j = 0; j < 3; j++) rect(x, p.top2, 1 + (r() * 13 | 0), 1 + (r() * 2 | 0), 1, 1);
          if (vv === 2) { rect(x, '#fff', 6, 1, 1, 1); rect(x, '#ffd84a', 5, 1, 1, 1); rect(x, '#ffd84a', 7, 1, 1, 1); rect(x, '#ffd84a', 6, 0, 1, 1); rect(x, '#ffd84a', 6, 2, 1, 1); } // 작은 꽃
        }
      }; })(v)));
    }
    var one = lowres(16, 7, function (x) {   // 위에서만 밟히는 나무 발판
      if (k === 'forest') {
        rect(x, '#925e3a', 0, 1, 16, 4);
        rect(x, '#d4a367', 0, 0, 16, 2);
        rect(x, '#f0cc8a', 1, 0, 14, 1);
        rect(x, '#af7547', 3, 2, 10, 1);
        rect(x, '#714a36', 0, 4, 16, 1);
        rect(x, '#714a36', 2, 2, 1, 2);
        rect(x, '#714a36', 13, 2, 1, 2);
        rect(x, '#aa784e', 6, 5, 4, 2);
        return;
      }
      rect(x, temple ? '#8a7a64' : '#c98d4b', 0, 0, 16, 5); rect(x, temple ? '#b5a588' : '#e7b070', 0, 0, 16, 1); rect(x, temple ? '#5e523f' : '#91602f', 0, 4, 16, 1);
      rect(x, temple ? '#5e523f' : '#a5703a', 5, 1, 4, 1); rect(x, temple ? '#5e523f' : '#a5703a', 11, 2, 3, 1); rect(x, '#3a2a1a', 2, 2, 1, 1); rect(x, '#3a2a1a', 13, 2, 1, 1);
      rect(x, temple ? '#5e523f' : '#91602f', 7, 5, 2, 2);
    }, p.edge);
    ART.tiles[k] = { tops: tops, fills: fills, one: one, edge: p.edge };
    // 배경: 먼 산(테두리 없음) · 가운데 나무 줄 · 가까운 덤불, 가로로 이어 붙인다
    ART.bg[k] = {
      far: lowres(240, 120, function (x) { var r = rnd(9); x.fillStyle = p.far; for (var i = 0; i < 240; i++) { var hgt = 40 + Math.sin(i / 22) * 18 + Math.sin(i / 9) * 6; x.fillRect(i, 120 - hgt, 1, hgt); } if (temple) { for (var c = 20; c < 240; c += 60) { rect(x, p.mid, c, 30, 12, 90); rect(x, p.far, c - 3, 26, 18, 6); } } }),
      mid: lowres(240, 110, function (x) {
        var r = rnd(4);
        if (temple) { for (var c = 10; c < 240; c += 48) { rect(x, p.midD, c, 20, 16, 90); rect(x, p.mid, c + 2, 20, 4, 90); rect(x, p.midD, c - 4, 14, 24, 8); rect(x, '#ffb347', c + 6, 46, 4, 5); rect(x, '#ffe08a', c + 7, 47, 2, 2); } return; }
        for (var t = 0; t < 240; t += 20) { var cx = t + (r() * 8 | 0), ch = 50 + (r() * 30 | 0);
          rect(x, '#5b3b24', cx + 8, 110 - 30, 4, 30);
          [-240, 0, 240].forEach(function (o) { x.fillStyle = p.midD; x.beginPath(); x.arc(cx + 10 + o, 110 - ch, 16, 0, 7); x.fill(); x.fillStyle = p.mid; x.beginPath(); x.arc(cx + 8 + o, 112 - ch, 12, 0, 7); x.fill(); rect(x, p.top2, cx + 4 + o, 104 - ch, 3, 2); }); }   // 양 끝을 넘는 나무도 그려 이어 붙인 곳이 안 잘리게
        rect(x, p.midD, 0, 96, 240, 14);
      }),
      near: lowres(240, 40, function (x) { var r = rnd(2); x.fillStyle = p.near; for (var t = 0; t < 240; t += 14) { x.beginPath(); x.arc(t + 7, 30, 9 + (r() * 5 | 0), 0, 7); x.fill(); } rect(x, p.near, 0, 30, 240, 10); }),
      cloud: lowres(48, 14, function (x) { rect(x, '#ffffffd0', 6, 6, 36, 6); rect(x, '#ffffffd0', 12, 2, 14, 6); rect(x, '#ffffffd0', 24, 0, 12, 8); rect(x, '#dfeffa', 6, 11, 36, 1); })
    };
  });
  // 땅 적: 보라 슬라임 (두 장: 보통, 눌림)
  ART.slime = [0, 1].map(function (f) { return lowres(15, 12, function (x) {
    var top = f ? 3 : 1;
    rect(x, '#7c45c9', 1, top + 2, 13, 11 - top - 2); rect(x, '#7c45c9', 3, top, 9, 3); rect(x, '#7c45c9', 0, top + 4, 15, 11 - top - 4);
    rect(x, '#5a2c9c', 1, 9, 13, 2); rect(x, '#b58bff', 3, top + 1, 4, 2); rect(x, '#d9c3ff', 4, top + 1, 1, 1);
    rect(x, '#fff', 4, top + 4, 3, 3); rect(x, '#fff', 9, top + 4, 3, 3); rect(x, '#1a1030', 5, top + 5, 2, 2); rect(x, '#1a1030', 10, top + 5, 2, 2);
  }, '#1f1235'); });
  // 공중 적: 분홍 박쥐 (두 장: 날개 위, 아래)
  ART.bat = [0, 1].map(function (f) { return lowres(19, 11, function (x) {
    var wy = f ? 5 : 1;
    x.fillStyle = '#7a2f55'; x.beginPath(); x.moveTo(6, 5); x.lineTo(0, wy); x.lineTo(2, 8); x.lineTo(6, 7); x.fill(); x.beginPath(); x.moveTo(13, 5); x.lineTo(19, wy); x.lineTo(17, 8); x.lineTo(13, 7); x.fill();
    rect(x, '#d0577e', 6, 3, 7, 7); rect(x, '#f29ab8', 7, 3, 3, 2); rect(x, '#d0577e', 6, 1, 2, 2); rect(x, '#d0577e', 11, 1, 2, 2);
    rect(x, '#fff', 7, 5, 2, 2); rect(x, '#fff', 10, 5, 2, 2); rect(x, '#1a1030', 8, 6, 1, 1); rect(x, '#1a1030', 11, 6, 1, 1); rect(x, '#fff', 9, 8, 1, 1);
  }, '#2a1020'); });
  // 골인 문: 돌 테두리와 나무 문
  ART.door = lowres(18, 32, function (x) {
    rect(x, '#8a8fa8', 0, 4, 18, 28); rect(x, '#8a8fa8', 3, 0, 12, 6); rect(x, '#b9bdd0', 1, 5, 16, 1); rect(x, '#5d607a', 0, 31, 18, 1);
    rect(x, '#7a4a26', 3, 6, 12, 26); rect(x, '#7a4a26', 5, 3, 8, 4); rect(x, '#9a6236', 4, 7, 4, 24); rect(x, '#5a3418', 9, 6, 1, 26);
    rect(x, '#3a2414', 3, 14, 12, 1); rect(x, '#3a2414', 3, 24, 12, 1); rect(x, '#ffd24a', 11, 18, 2, 2); rect(x, '#fff6c8', 11, 18, 1, 1);
  }, '#1f1a2a');
  // 숨겨진 보물: 작은 상자
  ART.chest = lowres(12, 10, function (x) {
    rect(x, '#9a5a2a', 0, 3, 12, 7); rect(x, '#c27838', 0, 0, 12, 4); rect(x, '#e8a04e', 1, 0, 10, 1); rect(x, '#ffd24a', 0, 3, 12, 1); rect(x, '#ffd24a', 5, 2, 2, 4); rect(x, '#fff3b0', 5, 3, 1, 1); rect(x, '#6a3a1a', 0, 9, 12, 1);
  }, '#2a1608');
  ART.woodlandChest = lowres(16, 13, function (x) {
    rect(x, '#714634', 1, 5, 14, 7);
    rect(x, '#9d643d', 2, 6, 11, 5);
    rect(x, '#c58b4a', 2, 2, 12, 4);
    rect(x, '#e7b778', 4, 1, 8, 2);
    rect(x, '#935b39', 3, 4, 11, 1);
    rect(x, '#e4b161', 1, 6, 14, 1);
    rect(x, '#edcb7b', 7, 5, 3, 4);
    rect(x, '#745537', 8, 7, 1, 1);
    rect(x, '#b58149', 2, 7, 2, 4);
  }, '#463329');
  // 충격파 돌
  ART.rock = lowres(10, 9, function (x) { rect(x, '#8b7d6b', 1, 2, 8, 7); rect(x, '#8b7d6b', 3, 0, 4, 3); rect(x, '#b5a68e', 3, 1, 2, 2); rect(x, '#5e5446', 1, 7, 8, 2); }, '#2a221a');
}
// 보스 그림: 게임 2 의 사용자 그림 골렘 (assets/golem.png, 원래 왼쪽을 봄). 예고·빈틈 색은 같은 그림에 색을 입혀 만든다
// 그림 불러오기를 세어, 다 온 뒤에 시작 버튼이 눌리게 한다 (QA 뒤 사용자 "다 불러온 뒤 시작": 느린 링크에서 도중에 그림이 바뀌지 않게). 10초가 지나면 그냥 시작할 수 있다
var LOAD = { total: 0, done: 0, t0: Date.now() };
function newImg() { var im = new Image(), fin = false; LOAD.total++; function f() { if (!fin) { fin = true; LOAD.done++; } } im.addEventListener('load', f); im.addEventListener('error', f); return im; }
function loadReady() { return LOAD.done >= LOAD.total || Date.now() - LOAD.t0 > 10000; }
// 2026-11-24 사용자 시안 시트 ④ 의 골렘 둘(서 있기 ref/golem.png, 공격 ref/golem-atk.png)로 바꿈. 시안을 못 불러오면 게임 2 골렘
var GOLEM = { img: null, tint: {}, atk: null, atkTint: {} };
(function () {
  if ((TEST && !window.G3_SHOT) || typeof Image === 'undefined') return;
  var base = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
  function tints(im, out) {
    ['#ffb347', '#ff5a4a', '#7ab8ff', '#ffffff'].forEach(function (col) {
      var c = document.createElement('canvas'); c.width = im.width; c.height = im.height; var x = c.getContext('2d');
      x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.globalAlpha = 0.3; x.fillRect(0, 0, c.width, c.height); out[col] = c;
    });
  }
  var old = newImg(); old.onload = function () { if (!GOLEM.ref) { GOLEM.img = old; GOLEM.tint = {}; tints(old, GOLEM.tint); } }; old.src = base + 'assets/golem.png';
  var gi = newImg(); gi.onload = function () { GOLEM.ref = true; GOLEM.img = gi; GOLEM.tint = {}; tints(gi, GOLEM.tint); }; gi.src = base + 'assets/ref/golem.png';
  var ga = newImg(); ga.onload = function () { GOLEM.atk = ga; tints(ga, GOLEM.atkTint); }; ga.src = base + 'assets/ref/golem-atk.png';
})();
function drawBackground(th, cam) {
  var k = G.lv.theme, bg = ART.bg[k], p = PAL[k];
  function layer(img, f, y, sc) { var w = img.width * sc, off = -((cam * f) % w); for (var x = off - w; x < W + w; x += w) ctx.drawImage(img, Math.floor(x), y, w, img.height * sc); }
  if (BGIMG[k]) {   // 사용자 배경 그림 한 장: 화면보다 조금 크게 놓고 스테이지를 가는 만큼 천천히 옆으로 (먼 배경처럼)
    var im = BGIMG[k], bh = 600, bw = im.width * bh / im.height, span = Math.max(1, G.lv.pxW - W);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, Math.round(-(bw - W) * Math.min(1, cam / span)), H - bh + 20, bw, bh);
    ctx.fillStyle = 'rgba(225,242,236,0.22)'; ctx.fillRect(0, 0, W, H);   // 옅은 안개 한 겹: 배경을 뒤로 물려 캐릭터·적·발판이 먼저 보이게
    ctx.imageSmoothingEnabled = true;
    return;
  }
  var strip = REF[REF_BG[k]];
  if (strip) {   // 시안의 스테이지 배경 띠: 크게 늘려 흐린 먼 배경으로. 띠 위·아래는 맨 끝 줄을 늘려 하늘과 땅을 잇는다. 이음매는 한 장씩 뒤집어 감춘다
    var sh = 360, sw = strip.width * sh / strip.height, top = k === 'temple' ? 70 : 110, off = -((cam * 0.25) % (sw * 2));
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    for (var bx = off - sw * 2; bx < W + sw; bx += sw) {
      var flip = Math.round((bx - off) / sw) % 2 !== 0;
      ctx.save(); ctx.translate(Math.round(bx) + (flip ? sw : 0), 0); if (flip) ctx.scale(-1, 1);
      ctx.save(); ctx.translate(0, top + 1); ctx.scale(1, -1); ctx.drawImage(strip, 0, 3, strip.width, strip.height - 6, 0, 0, sw + 1, sh); ctx.restore();   // 위: 띠를 거울처럼 뒤집어 이음 (경계가 이어짐)
      ctx.drawImage(strip, 0, 3, strip.width, strip.height - 6, 0, top, sw + 1, sh);         // 띠 (맨 끝 줄의 테두리는 뺌)
      ctx.save(); ctx.translate(0, top + sh - 1); ctx.scale(1, -1); ctx.drawImage(strip, 0, 3, strip.width, strip.height - 6, 0, -sh, sw + 1, sh); ctx.restore();   // 아래도 뒤집어 이음
      ctx.restore();
    }
    ctx.fillStyle = k === 'temple' ? 'rgba(10,20,50,0.4)' : 'rgba(215,232,228,0.4)'; ctx.fillRect(0, 0, W, H);   // 뒤로 물리기 (QA: 배경 아치가 문처럼 보임 → 0.22 에서 0.4)
    ctx.imageSmoothingEnabled = true;
    if (k === 'temple') drawLamps(cam, 0.45, 1);
    return;
  }
  if (k === 'forest') {
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#9fd6e6');
    sky.addColorStop(0.65, '#e2f2dc');
    sky.addColorStop(1, '#f5f3d7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    glow(W * 0.37, 90, 420, 'rgba(255,248,206,', 0.8);
    ctx.imageSmoothingEnabled = true;
    layer(ART.woodland.far, 0.16, 140, 2);
    layer(ART.woodland.mid, 0.32, 200, 2);
    var haze = ctx.createLinearGradient(0, 278, 0, 468);
    haze.addColorStop(0, 'rgba(236,247,218,0)');
    haze.addColorStop(1, 'rgba(236,247,218,0.45)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 278, W, 190);
    ctx.save();
    ctx.drawImage(ART.woodland.edges, 0, 86, 104, 180);
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(ART.woodland.edges, 0, 70, 84, 146);
    ctx.restore();
    return;
  }
  var gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, p.sky[0]); gr.addColorStop(1, p.sky[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  if (k !== 'temple') for (var i = 0; i < 4; i++) { var cx = ((i * 330 - cam * 0.08 + G.time * 6) % 1320 + 1320) % 1320 - 180; ctx.drawImage(bg.cloud, cx, 40 + i * 37 % 90, 96, 28); }
  layer(bg.far, 0.15, 190, 2);
  if (k !== 'temple') { var hz = ctx.createLinearGradient(0, 280, 0, 420); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, 'rgba(235,250,255,0.55)'); ctx.fillStyle = hz; ctx.fillRect(0, 280, W, 140); }   // 먼 곳은 옅게 (공기 원근)
  else drawLamps(cam, 0.25, 0.5);
  layer(bg.mid, 0.35, 250, 2);
  if (k === 'temple') drawLamps(cam, 0.45, 1);
  layer(bg.near, 0.55, 410, 2);
  var fogc = k === 'temple' ? 'rgba(90,130,200,' : 'rgba(255,255,255,'; var fog = ctx.createLinearGradient(0, 380, 0, 470); fog.addColorStop(0, fogc + '0)'); fog.addColorStop(1, fogc + (k === 'temple' ? '0.22)' : '0.28)')); ctx.fillStyle = fog; ctx.fillRect(0, 380, W, 90);   // 땅 가까이 안개
}
// ===== 빛과 깊이 (사용자가 보인 할로우 나이트·메트로이드 드레드 화면에서 가져올 수 있는 것) =====
function glow(x, y, r, col, a) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
function drawLamps(cam, f, sc) {   // 사원 뒤쪽 등불: 빛 번짐 + 매달린 등
  var step = 220 * sc, off = -((cam * f) % step);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (var x = off - step; x < W + step; x += step) {
    var lx = x + step * 0.5, ly = 150 + sc * 60 + Math.sin((x + cam * f) * 0.01) * 20, fl = 0.85 + Math.sin(G.time * 3 + x) * 0.1;
    glow(lx, ly, 90 * sc, 'rgba(120,170,255,', 0.22 * fl * sc); glow(lx, ly, 26 * sc, 'rgba(220,240,255,', 0.7 * fl);
  }
  ctx.restore();
  for (var x2 = off - step; x2 < W + step; x2 += step) {
    var lx2 = x2 + step * 0.5, ly2 = 150 + sc * 60 + Math.sin((x2 + cam * f) * 0.01) * 20;
    ctx.fillStyle = sc < 1 ? '#1a2a4a' : '#0c1428'; ctx.fillRect(lx2 - 1, 0, 2 * sc, ly2 - 8 * sc);
    ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.ellipse(lx2, ly2, 5 * sc, 9 * sc, 0, 0, 7); ctx.fill();
  }
}
var AMB = null;
function drawLighting(cam) {
  var k = G.lv.theme, temple = k === 'temple';
  if (!AMB) { AMB = []; var r = rnd(17); for (var i = 0; i < 70; i++) AMB.push({ x: r() * 1400, y: r() * H, z: 0.4 + r() * 1.2, s: 1 + (r() * 3 | 0), ph: r() * 6 }); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (!temple && k !== 'forest') {
    glow(W - 120, -40, 420, 'rgba(255,240,190,', 0.35);                       // 해 빛
    for (var b = 0; b < 4; b++) {                                              // 빛줄기
      var bx = ((b * 300 - cam * 0.1) % 1200 + 1200) % 1200 - 120, a = 0.05 + Math.sin(G.time * 0.7 + b) * 0.025;
      var lg = ctx.createLinearGradient(bx, 0, bx - 160, H); lg.addColorStop(0, 'rgba(255,245,200,' + a * 2 + ')'); lg.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 70, 0); ctx.lineTo(bx - 90, H); ctx.lineTo(bx - 200, H); ctx.fill();
    }
  } else if (temple) {
    var bs = boss(); if (bs && bs.state !== 'sleep') glow(W / 2, -60, 520, 'rgba(110,150,255,', 0.25);
    for (var c = 0; c < 3; c++) { var cx = ((c * 420 - cam * 0.2) % 1260 + 1260) % 1260 - 150; var lg2 = ctx.createLinearGradient(cx, 0, cx + 80, H); lg2.addColorStop(0, 'rgba(150,190,255,0.12)'); lg2.addColorStop(1, 'rgba(150,190,255,0)'); ctx.fillStyle = lg2; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx + 60, 0); ctx.lineTo(cx + 180, H); ctx.lineTo(cx + 90, H); ctx.fill(); }
  }
  // 떠다니는 빛 알갱이 (숲: 꽃가루, 사원: 빛나는 먼지)
  AMB.forEach(function (p) {
    var x = ((p.x - cam * p.z * 0.6 + Math.sin(G.time * 0.6 + p.ph) * 20) % 1400 + 1400) % 1400 - 200, y = ((p.y - G.time * 12 * p.z) % H + H) % H;
    var tw = 0.5 + Math.sin(G.time * 2 + p.ph * 3) * 0.5;
    ctx.fillStyle = temple ? 'rgba(170,210,255,' + (0.35 + tw * 0.5) + ')' : 'rgba(255,250,200,' + (0.25 + tw * 0.4) + ')';
    ctx.fillRect(x, y, p.s, p.s); if (temple && p.s > 2) glow(x + 1, y + 1, 8, 'rgba(150,200,255,', 0.25 * tw);
  });
  // (캐릭터 둘레 빛은 2026-11-24 사용자 "푸른색 빛 없애자"로 뺌)
  ctx.restore();
  if (k === 'forest') return;
  // 비네트: 가장자리를 어둡게
  var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, temple ? 'rgba(0,4,16,0.75)' : 'rgba(20,30,10,0.35)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
var FG = null;
function drawForeground(cam) {   // 앞쪽 어두운 실루엣 (가지·잎, 사원은 사슬과 기둥 조각): 깊이를 준다
  if (G.lv.theme === 'forest') return;
  var temple = G.lv.theme === 'temple';
  if (!temple && REF.vine && REF.leaves) {   // 숲 (1-2~1-4) 앞쪽 윗부분: 시안의 잎 덤불을 뒤집어 매달고 덩굴을 늘어뜨림 (2026-11-24 사용자 "덩쿨 배경도 그래픽 업데이트가 되어있지 않아")
    var lv = REF.leaves, vn = REF.vine, step = 300, off = -((cam * 1.3) % step);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.filter = 'brightness(0.5) saturate(0.85)';
    for (var fx = off - step; fx < W + step; fx += step) {
      var k = Math.abs(Math.round((fx - off) / step + Math.floor(cam * 1.3 / step))) % 3;
      [[18, 70 + k * 30], [150, 110 - k * 20], [236, 50 + k * 25]].forEach(function (v) { ctx.drawImage(vn, 0, 0, vn.width, Math.min(vn.height, v[1]), fx + v[0], 0, vn.width * 1.5, Math.min(vn.height, v[1]) * 1.5); });
      ctx.save(); ctx.translate(fx + 10, 52); ctx.scale(1.7, -1.1); ctx.drawImage(lv, 0, 0, lv.width, 44, 0, 0, lv.width, 44); ctx.restore();
      ctx.save(); ctx.translate(fx + 175, 40); ctx.scale(-1.4, -0.9); ctx.drawImage(lv, 0, 0, lv.width, 44, 0, 0, lv.width, 44); ctx.restore();
    }
    ctx.restore();
    return;
  }
  if (!FG) {
    FG = { forest: lowres(320, 60, function (x) { var r = rnd(5); x.fillStyle = '#0f2a14';
      for (var i = 0; i < 320; i += 26) { var h = 10 + (r() * 30 | 0); x.beginPath(); x.ellipse(i + 12, 0, 22, h, 0, 0, 7); x.fill(); for (var j = 0; j < 4; j++) { x.fillRect(i + (r() * 24 | 0), h - 4 + (r() * 10 | 0), 2, 6 + (r() * 10 | 0)); } } }),
      grass: lowres(160, 20, function (x) { var r = rnd(8); x.fillStyle = '#10301a'; for (var i = 0; i < 160; i += 3) { var h = 6 + (r() * 14 | 0); x.fillRect(i, 20 - h, 2, h); } }),
      temple: lowres(320, 70, function (x) { x.fillStyle = '#03070f'; for (var i = 10; i < 320; i += 110) { x.fillRect(i, 0, 2, 40 + (i % 3) * 10); for (var j = 0; j < 6; j++) x.fillRect(i - 2, 6 + j * 7, 6, 4); } x.fillRect(240, 0, 40, 70); x.fillRect(232, 0, 56, 8); }) };
  }
  ctx.imageSmoothingEnabled = true;
  function band(img, f, y, sc) { var w = img.width * sc, off = -((cam * f) % w); for (var x = off - w; x < W + w; x += w) ctx.drawImage(img, Math.floor(x), y, w, img.height * sc); }
  ctx.globalAlpha = 0.92;
  if (temple) band(FG.temple, 1.35, 0, 2);
  else { band(FG.forest, 1.3, -34, 2); band(FG.grass, 1.5, H - 30, 2); }
  ctx.globalAlpha = 1;
}
// 타일 무늬: 시안 타일 그림의 가운데를 좌우(속은 위아래도) 뒤집어 붙여 이음매 없이 되풀이 (0.8배)
var TPAT = {};
function tilePats(temple) {
  var k = temple ? 'stone' : 'grass', img = REF[temple ? 'tile-stone' : 'tile-grass']; if (!img) return null;
  if (TPAT[k]) return TPAT[k];
  function mk(sx, sy, sw, sh, mirY) {
    var cv = document.createElement('canvas'); cv.width = sw * 2; cv.height = mirY ? sh * 2 : sh; var x = cv.getContext('2d');
    x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); x.save(); x.translate(sw * 2, 0); x.scale(-1, 1); x.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh); x.restore();
    if (mirY) { x.save(); x.translate(0, sh * 2); x.scale(1, -1); x.drawImage(cv, 0, 0, sw * 2, sh, 0, 0, sw * 2, sh); x.restore(); }
    return cv;
  }
  var topC = temple ? mk(6, 4, 100, 26, false) : mk(8, 8, 132, 24, false), fillC = temple ? mk(6, 30, 100, 52, false) : mk(8, 34, 132, 28, false);   // 속은 위아래로 뒤집지 않고 돌 줄 경계에서 잘라 되풀이 (뒤집으면 대칭 무늬가 눈에 띔)
  var fill = ctx.createPattern(fillC, 'repeat'); fill.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, 0]));
  TPAT[k] = { top: ctx.createPattern(topC, 'repeat-x'), fill: fill, topH: Math.round(topC.height * 0.8) };
  return TPAT[k];
}
function drawTiles(cam) {
  var T = ART.tiles[G.lv.theme], g = G.lv.g;
  ctx.imageSmoothingEnabled = true;
  var c0 = Math.max(0, Math.floor(cam / TS) - 1), c1 = Math.min(G.lv.w - 1, Math.floor((cam + W) / TS) + 1);
  for (var r = 0; r < ROWS; r++) for (var c = c0; c <= c1; c++) {
    var t = g[r][c], x = c * TS, y = r * TS, h = (c * 7 + r * 13) % 3;
    if (G.lv.theme === 'forest') h = ((c * 37 ^ r * 53 ^ (c >> 2)) >>> 0) % 3;
    var tp = tilePats(G.lv.theme === 'temple');
    if (t === '#' && tp) {   // 시안 타일을 이음매 없는 무늬로 (2026-11-24 사용자 "울타리가 두 겹", "잘라 붙인 듯한 검정 선"): 칸마다 잘라 붙이지 않고 이어진 흙(돌) 무늬, 윗면은 풀(이끼) 띠 한 겹
      var top2 = r === 0 || g[r - 1][c] !== '#';
      ctx.fillStyle = tp.fill; ctx.fillRect(x, y, TS, TS);
      if (top2) { tp.top.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, y - 5])); ctx.fillStyle = tp.top; ctx.fillRect(x, y - 5, TS, tp.topH); }
      ctx.fillStyle = 'rgba(20,14,10,0.55)';
      if (c > 0 && g[r][c - 1] !== '#') ctx.fillRect(x, y + (top2 ? 10 : 0), 2, TS - (top2 ? 10 : 0));
      if (c < G.lv.w - 1 && g[r][c + 1] !== '#') ctx.fillRect(x + TS - 2, y + (top2 ? 10 : 0), 2, TS - (top2 ? 10 : 0));
      if (r < ROWS - 1 && g[r + 1][c] !== '#') ctx.fillRect(x, y + TS - 2, TS, 2);
      var d2 = 0; while (d2 < 6 && r - d2 - 1 >= 0 && g[r - d2 - 1][c] === '#') d2++;
      if (d2 > 1) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.45, (d2 - 1) * 0.09) + ')'; ctx.fillRect(x, y, TS, TS); }
      continue;
    }
    if (t === '=' && tp) {   // 위에서만 밟히는 발판: 같은 무늬의 얇은 땅 (풀 띠 + 얇은 흙)
      ctx.fillStyle = tp.fill; ctx.fillRect(x, y + 4, TS, 10);
      ctx.fillStyle = 'rgba(20,14,10,0.5)'; ctx.fillRect(x, y + 12, TS, 2);
      tp.top.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, y - 5])); ctx.fillStyle = tp.top; ctx.fillRect(x, y - 5, TS, tp.topH);
      continue;
    }
    if (t === '#') {
      var top = r === 0 || g[r - 1][c] !== '#';
      ctx.drawImage(top ? T.tops[h] : T.fills[h], x, y, TS, TS);
      ctx.fillStyle = T.edge;                                                // 드러난 옆면에 어두운 테두리
      if (c > 0 && g[r][c - 1] !== '#') ctx.fillRect(x, y, 2, TS);
      if (c < G.lv.w - 1 && g[r][c + 1] !== '#') ctx.fillRect(x + TS - 2, y, 2, TS);
      if (r < ROWS - 1 && g[r + 1][c] !== '#') ctx.fillRect(x, y + TS - 2, TS, 2);
      if (top) ctx.fillRect(x, y - 2, TS, 2);
      var depth = 0; while (depth < 6 && r - depth - 1 >= 0 && g[r - depth - 1][c] === '#') depth++;                // 깊을수록 어둡게 (부피)
      if (depth > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.55, depth * 0.11) + ')'; ctx.fillRect(x, y, TS, TS); }
      if (top) { ctx.fillStyle = G.lv.theme === 'temple' ? 'rgba(170,210,255,0.35)' : 'rgba(255,255,220,0.25)'; ctx.fillRect(x, y, TS, 2); }   // 윗면 테두리 빛
      if (G.lv.theme === 'forest') {
        if (c > 0 && g[r][c - 1] !== '#') {
          rect(ctx, '#bd9066', x + 2, y + (top ? 10 : 0), 2, TS - (top ? 10 : 0));
          if (top) rect(ctx, '#8bb550', x + 2, y + 2, 4, 8);
        }
        if (c < G.lv.w - 1 && g[r][c + 1] !== '#') {
          rect(ctx, '#72523c', x + TS - 4, y + (top ? 10 : 0), 2, TS - (top ? 10 : 0));
          if (top) rect(ctx, '#54783e', x + TS - 6, y + 4, 4, 6);
        }
      }
    } else if (t === '=') {
      if (G.lv.theme === 'forest') ctx.drawImage(T.one, x, y, TS, 14);
      else ctx.drawImage(T.one, x - 1, y - 1, TS + 2, 16);
    }
  }
}
// 땅 위 장식 (시안의 덤불·버섯·바위·묘목·울타리, 사원 쪽은 기둥·깃발·등불). 부딪히지 않는 그림일 뿐이고, 칸마다 정해진 자리에 놓는다
// QA 뒤 바위(보스가 굴리는 바위와 같은 그림)와 울타리(벽처럼 보임)는 뺌. 남은 장식은 조금 어둡게 그려 배경 쪽으로 물린다
var PROPS = { forest: [['bush', 50], ['mushroom', 24], ['sapling', 28]],
  temple: [['pillars', 74], ['banner', 30], ['lamp', 34]] };
function drawProps() {
  if (!REF.bush) return;
  var g = G.lv.g, cam = G.cam, c0 = Math.max(1, Math.floor(cam / TS) - 3), c1 = Math.min(G.lv.w - 2, Math.floor((cam + W) / TS) + 3);
  var set = G.lv.theme === 'temple' ? PROPS.temple : G.lv.theme === 'forest4' ? PROPS.forest.concat(PROPS.temple.slice(0, 3)) : PROPS.forest;
  var dc = G.lv.door ? G.lv.door.c : -99;
  ctx.imageSmoothingEnabled = true;
  for (var c = c0; c <= c1; c++) {
    var hsh = ((c * 2654435761) >>> 0) % 97; if (hsh % 6 !== 0 || Math.abs(c - dc) < 3) continue;
    for (var r = 2; r < ROWS; r++) {
      if (g[r][c] !== '#' || g[r - 1][c] === '#' || g[r - 2][c] === '#') continue;
      if (g[r][c - 1] !== '#' || g[r][c + 1] !== '#') break;   // 가장자리는 비운다 (발 디딜 곳이 잘 보이게)
      var pr = set[(hsh / 6 | 0) % set.length], im = REF[pr[0]]; if (!im) break;
      var tall = pr[0] === 'banner' || pr[0] === 'lamp', dw = pr[1], dh = tall ? dw * im.height / im.width : im.height / im.width * dw;
      ctx.filter = 'brightness(0.72) saturate(0.8)'; ctx.drawImage(im, c * TS + TS / 2 - dw / 2, r * TS - dh + 3, dw, dh); ctx.filter = 'none';
      break;
    }
  }
}
// 오필리아 얼음 (2026-11-24 사용자 "얼음 기둥만 혼자 톤앤매너에 맞지 않아"): 캐릭터 시안의 얼음 수정(blue-sp2)으로 기둥을 세우고, 얼음 길은 같은 빛깔의 수정 판으로
function drawIceSeg(s) {
  var cr = CH2.fr[1].sp2;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  if (s.pillar) {   // 얼음 기둥 (2026-11-24 사용자 "뾰족한 얼음 형태인데, 딛고 설 수 있는 느낌이 나지 않아"): 위가 평평한 얼음 덩어리 기둥, 윗면은 서리 낀 넓은 판, 밑동에 작은 수정
    var ph = Math.max(6, s.y0 - s.y), x0 = s.x + 2, w0 = s.w - 4;
    var bg = ctx.createLinearGradient(x0, 0, x0 + w0, 0); bg.addColorStop(0, '#3f8fc4'); bg.addColorStop(0.35, '#a9e6fb'); bg.addColorStop(0.6, '#7cc8ec'); bg.addColorStop(1, '#2f6f99');
    ctx.fillStyle = 'rgba(16,50,80,0.9)'; ctx.fillRect(x0 - 1, s.y, w0 + 2, ph + 1);                 // 테두리
    ctx.fillStyle = bg; ctx.fillRect(x0, s.y, w0, ph);                                                // 몸통
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (var fy = s.y + 10; fy < s.y + ph - 4; fy += 14) { ctx.beginPath(); ctx.moveTo(x0 + 3, fy + 8); ctx.lineTo(x0 + w0 * 0.55, fy); ctx.lineTo(x0 + w0 * 0.55, fy + 3); ctx.lineTo(x0 + 3, fy + 11); ctx.fill(); }   // 비스듬한 결
    ctx.fillStyle = 'rgba(20,60,95,0.35)'; for (var fy2 = s.y + 18; fy2 < s.y + ph - 2; fy2 += 14) ctx.fillRect(x0, fy2, w0, 1);   // 얼음 층
    var cw = s.w + 8, cx0 = s.x + s.w / 2 - cw / 2;                                                    // 윗면: 기둥보다 넓은 평평한 판
    ctx.fillStyle = 'rgba(16,50,80,0.95)'; ctx.fillRect(cx0 - 1, s.y - 3, cw + 2, 10);
    var tg = ctx.createLinearGradient(0, s.y - 2, 0, s.y + 7); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.5, '#dff6ff'); tg.addColorStop(1, '#8fd2ef');
    ctx.fillStyle = tg; ctx.fillRect(cx0, s.y - 2, cw, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(cx0 + 2, s.y - 2, cw - 4, 2);
    if (REF['fx-ice']) { ctx.globalAlpha = 0.9; ctx.drawImage(REF['fx-ice'], s.x - 10, s.y0 - 14, s.w + 20, 16); ctx.globalAlpha = 1; }   // 밑동 수정
    ctx.restore(); return;
  }
  var g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);   // 밟는 판 (얼음 길 한 칸, 기둥 윗면)
  g.addColorStop(0, '#f2fdff'); g.addColorStop(0.45, '#9fe2fb'); g.addColorStop(1, '#4aa6d8');
  if (s.pillar) { ctx.fillStyle = 'rgba(20,70,110,0.85)'; ctx.fillRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2); }   // 얼음 길은 칸 테두리 없이 이어지게
  else if (REF['fx-ice'] && Math.round(s.x / 8) % 3 === 0) { ctx.globalAlpha = 0.85; ctx.drawImage(REF['fx-ice'], s.x - 4, s.y + s.h - 2, s.w + 8, 12); ctx.globalAlpha = 1; }   // 아래로 작은 수정
  ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(s.x, s.y, s.w, 1.5); if (!s.pillar) { ctx.fillStyle = 'rgba(30,90,140,0.7)'; ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1); }
  var sp = Math.floor((s.x * 7 + G.time * 3) % 5); if (sp === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x + s.w * 0.6, s.y + 1, 2, 2); }   // 반짝임
  ctx.restore();
}
// ===== 문과 보스 보상 (2026-11-24 사용자) =====
// 모든 스테이지: 골인 문 앞에서 ↑ 를 누르면 문이 열리고 빛이 새어 나온 뒤 클리어. ↑ 표시는 1-1 에서만
// 1-5: 보스를 쓰러뜨리면 보스 뒤 벽이 열리고 빛나는 상자가 떨어진다. ↑ 로 열면 '생명의 잔' (최대 체력 +1, 체력 +1).
//      열린 벽 너머 월드 클리어 문에서 ↑ 를 누르면 생명의 잔 넷이 문에 끼워지고 문이 열리며 빛이 새어 나온 뒤 게임 클리어
var DOOR = { normalT: 1.2, cupT: 0.32, bossOpenT: 0.7, bossLightT: 0.6, near: 28 };
function doorDur() { return G.lv.boss ? DOOR.cupT * 4 + DOOR.bossOpenT + DOOR.bossLightT : DOOR.normalT; }
function nearDoor() { var d = G.door; return d && Math.abs(P.x + P.w / 2 - (d.x + d.w / 2)) < DOOR.near && P.y + P.h > d.y && P.y < d.y + d.h + 4; }
function interact() {   // ↑: 가까운 상자를 열거나 문을 연다
  if (G.doorAnim || G.mode !== 'play') return;
  var ch = G.items.filter(function (it) { return it.type === 'C' && !it.opening && overlap(P, { x: it.x - 12, y: it.y - 20, w: it.w + 24, h: it.h + 24 }); })[0];
  if (ch) {
    ch.opening = 0.001; G.hpMax = CFG.hp + 1; G.hp = G.hpMax; G.relicPop = { t: 0 }; G.heartNew = 1.5;   // 2026-11-24 사용자 "획득한 만큼 체력이 차야": 늘어난 칸까지 가득
    G.flash = 0.2; G.shake = 0.2; burst(ch.x + ch.w / 2, ch.y, '#ffe08a', 24); sfx('treasure'); return;
  }
  if (nearDoor()) { G.doorAnim = { t: 0, cups: G.lv.boss ? 4 : 0, fx: P.x + P.w / 2, fy: P.y + P.h / 2 }; P.vx = 0; P.skill = null; sfx('clear'); }
}
function openBossWall(b) {   // 보스 뒤 벽 (열 78) 을 땅 위만 열어 지나갈 수 있게
  var c = Math.floor(b.arenaR / TS); for (var r = 0; r < ROWS; r++) if (G.lv.g[r][c] === '#' && G.lv.g[r][c - 1] !== '#') { G.lv.g[r][c] = ' '; if (r > 7) burst(c * TS + TS / 2, r * TS + TS / 2, '#b9a58a', 4); }   // 옆 칸이 빈 높이만 (바닥은 남김)
  G.wallOpen = true; G.shake = Math.max(G.shake, 0.4);
}
// 도트로 그리기: 고해상도 그림을 px 픽셀 한 칸 크기로 줄였다가(작은 캔버스에 미리 그려 둠) 부드럽게 하지 않고 키워 그림 (2026-11-24 사용자 "톤앤매너에 맞게")
function drawPix(img, x, y, w, h, px) {
  if (!img) return; w = Math.round(w); h = Math.round(h); if (w < 1 || h < 1) return;
  var key = w + 'x' + h + '@' + px, pc = img._pix || (img._pix = {}), c = pc[key];
  if (!c) { c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w / px)); c.height = Math.max(1, Math.round(h / px)); var cx2 = c.getContext('2d'); cx2.imageSmoothingEnabled = true; cx2.imageSmoothingQuality = 'high'; cx2.drawImage(img, 0, 0, c.width, c.height); pc[key] = c; }
  var sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(c, Math.round(x), Math.round(y), w, h); ctx.imageSmoothingEnabled = sm;
}
function tinted(img, col) {   // 그림 위에 장소의 빛 색을 얇게 덮은 사본 (문이 배경 조명 안에 있어 보이게). 한 번 만들어 둠
  var tc = img._tint || (img._tint = {}); if (tc[col]) return tc[col];
  var c = document.createElement('canvas'); c.width = img.width; c.height = img.height; var x = c.getContext('2d');
  x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return (tc[col] = c);
}
function doorShadow(cx, by, w) { var g = ctx.createRadialGradient(cx, by, 2, cx, by, w); g.addColorStop(0, 'rgba(10,12,20,0.45)'); g.addColorStop(1, 'rgba(10,12,20,0)'); ctx.save(); ctx.translate(cx, by); ctx.scale(1, 0.18); ctx.translate(-cx, -by); ctx.fillStyle = g; ctx.fillRect(cx - w, by - w, w * 2, w * 2); ctx.restore(); }   // 문 밑 그림자 (땅에 닿아 보이게)function doorGrass(cx, by, w) {   // 문 밑동 앞에 그 칸의 풀 띠를 다시 그려 문이 땅에 묻혀 보이게  var tp = tilePats(G.lv.theme === 'temple'), r = Math.round(by / TS), g = G.lv.g; if (!tp || !g[r]) return;  for (var c = Math.floor((cx - w / 2) / TS); c <= Math.floor((cx + w / 2) / TS); c++) { if (g[r][c] !== '#' || (r > 0 && g[r - 1][c] === '#')) continue; var y = r * TS; tp.top.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, y - 5])); ctx.fillStyle = tp.top; ctx.fillRect(c * TS, y - 5, TS, tp.topH); }}
function doorGrass(cx, by, w) {   // 문 밑동 앞에 그 칸의 풀 띠를 다시 그려 문이 땅에 묻혀 보이게
  var tp = tilePats(G.lv.theme === 'temple'), r = Math.round(by / TS), g = G.lv.g; if (!tp || !g[r]) return;
  for (var c = Math.floor((cx - w / 2) / TS); c <= Math.floor((cx + w / 2) / TS); c++) { if (g[r][c] !== '#' || (r > 0 && g[r - 1][c] === '#')) continue; var y = r * TS; tp.top.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, y - 5])); ctx.fillStyle = tp.top; ctx.fillRect(c * TS, y - 5, TS, tp.topH); }
}
function drawDoor() {
  var d = G.door; if (!d) return;
  var a = G.doorAnim, t = a ? a.t : 0, cx = d.x + d.w / 2, by = d.y + d.h;
  if (G.lv.boss && DIMG.b.length === 18 && DIMG.b.every(Boolean)) {   // 월드 클리어 문 (2026-11-24 사용자 에셋 '황금빛 마법문 개방' 18장): 0 빈 하트 → 1~5 생명의 잔 넷이 날아와 끼워짐 → 6~17 마법진·빛이 터지며 열림
    var bs2 = 150 / 191, bw2 = 362 * bs2, bh2 = 241 * bs2, bx2 = cx - 182 * bs2, by2 = by + 4 - 200 * bs2;
    var gl2 = ctx.createRadialGradient(cx, by - 70, 4, cx, by - 70, 140); gl2.addColorStop(0, 'rgba(127,230,255,' + (0.08 + Math.sin(G.time * 2) * 0.03) + ')'); gl2.addColorStop(1, 'rgba(127,230,255,0)');
    ctx.fillStyle = gl2; ctx.fillRect(cx - 150, by - 220, 300, 240);
    var cupsT = DOOR.cupT * 4, fi = 0;
    if (a) fi = t < cupsT ? 1 + Math.min(4, Math.floor(t / cupsT * 5)) : 6 + Math.min(11, Math.floor((t - cupsT) / (DOOR.bossOpenT + DOOR.bossLightT) * 12));
    doorShadow(cx, by, 120); ctx.imageSmoothingEnabled = false; ctx.filter = 'brightness(0.78) saturate(0.7)'; ctx.drawImage(tinted(DIMG.b[fi], 'rgba(28,46,110,0.32)'), Math.round(bx2), Math.round(by2 + 6), Math.round(bw2), Math.round(bh2)); ctx.filter = 'none'; ctx.imageSmoothingEnabled = true; doorGrass(cx, by, bw2 * 0.8);   // 도트(2픽셀)로 줄인 그림을 부드럽게 하지 않고, 배경처럼 조금 어둡게, 밑동은 땅에 묻고 앞에 풀
  } else if (!G.lv.boss && DIMG.n.length === 6 && DIMG.n.every(Boolean)) {   // 보통 스테이지 문 (2026-11-24 사용자 에셋: 덩굴·꽃 돌 아치 6장 + '스테이지 클리어 포털 빛의 향연' 12장)
    var ns = 112 / 190, nw = 220 * ns, nh = 197 * ns, ok2 = a ? Math.min(1, t / DOOR.normalT) : 0, pul2 = 0.3 + Math.sin(G.time * 3) * 0.1;
    var ng = ctx.createRadialGradient(cx, by - 50, 4, cx, by - 50, 90 + ok2 * 80); ng.addColorStop(0, 'rgba(255,236,170,' + Math.min(0.8, pul2 + ok2 * 0.5) + ')'); ng.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = ng; ctx.fillRect(cx - 180, by - 200, 360, 220);
    doorShadow(cx, by, 70); ctx.imageSmoothingEnabled = false; ctx.filter = 'brightness(0.9) saturate(0.85)'; ctx.drawImage(tinted(DIMG.n[a ? Math.min(5, Math.floor(ok2 * 6)) : 0], 'rgba(70,100,50,0.14)'), Math.round(cx - 110 * ns), Math.round(by + 8 - 190 * ns), Math.round(nw), Math.round(nh)); ctx.filter = 'none'; ctx.imageSmoothingEnabled = true; doorGrass(cx, by, nw * 0.8);
    if (a && DIMG.f.length === 12 && DIMG.f.every(Boolean)) {   // 문이 열리며 발밑에서 빛이 솟아오름
      var fs = 0.42, fk = Math.min(11, Math.floor(Math.max(0, ok2 - 0.3) / 0.7 * 12)); ctx.globalAlpha = ok2 < 0.3 ? 0 : 0.6;   // 문 크기에 맞춰 작게, 도트로
      drawPix(DIMG.f[fk], cx - 182 * fs, by + 6 - 296 * fs, 362 * fs, 362 * fs, 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  } else if (G.lv.boss && UIIMG['door-closed']) {   // (그림을 다 불러오기 전) 월드 클리어 문 (사용자 에셋). 사원 톤: 뒤에 푸른 룬 빛, 문 안쪽 빛은 하늘색
    var dc = UIIMG['door-closed'], dh = 132, dw = dc.width / dc.height * dh, x0 = cx - dw / 2, y0 = by - dh + 4, sc = dh / dc.height;
    var gl = ctx.createRadialGradient(cx, by - dh * 0.45, 4, cx, by - dh * 0.45, dw * 0.8); gl.addColorStop(0, 'rgba(127,230,255,' + (0.25 + Math.sin(G.time * 2) * 0.08) + ')'); gl.addColorStop(1, 'rgba(127,230,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x0 - dw * 0.3, y0 - 30, dw * 1.6, dh + 40);
    var openK = a ? Math.max(0, Math.min(1, (t - DOOR.cupT * 4) / DOOR.bossOpenT)) : 0;
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1 - openK; ctx.drawImage(dc, x0, y0, dw, dh); ctx.globalAlpha = openK; ctx.drawImage(UIIMG['door-open'], x0, y0, dw, dh); ctx.globalAlpha = 1;
    var sockets = [[133, 329], [133, 519], [683, 329], [683, 519]];
    if (a && UIIMG.relic && openK < 1) sockets.forEach(function (s, i) {   // 잔이 하나씩 날아가 끼워짐
      var k = (t - i * DOOR.cupT) / DOOR.cupT; if (k <= 0) return; k = Math.min(1, k);
      var tx = x0 + s[0] * sc, ty = y0 + s[1] * sc, sx = a.fx, sy = a.fy - 30, e = 1 - Math.pow(1 - k, 3);
      var px = sx + (tx - sx) * e, py = sy + (ty - sy) * e - Math.sin(k * Math.PI) * 40, rs = 28;
      ctx.globalAlpha = 1 - openK; ctx.drawImage(UIIMG.relic, px - rs / 2, py - rs / 2, rs, rs); ctx.globalAlpha = 1;
      if (k >= 1) { var g2 = ctx.createRadialGradient(tx, ty, 0, tx, ty, 18); g2.addColorStop(0, 'rgba(255,220,150,0.6)'); g2.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g2; ctx.fillRect(tx - 18, ty - 18, 36, 36); }
    });
    if (a && t > DOOR.cupT * 4) {   // 빛이 새어 나옴 (2026-11-24 사용자 "실 형태의 프레임 … 퀄리티 올려": 가는 줄 대신 부드러운 빛 덩어리·넓은 빛살·바닥에 번지는 빛·떠오르는 빛 알갱이)
      var lk = Math.min(1, (t - DOOR.cupT * 4) / (DOOR.bossOpenT + DOOR.bossLightT)), oy = by - dh * 0.4, ow = dw * 0.2;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.save(); ctx.translate(cx, oy); ctx.scale(1, 1.5);   // 문 안쪽에서 번지는 빛 (세로로 긴 타원)
      var lg = ctx.createRadialGradient(0, 0, 4, 0, 0, 40 + lk * 90); lg.addColorStop(0, 'rgba(200,250,255,' + (0.35 + lk * 0.3) + ')'); lg.addColorStop(0.5, 'rgba(127,230,255,' + 0.18 * lk + ')'); lg.addColorStop(1, 'rgba(127,230,255,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(0, 0, 40 + lk * 90, 0, 7); ctx.fill(); ctx.restore();
      for (var r = 0; r < 5; r++) {   // 넓고 부드러운 빛살 (문 위쪽으로 부채꼴)
        var an = -Math.PI / 2 + (r - 2) * 0.32 + Math.sin(G.time * 0.8 + r) * 0.03, len = (140 + (r % 2) * 50) * lk, sw = 0.09;
        var x1 = cx + Math.cos(an - sw) * len, y1 = oy + Math.sin(an - sw) * len, x2 = cx + Math.cos(an + sw) * len, y2 = oy + Math.sin(an + sw) * len;
        var rg = ctx.createLinearGradient(cx, oy, cx + Math.cos(an) * len, oy + Math.sin(an) * len); rg.addColorStop(0, 'rgba(190,245,255,' + 0.3 * lk + ')'); rg.addColorStop(1, 'rgba(190,245,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(cx - ow * 0.3, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(cx + ow * 0.3, oy); ctx.closePath(); ctx.fill();
      }
      ctx.save(); ctx.translate(cx, by - 2); ctx.scale(1, 0.14);   // 바닥에 번지는 빛
      var fg = ctx.createRadialGradient(0, 0, 4, 0, 0, 160 * lk + 20); fg.addColorStop(0, 'rgba(170,240,255,' + 0.45 * lk + ')'); fg.addColorStop(1, 'rgba(170,240,255,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 0, 160 * lk + 20, 0, 7); ctx.fill(); ctx.restore();
      for (var m = 0; m < 18; m++) {   // 문에서 떠오르는 빛 알갱이
        var mt = (G.time * 0.6 + m * 0.137) % 1, mx = cx + (ultRnd(m) - 0.5) * ow * 2.2 + Math.sin(G.time * 2 + m) * 8, my = oy + dh * 0.25 - mt * dh * 1.1, mr = 2 + ultRnd(m + 9) * 2.5, ma = Math.sin(mt * Math.PI) * lk;
        var mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3); mg.addColorStop(0, 'rgba(230,252,255,' + 0.9 * ma + ')'); mg.addColorStop(1, 'rgba(160,235,255,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
      }
      ctx.globalAlpha = 0.22 * lk; ctx.drawImage(UIIMG['door-open'], x0, y0, dw, dh); ctx.globalAlpha = 1;   // 열린 문 그림 자체도 은은하게 빛남
      ctx.restore();
    }
  } else if (REF.arch) {   // 보통 문: 돌 아치. 열면 안쪽 금빛이 커지며 빛줄기
    var ah = 96, aw = REF.arch.width / REF.arch.height * ah, pul = 0.35 + Math.sin(G.time * 3) * 0.12, ok = a ? Math.min(1, t / DOOR.normalT) : 0;
    var dg2 = ctx.createRadialGradient(cx, by - 26, 4, cx, by - 26, 46 + ok * 200); dg2.addColorStop(0, 'rgba(255,240,170,' + Math.min(1, pul + 0.3 + ok) + ')'); dg2.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = dg2; ctx.fillRect(cx - 260, d.y - 220, 520, d.h + 260);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(REF.arch, cx - aw / 2, by - ah + 4, aw, ah);
    if (ok > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (var r2 = 0; r2 < 5; r2++) { var an2 = -Math.PI / 2 + (r2 - 2) * 0.35; ctx.strokeStyle = 'rgba(255,240,190,' + 0.4 * ok + ')'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, by - 30); ctx.lineTo(cx + Math.cos(an2) * 180 * ok, by - 30 + Math.sin(an2) * 180 * ok); ctx.stroke(); } ctx.restore(); }
  }
  if (!a && G.lv.id === '1-1' && nearDoor()) drawUpPrompt(cx, d.y - 50);   // ↑ 표시는 1-1 에서만
}
function drawUpPrompt(x, y) {   // 키 모양 ↑ 와 '열기'
  var bob = Math.sin(G.time * 5) * 3; ctx.save(); ctx.translate(0, bob);
  ctx.fillStyle = '#2b3150'; ctx.fillRect(x - 13, y - 13, 26, 26); ctx.fillStyle = '#4a5280'; ctx.fillRect(x - 13, y - 13, 26, 22); ctx.strokeStyle = '#e2bd72'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 12.5, y - 12.5, 25, 25);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↑', x, y + 5);
  ctx.font = 'bold 12px "Malgun Gothic", sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText('열기', x, y + 28); ctx.fillStyle = '#ffe9b0'; ctx.fillText('열기', x, y + 28); ctx.restore();
}
function drawChest(it) {   // 보스 보상 상자: 닫힘(빛 번짐) → 열림(빛) → 열림
  var im = !it.opening ? UIIMG.chest : (it.opening < 0.6 ? UIIMG['chest-glow'] : UIIMG['chest-open']); if (!im) return;
  var w = 64, h = im.height / im.width * w, cx = it.x + it.w / 2, by = it.y + it.h;
  if (!it.opening) { var pu = 0.45 + Math.sin(G.time * 4) * 0.15, g = ctx.createRadialGradient(cx, by - 18, 2, cx, by - 18, 56); g.addColorStop(0, 'rgba(255,225,130,' + pu + ')'); g.addColorStop(1, 'rgba(255,225,130,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 60, by - 80, 120, 90); }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(im, cx - w / 2, by - h + 2, w, h);
  if (it.opening && it.opening < 1.4 && UIIMG.relic) { var k = Math.min(1, it.opening / 0.8), rs = 30; ctx.globalAlpha = 1 - Math.max(0, (it.opening - 1.0) / 0.4); ctx.drawImage(UIIMG.relic, cx - rs / 2, by - h - 10 - k * 40, rs, rs); ctx.globalAlpha = 1; }   // 잔이 솟아오름
}
function drawRelicPop() {   // 화면 가운데 '생명의 잔 획득' 판 (사용자 에셋)
  var p = G.relicPop; if (!p || !UIIMG['relic-popup']) return;
  var im = UIIMG['relic-popup'], s = p.t < 0.18 ? 0.7 + p.t / 0.18 * 0.3 : 1, a = p.t > 2.0 ? Math.max(0, 1 - (p.t - 2.0) / 0.4) : 1;
  var w = 420 * s, h = im.height / im.width * w, x = W / 2 - w / 2, y = H / 2 - h / 2 - 20;
  ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true; ctx.drawImage(im, x, y, w, h);
  ctx.font = 'bold 18px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText('생명의 잔 획득', W / 2, y + h * 0.795 + 6); ctx.fillStyle = '#ffe9b0'; ctx.fillText('생명의 잔 획득', W / 2, y + h * 0.795 + 6);
  ctx.font = '13px "Malgun Gothic", sans-serif'; ctx.strokeText('최대 체력 +1', W / 2, y + h + 18); ctx.fillStyle = '#fff'; ctx.fillText('최대 체력 +1', W / 2, y + h + 18);
  ctx.restore();
}
function drawWoodlandPillar(s) {
  var x = s.x, y = s.y, w = s.w, h = Math.max(s.h, s.y0 - y);
  rect(ctx, '#285a76', x + 3, y, w - 6, h);
  rect(ctx, '#72aec7', x + 5, y, w - 10, h);
  rect(ctx, '#aad9e7', x + 7, y + 5, 6, h - 5);
  rect(ctx, '#5289a9', x + w - 11, y + 4, 6, h - 4);
  ctx.fillStyle = '#8dc3d8';
  ctx.beginPath();
  ctx.moveTo(x + 13, y + 8); ctx.lineTo(x + w - 11, y + 8);
  ctx.lineTo(x + w - 11, y + h * 0.58); ctx.lineTo(x + 13, y + h * 0.79);
  ctx.fill();
  rect(ctx, '#245d80', x - 1, y - 1, w + 2, s.h + 2);
  rect(ctx, '#8fc8de', x, y, w, s.h);
  ctx.fillStyle = '#e5faff';
  ctx.beginPath();
  ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 6, y);
  ctx.lineTo(x + w, y + 4); ctx.lineTo(x, y + 4);
  ctx.fill();
  rect(ctx, '#fbffff', x + 4, y, w - 10, 2);
  rect(ctx, '#b3e5f2', x + 2, y + 4, w - 4, 2);
  rect(ctx, '#5b98b8', x + w - 8, y + 4, 8, 4);
}
function draw() {
  if (!ctx || !G.lv) return;
  // 선명하게 (2026-11-24 사용자 "그래픽이 자글자글"): 캔버스를 화면의 실제 픽셀 밀도로 그린다. 예전에는 960×544 를 그대로 늘려
  // 윈도우 배율 125%·150% 에서 픽셀이 고르지 않게 늘어나 자글거렸다. 그림을 늘리고 줄일 때는 부드럽게 (imageSmoothing)
  var dpr = Math.min(2, window.devicePixelRatio || 1), cssW = cv.clientWidth || W, bw = Math.round(cssW * dpr), bh = Math.round(bw * H / W);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(bw / W, 0, 0, bh / H, 0, 0); ctx.imageSmoothingQuality = 'high';
  if (!ART) buildArt();
  var th = THEMES[G.lv.theme] || THEMES.forest;
  var bs = boss(), target = bs && bs.state !== 'sleep' && bs.state !== 'dead' ? bs.arenaL : clampCam(P.x + P.w / 2 - W / 2 + P.face * 60);   // 보스가 깨어나면 경기장(화면 한 장)에 고정
  if (!G.doorAnim) G.cam += (target - G.cam) * 0.12;   // 문이 열리는 동안은 화면을 멈춤 (2026-11-24 "문 밀리는 버그": 멈춰 선 직후 ↑ 를 누르면 따라오던 화면이 계속 움직여 문이 밀려 보였음)
  var sx = G.shake > 0 ? (Math.random() - 0.5) * 8 : 0, sy = G.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
  var cam = Math.round(G.cam);
  // 배경 (하늘, 구름, 먼 산, 나무 줄, 덤불)
  drawBackground(th, cam);
  ctx.save(); ctx.translate(-cam + sx, sy);
  // 칸
  drawTiles(cam);
  // 문
  drawProps();
  drawSigns();
  drawDoor();   // 문 (보통 문·월드 클리어 문, ↑ 로 열림)
  if (G.door && !REF.arch && !(G.lv.boss && UIIMG['door-closed'])) { var d = G.door; ctx.fillStyle = 'rgba(255,230,140,' + (0.25 + Math.sin(G.time * 3) * 0.1) + ')'; ctx.beginPath(); ctx.ellipse(d.x + d.w / 2, d.y + d.h / 2, 34, 44, 0, 0, 7); ctx.fill(); ctx.drawImage(ART.door, d.x - 4, d.y - 4, 40, 68); }
  // 얼음 길: 테두리 있는 얼음 결정
  if (G.ice) G.ice.segs.forEach(function (s) {
    var warn = G.ice.done && G.ice.life < CFG.iceWarn;
    if (warn && Math.floor(G.time * 20) % 2) return;
    if (CH2.fr[1].sp2) { drawIceSeg(s); if (warn) { ctx.strokeStyle = 'rgba(20,60,100,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x + 6, s.y); ctx.lineTo(s.x + 10, s.y + s.h / 2); ctx.lineTo(s.x + 7, s.y + s.h); ctx.stroke(); ctx.lineWidth = 1; } return; }
    if (s.pillar && G.lv.theme === 'forest') drawWoodlandPillar(s);
    else {
      if (s.pillar) { var ph = Math.max(4, s.y0 - s.y); ctx.fillStyle = '#2f6f99'; ctx.fillRect(s.x + 4, s.y, s.w - 8, ph); ctx.fillStyle = '#a8e2ff'; ctx.fillRect(s.x + 6, s.y, s.w - 12, ph); ctx.fillStyle = '#e8f8ff'; ctx.fillRect(s.x + 8, s.y, 4, ph); }
      ctx.fillStyle = '#2f6f99'; ctx.fillRect(s.x - 1, s.y - 1, s.w + 2, s.h + 2);
      ctx.fillStyle = '#bfeaff'; ctx.fillRect(s.x, s.y, s.w, s.h); ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x + 2, s.y, s.w - 6, 2); ctx.fillStyle = '#7cc4ea'; ctx.fillRect(s.x, s.y + s.h - 2, s.w, 2);
    }
    if (warn) { ctx.strokeStyle = '#1d4a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x + 6, s.y); ctx.lineTo(s.x + 10, s.y + s.h / 2); ctx.lineTo(s.x + 7, s.y + s.h); ctx.stroke(); ctx.lineWidth = 1; }
  });
  // 물건
  G.items.forEach(function (it) {
    var bob = Math.sin(it.t * 4) * 3;
    if (it.type === 'C') { drawChest(it); return; }   // 보스 보상 상자
    if (it.type === 'T' && REF.crystal) {   // 숨겨진 보물: 시안의 빛나는 수정
      ctx.fillStyle = 'rgba(150,220,255,' + (0.3 + Math.sin(it.t * 5) * 0.15) + ')'; ctx.beginPath(); ctx.arc(it.x + 10, it.y + 8 + bob, 22, 0, 7); ctx.fill();
      ctx.imageSmoothingEnabled = true; ctx.drawImage(REF.crystal, it.x - 8, it.y - 16 + bob, 36, 36);
      if (Math.floor(it.t * 3) % 3 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(it.x + 20, it.y - 12 + bob, 3, 3); }
      return;
    }
    if (it.type === 'T' && G.lv.theme === 'forest') {
      ctx.drawImage(ART.woodlandChest, it.x - 3, Math.round(it.y - 3 + bob), 32, 26);
      return;
    }
    if (it.type === 'T') { ctx.fillStyle = 'rgba(255,220,90,' + (0.3 + Math.sin(it.t * 5) * 0.15) + ')'; ctx.beginPath(); ctx.arc(it.x + 10, it.y + 10 + bob, 18, 0, 7); ctx.fill(); ctx.drawImage(ART.chest, it.x - 3, it.y - 1 + bob, 28, 24); if (Math.floor(it.t * 3) % 3 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(it.x + 18, it.y - 2 + bob, 3, 3); } }
    else { ctx.fillStyle = 'rgba(230,180,255,0.5)'; ctx.beginPath(); ctx.arc(it.x + 12, it.y + 12 + bob, 16 + Math.sin(it.t * 8) * 3, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1640'; ctx.fillRect(it.x + 3, it.y + 3 + bob, 18, 18); ctx.fillStyle = '#c07aff'; ctx.fillRect(it.x + 5, it.y + 5 + bob, 14, 14); ctx.fillStyle = '#f0d8ff'; ctx.fillRect(it.x + 7, it.y + 7 + bob, 5, 5); }
  });
  // 적
  G.enemies.forEach(function (en) { var fl = en.hitFl > 0; if (fl) { ctx.save(); ctx.filter = 'brightness(' + (1 + en.hitFl * 9) + ')'; ctx.translate(Math.round(Math.sin(G.time * 90) * en.hitFl * 14), 0); } if (en.type === 'B') drawBoss(en); else drawEnemy(en); if (fl) ctx.restore(); });   // 맞은 순간 하얗게 번쩍이고 흔들림 (합동 필살기 적중감)
  if (DEBUG) {   // ?debug: 판정 상자 (하늘 = 맞는 판정, 빨강 = 닿으면 다침, 노랑 = 기본 공격, 초록 = 플레이어)
    ctx.lineWidth = 2;
    G.enemies.forEach(function (en) { if (en.hp <= 0) return; var hb = hurtBox(en), tb = touchBox(en); ctx.strokeStyle = '#6cf'; ctx.strokeRect(hb.x, hb.y, hb.w, hb.h); ctx.strokeStyle = '#f44'; ctx.strokeRect(tb.x + 2, tb.y + 2, tb.w - 4, tb.h - 4); });
    ctx.strokeStyle = '#4f4'; ctx.strokeRect(P.x, P.y, P.w, P.h);
    if (P.atk > 0) { var dab = atkBox(); ctx.strokeStyle = '#ff4'; ctx.strokeRect(dab.x, dab.y, dab.w, dab.h); }
    if (P.skill) { var dsb = skillHitbox(P, P.skill.type, P.face); ctx.strokeStyle = '#ff4'; ctx.strokeRect(dsb.x, dsb.y, dsb.w, dsb.h); }
    ctx.lineWidth = 1;
  }
  G.waves.forEach(function (w) {   // 충격파: 땅을 따라 달리는 보라·하늘빛 수정 가시 (판정 상자와 같은 크기), 뒤로 흙먼지
    var fi = REF['fx-ice'];
    ctx.fillStyle = 'rgba(190,170,150,0.55)'; ctx.fillRect(w.x - (w.vx > 0 ? 22 : -w.w - 4), w.y + w.h - 8, 22, 6);
    if (fi) { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.filter = 'hue-rotate(40deg) saturate(1.3)'; ctx.translate(w.x + w.w / 2, w.y + w.h); if (w.vx < 0) ctx.scale(-1, 1);
      var sc = 1 + Math.sin(G.time * 30 + w.x) * 0.08; ctx.drawImage(fi, -w.w / 2 - 4, -w.h * sc - 2, w.w + 8, w.h * sc + 2); ctx.restore(); }
    else { ctx.imageSmoothingEnabled = true; ctx.drawImage(ART.rock, w.x, w.y, w.w, w.h); }
  });
  if (G.slamFx && REF['fx-ice']) {   // 내려찍기: 떨어진 자리 양쪽으로 수정 가시가 솟았다 가라앉음
    var sf = G.slamFx, sk2 = sf.t / 0.5, sh2 = Math.sin(Math.min(1, sk2) * Math.PI) * 44;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.filter = 'hue-rotate(40deg) saturate(1.3)'; ctx.globalAlpha = 1 - sk2 * 0.6;
    [-1, 1].forEach(function (d) { ctx.save(); ctx.translate(sf.x + d * 70, sf.y); if (d < 0) ctx.scale(-1, 1); ctx.drawImage(REF['fx-ice'], -50, -sh2, 100, sh2); ctx.restore(); });
    ctx.restore();
  }
  // 에코
  G.echoes.forEach(function (e) { var a = 0.45 * (1 - e.t / e.dur) + 0.15; ctx.globalAlpha = a; drawChar(e.ci, e.x, e.y, e.face, e.type === 'strike' ? 'strike' : e.type, Math.min(1, e.t / e.dur)); if (isAtkType(e.type)) drawAtkFx(e, e.type, Math.min(1, e.t / e.dur), e.face); ctx.globalAlpha = 1; });
  // 플레이어 (발밑 폼 빛은 2026-11-24 사용자 "캐릭터한테 푸른색 빛 … 없애자"로 뺌. 폼은 머리 위 수정 색과 HUD 로 보인다)
  drawUltReady('back');
  if (G.doorAnim) ctx.globalAlpha = Math.max(0, 1 - G.doorAnim.t / (doorDur() * 0.8));   // 문이 열리면 캐릭터가 빛 속으로 사라짐 (문을 가리지 않게)
  if (!G.ult && !(P.inv > 0 && Math.floor(G.time * 20) % 2) && G.dying <= 0) drawChar(P.char, P.x, P.y, P.face, P.skill ? P.skill.type : (P.atk > 0 ? 'atk' : (P.onGround ? (Math.abs(P.vx) > 10 ? 'run' : 'idle') : 'air')), P.skill ? Math.min(1, P.skill.t / P.skill.dur) : (P.atk > 0 ? 1 - P.atk / CFG.atkT : 0));
  ctx.globalAlpha = 1;
  if (P.skill && isAtkType(P.skill.type)) drawAtkFx(P, P.skill.type, Math.min(1, P.skill.t / P.skill.dur), P.face);
  drawUltReady('front');
  drawStackOverhead();
  drawTagCue();
  if (G.ult) drawUlt();
  // 조각과 글자
  ctx.globalCompositeOperation = 'lighter';   // 조각은 빛나게
  G.parts.forEach(function (p) { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  G.pops.forEach(function (p) { ctx.globalAlpha = p.big ? (p.t < 0.6 ? 1 : 1 - (p.t - 0.6) / 0.4) : 1 - p.t / 0.6;   // 큰 글자는 0.6초 동안 또렷하게 있다가 사라진다
    if (p.text === 'PERFECT' && REF['fx-perfect']) {   // 시안의 PERFECT 글자: 튀어나왔다가 자리 잡음
      var pi = REF['fx-perfect'], ps = p.t < 0.12 ? 0.6 + p.t / 0.12 * 0.6 : 1.2 - Math.min(0.2, (p.t - 0.12)), pw = 150 * ps, ph = pi.height / pi.width * pw;
      ctx.imageSmoothingEnabled = true; ctx.drawImage(pi, p.x - pw / 2, p.y - ph, pw, ph);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.4; ctx.drawImage(pi, p.x - pw / 2, p.y - ph, pw, ph); ctx.globalCompositeOperation = 'source-over'; return;
    }
    if (p.big) { var ps2 = p.t < 0.12 ? 0.6 + p.t / 0.12 * 0.6 : 1.2 - Math.min(0.2, (p.t - 0.12)); fancyText(p.text, p.x, p.y, 36 * ps2, POP_STYLE[p.text] || POP_STYLE._); return; }
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(p.text, p.x + 2, p.y + 2); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }); ctx.globalAlpha = 1;
  ctx.restore();
  drawForeground(cam);
  drawLighting(cam);
  drawCutin();
  drawRelicPop();
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,230,' + (G.flash * 2.2) + ')'; ctx.fillRect(0, 0, W, H); }
  if (G.flashRed > 0) { ctx.fillStyle = 'rgba(255,60,60,' + (G.flashRed * 1.5) + ')'; ctx.fillRect(0, 0, W, H); }
  drawHint(); drawHUD(); drawUltScreen();   // 합동 필살기: 세 얼굴 컷신은 HUD 까지 덮고, 제목은 맨 위
  if (G.dying > 0) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - G.dying / 0.7) + ')'; ctx.fillRect(0, 0, W, H); }
}
function drawHills(off, base, amp, color, wl) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H); for (var x = 0; x <= W; x += 16) ctx.lineTo(x, base - Math.abs(Math.sin((x + off) / wl)) * amp); ctx.lineTo(W, H); ctx.fill(); }
// ===== 캐릭터 그림: 게임 2 의 사용자 그림 (assets/char-*.png, 용가리 dragon.png) 을 줄여 쓴다 =====
// 2026-11-24 사용자가 "C 게임 2 원본"을 고름. 그림이 원래 보는 쪽과 발 가운데 자리는 게임 2 의 값을 따른다
// (보는 쪽은 게임 2 의 CHAR_FACE [1,1,1]. 빨강은 사용자가 확인한 값이 아니라 지적이 없었던 값, 장부 78)
var BASE = (function () { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : './'; })();   // game.js 가 있는 폴더 (검사 페이지에서도 그림을 찾도록)
var BGIMG = {};   // 스테이지 배경 그림 (사용자 그림). 없으면 코드로 그린 배경
// 사용자 시안 시트 ④ (g3-ref "정교한 픽셀 아트 게임 에셋 시트-4", ChatGPT 로 만들고 후가공)에서 잘라 낸 그림 (assets/ref/). 못 불러오면 코드로 그린 그림
var REF = {};
// 사용자 UI 에셋 (g3-ref "UI관련 에셋", "인게임 에셋", 2026-11-24): assets/ui/. 못 불러오면 코드로 그린 HUD
var UIIMG = {}, UI_FILES = ['hud-main', 'hud-title', 'hud-stars', 'heart', 'heart-empty', 'star', 'star-off', 'bang', 'frame-wide', 'bar-frame', 'bar-fill', 'slot-sel', 'chest', 'chest-glow', 'chest-open', 'relic', 'relic-popup', 'door-closed', 'door-open'];
// 캐릭터 시안 (g3-ref "판타지 액션 플랫폼er 픽셀 아트 시트", ChatGPT 로 만들고 후가공): 캐릭터마다 대기 2·달리기 6·공격 3·기술 3 장 (모두 오른쪽을 봄), 얼굴 칸 1장 (assets/char/)
// 14장을 다 불러오기 전에는 게임 2 그림(char-*.png)으로 그린다
var CH2 = { names: ['idle0', 'idle1', 'run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'atk0', 'atk1', 'atk2', 'sp0', 'sp1', 'sp2'], fr: [{}, {}, {}], face: [], big: [], count: 0 };
var REF_FILES = ['slime0', 'slime1', 'slime2', 'bat0', 'bat1', 'bat2', 'golem', 'golem-atk', 'tile-grass', 'tile-stone', 'tile-grass-thin',
  'bg-1-2', 'bg-1-3', 'bg-1-4', 'bg-1-5', 'fx-dragon', 'fx-ice', 'fx-wind', 'fx-perfect', 'fx-ult',
  'arch', 'crystal', 'bush', 'mushroom', 'rock', 'sapling', 'lamp', 'pillars', 'banner', 'vine', 'leaves', 'sign'];
var REF_BG = { forest2: 'bg-1-2', forest3: 'bg-1-3', forest4: 'bg-1-4', temple: 'bg-1-5' };   // 스테이지 배경 띠
var DIMG = { n: [], f: [], b: [] };   // 문 프레임: n 보통 문 6장 (g3-ref '합동 필살기 컷신/픽셀 RPG 포털과 마법 효과 스프라이트 시트-2'), f 보통 문 빛 12장 ('스테이지 클리어 포털 빛의 향연-2.gif'), b 월드 클리어 문 18장 ('황금빛 마법문 개방 스프라이트 시트-5')
var SPR = { files: ['char-red', 'char-blue', 'char-green'], face: [1, 1, 1], foot: [0.58, 0.55, 0.6], faceAt: [[0.58, 0.31], [0.52, 0.34], [0.67, 0.23]], h: 64, img: [], dragon: null };
(function () {
  if ((TEST && !window.G3_SHOT) || typeof Image === 'undefined') return;
  SPR.files.forEach(function (n, i) { var im = newImg(); im.onload = function () { SPR.img[i] = im; }; im.src = BASE + 'assets/' + n + '.png'; });
  var dg = newImg(); dg.onload = function () { SPR.dragon = dg; }; dg.src = BASE + 'assets/dragon.png';
  var b11 = newImg(); b11.onload = function () { BGIMG['forest'] = b11; }; b11.src = BASE + 'assets/bg-1-1.png';   // 1-1 배경: 사용자 그림 (g3-ref, ChatGPT 로 만들고 후가공)
  ['red', 'blue', 'wind'].forEach(function (k, ci) {
    var fi = newImg(); fi.onload = function () { CH2.face[ci] = fi; }; fi.src = BASE + 'assets/char/' + k + '-face.png';
    var bi = newImg(); bi.onload = function () { CH2.big[ci] = bi; }; bi.src = BASE + 'assets/char/' + k + '-big.png';   // 합동 필살기 컷인용 큰 그림
    CH2.names.forEach(function (n) { var im = newImg(); im.onload = function () { CH2.fr[ci][n] = im; CH2.count++; }; im.src = BASE + 'assets/char/' + k + '-' + n + '.png'; });
  });
  UI_FILES.forEach(function (n) { var im = newImg(); im.onload = function () { UIIMG[n] = im; }; im.src = BASE + 'assets/ui/' + n + '.png'; });
  REF_FILES.forEach(function (n) { var im = newImg(); im.onload = function () { REF[n] = im; }; im.src = BASE + 'assets/ref/' + n + '.png?v=44'; });
  ['dragon', 'ice', 'wind', 'beam', 'boom', 'fin'].forEach(function (k) { for (var i = 0; i < (k === 'fin' ? 8 : 6); i++) (function (i) { var im = newImg(); im.onload = function () { ULTIMG[k][i] = im; }; im.src = BASE + 'assets/ult/' + k + i + '.png?v=44'; })(i); });
  var uf = newImg(); uf.onload = function () { ULTIMG.faces = uf; }; uf.src = BASE + 'assets/ult/faces.png?v=44';
  [['n', 6], ['f', 12], ['b', 18]].forEach(function (k) { for (var i = 0; i < k[1]; i++) (function (i) { var im = newImg(); im.onload = function () { DIMG[k[0]][i] = im; }; im.src = BASE + 'assets/door/' + k[0] + i + '.png?v=44'; })(i); });   // 문 애니메이션 (사용자 에셋 2026-11-24)
})();
// ===== 걷기 몸짓 (2026-11-24 사용자 "슬라이드해서 움직이는 것처럼 … 걸어가는 모션을 정확하게", "팔 다리등의 움직임이 같이 들어가면"):
// 서 있는 그림(idle0)을 윗몸·뒷다리·앞다리·뒷팔·앞팔로 나눠 움직인다. 걸음은 시간이 아니라 걸어간 거리로 맞춰 발이 미끄러지지 않게.
// 자리는 그림 픽셀 [x, y, 폭, 높이], 축은 [x, y]. hip: 다리가 시작하는 높이, split: 뒷다리·앞다리를 가르는 x
var WALKRIG = {
  red:  { hip: 46, split: 34, armB: [21, 29, 11, 13], pivB: [27, 30], armF: [33, 29, 11, 13], pivF: [36, 30] },
  blue: { hip: 50, split: 30, armB: [8, 27, 14, 17], pivB: [18, 29], armF: [33, 27, 14, 17], pivF: [36, 29] },
  wind: { hip: 41, split: 31, armB: [17, 27, 13, 15], pivB: [24, 29], armF: [36, 25, 13, 16], pivF: [38, 29] }
};
var STRIDE = 18;   // 한 걸음에 가는 거리 (픽셀). 달리기 속도 190 이면 1초에 약 10걸음
function drawWalk(ci, im, w, h, ax) {   // 2026-11-24 고침: 윗몸만 출렁여 허리에 틈이 생기던 것 (몸이 잘려 보임) → 몸 전체가 함께 출렁이고, 윗몸은 다리 위로 4픽셀 겹쳐 그림. 팔 자리는 윗몸에서 비워 두 겹이 안 되게
  var rg = WALKRIG[['red', 'blue', 'wind'][ci]], ph = (P.walkDist || 0) / STRIDE * Math.PI, sn = Math.sin(ph);
  var bob = -Math.abs(sn) * 1.5, lift = 3, swing = 2;
  function part(r, dx, dy, rot, piv) {
    ctx.save(); if (rot) { ctx.translate(-ax + piv[0] + dx, -h + piv[1] + dy); ctx.rotate(rot); ctx.translate(-piv[0], -piv[1]); } else ctx.translate(Math.round(-ax + dx), Math.round(-h + dy));   // 정수 자리로 (어중간한 자리면 조각 경계가 번져 줄이 보임)
    ctx.drawImage(im, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]); ctx.restore();
  }
  ctx.save(); ctx.translate(0, Math.round(bob));
  part([0, rg.hip, rg.split + 1, h - rg.hip], -Math.cos(ph) * swing, -Math.max(0, sn) * lift);           // 뒷다리
  part([rg.split - 1, rg.hip, w - rg.split + 1, h - rg.hip], Math.cos(ph) * swing, -Math.max(0, -sn) * lift);   // 앞다리 (반대 박자)
  part([0, 0, w, rg.hip + 4], 0, 0);                                                                         // 윗몸 (다리 위로 4픽셀 겹침, 자르지 않음)
  part(rg.armB, sn * 1.5, -Math.abs(sn) * 0.5);                                                             // 팔: 다리와 반대로 앞뒤로 흔든다 (돌리지 않고 밀어서, 몸에 틈이 생기지 않게)
  part(rg.armF, -sn * 1.5, -Math.abs(sn) * 0.5);
  ctx.restore();
}
// 캐릭터 시안의 동작 그림으로 그리기. k 는 기술·공격의 진행 (0 → 1). 그림은 모두 오른쪽을 보고, 발이 그림 맨 아래에 있다
var CH2_AX = { 'red-sp1': 0.68, 'red-sp2': 0.45 };   // 불꽃·이펙트가 옆으로 뻗은 그림은 몸 자리를 따로 (그림 폭에 대한 비율)
function drawFrame(ci, x, y, face, pose, k) {
  var F = CH2.fr[ci], t = G.time || 0, key = ['red', 'blue', 'wind'][ci], n;
  if (pose === 'idle') n = 'idle' + (Math.floor(t * 2.5) % 2);
  else if (pose === 'run') n = 'idle0';   // 걷기는 서 있는 그림을 나눠 몸짓으로 (drawWalk)
  else if (pose === 'air') n = 'run2';
  else if (pose === 'atk' || pose === 'strike' || isAtkType(pose)) n = 'atk' + Math.min(2, Math.floor(k * 3));
  else if (pose === 'dash') n = k < 0.08 ? 'sp0' : (k < 0.8 ? 'sp1' : 'sp2');   // QA 뒤: 몸이 잘 보이는 둘째 장 위주, 불덩이가 큰 셋째 장은 끝에만
  else if (pose === 'slide' || pose === 'up') n = 'sp1';
  else if (pose === 'wind') n = 'sp0';
  else n = 'idle0';
  var im = F[n] || F.idle0, w = im.width, h = im.height, ax = CH2_AX[key + '-' + n] !== undefined ? w * CH2_AX[key + '-' + n] : Math.min(w, 54) / 2;
  ctx.save(); ctx.translate(Math.round(x + CFG.pw / 2), Math.round(y + CFG.ph + 2)); if (face < 0) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true;
  if (pose === 'dash' && REF['fx-dragon']) {   // 용 돌진: 캐릭터 뒤로 불꽃 용의 기운
    var fd = REF['fx-dragon'], fh = 70, fw = fd.width / fd.height * fh;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.25; ctx.imageSmoothingEnabled = true; ctx.drawImage(fd, -fw * 0.7, -h / 2 - fh / 2, fw, fh); ctx.restore();
  }
  if (pose === 'wind') {   // 상승 기류: 시안의 회오리 두 장을 번갈아 발밑에
    var tw = F['sp' + (1 + Math.floor(t * 10) % 2)]; if (tw) { ctx.save(); ctx.globalAlpha *= 0.9; ctx.drawImage(tw, -tw.width * 0.55, -18, tw.width * 1.1, tw.height * 1.1); ctx.restore(); }
  }
  if (pose === 'slide') ctx.rotate(0.12);
  if (pose === 'run' && WALKRIG[key] && n === 'idle0') drawWalk(ci, im, w, h, Math.round(ax)); else ctx.drawImage(im, -Math.round(ax), -h, w, h);
  ctx.restore();
}
function drawSprite(ci, x, y, face, pose, k) {
  CH2.on = false;
  if (CH2.count >= 42) { CH2.on = true; drawFrame(ci, x, y, face, pose, k || 0); return true; }
  var im = SPR.img[ci];
  if (pose === 'dash' && REF['fx-dragon']) {   // 빨강 용 돌진: 시안의 불꽃 용 (원래 오른쪽을 봄), 빛나게 겹쳐 그림
    var fd = REF['fx-dragon'], fh = 66, fw = fd.width / fd.height * fh, fl = 1 + Math.sin((G.time || 0) * 40) * 0.04;
    ctx.save(); ctx.translate(x + CFG.pw / 2, y + CFG.ph / 2 - 2); if (face < 0) ctx.scale(-1, 1); ctx.scale(fl, 1 / fl);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(fd, -fw * 0.62, -fh / 2, fw, fh);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.35; ctx.drawImage(fd, -fw * 0.62, -fh / 2, fw, fh); ctx.restore(); return true;
  }
  if (pose === 'dash' && SPR.dragon) {       // 빨강 용 돌진: 용가리 그림 (원래 오른쪽을 봄)
    var dh = 54, dw = SPR.dragon.width / SPR.dragon.height * dh;
    ctx.save(); ctx.translate(x + CFG.pw / 2, y + CFG.ph / 2 - 4); if (face < 0) ctx.scale(-1, 1);
    ctx.drawImage(SPR.dragon, -dw / 2, -dh / 2, dw, dh); ctx.restore(); return true;
  }
  if (!im) return false;
  var t = G.time || 0, h = SPR.h, sy = 1, rot = 0, by = 0;
  var traversal = ci === 1 && G.lv.theme === 'forest' &&
    (pose === 'air' || pose === 'up' || pose === 'idle' || pose === 'run');
  if (pose === 'idle') sy = 1 + Math.sin(t * 3) * 0.02;                       // 숨쉬기
  if (pose === 'run') { by = -Math.abs(Math.sin(t * 14)) * 3; rot = 0.06; }  // 달리며 살짝 튀고 앞으로 기운다
  if (pose === 'slide') rot = 0.25;
  if (pose === 'air') rot = 0.04;
  if (pose === 'atk' || pose === 'strike' || isAtkType(pose)) rot = pose === 'upper' ? -0.1 : 0.12;
  var w = im.width / im.height * h;
  if (traversal) {
    // Keep the face and costume intact at draw size and anchor the pose at the feet.
    w = Math.round(w);
    h = Math.round(h * sy) + (pose === 'up' ? 2 : 0);
    by = Math.round(by);
    sy = 1;
    rot = 0;
  }
  ctx.save();
  ctx.translate(x + CFG.pw / 2, y + CFG.ph + by);
  ctx.rotate(rot * face);
  if (face !== SPR.face[ci]) ctx.scale(-1, 1);
  ctx.scale(1, sy);
  ctx.imageSmoothingEnabled = true;
  var left = -w * SPR.foot[ci];
  if (traversal) {
    left = Math.round(left) + (pose === 'air' ? 1 : 0);
    ctx.shadowColor = 'rgba(31,53,84,0.55)';
    ctx.shadowBlur = 2;
  }
  ctx.drawImage(im, left, -h, w, h);
  ctx.restore();
  return true;
}
function drawChar(ci, x, y, face, pose, k) {
  var ch = CHARS[ci];
  x = Math.round(x); y = Math.round(y);
  if (drawSprite(ci, x, y, face, pose, k)) {
    if (CH2.on) return;   // 캐릭터 시안 그림에는 공격·기술 몸짓과 이펙트가 들어 있다
    if (pose === 'atk' || pose === 'strike') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + (face > 0 ? 26 : -32), y + 8, 30, 4); ctx.fillRect(x + (face > 0 ? 26 : -26), y + 18, 22, 3); }
    if (pose === 'wind' && REF['fx-wind']) {   // 바람 상승: 시안의 회오리를 발밑에 겹겹이, 돌며 빛나게
      var fwi = REF['fx-wind'], ww = 86, wh = fwi.height / fwi.width * ww; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
      for (var q = 0; q < 2; q++) { ctx.save(); ctx.translate(x + 12, y + 34 + q * 14); ctx.scale((q % 2 ? -1 : 1) * (1 - q * 0.25), 0.7); ctx.rotate(Math.sin((G.time || 0) * 9 + q) * 0.15); ctx.globalAlpha = 0.85; ctx.drawImage(fwi, -ww / 2, -wh / 2, ww, wh); ctx.restore(); }
      ctx.restore();
    } else if (pose === 'wind') { ctx.strokeStyle = 'rgba(230,255,240,0.85)'; ctx.lineWidth = 2; for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x + 12, y + 30 + k * 8, 20 - k * 4, 6, 0, 0, 7); ctx.stroke(); } ctx.lineWidth = 1; }
    if (pose === 'slide') { ctx.fillStyle = 'rgba(210,240,255,0.7)'; ctx.fillRect(x - face * 20, y + CFG.ph - 6, 20, 4); }
    return;
  }
  if (pose === 'dash') { // 작은 붉은 용 (그림을 못 불러왔을 때)
    ctx.fillStyle = '#ff9a3a'; ctx.fillRect(x - face * 18, y + 12, 18, 12);
    ctx.fillStyle = ch.color; ctx.fillRect(x - 4, y + 8, 32, 20); ctx.fillStyle = ch.dark; ctx.fillRect(x + (face > 0 ? 22 : -8), y + 10, 12, 12);
    ctx.fillStyle = '#ffe0a0'; ctx.fillRect(x + (face > 0 ? 28 : -6), y + 13, 3, 3); ctx.fillStyle = ch.dark; ctx.fillRect(x + 4, y + 2, 14, 8);
    return;
  }
  var lean = pose === 'slide' ? face * 4 : 0, bob = pose === 'run' ? (Math.floor(P.anim * 10) % 2) * 2 : 0;
  // 다리
  ctx.fillStyle = '#2c2c3a'; ctx.fillRect(x + 5, y + 28 - bob, 5, 8 + bob); ctx.fillRect(x + 14, y + 28, 5, 8);
  // 몸
  ctx.fillStyle = ch.color; ctx.fillRect(x + 3 + lean, y + 15, 18, 15);
  if (ci === 1) { ctx.fillStyle = '#d8eeff'; ctx.fillRect(x + 1 + lean, y + 24, 22, 7); }
  // 머리
  ctx.fillStyle = '#ffd9b8'; ctx.fillRect(x + 5 + lean, y + 3, 14, 12);
  ctx.fillStyle = ch.dark; ctx.fillRect(x + 4 + lean, y + 1, 16, 5);
  if (ci === 0) { ctx.fillStyle = '#ffd24a'; ctx.fillRect(x + 6 + lean, y - 3, 3, 5); ctx.fillRect(x + 15 + lean, y - 3, 3, 5); ctx.fillStyle = ch.color; ctx.fillRect(x + (face > 0 ? -6 : 24), y + 22, 6, 4); }
  if (ci === 1) { ctx.fillStyle = '#bfe9ff'; ctx.fillRect(x + 7 + lean, y - 3, 10, 3); ctx.fillRect(x + 7 + lean, y - 6, 2, 3); ctx.fillRect(x + 11 + lean, y - 6, 2, 3); ctx.fillRect(x + 15 + lean, y - 6, 2, 3); }
  if (ci === 2) { ctx.fillStyle = ch.dark; ctx.fillRect(x + (face > 0 ? -4 : 20) + lean, y + 2, 8, 10); ctx.fillStyle = '#e8fff0'; ctx.fillRect(x + 3 + lean, y + 14, 18, 3); }
  // 눈
  ctx.fillStyle = '#1b1b28'; ctx.fillRect(x + (face > 0 ? 14 : 7) + lean, y + 8, 3, 3);
  // 공격·기술
  if (pose === 'atk' || pose === 'strike') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + (face > 0 ? 24 : -30), y + 10, 30, 4); ctx.fillRect(x + (face > 0 ? 24 : -30), y + 20, 22, 3); }
  if (pose === 'wind') { ctx.strokeStyle = 'rgba(230,255,240,0.8)'; ctx.lineWidth = 2; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + 12, y + 30 + i * 8, 16 - i * 3, 5, 0, 0, 7); ctx.stroke(); } ctx.lineWidth = 1; }
}
function drawEnemy(en) {
  var x = Math.round(en.x), y = Math.round(en.y);
  ctx.globalAlpha = en.dead ? Math.max(0, 1 - en.dead * 2) : 1;
  var hitFlash = en.stun > 0.3, frozen = en.stun > 0.5;
  ctx.imageSmoothingEnabled = true;
  ctx.save();
  if (REF.slime0 && en.type === 'g') {   // 시안 슬라임 세 장 (통통 → 납작 → 통통)
    var sfr = REF['slime' + [0, 1, 0, 2][Math.floor(en.t * 6) % 4]], sh = 30, sw = sfr.width / sfr.height * sh;
    ctx.translate(x + en.w / 2, y + en.h + 2); if ((en.face || -1) < 0) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = true;   // 시안 슬라임·박쥐는 오른쪽을 본다: 플레이어 쪽(en.face)으로 뒤집는다
    ctx.drawImage(sfr, -sw / 2, -sh, sw, sh);
  } else if (REF.bat0 && en.type !== 'g') {   // 시안 박쥐 세 장 (날갯짓)
    var bfr = REF['bat' + [0, 1, 2, 1][Math.floor(en.t * 10) % 4]], bh = 36, bw = bfr.width / bfr.height * bh;
    ctx.translate(x + en.w / 2, y + en.h / 2); if ((en.face || -1) < 0) ctx.scale(-1, 1); ctx.rotate(0.12); ctx.imageSmoothingEnabled = true; ctx.drawImage(bfr, -bw / 2, -bh / 2, bw, bh);   // 보는 쪽으로 살짝 기울임
  } else if (en.type === 'g') {   // 슬라임: 두 장을 번갈아 (통통 튀며 걷는다), 보는 쪽으로 뒤집는다
    var fr = Math.floor(en.t * 5) % 2, sp = ART.slime[fr];
    ctx.translate(x + en.w / 2, y + en.h); if (en.vx > 0) ctx.scale(-1, 1);
    ctx.drawImage(sp, -17, -26, 34, 28);
  } else {                 // 박쥐: 날개 두 장
    var bf = Math.floor(en.t * 10) % 2;
    ctx.drawImage(ART.bat[bf], x - 8, y - 4, 42, 26);
  }
  ctx.restore();
  if (hitFlash || frozen) { ctx.globalAlpha *= frozen ? 0.45 : 0.6; ctx.fillStyle = frozen ? '#bfeaff' : '#ffffff'; ctx.beginPath(); ctx.ellipse(x + en.w / 2, y + en.h / 2, en.w / 2 + 6, en.h / 2 + 4, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// ===== 골렘 몸짓 (2026-11-24 사용자 "보스의 움직임이 자연스럽도록 팔 다리 등이 움직이고 이동하는 방향으로 시선이 가도록") =====
// 시안 골렘 그림(311×198, 오른쪽을 봄)을 자리로 나눠 그린다: 다리 둘 → 몸통 → 머리 → 팔 둘. 자리는 그림 픽셀 좌표 [x, y, 폭, 높이]
var GRIG = { head: [118, 3, 130, 77], armB: [0, 78, 84, 120], armF: [228, 82, 83, 116], legB: [80, 146, 88, 52], legF: [168, 146, 60, 52],
  pivB: [70, 98], pivF: [240, 100] };
function golemPose(b) {
  var t = G.time || 0, ph = 0, amp = 0, look = 3, headY = 0, armOut = 0, lean = 0;
  if (b.state === 'idle' && b.moving) { ph = b.walk * 7; amp = 1; look = 3; }
  else if (b.state === 'charge') { ph = b.st * 16; amp = 1.5; look = 7; lean = 0.08; }
  if (b.state === 'idle' && b.turn > 0) look = -3;                              // 돌아서기 전에 먼저 고개를 돌린다
  if (b.state === 'recover' || b.state === 'stagger') { headY = 5; look = 0; armOut = b.state === 'stagger' ? 0.22 + Math.sin(t * 18) * 0.05 : 0.1; }
  if (b.state === 'roar') { headY = -4; armOut = 0.3; }
  var br = Math.sin(t * 2.2);                                                   // 숨쉬기
  return {
    legBy: -Math.max(0, Math.sin(ph)) * 5 * amp, legFy: -Math.max(0, -Math.sin(ph)) * 5 * amp,
    legBx: Math.cos(ph) * 3 * amp, legFx: -Math.cos(ph) * 3 * amp,
    body: -Math.abs(Math.sin(ph)) * 4 * amp + br * 1.5 * (amp ? 0 : 1),
    armB: Math.sin(ph) * 0.1 * amp + br * 0.02 - armOut * 0.6, armF: -Math.sin(ph) * 0.1 * amp - br * 0.02 + armOut * 0.6,
    look: look + Math.sin(t * 0.8) * (amp ? 0 : 1.5), headY: headY, lean: lean
  };
}
function drawGolemRig(b, img) {   // 2026-11-24 다시 고침 (사용자 "팔이 잔상처럼 보이고 여전히 분리된 부분", "캐릭터와 같이 매끄럽게"): 캐릭터 걷기와 같은 방식 — 다리 둘만 따로 번갈아 들고, 나머지 몸(팔·머리 포함)은 한 덩어리로 함께 출렁. 겹쳐 그리는 조각이 없어 잔상·틈이 생기지 않음
  var q = golemPose(b), W0 = img.width, H0 = img.height, lb = GRIG.legB, lf = GRIG.legF, by = Math.round(q.body);
  function part(r, dx, dy) { ctx.drawImage(img, r[0], r[1], r[2], r[3], r[0] + Math.round(dx), r[1] + Math.round(dy), r[2], r[3]); }
  ctx.rotate(q.lean);
  part([lb[0], lb[1], lb[2] + 2, lb[3]], q.legBx, q.legBy); part([lf[0] - 2, lf[1], lf[2] + 2, lf[3]], q.legFx, q.legFy);   // 다리: 번갈아 들고 앞뒤로 (가운데 2픽셀 겹침)
  ctx.save(); ctx.translate(0, by); ctx.beginPath(); ctx.rect(0, 0, W0, H0); ctx.rect(lb[0], lb[1] + 6, lb[2], lb[3] - 6); ctx.rect(lf[0], lf[1] + 6, lf[2], lf[3] - 6);
  ctx.clip('evenodd'); ctx.drawImage(img, 0, 0); ctx.restore();                // 윗몸 한 덩어리 (다리 위로 6픽셀 겹쳐 허리 틈이 없게)
}
function drawBoss(b) {
  if (b.state === 'dead') { ctx.globalAlpha = Math.max(0, 1 - b.dead); }
  if ((b.state === 'tele' && b.pattern === 'slam') || b.state === 'slam') {   // 내려찍을 자리: 땅 위 그림자와 보라 고리 (점점 진해짐)
    var sk = b.state === 'slam' ? Math.min(1, b.st / BOSS.slamT) : b.st / 0.8 * 0.5, scx = b.tx + b.w / 2, sgy = b.y0 + b.h;
    ctx.fillStyle = 'rgba(20,0,40,' + (0.25 + sk * 0.4) + ')'; ctx.beginPath(); ctx.ellipse(scx, sgy - 2, 60 + sk * 30, 12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(200,120,255,' + (0.5 + Math.sin(G.time * 30) * 0.3) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(scx, sgy - 2, BOSS.slamR, 16, 0, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
  }
  var x = Math.round(b.x), y = Math.round(b.y);
  var tele = b.state === 'tele' && Math.floor(b.st * 12) % 2;
  var col = tele ? (b.pattern === 'wave' ? '#ffb347' : '#ff6a5a') : (bossVulnerable(b) ? '#7ab8ff' : '#8b8478');
  if (GOLEM.img) {   // 골렘 그림 (원래 왼쪽을 봄). 판정 상자보다 크게, 발을 맞춰 그린다
    var atkPose = GOLEM.atk && (b.state === 'tele' || b.state === 'wave' || b.state === 'slam'), base = atkPose ? GOLEM.atk : GOLEM.img, tn = atkPose ? GOLEM.atkTint : GOLEM.tint;
    var rig = GOLEM.ref && !atkPose;                                             // 서 있기·걷기·돌진·빈틈은 몸짓 그림 (팔다리·머리가 움직임)
    var gh = GOLEM.ref ? (atkPose ? 150 : 170) : 150, gw = base.width / base.height * gh, kneel = b.state === 'kneel' ? 0.85 : 1;
    var src = tele ? tn[b.pattern === 'wave' ? '#ffb347' : '#ff5a4a'] : (bossVulnerable(b) ? tn['#7ab8ff'] : (b.state === 'charge' ? tn['#ff5a4a'] : base));
    // QA 뒤 (사용자 "색 대신 빛나는 테두리"): 예고·돌진 중에는 몸에 색을 입히지 않고, 골렘 윤곽을 따라 주황(충격파)·빨강(돌진)·보라(내려찍기) 빛이 크게 번진다
    var warnCol = GOLEM.ref && (b.state === 'tele' ? (b.pattern === 'wave' ? '#ffa030' : b.pattern === 'slam' ? '#c070ff' : '#ff3a2a') : (b.state === 'charge' ? '#ff3a2a' : b.state === 'slam' ? '#c070ff' : null));
    if (warnCol) src = base;
    if (bossVulnerable(b)) { ctx.fillStyle = 'rgba(122,208,255,' + (0.25 + Math.sin(G.time * 8) * 0.1) + ')'; ctx.beginPath(); ctx.ellipse(x + b.w / 2, y + b.h - 4, 70, 14, 0, 0, 7); ctx.fill(); }
    var squash = b.state === 'tele' ? 1 - Math.min(1, b.st / 0.8) * 0.08 : 1;   // 예고 동안 몸을 낮춘다 (힘을 모음)
    // 시안 골렘은 오른쪽을 본다 (머리·눈이 오른쪽): 왼쪽으로 갈 때 뒤집는다. 게임 2 골렘은 왼쪽을 봄
    ctx.save(); ctx.translate(x + b.w / 2, y + b.h); if (GOLEM.ref ? b.face < 0 : b.face > 0) ctx.scale(-1, 1); ctx.scale(1 / squash, kneel * squash);
    ctx.imageSmoothingEnabled = true;
    if (rig) {
      ctx.translate(-gw / 2, -gh + 6); ctx.scale(gw / base.width, gh / base.height);
      if (warnCol) { ctx.save(); ctx.shadowColor = warnCol; ctx.shadowBlur = 30; drawGolemRig(b, base); ctx.restore(); }
      drawGolemRig(b, src || base);
    } else {
      if (warnCol) { ctx.save(); ctx.shadowColor = warnCol; ctx.shadowBlur = tele || b.state === 'charge' ? 36 : 18; for (var gl = 0; gl < 3; gl++) ctx.drawImage(base, -gw / 2, -gh + 6, gw, gh); ctx.restore(); }
      ctx.drawImage(src || base, -gw / 2, -gh + (GOLEM.ref ? 6 : 0), gw, gh);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  } else {
    if (b.state === 'kneel') y += 20;
    ctx.fillStyle = col; ctx.fillRect(x + 8, y + 20, b.w - 16, b.h - 20); ctx.fillRect(x + 20, y, b.w - 40, 30);
    ctx.fillStyle = '#5e584e'; ctx.fillRect(x - 6, y + 34, 18, 50); ctx.fillRect(x + b.w - 12, y + 34, 18, 50);
    ctx.fillStyle = bossVulnerable(b) ? '#e0f4ff' : '#7cf0ff'; ctx.fillRect(x + 32, y + 10, 10, 8); ctx.fillRect(x + b.w - 42, y + 10, 10, 8);
    ctx.fillStyle = '#7cf0ff'; ctx.fillRect(x + b.w / 2 - 6, y + 50, 12, 12);
    ctx.globalAlpha = 1;
  }
  y = Math.round(b.y) - 38;
  if (b.state === 'tele') { ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = b.pattern === 'wave' ? '#ffb347' : b.pattern === 'slam' ? '#d58cff' : '#ff6a5a'; ctx.fillText(b.pattern === 'wave' ? '! 충격파' : b.pattern === 'slam' ? '! 내려찍기' : '! 돌진', x + b.w / 2, y - 14); }
  if (bossVulnerable(b)) { ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#7ad0ff'; ctx.fillText(b.state === 'kneel' ? '무방비' : (b.state === 'stagger' ? '비틀!' : '빈틈'), x + b.w / 2, y - 10); }
  // 보스 머리 위 반격 마름모 (게임 2 의 노란 마름모): 예고 동안 줄어들어 공격이 나가는 순간 안쪽과 겹친다. 마지막 0.3초가 반격 기회
  var mx = Math.round(b.x + b.w / 2), my = Math.round(b.y0 - 122);
  if (b.state === 'tele') {
    drawDiamondCue(mx, my, 1 - Math.min(1, b.st / 0.8), CUE_YEL, 15);
    if (counterOpen(b)) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; diamondPath(mx, my, 15); ctx.fillStyle = 'rgba(255,240,150,' + (0.35 + Math.sin(G.time * 50) * 0.25) + ')'; ctx.fill(); ctx.restore(); }
  } else if ((b.state === 'wave' || b.state === 'charge' || b.state === 'slam') && b.st < 0.18) {   // 공격이 나간 순간: 하얀 테두리가 퍼지며 사라진다
    var ee = b.st / 0.18; diamondPath(mx, my, 15 * (1 + 0.7 * ee)); ctx.globalAlpha = 1 - ee; ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.globalAlpha = 1;
  }
  if (G.counterFx) drawSuccessDiamond(G.counterFx.x, G.counterFx.y, G.counterFx.t, CUE_YEL, 15);
}
// 공격폼 기술 이펙트 (k: 0 → 1 진행)
function drawAtkFx(o, type, k, face) {
  var box = skillHitbox(o, type, face), cx = o.x + o.w / 2, fy = o.y + o.h;
  ctx.save();
  var fxImg = REF[{ claw: 'fx-dragon', spikes: 'fx-ice', upper: 'fx-wind' }[type]];
  if (fxImg) {   // 시안 이펙트 (불꽃 용·얼음 가시·회오리)를 판정 상자에 맞춰 그림
    ctx.imageSmoothingEnabled = true;
    var fade = k > 0.75 ? (1 - k) / 0.25 : 1; ctx.globalAlpha *= fade;
    if (type === 'claw') {          // 화염 할퀴기: 불꽃 용이 앞으로 튀어나가며 물어뜯음
      var ch = Math.max(48, box.h), cw = fxImg.width / fxImg.height * ch, push = Math.min(1, k * 3);
      ctx.translate(face > 0 ? box.x - 10 + push * 10 : box.x + box.w + 10 - push * 10, box.y + box.h / 2); if (face < 0) ctx.scale(-1, 1);
      ctx.scale(0.6 + push * 0.4, 0.6 + push * 0.4); ctx.drawImage(fxImg, -cw * 0.15, -ch / 2, cw, ch);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.4; ctx.drawImage(fxImg, -cw * 0.15, -ch / 2, cw, ch);
    } else if (type === 'spikes') { // 얼음 가시: 앞 땅에서 솟는다 (아래에서 자라 오름)
      var grow = Math.min(1, k * 2.5), iw = Math.max(box.w, 90), ih = fxImg.height / fxImg.width * iw * 1.25, ix = face > 0 ? o.x + o.w : o.x - iw;
      ctx.beginPath(); ctx.rect(ix - 4, fy - ih * grow, iw + 8, ih * grow + 2); ctx.clip();
      ctx.translate(ix + iw / 2, fy); if (face < 0) ctx.scale(-1, 1); ctx.drawImage(fxImg, -iw / 2, -ih, iw, ih);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.3; ctx.drawImage(fxImg, -iw / 2, -ih, iw, ih);
    } else {                        // 회오리 어퍼컷: 회오리 셋이 감아 올라감
      var uw = 80, uh = fxImg.height / fxImg.width * uw; ctx.globalCompositeOperation = 'lighter';
      for (var u = 0; u < 3; u++) { ctx.save(); ctx.translate(cx, fy - 10 - u * 22 - k * 30); ctx.scale(u % 2 ? -1 : 1, 0.75); ctx.rotate(k * 4 + u); ctx.drawImage(fxImg, -uw / 2, -uh / 2, uw, uh); ctx.restore(); }
    }
    ctx.restore();
    return;
  }
  if (type === 'claw') {          // 화염 할퀴기: 앞으로 긁는 불꽃 세 줄
    ctx.lineCap = 'round';
    for (var i = 0; i < 3; i++) {
      var a0 = -0.9 + i * 0.35, sweep = Math.min(1, k * 2.2 - i * 0.25); if (sweep <= 0) continue;
      ctx.strokeStyle = i === 1 ? '#ffe08a' : '#ff7a2a'; ctx.lineWidth = 6 - i;
      ctx.globalAlpha *= 1; ctx.beginPath();
      ctx.arc(cx + face * 10, o.y + 10 + i * 10, 34, face > 0 ? a0 : Math.PI - a0 - 1.4 * sweep, face > 0 ? a0 + 1.4 * sweep : Math.PI - a0);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,150,60,' + (0.5 * (1 - k)) + ')'; ctx.fillRect(box.x, box.y + 10, box.w, box.h - 20);
  } else if (type === 'spikes') {  // 얼음 가시: 앞 땅에서 솟는 가시
    var n = 5, grow = Math.min(1, k * 2.5), fade = k > 0.7 ? (1 - k) / 0.3 : 1;
    for (var j = 0; j < n; j++) {
      var sx = face > 0 ? o.x + o.w + 4 + j * 16 : o.x - 20 - j * 16, hh = (24 + (j % 2) * 14) * Math.max(0, Math.min(1, grow * 1.6 - j * 0.15));
      ctx.globalAlpha = fade; ctx.fillStyle = '#dff6ff'; ctx.strokeStyle = '#3f8fc4'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, fy); ctx.lineTo(sx + 8, fy - hh); ctx.lineTo(sx + 16, fy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9fd8f5'; ctx.beginPath(); ctx.moveTo(sx + 8, fy); ctx.lineTo(sx + 8, fy - hh); ctx.lineTo(sx + 16, fy); ctx.closePath(); ctx.fill();
    }
  } else if (type === 'upper') {   // 회오리 어퍼컷: 감아 올라가는 바람
    ctx.lineWidth = 3;
    for (var r = 0; r < 4; r++) {
      ctx.strokeStyle = r % 2 ? 'rgba(160,255,210,0.9)' : 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.ellipse(cx, fy - 8 - r * 16 - k * 10, 26 - r * 3, 7, Math.sin(k * 10 + r) * 0.2, k * 6 + r, k * 6 + r + 4.2); ctx.stroke();
    }
  }
  ctx.restore();
}
// ===== 시스템 글자 (보물!·연계!·반격! 등): 시안의 PERFECT 글자처럼 굵은 기울임, 위아래 그러데이션, 어두운 테두리, 뒤에 빛과 짧은 빛살 =====
// 2026-11-24 사용자 "문자 스타일을 perfect 의 스타일 형태로, 색상은 알아서". [위 색, 아래 색, 테두리, 빛]
var POP_STYLE = {
  '연계!': ['#f4ffff', '#3fc4ff', '#0b3550', '120,220,255'],      // 하늘 (이동 연계, 마름모와 같은 색)
  '반격!': ['#fffbe0', '#ffc400', '#4a2600', '255,215,64'],       // 게임 2 반격 노랑
  '보물!': ['#fffbe8', '#4fe0c8', '#0d3b36', '120,255,230'],      // 수정 청록 (보물 수정)
  '격파!': ['#fff3dc', '#ff6a2a', '#4a1200', '255,140,60'],       // 주홍
  '보스!': ['#ffe8f0', '#ff4a6a', '#40000f', '255,90,120'],       // 붉은 경고
  '무방비!': ['#eef8ff', '#7ab8ff', '#102a50', '140,200,255'],    // 빈틈 파랑
  _: ['#fffbe0', '#ffb030', '#4a2600', '255,200,80']             // 그 밖 (PERFECT 와 같은 금빛)
};
function fancyText(text, x, y, size, st) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'italic 900 ' + Math.round(size) + 'px "Malgun Gothic", sans-serif';
  var w = ctx.measureText(text).width, a = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';                                   // 뒤의 빛과 빛살
  ctx.save(); ctx.translate(x, y - size * 0.35); ctx.scale(1, 0.4);   // 뒤의 빛은 글자 모양에 맞춘 타원 (사각형으로 잘려 보이지 않게)
  var g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.7); g.addColorStop(0, 'rgba(' + st[3] + ',' + 0.5 * a + ')'); g.addColorStop(1, 'rgba(' + st[3] + ',0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, w * 0.7, 0, 7); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(' + st[3] + ',' + 0.7 * a + ')'; ctx.lineWidth = 2;
  for (var i = 0; i < 8; i++) { var an = i / 8 * Math.PI * 2 + 0.3, r0 = w * 0.42, r1 = w * (0.55 + (i % 2) * 0.15); ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y - size * 0.35 + Math.sin(an) * r0 * 0.45); ctx.lineTo(x + Math.cos(an) * r1, y - size * 0.35 + Math.sin(an) * r1 * 0.45); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.22); ctx.strokeStyle = st[2]; ctx.strokeText(text, x, y);   // 어두운 테두리
  var fg = ctx.createLinearGradient(0, y - size * 0.9, 0, y); fg.addColorStop(0, st[0]); fg.addColorStop(0.55, st[1]); fg.addColorStop(1, st[1]);
  ctx.fillStyle = fg; ctx.fillText(text, x, y);
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,' + 0.6 * a + ')'; ctx.strokeText(text, x, y - 1);   // 윗면 하이라이트
  ctx.restore();
}
// ===== 태그 신호 (2026-11-24 사용자 "좋은 판정을 얻을 수 있을 때 시각적인 피드백", 게임 2 의 줄어드는 마름모) =====
// 태그 기회가 열려 있는 동안 남은 몫 (1 → 0). 없으면 0
function tagCue() { var p = G.perfect; if (!p || p.used || G.time > p.until) return 0; return Math.max(0, (p.until - G.time) / (p.len || CFG.perfectWin)); }
// 게임 2 의 마름모 모양: 안쪽 마름모가 속이 차오르고, 바깥 마름모가 줄어들어 안쪽과 겹치는 순간이 끝. 검은 밑줄 위에 색 줄
// 색은 사용자 "반격 형태의 패링 말고는 톤앤매너에 맞는 하늘색 마름모" (PERFECT·이동 연계는 하늘색, 보스 반격만 게임 2 노랑)
var CUE_SKY = '#7fe6ff', CUE_YEL = '#ffd740', CUE_IN = 15;   // 게임 2 처럼 머리 위 (안쪽 마름모 크기 15)
function diamondPath(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); }
function drawDiamondCue(x, y, k, col, inS) {   // k: 남은 몫 1 → 0 (0 이 끝나는 순간)
  diamondPath(x, y, inS); ctx.fillStyle = col; ctx.globalAlpha = 0.12 + 0.45 * (1 - k); ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  diamondPath(x, y, inS * (1 + 1.4 * k)); ctx.globalAlpha = 0.4 + 0.6 * (1 - k);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke(); ctx.globalAlpha = 1;
}
function drawSuccessDiamond(x, y, t, col, inS) {   // 성공: 안쪽 마름모가 색으로 꽉 차 커지고 (게임 2 처럼), 하얀 테두리가 퍼지며 사라짐 (0.35초)
  var e = Math.min(1, t / 0.35), s = inS * (1 + 0.6 * e);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  var rgb = col === CUE_YEL ? '255,215,64' : '160,240,255', gl = ctx.createRadialGradient(x, y, 0, x, y, inS * 4); gl.addColorStop(0, 'rgba(' + rgb + ',' + 0.7 * (1 - e) + ')'); gl.addColorStop(1, 'rgba(' + rgb + ',0)'); ctx.fillStyle = gl; ctx.fillRect(x - inS * 4, y - inS * 4, inS * 8, inS * 8);
  ctx.restore();
  ctx.globalAlpha = 1 - e * 0.7;
  diamondPath(x, y, s); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  diamondPath(x, y, s * 0.45); ctx.fillStyle = '#ffffff'; ctx.fill();
  diamondPath(x, y, inS * (1 + 2.2 * e)); ctx.globalAlpha = 1 - e; ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  ctx.globalAlpha = 1;
}
function drawTagCue() {
  if (G.cueHit) drawSuccessDiamond(G.cueHit.x, G.cueHit.y, G.cueHit.t, CUE_SKY, CUE_IN);
  var f = tagCue(); if (!f) return;
  drawDiamondCue(P.x + P.w / 2, P.y - 54, f, CUE_SKY, CUE_IN);   // 머리 위 태그 수정 셋보다 위
}
// PERFECT 컷인: 들어오는 캐릭터 얼굴이 금빛 띠와 함께 오른쪽에서 들어와 멈췄다 빠진다 (0.5초)
function drawCutin() {
  var c = G.cutin; if (!c || !CH2.face[c.ci]) return;
  var t = c.t, inK = Math.min(1, t / 0.1), outK = t > 0.38 ? (t - 0.38) / 0.12 : 0, y = 104, bh = 86;
  var off = (1 - inK) * W * 0.6 - outK * W * 0.6, a = 1 - outK;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(off, 0);
  ctx.fillStyle = 'rgba(12,16,32,0.78)'; ctx.beginPath(); ctx.moveTo(0, y + 18); ctx.lineTo(W, y - 10); ctx.lineTo(W, y + bh - 18); ctx.lineTo(0, y + bh + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = CHARS[c.ci].color; ctx.globalAlpha = a * 0.55; ctx.fillRect(0, y + bh * 0.42, W, 6); ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y + 18); ctx.lineTo(W, y - 10); ctx.moveTo(0, y + bh + 10); ctx.lineTo(W, y + bh - 18); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.moveTo(0, y + 18); ctx.lineTo(W, y - 10); ctx.lineTo(W, y + bh - 18); ctx.lineTo(0, y + bh + 10); ctx.closePath(); ctx.clip();
  ctx.imageSmoothingEnabled = true; ctx.drawImage(CH2.face[c.ci], W * 0.56, y - 40, 170, 170); ctx.restore();
  ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(CHARS[c.ci].name + ' 태그!', W * 0.28, y + bh / 2 + 10);
  ctx.restore();
}
// ===== 합동 필살기 : 체인 에코 ver.2 (2026-11-24 사용자 레퍼런스 "합동 필살기_체인 에코 ver.2" + "플레아는 왼쪽, 오필리아는 오른쪽, 클로에는 가운데, 빠르게 겹쳐서, 범위는 화면 전체") =====
// ① 연계 시작 (세 명이 속성 빛을 두르고 나타남) ② 용의 돌진 (플레아, 왼쪽에서) ③ 얼음비 (오필리아, 오른쪽에서) ④ 폭풍 (클로에, 가운데) — ②③④ 는 겹침
// ⑤ 합동 컷신 (원을 셋으로 나눈 얼굴) ⑥ 합동 일격 준비 (셋이 모여 에너지 집약) ⑦ 합동 일격 (셋이 함께 화면을 가로지르는 빛줄기) ⑧ 마무리
var ULT = { end: 3.1, start: [0, 0.4], red: [0.15, 0.85], blue: [0.4, 1.1], wind: [0.65, 1.35], cut: [1.35, 1.85], prep: [1.85, 2.25], fin: [2.25, 2.8], after: [2.8, 3.1],
  hits: [0.6, 0.85, 1.1, 2.4], dmg: [1, 1, 1, 3], bossDmg: [2, 2, 2, 2] };
function ultIn(t, r) { return t >= r[0] && t < r[1]; }
function ultK(t, r) { return Math.max(0, Math.min(1, (t - r[0]) / (r[1] - r[0]))); }
function ultRnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
var ULT_COL = ['255,140,60', '127,230,255', '140,255,190'];
function ultSpot(x) {   // x 가까이에서 실제로 디딜 수 있는 땅 (2026-11-24 사용자 "바닥을 밟지도 않고"): 그 칸이 낭떠러지면 옆 칸으로
  var c0 = Math.floor(x / TS), r0 = Math.max(1, Math.floor((P.y - 4 * TS) / TS));
  for (var i = 0; i < 14; i++) { var c = c0 + (i % 2 ? (i + 1) / 2 : -i / 2); for (var r = r0; r < ROWS; r++) if ((solidAt(c, r) || oneAt(c, r)) && !solidAt(c, r - 1)) return { x: c * TS + TS / 2, y: r * TS }; }
  return { x: x, y: P.y + P.h };
}
function ultSpotR(x) {   // x 에서 오른쪽으로 처음 디딜 수 있는 땅 (셋이 겹치지 않게 나란히 설 때)
  var c0 = Math.floor(x / TS), r0 = Math.max(1, Math.floor((P.y - 4 * TS) / TS));
  for (var c = c0; c < c0 + 12; c++) for (var r = r0; r < ROWS; r++) if ((solidAt(c, r) || oneAt(c, r)) && !solidAt(c, r - 1)) return { x: c * TS + TS / 2, y: r * TS };
  return ultSpot(x);
}
function ultGhost(ci, n, x, gy, face, a, aura) {   // 필살기 속 캐릭터: 평소와 같은 크기(1배)로 발을 땅(gy)에 붙여 그림. aura 면 발밑에 속성 빛
  var im = CH2.fr[ci] && CH2.fr[ci][n]; if (!im || a <= 0) return;
  var key = ['red', 'blue', 'wind'][ci], w = im.width, h = im.height, ax = CH2_AX[key + '-' + n] !== undefined ? w * CH2_AX[key + '-' + n] : Math.min(w, 54) / 2;
  if (aura) { ctx.save(); ctx.globalAlpha = 0.5 * a; ctx.fillStyle = 'rgb(' + ULT_COL[ci] + ')'; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(gy), 22, 5, 0, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x), Math.round(gy + 2)); if (face < 0) ctx.scale(-1, 1); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(im, -Math.round(ax), -h, w, h); ctx.restore();
}
function drawUlt() {   // 월드 좌표. 화면 전체를 쓴다
  var t = G.ult.t, cam = G.cam, fy = P.y + P.h, L = cam, R = cam + W, C = cam + W / 2;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  var dim = t < ULT.after[0] ? Math.min(0.45, t * 2.5) : Math.max(0, (ULT.end - t) / 0.3 * 0.45);
  ctx.fillStyle = 'rgba(6,8,22,' + dim + ')'; ctx.fillRect(cam - 20, -60, W + 40, H + 120);
  var sp = [ultSpot(L + 150), ultSpot(R - 150), ultSpot(C)], pos = [sp[0].x, sp[1].x, sp[2].x], gy = [sp[0].y, sp[1].y, sp[2].y];   // ①~④ 자리: 플레아 왼쪽, 오필리아 오른쪽, 클로에 가운데 (실제 땅 위)
  if (t < ULT.wind[1]) {   // ① 연계 시작: 자기 공격이 끝난 캐릭터는 그 자리에 남아 속성 빛을 두름 (공격 전에는 화면 밖·보이지 않음)
    if (t >= ULT.red[1]) ultGhost(0, 'idle0', pos[0], gy[0], 1, 0.6, true);
    if (t >= ULT.blue[1]) ultGhost(1, 'idle0', pos[1], gy[1], -1, 0.6, true);
  }
  // 2026-11-24 사용자 에셋 (g3-ref "합동 필살기 컷신/화려한 원소 VFX 애니메이션 스프라이트 시트-1"): 장면마다 6장 그림을 넘겨 그림
  if (ultIn(t, ULT.red)) {   // ② 용의 돌진: 플레아가 왼쪽에서 불꽃 용이 되어 오른쪽으로, 땅에 불길
    var k = ultK(t, ULT.red), fa = k > 0.85 ? (1 - k) / 0.15 : 1, dsc = 2.3, dw = 256 * dsc, dh = 204 * dsc, dx = L - dw * 0.55 + k * (W + dw * 0.3);
    ctx.globalCompositeOperation = 'lighter';
    for (var f = 0; f < 22; f++) { var fx = L + f * 46; if (fx > dx + dw * 0.6) continue; var fl = 0.5 + Math.sin(t * 30 + f) * 0.2, g = ctx.createRadialGradient(fx, fy - 12, 2, fx, fy - 12, 56); g.addColorStop(0, 'rgba(255,160,60,' + 0.45 * fl * fa + ')'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.fillRect(fx - 64, fy - 74, 128, 84); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fa;
    var dfr = ultFr('dragon', k); if (dfr) uDraw(dfr, dx, fy - dh + 30, dw, dh);
    ctx.globalAlpha = 1; var ke = Math.min(1, k / 0.35), ee = 1 - Math.pow(1 - ke, 3); ultGhost(0, ke < 1 ? 'sp1' : 'atk2', L - 70 + (pos[0] - L + 70) * ee, gy[0] - (1 - ee) * 70, 1, 1, ke >= 1);   // 플레아: 왼쪽 화면 밖에서 불꽃 돌진으로 날아 들어와 땅에 내려서며 공격
  }
  if (ultIn(t, ULT.blue)) {   // ③ 얼음비: 오필리아가 오른쪽에서 — 얼음 창이 화면 전체에 쏟아지고 땅에 수정이 솟는다 (그림 넷을 나란히, 조금씩 어긋나게)
    var kb = ultK(t, ULT.blue), fb = kb > 0.85 ? (1 - kb) / 0.15 : 1, isc = 1.55, iw = 256 * isc, ih = 204 * isc;
    var kbe = Math.min(1, kb / 0.35), eb = 1 - Math.pow(1 - kbe, 3); ultGhost(1, kbe < 1 ? 'sp1' : 'atk2', R + 70 - (R + 70 - pos[1]) * eb, gy[1] - (1 - eb) * 70, -1, 1, kbe >= 1);   // 오필리아: 오른쪽 화면 밖에서 얼음을 타고 날아 들어와 내려서며 공격
    ctx.globalAlpha = fb;
    for (var c = 0; c < 4; c++) { var ifr = ultFr('ice', Math.max(0, Math.min(0.999, kb * 1.25 - (3 - c) * 0.08))); if (ifr) uDraw(ifr, L - 40 + c * (W + 80) / 4 - iw * 0.1, fy - ih + 14, iw, ih); }
    ctx.globalAlpha = 1;
  }
  if (ultIn(t, ULT.wind)) {   // ④ 폭풍: 클로에가 가운데에서 — 큰 회오리 하나와 양옆의 작은 회오리
    var kw = ultK(t, ULT.wind), fw = kw > 0.85 ? (1 - kw) / 0.15 : 1, wsc = 2.6;
    var kwe = Math.min(1, kw / 0.2); ultGhost(2, kwe < 1 ? 'sp0' : 'atk2', pos[2], gy[2] - (1 - kwe) * 24, 1, Math.min(1, kw * 8), true);   // 클로에: 가운데에서 바람과 함께 솟아 나타나 공격
    ctx.globalAlpha = fw * 0.8;
    var wf2 = ultFr('wind', Math.max(0, kw - 0.15)); if (wf2) { uDraw(wf2, L - 60, fy - 204 * 1.5 + 20, 256 * 1.5, 204 * 1.5); ctx.save(); ctx.translate(R + 60, 0); ctx.scale(-1, 1); uDraw(wf2, 0, fy - 204 * 1.5 + 20, 256 * 1.5, 204 * 1.5); ctx.restore(); }
    ctx.globalAlpha = fw;
    var wfr = ultFr('wind', kw); if (wfr) uDraw(wfr, C - 128 * wsc, fy - 204 * wsc + 40, 256 * wsc, 204 * wsc);
    ctx.globalAlpha = 1;
  }
  if (ultIn(t, ULT.prep) || ultIn(t, ULT.fin) || ultIn(t, ULT.after)) {   // ⑥⑦⑧ 셋이 왼쪽에 모여서
    var g0 = ultSpot(L + 150), g1 = ultSpotR(g0.x + 56), gs = [g0, g1, ultSpotR(g1.x + 56)], gx = [gs[0].x, gs[1].x, gs[2].x], inP = ultIn(t, ULT.prep), inF = ultIn(t, ULT.fin), kf = ultK(t, ULT.fin), dash = inF ? Math.min(1, kf * 3) * 60 : 0, fa2 = ultIn(t, ULT.after) ? Math.max(0, 1 - ultK(t, ULT.after)) : 1;
    for (var i = 0; i < 3; i++) ultGhost(i, inF ? 'atk2' : 'idle0', gx[i] + dash * 0.3, gs[i].y, 1, fa2, true);
    if (inP) {   // ⑥ 에너지 집약: 위쪽에 별빛, 세 속성 빛이 가운데로 모임
      var kp = ultK(t, ULT.prep), sx0 = Math.round(gx[1]), sy0 = Math.round(gs[1].y - 150), sz = Math.round(3 + kp * 6);   // 도트 별: 십자와 가운데 네모가 커짐
      ctx.fillStyle = 'rgba(255,245,210,' + (0.5 + kp * 0.5) + ')'; ctx.fillRect(sx0 - sz * 8, sy0 - 1, sz * 16, 3); ctx.fillRect(sx0 - 1, sy0 - sz * 5, 3, sz * 10); ctx.fillStyle = '#fff'; ctx.fillRect(sx0 - sz, sy0 - sz, sz * 2, sz * 2);
      for (var e = 0; e < 3; e++) { var ex0 = gx[e], ey0 = gs[e].y - 30, mx = Math.round(ex0 + (sx0 - ex0) * kp), my = Math.round(ey0 + (sy0 - ey0) * kp); ctx.fillStyle = 'rgb(' + ULT_COL[e] + ')'; ctx.fillRect(mx - 4, my - 4, 8, 8); ctx.fillStyle = 'rgba(' + ULT_COL[e] + ',0.4)'; ctx.fillRect(mx - 7, my - 7, 14, 14); }   // 세 속성 알갱이가 별로 모임
    }
    if (inF) {   // ⑦ 합동 일격 (2026-11-24 사용자 에셋 "협동 필살기 최종 타격 ver.2" 8장): 셋 앞에서 오른쪽 화면 끝까지 — 화룡·얼음·바람이 한 줄기로 뻗어 끝에서 터짐. 3픽셀 도트, 바닥에 붙여
      var gby = gs[1].y, bx0 = gx[2] - 10, bw = R + 40 - bx0, bh = bw * 271 / 724, ffr = ultFr('fin', Math.min(0.999, kf));
      if (ffr) uDraw(ffr, bx0, gby + 14 - bh, bw, bh);
      ctx.globalAlpha = 1;
    }
  }
  (G.ultHits || []).forEach(function (h) {   // 맞은 자리: 도트 십자 불꽃 (속성 색)
    var k = h.t / 0.3, s = Math.round(3 + k * 5), col = ['255,150,70', '160,230,255', '150,255,200', '255,240,190'][h.c], x = Math.round(h.x), y = Math.round(h.y);
    ctx.fillStyle = 'rgba(' + col + ',' + (1 - k) + ')'; ctx.fillRect(x - s * 4, y - 1, s * 8, 3); ctx.fillRect(x - 1, y - s * 4, 3, s * 8);
    ctx.fillStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.fillRect(x - s, y - s, s * 2, s * 2);
  });
  ctx.restore();
}
function uDraw(img, x, y, w, h) { drawPix(img, x, y, w, h, 3); }   // 필살기 그림은 3픽셀 도트로 (배경 도트 굵기에 맞춤)
var ULT_PANEL = [['#3a0808', '#ff6a2a'], ['#081a4a', '#6fc8ff'], ['#06301f', '#7affc0']];
function drawUltScreen() {   // 화면 좌표: ① 제목, ⑤ 원을 셋으로 나눈 합동 컷신
  if (!G.ult) return;
  var t = G.ult.t;
  if (ultIn(t, ULT.cut)) {   // ⑤ 합동 컷신: 세 얼굴 원 (사용자 에셋을 도트로 줄인 그림, 부드럽게 하지 않고 키워 도트가 보이게)
    var t4 = t - ULT.cut[0], end = ULT.cut[1] - ULT.cut[0], k = Math.min(1, t4 / 0.12), cx = W / 2, cy = H / 2, fimg = ULTIMG.faces, sz = 450 * (0.7 + k * 0.3);
    ctx.save(); ctx.fillStyle = 'rgba(5,6,15,0.92)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';   // 원 둘레를 도는 세 속성 빛 (네모 알갱이)
    for (var e = 0; e < 3; e++) for (var q = 0; q < 10; q++) { var an = t4 * 5 + e * 2.094 + q * 0.09, rr = sz * 0.5 + 24; ctx.fillStyle = 'rgba(' + ULT_COL[e] + ',' + (0.7 - q * 0.06) + ')'; var ps = Math.round(7 - q * 0.5); ctx.fillRect(Math.round(cx + Math.cos(an) * rr - ps / 2), Math.round(cy + Math.sin(an) * rr - ps / 2), ps, ps); }
    ctx.globalCompositeOperation = 'source-over';
    if (fimg) { ctx.imageSmoothingEnabled = false; var fh = sz * fimg.height / fimg.width; ctx.drawImage(fimg, Math.round(cx - sz / 2), Math.round(cy - fh / 2), Math.round(sz), Math.round(fh)); ctx.imageSmoothingEnabled = true; }
    if (t4 > end - 0.1) { ctx.fillStyle = 'rgba(255,250,235,' + (t4 - (end - 0.1)) / 0.1 * 0.7 + ')'; ctx.fillRect(0, 0, W, H); }
    ctx.restore();
    return;
  }
  if (t < ULT.wind[1]) fancyText('체인 에코', W / 2, 140, 40 * (t < 0.12 ? 0.7 + t / 0.12 * 0.3 : 1), POP_STYLE._);   // ① 연계 시작
}
var ULTIMG = { dragon: [], ice: [], wind: [], beam: [], boom: [], fin: [], faces: null };   // 합동 필살기 그림 (assets/ult/)
function ultFr(n, k) { var a = ULTIMG[n], c = n === 'fin' ? 8 : 6; return a && a[Math.max(0, Math.min(c - 1, Math.floor(k * c)))]; }
// 체인 에코를 쓸 수 있을 때 (2026-11-24 사용자 "아우라도 문제가 많아" → 도트로 다시): 발밑에 세 속성 색이 번갈아 도는 작은 빛, 몸 둘레로 불·얼음·바람 색 네모 알갱이가 천천히 솟음
// layer 'back' 은 캐릭터 뒤(발밑 빛과 알갱이 절반), 'front' 는 앞(나머지 알갱이)
function drawUltReady(layer) {
  if (G.gauge < 100 || G.ult || G.dying > 0 || G.doorAnim) return;
  var cx = Math.round(P.x + P.w / 2), fy = Math.round(P.y + P.h), t = G.time, cols = ['255,120,50', '110,205,255', '90,235,160'];
  ctx.save();
  if (layer === 'back') {
    var ci = Math.floor(t * 2) % 3, pul = 0.35 + Math.sin(t * 6) * 0.1;
    ctx.fillStyle = 'rgba(' + cols[ci] + ',' + pul + ')'; ctx.fillRect(cx - 14, fy - 1, 28, 3); ctx.fillRect(cx - 10, fy - 3, 20, 2);
  }
  for (var i = 0; i < 16; i++) {
    if ((i % 2 === 0) !== (layer === 'back')) continue;
    var ph = (t * 0.7 + i / 16) % 1, side = i % 4 < 2 ? -1 : 1, x = cx + side * (9 + (i * 5) % 8) + Math.round(Math.sin(ph * 9 + i) * 3), y = fy - 4 - Math.round(ph * 46), a = Math.min(1, Math.sin(ph * Math.PI) * 1.3), s = ph < 0.6 ? 4 : 3;
    ctx.fillStyle = 'rgba(' + cols[i % 3] + ',' + a + ')'; ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}
function boss() { return G.enemies && G.enemies.filter(function (e) { return e.type === 'B'; })[0]; }
// ===== 표지판 안내 (2026-11-24 사용자 "설명이 필요한 시점에는 표지판을 만들어서 설명을 볼 수 있게"): 힌트 자리마다 나무 표지판,
// 가까이(약 2칸) 가면 그 위에 말풍선이 열리고 멀어지면 닫힌다. 아직 안 읽은 표지판 위에는 '!' 가 뛴다. 글의 [S] 같은 것은 키 모양으로, \n 은 줄 바꿈
function signSpot(h) {   // 표지판이 설 땅 (그 칸에서 위에서부터 처음 만나는 땅·발판 위). 없으면 null
  if (h.sy !== undefined) return h.sy === null ? null : h;
  var g = G.lv.g; h.sx = h.c * TS + TS / 2; h.sy = null;
  for (var r = 1; r < ROWS; r++) if ((g[r][h.c] === '#' || g[r][h.c] === '=') && g[r - 1][h.c] !== '#') { h.sy = r * TS; break; }
  return h.sy === null ? null : h;
}
function activeHint() {
  if (G.ult) return null;
  var cx = P.x + P.w / 2, cy = P.y + P.h, best = null, bd = 1e9;
  G.lv.hints.forEach(function (h) { if (!signSpot(h)) return; var d = Math.abs(h.sx - cx); if (d < 2.2 * TS && Math.abs(h.sy - cy) < 5 * TS && d < bd) { bd = d; best = h; } });
  if (best) best.read = true;
  return best;
}
function drawSigns() {   // 월드 안 (카메라 이동 안에서)
  var im = REF.sign; if (!im) return;
  ctx.imageSmoothingEnabled = true;
  G.lv.hints.forEach(function (h) {
    if (!signSpot(h) || h.sx < G.cam - 60 || h.sx > G.cam + W + 60) return;
    var w = 34, hh = im.height / im.width * w;
    ctx.drawImage(im, h.sx - w / 2, h.sy - hh + 2, w, hh);
    if (!h.read) {   // 안 읽은 표지판: 위에서 통통 뛰는 '!'
      var by = h.sy - hh - 14 + Math.sin(G.time * 5) * 3;
      if (UIIMG.bang) { ctx.drawImage(UIIMG.bang, h.sx - 11, by - 13, 22, 24); } else { ctx.save(); ctx.beginPath(); ctx.arc(h.sx, by, 9, 0, 7); ctx.fillStyle = '#ffd24a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#4a2600'; ctx.stroke();
      ctx.fillStyle = '#4a2600'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', h.sx, by + 5); ctx.restore(); }
    }
  });
}
// 한 줄을 글과 [키] 조각으로 나눠 폭을 재고 그린다
function richParts(line) { var out = [], re = /\[([^\]]+)\]/g, last = 0, m; while ((m = re.exec(line))) { if (m.index > last) out.push({ t: line.slice(last, m.index) }); out.push({ k: m[1] }); last = re.lastIndex; } if (last < line.length) out.push({ t: line.slice(last) }); return out; }
function richWidth(parts, font) { ctx.font = font; var w = 0; parts.forEach(function (p) { if (p.k) { ctx.font = 'bold 13px sans-serif'; w += ctx.measureText(p.k).width + 14 + 4; ctx.font = font; } else w += ctx.measureText(p.t).width; }); return w; }
function richDraw(parts, x, y, font, col) {
  parts.forEach(function (p) {
    if (p.k) { ctx.font = 'bold 13px sans-serif'; var kw = ctx.measureText(p.k).width + 14;
      ctx.fillStyle = '#2b3150'; ctx.fillRect(x, y - 15, kw, 21); ctx.fillStyle = '#4a5280'; ctx.fillRect(x, y - 15, kw, 17); ctx.strokeStyle = '#e2bd72'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y - 14.5, kw - 1, 20);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(p.k, x + 7, y); x += kw + 4; }
    else { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(p.t, x, y); x += ctx.measureText(p.t).width; }
  });
}
function drawHint() {   // 말풍선 (화면 좌표): 표지판 위, 화면 밖으로 나가지 않게. 글은 '제목 줄들||설명 줄들' (|| 가 없으면 모두 제목)
  var h = activeHint(); if (!h) return;
  var sp = h.text.split('||'), tl = sp[0].split('\n'), dl = sp[1] ? sp[1].split('\n') : [];
  var TF = 'bold 16px "Malgun Gothic", sans-serif', DF = '14px "Malgun Gothic", sans-serif';
  var items = tl.map(function (l) { return { p: richParts(l), f: TF, c: '#ffe9b0', h: 23 }; }).concat(dl.map(function (l) { return { p: richParts(l), f: DF, c: '#eef2f8', h: 21 }; }));
  var bw = Math.max.apply(null, items.map(function (it) { return richWidth(it.p, it.f); })) + 28, bh = 14 + items.reduce(function (s, it) { return s + it.h; }, 0);
  var sxs = h.sx - G.cam, top = h.sy - 64 - bh;                          // 표지판 머리 위
  var bx = Math.max(8, Math.min(W - 8 - bw, sxs - bw / 2)), by = Math.max(HUD_STYLE === 'top' && bx < 262 ? 132 : 64, top);
  // 2026-11-24 사용자 "테두리가 너무 굵고 시야를 가릴 정도": 틀 모서리를 그림 26 픽셀 → 화면 9 픽셀로 얇게, 안쪽은 조금 비치게
  if (UIIMG['frame-wide']) { ctx.save(); ctx.globalAlpha = 0.93; draw9(UIIMG['frame-wide'], 26, bx - 3, by - 3, bw + 6, bh + 6, 9); ctx.restore(); } else hudPanel(bx, by, bw, bh);
  var tx = Math.max(bx + 12, Math.min(bx + bw - 12, sxs)); ctx.fillStyle = 'rgba(12,16,32,0.86)'; ctx.beginPath(); ctx.moveTo(tx - 7, by + bh + 2); ctx.lineTo(tx + 7, by + bh + 2); ctx.lineTo(tx, by + bh + 11); ctx.closePath(); ctx.fill();   // 꼬리
  ctx.strokeStyle = '#c9a25a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx - 7, by + bh + 2); ctx.lineTo(tx, by + bh + 11); ctx.lineTo(tx + 7, by + bh + 2); ctx.stroke(); ctx.lineWidth = 1;
  var yy = by + 7; items.forEach(function (it) { yy += it.h; richDraw(it.p, bx + 14, yy - 5, it.f, it.c); });
}
// ===== HUD (2026-11-24 사용자 "태그와 피격x, 보물, 연계 게이지, 폼 체인지 등이 게임의 톤앤매너와 맞게"): 남색 판에 청동·금 테두리, 수정 보석 =====
var HUDC = { panel: 'rgba(12,16,32,0.86)', rim: '#7a5a2a', gold: '#e2bd72', dim: '#8d93a8', sky: '#7fe6ff' };
function hudPanel(x, y, w, h) {   // 모서리를 깎은 판 + 청동 바깥선 + 금 안쪽선 + 양옆 작은 보석
  function path(o) { var c = 5 - o; ctx.beginPath(); ctx.moveTo(x + o + c, y + o); ctx.lineTo(x + w - o - c, y + o); ctx.lineTo(x + w - o, y + o + c); ctx.lineTo(x + w - o, y + h - o - c); ctx.lineTo(x + w - o - c, y + h - o); ctx.lineTo(x + o + c, y + h - o); ctx.lineTo(x + o, y + h - o - c); ctx.lineTo(x + o, y + o + c); ctx.closePath(); }
  path(0); ctx.fillStyle = HUDC.panel; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = HUDC.rim; ctx.stroke();
  path(2.5); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(226,189,114,0.75)'; ctx.stroke();
  [[x, y + h / 2], [x + w, y + h / 2]].forEach(function (p) { diamondPath(p[0], p[1], 4); ctx.fillStyle = HUDC.gold; ctx.fill(); ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 1; ctx.stroke(); });
}
function hudLabel(t, x, y, col) { ctx.font = 'bold 12px "Malgun Gothic", sans-serif';   // 한글은 12 픽셀 아래면 획이 뭉개져 자글거림
  ctx.textAlign = 'left'; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1); ctx.fillStyle = col || HUDC.gold; ctx.fillText(t, x, y); }
function gem(cx, cy, full, part) {   // 세로로 긴 수정 (태그 스택 한 칸). part: 차오르는 몫 (0~1)
  function p() { ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx + 5, cy + 12); ctx.lineTo(cx - 5, cy + 12); ctx.lineTo(cx - 8, cy - 4); ctx.closePath(); }
  p(); ctx.fillStyle = '#1a2036'; ctx.fill();
  if (full || part > 0) {
    ctx.save(); p(); ctx.clip(); var top = full ? cy - 13 : cy + 12 - 25 * part;
    var g = ctx.createLinearGradient(0, cy - 13, 0, cy + 12); g.addColorStop(0, full ? '#f2fdff' : '#9fdcf0'); g.addColorStop(0.45, full ? '#7fe6ff' : '#4b8fb0'); g.addColorStop(1, full ? '#2a8fd0' : '#24506a');
    ctx.fillStyle = g; ctx.fillRect(cx - 9, top, 18, cy + 12 - top);
    if (full) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(cx - 1, cy - 10); ctx.lineTo(cx - 5, cy - 3); ctx.lineTo(cx - 2, cy + 2); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  p(); ctx.lineWidth = 2; ctx.strokeStyle = full ? '#0f3550' : '#4a5470'; ctx.stroke();
}
function star5(cx, cy, r, fill, line) { ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = line; ctx.stroke(); }
function keyCap(t, x, y) {   // 키 모양 작은 판 (예: Shift, E)
  ctx.font = 'bold 12px sans-serif'; var w = ctx.measureText(t).width + 10;
  ctx.fillStyle = '#2b3150'; ctx.fillRect(x, y, w, 16); ctx.fillStyle = '#454d75'; ctx.fillRect(x, y, w, 13); ctx.strokeStyle = HUDC.gold; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 15);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(t, x + 5, y + 11); return w;
}
function drawHUDBottom() {   // 예전 배치: 아래 판 (?hud=bottom)
  ctx.textAlign = 'left';
  // 체력: 판 위 하트 셋
  hudPanel(8, 6, 106, 34);
  for (var i = 0; i < G.hpMax; i++) { ctx.fillStyle = '#1a0a10'; heart(19 + i * 31, 14); ctx.fillStyle = i < G.hp ? '#ff4d5e' : '#3a3f55'; heart(18 + i * 31, 13); if (i < G.hp) { ctx.fillStyle = '#ffb0b8'; ctx.fillRect(22 + i * 31, 17, 4, 4); } }
  drawHUDTopRight();
  // 아래 판: 캐릭터 칸 · 태그 수정 · 연계 게이지 · 폼
  hudPanel(8, H - 86, 644, 78);
  for (var c = 0; c < 3; c++) {
    var x = 20 + c * 64, y = H - 77, has = G.lv.chars.indexOf(c) >= 0, cur = P.char === c, S = 54;
    if (cur) { ctx.save(); ctx.shadowColor = 'rgba(255,214,120,0.9)'; ctx.shadowBlur = 12; ctx.fillStyle = HUDC.gold; ctx.fillRect(x - 3, y - 3, S + 6, S + 6); ctx.restore(); }
    else { ctx.fillStyle = HUDC.rim; ctx.fillRect(x - 2, y - 2, S + 4, S + 4); }
    ctx.fillStyle = has ? CHARS[c].dark : '#20263a'; ctx.fillRect(x, y, S, S);
    var fim = SPR.img[c], fface = CH2.face[c];
    if (fface) {   // 얼굴 칸: 캐릭터 시안의 큰 그림에서 잘라 둔 얼굴 (assets/char/*-face.png, 셋 다 클로에와 같은 자리·크기)
      ctx.save(); ctx.globalAlpha = has ? 1 : 0.3; ctx.imageSmoothingEnabled = true; ctx.drawImage(fface, x, y, S, S); ctx.restore();
    } else if (fim) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip(); ctx.globalAlpha = has ? 1 : 0.35;
      var fc = SPR.faceAt[c], sw = fim.height * 0.4, sx0 = fim.width * fc[0] - sw / 2, sy0 = fim.height * fc[1] - sw / 2;
      ctx.imageSmoothingEnabled = true; ctx.drawImage(fim, sx0, sy0, sw, sw, x, y, S, S); ctx.restore();
    }
    if (!cur) { ctx.fillStyle = 'rgba(8,10,20,0.28)'; ctx.fillRect(x, y, S, S); }   // 기다리는 칸은 살짝 어둡게
    if (has && !cur && tagCue() > 0) {   // 태그 기회 동안 기다리는 캐릭터 칸이 하늘빛으로 깜빡인다 (지금 누르면 좋다)
      var cp = 0.6 + Math.sin(G.time * 40) * 0.4; ctx.strokeStyle = 'rgba(127,230,255,' + cp + ')'; ctx.lineWidth = 3; ctx.strokeRect(x - 3, y - 3, S + 6, S + 6); ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(160,240,255,' + cp * 0.22 + ')'; ctx.fillRect(x, y, S, S);
    }
    if (has && G.refundLock && G.time < G.refundLock[c]) {   // 돌려받기 대기: 오른쪽 위 작은 시계
      var lk = (G.refundLock[c] - G.time) / CFG.refundLock; ctx.fillStyle = 'rgba(10,14,26,0.85)'; ctx.beginPath(); ctx.arc(x + S - 9, y + 9, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#9aa6bb'; ctx.beginPath(); ctx.moveTo(x + S - 9, y + 9); ctx.arc(x + S - 9, y + 9, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lk); ctx.closePath(); ctx.fill();
    }
    var ng = ctx.createLinearGradient(0, y + S - 16, 0, y + S); ng.addColorStop(0, 'rgba(0,0,0,0)'); ng.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = ng; ctx.fillRect(x, y + S - 18, S, 18);
    ctx.font = 'bold 11px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = has ? '#fff' : HUDC.dim; ctx.fillText(has ? CHARS[c].name : '잠김', x + S / 2, y + S - 4);
    diamondPath(x + 9, y + 9, 10); ctx.fillStyle = has ? CHARS[c].dark : '#2a2f40'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cur ? '#fff2c0' : HUDC.gold; ctx.stroke();   // 키 보석
    ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(CHARS[c].key, x + 9, y + 13);
  }
  // 태그 스택: 수정 셋 (다음 수정은 아래에서부터 차오른다)
  var shake = G.stackShake > 0 ? Math.sin(G.time * 60) * 3 : 0, sx = 222 + shake;
  hudLabel('태그', sx - 2, H - 68);
  for (var s = 0; s < CFG.stackMax; s++) gem(sx + 8 + s * 22, H - 41, s < G.stack, s === G.stack ? G.regen / CFG.stackRegen : 0);
  if (G.stackFlash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, G.stackFlash * 1.6); ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 2; ctx.strokeRect(sx - 4, H - 58, CFG.stackMax * 22 + 2, 32); fancyText('+1', sx + CFG.stackMax * 22 + 10, H - 56 - (0.6 - G.stackFlash) * 20, 18, POP_STYLE['연계!']); ctx.restore(); }   // 이동 연계로 돌려받은 스택
  // 연계 게이지: 청동 틀, 보라빛 기운이 차오름. 가득 차면 금빛으로 일렁이며 E
  var gx = 310, gy = H - 50, gw = 214, full = G.gauge >= 100;
  hudLabel('연계 게이지', gx, H - 62);
  ctx.fillStyle = HUDC.rim; ctx.fillRect(gx - 3, gy - 3, gw + 6, 20); ctx.fillStyle = '#10142a'; ctx.fillRect(gx, gy, gw, 14);
  var gf = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  if (full) { var shn = 0.15 + (G.time * 0.8) % 0.7; gf.addColorStop(0, '#ff9a3a'); gf.addColorStop(shn - 0.15, '#ffd24a'); gf.addColorStop(shn, '#fff6c0'); gf.addColorStop(shn + 0.15, '#ffd24a'); gf.addColorStop(1, '#ff9a3a'); }
  else { gf.addColorStop(0, '#5a3cff'); gf.addColorStop(0.6, '#b46cff'); gf.addColorStop(1, '#ff8ad8'); }
  ctx.fillStyle = gf; ctx.fillRect(gx, gy, gw * G.gauge / 100, 14); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx, gy, gw * G.gauge / 100, 3);
  for (var q = 1; q < 4; q++) { ctx.fillStyle = 'rgba(226,189,114,0.6)'; ctx.fillRect(gx + gw * q / 4, gy, 1, 14); }
  ctx.strokeStyle = HUDC.gold; ctx.lineWidth = 1; ctx.strokeRect(gx - 0.5, gy - 0.5, gw + 1, 15);
  if (full) { var kw = keyCap('E', gx + gw - 82, H - 74); hudLabel('체인 에코', gx + gw - 78 + kw, H - 62, '#fff2c0'); }
  // 폼: Shift 키 + 지금 폼 (이동폼 하늘 날개, 공격폼 주황 칼날)
  var atkF = G.form === 'atk', fx0 = 546;
  keyCap('Shift', fx0, H - 76); hudLabel('폼 바꾸기', fx0 + 44, H - 64, HUDC.dim);
  ctx.save(); ctx.translate(fx0 + 14, H - 34); ctx.lineWidth = 3; ctx.lineCap = 'round';
  if (atkF) { ctx.strokeStyle = '#ff9a5a'; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(9, -10); ctx.moveTo(-9, -10); ctx.lineTo(9, 8); ctx.stroke(); ctx.fillStyle = '#ffe0c0'; ctx.fillRect(-2, -2, 4, 4); }
  else { ctx.strokeStyle = '#7fe6ff'; ctx.beginPath(); ctx.moveTo(-10, 6); ctx.quadraticCurveTo(-2, -12, 10, -10); ctx.moveTo(-10, 6); ctx.quadraticCurveTo(0, -2, 10, -2); ctx.moveTo(-10, 6); ctx.quadraticCurveTo(2, 4, 10, 6); ctx.stroke(); }
  ctx.restore();
  ctx.font = 'italic 900 17px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = atkF ? '#4a1600' : '#0b3550'; ctx.strokeText(atkF ? '공격폼' : '이동폼', fx0 + 32, H - 27);
  ctx.fillStyle = atkF ? '#ffb070' : '#a8f0ff'; ctx.fillText(atkF ? '공격폼' : '이동폼', fx0 + 32, H - 27); ctx.lineWidth = 1;
  if (DEBUG) drawHUDDebug();
}
function drawHUDTopRight() {   // 두 배치가 함께 쓰는 위쪽: 스테이지와 시간, 별 조건, 보스 체력
  // 스테이지와 시간: 가운데 띠
  ctx.font = 'bold 15px "Malgun Gothic", sans-serif'; var tn = G.lv.name, tm = G.runTime.toFixed(1) + '초', tw = ctx.measureText(tn).width + ctx.measureText(tm).width + 46;
  hudPanel(W / 2 - tw / 2, 6, tw, 30);
  ctx.font = 'bold 15px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(tn, W / 2 - tw / 2 + 16, 27); ctx.fillStyle = HUDC.gold; ctx.textAlign = 'right'; ctx.fillText(tm, W / 2 + tw / 2 - 14, 27);
  // 이번 판 별 조건: 안 맞기 (맞으면 꺼짐), 보물 (얻으면 켜짐)
  hudPanel(W - 196, 6, 188, 30);
  var noHit = !G.hitThisRun;
  star5(W - 180, 21, 9, noHit ? '#ffd24a' : '#3a3f55', noHit ? '#7a4a00' : '#20242f'); hudLabel('안 맞기', W - 166, 26, noHit ? '#fff2c0' : HUDC.dim);
  star5(W - 96, 21, 9, G.treasure ? '#4fe0c8' : '#3a3f55', G.treasure ? '#0d3b36' : '#20242f'); hudLabel('보물', W - 82, 26, G.treasure ? '#c8fff4' : HUDC.dim);
  // 보스 체력: 이름과 붉은 막대
  var boss = G.enemies.filter(function (e) { return e.type === 'B'; })[0];
  if (boss && boss.state !== 'sleep' && boss.hp > 0) {
    hudPanel(W / 2 - 214, 42, 428, 30); hudLabel('돌의 골렘', W / 2 - 200, 61, '#ffd0c8');
    var bx0 = W / 2 - 130, bw0 = 330; ctx.fillStyle = '#10142a'; ctx.fillRect(bx0, 51, bw0, 12);
    var bg = ctx.createLinearGradient(0, 51, 0, 63); bg.addColorStop(0, '#ff8a7a'); bg.addColorStop(1, '#c0283a'); ctx.fillStyle = bg; ctx.fillRect(bx0, 51, bw0 * boss.hp / boss.max, 12);
    ctx.strokeStyle = HUDC.gold; ctx.strokeRect(bx0 - 0.5, 50.5, bw0 + 1, 13);
  }
}
function drawHUDDebug() {
  // 디버그 HUD (?debug, 기획서 12.3)
  if (DEBUG) {
    var pw = G.perfect && G.time <= G.perfect.until && !G.perfect.used ? (G.perfect.until - G.time).toFixed(2) + '초' : '-';
    ctx.fillStyle = '#000'; ctx.fillRect(W - 300, H - 60, 290, 50); ctx.fillStyle = '#7f7'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
    ctx.fillText('캐릭터 ' + CHARS[P.char].name + '  스택 ' + G.stack + '  게이지 ' + G.gauge, W - 292, H - 42);
    ctx.fillText('PERFECT 가능 ' + pw + '  PERFECT ' + G.stats.perfects + ' / 태그 ' + G.stats.tags, W - 292, H - 22);
  }
}
// HUD 배치 (가): 왼쪽 위에 모으고 아래를 비운다 (2026-11-24 사용자 "(가) 한번 해보자. 근데 이걸로 변경 확정은 아냐"). ?hud=bottom 이면 예전 아래 판
var HUD_STYLE = params.hud === 'bottom' ? 'bottom' : 'top';
function drawHUD() { if (HUD_STYLE === 'bottom') drawHUDBottom(); else if (UIIMG['hud-main'] && UIIMG['hud-title'] && UIIMG['hud-stars'] && UIIMG['bar-frame']) drawHUDTopImg(); else drawHUDTop(); }
// ===== 사용자 UI 에셋으로 그리는 HUD (2026-11-24 사용자 "UI 에셋은 내가 줄게", "관련 에셋을 두가지 추가했어") =====
// 자리 수치는 그림 픽셀 좌표 (hud-main 417×199: 하트 셋, 얼굴 칸 셋, 날개 아이콘, 게이지 막대가 그려져 있다)
var HM = { S: 0.62, ox: 4, oy: 2, hearts: [85, 133, 182, 231], heartY: 60, slots: [[55, 85], [125, 85], [195, 85]], slotW: 62, gauge: [74, 159, 307, 16], ticks: [148, 225, 300], wing: [262, 100, 56, 40] };
function hmX(x) { return HM.ox + x * HM.S; } function hmY(y) { return HM.oy + y * HM.S; }
function draw9(img, b, x, y, w, h, db) {   // 9조각으로 늘려 그리기 (그림의 모서리 b 픽셀을 화면 db 픽셀로, db 가 없으면 그대로)
  var iw = img.width, ih = img.height, d = Math.min(db || b, w / 2, h / 2);
  var sx = [0, b, iw - b, iw], sy = [0, b, ih - b, ih], dx = [x, x + d, x + w - d, x + w], dy = [y, y + d, y + h - d, y + h];
  for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) ctx.drawImage(img, sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j], dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j]);
}
function drawHUDTopImg() {
  var U = UIIMG, S = HM.S; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(U['hud-main'], HM.ox, HM.oy, U['hud-main'].width * S, U['hud-main'].height * S);
  // 하트: 판에 그려진 하트를 그대로 잘라 쓴다 (2026-11-24 사용자 "새로 얻은 체력도 기존 체력과 같은 느낌의 에셋으로"). 넷째 하트는 첫 하트를 옮겨 그리고, 잃은 하트는 같은 하트를 어둡게
  var hm = U['hud-main'], hs = [HM.hearts[0] - 22, HM.heartY - 19, 44, 38];
  function heartAt(i, lost, scl) { var hx = HM.hearts[i], k = scl || 1; ctx.save(); if (lost) ctx.filter = 'grayscale(1) brightness(0.38)'; ctx.drawImage(hm, hs[0], hs[1], hs[2], hs[3], hmX(hx - 22 * k), hmY(HM.heartY - 19 * k), 44 * S * k, 38 * S * k); ctx.restore(); }
  for (var i = G.hp; i < Math.min(3, G.hpMax); i++) heartAt(i, true);
  if (G.hpMax > 3) heartAt(3, G.hp < 4, G.heartNew > 0 ? 1 + Math.sin(G.heartNew * 20) * 0.12 : 1);   // 생명의 잔으로 늘어난 넷째 하트 (막 얻으면 두근거림)
  for (var c = 0; c < 3; c++) {
    var sl = HM.slots[c], x = hmX(sl[0] + 4), y = hmY(sl[1] + 4), SZ = (HM.slotW - 8) * S, has = G.lv.chars.indexOf(c) >= 0, cur = P.char === c;
    if (CH2.face[c]) { ctx.save(); ctx.globalAlpha = has ? 1 : 0.25; ctx.drawImage(CH2.face[c], x, y, SZ, SZ); ctx.restore(); }
    if (!cur && has) { ctx.fillStyle = 'rgba(8,10,20,0.3)'; ctx.fillRect(x, y, SZ, SZ); }
    if (cur && U['slot-sel']) { ctx.save(); ctx.shadowColor = 'rgba(255,214,120,0.9)'; ctx.shadowBlur = 8; ctx.drawImage(U['slot-sel'], hmX(sl[0] - 3), hmY(sl[1] - 3), (HM.slotW + 6) * S, (HM.slotW + 7) * S); ctx.restore(); ctx.drawImage(CH2.face[c] || U['slot-sel'], x, y, SZ, SZ); }
    if (has && !cur && tagCue() > 0) { var cp = 0.6 + Math.sin(G.time * 40) * 0.4; ctx.strokeStyle = 'rgba(127,230,255,' + cp + ')'; ctx.lineWidth = 3; ctx.strokeRect(x - 2, y - 2, SZ + 4, SZ + 4); ctx.lineWidth = 1; }
    if (has && G.refundLock && G.time < G.refundLock[c]) { var lk = (G.refundLock[c] - G.time) / CFG.refundLock; ctx.fillStyle = 'rgba(10,14,26,0.85)'; ctx.beginPath(); ctx.arc(x + SZ - 5, y + 5, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#9aa6bb'; ctx.beginPath(); ctx.moveTo(x + SZ - 5, y + 5); ctx.arc(x + SZ - 5, y + 5, 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lk); ctx.closePath(); ctx.fill(); }
    if (has && G.selfCD && G.time < G.selfCD[c]) {   // 자기 기술 쿨타임
      var cdk = (G.selfCD[c] - G.time) / CFG.selfCD, ccx = x + SZ / 2, ccy = y + SZ / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, SZ, SZ); ctx.clip(); ctx.fillStyle = 'rgba(6,8,18,0.62)'; ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.arc(ccx, ccy, SZ, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdk); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; var cdt = (G.selfCD[c] - G.time).toFixed(1); ctx.strokeText(cdt, ccx, ccy + 4); ctx.fillStyle = '#fff'; ctx.fillText(cdt, ccx, ccy + 4); ctx.lineWidth = 1;
      if (cur && G.selfDeny > 0) { ctx.strokeStyle = 'rgba(255,90,90,' + G.selfDeny * 3 + ')'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, SZ + 2, SZ + 2); ctx.lineWidth = 1; }
    }
    diamondPath(x + 4, y + SZ - 4, 7); ctx.fillStyle = has ? CHARS[c].dark : '#2a2f40'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = cur ? '#fff2c0' : HUDC.gold; ctx.stroke();   // 키 보석
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(CHARS[c].key, x + 4, y + SZ - 1);
  }
  // 폼: 이동폼은 그림의 하늘 날개 그대로, 공격폼은 날개를 덮고 주황 칼날. 옆에 Shift 와 폼 이름
  var atkF = G.form === 'atk', wg = HM.wing;
  if (atkF) { ctx.fillStyle = '#1d2444'; ctx.fillRect(hmX(wg[0]), hmY(wg[1]), wg[2] * S, wg[3] * S); ctx.save(); ctx.translate(hmX(wg[0] + wg[2] / 2), hmY(wg[1] + wg[3] / 2)); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#ff9a5a'; ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(7, -8); ctx.moveTo(-7, -8); ctx.lineTo(7, 6); ctx.stroke(); ctx.restore(); }
  keyCap('Shift', hmX(290), hmY(40));
  ctx.font = 'italic 900 13px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 3; ctx.strokeStyle = atkF ? '#4a1600' : '#0b3550'; ctx.strokeText(atkF ? '공격폼' : '이동폼', hmX(322), hmY(128));
  ctx.fillStyle = atkF ? '#ffb070' : '#a8f0ff'; ctx.fillText(atkF ? '공격폼' : '이동폼', hmX(322), hmY(128)); ctx.lineWidth = 1;
  // 연계 게이지: 그림의 막대 안을 보라 막대 그림으로 채움, 가득 차면 금빛으로 일렁이고 E
  var gg = HM.gauge, gx = hmX(gg[0]), gy = hmY(gg[1]), gw = gg[2] * S, gh = gg[3] * S, full = G.gauge >= 100;
  if (G.gauge > 0) { ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw * G.gauge / 100, gh); ctx.clip(); ctx.drawImage(U['bar-fill'], gx, gy, gw, gh);
    if (full) { var shn = (G.time * 0.8) % 1, sg = ctx.createLinearGradient(gx, 0, gx + gw, 0); sg.addColorStop(0, 'rgba(255,190,60,0.75)'); sg.addColorStop(shn, 'rgba(255,250,200,0.9)'); sg.addColorStop(1, 'rgba(255,170,60,0.75)'); ctx.fillStyle = sg; ctx.fillRect(gx, gy, gw, gh); }
    ctx.restore(); }
  HM.ticks.forEach(function (t) { ctx.fillStyle = '#c9a25a'; ctx.fillRect(hmX(t), gy, 1.5, gh); });
  if (full) keyCap('E', hmX(392), hmY(150));
  // 가운데 위: 스테이지와 시간 (왕관 띠)
  var ti = U['hud-title'], tS = 0.6, tw0 = ti.width * tS, th0 = ti.height * tS, tx0 = W / 2 - tw0 / 2;
  ctx.drawImage(ti, tx0, 0, tw0, th0);
  ctx.font = 'bold 14px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  var tt = G.lv.name + '   ' + G.runTime.toFixed(1) + '초'; ctx.strokeText(tt, W / 2, 82 * tS + 5); ctx.fillText(tt, W / 2, 82 * tS + 5); ctx.lineWidth = 1;
  // 오른쪽 위: 별 조건 (안 맞기 · 보물)
  var si = U['hud-stars'], sS = 0.5, sw0 = si.width * sS, sx0 = W - sw0 - 4, sy0 = 2;
  ctx.drawImage(si, sx0, sy0, sw0, si.height * sS);
  var noHit = !G.hitThisRun, st1 = noHit ? U.star : U['star-off'], st2 = G.treasure ? U.star : U['star-off'];
  ctx.drawImage(st1, sx0 + 26 * sS, sy0 + 46 * sS, 44 * sS, 42 * sS); hudLabel('안 맞기', sx0 + 76 * sS, sy0 + 74 * sS, noHit ? '#fff2c0' : HUDC.dim);
  ctx.drawImage(st2, sx0 + 196 * sS, sy0 + 46 * sS, 44 * sS, 42 * sS); hudLabel('보물', sx0 + 246 * sS, sy0 + 74 * sS, G.treasure ? '#c8fff4' : HUDC.dim);
  // 보스 체력: 막대 틀 그림
  var bs = boss();
  if (bs && bs.state !== 'sleep' && bs.hp > 0) {
    var bf = U['bar-frame'], bw0 = 420, bh0 = bf.height / bf.width * bw0, bx0 = W / 2 - bw0 / 2, by0 = 78;   // 가운데 위 띠 아래
    var ix = bx0 + 30 * bw0 / bf.width, iy = by0 + 15 * bh0 / bf.height, iw = (bf.width - 60) * bw0 / bf.width, ih = (bf.height - 30) * bh0 / bf.height;   // 틀의 금 테두리 안쪽만
    ctx.drawImage(bf, bx0, by0, bw0, bh0); ctx.fillStyle = '#10142a'; ctx.fillRect(ix, iy, iw, ih);   // 틀을 먼저 (틀 가운데가 막혀 있어서), 그 위에 체력
    var bg = ctx.createLinearGradient(0, iy, 0, iy + ih); bg.addColorStop(0, '#ff8a7a'); bg.addColorStop(1, '#c0283a'); ctx.fillStyle = bg; ctx.fillRect(ix, iy, iw * bs.hp / bs.max, ih);
    ctx.font = 'bold 12px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText('돌의 골렘', W / 2, iy + ih - 2); ctx.fillStyle = '#ffe0d8'; ctx.fillText('돌의 골렘', W / 2, iy + ih - 2); ctx.lineWidth = 1;
  }
  if (DEBUG) drawHUDDebug();
}
function drawHUDTop() {
  ctx.textAlign = 'left';
  // 왼쪽 위 판: 체력 → 얼굴 칸 셋과 폼 → 연계 게이지
  hudPanel(8, 6, 248, 104);
  for (var i = 0; i < G.hpMax; i++) { ctx.fillStyle = '#1a0a10'; heart(19 + i * 31, 14); ctx.fillStyle = i < G.hp ? '#ff4d5e' : '#3a3f55'; heart(18 + i * 31, 13); if (i < G.hp) { ctx.fillStyle = '#ffb0b8'; ctx.fillRect(22 + i * 31, 17, 4, 4); } }
  for (var c = 0; c < 3; c++) {
    var x = 18 + c * 44, y = 42, S = 38, has = G.lv.chars.indexOf(c) >= 0, cur = P.char === c;
    if (cur) { ctx.save(); ctx.shadowColor = 'rgba(255,214,120,0.9)'; ctx.shadowBlur = 10; ctx.fillStyle = HUDC.gold; ctx.fillRect(x - 2, y - 2, S + 4, S + 4); ctx.restore(); }
    else { ctx.fillStyle = HUDC.rim; ctx.fillRect(x - 2, y - 2, S + 4, S + 4); }
    ctx.fillStyle = has ? CHARS[c].dark : '#20263a'; ctx.fillRect(x, y, S, S);
    if (CH2.face[c]) { ctx.save(); ctx.globalAlpha = has ? 1 : 0.3; ctx.imageSmoothingEnabled = true; ctx.drawImage(CH2.face[c], x, y, S, S); ctx.restore(); }
    if (!cur) { ctx.fillStyle = 'rgba(8,10,20,0.3)'; ctx.fillRect(x, y, S, S); }
    if (has && !cur && tagCue() > 0) { var cp = 0.6 + Math.sin(G.time * 40) * 0.4; ctx.strokeStyle = 'rgba(127,230,255,' + cp + ')'; ctx.lineWidth = 3; ctx.strokeRect(x - 2, y - 2, S + 4, S + 4); ctx.lineWidth = 1; ctx.fillStyle = 'rgba(160,240,255,' + cp * 0.22 + ')'; ctx.fillRect(x, y, S, S); }
    if (has && G.refundLock && G.time < G.refundLock[c]) {   // 돌려받기 대기: 오른쪽 위 작은 시계
      var lk = (G.refundLock[c] - G.time) / CFG.refundLock; ctx.fillStyle = 'rgba(10,14,26,0.85)'; ctx.beginPath(); ctx.arc(x + S - 6, y + 6, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#9aa6bb'; ctx.beginPath(); ctx.moveTo(x + S - 6, y + 6); ctx.arc(x + S - 6, y + 6, 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lk); ctx.closePath(); ctx.fill();
    }
    if (has && G.selfCD && G.time < G.selfCD[c]) {   // 자기 기술 쿨타임: 칸이 어둡게 덮였다가 시계 방향으로 걷힘 + 남은 초
      var cdk = (G.selfCD[c] - G.time) / CFG.selfCD, ccx = x + S / 2, ccy = y + S / 2;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, S, S); ctx.clip(); ctx.fillStyle = 'rgba(6,8,18,0.62)'; ctx.beginPath(); ctx.moveTo(ccx, ccy); ctx.arc(ccx, ccy, S, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdk); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; var cdt = (G.selfCD[c] - G.time).toFixed(1); ctx.strokeText(cdt, ccx, ccy + 5); ctx.fillStyle = '#fff'; ctx.fillText(cdt, ccx, ccy + 5); ctx.lineWidth = 1;
      if (cur && G.selfDeny > 0) { ctx.strokeStyle = 'rgba(255,90,90,' + G.selfDeny * 3 + ')'; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, S + 2, S + 2); ctx.lineWidth = 1; }   // 쿨타임 중에 누르면 붉게 깜빡
    }
    diamondPath(x + 6, y + S - 6, 8); ctx.fillStyle = has ? CHARS[c].dark : '#2a2f40'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = cur ? '#fff2c0' : HUDC.gold; ctx.stroke();   // 키 보석 (왼쪽 아래)
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(CHARS[c].key, x + 6, y + S - 2.5);
  }
  // 폼: 아이콘과 글자 (Shift 로 바꿈)
  var atkF = G.form === 'atk', fx0 = 154;
  keyCap('Shift', fx0, 40);
  ctx.save(); ctx.translate(fx0 + 10, 70); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  if (atkF) { ctx.strokeStyle = '#ff9a5a'; ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(7, -8); ctx.moveTo(-7, -8); ctx.lineTo(7, 6); ctx.stroke(); }
  else { ctx.strokeStyle = '#7fe6ff'; ctx.beginPath(); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(-2, -9, 8, -8); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(0, -2, 8, -2); ctx.moveTo(-8, 5); ctx.quadraticCurveTo(2, 3, 8, 5); ctx.stroke(); }
  ctx.restore();
  ctx.font = 'italic 900 14px "Malgun Gothic", sans-serif'; ctx.textAlign = 'left'; ctx.lineWidth = 3; ctx.strokeStyle = atkF ? '#4a1600' : '#0b3550'; ctx.strokeText(atkF ? '공격폼' : '이동폼', fx0 + 24, 75);
  ctx.fillStyle = atkF ? '#ffb070' : '#a8f0ff'; ctx.fillText(atkF ? '공격폼' : '이동폼', fx0 + 24, 75); ctx.lineWidth = 1;
  // 연계 게이지: 얇은 막대, 가득 차면 금빛 + E
  var gx = 18, gy = 90, gw = 186, full = G.gauge >= 100;
  ctx.fillStyle = HUDC.rim; ctx.fillRect(gx - 2, gy - 2, gw + 4, 12); ctx.fillStyle = '#10142a'; ctx.fillRect(gx, gy, gw, 8);
  var gf = ctx.createLinearGradient(gx, 0, gx + gw, 0);
  if (full) { var shn = 0.15 + (G.time * 0.8) % 0.7; gf.addColorStop(0, '#ff9a3a'); gf.addColorStop(shn - 0.15, '#ffd24a'); gf.addColorStop(shn, '#fff6c0'); gf.addColorStop(shn + 0.15, '#ffd24a'); gf.addColorStop(1, '#ff9a3a'); }
  else { gf.addColorStop(0, '#5a3cff'); gf.addColorStop(0.6, '#b46cff'); gf.addColorStop(1, '#ff8ad8'); }
  ctx.fillStyle = gf; ctx.fillRect(gx, gy, gw * G.gauge / 100, 8); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(gx, gy, gw * G.gauge / 100, 2);
  for (var q = 1; q < 4; q++) { ctx.fillStyle = 'rgba(226,189,114,0.6)'; ctx.fillRect(gx + gw * q / 4, gy, 1, 8); }
  ctx.strokeStyle = HUDC.gold; ctx.strokeRect(gx - 0.5, gy - 0.5, gw + 1, 9);
  if (full) keyCap('E', gx + gw + 8, gy - 5); else hudLabel('연계', gx + gw + 8, gy + 8, HUDC.dim);
  // 스테이지와 시간 (가운데 위), 별 조건 (오른쪽 위), 보스 체력: 아래 판 배치와 같다
  drawHUDTopRight();
  if (DEBUG) drawHUDDebug();
}
// 머리 위 태그 수정 셋 (2026-11-24 사용자 "태그 가능 횟수는 머리 위에 작게 3개"): 다 차 있고 그대로면 1.5초 뒤 흐려지고, 쓰거나 차면 또렷해진다
function drawStackOverhead() {   // 2026-11-24 사용자: 이동폼은 하늘색, 공격폼은 붉은색. 차오르는 수정은 흐린 색이 아니라 아래에서부터 차오름
  if (G.dying > 0 || G.ult || G.doorAnim) return;
  var a = 1;   // 2026-11-24 사용자 "반투명화하지 말자": 늘 또렷하게 (다 차 있어도 흐려지지 않음)
  if (G.stackShake > 0) a = 1;
  var atkF = G.form === 'atk', light = atkF ? '#ffb0a0' : '#e8fcff', mid = atkF ? '#ff5a46' : '#7fe6ff', dark = atkF ? '#b0202a' : '#2a8fd0', rim = atkF ? '#4a0a10' : '#0f3550';
  var cx = Math.round(P.x + P.w / 2 + (G.stackShake > 0 ? Math.sin(G.time * 60) * 2 : 0)), cy = Math.round(P.y - 30);
  ctx.save(); ctx.globalAlpha = a;
  for (var s = 0; s < CFG.stackMax; s++) {
    var gx = cx + (s - (CFG.stackMax - 1) / 2) * 11, full = s < G.stack, part = full ? 1 : (s === G.stack ? G.regen / CFG.stackRegen : 0);
    var path = function () { ctx.beginPath(); ctx.moveTo(gx, cy - 6); ctx.lineTo(gx + 4, cy - 1); ctx.lineTo(gx + 2.5, cy + 5); ctx.lineTo(gx - 2.5, cy + 5); ctx.lineTo(gx - 4, cy - 1); ctx.closePath(); };
    path(); ctx.fillStyle = 'rgba(16,20,36,0.8)'; ctx.fill();
    if (part > 0) {   // 아래에서부터 part 만큼 차오른다 (다 차면 위까지)
      ctx.save(); path(); ctx.clip(); var top = cy + 5 - 11 * part, g = ctx.createLinearGradient(0, cy - 6, 0, cy + 5);
      g.addColorStop(0, light); g.addColorStop(0.5, mid); g.addColorStop(1, dark); ctx.fillStyle = g; ctx.fillRect(gx - 5, top, 10, cy + 5 - top);
      if (!full) { ctx.fillStyle = light; ctx.fillRect(gx - 5, top, 10, 1); }   // 차오르는 물 높이선
      ctx.restore();
    }
    path(); ctx.lineWidth = 1.5; ctx.strokeStyle = full ? rim : (atkF ? '#7a3a40' : '#4a5470'); ctx.stroke();
    if (full) { ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 1.5, cy - 3, 1.5, 2); }
  }
  ctx.restore();
}
function heart(x, y) { ctx.fillRect(x + 2, y, 8, 4); ctx.fillRect(x + 14, y, 8, 4); ctx.fillRect(x, y + 4, 24, 8); ctx.fillRect(x + 3, y + 12, 18, 4); ctx.fillRect(x + 7, y + 16, 10, 4); }

// ===== 메뉴 (templates/menu 를 복사해 고침: 좌우 대신 ↑ ↓, Esc) =====
function makeMenu(overlay, buttons, onChoose, onEsc) {
  var sel = 0, open = false;
  function refresh() { buttons.forEach(function (b, i) { if (b && b.classList) b.classList.toggle('sel', i === sel); }); }
  buttons.forEach(function (b, i) {
    if (!b || !b.addEventListener) return;
    b.addEventListener('click', function () { if (open) onChoose(i); });
    b.addEventListener('mouseenter', function () { if (open) { sel = i; refresh(); } });
  });
  return {
    open: function (first) { open = true; sel = first || 0; refresh(); if (overlay) overlay.classList.remove('hidden'); },
    close: function () { open = false; if (overlay) overlay.classList.add('hidden'); },
    isOpen: function () { return open; },
    selected: function () { return sel; },
    key: function (e) {
      if (!open) return false;
      var k = e.key;
      if (k === 'Escape') { if (onEsc && !e.repeat) onEsc(); return true; }
      if (k === 'Enter' || k === ' ') { if (e.preventDefault) e.preventDefault(); if (!e.repeat) onChoose(sel); return true; }
      if (k === 'ArrowUp' || k === 'ArrowDown') { if (e.preventDefault) e.preventDefault(); sel = (sel + (k === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length; refresh(); return true; }
      return true;
    }
  };
}
function $(id) { return document.getElementById(id); }
var menus = {};
function hideAll() { Object.keys(menus).forEach(function (k) { menus[k].close(); }); }
function starHTML(s) { return s.map(function (v) { return v ? '★' : '<span class="off">★</span>'; }).join(''); }
function showTitle() { G.mode = 'title'; hideAll(); menus.title.open(0); }
function showSelect(first) {
  G.mode = 'select'; hideAll();
  LEVELS.forEach(function (lv, i) {
    var b = $('st-' + i); if (!b) return;
    var open = unlocked(i);
    b.className = 'btn' + (open ? '' : ' locked');
    b.innerHTML = open ? lv.name + '  <span class="stars">' + starHTML(starsOf(lv.id)) + '</span>' : '🔒 ' + lv.id + ' (앞 스테이지를 깨면 열림)';
  });
  menus.select.open(first || 0);
}
function showClear(got, total) {
  hideAll();
  $('clear-title').textContent = G.lv.id + ' 클리어!';
  $('clear-stars').innerHTML = starHTML(total);
  $('clear-info').innerHTML = '걸린 시간 ' + G.runTime.toFixed(1) + '초 · 이번 판 ' + got.filter(Boolean).length + '개 (깨기 ' + (got[0] ? '★' : '☆') + ' 안 맞기 ' + (got[1] ? '★' : '☆') + ' 보물 ' + (got[2] ? '★' : '☆') + ')' + (G.test ? ' · 확인용 주소라 별은 남기지 않음' : '');
  menus.clear.open(0);   // '다음 스테이지'가 먼저 골라져 있다
}
function showGameClear(got) {
  hideAll();
  var total = 0; LEVELS.forEach(function (lv) { total += starsOf(lv.id).filter(Boolean).length; });
  $('gc-stars').innerHTML = starHTML(got);
  $('gc-info').textContent = '1-5 걸린 시간 ' + G.runTime.toFixed(1) + '초 · 모은 별 ' + total + ' / ' + (LEVELS.length * 3);
  menus.gameclear.open(0);
}
function pauseGame() { if (G.mode !== 'play' || G.dying > 0) return; G.mode = 'pause'; menus.pause.open(0); }
function resumeGame() { menus.pause.close(); G.mode = 'play'; keys = {}; }

if (document.getElementById('title')) {
  menus.title = makeMenu($('title'), [$('title-start')], function () { if (loadReady()) showSelect(0); }, null);
  var loadLabel = function () { var b = $('title-start'); if (b) b.textContent = loadReady() ? '게임 시작' : '불러오는 중 ' + LOAD.done + ' / ' + LOAD.total; }; loadLabel(); setInterval(loadLabel, 150);   // 그림이 다 오기 전에는 시작 버튼 대신 불러온 수
  menus.select = makeMenu($('select'), [0, 1, 2, 3, 4].map(function (i) { return $('st-' + i); }), function (i) { if (unlocked(i)) startLevel(i); }, function () { showTitle(); });
  menus.pause = makeMenu($('pause'), [$('pause-resume'), $('pause-restart'), $('pause-list')], function (i) {
    if (i === 0) resumeGame(); else if (i === 1) { menus.pause.close(); restartStage(); } else { showSelect(Math.max(0, G.levelIndex)); }
  }, function () { resumeGame(); });
  menus.clear = makeMenu($('clear'), [$('clear-next'), $('clear-list')], function (i) {
    var nx = G.levelIndex + 1;
    if (i === 0 && nx < LEVELS.length && (unlocked(nx) || G.test)) startLevel(nx, { test: G.test }); else showSelect(Math.min(LEVELS.length - 1, Math.max(0, nx)));
  }, function () { showSelect(Math.max(0, G.levelIndex)); });
  menus.gameclear = makeMenu($('gameclear'), [$('gc-list'), $('gc-title')], function (i) { if (i === 0) showSelect(4); else showTitle(); }, function () { showSelect(4); });
}

window.addEventListener('keydown', function (e) {
  for (var k in menus) if (menus[k].isOpen()) { if (menus[k].key(e)) return; }
  if (e.key === 'Escape') { if (!e.repeat) pauseGame(); return; }
  var n = KEYMAP[e.code];
  if (n) { e.preventDefault(); if (!e.repeat) press(n); }
});
window.addEventListener('keyup', function (e) { var n = KEYMAP[e.code]; if (n) release(n); });
window.addEventListener('blur', function () { keys = {}; if (G.mode === 'play') pauseGame(); });

// ===== 시작 =====
var last = 0;
function frame(ts) {
  var dt = Math.min(1 / 30, (ts - last) / 1000 || 0); last = ts;
  update(dt); draw();
  requestAnimationFrame(frame);
}
if (!TEST) {
  if (STAGE_PARAM) {
    var si = -1; LEVELS.forEach(function (lv, i) { if (lv.id === STAGE_PARAM) si = i; });
    startLevel(si >= 0 ? si : 0, { test: true });
  } else showTitle();
  requestAnimationFrame(frame);
}

// 검사용 (check/g3check.html)
window.G3 = {
  CFG: CFG, LEVELS: LEVELS, CHARS: CHARS, Builder: Builder, parseLevel: parseLevel, TS: TS, ROWS: ROWS,
  get G() { return G; }, get P() { return P; }, get SAVE() { return SAVE; },
  startLevel: function (w, o) { if (typeof w !== 'number') G.lvDef = w; return startLevel(w, o); },
  update: update, tag: tag, press: press, release: release, activeHint: function () { return activeHint(); }, keys: function () { return keys; }, KEYMAP: KEYMAP, LOAD: function () { return LOAD; },
  mergeStars: mergeStars, unlocked: unlocked, starsOf: starsOf, resetSave: function () { SAVE = { stars: {} }; writeSave(SAVE); },
  reloadSave: function () { SAVE = loadSave(); }, writeSave: function () { writeSave(SAVE); },
  menus: menus, showSelect: showSelect, pauseGame: pauseGame, resumeGame: resumeGame, clearStage: clearStage, activeHint: activeHint, draw: draw
};
})();
