import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function openProfileStore(file, databaseUrl) {
  let local = {};
  try { local = JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }

  if (!databaseUrl) {
    await mkdir(dirname(file), { recursive: true });
    return {
      data: local,
      accountsEnabled: process.env.RENDER !== "true" || Boolean(process.env.EXALTED_DATA),
      async write(snapshot) {
        await writeFile(file + ".tmp", snapshot, { mode: 0o600 });
        await rename(file + ".tmp", file);
      }
    };
  }

  const { hostname, protocol } = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(protocol) || !hostname.endsWith(".neon.tech")) {
    throw new Error("EXALTED_DATABASE_URL must be a Neon PostgreSQL connection string.");
  }
  async function sql(query, params = []) {
    const response = await fetch(`https://${hostname}/sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Neon-Connection-String": databaseUrl },
      body: JSON.stringify({ query, params }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`Profile database request failed (HTTP ${response.status}).`);
    return response.json();
  }
  await sql("CREATE TABLE IF NOT EXISTS exalted_profiles (id integer PRIMARY KEY, snapshot jsonb NOT NULL)");
  await sql("INSERT INTO exalted_profiles VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING", [JSON.stringify(local)]);
  const { rows } = await sql("SELECT snapshot FROM exalted_profiles WHERE id = 1");
  const snapshot = rows[0].snapshot;
  return {
    data: typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot,
    accountsEnabled: true,
    write: snapshot => sql("UPDATE exalted_profiles SET snapshot = $1::jsonb WHERE id = 1", [snapshot])
  };
}
