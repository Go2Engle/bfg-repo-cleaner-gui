<div align="Center">
  <img src="assets/bfg-cleaner-gui-icon.png" alt="BFG Repo-Cleaner GUI Logo" width="200">
</div>

# BFG Repo-Cleaner GUI

A cross-platform GUI application for [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/), a simpler and faster alternative to git-filter-branch for cleaning Git repositories of sensitive data and large files.

## Features

- Clean Git repositories of sensitive data such as passwords, API keys, etc.
- Remove large files from Git history
- Modern, user-friendly interface
- Cross-platform (Windows, macOS, Linux)

## Installation

### Download Pre-built Binary

You can download the latest pre-built application binary for your platform from the [GitHub Releases page](https://github.com/[your-username]/bfg-repo-cleaner-gui/releases/latest).

Available platforms:
- Windows (.exe installer, .zip)
- macOS (.dmg, .zip)
- Linux (.deb, .rpm, .AppImage)

### Prerequisites for Running the Application

- Java Runtime Environment (JRE) - required to run BFG Repo-Cleaner
- [BFG Repo-Cleaner JAR file](https://rtyley.github.io/bfg-repo-cleaner/) - download this separately

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

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- When a new release is created on GitHub, the workflow automatically:
  - Builds the application for macOS (x64 and arm64), Windows, and Linux
  - Creates installers and packages for each platform
  - Uploads the built artifacts to the GitHub release

To create a new release:

1. Tag your commit: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. Create a new release on GitHub using this tag
4. The GitHub Actions workflow will automatically build and attach the artifacts to the release

## Usage

1. Install the application using one of the binaries from the [GitHub Releases page](https://github.com/[your-username]/bfg-repo-cleaner-gui/releases/latest)
2. Download and save the BFG Repo-Cleaner JAR file (e.g., `bfg-1.14.0.jar`) from the [official website](https://rtyley.github.io/bfg-repo-cleaner/)
3. Launch the BFG Repo-Cleaner GUI
4. Select your Git repository path
5. Select the BFG Repo-Cleaner JAR file
6. Configure cleaning options (text replacements, file size limits)
7. Click "Clean Repository"
8. Follow any additional instructions provided in the output

### macOS Security Notice

If you're using macOS and encounter security restrictions when launching the application, you may need to remove the quarantine attribute with the following command:

```bash
sudo xattr -rd com.apple.quarantine "/Applications/bfg-repo-cleaner-gui.app"
```

## Important Note

After cleaning your repository with BFG, you should run:

```bash
cd your-repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## License

MIT
