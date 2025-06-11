import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as https from 'https';
import { app } from 'electron';
import { BFGVersionInfo, BFGDownloadResult, BFGManagerStatus } from '../shared/types';

export class BFGManager {
  private static instance: BFGManager;
  private bfgDirectory: string;
  private currentVersion: string | null = null;
  private isDownloading: boolean = false;

  private constructor() {
    // Determine platform-specific user data directory
    this.bfgDirectory = this.getBFGDirectory();
    this.ensureDirectoryExists();
  }

  public static getInstance(): BFGManager {
    if (!BFGManager.instance) {
      BFGManager.instance = new BFGManager();
    }
    return BFGManager.instance;
  }

  private getBFGDirectory(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'bfg');
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.bfgDirectory)) {
      fs.mkdirSync(this.bfgDirectory, { recursive: true });
    }
  }

  /**
   * Fetch the latest BFG version information from Maven metadata
   */
  private async fetchLatestVersionInfo(): Promise<BFGVersionInfo> {
    return new Promise((resolve, reject) => {
      const url = 'https://repo1.maven.org/maven2/com/madgag/bfg/maven-metadata.xml';
      
      https.get(url, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            // Parse the XML manually (simple approach for this specific format)
            const latestMatch = data.match(/<latest>(.+?)<\/latest>/);
            const releaseMatch = data.match(/<release>(.+?)<\/release>/);
            const lastUpdatedMatch = data.match(/<lastUpdated>(.+?)<\/lastUpdated>/);
            
            if (!latestMatch || !releaseMatch) {
              throw new Error('Could not parse Maven metadata XML');
            }

            // Extract all versions
            const versionsRegex = /<version>(.+?)<\/version>/g;
            const versions: string[] = [];
            let match;
            while ((match = versionsRegex.exec(data)) !== null) {
              versions.push(match[1]);
            }

            resolve({
              latest: latestMatch[1],
              release: releaseMatch[1],
              versions,
              lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1] : ''
            });
          } catch (error) {
            reject(new Error(`Failed to parse Maven metadata: ${error instanceof Error ? error.message : String(error)}`));
          }
        });
      }).on('error', (error) => {
        reject(new Error(`Failed to fetch Maven metadata: ${error.message}`));
      });
    });
  }

  /**
   * Download the BFG jar file for a specific version
   */
  private async downloadBFGJar(version: string): Promise<BFGDownloadResult> {
    if (this.isDownloading) {
      return {
        success: false,
        message: 'Download already in progress'
      };
    }

    this.isDownloading = true;

    try {
      const jarFileName = `bfg-${version}.jar`;
      const jarPath = path.join(this.bfgDirectory, jarFileName);
      const url = `https://repo1.maven.org/maven2/com/madgag/bfg/${version}/${jarFileName}`;

      // Remove existing jar if it exists
      if (fs.existsSync(jarPath)) {
        fs.unlinkSync(jarPath);
      }

      return new Promise((resolve) => {
        const file = fs.createWriteStream(jarPath);
        
        https.get(url, (response) => {
          if (response.statusCode !== 200) {
            fs.unlinkSync(jarPath);
            resolve({
              success: false,
              message: `Failed to download BFG jar: HTTP ${response.statusCode}`
            });
            return;
          }

          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            this.currentVersion = version;
            resolve({
              success: true,
              version,
              path: jarPath,
              message: `Successfully downloaded BFG ${version}`
            });
          });
        }).on('error', (error) => {
          fs.unlinkSync(jarPath);
          resolve({
            success: false,
            message: `Failed to download BFG jar: ${error.message}`,
            error: error.message
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Error downloading BFG jar: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Get the current local BFG version if it exists
   */
  private getCurrentLocalVersion(): string | null {
    try {
      const files = fs.readdirSync(this.bfgDirectory);
      const bfgJars = files.filter(file => file.startsWith('bfg-') && file.endsWith('.jar'));
      
      if (bfgJars.length === 0) {
        return null;
      }

      // Extract version from filename (e.g., "bfg-1.15.0.jar" -> "1.15.0")
      const versionMatch = bfgJars[0].match(/bfg-(.+)\.jar$/);
      return versionMatch ? versionMatch[1] : null;
    } catch (error) {
      console.error('Error reading local BFG directory:', error);
      return null;
    }
  }

  /**
   * Get the path to the current BFG jar file
   */
  private getCurrentBFGPath(): string | null {
    const version = this.getCurrentLocalVersion();
    if (!version) {
      return null;
    }

    const jarPath = path.join(this.bfgDirectory, `bfg-${version}.jar`);
    return fs.existsSync(jarPath) ? jarPath : null;
  }

  /**
   * Compare two version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Check if an update is needed and download if necessary
   */
  public async checkAndUpdateBFG(): Promise<BFGDownloadResult> {
    try {
      console.log('Checking for BFG updates...');
      
      const versionInfo = await this.fetchLatestVersionInfo();
      const currentLocal = this.getCurrentLocalVersion();
      
      console.log(`Latest version: ${versionInfo.latest}, Local version: ${currentLocal || 'none'}`);

      // If no local version exists, download the latest
      if (!currentLocal) {
        console.log('No local BFG version found, downloading latest...');
        return await this.downloadBFGJar(versionInfo.latest);
      }

      // Check if local version is outdated
      if (this.compareVersions(versionInfo.latest, currentLocal) > 0) {
        console.log(`Local version ${currentLocal} is outdated, downloading ${versionInfo.latest}...`);
        
        // Remove old version before downloading new one
        const files = fs.readdirSync(this.bfgDirectory);
        const oldJars = files.filter(file => file.startsWith('bfg-') && file.endsWith('.jar'));
        oldJars.forEach(jar => {
          const oldJarPath = path.join(this.bfgDirectory, jar);
          if (fs.existsSync(oldJarPath)) {
            fs.unlinkSync(oldJarPath);
            console.log(`Removed old BFG jar: ${jar}`);
          }
        });

        return await this.downloadBFGJar(versionInfo.latest);
      }

      // Local version is up to date
      this.currentVersion = currentLocal;
      return {
        success: true,
        version: currentLocal,
        path: this.getCurrentBFGPath() || '',
        message: `BFG ${currentLocal} is up to date`
      };
    } catch (error) {
      console.error('Error checking for BFG updates:', error);
      return {
        success: false,
        message: `Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get the current status of the BFG manager
   */
  public getStatus(): BFGManagerStatus {
    const localVersion = this.getCurrentLocalVersion();
    const jarPath = this.getCurrentBFGPath();

    return {
      isAvailable: localVersion !== null && jarPath !== null,
      version: localVersion,
      path: jarPath,
      isDownloading: this.isDownloading,
      error: null
    };
  }

  /**
   * Force download a specific version (for testing or manual selection)
   */
  public async downloadSpecificVersion(version: string): Promise<BFGDownloadResult> {
    return await this.downloadBFGJar(version);
  }

  /**
   * Get the list of available versions
   */
  public async getAvailableVersions(): Promise<string[]> {
    try {
      const versionInfo = await this.fetchLatestVersionInfo();
      return versionInfo.versions;
    } catch (error) {
      console.error('Error fetching available versions:', error);
      return [];
    }
  }
}
