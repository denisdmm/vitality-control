import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiBase = process.env.API_BASE_URL?.trim() || '/api/v1';
const target = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/environments/environment.ts',
);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `export const environment = {\n  apiBase: '${apiBase}',\n};\n`);

console.log(`environment.ts gerado com apiBase=${apiBase}`);