import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectRepository: () => ipcRenderer.invoke('select-repository'),
  selectBfgJar: () => ipcRenderer.invoke('select-bfg-jar'),
  cleanRepository: (options: {
    repoPath: string;
    bfgPath: string;
    textReplacements: string[];
    fileSizes: string;
  }) => ipcRenderer.invoke('clean-repository', options)
});
