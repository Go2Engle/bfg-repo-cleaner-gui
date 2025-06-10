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

const createWindow = (): void => {  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    frame: false, // Remove the default title bar completely
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // Remove titleBarOverlay for Windows to prevent default controls
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', '..', 'icons', 'png', '256x256.png'),
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Set up window event listeners to sync state with renderer
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized', false);
  });

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

// Window control handlers
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
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

// Handle cloning a repository with --mirror
ipcMain.handle('clone-repository', async (event, options) => {
  try {
    const { repoUrl, targetDir } = options;
    
    if (!repoUrl) {
      return { success: false, message: 'Repository URL is required' };
    }

    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Generate a directory name based on the repo URL
    const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'cloned-repo';
    const cloneDir = path.join(targetDir, `${repoName}.git`);
    
    // Construct the git clone command with --mirror
    const command = `git clone --mirror "${repoUrl}" "${cloneDir}"`;
    
    // Execute the command
    const { stdout, stderr } = await execPromise(command);
    
    return {
      success: true,
      message: 'Repository cloned successfully with --mirror',
      output: stdout,
      repoPath: cloneDir,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error cloning repository',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle directory selection for clone target
ipcMain.handle('select-clone-directory', async () => {
  if (!mainWindow) return { canceled: true };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Directory to Clone Repository Into'
  });
  
  return result;
});

// Handle running post-cleaning Git commands
ipcMain.handle('run-post-cleaning-commands', async (event, options) => {
  try {
    const { repoPath } = options;
    
    if (!fs.existsSync(repoPath)) {
      return { success: false, message: 'Repository path does not exist' };
    }
    
    console.log(`Running post-cleaning commands in path: ${repoPath}`);
    
    // Split the commands to execute them one by one for better error handling
    // First, run git reflog expire
    let reflogCommand = `cd "${repoPath}" && git reflog expire --expire=now --all`;
    console.log(`Executing command: ${reflogCommand}`);
    const reflogResult = await execPromise(reflogCommand);
    console.log('Reflog result:', reflogResult.stdout, reflogResult.stderr);
    
    // Then run git gc
    let gcCommand = `cd "${repoPath}" && git gc --prune=now --aggressive`;
    console.log(`Executing command: ${gcCommand}`);
    const gcResult = await execPromise(gcCommand);
    console.log('GC result:', gcResult.stdout, gcResult.stderr);
    
    // For push, we need to handle the case of no remote configured
    // First check if origin exists
    let checkOriginCommand = `cd "${repoPath}" && git remote -v`;
    const checkOriginResult = await execPromise(checkOriginCommand);
    console.log('Remote check result:', checkOriginResult.stdout);
    
    let pushOutput = '';
    if (checkOriginResult.stdout.includes('origin')) {
      // Use --mirror for push since we cloned with --mirror
      let pushCommand = `cd "${repoPath}" && git push --mirror`;
      console.log(`Executing command: ${pushCommand}`);
      try {
        const pushResult = await execPromise(pushCommand);
        pushOutput = `Push result: ${pushResult.stdout || 'Success!'}\n${pushResult.stderr || ''}`;
        console.log('Push result:', pushResult.stdout, pushResult.stderr);
      } catch (pushError) {
        pushOutput = `Push failed: ${pushError instanceof Error ? pushError.message : String(pushError)}`;
        console.error('Push error:', pushOutput);
      }
    } else {
      pushOutput = 'Skipped push: No origin remote configured.';
      console.log(pushOutput);
    }
    
    return {
      success: true,
      message: 'Post-cleaning commands executed successfully',
      output: `Reflog: ${reflogResult.stdout || 'Success!'}\n\nGC: ${gcResult.stdout || 'Success!'}\n\n${pushOutput}`
    };
  } catch (error) {
    console.error('Error in post-cleaning commands:', error);
    return {
      success: false,
      message: 'Error executing post-cleaning commands',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

// Handle reset and cleanup request
ipcMain.handle('reset-and-cleanup', async (event, options) => {
  try {
    const { repoPath } = options;
    
    if (repoPath && fs.existsSync(repoPath)) {
      // Use rimraf or fs.rmSync (Node.js >= 14) to recursively delete the directory
      fs.rmSync(repoPath, { recursive: true, force: true });
      
      // Also try to delete any BFG report folders
      const repoDir = path.dirname(repoPath);
      const repoName = path.basename(repoPath);
      const bfgReportPath = path.join(repoDir, `${repoName}.bfg-report`);
      
      if (fs.existsSync(bfgReportPath)) {
        fs.rmSync(bfgReportPath, { recursive: true, force: true });
      }
    }
    
    return {
      success: true,
      message: 'Reset and cleanup completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error during reset and cleanup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
});
