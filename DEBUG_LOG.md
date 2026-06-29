# CC Workspace — 디버깅 로그 (Debug Log)

> v1.0.0 릴리스 **이후**의 디버깅 기록. 최신 항목이 위에 온다.
> 각 항목 형식: **증상 → 근본 원인 → 수정 → 검증 → 커밋**
> 관련 문서: [HANDOFF.md](HANDOFF.md) · [README.md](README.md)

---

## #2 — 2026-06-29 · 터미널 붙여넣기 이중 입력 (regression)

- **증상:** 폴더 패널에서 경로 복사(`Ctrl+Shift+C`) 후 가운데 터미널에 `Ctrl+V` 로 붙여넣으면 경로가 **두 번 이어붙어** 입력됨 → `CD C:\dev\workspace\gstarC:\dev\workspace\gstar` → "경로는 존재하지 않으므로 찾을 수 없습니다" 오류.
- **근본 원인:** #1에서 추가한 `attachCustomKeyEventHandler` 의 paste 분기가 `return false` 만 하고 **`e.preventDefault()` 를 호출하지 않음.** xterm에서 false 반환은 *xterm 자체 키 처리*만 막을 뿐 **브라우저 네이티브 paste 기본동작은 막지 않는다** → 핸들러의 `term.paste()` 1회 + 네이티브 paste 이벤트로 xterm 내장 붙여넣기 1회 = **총 2회 삽입**.
- **수정:** paste 분기에 `e.preventDefault()` 추가(네이티브 중복 차단). 복사 분기에도 추가(빈 선택의 네이티브 복사가 클립보드를 덮어쓰는 것 예방). — `renderer.js`
- **검증:** `node --check renderer.js` 통과. 붙여넣기 시 1회만 삽입되어 `CD <경로>` 정상 동작.
- **커밋:** `9d6f778`

---

## #1 — 2026-06-29 · 터미널 복사·붙여넣기 미작동

- **증상:** 가운데 CLI(xterm) 칸에서 (1) 텍스트를 드래그 선택해도 **복사가 안 됨**, (2) `Ctrl+V` **붙여넣기 안 됨**. (메모 칸은 정상 — Windows 네이티브 입력)
- **근본 원인:** xterm.js는 드래그 선택을 화면에만 표시하고 **선택을 클립보드로 자동 복사하지 않으며**, 붙여넣기도 앱이 직접 배선해야 한다. `renderer.js` 터미널 설정에 클립보드 연동 코드가 **전무**했음(기존 `clipboard` 사용은 폴더 경로 복사 전용).
- **수정:** `term.attachCustomKeyEventHandler` 추가 — `Ctrl+C`/`Ctrl+Insert`(선택 있으면 복사, 없으면 SIGINT 통과), `Ctrl+V`/`Shift+Insert`(클립보드를 `term.paste` 로 붙여넣기, bracketed paste 존중). — `renderer.js`
- **검증:** `node --check renderer.js` 통과 + 실행 확인.
- **커밋:** `f4ca3a4`
- **후속:** 이 수정이 #2(이중 붙여넣기) 회귀를 유발 → #2에서 `preventDefault` 로 해결.
