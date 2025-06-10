import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog, app } from 'electron';
import log from 'electron-log';
import * as path from 'path';

// Configure logging for auto-updater
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true;

// Set the update configuration file path
const updateConfigPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app-update.yml')
  : path.join(__dirname, '..', '..', 'app-update.yml');

// Configure the updater with the config file path
autoUpdater.updateConfigPath = updateConfigPath;

export class AutoUpdater {
  private mainWindow: BrowserWindow;
  private updateCheckInProgress = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
        releaseDate: info.releaseDate
      });
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available:', info);
      if (this.updateCheckInProgress) {
        this.mainWindow.webContents.send('update-not-available');
        this.updateCheckInProgress = false;
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.mainWindow.webContents.send('update-downloaded', {
        version: info.version
      });
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.mainWindow.webContents.send('download-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
      });
    });

    // Error during update
    autoUpdater.on('error', (error) => {
      log.error('Error in auto-updater:', error);
      this.mainWindow.webContents.send('update-error', {
        message: error.message
      });
      this.updateCheckInProgress = false;
    });
  }

  // Check for updates manually
  public async checkForUpdates(): Promise<void> {
    if (this.updateCheckInProgress) {
      return;
    }

    this.updateCheckInProgress = true;
    try {
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      log.error('Error checking for updates:', error);
      this.updateCheckInProgress = false;
    }
  }

  // Check for updates silently (on app start)
  public async checkForUpdatesQuietly(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Error checking for updates quietly:', error);
    }
  }

  // Download update
  public async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Error downloading update:', error);
      throw error;
    }
  }

  // Install update and restart
  public installUpdate(): void {
    autoUpdater.quitAndInstall();
  }

  // Set update server URL (useful for testing or custom update servers)
  public setFeedURL(url: string): void {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: url
    });
  }
}
