// main.js - Electron 메인 프로세스
// 역할: 다중 창 + 각 창마다 PowerShell(pty) 실행 + 파일/메모 IPC + 메뉴

const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const pty = require('@lydell/node-pty');
const os = require('os');
const fs = require('fs');
const path = require('path');

// 창마다 pty 를 따로 관리 (webContents.id -> ptyProcess)
const ptys = new Map();

// 시작 디렉터리 (사용자 홈). 원하면 아래 경로를 고정 폴더로 바꾸세요.
const START_DIR = os.homedir();

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 1000,
    title: 'CC Workspace',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  // webContents id 를 미리 확보 (closed 시점엔 webContents 가 파괴되어 접근 불가)
  const id = win.webContents.id;

  // 창이 준비되면 그 창 전용 PowerShell 실행
  win.webContents.on('did-finish-load', () => {
    startPty(win, id);
  });

  // 창 닫힐 때 그 창의 pty 정리 (미리 확보한 id 사용)
  win.on('closed', () => {
    const p = ptys.get(id);
    if (p) {
      try { p.kill(); } catch (e) {}
      ptys.delete(id);
    }
  });

  return win;
}

// ---------- PowerShell (pty) : 창마다 1개 ----------
function startPty(win, id) {
  const shellExe = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

  const ptyProcess = pty.spawn(shellExe, [], {
    name: 'xterm-256color',
    cols: 100,
    rows: 24,
    cwd: START_DIR,
    env: process.env
  });

  ptys.set(id, ptyProcess);

  // pty 출력 -> 해당 창
  ptyProcess.onData((data) => {
    if (!win.isDestroyed()) win.webContents.send('pty:data', data);
  });

  ptyProcess.onExit(() => {
    ptys.delete(id);
  });
}

// 렌더러 입력 -> 해당 창의 pty
ipcMain.on('pty:input', (event, data) => {
  const p = ptys.get(event.sender.id);
  if (p) p.write(data);
});

// 터미널 크기 변경 -> 해당 창의 pty
ipcMain.on('pty:resize', (event, { cols, rows }) => {
  const p = ptys.get(event.sender.id);
  if (p && cols > 0 && rows > 0) {
    try { p.resize(cols, rows); } catch (e) {}
  }
});

// ---------- 파일 목록 ----------
ipcMain.handle('fs:list', (event, dirPath) => {
  const target = dirPath || START_DIR;
  try {
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const items = entries.map((e) => ({
      name: e.name,
      isDir: e.isDirectory(),
      path: path.join(target, e.name)
    }));
    // 폴더 먼저, 그다음 파일 (이름순)
    items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return {
      ok: true,
      cwd: target,
      parent: path.dirname(target),
      items
    };
  } catch (err) {
    return { ok: false, error: String(err), cwd: target };
  }
});

// 폴더에서 파일 클릭 시 기본 프로그램으로 열기
ipcMain.handle('fs:open', (event, filePath) => {
  shell.openPath(filePath);
  return true;
});

// ---------- 메모 열기 ----------
ipcMain.handle('memo:open', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: '파일 열기',
    defaultPath: START_DIR,
    properties: ['openFile'],
    filters: [
      { name: '텍스트/마크다운', extensions: ['txt', 'md', 'log', 'json', 'js', 'ts', 'css', 'html'] },
      { name: '모든 파일', extensions: ['*'] }
    ]
  });
  if (canceled || !filePaths || !filePaths[0]) return { ok: false };
  try {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    return { ok: true, filePath: filePaths[0], content };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---------- 메모 저장 ----------
// filePath 가 있으면 그 파일에 바로 덮어쓰기, 없으면 저장 대화상자 표시
ipcMain.handle('memo:save', async (event, { content, filePath }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  let target = filePath;
  if (!target) {
    const res = await dialog.showSaveDialog(win, {
      title: '다른 이름으로 저장',
      defaultPath: path.join(START_DIR, 'memo.txt'),
      filters: [
        { name: '텍스트', extensions: ['txt'] },
        { name: '마크다운', extensions: ['md'] }
      ]
    });
    if (res.canceled || !res.filePath) return { ok: false };
    target = res.filePath;
  }
  try {
    fs.writeFileSync(target, content, 'utf8');
    return { ok: true, filePath: target };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// ---------- 애플리케이션 메뉴 (한글) ----------
function buildMenu() {
  // 현재 포커스된 창의 렌더러로 메시지 전송
  const sendFocused = (channel) => () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send(channel);
  };
  const template = [
    {
      label: '파일',
      submenu: [
        { label: '새 창', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
        { type: 'separator' },
        { label: '열기...', accelerator: 'CmdOrCtrl+O', click: sendFocused('menu:open') },
        { label: '저장', accelerator: 'CmdOrCtrl+S', click: sendFocused('menu:save') },
        { label: '다른 이름으로 저장...', accelerator: 'CmdOrCtrl+Shift+S', click: sendFocused('menu:saveAs') },
        { type: 'separator' },
        { label: '종료', role: 'quit' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '새로고침', role: 'reload' },
        { label: '개발자 도구', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '실제 크기', role: 'resetZoom' },
        { label: '확대', role: 'zoomIn' },
        { label: '축소', role: 'zoomOut' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
