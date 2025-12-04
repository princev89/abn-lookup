import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const URLS = [
  "https://data.gov.au/data/dataset/5bd7fcab-e315-42cb-8daf-50b7efc2027e/resource/0ae4d427-6fa8-4d40-8e76-c6909b5a071b/download/public_split_1_10.zip",
  "https://data.gov.au/data/dataset/5bd7fcab-e315-42cb-8daf-50b7efc2027e/resource/635fcb95-7864-4509-9fa7-a62a6e32b62d/download/public_split_11_20.zip",
];

const OUT_DIR = path.resolve(__dirname, "..", "..", "data", "raw");

async function ensureOutDir() {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });
}


// Download a file with retries
async function downloadWithAxios(url: string, attempts = 2): Promise<string> {
  const filename = (() => {
    try {
      return path.basename(new URL(url).pathname) || `download-${Date.now()}.zip`;
    } catch (e) {
      return `download-${Date.now()}.zip`;
    }
  })();

  const outPath = path.join(OUT_DIR, filename);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(`Downloading (attempt ${attempt}) ${url}`);
      const res = await axios.get(url, {
        responseType: "stream",
        maxRedirects: 10,
        timeout: 120_000,
      });

      const total = Number(res.headers["content-length"]) || undefined;
      const writer = fs.createWriteStream(outPath);
      let downloaded = 0;

      res.data.on("data", (chunk: Buffer) => {
        downloaded += chunk.length;
        if (total) {
          const pct = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r${filename} — ${pct}% (${(downloaded / 1024 / 1024).toFixed(2)} MB)`);
        } else {
          process.stdout.write(`\r${filename} — ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
        }
      });

      await new Promise<void>((resolve, reject) => {
        res.data.on("error", (err: Error) => reject(err));
        writer.on("error", (err) => reject(err));
        writer.on("finish", () => resolve());
        res.data.pipe(writer);
      });

      process.stdout.write("\n");
      console.log(`Saved to ${outPath}`);
      return outPath;
    } catch (err: any) {
      console.error(`Error on attempt ${attempt} for ${url}: ${err.message || err}`);
      if (attempt === attempts) throw err;
      console.log("Retrying...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  await ensureOutDir();
  const args = process.argv.slice(2);
  const urls = args.length ? args : URLS;

  for (const url of urls) {
    try {
      await downloadWithAxios(url);
    } catch (e: any) {
      console.error(`Failed to download ${url}:`, e.message ?? e);
    }
  }

  console.log("All done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
