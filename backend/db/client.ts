import { config } from "dotenv";
import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import path from "path";

config({ path: path.join(__dirname, "../../.env"), quiet: true });

const postgresHost = process.env.POSTGRES_HOST || "localhost";
const postgresPort = parseInt(process.env.POSTGRES_PORT || "5432", 10);
const postgresDatabase = process.env.POSTGRES_DB;

if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(postgresHost)) {
  console.warn(
    `[db] POSTGRES_HOST=${postgresHost} in production. Inside Docker this points to the container itself, not the NAS or another database host.`,
  );
}

console.log(`[db] Using PostgreSQL connection parameters host=${postgresHost} port=${postgresPort} database=${postgresDatabase ?? "<unset>"}`);

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: postgresHost,
  port: postgresPort,
  database: postgresDatabase,
});

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  return pool.query<T>(text, values as any[]);
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const value = await work(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
