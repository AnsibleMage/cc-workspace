# CC Workspace — 핸드오프 / 작업 기록 문서

> 최종 업데이트: 2026-06-29
> 작성: Ann + Mir(Claude)
> 위치: `C:\new cli\cc-workspace`

---

## 1. 이 프로그램이 뭔가

메모 · PowerShell · 폴더를 **한 창에 세로 3분할**로 띄우는 Windows 데스크톱 앱.
앱을 켜면 바로 이 구조로 실행된다.

```
┌─────────────────────────────┐
│ 📝 메모        [열기][저장]   │  ← 상단: 일반 텍스트 메모 (파일 열기/저장)
├─────────────────────────────┤
│ ⌨ PowerShell                │  ← 가운데: 진짜 PowerShell (claude 실행 가능)
│ PS C:\Users\name>           │
├─────────────────────────────┤
│ 📁 폴더                      │  ← 하단: 파일 탐색 (클릭=지정, 더블클릭=이동)
└─────────────────────────────┘
```

가운데 칸은 흉내가 아니라 **실제 셸 프로세스**라, 그 안에서 `claude` 를 입력하면 Claude Code가 그대로 동작한다.

---

## 2. 핵심 기능

| 영역 | 기능 |
|------|------|
| 메모 | 일반 텍스트 입력 / 파일 열기(Ctrl+O) / 저장(Ctrl+S, 연 파일에 덮어쓰기) / 다른 이름으로 저장(Ctrl+Shift+S). 헤더에 현재 파일명 표시 |
| 터미널 | 실제 PowerShell 실행. 입력·출력·리사이즈 양방향 연결 (xterm + node-pty) |
| 폴더 | 한 번 클릭=지정(하이라이트) / 더블클릭=폴더 진입·파일 열기 / `📂 ..`=상위 이동 / **Ctrl+Shift+C**=지정 경로 클립보드 복사 |
| 메뉴 | 한글 「파일」(**새 창**/열기/저장/다른 이름으로 저장/종료) · 「보기」(새로고침/개발자도구/확대축소) |
| 다중 창 | **「파일 > 새 창」(Ctrl+N)** 으로 창을 여러 개 띄울 수 있음. 각 창은 독립된 PowerShell·메모·폴더를 가짐 |

---

## 3. 파일 구조 & 각 파일 역할

```
cc-workspace/
├── main.js          # Electron 메인 프로세스: 창 생성, PowerShell(pty) 실행, 파일 IPC, 메뉴
├── renderer.js      # 렌더러(UI 로직): 터미널/메모/폴더 동작
├── index.html       # 3분할 레이아웃 마크업
├── styles.css       # 다크 테마 스타일
├── package.json     # 의존성 + electron-builder 빌드 설정
├── icon.png         # 원본 아이콘 (1254x1254)
├── build/
│   └── icon.ico     # 빌드용 변환 아이콘 (다중 해상도 16~256)
├── README.md        # 설치/실행/빌드 사용 설명서
├── HANDOFF.md       # (이 문서) 작업 기록
└── dist/            # 빌드 결과물 (배포용) — git 추적 제외
```

**다중 창 아키텍처:** `main.js` 는 창마다 별도의 pty 를 둔다. `ptys` (Map: `webContents.id` → ptyProcess)로 관리하며, `pty:input`/`pty:resize` 는 `event.sender.id` 로 해당 창의 pty 를 찾아 라우팅한다. 「새 창」은 `createWindow()` 를 다시 호출할 뿐이고, 창이 닫히면 그 창의 pty 만 정리된다. 단일 인스턴스 잠금은 걸지 않아 exe 를 여러 번 실행해도 창이 따로 뜬다.

**IPC 채널 맵** (main ↔ renderer):

- `pty:data` (main→renderer 출력), `pty:input` (입력), `pty:resize` (크기)
- `fs:list` (폴더 목록), `fs:open` (파일을 기본 프로그램으로 열기)
- `memo:open` (파일 읽기), `memo:save` (저장/덮어쓰기)
- `menu:open` / `menu:save` / `menu:saveAs` (메뉴 클릭 → 렌더러로 전달)

---

## 4. 기술 스택 & 핵심 의사결정

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | **Electron 30.5.1** | 터미널 임베딩 예제가 풍부하고 바이브코딩 난이도 낮음 |
| 터미널 | **xterm 5.3 + @lydell/node-pty** | 실제 셸 연결에는 pty 필요. node-pty 계열은 컴파일 문제로 막혀서 N-API prebuilt인 @lydell 로 전환 (5절 참고) |
| 빌드/패키징 | **electron-builder 24.13.3** | 포터블 단일 exe + 설치본 + win-unpacked 동시 생성 |
| 렌더러 보안 | nodeIntegration: true, contextIsolation: false | 개인용 로컬 앱이라 단순화 우선 (require 직접 사용) |

---

## 5. ⚠️ 빌드 과정에서 막혔던 3가지 함정 (가장 중요한 기록)

