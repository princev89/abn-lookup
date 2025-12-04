CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS abn_entities (
  abn              varchar(11) PRIMARY KEY,
  status           varchar(50),
  status_from      date,
  entity_type      varchar(300),
  legal_name       varchar(300),
  state            varchar(100),
  postcode         varchar(100),
  acn              varchar(9),
  gst_registered   boolean,
  gst_from         date,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_names (
  id        bigserial PRIMARY KEY,
  abn       varchar(11) REFERENCES abn_entities (abn),
  name      varchar(300) NOT NULL
);


CREATE INDEX IF NOT EXISTS idx_abn_entities_legal_name_trgm
  ON abn_entities
  USING gin (legal_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_business_names_name_trgm
  ON business_names
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_business_names_abn
  ON business_names (abn);

CREATE INDEX IF NOT EXISTS idx_abn_entities_legal_name
  ON abn_entities (legal_name);

CREATE INDEX IF NOT EXISTS idx_abn_entities_state
  ON abn_entities (state);

CREATE INDEX IF NOT EXISTS idx_abn_entities_gst
  ON abn_entities (gst_registered);