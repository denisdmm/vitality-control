// Script de importação Firestore → PostgreSQL (one-shot, idempotente).
//
// Lê os arquivos exportados em scripts/migration/firestore-export/ (gerados por
// scripts/firestore-export.mjs) e popula o banco via Prisma.
//
// Uso:
//   node tunnel.js                     (se estiver no sandbox — porta 5433)
//   npx ts-node scripts/firestore-to-postgres.ts
//
// Ordem de carga (respeita FKs):
//   1. users           4. exam_types     7. sub_items
//   2. shared_data     5. medications    8. vital_scores
//   3. health_records  6. vaccines
//   (+ patient_doctors, quando houver doctorIds)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const EXPORT_DIR = join(__dirname, 'migration', 'firestore-export');

const prisma = new PrismaClient();

// ── helpers de conversão Firestore ──────────────────────────────
// Recebe um objeto de campo Firestore REST (ajustado p/ nested maps abaixo)
function flatFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(fields || {})) {
    out[key] = convertField(fields[key]);
  }
  return out;
}

function convertField(field: any): any {
  if (!field) return null;
  const type = Object.keys(field)[0];
  const value = field[type];
  switch (type) {
    case 'nullValue': return null;
    case 'integerValue': return Number(value);
    case 'doubleValue': return Number(value);
    case 'booleanValue': return value;
    case 'stringValue': return value;
    case 'timestampValue': return value; // ISO string
    case 'mapValue': return flatFields(value.fields);
    case 'arrayValue': return (value.values || []).map(convertField);
    case 'referenceValue': return value;
    default: return value;
  }
}

function docId(doc: any): string {
  return doc.name.split('/').pop();
}

function roleOf(value: string | undefined): 'PACIENTE' | 'MEDICO' | 'ADMINISTRADOR' {
  const map: Record<string, 'PACIENTE' | 'MEDICO' | 'ADMINISTRADOR'> = {
    paciente: 'PACIENTE',
    medico: 'MEDICO',
    administrador: 'ADMINISTRADOR',
    administrator: 'ADMINISTRADOR',
  };
  return map[(value || '').toLowerCase()] || 'PACIENTE';
}

function statusOf(value: string | undefined): 'SOLICITADO' | 'AGENDADO' | 'REALIZADO' {
  const map: Record<string, 'SOLICITADO' | 'AGENDADO' | 'REALIZADO'> = {
    solicitado: 'SOLICITADO',
    agendado: 'AGENDADO',
    realizado: 'REALIZADO',
  };
  return map[(value || '').toLowerCase()] || 'SOLICITADO';
}

function toIso(t: any): Date | null {
  if (!t) return null;
  return new Date(t);
}

// ── carga ────────────────────────────────────────────────────────
async function loadJson<T>(name: string): Promise<T> {
  return JSON.parse(readFileSync(join(EXPORT_DIR, name), 'utf8')) as T;
}

async function importUsers(accounts: any[]) {
  let adminCreated = false;
  for (const acc of accounts) {
    const fields = flatFields(acc.fields);
    const id = docId(acc);
    const passwordHash = bcrypt.hashSync(String(fields.password ?? ''), 10);
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: String(fields.name ?? id),
        passwordHash,
        fullName: String(fields.fullName ?? fields.name ?? id),
        socialName: fields.socialName ? String(fields.socialName) : null,
        email: fields.email ? String(fields.email) : null,
        medicalRecordNumber: fields.medicalRecordNumber ? String(fields.medicalRecordNumber) : null,
        crm: fields.crm ? String(fields.crm) : null,
        photoUrl: fields.photoUrl ? String(fields.photoUrl) : null,
        role: roleOf(fields.role),
        height: typeof fields.height === 'number' ? fields.height : null,
        inactivityTimeout: typeof fields.inactivityTimeout === 'number' ? fields.inactivityTimeout : null,
      },
    });
    console.log(`  ✔ user ${id} (${fields.name}) role=${roleOf(fields.role)}`);
  }
  if (!accounts.some((a) => a.name.split('/').pop() === 'admin') && !adminCreated) {
    const adminHash = bcrypt.hashSync('admin', 10);
    await prisma.user.upsert({
      where: { id: 'admin' },
      update: {},
      create: {
        id: 'admin',
        name: 'admin',
        passwordHash: adminHash,
        fullName: 'Administrador',
        role: 'ADMINISTRADOR',
      },
    });
    console.log('  ✔ user admin (ADMINISTRADOR) — senha padrão "admin" (trocar!)');
  }
  return accounts.map((a) => docId(a));
}

