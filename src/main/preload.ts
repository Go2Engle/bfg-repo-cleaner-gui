import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectRepository: () => ipcRenderer.invoke('select-repository'),
  selectBfgJar: () => ipcRenderer.invoke('select-bfg-jar'),
  selectCloneDirectory: () => ipcRenderer.invoke('select-clone-directory'),
  cloneRepository: (options: {
    repoUrl: string;
    targetDir: string;
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
