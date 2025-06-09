# GitHub Actions Release Process Guide

This document explains how to use GitHub Actions for releasing the BFG Repo-Cleaner GUI application.

## Automatic Release Process

The application uses GitHub Actions for automatically building and uploading release assets. When a new release is created through the GitHub UI, the `release.yml` workflow will:

1. Build the application for Windows, macOS, and Linux
2. Upload the resulting binaries to the GitHub release

## Manual Upload Process

If the automatic release asset upload fails, you can use the manual workflow:

1. Go to the "Actions" tab in your repository
2. Select the "Manual Upload Release Assets" workflow
3. Click "Run workflow"
4. Fill in the required parameters:
   - `releaseTag`: The tag of the release (e.g., "v1.0.0")
   - `assetPath`: The path to the asset file from the repo root
   - `assetName`: The name to give the asset in the release
5. Click "Run workflow" to start the upload

### Common Asset Paths

- macOS ARM64: `./out/make/zip/darwin/arm64/bfg-repo-cleaner-gui-darwin-arm64-1.0.0.zip`
- macOS x64: `./out/make/zip/darwin/x64/bfg-repo-cleaner-gui-darwin-x64-1.0.0.zip`
- Windows: `./out/make/squirrel.windows/x64/bfg-repo-cleaner-gui-1.0.0 Setup.exe`
- Linux DEB: `./out/make/deb/x64/bfg-repo-cleaner-gui_1.0.0_amd64.deb`
- Linux RPM: `./out/make/rpm/x64/bfg-repo-cleaner-gui-1.0.0-1.x86_64.rpm`

## Troubleshooting

### "Resource not accessible by integration" Error

If you see this error, it means the GitHub token doesn't have sufficient permissions. The issue has been fixed in the updated workflow, but if it persists:

1. Make sure the repository settings allow the GitHub token to have write permissions for actions
2. Try the manual upload workflow described above
