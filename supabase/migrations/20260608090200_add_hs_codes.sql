CREATE TABLE IF NOT EXISTS hs_codes (
    hs_code TEXT PRIMARY KEY,
    name_ko TEXT NOT NULL,
    name_en TEXT,
    import_code TEXT,
    export_code TEXT,
    unit_code TEXT
);

CREATE INDEX IF NOT EXISTS idx_hs_codes_name_ko ON hs_codes USING GIN (name_ko gin_trgm_ops);
