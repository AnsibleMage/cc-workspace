<h1 align="center">
  <img src="icon.png" alt="CC Workspace" width="76" style="vertical-align: middle;">
  &nbsp;CC Workspace
</h1>

<p align="center">
  <strong>메모 · PowerShell · 폴더를 한 창에.<br>
  Claude Code를 위한 올인원 3분할 데스크톱 워크스페이스.</strong>
</p>

<p align="center">
  <a href="#-빠른-시작-quick-start"><img src="https://img.shields.io/badge/Quick_Start-2_min-blue?style=for-the-badge" alt="Quick Start"></a>
  <a href="#-배포용-빌드-build--distribution"><img src="https://img.shields.io/badge/Build-Portable_EXE-success?style=for-the-badge" alt="Build"></a>
  <a href="#-라이선스-license"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/Electron-30.5.1-47848F?style=flat-square&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Terminal-xterm.js-000000?style=flat-square&logo=gnu-bash&logoColor=white" alt="xterm">
  <img src="https://img.shields.io/badge/Made_with-Vibe_Coding-ff69b4?style=flat-square" alt="Vibe Coding">
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> &nbsp;·&nbsp; <strong>🇰🇷 한국어</strong>
</p>

---

> **한 줄 소개** — 앱을 켜면 **위(메모) · 가운데(PowerShell) · 아래(폴더)** 가 한 창에 딱 뜹니다.
> 가운데 칸은 흉내가 아니라 **진짜 PowerShell** 이라, 그 안에서 `claude` 를 입력하면 Claude Code가 그대로 동작합니다.

<!-- 스크린샷을 넣으려면 assets/screenshot.png 로 저장 후 아래 주석을 해제하세요 -->
<!-- <p align="center"><img src="assets/screenshot.png" alt="CC Workspace 실행 화면" width="720"></p> -->

```
┌─────────────────────────────────────┐
│ 📝 메모                  [열기][저장] │  ← 텍스트 메모 · 파일 열기/저장
├─────────────────────────────────────┤
│ ⌨  PowerShell                        │  ← 진짜 셸 · claude 실행 가능
│ PS C:\Users\you>                     │
├─────────────────────────────────────┤
│ 📁 폴더                              │  ← 클릭=지정 · 더블클릭=이동
└─────────────────────────────────────┘
```

---

## ✨ 주요 기능 (Features)

| 영역 | 기능 |
|------|------|
| 📝 **메모** | 텍스트 입력 · 파일 열기(`Ctrl+O`) · 저장(`Ctrl+S`, 연 파일 덮어쓰기) · 다른 이름으로 저장(`Ctrl+Shift+S`) · 헤더에 현재 파일명 표시 |
| ⌨ **터미널** | 실제 PowerShell 실행 (xterm + node-pty). 입력·출력·리사이즈 양방향 연결. `claude` 로 Claude Code 사용 |
| 📁 **폴더** | 한 번 클릭=지정(하이라이트) · 더블클릭=폴더 진입/파일 열기 · `..`=상위 이동 · `Ctrl+Shift+C`=경로 복사 |
| 🧭 **메뉴** | 한글 「파일」(새 창/열기/저장/다른 이름으로 저장/종료) · 「보기」(새로고침/개발자도구/확대축소) |
| 🪟 **다중 창** | 「파일 > 새 창」(`Ctrl+N`)으로 창 여러 개. 각 창은 독립된 PowerShell·메모·폴더 |

---

## 🚀 빠른 시작 (Quick Start)

### 사전 준비 (Prerequisites)

