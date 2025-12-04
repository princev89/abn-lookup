import "dotenv/config";
import fs from "fs";
import sax from "sax";
import { extractZips, listXmlFiles } from "./listXmlFiles.js";
import { insertBatch } from "./loadToPostgres.js";
import type { AbnEntityRecord } from "./parseAbnFile.js";

const BATCH_SIZE = 500;

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
        await parseAndInsertStreaming(file!);
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


async function parseAndInsertStreaming(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let batch: AbnEntityRecord[] = [];
    let totalRecords = 0;
    let batchCount = 0;
    let currentRecord: Partial<AbnEntityRecord> | null = null;
    let currentPath: string[] = [];
    let currentText = "";

    const parser = sax.createStream(true, {});

    const flushBatch = async () => {
      if (batch.length > 0) {
        batchCount++;
        await insertBatch(batch);
        console.log(`  Inserted batch ${batchCount} (${batch.length} records, total: ${totalRecords})`);
        batch = [];

        // Force garbage collection hint
        if (global.gc) global.gc();
      }
    };

    parser.on("opentag", (node: any) => {
      currentPath.push(node.name);
      currentText = "";

      if (node.name === "ABR") {
        currentRecord = { businessNames: [] };
      }

      if (node.name === "ABN" && currentRecord) {
        const status = node.attributes?.status as string;
        const statusFrom = node.attributes?.ABNStatusFromDate as string;
        if (status) currentRecord.status = status;
        if (statusFrom) currentRecord.statusFrom = statusFrom;
      }

      if (node.name === "GST" && currentRecord) {
        const gstStatus = node.attributes?.status as string;
        if (gstStatus) {
          currentRecord.gstRegistered = gstStatus === "ACT";
        }
      }
    });

    parser.on("text", (text: string) => {
      currentText += text;
    });

    parser.on("closetag", async (tagName: string) => {
      const path = currentPath.join("/");
      const trimmedText = currentText.trim();

      if (currentRecord) {
        if (tagName === "ABN" && trimmedText) {
          currentRecord.abn = trimmedText;
        } else if (path.endsWith("EntityType/EntityTypeInd")) {
          currentRecord.entityType = trimmedText;
        } else if (path.endsWith("MainEntity/NonIndividualName/NonIndividualNameText")) {
          if (!currentRecord.legalName && trimmedText) {
            currentRecord.legalName = trimmedText;
          }
        } else if (path.endsWith("MainEntity/IndividualName/FamilyName")) {
          if (!currentRecord.legalName) {
            currentRecord.legalName = trimmedText;
          } else {
            currentRecord.legalName = trimmedText + ", " + currentRecord.legalName;
          }
        } else if (path.endsWith("MainEntity/IndividualName/GivenName")) {
          if (!currentRecord.legalName) {
            currentRecord.legalName = trimmedText;
          } else {
            currentRecord.legalName += " " + trimmedText;
          }
        } else if (path.endsWith("BusinessAddress/AddressDetails/State")) {
          currentRecord.state = trimmedText;
        } else if (path.endsWith("BusinessAddress/AddressDetails/Postcode")) {
          currentRecord.postcode = trimmedText;
        } else if (tagName === "ASICNumber" && trimmedText) {
          currentRecord.acn = trimmedText;
        } else if (path.endsWith("OtherEntity/NonIndividualName/NonIndividualNameText")) {
          if (trimmedText) {
            currentRecord.businessNames?.push(trimmedText);
          }
        }
      }

      if (tagName === "ABR" && currentRecord && currentRecord.abn) {
        batch.push(currentRecord as AbnEntityRecord);
        totalRecords++;
        currentRecord = null;

        if (batch.length >= BATCH_SIZE) {
          parser.pause?.();
          await flushBatch();
          parser.resume?.();
        }
      }

      currentPath.pop();
    });

    parser.on("error", (err: Error) => {
      reject(err);
    });

    parser.on("end", async () => {
      // Insert remaining records
      await flushBatch();
      console.log(`  Completed: ${totalRecords} total records`);
      resolve();
    });

    fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }) // 64KB chunks
      .pipe(parser);
  });
}

main();