async function importSharedData(sd: any) {
  if (!sd?.fields) return;
  const sdFields = flatFields(sd.fields);
  const hi = sdFields.healthIndices || {};
  const bp = hi.bloodPressure || {};
  const gl = hi.glucose || {};
  await prisma.sharedData.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      bpSystolic: typeof bp.systolic === 'number' ? bp.systolic : null,
      bpDiastolic: typeof bp.diastolic === 'number' ? bp.diastolic : null,
      bpSystolicIdeal: typeof bp.systolicIdeal === 'number' ? bp.systolicIdeal : null,
      bpDiastolicIdeal: typeof bp.diastolicIdeal === 'number' ? bp.diastolicIdeal : null,
      bpSystolicLimit: typeof bp.systolicLimit === 'number' ? bp.systolicLimit : null,
      bpDiastolicLimit: typeof bp.diastolicLimit === 'number' ? bp.diastolicLimit : null,
      glucosePreLimit: typeof gl.preLimit === 'number' ? gl.preLimit : null,
      glucoseDiabetesLimit: typeof gl.diabetesLimit === 'number' ? gl.diabetesLimit : null,
    },
  });
  console.log('  ✔ sharedData (índices de saúde)');
}

async function importExamTypes(exams: any[]) {
  for (const ex of exams) {
    const fields = flatFields(ex.fields);
    await prisma.examType.upsert({
      where: { label: String(fields.label ?? '') },
      update: {},
      create: { label: String(fields.label ?? '') },
    });
  }
  console.log(`  ✔ exam_types (${exams.length})`);
}

async function importHealthRecords(perUser: Record<string, any>) {
  let hr = 0;
  let sub = 0;
  for (const [uid, entry] of Object.entries(perUser)) {
    for (const r of entry.healthRecords || []) {
      const rf = flatFields(r.record.fields);
      const rid = docId(r.record);
      await prisma.healthRecord.upsert({
        where: { id: rid },
        update: {},
        create: {
          id: rid,
          userId: uid,
          name: String(rf.name ?? ''),
          type: String(rf.type ?? ''),
          requestDate: toIso(rf.requestDate) ?? new Date(),
          examDate: toIso(rf.examDate),
          result: rf.result ? String(rf.result) : null,
          status: statusOf(rf.status),
          requestingDoctorName: rf.requestingDoctorName ? String(rf.requestingDoctorName) : null,
          requestingDoctorCrm: rf.requestingDoctorCRM ? String(rf.requestingDoctorCRM) : null,
        },
      });
      hr++;
      for (const s of r.subItems || []) {
        const sf = flatFields(s.fields);
        await prisma.subItem.upsert({
          where: { id: docId(s) },
          update: {},
          create: {
            id: docId(s),
            recordId: rid,
            name: String(sf.name ?? ''),
            result: String(sf.result ?? ''),
            reference: String(sf.reference ?? ''),
          },
        });
        sub++;
      }
    }
  }
  console.log(`  ✔ health_records (${hr}) + sub_items (${sub})`);
}

async function importMedications(perUser: Record<string, any>) {
  let n = 0;
  for (const [uid, entry] of Object.entries(perUser)) {
    for (const m of entry.medications || []) {
      const mf = flatFields(m.fields);
      await prisma.medication.upsert({
        where: { id: docId(m) },
        update: {},
        create: {
          id: docId(m),
          userId: uid,
          name: String(mf.name ?? ''),
          dosage: String(mf.dosage ?? ''),
          frequency: String(mf.frequency ?? ''),
        },
      });
      n++;
    }
  }
  console.log(`  ✔ medications (${n})`);
}

