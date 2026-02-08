# DocLens Browser Extension

This folder contains the Chrome (Manifest V3) extension that summarizes public-record PDFs locally in the browser.

## Behavior
- Detects PDF pages in the browser.
- Extracts text locally using PDF.js already present in the viewer.
- Generates a neutral, factual summary using an extractive ranking method.
- Shows the summary in an overlay with a link to the original PDF source.
- Does not store, cache, or upload PDFs.

## Development
1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` directory.
