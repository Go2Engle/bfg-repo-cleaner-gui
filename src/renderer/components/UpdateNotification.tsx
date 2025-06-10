import React, { useState, useEffect } from 'react';
import './UpdateNotification.scss';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

interface UpdateNotificationProps {
  onCheckForUpdates?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onCheckForUpdates }) => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<{ version: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [showNoUpdateMessage, setShowNoUpdateMessage] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    const api = window.electronAPI as any;
    
    // Get current app version
    if (api?.getAppVersion) {
      api.getAppVersion().then(setCurrentVersion);
    }

    // Set up event listeners
    if (api?.onUpdateAvailable) {
      api.onUpdateAvailable((updateInfo: any) => {
        setUpdateAvailable(updateInfo);
        setCheckingForUpdates(false);
        setShowNoUpdateMessage(false);
      });
    }

    if (api?.onUpdateNotAvailable) {
      api.onUpdateNotAvailable(() => {
        setCheckingForUpdates(false);
        setShowNoUpdateMessage(true);
        setTimeout(() => setShowNoUpdateMessage(false), 5000);
      });
    }

    if (api?.onUpdateDownloaded) {
      api.onUpdateDownloaded((info: any) => {
        setUpdateDownloaded(info);
        setIsDownloading(false);
        setDownloadProgress(null);
      });
    }

    if (api?.onDownloadProgress) {
      api.onDownloadProgress((progress: any) => {
        setDownloadProgress(progress);
      });
    }

    if (api?.onUpdateError) {
      api.onUpdateError((error: any) => {
        setUpdateError(error.message);
        setIsDownloading(false);
        setCheckingForUpdates(false);
        setDownloadProgress(null);
        setTimeout(() => setUpdateError(null), 10000);
      });
    }
  }, []);

  const handleCheckForUpdates = async () => {
    const api = window.electronAPI as any;
    setCheckingForUpdates(true);
    setUpdateError(null);
    setShowNoUpdateMessage(false);
    try {
      if (api?.checkForUpdates) {
        await api.checkForUpdates();
      }
      if (onCheckForUpdates) {
        onCheckForUpdates();
      }
    } catch (error) {
      setCheckingForUpdates(false);
      setUpdateError('Failed to check for updates');
    }
  };

  const handleDownloadUpdate = async () => {
    if (!updateAvailable) return;
    
    const api = window.electronAPI as any;
    setIsDownloading(true);
    setUpdateError(null);
    try {
      if (api?.downloadUpdate) {
        await api.downloadUpdate();
      }
    } catch (error) {
      setIsDownloading(false);
      setUpdateError('Failed to download update');
    }
  };

  const handleInstallUpdate = () => {
    const api = window.electronAPI as any;
    if (api?.installUpdate) {
      api.installUpdate();
    }
  };

  const handleDismissUpdate = () => {
    setUpdateAvailable(null);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  return (
    <div className="update-notification">
      {/* Check for updates button */}
      <div className="update-check-section">
        <button 
          className="update-check-btn"
          onClick={handleCheckForUpdates}
          disabled={checkingForUpdates || isDownloading}
        >
          {checkingForUpdates ? 'Checking...' : 'Check for Updates'}
        </button>
        {currentVersion && (
          <span className="current-version">Current version: {currentVersion}</span>
        )}
      </div>

      {/* No update available message */}
      {showNoUpdateMessage && (
        <div className="update-message update-message--info">
          <div className="update-message__content">
            <span className="update-message__icon">ℹ️</span>
            <span>You're running the latest version!</span>
          </div>
        </div>
      )}

      {/* Update available notification */}
      {updateAvailable && !updateDownloaded && (
        <div className="update-message update-message--available">
          <div className="update-message__content">
            <div className="update-message__header">
              <span className="update-message__icon">🔄</span>
              <div className="update-message__info">
                <h4>Update Available</h4>
                <p>Version {updateAvailable.version} is available</p>
                {updateAvailable.releaseName && (
                  <p className="release-name">{updateAvailable.releaseName}</p>
                )}
              </div>
            </div>
            
            {updateAvailable.releaseNotes && (
              <div className="release-notes">
                <details>
                  <summary>Release Notes</summary>
                  <div dangerouslySetInnerHTML={{ __html: updateAvailable.releaseNotes }} />
                </details>
              </div>
            )}
            
            <div className="update-message__actions">
              <button 
                className="btn btn--primary"
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download Update'}
              </button>
              <button 
                className="btn btn--secondary"
                onClick={handleDismissUpdate}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download progress */}
      {isDownloading && downloadProgress && (
        <div className="update-message update-message--downloading">
          <div className="update-message__content">
            <div className="update-message__header">
              <span className="update-message__icon">⬇️</span>
              <div className="update-message__info">
                <h4>Downloading Update</h4>
                <p>Version {updateAvailable?.version}</p>
              </div>
            </div>
            
            <div className="download-progress">
              <div className="progress-bar">
                <div 
                  className="progress-bar__fill"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <div className="progress-info">
                <span>{downloadProgress.percent}%</span>
                <span>
                  {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                </span>
                <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update downloaded notification */}
      {updateDownloaded && (
        <div className="update-message update-message--ready">
          <div className="update-message__content">
            <div className="update-message__header">
              <span className="update-message__icon">✅</span>
              <div className="update-message__info">
                <h4>Update Ready</h4>
                <p>Version {updateDownloaded.version} has been downloaded</p>
              </div>
            </div>
            
            <div className="update-message__actions">
              <button 
                className="btn btn--primary"
                onClick={handleInstallUpdate}
              >
                Restart & Install
              </button>
              <button 
                className="btn btn--secondary"
                onClick={() => setUpdateDownloaded(null)}
              >
                Install Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {updateError && (
        <div className="update-message update-message--error">
          <div className="update-message__content">
            <span className="update-message__icon">❌</span>
            <span>Update Error: {updateError}</span>
          </div>
        </div>
      )}
    </div>
  );
};
