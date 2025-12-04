import "dotenv/config";
import { extractZips, listXmlFiles } from "./listXmlFiles.js";
import { parseAbnFile } from "./parseAbnFile.js";
import { insertBatch } from "./loadToPostgres.js";

const BATCH_SIZE = 1000;

async function main() {
  try {

    console.log("Extracting ZIP files...");
    await extractZips();

    const xmlFiles = await listXmlFiles();
    console.log(`Found ${xmlFiles.length} XML files to process`);

    for (let i = 0; i < xmlFiles.length; i++) {
      const file = xmlFiles[i];
      console.log(`Processing file ${i + 1}/${xmlFiles.length}: ${file}`);

      try {
        const records = await parseAbnFile(file!);
        console.log(`  Parsed ${records.length} records`);

        // Insert records in batches
        for (let j = 0; j < records.length; j += BATCH_SIZE) {
          const batch = records.slice(j, j + BATCH_SIZE);
          await insertBatch(batch);
          console.log(`  Inserted batch ${Math.floor(j / BATCH_SIZE) + 1} (${batch.length} records)`);
        }
      } catch (err) {
        console.error(`  Error processing file ${file}:`, err);
      }
    }

    console.log("ABN parser completed successfully!");
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
}

main();
