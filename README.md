# Introduction
**Web Shadow** is a Node.js CLI tool that sends API requests **through a real browser (Puppeteer)**.
This makes your requests behave **exactly like a user interacting with a website**, preserving sessions, cookies, headers, and browser behavior.

# Installation
```shell
npm install -g web-shadow
```
Puppeteer will automatically install Chromium.

# Usage
```shell
web-shadow --url https://example.com --port 3001 --host 127.0.0.1
```
`--url` is the **target website** where the browser session is created.

All API requests will be executed **inside this website’s context**, meaning they share the same session, cookies, and browser state as if they were triggered from that site itself.

After running, any request sent to `http://127.0.0.1:3001/...` will be forwarded through the browser **within the context of the specified website**, so the destination API treats it as a normal in-browser request.