- [Node.js (LTS)](https://nodejs.org) — 이게 전부입니다. **Visual Studio 컴파일러 불필요** (터미널 모듈은 N-API prebuilt 사용)

### 설치 & 실행

```powershell
git clone https://github.com/AnsibleMage/cc-workspace.git
cd cc-workspace
npm install
npm start
```

`npm start` 하면 3분할 창이 바로 뜹니다.

> ⚠️ **clone 위치 주의** — 경로에 **공백**이 있으면(예: `C:\my projects\`) Electron 설치가 깨질 수 있습니다.
> `C:\dev\cc-workspace` 처럼 **공백 없는 경로**에 받으세요. ([아래 함정 ② 참고](#-알려진-함정--해결-troubleshooting))

---

## 📦 배포용 빌드 (Build & Distribution)

```powershell
npm run dist:portable   # 단일 포터블 EXE (권장)
npm run dist            # 포터블 + 설치본 + win-unpacked 전부
```

빌드 결과물은 `dist/` 에 생성됩니다.

| 결과물 | 배포 방식 |
|------|-----------|
| **`CC-Workspace-Portable-1.0.0.exe`** (~68MB) | **이 파일 하나만** 전달 → 더블클릭 → 실행 (설치·Node 불필요) |
| **`dist/win-unpacked/`** | 폴더째 압축 전달 → 풀고 `CC Workspace.exe` 실행 (압축해제 없어 더 빠름) |
| `CC Workspace Setup 1.0.0.exe` | 설치형 (바탕화면·시작메뉴 바로가기) |

<details>
<summary>📌 포터블 EXE 동작 원리 / 받는 사람 주의사항</summary>

<br>

- **설치 개념 없음** — 실행 시 `%TEMP%` 에 잠깐 압축 해제 후 구동. Program Files·레지스트리·시작메뉴에 아무것도 안 남김. 삭제는 EXE만 지우면 끝.
- **받는 사람은 아무 준비도 불필요** — Node·개발자 모드·빌드 도구 전부 필요 없음.
- 첫 실행 시 **SmartScreen("Windows의 PC 보호")** 경고가 뜰 수 있음(서명 안 된 개인 앱) → **추가 정보 → 실행**.
- 가운데 칸에서 `claude` 를 쓰려면 그 PC에 Claude Code가 별도 설치돼 있어야 함 (앱은 터미널만 제공).

> 참고: EXE를 **빌드하는** PC에서는 Windows **개발자 모드**가 필요합니다([함정 ③](#-알려진-함정--해결-troubleshooting)).

</details>

---

## 🧩 구조 (Architecture)

```
cc-workspace/
├── main.js          # 메인 프로세스: 창 생성 · PowerShell(pty) · 파일 IPC · 메뉴
├── renderer.js      # 렌더러: 터미널 / 메모 / 폴더 UI 로직
├── index.html       # 3분할 레이아웃
├── styles.css       # 다크 테마
├── package.json     # 의존성 + electron-builder 빌드 설정
├── build/icon.ico   # 빌드용 아이콘 (다중 해상도)
├── README.md        # 영어 (기본)
├── README_kr.md     # (이 문서) 한국어
└── HANDOFF.md       # 작업 기록 / 함정 상세
```

**IPC 채널** — `pty:data`/`pty:input`/`pty:resize` (터미널) · `fs:list`/`fs:open` (폴더) · `memo:open`/`memo:save` (메모) · `menu:open`/`menu:save`/`menu:saveAs` (메뉴)

---

## 🛠 기술 스택 (Tech Stack)

| 분류 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | Electron 30.5.1 | 터미널 임베딩 + 빠른 개발 |
| 터미널 | xterm 5.3 + **@lydell/node-pty** | N-API prebuilt → 컴파일 불필요 |
| 패키징 | electron-builder 24.13.3 | 포터블/설치본/폴더 동시 생성 |

---

## ⚠️ 알려진 함정 & 해결 (Troubleshooting)

> 이 앱을 만들며 실제로 막혔던 3가지. 재설치·재빌드 시 그대로 겪을 수 있습니다.

<details>
<summary><strong>① 터미널 모듈 컴파일 실패 (Visual Studio 없음)</strong></summary>

<br>

`node-pty` / `@homebridge/node-pty-prebuilt-multiarch` 는 C++ 컴파일이 필요하거나 Electron 30용 prebuilt가 없어 실패합니다.
→ **`@lydell/node-pty`** (N-API) 로 교체. `npm install` 만으로 끝, 컴파일·rebuild 불필요.

</details>

<details>
<summary><strong>② Electron 압축 해제 실패 (경로에 공백)</strong></summary>

<br>

**증상:** `npm start` → `Electron failed to install correctly`. `node_modules\electron\dist` 는 생기는데 `electron.exe` 가 없음.
**원인:** 프로젝트 경로의 **공백** 때문에 zip 추출이 조용히 실패(다운로드는 정상).
**수동 복구:**

```powershell
$zip = (Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -Filter "*.zip" | Select-Object -First 1).FullName
Remove-Item -Recurse -Force "$env:TEMP\el-test" -ErrorAction SilentlyContinue
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\el-test" -Force
Remove-Item -Recurse -Force node_modules\electron\dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force node_modules\electron\dist | Out-Null
Copy-Item "$env:TEMP\el-test\*" "node_modules\electron\dist\" -Recurse -Force
"electron.exe" | Out-File -Encoding ascii -NoNewline node_modules\electron\path.txt
```

**근본 해결:** 공백 없는 경로(예: `C:\dev\cc-workspace`)로 이전.

</details>

<details>
<summary><strong>③ EXE 빌드 시 winCodeSign 심볼릭 링크 실패</strong></summary>

<br>

**증상:** `npm run dist` → `Cannot create symbolic link … 클라이언트가 필요한 권한을 가지고 있지 않습니다`.
**원인:** Windows가 일반 권한으로 심볼릭 링크 생성을 막음.
**해결:** **Windows 개발자 모드 켜기** (설정 → 시스템 → 개발자용 → 개발자 모드) 후:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
npm run dist:portable
```

> 개발자 모드는 **빌드하는 PC에서만** 필요. 받는 사람은 불필요.

</details>

---

## 🗺 로드맵 (Roadmap)

- [ ] 패널 경계 드래그로 크기 조절
- [ ] 메모 자동 저장 / 마크다운 미리보기
- [ ] 폴더 시작 경로 설정 저장
- [ ] 코드 서명 (SmartScreen 경고 제거)
- [ ] 자동 업데이트 (`electron-updater`)

---

## 🧾 변경 이력 (Changelog)

### v1.0.0 — 2026-06-29 (첫 릴리스)

- 🎉 최초 릴리스
- 3분할 레이아웃 (메모 · PowerShell · 폴더)
- 메모 파일 열기/저장(덮어쓰기)/다른 이름으로 저장
- 폴더 탐색 (클릭 지정 · 더블클릭 이동 · `Ctrl+Shift+C` 경로 복사)
- 한글 메뉴(파일/보기) · 커스텀 아이콘
- 포터블 EXE 배포 빌드

---

## 📄 라이선스 (License)

[MIT](LICENSE) © 2026 [AnsibleMage](https://github.com/AnsibleMage)

내장된 오픈소스(Electron, Chromium, xterm, node-pty 등)의 라이선스 고지는 빌드 시 자동 포함됩니다.

---

## 🙋 만든 사람

**AnsibleMage** — [github.com/AnsibleMage](https://github.com/AnsibleMage)

> 🤖 기획 · 바이브코딩으로 제작. 자세한 작업 기록은 [HANDOFF.md](HANDOFF.md) 참고.
