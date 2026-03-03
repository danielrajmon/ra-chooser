import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import ts from 'typescript';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json());

app.get('/src/main.ts', async (_req, res) => {
  try {
    const source = await readFile(path.join(process.cwd(), 'frontend', 'src', 'main.ts'), 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
      },
      fileName: 'main.ts',
    });

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(transpiled.outputText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to transpile frontend TypeScript:', message);
    res.status(500).send('Failed to load frontend script');
  }
});

app.use(express.static(path.join(process.cwd(), 'frontend')));

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

app.get('/api/platforms', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM platforms');
    res.json(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to query platforms:', message);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(process.cwd(), 'frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
