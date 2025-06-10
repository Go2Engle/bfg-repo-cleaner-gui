const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    // On macOS, use the .icns file directly
    icon: process.platform === 'darwin' 
      ? path.join(__dirname, 'icons/mac/icon.icns')
      : path.join(__dirname, 'icons/win/icon.ico'),
    appBundleId: 'com.bfg-repo-cleaner-gui',
    appCategoryType: 'public.app-category.developer-tools',
    osxSign: false, // Disable code signing since the app won't be signed on macOS
    osxNotarize: false, // Disable notarization
    win32metadata: {
      CompanyName: '',
      FileDescription: 'BFG Repo-Cleaner GUI',
      OriginalFilename: 'bfg-repo-cleaner-gui.exe',
      ProductName: 'BFG Repo-Cleaner GUI',
      InternalName: 'bfg-repo-cleaner-gui'
    },
    // Use the current platform architecture by default
    arch: process.arch,
    // For macOS - allow users to open this unsigned app
    extendInfo: {
      NSRequiresAquaSystemAppearance: false,
      NSAppleEventsUsageDescription: 'Please allow access to script the system to run git commands',
      LSUIElement: false,
      CFBundleDocumentTypes: [],
      NSHumanReadableCopyright: 'Copyright © 2025'
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
      config: {
        targets: ['zip'],
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
