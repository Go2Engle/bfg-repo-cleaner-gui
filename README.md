<div align="Center">
  <img src="assets/bfg-cleaner-gui-icon.png" alt="BFG Repo-Cleaner GUI Logo" width="200">
</div>

# BFG Repo-Cleaner GUI

A cross-platform GUI application for [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/), a simpler and faster alternative to git-filter-branch for cleaning Git repositories of sensitive data and large files.

## Screenshot

<div align="Center">
  <img src="assets/screenshot.png" alt="BFG Repo-Cleaner GUI Screenshot" width="800">
</div>

## Features

- Clean Git repositories of sensitive data such as passwords, API keys, etc.
- Remove large files from Git history
- Modern, user-friendly interface
- Cross-platform (Windows, macOS, Linux)

## Installation

### Download Pre-built Binary

You can download the latest pre-built application binary for your platform from the [GitHub Releases page](https://github.com/go2engle/bfg-repo-cleaner-gui/releases/latest).

Available platforms:
- Windows (.exe installer, .zip)
- macOS (.dmg, .zip)
- Linux (.deb, .rpm, .AppImage)

### Prerequisites for Running the Application

- Java Runtime Environment (JRE) - required to run BFG Repo-Cleaner
- [BFG Repo-Cleaner JAR file](https://rtyley.github.io/bfg-repo-cleaner/) - download this separately

### macOS Security Notice

If you're using macOS and encounter security restrictions when launching the application, you may need to remove the quarantine attribute with the following command:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/bfg-repo-cleaner-gui.app"
```

## Development

### Prerequisites for Development

- Node.js and npm
- Java Runtime Environment (JRE)

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Package the Application

```bash
npm run package
```

### Create Installers

```bash
npm run make
```

## License

MIT
