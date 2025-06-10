# Auto-Update Setup Guide

## ✅ Current Status

Your project is now properly configured for electron-updater with the following fixes:

### 1. **Fixed App Configuration**
- ✅ `app-update.yml` is included in packaged apps via `forge.config.js`
- ✅ Auto-updater properly configured to find the config file
- ✅ GitHub publisher added for future automated releases

### 2. **Updated GitHub Actions Workflow**
- ✅ Generates `latest-mac.yml` for macOS updates
- ✅ Generates `latest-linux.yml` for Linux updates (deb/rpm)
- ✅ Generates `latest.yml` for Windows updates
- ✅ Automatically uploads all metadata files to GitHub releases

### 3. **Local Development Tools**
- ✅ `npm run generate-update-files` script for manual metadata generation
- ✅ Enhanced script supports all platforms (Mac, Linux, Windows)

## 🚀 How It Works Now

### For Future Releases:

1. **Automated via GitHub Actions** (Recommended):
   ```bash
   git tag v1.3.2
   git push origin v1.3.2
   # Create release on GitHub - workflow automatically builds and uploads everything
   ```

2. **Manual Release**:
   ```bash
   npm run make-all  # Build for all platforms
   npm run generate-update-files  # Generate metadata
   # Upload files to GitHub release manually
   ```

3. **Using Electron Forge Publisher**:
   ```bash
   npm run publish  # Builds, creates release, and uploads everything
   ```

## 📁 Required Files in Each Release

Your GitHub releases will now automatically include:

### Binary Files:
- `bfg-repo-cleaner-gui-darwin-arm64-X.X.X.zip` (macOS)
- `bfg-repo-cleaner-gui_X.X.X_amd64.deb` (Linux)
- `bfg-repo-cleaner-gui-X.X.X-1.x86_64.rpm` (Linux)
- `bfg-repo-cleaner-gui-X.X.X-Setup.exe` (Windows)

### Metadata Files (for electron-updater):
- `latest-mac.yml` (macOS update info)
- `latest-linux.yml` (Linux update info)
- `latest.yml` (Windows update info)

## 🔧 Testing Auto-Updates

1. **For current v1.3.1 release**: Upload the generated `update-files/latest-mac.yml` to your GitHub release
2. **For future releases**: The workflow will handle everything automatically
3. **Test locally**: Build and run the packaged app to verify auto-update checking works

## 📋 Next Steps

1. **Upload current metadata**: Add `latest-mac.yml` to your v1.3.1 release
2. **Test workflow**: Create a test release (v1.3.2) to verify automation works
3. **Monitor logs**: Check GitHub Actions logs to ensure all files upload correctly

## 🐛 Troubleshooting

If auto-updates don't work:
1. Check that metadata files exist in the release
2. Verify the URLs in the `.yml` files match the actual asset names
3. Check browser network tab for 404 errors when app checks for updates
4. Review the auto-updater logs in the app's developer console

## 🔗 URLs for v1.3.1

Once you upload the metadata file, your app will check:
- https://github.com/go2engle/bfg-repo-cleaner-gui/releases/download/v1.3.1/latest-mac.yml
- https://github.com/go2engle/bfg-repo-cleaner-gui/releases/download/v1.3.1/latest-linux.yml
- https://github.com/go2engle/bfg-repo-cleaner-gui/releases/download/v1.3.1/latest.yml
