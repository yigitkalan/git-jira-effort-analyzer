import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Store from 'electron-store';
import { scanRepos, ScanOptions } from './git-service';
import { getMyself } from './jira-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;
const store = new Store();

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  createWindow();

  // IPC Handlers - File System
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    });
    return result.filePaths[0];
  });

  // IPC Handlers - Settings
  ipcMain.handle('get-settings', (_event, key) => {
    return store.get(key);
  });

  ipcMain.handle('save-settings', (_event, key, value) => {
    store.set(key, value);
  });

  // IPC Handlers - Git
  ipcMain.handle('scan-repos', async (_event, options: ScanOptions) => {
    return await scanRepos(options);
  });



  ipcMain.handle('jira-get-myself', async () => {
    return await getMyself();
  });

  ipcMain.handle('jira-get-issue-id', async (_event, issueKey: string) => {
    const { getIssueId } = await import('./jira-service');
    return await getIssueId(issueKey);
  });

  ipcMain.handle('jira-get-issue-details', async (_event, issueKey: string) => {
    const { getIssueDetails } = await import('./jira-service');
    return await getIssueDetails(issueKey);
  });
  // IPC Handlers - Tempo API
  ipcMain.handle('tempo-get-worklogs', async (_event, from: string, to: string) => {
    const { getWorklogs } = await import('./tempo-service');
    return await getWorklogs(from, to);
  });

  ipcMain.handle('tempo-submit-worklog', async (_event, worklog) => {
    const { submitWorklog } = await import('./tempo-service');
    return await submitWorklog(worklog);
  });

  // IPC Handler - Open External URL
  ipcMain.handle('open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });
});
