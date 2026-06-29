// renderer.js - 렌더러 (UI 로직)
// nodeIntegration: true, contextIsolation: false 환경이라 require 직접 사용

const { ipcRenderer, clipboard } = require('electron');
const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');

// ---------- 1. 터미널 ----------
const term = new Terminal({
  fontFamily: 'Consolas, "D2Coding", monospace',
  fontSize: 13,
  cursorBlink: true,
  theme: { background: '#1e1e1e', foreground: '#e0e0e0' }
});
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));

function fitTerminal() {
  try {
    fitAddon.fit();
    ipcRenderer.send('pty:resize', { cols: term.cols, rows: term.rows });
  } catch (e) {}
}
setTimeout(fitTerminal, 100);
window.addEventListener('resize', fitTerminal);

// pty <-> 터미널 양방향 연결
ipcRenderer.on('pty:data', (event, data) => term.write(data));
term.onData((data) => ipcRenderer.send('pty:input', data));

// 터미널 복사/붙여넣기 — xterm 은 선택만 하고 클립보드 연동을 자동으로 하지 않으므로 직접 배선한다.
// Ctrl+C / Ctrl+Insert : 선택 영역이 있으면 복사, 없으면 그대로 통과(SIGINT 유지)
// Ctrl+V / Shift+Insert: 클립보드를 pty 로 붙여넣기 (bracketed paste 모드 존중)
term.attachCustomKeyEventHandler((e) => {
  if (e.type !== 'keydown') return true;
  const isCopy = (e.ctrlKey && !e.shiftKey && e.code === 'KeyC') || (e.ctrlKey && e.code === 'Insert');
  const isPaste = (e.ctrlKey && !e.shiftKey && e.code === 'KeyV') || (e.shiftKey && e.code === 'Insert');
  if (isCopy) {
    if (term.hasSelection()) {
      clipboard.writeText(term.getSelection());
      return false; // 복사했으면 ^C 를 셸로 보내지 않음
    }
    return true; // 선택 없으면 Ctrl+C = SIGINT 로 통과
  }
  if (isPaste) {
    const text = clipboard.readText();
    if (text) term.paste(text);
    return false;
  }
  return true;
});

// ---------- 2. 메모 ----------
const memo = document.getElementById('memo');
const memoFileLabel = document.getElementById('memo-file');
let currentFilePath = null; // 현재 열려있는 파일 경로 (없으면 새 메모)

function setCurrentFile(filePath) {
  currentFilePath = filePath || null;
  if (currentFilePath) {
    const name = currentFilePath.split(/[\\/]/).pop();
    memoFileLabel.textContent = name;
    memoFileLabel.title = currentFilePath;
  } else {
    memoFileLabel.textContent = '';
    memoFileLabel.title = '';
  }
}

function flashButton(btn, text) {
  const original = btn.dataset.label || btn.textContent;
  btn.dataset.label = original;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = btn.dataset.label), 1500);
}

// 파일 열기 (불러오기)
async function openFile() {
  const res = await ipcRenderer.invoke('memo:open');
  if (res.ok) {
    memo.value = res.content;
    setCurrentFile(res.filePath);
  }
}

// 저장: asNew=true 면 항상 새 경로 묻기, 아니면 열린 파일에 덮어쓰기
async function saveFile(asNew) {
  const filePath = asNew ? null : currentFilePath;
  const res = await ipcRenderer.invoke('memo:save', { content: memo.value, filePath });
  if (res.ok) {
    setCurrentFile(res.filePath);
    flashButton(document.getElementById('memo-save'), '저장됨 ✓');
  }
}

document.getElementById('memo-open').addEventListener('click', openFile);
document.getElementById('memo-save').addEventListener('click', () => saveFile(false));

// 메뉴(파일) 연동
ipcRenderer.on('menu:open', openFile);
ipcRenderer.on('menu:save', () => saveFile(false));
ipcRenderer.on('menu:saveAs', () => saveFile(true));

// ---------- 3. 폴더 ----------
const fileList = document.getElementById('file-list');
const cwdLabel = document.getElementById('cwd');

let currentCwd = null;   // 현재 폴더 경로
let selectedPath = null; // 한 번 클릭으로 지정된 경로
let selectedLi = null;

function selectItem(li, itemPath) {
  if (selectedLi) selectedLi.classList.remove('selected');
  selectedLi = li;
  selectedPath = itemPath;
  if (li) li.classList.add('selected');
}

async function loadDir(dirPath) {
  const res = await ipcRenderer.invoke('fs:list', dirPath);
  fileList.innerHTML = '';
  selectedLi = null;
  selectedPath = null;
  if (!res.ok) {
    cwdLabel.textContent = '접근 불가';
    return;
  }
  currentCwd = res.cwd;
  cwdLabel.textContent = res.cwd;
  cwdLabel.title = res.cwd + '   (한 번 클릭=지정 · 더블클릭=이동 · Ctrl+Shift+C=경로 복사)';

  // 상위 폴더로 (더블클릭 시 이동)
  const up = document.createElement('li');
  up.textContent = '📂 ..';
  up.className = 'up';
  up.title = res.parent;
  up.addEventListener('click', () => selectItem(up, res.parent));
  up.addEventListener('dblclick', () => loadDir(res.parent));
  fileList.appendChild(up);

  for (const item of res.items) {
    const li = document.createElement('li');
    li.textContent = (item.isDir ? '📁 ' : '📄 ') + item.name;
    if (item.isDir) li.className = 'dir';
    li.title = item.path;
    // 한 번 클릭 = 지정(하이라이트)
    li.addEventListener('click', () => selectItem(li, item.path));
    // 더블클릭 = 폴더 진입 / 파일 열기
    li.addEventListener('dblclick', () => {
      if (item.isDir) loadDir(item.path);
      else ipcRenderer.invoke('fs:open', item.path);
    });
    fileList.appendChild(li);
  }
}

// Ctrl+Shift+C → 지정된 경로 클립보드 복사 (폴더 항목을 클릭해 지정한 경우에만)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
    if (selectedPath) {
      clipboard.writeText(selectedPath);
      e.preventDefault();
      const prev = cwdLabel.textContent;
      cwdLabel.textContent = '📋 복사됨: ' + selectedPath;
      setTimeout(() => { cwdLabel.textContent = currentCwd; }, 1200);
    }
  }
});

// 시작 시 홈 디렉터리 로드 (경로 미지정 시 main이 홈으로 처리)
loadDir(null);
