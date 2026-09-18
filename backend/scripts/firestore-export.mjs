// Exporta todas as coleções do Firestore via REST (regras públicas)
// para arquivos JSON em firestore-export/.
// Uso: node scripts/firestore-export.mjs [--only sharedData|accounts|healthRecords|data|sub|index]
//
// Nota: o sandbox usa proxy HTTP; o Firestore REST é HTTPS e passa pelo proxy.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'firestore-export');
const BASE = 'https://firestore.googleapis.com/v1/projects/central-de-vitalidade/databases/(default)/documents';
// namespace raiz do projeto: coleção 'central-de-vitalidade'
const NS = 'central-de-vitalidade';

const onlyCli = process.argv.slice(2).filter((a) => a.startsWith('--only')).flatMap((a) => a.split('=')[1] ? a.split('=')[1].split(',') : []);
const only = new Set(onlyCli);

// fetch via curl (passa pelo proxy do ambiente; Node fetch não usa proxy)
function fetchJson(url) {
  const raw = execFileSync('curl', ['-s', '--max-time', '60', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 });
  return JSON.parse(raw);
}

// Lista todos os documentos de uma coleção (paginada)
async function listAll(path) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${path}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await fetchJson(url);
    if (data.documents) docs.push(...data.documents);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// Lista as SUBcoleções reais de um documento pai (só as que retornam docs)
async function listSubcollections(parentPath) {
  const found = [];
  for (const sub of ['medications', 'vaccines', 'healthRecords']) {
    try {
      const docs = await listAll(`${parentPath}/${sub}`);
      if (docs.length) found.push({ sub, docs });
    } catch (e) {
      // subcoleção inexistente — ignora
    }
  }
  return found;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const out = (name, data) => {
    writeFileSync(join(OUT, name), JSON.stringify(data, null, 2));
    console.log(`✔ ${name}  (${Array.isArray(data) ? data.length : 'objeto'} items)`);
  };

  // 1) Contas de usuário
  const accounts = (!only.size || only.has('accounts')) ? await listAll(`${NS}/users/accounts`) : [];
  out('accounts.json', accounts);

  // 2) sharedData (singleton)
  if (!only.size || only.has('sharedData')) {
    try {
      const sd = await fetchJson(`${BASE}/${NS}/sharedData`);
      out('sharedData.json', sd);
    } catch (e) {
      console.log('⚠ sharedData não encontrado');
    }
  }

  // 3) Coleções planas de dados diários
  const dataCols = {};
  for (const col of ['bloodPressure', 'glucose', 'weight']) {
    if (only.size && !only.has('data')) continue;
    try {
      dataCols[col] = await listAll(`${NS}/data/${col}`);
    } catch (e) {
      dataCols[col] = [];
    }
  }
  if (!only.size || only.has('data')) out('data.json', dataCols);

  // 4) Subcoleções por usuário (healthRecords+subItems, medications, vaccines)
  const perUser = {};
  const accountIds = accounts.map((d) => d.name.split('/').pop());
  const candidateIds = new Set([...accountIds, 'admin']);

  let processed = 0;
  for (const uid of candidateIds) {
    const parent = `${NS}/users/accounts/${uid}`;
    // exames (healthRecords + subItens)
    if (!only.size || only.has('healthRecords')) {
      try {
        const hrDocs = await listAll(`${parent}/healthRecords`);
        if (hrDocs.length) {
          const records = [];
          for (const r of hrDocs) {
            const rid = r.name.split('/').pop();
            const subs = await listAll(`${parent}/healthRecords/${rid}/subItems`);
            records.push({ record: r, subItems: subs });
          }
          (perUser[uid] ||= {}).healthRecords = records;
        }
      } catch { /* sem exames */ }
    }
    processed++;
    if (processed % 5 === 0) console.log(`  ...usuários processados: ${processed}/${candidateIds.size}`);
  }

  for (const uid of candidateIds) {
    const top = `${NS}/${uid}`;
    if (!only.size || only.has('medications')) {
      try {
        const meds = await listAll(`${top}/medications`);
        if (meds.length) (perUser[uid] ||= {}).medications = meds;
      } catch { /* sem medicamentos */ }
    }
    if (!only.size || only.has('vaccines')) {
      try {
        const vacs = await listAll(`${top}/vaccines`);
        if (vacs.length) (perUser[uid] ||= {}).vaccines = vacs;
      } catch { /* sem vacinas */ }
    }
  }

  if (!only.size || only.has('healthRecords') || only.has('medications') || only.has('vaccines')) {
    out('perUser.json', perUser);
  }

  console.log('Exportação concluída em', OUT);
}

main().catch((e) => {
  console.error('ERRO:', e);
  process.exit(1);
});