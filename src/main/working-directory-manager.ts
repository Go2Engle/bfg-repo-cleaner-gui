import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export class WorkingDirectoryManager {
  private static instance: WorkingDirectoryManager;
  private workingDirectory: string;

  private constructor() {
    this.workingDirectory = this.getWorkingDirectory();
    this.initializeWorkingDirectory();
  }

  public static getInstance(): WorkingDirectoryManager {
    if (!WorkingDirectoryManager.instance) {
      WorkingDirectoryManager.instance = new WorkingDirectoryManager();
    }
    return WorkingDirectoryManager.instance;
  }

  private getWorkingDirectory(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'working');
  }

  /**
   * Initialize the working directory - create it if it doesn't exist, clean it if it does
   */
  private initializeWorkingDirectory(): void {
    try {
      // If directory exists, clean it completely
      if (fs.existsSync(this.workingDirectory)) {
        console.log('Cleaning existing working directory...');
        this.cleanWorkingDirectory();
      }
      
      // Create the directory
      fs.mkdirSync(this.workingDirectory, { recursive: true });
      console.log(`Working directory initialized: ${this.workingDirectory}`);
    } catch (error) {
      console.error('Error initializing working directory:', error);
    }
  }

  /**
   * Clean the working directory by removing all contents
   */
  public cleanWorkingDirectory(): void {
    try {
      if (fs.existsSync(this.workingDirectory)) {
        // Remove all contents recursively
        const items = fs.readdirSync(this.workingDirectory);
        
        for (const item of items) {
          const itemPath = path.join(this.workingDirectory, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(itemPath);
          }
        }
        
        console.log('Working directory cleaned');
      }
    } catch (error) {
      console.error('Error cleaning working directory:', error);
      // If cleaning fails, try to recreate the entire directory
      try {
        if (fs.existsSync(this.workingDirectory)) {
          fs.rmSync(this.workingDirectory, { recursive: true, force: true });
        }
        fs.mkdirSync(this.workingDirectory, { recursive: true });
        console.log('Working directory recreated after cleaning failure');
      } catch (recreateError) {
        console.error('Error recreating working directory:', recreateError);
      }
    }
  }

  /**
   * Get the path to the working directory
   */
  public getPath(): string {
    return this.workingDirectory;
  }

  /**
   * Create a subdirectory within the working directory
   */
  public createSubdirectory(name: string): string {
    const subdirPath = path.join(this.workingDirectory, name);
    
    try {
      if (fs.existsSync(subdirPath)) {
        // Clean existing subdirectory
        fs.rmSync(subdirPath, { recursive: true, force: true });
      }
      
      fs.mkdirSync(subdirPath, { recursive: true });
      return subdirPath;
    } catch (error) {
      console.error(`Error creating subdirectory ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get available space information for the working directory
   */
  public async getSpaceInfo(): Promise<{
    available: number;
    free: number;
    total: number;
  } | null> {
    try {
      // This is a simplified version - in a real implementation you might want to use a native module
      // For now, we'll return null and handle space checking elsewhere if needed
      return null;
    } catch (error) {
      console.error('Error getting space info:', error);
      return null;
    }
  }

  /**
   * Check if the working directory is ready for use
   */
  public isReady(): boolean {
    try {
      return fs.existsSync(this.workingDirectory) && fs.statSync(this.workingDirectory).isDirectory();
    } catch (error) {
      console.error('Error checking if working directory is ready:', error);
      return false;
    }
  }

  /**
   * Get a unique subdirectory name based on repository URL
   */
  public getRepositoryDirectoryName(repoUrl: string): string {
    // Extract repository name from URL
    const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') || 'repo';
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now();
    
    return `${repoName}-${timestamp}`;
  }

  /**
   * Clean up old repository directories (older than specified hours)
   */
  public cleanupOldRepositories(maxAgeHours: number = 24): void {
    try {
      if (!fs.existsSync(this.workingDirectory)) {
        return;
      }

      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
      
      const items = fs.readdirSync(this.workingDirectory);
      
      for (const item of items) {
        const itemPath = path.join(this.workingDirectory, item);
        
        try {
          const stats = fs.statSync(itemPath);
          const age = now - stats.mtime.getTime();
          
          if (stats.isDirectory() && age > maxAge) {
            console.log(`Removing old repository directory: ${item} (${Math.round(age / (60 * 60 * 1000))} hours old)`);
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        } catch (itemError) {
          console.error(`Error processing item ${item}:`, itemError);
          // Continue processing other items
        }
      }
    } catch (error) {
      console.error('Error cleaning up old repositories:', error);
    }
  }
}
