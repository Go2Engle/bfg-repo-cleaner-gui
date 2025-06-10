export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface UpdateError {
  message: string;
}

export interface UpdaterEvents {
  'update-available': UpdateInfo;
  'update-not-available': void;
  'update-downloaded': { version: string };
  'download-progress': DownloadProgress;
  'update-error': UpdateError;
}
