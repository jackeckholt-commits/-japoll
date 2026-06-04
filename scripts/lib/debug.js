import fs from "fs/promises";

export async function saveScrapeDebug(name, content) {
  try {
    await fs.mkdir("data/scrape-debug", { recursive: true });
    await fs.writeFile(`data/scrape-debug/${name}.txt`, String(content || "").slice(0, 250000), "utf8");
  } catch {
    // Debug output should never break scraping.
  }
}
