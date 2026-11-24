# CHAIN ECHO — Sound asset pack

## 기준 및 제한
- 공개 GitHub `MongSsill/ai-seed-kit-games/main/g3-original/index.html` 및 `game.js` (2026-11-24 조회) 기준. 사용자의 로컬 C: 파일은 직접 읽을 수 없으므로 최신 로컬 변경 사항을 먼저 대조한다.
- 외부 샘플이나 원작 음원 없이 파형, 필터링된 노이즈, 합성 배음으로 직접 생성한 효과음 시안이다. 44.1 kHz / 16-bit PCM WAV / stereo. 실제 게임에서의 청취 및 믹스 테스트는 미실시. BGM·캐릭터 음성은 포함하지 않는다.
- `assets/audio/`를 게임 디렉터리의 `assets/` 아래에 복사. `preview.html`은 이 패키지 폴더 내에서 브라우저로 열어 개별 청취. `manifest.json`은 파일 목록, 길이, 권장 gain, 필살기 타임라인을 제공한다. 기존 코드를 직접 수정하지 않았다.

## 적용 우선순위
1. 기존 `sfx(name)`의 13개 ID(jump, atk, tag, perfect, dash, ice, wind, hit, hurt, fall, treasure, clear, ult)는 동일 이름 WAV로 교체. TEST에서는 무음 유지. 실패 시 기존 오실레이터를 fallback으로 유지할 수 있다.
2. 일반 태그보다 PERFECT가 크게 들리게 하되, 태그 직후 캐릭터 기술음과 동시에 재생되는 경우 서로 묻히지 않는지 테스트. 이동폼/공격폼에는 각각 별도 효과음 연결. 태그 수정 자연 회복음은 작게(필요 시 OFF).
3. 체인 에코: `chain_echo_full.wav` 1회 재생 또는 아래 분리 트리거 중 하나만 선택. 통합 음원은 게임 내 hitstop/일시정지에 의한 시간 차이가 생길 수 있으므로 분리 트리거 우선 권장. 별도 `hit` 반복 호출은 필살기 동안 생략하거나 감쇠하여 중첩 과다 방지. 단계가 시작 시간을 통과했을 때 한 번만 재생.

| 게임 내 시각(초) | ID | 비고 |
|---|---|---|
|0.00|ult|발동|
|0.15|ult_dragon|0.60 타격|
|0.40|ult_ice_rain|0.85 타격|
|0.65|ult_wind_storm|1.10 타격|
|1.35|ult_cutin|원형 컷인|
|1.85|ult_charge|집약|
|2.25|ult_finale|2.40 종결타 폭발|
|2.80|ult_after|3.10 종료|

4. 보상 상자 열기: `chest_open`, 실제 최대 체력 증가 시 `relic_gain` (상자 개방 애니메이션에 따라 타이밍 조정). 기존 `treasure` 재생과 중복 금지.
5. 문: 일반 문 시작 시 `door_open` (1.2초), 결과 창 표시 시 `clear`. 보스 문은 `world_door_full` (2.58초) 또는 0.00/0.32/0.64/0.96초에 `cup_insert_1`~`4`, 1.28초에 `world_door_open`. GAME CLEAR 창은 `game_clear`. 실제 잔 장착 애니메이션의 시각과 맞춰 조정. 문 열기 시작에 기존 `clear`가 호출되는 부분은 교체하고 결과 표시에서만 재생.
6. UI: 선택 변경 ui_move, 확인 ui_confirm, 뒤로 ui_back, 일시정지 ui_pause, 결과 별 ui_star. 키 반복/마우스 호버로 연속 재생되지 않게 한다.

## 구현 참고
- file:// 실행도 고려하여 상대 경로 HTMLAudioElement 또는 서버 제공 시 Web Audio API 버퍼 사용. 첫 사용자 입력에서 오디오 활성화. 오디오 로딩이 플레이를 막지 않도록 한다.
- sfx master gain 초기값 0.65 정도, manifest의 gain은 개별 상대 볼륨 초기값. 적중/발걸음 등 고빈도음 동시 발음 상한과 30~60ms 중복 억제 적용 검토. UI, 보스, 필살기, BGM 볼륨은 독립 제어 권장.
- 스테이지 재시작/목록 이동 시 진행 중인 길이가 긴 필살기/문/팡파르를 정지한다. 테스트 모드 무음 유지. 게임 시간과 재생 이벤트는 한 번만 발생하게 한다.
- 원본 음원 및 원작 BGM을 사용하지 않았다. 음색은 합성 기반이며 실제 플레이 중 밸런스 조정 필요.