> 재설치·재빌드·다른 PC에서 똑같이 겪을 수 있으니 반드시 참고.

### 함정 ① 터미널 모듈 컴파일 실패 (Visual Studio 없음)

- **증상:** 처음에 `node-pty` 사용 → `npm install` / `electron-rebuild` 시 `gyp ERR! find VS … Could not find any Visual Studio installation`.
- **원인:** `node-pty` 는 C++ 네이티브 컴파일이 필요한데 PC에 MSVC 컴파일러가 없음.
- **시도2:** `@homebridge/node-pty-prebuilt-multiarch` → Electron 30(v123) Windows prebuilt가 릴리스에 없어서 **404**, 다시 소스 빌드로 떨어져 실패.
- **최종 해결:** **`@lydell/node-pty`** (N-API 기반) 로 교체.
  - N-API라 바이너리 하나가 Node/Electron 양쪽에서 동작 → 재빌드·컴파일 불필요.
  - 플랫폼 바이너리(`@lydell/node-pty-win32-x64`)를 npm이 그냥 받아옴.
  - `npm install` 만으로 끝. 환경변수·rebuild 단계 없음.

### 함정 ② Electron 본체 압축 해제 실패 (경로에 공백)

- **증상:** `npm start` → `Electron failed to install correctly`. `node_modules\electron\dist` 폴더는 생기는데 `electron.exe` 가 없음.
- **원인:** 프로젝트 경로 `C:\new cli` 의 **공백** 때문에 electron 설치 스크립트의 zip 압축 해제(extract-zip)가 조용히 실패. (zip 다운로드 자체는 정상 108MB.)
- **확인법:** 같은 zip을 공백 없는 `%TEMP%` 에 `Expand-Archive` 로 풀면 `electron.exe` 정상 추출됨 → 경로 공백 문제로 확정.
- **해결(수동 복구):**
  ```powershell
  $zip = (Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -Filter "*.zip" | Select-Object -First 1).FullName
  Remove-Item -Recurse -Force "$env:TEMP\el-test" -ErrorAction SilentlyContinue
  Expand-Archive -Path $zip -DestinationPath "$env:TEMP\el-test" -Force
  Remove-Item -Recurse -Force node_modules\electron\dist -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force node_modules\electron\dist | Out-Null
  Copy-Item "$env:TEMP\el-test\*" "node_modules\electron\dist\" -Recurse -Force
  "electron.exe" | Out-File -Encoding ascii -NoNewline node_modules\electron\path.txt
  ```
- **근본 해결책:** 프로젝트를 **공백 없는 경로**(예: `C:\cc-workspace`)로 옮기면 이 문제가 사라진다. node_modules 재설치 때마다 위 복구가 필요하기 때문.

### 함정 ③ exe 빌드 시 winCodeSign 심볼릭 링크 실패

- **증상:** `npm run dist` → `Cannot create symbolic link … 클라이언트가 필요한 권한을 가지고 있지 않습니다` (winCodeSign-2.6.0.7z 추출 단계), exit status 2 반복.
- **원인:** electron-builder가 받는 winCodeSign 아카이브에 macOS 심볼릭 링크(.dylib)가 들어있는데, Windows는 일반 권한으로 심볼릭 링크 생성을 막음. (실제로 코드 서명은 안 하지만 추출 단계에서 걸림.)
- **해결:** **Windows 개발자 모드 켜기** (설정 → 시스템 → 개발자용 → 개발자 모드). 그 후 깨진 캐시 비우고 재빌드:
  ```powershell
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -ErrorAction SilentlyContinue
  npm run dist:portable
  ```
  - 대안: PowerShell을 관리자 권한으로 실행하면 심볼릭 링크 생성 가능.
  - **주의:** 개발자 모드는 **빌드하는 PC에서만** 필요. 완성된 exe를 받는 사람은 아무 설정도 불필요.

---

## 6. 실행 방법 (개발 중)

```powershell
cd "C:\new cli\cc-workspace"
npm install        # 최초 1회 (이후 함정② 수동 복구가 필요할 수 있음)
npm start
```

메인 프로세스(메뉴·IPC)를 수정하면 「보기 > 새로고침」으로는 부족하고 **앱을 완전히 껐다 켜야** 반영된다.

---

## 7. 빌드 & 배포 방법

```powershell
npm run dist:portable   # 단일 포터블 exe만 (권장, 빠름)
npm run dist            # 포터블 + 설치본 + win-unpacked 전부
```

