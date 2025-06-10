import { contextBridge, ipcRenderer } from 'electron';
import { UpdaterEvents } from '../shared/types';

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
  checkSecretsInHead: (options: {
    repoPath: string;
    secrets: string[];
  }) => ipcRenderer.invoke('check-secrets-in-head', options),
  cleanSecretsFromHead: (options: {
    repoPath: string;
    secrets: string[];
    repoUrl: string;
    targetDir: string;
  }) => ipcRenderer.invoke('clean-secrets-from-head', options),
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  // Window state listener
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => {
    ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized));
  },
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  // Auto-updater event listeners
  onUpdateAvailable: (callback: (updateInfo: UpdaterEvents['update-available']) => void) => {
    ipcRenderer.on('update-available', (_, updateInfo) => callback(updateInfo));
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', () => callback());
  },
  onUpdateDownloaded: (callback: (info: UpdaterEvents['update-downloaded']) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
  },
  onDownloadProgress: (callback: (progress: UpdaterEvents['download-progress']) => void) => {
    ipcRenderer.on('download-progress', (_, progress) => callback(progress));
  },
  onUpdateError: (callback: (error: UpdaterEvents['update-error']) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error));
  },
  // Platform information
  getPlatform: () => process.platform
});
