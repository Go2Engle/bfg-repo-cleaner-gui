# Auto-Update Implementation Guide

This document explains how the auto-update feature works in the BFG Repo-Cleaner GUI and how to set it up for distribution.

## Overview

The auto-update system uses `electron-updater` which provides cross-platform auto-update functionality:

- **Windows**: Uses Squirrel.Windows (already configured in your project)
- **macOS**: Uses ZIP file distribution with code signing support
- **Linux**: Uses AppImage or manual distribution

## How It Works

### 1. Update Check Process

- On app startup, the updater silently checks for updates (after 5 seconds)
- Users can manually check for updates using the "Check for Updates" button
- Update notifications appear in the app header with clear messaging

### 2. Update Notification Flow

1. **No Updates**: Shows a brief "You're running the latest version!" message
2. **Update Available**: Shows update details with download option
3. **Downloading**: Shows progress bar with download speed and percentage
4. **Ready to Install**: Shows restart option to install the update
5. **Error Handling**: Shows clear error messages if something goes wrong

### 3. User Experience

- **Consistent UI**: Same notification style across all platforms
- **User Control**: Users decide when to download and install updates
- **Progress Feedback**: Clear progress indicators during download
- **Non-Disruptive**: Updates don't interrupt the user's workflow

## Configuration

### 1. Update Server Configuration

#### Option A: GitHub Releases (Recommended)

Update `app-update.yml`:
```yaml
provider: github
owner: your-github-username
repo: bfg-repo-cleaner-gui
```

Update `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-github-username", 
      "repo": "bfg-repo-cleaner-gui"
    }
  }
}
```

#### Option B: Custom Update Server

Update `app-update.yml`:
```yaml
provider: generic
url: https://your-update-server.com/releases
```

### 2. Platform-Specific Setup

#### Windows (Squirrel.Windows)
- Already configured in `forge.config.js`
- Builds `.exe` installer and `.nupkg` update packages
- Automatic delta updates for smaller download sizes

#### macOS
- Uses ZIP file distribution
- Requires code signing for auto-updates to work properly
- Set up signing in `forge.config.js`:

```javascript
packagerConfig: {
  osxSign: {
    identity: "Developer ID Application: Your Name (TEAM_ID)"
  },
  osxNotarize: {
    appleId: "your-apple-id@example.com",
    appleIdPassword: "app-specific-password"
  }
}
```

#### Linux
- Uses AppImage or .deb/.rpm packages
- Manual update checking recommended for Linux distributions

### 3. Release Process

1. **Version Bump**: Update version in `package.json`
2. **Build**: Run `npm run make-all` to build for all platforms
3. **Release**: 
   - For GitHub: Create a release and upload the built artifacts
   - For Custom Server: Upload files to your update server
4. **Verification**: Test the update process on each platform

## Security Considerations

### 1. Code Signing

- **Critical for macOS**: Users will get security warnings without proper signing
- **Windows**: Recommended to avoid SmartScreen warnings
- **Linux**: Package signing varies by distribution

### 2. Update Server Security

- Use HTTPS for all update communications
- Implement checksums for downloaded files
- Consider using GitHub Releases for built-in security

### 3. Private Repositories

For private repositories, configure authentication:

```yaml
# app-update.yml
provider: github
owner: your-github-username
repo: bfg-repo-cleaner-gui
token: your-github-token
private: true
```

## Testing

### 1. Development Testing

```bash
# Test update checking (won't actually update in dev mode)
npm run dev
```

### 2. Production Testing

1. Build and distribute version 1.0.0
2. Update version to 1.0.1 and publish
3. Run version 1.0.0 and test update flow

### 3. Update Server Testing

Test your update server endpoints:
- `GET /update/{platform}/{version}` should return update metadata
- Verify file downloads work correctly

## Troubleshooting

### Common Issues

1. **No Updates Found**: Check update server URL and network connectivity
2. **Download Fails**: Verify file permissions and server accessibility
3. **Install Fails**: Check file integrity and permissions

### Debugging

Enable debug logging:
```javascript
// In main process
import log from 'electron-log';
log.transports.file.level = 'debug';
autoUpdater.logger = log;
```

### Platform-Specific Issues

#### Windows
- Ensure Squirrel.Windows packages are properly structured
- Check Windows Defender/antivirus blocking

#### macOS  
- Verify code signing certificates
- Check Gatekeeper settings
- Ensure proper notarization

#### Linux
- Verify package manager permissions
- Check AppImage execution permissions

## File Structure

```
bfg-repo-cleaner-gui/
├── app-update.yml                 # Update configuration
├── src/
│   ├── main/
│   │   ├── autoUpdater.ts        # Auto-updater logic
│   │   └── main.ts               # Main process integration
│   ├── renderer/
│   │   └── components/
│   │       └── UpdateNotification.tsx  # Update UI component
│   └── shared/
│       └── types.ts              # Shared type definitions
└── forge.config.js               # Build configuration
```

## Best Practices

1. **Gradual Rollout**: Consider releasing to a subset of users first
2. **Fallback Options**: Provide manual download links
3. **User Communication**: Clearly communicate what's in each update
4. **Testing**: Thoroughly test the update process on all target platforms
5. **Monitoring**: Monitor update success rates and failure modes

## Future Enhancements

Potential improvements to consider:

1. **Update Channels**: Support for beta/stable channels
2. **Rollback**: Ability to rollback failed updates
3. **Scheduled Updates**: Allow users to schedule update times
4. **Bandwidth Control**: Limit update download speeds
5. **Update Analytics**: Track update adoption rates

This implementation provides a robust, user-friendly auto-update system that works consistently across Windows, macOS, and Linux platforms.
