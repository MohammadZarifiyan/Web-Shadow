# Introduction
**Web Shadow** is a Node.js CLI tool that runs a stealth web proxy using a real browser (Puppeteer). It can forward requests, handle headers, and work in environments where normal proxies may be blocked or detected.

# Installation
```shell
npm install -g web-shadow
```
Puppeteer will automatically install Chromium.

# Usage
```shell
web-shadow --url https://example.com --port 3001 --host 127.0.0.1
```
Then you can send requests to `http://127.0.0.1:3001/...` and they will be forwarded through the stealth browser.