결과물은 `dist\` 에 생성:

| 결과물 | 배포 방식 |
|------|-----------|
| **`CC-Workspace-Portable-1.0.0.exe`** (약 68MB) | **이 파일 하나만** 전달 → 받는 사람 더블클릭 → 실행 (설치·Node 불필요) |
| `dist\win-unpacked\` 폴더 | 폴더째 압축 전달 → 풀고 `CC Workspace.exe` 실행 (압축해제 없어 더 빠름) |
| `CC Workspace Setup 1.0.0.exe` | 설치형 (바탕화면·시작메뉴 바로가기 생성) |

**포터블 동작 원리:** 설치 개념 없음. 실행 시 `%TEMP%` 하위에 잠깐 압축 해제 후 그 자리에서 구동. Program Files·레지스트리·시작메뉴에 아무것도 안 남김. 삭제는 exe 파일만 지우면 끝.

**받는 사람 주의:** 서명 안 된 앱이라 첫 실행 시 SmartScreen("Windows의 PC 보호") 경고 → **추가 정보 → 실행**.

---

## 8. 알려진 제약 / 주의사항

- **공백 경로:** `C:\new cli` 의 공백 때문에 개발 환경에서 electron 추출이 깨짐(함정②). 가능하면 공백 없는 경로 권장.
- **claude 명령:** 앱은 터미널만 제공. 가운데 칸에서 `claude` 를 쓰려면 그 PC에 Claude Code가 별도 설치돼 있어야 함.
- **시작 위치 고정:** 터미널·폴더 패널은 항상 사용자 홈(`os.homedir()`)에서 시작. 바꾸려면 `main.js` 의 `START_DIR` 수정.
- **사소:** `renderer.js` 에 미사용 변수 `prev` 1개 존재(동작 무관).

---

## 9. 향후 개선 아이디어

- 패널 경계 **드래그로 크기 조절**
- 메모 **자동 저장** / 마크다운 미리보기
- 폴더 시작 경로를 설정으로 저장
- 코드 서명(SmartScreen 경고 제거)
- 자동 업데이트(`electron-updater`)

---

## 10. 작업 타임라인 (2026-06-29)

1. 요구사항 확정 — Electron / MVP / 일반 텍스트 메모
2. 3분할 앱 골격 구현 (main / renderer / html / css)
3. 터미널 모듈 3차 시도 끝에 `@lydell/node-pty` 로 안착 (함정①)
4. electron 본체 추출 문제 진단·수동 복구 → 첫 실행 성공 (함정②)
5. 기능 추가 — 한글 메뉴, 파일 열기/저장, 폴더 선택·이동·경로복사
6. 아이콘 제작(GPT) → `.ico` 변환·적용
7. 개발자 모드로 winCodeSign 통과 → 포터블 exe 빌드 성공 (함정③)
8. 다른 폴더 이동 실행 검증 완료 → 배포 준비 끝
9. 라이선스(MIT, AnsibleMage)·README(쇼케이스 형식, v1.0.0)·git 정리
10. **다중 창** 기능 추가 — 「파일 > 새 창」(Ctrl+N), 창마다 독립 PowerShell (버전 1.0.0 유지)

---

## 11. Git 저장소 올리기 (배포 메모)

> CLI(PowerShell)에서 그대로 따라 하면 된다. 저장소: https://github.com/AnsibleMage/cc-workspace

### 0) Git 이 안 잡힐 때 (PATH 함정)

`git --version` 이 `'git' 용어가 ... 인식되지 않습니다` 로 나오면 Git 은 깔렸지만 PATH 등록이 안 된 것. 아래로 자동 등록:

```powershell
$git = Get-ChildItem "C:\Program Files\Git","C:\Program Files (x86)\Git","$env:LOCALAPPDATA\Programs\Git" -Recurse -Filter git.exe -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match '\\cmd\\git.exe$' } | Select-Object -First 1
if ($git) {
  $dir = Split-Path $git.FullName
  $env:Path += ";$dir"
  [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";$dir", "User")
  git --version
}
```

설치 자체가 안 돼 있으면: `winget install --id Git.Git -e` 또는 https://git-scm.com/download/win

### 1) 최초 1회 — 저장소 초기화 & 첫 커밋

```powershell
cd "C:\new cli\cc-workspace"
git init
git config user.name "AnsibleMage"
git config user.email "chiwooyou@innodis.co.kr"
git add .
git commit -m "Initial commit: CC Workspace v1.0.0"
```

> `.gitignore` 가 `node_modules/` 와 `dist/` 를 제외하므로 소스만 올라간다.
> 확인: `git ls-files` (추적 파일 목록) · `git status` (깨끗하면 정상)

### 2) GitHub 원격 연결 & 푸시 (최초 1회)

GitHub 에서 빈 저장소 `cc-workspace` 를 먼저 만든 뒤:

```powershell
git branch -M main
git remote add origin https://github.com/AnsibleMage/cc-workspace.git
git push -u origin main
```

> 푸시할 때 GitHub 로그인 창이 뜨면 계정 인증(브라우저)으로 통과.

### 3) 이후 — 수정할 때마다 (반복)

```powershell
git add .
git commit -m "수정 내용 요약"
git push
```

### 자주 쓰는 확인 명령

```powershell
git status            # 변경/스테이징 상태
git log --oneline     # 커밋 이력
git ls-files          # 추적 중인 파일 (node_modules/dist 없어야 정상)
git remote -v         # 연결된 원격 저장소
```
