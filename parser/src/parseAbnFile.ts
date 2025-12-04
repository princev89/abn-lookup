import fs from "fs";
import sax from "sax";

export interface AbnEntityRecord {
  abn: string;
  status?: string;
  statusFrom?: string;
  entityType?: string;
  legalName?: string;
  state?: string;
  postcode?: string;
  acn?: string;
  gstRegistered?: boolean;
  businessNames: string[];
}

export async function parseAbnFile(filePath: string): Promise<AbnEntityRecord[]> {
  return new Promise((resolve, reject) => {
    const records: AbnEntityRecord[] = [];
    let currentRecord: Partial<AbnEntityRecord> | null = null;
    let currentPath: string[] = [];
    let currentText = "";
    let currentAbnAttributes: any = null;

    const parser = sax.createStream(true, {});

    parser.on("opentag", (node: any) => {
      currentPath.push(node.name);
      currentText = "";


      if (node.name === "ABR") {
        currentRecord = {
          businessNames: [],
        };
      }

      // Store ABN tag attributes (status, ABNStatusFromDate)
      if (node.name === "ABN" && currentRecord) {
        currentAbnAttributes = node.attributes;
        const status = node.attributes?.status as string;
        const statusFrom = node.attributes?.ABNStatusFromDate as string;

        if (status) {
          currentRecord.status = status;
        }
        if (statusFrom) {
          currentRecord.statusFrom = statusFrom;
        }
      }

      // Extract GST status from attributes
      if (node.name === "GST" && currentRecord) {
        const gstStatus = node.attributes?.status as string;
        if (gstStatus) {
          // GST status is "ACT" for active, not "Active"
          currentRecord.gstRegistered = gstStatus === "ACT";
        }
      }

      // Store ASIC number type
      if (node.name === "ASICNumber" && currentRecord) {
        // We'll get the actual number from text content
      }
    });

    parser.on("text", (text: string) => {
      currentText += text;
    });

    parser.on("closetag", (tagName: string) => {
      const path = currentPath.join("/");
      const trimmedText = currentText.trim();

      if (currentRecord) {
        // Map XML paths to record fields based on actual XML structure
        if (tagName === "ABN" && trimmedText) {
          // ABN number is in text content, not attribute
          currentRecord.abn = trimmedText;
        } else if (path.endsWith("EntityType/EntityTypeInd")) {
          currentRecord.entityType = trimmedText;
        } else if (path.endsWith("MainEntity/NonIndividualName/NonIndividualNameText")) {
          // Legal name is in MainEntity/NonIndividualName/NonIndividualNameText
          if (!currentRecord.legalName && trimmedText) {
            currentRecord.legalName = trimmedText;
          }
        } else if (path.endsWith("MainEntity/IndividualName/FamilyName")) {
          // For individuals, construct name from parts
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
          // State is in BusinessAddress/AddressDetails/State
          currentRecord.state = trimmedText;
        } else if (path.endsWith("BusinessAddress/AddressDetails/Postcode")) {
          // Postcode is in BusinessAddress/AddressDetails/Postcode
          currentRecord.postcode = trimmedText;
        } else if (tagName === "ASICNumber" && trimmedText) {
          // ACN is the text content of ASICNumber tag
          currentRecord.acn = trimmedText;
        } else if (path.endsWith("OtherEntity/NonIndividualName/NonIndividualNameText")) {
          // Business names are in OtherEntity/NonIndividualName/NonIndividualNameText
          if (trimmedText) {
            currentRecord.businessNames?.push(trimmedText);
          }
        }
      }

      // When we close the ABR tag, save the record
      if (tagName === "ABR" && currentRecord && currentRecord.abn) {
        records.push(currentRecord as AbnEntityRecord);
        currentRecord = null;
        currentAbnAttributes = null;
      }

      currentPath.pop();
    });

    parser.on("error", (err: Error) => {
      reject(err);
    });

    parser.on("end", () => {
      resolve(records);
    });

    fs.createReadStream(filePath).pipe(parser);
  });
}
