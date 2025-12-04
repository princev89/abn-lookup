import { Pool } from "pg";
import type { AbnEntityRecord } from "./parseAbnFile.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function insertBatch(records: AbnEntityRecord[]) {
  if (records.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create a set of ABNs in this batch for quick lookup
    const abnSet = new Set(records.map(r => r.abn));

    // Build bulk insert for entities
    const entityPlaceholders: string[] = [];
    const entityParams: any[] = [];

    records.forEach((r, i) => {
      const offset = i * 9;
      entityPlaceholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      );
      entityParams.push(
        r.abn,
        r.status ?? null,
        r.statusFrom ?? null,
        r.entityType ?? null,
        r.legalName ?? null,
        r.state ?? null,
        r.postcode ?? null,
        r.acn ?? null,
        r.gstRegistered ?? null
      );
    });

    // Insert all entities in one query
    await client.query(
      `
      INSERT INTO abn_entities
        (abn, status, status_from, entity_type, legal_name, state, postcode, acn, gst_registered)
      VALUES ${entityPlaceholders.join(",")}
      ON CONFLICT (abn) DO UPDATE SET
        status = EXCLUDED.status,
        status_from = EXCLUDED.status_from,
        entity_type = EXCLUDED.entity_type,
        legal_name = EXCLUDED.legal_name,
        state = EXCLUDED.state,
        postcode = EXCLUDED.postcode,
        acn = EXCLUDED.acn,
        gst_registered = EXCLUDED.gst_registered,
        updated_at = now()
      `,
      entityParams
    );

    // Build bulk insert for business names - only for ABNs in this batch
    const bnPlaceholders: string[] = [];
    const bnParams: any[] = [];
    let paramIdx = 1;

    for (const r of records) {
      // Only add business names if ABN exists in this batch
      if (abnSet.has(r.abn)) {
        for (const bn of r.businessNames) {
          bnPlaceholders.push(`($${paramIdx++}, $${paramIdx++})`);
          bnParams.push(r.abn, bn);
        }
      }
    }

    // Insert all business names in one query
    if (bnPlaceholders.length > 0) {
      await client.query(
        `
        INSERT INTO business_names (abn, name)
        VALUES ${bnPlaceholders.join(",")}
        ON CONFLICT DO NOTHING
        `,
        bnParams
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Batch insert failed:", (e as Error).message);

    // Try inserting one by one to skip bad records
    console.log("  Retrying one-by-one...");
    for (const r of records) {
      try {
        await insertSingle(r);
      } catch (singleErr) {
        console.error(`  Skipping ABN ${r.abn}: ${(singleErr as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
}

async function insertSingle(r: AbnEntityRecord) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO abn_entities
        (abn, status, status_from, entity_type, legal_name, state, postcode, acn, gst_registered)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (abn) DO UPDATE SET
        status = EXCLUDED.status,
        status_from = EXCLUDED.status_from,
        entity_type = EXCLUDED.entity_type,
        legal_name = EXCLUDED.legal_name,
        state = EXCLUDED.state,
        postcode = EXCLUDED.postcode,
        acn = EXCLUDED.acn,
        gst_registered = EXCLUDED.gst_registered,
        updated_at = now()
      `,
      [
        r.abn,
        r.status ?? null,
        r.statusFrom ?? null,
        r.entityType ?? null,
        r.legalName ?? null,
        r.state ?? null,
        r.postcode ?? null,
        r.acn ?? null,
        r.gstRegistered ?? null
      ]
    );

    for (const bn of r.businessNames) {
      await client.query(
        `INSERT INTO business_names (abn, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [r.abn, bn]
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

export async function closePool() {
  await pool.end();
}
