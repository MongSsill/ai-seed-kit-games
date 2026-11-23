// ===== 게임 밖 편의 기능 원본: 고르기 메뉴 (멈추기, 시작 화면 메뉴, 랭킹 보기 등) =====
// CLAUDE.md 폴더 칸: 이 원본을 게임마다 game.js 에 복사해 따로 고쳐 쓴다. 고친 것은 원본에 되돌려 넣지 않아도 된다.
// 처음 쓴 곳: 게임 1 일시정지 (g1-copy/game.js), 원본으로 뗀 것은 2026-11-23 게임 2 를 만들며.
//
// 쓰는 법
//   var pauseMenu = makeMenu(document.getElementById('pause'),
//     ['pause-resume', 'pause-restart', 'pause-title'].map(function (id) { return document.getElementById(id); }),
//     function (i) { ... i 번째 칸을 골랐을 때 ... },
//     function () { ... Esc 를 눌렀을 때 (없으면 null) ... });
//   pauseMenu.open();            // 보이고 첫 칸을 고른 채로
//   pauseMenu.close();
//   pauseMenu.isOpen()           // 열려 있으면 true
//   keydown 에서: if (pauseMenu.key(e)) return;   // 열려 있으면 키를 먹고 true
//
// 키: ↑ ↓ 로 고르고 Enter 나 Space 로 정한다. 마우스로 칸에 올리면 고르고 누르면 정한다.
// 고른 칸에는 'sel' 클래스가 붙는다 (menu.html 의 꾸밈 견본 참고).
function makeMenu(overlay, buttons, onChoose, onEsc) {
  var sel = 0, open = false;
  function refresh() { buttons.forEach(function (b, i) { if (b && b.classList) b.classList.toggle('sel', i === sel); }); }
  function choose(i) { onChoose(i); }
  buttons.forEach(function (b, i) {
    if (!b || !b.addEventListener) return;
    b.addEventListener('click', function () { if (open) choose(i); });
    b.addEventListener('mouseenter', function () { if (open) { sel = i; refresh(); } });
  });
  return {
    open: function (first) { open = true; sel = first || 0; refresh(); overlay.classList.remove('hidden'); },
    close: function () { open = false; overlay.classList.add('hidden'); },
    isOpen: function () { return open; },
    selected: function () { return sel; },
    key: function (e) {
      if (!open) return false;
      var k = e.key;
      if (k === 'Escape') { if (onEsc) onEsc(); return true; }
      if (k === 'Enter' || k === ' ') { if (e.preventDefault) e.preventDefault(); if (!e.repeat) choose(sel); return true; }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        if (e.preventDefault) e.preventDefault();
        var d = k === 'ArrowUp' ? -1 : 1;
        sel = (sel + d + buttons.length) % buttons.length;
        refresh();
        return true;
      }
      return true; // 메뉴가 열려 있으면 다른 키는 게임에 넘기지 않는다
    }
  };
}
