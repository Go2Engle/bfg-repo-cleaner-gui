import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

// When the app is ready, create the window
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check for BFG jar existence and version
const execPromise = promisify(exec);

// Handle repository cleaning request
ipcMain.handle('clean-repository', async (event, options) => {
  try {
    const { repoPath, bfgPath, textReplacements, fileSizes } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }
    
    if (!fs.existsSync(bfgPath)) {
      return { success: false, message: 'BFG jar file path does not exist' };
    }
    
    // Construct the BFG command based on user options
    let command = `java -jar "${bfgPath}" `;
    
    // Add text replacements if any
    if (textReplacements && textReplacements.length > 0) {
      // Create a temporary replacements file
      const replacementsFile = path.join(app.getPath('temp'), 'bfg-replacements.txt');
      fs.writeFileSync(replacementsFile, textReplacements.join('\n'));
      command += `--replace-text "${replacementsFile}" `;
    }
    
    // Add file size filter if specified
    if (fileSizes && fileSizes.trim()) {
      command += `--strip-blobs-bigger-than ${fileSizes} `;
    }
    
    // Add the repository path
    command += `"${repoPath}"`;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    return {
      success: true,
      message: 'Repository cleaned successfully',
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error cleaning repository',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle repository path selection dialog
ipcMain.handle('select-repository', async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });
  
  return result;
});

// Handle BFG jar file selection dialog
ipcMain.handle('select-bfg-jar', async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JAR Files', extensions: ['jar'] }
    ],
    title: 'Select BFG Repo-Cleaner JAR'
  });
  
  return result;
});
