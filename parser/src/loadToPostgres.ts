import { Pool } from "pg";
import type { AbnEntityRecord } from "./parseAbnFile.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function insertBatch(records: AbnEntityRecord[]) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const entityValues = records
      .map(
        (r, i) =>
          `($${i * 9 + 1}, $${i * 9 + 2}, $${i * 9 + 3}, $${i * 9 + 4}, $${i * 9 + 5}, $${i * 9 + 6}, $${i * 9 + 7}, $${i * 9 + 8}, $${i * 9 + 9})`
      )
      .join(",");

    const entityParams = records.flatMap(r => [
      r.abn,
      r.status ?? null,
      r.statusFrom ?? null,
      r.entityType ?? null,
      r.legalName ?? null,
      r.state ?? null,
      r.postcode ?? null,
      r.acn ?? null,
      r.gstRegistered ?? null
    ]);

    await client.query(
      `
      INSERT INTO abn_entities
        (abn, status, status_from, entity_type, legal_name, state, postcode, acn, gst_registered)
      VALUES ${entityValues}
      ON CONFLICT (abn) DO UPDATE SET
        status = EXCLUDED.status,
        status_from = EXCLUDED.status_from,
        entity_type = EXCLUDED.entity_type,
        legal_name = EXCLUDED.legal_name,
        state = EXCLUDED.state,
        postcode = EXCLUDED.postcode,
        acn = EXCLUDED.acn,
        gst_registered = EXCLUDED.gst_registered
    `,
      entityParams
    );

    const bnParams: any[] = [];
    const bnValues: string[] = [];
    let idx = 1;
    for (const r of records) {
      for (const bn of r.businessNames) {
        bnValues.push(`($${idx++}, $${idx++})`);
        bnParams.push(r.abn, bn);
      }
    }

    if (bnValues.length) {
      await client.query(
        `
        INSERT INTO business_names (abn, name)
        VALUES ${bnValues.join(",")}
        ON CONFLICT DO NOTHING
      `,
        bnParams
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
