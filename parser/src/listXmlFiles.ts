import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import unzipper from "unzipper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, "../../data/raw");
const extractedDir = path.join(__dirname, "../../data/xml");

export async function extractZips() {
  await fs.promises.mkdir(extractedDir, { recursive: true });
  const files = await fs.promises.readdir(rawDir);

  for (const file of files) {
    if (!file.endsWith(".zip")) continue;
    const full = path.join(rawDir, file);
    await fs
      .createReadStream(full)
      .pipe(unzipper.Extract({ path: extractedDir }))
      .promise();
  }
}

export async function listXmlFiles() {
  const files = await fs.promises.readdir(extractedDir);
  return files.filter(f => f.endsWith(".xml")).map(f => path.join(extractedDir, f));
}
