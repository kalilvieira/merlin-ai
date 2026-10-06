import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

let sqlClient;
let ready;

function sql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("Banco de dados indisponível");
  sqlClient ??= neon(url);
  return sqlClient;
}

// Cria a tabela na primeira requisição (não precisa rodar migrações).
async function ensureSchema() {
  ready ??= (async () => {
    const q = sql();
    await q`CREATE TABLE IF NOT EXISTS records (
      id text PRIMARY KEY,
      owner text NOT NULL,
      kind text NOT NULL,
      payload text NOT NULL,
      updated bigint NOT NULL
    )`;
    await q`CREATE INDEX IF NOT EXISTS records_owner_kind ON records (owner, kind)`;
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

// Identidade anônima por navegador (cookie httpOnly).
export async function identity() {
  const store = await cookies();
  let id = store.get("merlin_uid")?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    store.set("merlin_uid", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return { id };
}

export async function readRecord(id, fallback) {
  await ensureSchema();
  const rows = await sql()`SELECT payload FROM records WHERE id = ${id}`;
  return rows[0] ? JSON.parse(rows[0].payload) : fallback;
}

export async function saveRecord(id, owner, kind, value) {
  await ensureSchema();
  await sql()`INSERT INTO records (id, owner, kind, payload, updated)
    VALUES (${id}, ${owner}, ${kind}, ${JSON.stringify(value)}, ${Date.now()})
    ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated = EXCLUDED.updated`;
}

export async function deleteUserData(owner) {
  await ensureSchema();
  await sql()`DELETE FROM records WHERE owner = ${owner}
    AND kind IN ('list','event','feedback','ticket')`;
}
