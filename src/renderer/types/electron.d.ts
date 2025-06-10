import { UpdaterEvents } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: {
      selectRepository: () => Promise<{ canceled: boolean; filePaths: string[]; }>;
      selectBfgJar: () => Promise<{ canceled: boolean; filePaths: string[]; }>;
      selectCloneDirectory: () => Promise<{ canceled: boolean; filePaths: string[]; }>;
      cloneRepository: (options: {
        repoUrl: string;
        targetDir: string;
      }) => Promise<any>;
      cleanRepository: (options: {
        repoPath: string;
        bfgPath: string;
        textReplacements: string[];
        fileSizes: string;
      }) => Promise<any>;
      runPostCleaningCommands: (options: {
        repoPath: string;
      }) => Promise<any>;
      resetAndCleanup: (options: {
        repoPath: string;
      }) => Promise<any>;
      checkSecretsInHead: (options: {
        repoPath: string;
        secrets: string[];
      }) => Promise<any>;
      cleanSecretsFromHead: (options: {
        repoPath: string;
        secrets: string[];
        repoUrl: string;
        targetDir: string;
      }) => Promise<any>;
      // Window controls
      windowMinimize?: () => Promise<void>;
      windowMaximize?: () => Promise<void>;
      windowClose?: () => Promise<void>;
      windowIsMaximized?: () => Promise<boolean>;
      // Window state listener
      onWindowMaximized?: (callback: (isMaximized: boolean) => void) => void;
      // Auto-updater
      checkForUpdates?: () => Promise<void>;
      downloadUpdate?: () => Promise<void>;
      installUpdate?: () => Promise<void>;
      getAppVersion?: () => Promise<string>;
      // Auto-updater event listeners
      onUpdateAvailable?: (callback: (updateInfo: UpdaterEvents['update-available']) => void) => void;
      onUpdateNotAvailable?: (callback: () => void) => void;
      onUpdateDownloaded?: (callback: (info: UpdaterEvents['update-downloaded']) => void) => void;
      onDownloadProgress?: (callback: (progress: UpdaterEvents['download-progress']) => void) => void;
      onUpdateError?: (callback: (error: UpdaterEvents['update-error']) => void) => void;
      // Platform information
      getPlatform?: () => string;
    };
  }
}

export {};
