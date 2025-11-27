# Analyst Desktop

A minimal, floating AI assistant for data analysts. Press `` ` `` (backtick) to toggle the chat window at your cursor position.

## Features

- **Global Hotkey**: Press `` ` `` anywhere to toggle the assistant
- **Multiple AI Providers**: Support for OpenAI (GPT-4o) and Anthropic (Claude)
- **File Upload**: Attach CSV, TXT, JSON, MD files
- **System Tray**: Runs quietly in the background
- **Minimal UI**: Clean, dark-themed interface

## Prerequisites

Before building, ensure you have installed:

1. **Node.js** (v18 or later)
   - Download from https://nodejs.org/

2. **Rust** (latest stable)
   - Install from https://rustup.rs/
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Windows Build Tools** (Windows only)
   - Install Visual Studio Build Tools with "Desktop development with C++"
   - Or run: `npm install -g windows-build-tools`

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Usage

1. Launch the app (it starts hidden)
2. Press `` ` `` (backtick key) to show the chat window at your cursor
3. Enter your API key on first launch
4. Type your question and press Enter
5. Press `` ` `` again to hide the window

## Project Structure

```
analyst-desktop/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   ├── styles/             # CSS styles
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/                # Rust source
│   └── tauri.conf.json     # Tauri config
└── package.json
```

## Coming Soon (Phase 2+)

- Screenshot capture with area selection
- Redaction tool for sensitive info
- Table editor
- Markdown rendering in responses
- Settings panel

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `` ` `` | Toggle window |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |

## Troubleshooting

### Window doesn't appear
- Check system tray for the app icon
- Try clicking the tray icon
- Restart the application

### API key not saving
- Ensure you have write permissions to the app data folder
- Try running as administrator

### Build fails on Windows
- Ensure Visual Studio Build Tools are installed
- Run `rustup update` to get latest Rust
