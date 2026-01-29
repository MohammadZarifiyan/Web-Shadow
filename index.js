#!/usr/bin/env node
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import express from 'express';
import puppeteer from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

const argv = yargs(hideBin(process.argv))
    .version(false)
    .help(false)
    .option('url', {
        type: 'string',
        demandOption: true,
        describe: 'Base target url',
    })
    .option('port', {
        type: 'number',
        default: 3001,
        describe: 'Server port',
    })
    .option('host', {
        type: 'string',
        default: '0.0.0.0',
        describe: 'Server host',
    })
    .strict()
    .parse();


const app = express();

app.use(async (request, response) => {
    let data = [];

    request.on('data', chunk => data.push(chunk));

    request.on('end', async () => {
        console.log('Processing request started', request.originalUrl);

        if (!publicPage) {
            return response.status(503).json({error: 'Application not ready'});
        }

        const targetUrl = new URL(request.originalUrl, argv.url);

        const disallowedHeaders = ['host', 'connection', 'content-length', 'transfer-encoding'];
        const headers = Object.entries(request.headers)
            .filter(([key]) => !disallowedHeaders.includes(key.toLowerCase()))
            .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])

        const result = await publicPage.evaluate(
            async ({ url, method, bodyBase64, headers }) => {
                const body = bodyBase64
                    ? Uint8Array.from(atob(bodyBase64), char => char.charCodeAt(0))
                    : undefined;

                const response = await fetch(url, {
                    method,
                    headers,
                    body,
                });

                const arrayBuffer = await response.arrayBuffer();

                return {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: Array.from(new Uint8Array(arrayBuffer)),
                };
            },
            {
                url: targetUrl.href,
                method: request.method,
                bodyBase64: ['GET', 'HEAD'].includes(request.method.toUpperCase()) ? undefined : Buffer.concat(data).toString('base64'),
                headers: Object.fromEntries(headers),
            }
        );

        const accept = request.headers['accept'] || '*/*';
        const contentType = result.headers['content-type'] || '';

        if (!accept.includes('*/*') && !accept.split(',').some(type => contentType.includes(type.trim()))) {
            console.error(`Mismatched Accept (${accept}) vs Content-Type (${contentType})`);
            return response.status(502).json({error: 'Bad Gateway'});
        }

        const buffer = Buffer.from(result.body);
        const responseHeaders = Object.entries(result.headers)
            .filter(([key]) => !disallowedHeaders.includes(key.toLowerCase()))
            .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value])

        response.status(result.status).set(responseHeaders).send(buffer);
    })
});

puppeteer.use(stealthPlugin());

let browser = null;
let publicPage = null;

const initBrowser = async () => {
    console.log('Browser initialization started');
    browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
        ],
    });
    console.log('Browser launched');

    console.log('Opening browser public page...');
    publicPage = await browser.newPage();
    console.log('Browser public page opened');

    console.log('Loading browser home page...')
    await publicPage.goto(argv.url);
    console.log('Browser home page loaded');
}

const closeBrowser = async () => {
    if (browser) {
        const browserInstance = browser;
        browser = null;

        console.log('Browser closing...');
        await browserInstance.close();

        console.log('Browser closed');
    }
};

(async () => {
    try {
        await initBrowser();
    }
    catch (error) {
        console.error(`Browser initialization failed:`, error);
        process.exit();
    }

    app.listen(argv.port, argv.host, () => console.log(`Proxy running at http://${argv.host}:${argv.port}`));
})();

process.on('SIGINT', async () => {
    await closeBrowser();
    process.exit();
});
