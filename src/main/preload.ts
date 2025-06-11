import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectRepository: () => ipcRenderer.invoke('select-repository'),
  selectBfgJar: () => ipcRenderer.invoke('select-bfg-jar'),
  cloneRepository: (options: {
    repoUrl: string;
  }) => ipcRenderer.invoke('clone-repository', options),
  cleanRepository: (options: {
    repoPath: string;
    bfgPath: string;
    textReplacements: string[];
    fileSizes: string;
  }) => ipcRenderer.invoke('clean-repository', options),
  runPostCleaningCommands: (options: {
    repoPath: string;
  }) => ipcRenderer.invoke('run-post-cleaning-commands', options),
  resetAndCleanup: (options: {
    repoPath: string;
  }) => ipcRenderer.invoke('reset-and-cleanup', options),
  checkSecretsInHead: (options: {
    repoPath: string;
    secrets: string[];
  }) => ipcRenderer.invoke('check-secrets-in-head', options),  cleanSecretsFromHead: (options: {
    repoPath: string;
    secrets: string[];
    repoUrl: string;
    targetDir: string;
  }) => ipcRenderer.invoke('clean-secrets-from-head', options),
  // BFG Manager APIs
  bfgGetStatus: () => ipcRenderer.invoke('bfg-get-status'),
  bfgCheckUpdate: () => ipcRenderer.invoke('bfg-check-update'),
  bfgGetAvailableVersions: () => ipcRenderer.invoke('bfg-get-available-versions'),
  bfgDownloadVersion: (version: string) => ipcRenderer.invoke('bfg-download-version', version),  // BFG status listener
  onBfgStatusUpdate: (callback: (status: any) => void) => {
    ipcRenderer.on('bfg-status-update', (_, status) => callback(status));
  },
  // Working Directory Manager APIs
  workingDirGetStatus: () => ipcRenderer.invoke('working-dir-get-status'),
  workingDirClean: () => ipcRenderer.invoke('working-dir-clean'),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // Window state listener
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized));
  },
  // Platform information
  getPlatform: () => process.platform
});
