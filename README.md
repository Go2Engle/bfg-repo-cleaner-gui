# BFG Repo-Cleaner GUI

A cross-platform GUI application for [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/), a simpler and faster alternative to git-filter-branch for cleaning Git repositories of sensitive data and large files.

## Features

- Clean Git repositories of sensitive data such as passwords, API keys, etc.
- Remove large files from Git history
- Modern, user-friendly interface
- Cross-platform (Windows, macOS, Linux)

## Prerequisites

- Node.js and npm
- Java Runtime Environment (JRE) - required to run BFG Repo-Cleaner
- [BFG Repo-Cleaner JAR file](https://rtyley.github.io/bfg-repo-cleaner/)

## Development

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

## Usage

1. Download and save the BFG Repo-Cleaner JAR file (e.g., `bfg-1.14.0.jar`) from the [official website](https://rtyley.github.io/bfg-repo-cleaner/)
2. Launch the BFG Repo-Cleaner GUI
3. Select your Git repository path
4. Select the BFG Repo-Cleaner JAR file
5. Configure cleaning options (text replacements, file size limits)
6. Click "Clean Repository"
7. Follow any additional instructions provided in the output

## Important Note

After cleaning your repository with BFG, you should run:

```bash
cd your-repo
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## License

MIT
