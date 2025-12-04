import express from "express";
import cors from "cors";
import { pool } from "./db";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.get("/search", async (req, res) => {
  const q = (req.query.q as string) ?? "";
  const state = (req.query.state as string) ?? "";
  const gst = req.query.gst as string | undefined;
  const entityType = (req.query.entity_type as string) ?? "";
  const postcode = (req.query.postcode as string) ?? "";
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

  const page = parseInt((req.query.page as string) || "1", 10);
  const offset = (page - 1) * limit;

  const params: any[] = [];
  const where: string[] = [];

  if (q) {
    params.push(`%${q}%`);
    params.push(`%${q}%`);
    where.push(
      "(legal_name ILIKE $1 OR abn IN (SELECT abn FROM business_names WHERE name ILIKE $2))"
    );
  }

  if (state) {
    params.push(state);
    where.push(`state = $${params.length}`);
  }

  if (gst === "true" || gst === "false") {
    params.push(gst === "true");
    where.push(`gst_registered = $${params.length}`);
  }

  if (entityType) {
    params.push(entityType);
    where.push(`entity_type = $${params.length}`);
  }
  if (postcode) {
    params.push(postcode);
    where.push(`postcode = $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const sql = `
    SELECT abn, legal_name, state, postcode, entity_type, gst_registered
    FROM abn_entities
    ${whereSql}
    ORDER BY legal_name
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const result = await pool.query(sql, params);
  res.json({ page, limit, results: result.rows });
});

app.get("/abn/:abn", async (req, res) => {
  const abn = req.params.abn;
  const client = await pool.connect();
  try {
    const entity = await client.query("SELECT * FROM abn_entities WHERE abn = $1", [abn]);
    if (!entity.rowCount) return res.status(404).json({ error: "Not found" });

    const names = await client.query("SELECT name FROM business_names WHERE abn = $1", [abn]);
    res.json({ ...entity.rows[0], businessNames: names.rows.map(r => r.name) });
  } finally {
    client.release();
  }
});

app.get("/filters", async (_req, res) => {
  try {
    const entity = await pool.query(`
      SELECT  entity_type, state from abn_entities
      GROUP BY entity_type, state
      `);
    if (!entity.rowCount) return res.status(404).json({ error: "Not found" });

    res.json({
      data: {
        entity_type: entity.rows.map((data) => data.entity_type),
        states: entity.rows.map((data) => data.state)
      }
    });
  }
  catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }

})

app.get("/stats", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total_entities
      FROM abn_entities
    `);
    const stats = result.rows[0];
    res.json({
      totalEntities: parseInt(stats.total_entities, 10)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.API_PORT || 3000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
