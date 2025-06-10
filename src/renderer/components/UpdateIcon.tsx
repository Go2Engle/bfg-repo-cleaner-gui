import React, { useState, useEffect } from 'react';
import './UpdateIcon.scss';

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

export const UpdateIcon: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<{ version: string } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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
      });
    }

    if (api?.onUpdateNotAvailable) {
      api.onUpdateNotAvailable(() => {
        setCheckingForUpdates(false);
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
      });
    }
  }, []);

  const handleCheckForUpdates = async () => {
    const api = window.electronAPI as any;
    setCheckingForUpdates(true);
    setUpdateError(null);
    setShowDropdown(true);
    try {
      if (api?.checkForUpdates) {
        await api.checkForUpdates();
      }
    } catch (error) {
      setCheckingForUpdates(false);
      setUpdateError('Failed to check for updates');
    }
  };

  const handleDownloadUpdate = async () => {
    const api = window.electronAPI as any;
    setIsDownloading(true);
    try {
      if (api?.downloadUpdate) {
        await api.downloadUpdate();
      }
    } catch (error) {
      setIsDownloading(false);
      setUpdateError('Failed to download update');
    }
  };

  const handleInstallUpdate = async () => {
    const api = window.electronAPI as any;
    try {
      if (api?.installUpdate) {
        await api.installUpdate();
      }
    } catch (error) {
      setUpdateError('Failed to install update');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const getIconStatus = () => {
    if (updateDownloaded) return 'ready';
    if (updateAvailable) return 'available';
    if (isDownloading) return 'downloading';
    if (checkingForUpdates) return 'checking';
    if (updateError) return 'error';
    return 'default';
  };

  const getIconContent = () => {
    const status = getIconStatus();
    switch (status) {
      case 'ready':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        );
      case 'available':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        );
      case 'downloading':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17,8 12,13 7,8"/>
            <line x1="12" y1="13" x2="12" y2="3"/>
          </svg>
        );
      case 'checking':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        );
    }
  };

  const getStatusText = () => {
    const status = getIconStatus();
    switch (status) {
      case 'ready':
        return `Update ready (v${updateDownloaded?.version})`;
      case 'available':
        return `Update available (v${updateAvailable?.version})`;
      case 'downloading':
        return `Downloading... (${downloadProgress?.percent}%)`;
      case 'checking':
        return 'Checking for updates...';
      case 'error':
        return `Update error: ${updateError}`;
      default:
        return 'Check for updates';
    }
  };

  return (
    <div className="update-icon">
      <button
        className={`update-icon__button update-icon__button--${getIconStatus()}`}
        onClick={() => {
          if (updateDownloaded) {
            handleInstallUpdate();
          } else if (updateAvailable) {
            handleDownloadUpdate();
          } else {
            handleCheckForUpdates();
          }
        }}
        disabled={isDownloading || checkingForUpdates}
        title={getStatusText()}
      >
        <span className="update-icon__icon">{getIconContent()}</span>
        {isDownloading && downloadProgress && (
          <div 
            className="update-icon__progress"
            style={{
              background: `conic-gradient(var(--primary-color) ${downloadProgress.percent * 3.6}deg, transparent 0deg)`
            }}
          />
        )}
      </button>

      {showDropdown && (updateAvailable || updateError || checkingForUpdates) && (
        <div className="update-dropdown">
          <div className="update-dropdown__content">
            {checkingForUpdates && (
              <div className="update-dropdown__item">
                <div className="update-dropdown__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <span>Checking for updates...</span>
              </div>
            )}

            {updateAvailable && !isDownloading && (
              <div className="update-dropdown__item">
                <div className="update-dropdown__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div>
                  <div className="update-dropdown__title">Update Available</div>
                  <div className="update-dropdown__subtitle">Version {updateAvailable.version}</div>
                  <div className="update-dropdown__actions">
                    <button 
                      className="update-dropdown__button update-dropdown__button--primary"
                      onClick={handleDownloadUpdate}
                    >
                      Download
                    </button>
                    <button 
                      className="update-dropdown__button update-dropdown__button--secondary"
                      onClick={() => setShowDropdown(false)}
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isDownloading && downloadProgress && (
              <div className="update-dropdown__item">
                <div className="update-dropdown__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,13 7,8"/>
                    <line x1="12" y1="13" x2="12" y2="3"/>
                  </svg>
                </div>
                <div>
                  <div className="update-dropdown__title">Downloading...</div>
                  <div className="update-dropdown__subtitle">
                    {downloadProgress.percent}% • {formatSpeed(downloadProgress.bytesPerSecond)}
                  </div>
                  <div className="update-dropdown__progress-bar">
                    <div 
                      className="update-dropdown__progress-fill"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {updateDownloaded && (
              <div className="update-dropdown__item">
                <div className="update-dropdown__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <div>
                  <div className="update-dropdown__title">Update Ready</div>
                  <div className="update-dropdown__subtitle">Version {updateDownloaded.version}</div>
                  <div className="update-dropdown__actions">
                    <button 
                      className="update-dropdown__button update-dropdown__button--primary"
                      onClick={handleInstallUpdate}
                    >
                      Restart & Install
                    </button>
                    <button 
                      className="update-dropdown__button update-dropdown__button--secondary"
                      onClick={() => setShowDropdown(false)}
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            )}

            {updateError && (
              <div className="update-dropdown__item update-dropdown__item--error">
                <div className="update-dropdown__icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <div>
                  <div className="update-dropdown__title">Update Error</div>
                  <div className="update-dropdown__subtitle">{updateError}</div>
                  <div className="update-dropdown__actions">
                    <button 
                      className="update-dropdown__button update-dropdown__button--primary"
                      onClick={handleCheckForUpdates}
                    >
                      Retry
                    </button>
                    <button 
                      className="update-dropdown__button update-dropdown__button--secondary"
                      onClick={() => {
                        setUpdateError(null);
                        setShowDropdown(false);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { UpdateIcon as default };
