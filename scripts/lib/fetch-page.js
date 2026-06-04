import * as cheerio from "cheerio";
import { chromium } from "playwright";

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchPage(url, options = {}) {
  const headers = {
    "User-Agent": userAgent,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...options.headers
  };

  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return await response.text();
}

export function pageText(html) {
  const $ = cheerio.load(html);
  return $("body").text().replace(/\s+/g, " ").trim();
}

export async function browserText(url, options = {}) {
  const timeout = options.timeout ?? 20000;
  const browser = await chromium.launch({ headless: true });

  try {
    const contextOptions = {
      userAgent,
      viewport: { width: 1440, height: 1000 }
    };

    if (options.cookie) {
      const parsedCookies = options.cookie
        .split(";")
        .map(pair => {
          const [name, ...rest] = pair.trim().split("=");
          return {
            name,
            value: rest.join("="),
            domain: new URL(url).hostname,
            path: "/"
          };
        })
        .filter(cookie => cookie.name && cookie.value);

      contextOptions.storageState = {
        cookies: parsedCookies,
        origins: []
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout
    });

    // Do not use networkidle. News sites often never become idle.
    await page.waitForTimeout(2500);

    const text = await page.locator("body").innerText({
      timeout: 8000
    });

    await context.close();

    return text.replace(/\s+/g, " ").trim();
  } finally {
    await browser.close();
  }
}

export async function getTextFromUrl(url, options = {}) {
  if (!url) {
    return "";
  }

  if (!options.preferBrowser) {
    try {
      const html = await fetchPage(url, options);
      return pageText(html);
    } catch (error) {
      console.warn(`Fetch failed, trying browser for ${url}:`, error.message);
    }
  }

  return await browserText(url, {
    ...options,
    timeout: options.timeout ?? 20000
  });
}


export async function browserSnapshot(url, options = {}) {
  const timeout = options.timeout ?? 30000;
  const browser = await chromium.launch({ headless: true });

  try {
    const contextOptions = {
      userAgent,
      viewport: { width: 1440, height: 1000 }
    };

    if (options.cookie) {
      const parsedCookies = options.cookie
        .split(";")
        .map(pair => {
          const [name, ...rest] = pair.trim().split("=");
          return {
            name,
            value: rest.join("="),
            domain: new URL(url).hostname,
            path: "/"
          };
        })
        .filter(cookie => cookie.name && cookie.value);

      contextOptions.storageState = {
        cookies: parsedCookies,
        origins: []
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    const networkTexts = [];

    page.on("response", async response => {
      try {
        const responseUrl = response.url();
        const contentType = response.headers()["content-type"] || "";

        const looksUseful =
          contentType.includes("application/json") ||
          contentType.includes("text/plain") ||
          responseUrl.includes("poll") ||
          responseUrl.includes("average") ||
          responseUrl.includes("api") ||
          responseUrl.includes("graphql") ||
          responseUrl.includes("_next/data");

        if (!looksUseful || networkTexts.length > 80) {
          return;
        }

        const body = await response.text();

        if (body && body.length > 20) {
          networkTexts.push(`URL: ${responseUrl}\n${body.slice(0, 200000)}`);
        }
      } catch {
        // Ignore unreadable responses.
      }
    });

    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout
    });

    const waitAfterLoad = options.waitAfterLoad ?? 7000;
    await page.waitForTimeout(waitAfterLoad);

    if (Array.isArray(options.waitForText)) {
      const started = Date.now();
      while (Date.now() - started < (options.waitForTextTimeout ?? 12000)) {
        const bodyText = await page.locator("body").innerText({ timeout: 3000 }).catch(() => "");

        if (options.waitForText.some(item => bodyText.toLowerCase().includes(String(item).toLowerCase()))) {
          break;
        }

        await page.waitForTimeout(1000);
      }
    }

    const text = await page.locator("body").innerText({
      timeout: 8000
    }).catch(() => "");

    const html = await page.content().catch(() => "");
    const scripts = await page.locator("script").evaluateAll(nodes =>
      nodes.map(node => node.textContent || "").join("\n")
    ).catch(() => "");

    await context.close();

    return {
      text: String(text || "").replace(/\s+/g, " ").trim(),
      html,
      scripts,
      networkText: networkTexts.join("\n\n---NETWORK RESPONSE---\n\n")
    };
  } finally {
    await browser.close();
  }
}