async function importVaccines(perUser: Record<string, any>) {
  let n = 0;
  for (const [uid, entry] of Object.entries(perUser)) {
    for (const v of entry.vaccines || []) {
      const vf = flatFields(v.fields);
      await prisma.vaccine.upsert({
        where: { id: docId(v) },
        update: {},
        create: {
          id: docId(v),
          userId: uid,
          vaccineName: String(vf.vaccineName ?? ''),
          vaccinationDate: toIso(vf.vaccinationDate) ?? new Date(),
          seriesSchedule: vf.seriesSchedule ? String(vf.seriesSchedule) : null,
          intervalBetweenDoses: typeof vf.intervalBetweenDoses === 'number' ? vf.intervalBetweenDoses : null,
          intervalBetweenBoosterDoses: typeof vf.intervalBetweenBoosterDoses === 'number' ? vf.intervalBetweenBoosterDoses : null,
        },
      });
      n++;
    }
  }
  console.log(`  ✔ vaccines (${n})`);
}

async function importPatientDoctors(accounts: any[]) {
  let n = 0;
  for (const acc of accounts) {
    const f = flatFields(acc.fields);
    const patientId = docId(acc);
    const ids: any[] = Array.isArray(f.doctorIds) ? f.doctorIds : [];
    for (const doctorId of ids) {
      if (!doctorId) continue;
      await prisma.patientDoctor.upsert({
        where: { patientId_doctorId: { patientId, doctorId: String(doctorId) } },
        update: {},
        create: { patientId, doctorId: String(doctorId) },
      });
      n++;
    }
  }
  console.log(`  ✔ patient_doctors (${n})`);
}

async function importVitalScores(data: any) {
  const bp: Record<string, any> = {};
  const glu: Record<string, any> = {};
  const wgt: Record<string, any> = {};

  const keyOf = (name: string) => {
    // .../data/bloodPressure/{userId}_{YYYY-MM-DD}
    const parts = name.split('/');
    const tail = parts[parts.length - 1];
    const idx = tail.lastIndexOf('_');
    return { userId: tail.slice(0, idx), date: tail.slice(idx + 1) };
  };

  for (const d of (data.bloodPressure || []) as any[]) {
    const { userId, date } = keyOf(d.name);
    const f = flatFields(d.fields);
    const periods = { manha: f.manha ?? null, tarde: f.tarde ?? null, noite: f.noite ?? null };
    bp[`${userId}_${date}`] = periods;
  }
  for (const d of (data.glucose || []) as any[]) {
    const { userId, date } = keyOf(d.name);
    const f = flatFields(d.fields);
    glu[`${userId}_${date}`] = { manha: f.manha ?? null, tarde: f.tarde ?? null, noite: f.noite ?? null };
  }
  for (const d of (data.weight || []) as any[]) {
    const { userId, date } = keyOf(d.name);
    const f = flatFields(d.fields);
    wgt[`${userId}_${date}`] = f.weight;
  }

  const allKeys = new Set([...Object.keys(bp), ...Object.keys(glu), ...Object.keys(wgt)]);
  let n = 0;
  for (const k of allKeys) {
    const [userId, ...rest] = k.split('_');
    const dateStr = rest.join('_');
    await prisma.vitalScore.upsert({
      where: { userId_date: { userId, date: new Date(dateStr) } },
      update: {
        bloodPressurePeriods: bp[k] ? (bp[k] as any) : undefined,
        glucosePeriods: glu[k] ? (glu[k] as any) : undefined,
        weight: wgt[k] ?? undefined,
      },
      create: {
        userId,
        date: new Date(dateStr),
        bloodPressurePeriods: bp[k] ?? undefined,
        glucosePeriods: glu[k] ?? undefined,
        weight: wgt[k] ?? undefined,
      },
    });
    n++;
  }
  console.log(`  ✔ vital_scores (${n})`);
}

async function main() {
  console.log('Importação Firestore → Postgres iniciada...\n');

  const accounts = await loadJson<any[]>('accounts.json');
  const sharedData = await loadJson<any>('sharedData.json');
  const data = await loadJson<any>('data.json');
  const perUser = await loadJson<Record<string, any>>('perUser.json');
  let exams: any[] = [];
  try {
    exams = (await loadJson<any>('exams.json')).documents || [];
  } catch {
    /* exams.json opcional */
  }

  const idMap = await importUsers(accounts);
  await importSharedData(sharedData);
  await importExamTypes(exams);
  await importHealthRecords(perUser);
  await importMedications(perUser);
  await importVaccines(perUser);
  await importPatientDoctors(accounts);
  await importVitalScores(data);

  void idMap;
  console.log('\nImportação concluída com sucesso.');
}

main()
  .catch((e) => {
    console.error('ERRO na importação:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });