export interface BFGVersionInfo {
  latest: string;
  release: string;
  versions: string[];
  lastUpdated: string;
}

export interface BFGDownloadResult {
  success: boolean;
  version?: string;
  path?: string;
  message: string;
  error?: string;
}

export interface BFGManagerStatus {
  isAvailable: boolean;
  version: string | null;
  path: string | null;
  isDownloading: boolean;
  error: string | null;
}
