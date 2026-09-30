import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientAuditAction, Prisma, PrescriptionStatus, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PatientAccessService } from '../common/patient-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicalNoteDto, UpdateClinicalNoteDto } from './dto/clinical-note.dto';
import {
  ListAuditEventsQueryDto,
  ListDoctorPatientsQueryDto,
  PatientSummaryQueryDto,
  SUMMARY_MAX_WINDOW_DAYS,
  SUMMARY_WINDOW_DAYS,
} from './dto/doctor-panel.dto';

export const PENDING_MEASUREMENT_DAYS = 7;
export const PENDING_EXAM_DAYS = 90;
export const MAX_PATIENTS_PER_SCAN = 1000;
const RECENT_PRESCRIPTIONS = 12;
const RECENT_EXAMS = 20;
const RECENT_NOTES = 50;

type Periods = {
  manha?: { systolic?: number; diastolic?: number; pulse?: number } | null;
  tarde?: { systolic?: number; diastolic?: number; pulse?: number } | null;
  noite?: { systolic?: number; diastolic?: number; pulse?: number } | null;
};

type GlucosePeriods = {
  manha?: { value?: number } | null;
  tarde?: { value?: number } | null;
  noite?: { value?: number } | null;
};

type VitalsRow = {
  date: Date;
  bloodPressurePeriods: unknown;
  glucosePeriods: unknown;
  weight: number | null;
};

type Indicator = {
  last: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
};

type Indicators = Record<'systolic' | 'diastolic' | 'pulse' | 'glucose' | 'weight', Indicator>;

const EMPTY_INDICATOR: Indicator = { last: null, min: null, max: null, avg: null };

@Injectable()
export class DoctorPanelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
  ) {}

  // ── Lista de pacientes ──────────────────────────────────────────────────

  /**
   * Sinais e "última consulta" são derivados por linha, então a paginação e o
   * filtro de pendência acontecem em memória sobre o conjunto filtrado. O scan
   * é limitado a MAX_PATIENTS_PER_SCAN para não carregar a base inteira.
   */
  async listPatients(user: AuthenticatedUser, query: ListDoctorPatientsQueryDto) {
    const scope = query.scope ?? (user.role === Role.ADMINISTRADOR ? 'all' : 'mine');
    const search = query.search?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // A busca alcança qualquer paciente, vinculado ou não: é o caminho para
    // "Incluir paciente". O escopo `mine` só restringe a listagem sem busca.
    const onlyMine = scope === 'mine' && !search;

    const patients = await this.prisma.user.findMany({
      where: {
        role: Role.PACIENTE,
        ...(onlyMine ? { patientLinks: { some: { doctorId: user.id } } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { fullName: { contains: search, mode: 'insensitive' } },
                { medicalRecordNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        patientLinks: {
          include: { doctor: { select: { id: true, name: true, fullName: true, crm: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        prescriptionsAsPatient: {
          orderBy: { issuedAt: 'desc' },
          take: 1,
          select: { issuedAt: true },
        },
        vitals: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
        healthRecords: { orderBy: { examDate: 'desc' }, take: 1, select: { examDate: true } },
        medications: {
          where: { continuousUse: true, prescription: { status: PrescriptionStatus.ATIVA } },
          select: { id: true, schedules: { select: { time: true } } },
        },
        _count: { select: { healthRecords: true, notesAsPatient: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_PATIENTS_PER_SCAN,
    });

    const now = new Date();
    const items = patients.map((p) => this.patientListItem(p, user.id, now));
    const filtered = query.pendingOnly === 'true' ? items.filter((i) => i.signals.pending) : items;
    const start = (page - 1) * limit;

    return {
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      scope,
    };
  }

  // ── Ficha resumida ──────────────────────────────────────────────────────

  async summary(user: AuthenticatedUser, patientId: string, query: PatientSummaryQueryDto = {}) {
    const patient = await this.patientAccess.assertCanReadChart(
      user.id,
      user.role as Role,
      patientId,
    );

    const { from, to, windowDays } = this.resolvePeriod(query);
    const previousFrom = this.startOfDay(this.addDays(from, -windowDays));

    const [vitals, medications, prescriptions, exams, notes, links, thresholds] = await Promise.all([
      this.prisma.vitalScore.findMany({
        where: { userId: patientId, date: { gte: previousFrom, lte: to } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.medication.findMany({
        where: { userId: patientId, continuousUse: true, prescription: { status: PrescriptionStatus.ATIVA } },
        include: {
          schedules: { orderBy: { time: 'asc' } },
          prescribedBy: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.prescription.findMany({
        where: { patientId },
        select: {
          id: true,
          issuedAt: true,
          status: true,
          doctor: { select: { id: true, name: true } },
          medications: {
            select: { id: true, name: true, dosage: true, frequency: true, continuousUse: true },
          },
        },
        orderBy: { issuedAt: 'desc' },
        take: RECENT_PRESCRIPTIONS,
      }),
      this.prisma.healthRecord.findMany({
        where: { userId: patientId },
        include: { subItems: { orderBy: { name: 'asc' } } },
        orderBy: [{ examDate: 'desc' }, { requestDate: 'desc' }],
        take: RECENT_EXAMS,
      }),
      this.prisma.clinicalNote.findMany({
        where: { patientId },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: RECENT_NOTES,
      }),
      this.prisma.patientDoctor.findMany({
        where: { patientId },
        include: { doctor: { select: { id: true, name: true, fullName: true, crm: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.sharedData.findUnique({ where: { id: 1 } }),
    ]);

    const rows = vitals as VitalsRow[];
    const current = rows.filter((v) => v.date >= from && v.date <= to);
    const previous = rows.filter((v) => v.date < from);
    const currentIndicators = this.indicators(current);
    const previousIndicators = this.indicators(previous);

    return {
      patient,
      linkedToMe: links.some((l) => l.doctorId === user.id),
      doctors: links.map((l) => ({
        id: l.doctor.id,
        name: l.doctor.name,
        fullName: l.doctor.fullName,
        crm: l.doctor.crm,
        role: l.doctor.role,
        since: l.createdAt,
      })),
      vitals: {
        windowDays,
        from,
        to,
        hasRecentMeasurements: current.length > 0,
        series: current.map((v) => ({
          date: v.date,
          weight: v.weight,
          bloodPressure: v.bloodPressurePeriods,
          glucose: v.glucosePeriods,
        })),
        indicators: currentIndicators,
        previousIndicators,
        averageDelta: this.averageDelta(currentIndicators, previousIndicators),
      },
      thresholds,
      medications: medications.map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        continuousUse: m.continuousUse,
        schedules: m.schedules.map((s) => s.time),
        prescribedBy: m.prescribedBy,
      })),
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        issuedAt: p.issuedAt,
        status: p.status,
        doctor: p.doctor,
        medications: p.medications,
      })),
      exams: exams.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        requestDate: e.requestDate,
        examDate: e.examDate,
        result: e.result,
        status: e.status,
        requestingDoctorName: e.requestingDoctorName,
        subItems: e.subItems,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        author: n.author,
        canEdit: n.authorId === user.id,
        canDelete: n.authorId === user.id || user.role === Role.ADMINISTRADOR,
      })),
    };
  }

  // ── Vínculos ────────────────────────────────────────────────────────────

  /** Vínculo do próprio médico. Idempotente: repetir não duplica nem gera evento. */
  async linkPatient(user: AuthenticatedUser, patientId: string) {
    this.assertDoctorRole(user);
    await this.assertPatientExists(patientId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.patientDoctor.findUnique({
        where: { patientId_doctorId: { patientId, doctorId: user.id } },
      });
      if (!existing) {
        await tx.patientDoctor.create({ data: { patientId, doctorId: user.id } });
        await this.audit(tx, patientId, user.id, PatientAuditAction.LINK_ADDED);
      }
      return this.linkState(tx, patientId, user.id);
    });
  }

  /**
   * Assunção: remove os vínculos de outros médicos, preserva vínculos de
   * administrador (que não dependem de vínculo) e mantém o próprio. As receitas
   * emitidas pelos médicos anteriores não são tocadas — a autoria fica.
   */
  async transferPatient(user: AuthenticatedUser, patientId: string) {
    this.assertDoctorRole(user);
    await this.assertPatientExists(patientId);

    return this.prisma.$transaction(async (tx) => {
      const links = await tx.patientDoctor.findMany({
        where: { patientId, doctorId: { not: user.id } },
        include: { doctor: { select: { role: true } } },
      });
      for (const link of links.filter((l) => l.doctor.role === Role.MEDICO)) {
        await tx.patientDoctor.delete({ where: { id: link.id } });
        await this.audit(tx, patientId, user.id, PatientAuditAction.LINK_REMOVED, link.doctorId);
      }

      const own = await tx.patientDoctor.findUnique({
        where: { patientId_doctorId: { patientId, doctorId: user.id } },
      });
      if (!own) {
        await tx.patientDoctor.create({ data: { patientId, doctorId: user.id } });
        await this.audit(tx, patientId, user.id, PatientAuditAction.LINK_ADDED);
      }
      await this.audit(tx, patientId, user.id, PatientAuditAction.PATIENT_TRANSFERRED);
      return this.linkState(tx, patientId, user.id);
    });
  }

  // ── Trilha de auditoria ─────────────────────────────────────────────────

  async auditEvents(user: AuthenticatedUser, query: ListAuditEventsQueryDto) {
    if (user.role === Role.MEDICO) {
      throw new ForbiddenException('Consulta da trilha restrita ao administrador e ao paciente');
    }
    if (user.role === Role.PACIENTE && query.patientId !== user.id) {
      throw new ForbiddenException('A trilha de outro paciente não está disponível');
    }

    const events = await this.prisma.patientAuditEvent.findMany({
      where: { patientId: query.patientId },
      include: {
        actor: { select: { id: true, name: true, fullName: true, role: true } },
        subjectDoctor: { select: { id: true, name: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });

    return events.map((e) => ({
      id: e.id,
      action: e.action,
      createdAt: e.createdAt,
      patientId: e.patientId,
      actor: e.actor,
      subjectDoctor: e.subjectDoctor,
    }));
  }

  // ── Anotações clínicas ──────────────────────────────────────────────────

  async listNotes(user: AuthenticatedUser, patientId: string) {
    await this.patientAccess.assertCanReadChart(user.id, user.role as Role, patientId, {
      record: false,
    });
    const notes = await this.prisma.clinicalNote.findMany({
      where: { patientId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_NOTES,
    });
    return notes.map((n) => this.noteResponse(n, user));
  }

  async createNote(user: AuthenticatedUser, patientId: string, dto: CreateClinicalNoteDto) {
    this.assertDoctorRole(user);
    await this.patientAccess.assertCanReadChart(user.id, user.role as Role, patientId, {
      record: false,
    });
    const note = await this.prisma.clinicalNote.create({
      data: { patientId, authorId: user.id, body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.noteResponse(note, user);
  }

  /** Só o autor edita; administrador apaga mas não edita texto de outro. */
  async updateNote(user: AuthenticatedUser, noteId: string, dto: UpdateClinicalNoteDto) {
    this.assertDoctorRole(user);
    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Anotação não encontrada');
    if (note.authorId !== user.id) throw new ForbiddenException('Apenas o autor edita a anotação');
    const updated = await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: { body: dto.body },
      include: { author: { select: { id: true, name: true } } },
    });
    return this.noteResponse(updated, user);
  }

  async deleteNote(user: AuthenticatedUser, noteId: string) {
    this.assertDoctorRole(user);
    const note = await this.prisma.clinicalNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Anotação não encontrada');
    if (note.authorId !== user.id && user.role !== Role.ADMINISTRADOR) {
      throw new ForbiddenException('Apenas o autor ou o administrador apagam a anotação');
    }
    await this.prisma.clinicalNote.delete({ where: { id: noteId } });
    return { deleted: true };
  }

  // ── Auxiliares ──────────────────────────────────────────────────────────

  private assertDoctorRole(user: AuthenticatedUser): void {
    if (user.role !== Role.MEDICO && user.role !== Role.ADMINISTRADOR) {
      throw new ForbiddenException('Operação restrita a médicos');
    }
  }

  private async assertPatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { role: true },
    });
    if (!patient || patient.role !== Role.PACIENTE) {
      throw new NotFoundException('Paciente não encontrado');
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    patientId: string,
    actorId: string,
    action: PatientAuditAction,
    subjectDoctorId?: string,
  ) {
    await tx.patientAuditEvent.create({
      data: { patientId, actorId, action, subjectDoctorId: subjectDoctorId ?? null },
    });
  }

  private async linkState(
    tx: Prisma.TransactionClient,
    patientId: string,
    doctorId: string,
  ) {
    const links = await tx.patientDoctor.findMany({
      where: { patientId },
      include: { doctor: { select: { id: true, name: true, fullName: true, crm: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return {
      patientId,
      linkedToMe: links.some((l) => l.doctorId === doctorId),
      doctors: links.map((l) => ({
        id: l.doctor.id,
        name: l.doctor.name,
        fullName: l.doctor.fullName,
        crm: l.doctor.crm,
        role: l.doctor.role,
      })),
    };
  }

  private patientListItem(
    p: {
      id: string;
      name: string;
      fullName: string;
      medicalRecordNumber: string | null;
      photoUrl: string | null;
      patientLinks: { doctorId: string; doctor: { id: string; name: string; fullName: string; crm: string | null; role: Role } }[];
      prescriptionsAsPatient: { issuedAt: Date }[];
      vitals: { date: Date }[];
      healthRecords: { examDate: Date | null }[];
      medications: { id: string; schedules: { time: string }[] }[];
      _count: { healthRecords: number; notesAsPatient: number };
    },
    requesterId: string,
    now: Date,
  ) {
    const lastPrescriptionAt = p.prescriptionsAsPatient[0]?.issuedAt ?? null;
    const lastMeasurementAt = p.vitals[0]?.date ?? null;
    const lastExamAt = p.healthRecords[0]?.examDate ?? null;
    const withoutSchedule = p.medications.filter((m) => m.schedules.length === 0).length;
    const noRecentMeasurement =
      lastMeasurementAt === null ||
      this.startOfDay(lastMeasurementAt) <
        this.startOfDay(this.addDays(now, -PENDING_MEASUREMENT_DAYS));
    const examOverdue =
      lastExamAt === null || this.startOfDay(lastExamAt) < this.startOfDay(this.addDays(now, -PENDING_EXAM_DAYS));

    return {
      id: p.id,
      name: p.name,
      fullName: p.fullName,
      medicalRecordNumber: p.medicalRecordNumber,
      photoUrl: p.photoUrl,
      lastPrescriptionAt,
      lastMeasurementAt,
      lastExamAt,
      linkedToMe: p.patientLinks.some((l) => l.doctorId === requesterId),
      doctors: p.patientLinks.map((l) => ({
        id: l.doctor.id,
        name: l.doctor.name,
        fullName: l.doctor.fullName,
        crm: l.doctor.crm,
        role: l.doctor.role,
      })),
      signals: {
        medicationsWithoutSchedule: withoutSchedule,
        noRecentMeasurement,
        examOverdue,
        pending: withoutSchedule > 0 || noRecentMeasurement || examOverdue,
      },
      counts: { exams: p._count.healthRecords, notes: p._count.notesAsPatient },
    };
  }

  private noteResponse(
    n: { id: string; body: string; createdAt: Date; updatedAt: Date; authorId: string; author: { id: string; name: string } },
    user: AuthenticatedUser,
  ) {
    return {
      id: n.id,
      body: n.body,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
      author: n.author,
      canEdit: n.authorId === user.id,
      canDelete: n.authorId === user.id || user.role === Role.ADMINISTRADOR,
    };
  }

  private indicators(rows: VitalsRow[]): Indicators {
    const systolic: number[] = [];
    const diastolic: number[] = [];
    const pulse: number[] = [];
    const glucose: number[] = [];
    const weight: number[] = [];

    for (const row of rows) {
      const bp = (row.bloodPressurePeriods ?? null) as Periods | null;
      for (const period of [bp?.manha, bp?.tarde, bp?.noite]) {
        if (typeof period?.systolic === 'number') systolic.push(period.systolic);
        if (typeof period?.diastolic === 'number') diastolic.push(period.diastolic);
        if (typeof period?.pulse === 'number') pulse.push(period.pulse);
      }
      const gl = (row.glucosePeriods ?? null) as GlucosePeriods | null;
      for (const period of [gl?.manha, gl?.tarde, gl?.noite]) {
        if (typeof period?.value === 'number') glucose.push(period.value);
      }
      if (typeof row.weight === 'number') weight.push(row.weight);
    }

    return {
      systolic: this.indicator(systolic),
      diastolic: this.indicator(diastolic),
      pulse: this.indicator(pulse),
      glucose: this.indicator(glucose),
      weight: this.indicator(weight),
    };
  }

  private indicator(values: number[]): Indicator {
    if (values.length === 0) return { ...EMPTY_INDICATOR };
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      last: values[values.length - 1],
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Number((sum / values.length).toFixed(2)),
    };
  }

  private averageDelta(current: Indicators, previous: Indicators) {
    const keys = Object.keys(current) as (keyof Indicators)[];
    return keys.reduce<Partial<Record<keyof Indicators, number | null>>>((acc, key) => {
      const now = current[key].avg;
      const before = previous[key].avg;
      acc[key] = now === null || before === null ? null : Number((now - before).toFixed(2));
      return acc;
    }, {});
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Período da biometria: padrão de 90 dias encerrando hoje, ou o intervalo
   * pedido pelo médico. O período anterior usado na comparação tem sempre o
   * mesmo tamanho e vem logo antes do atual.
   */
  private resolvePeriod(query: PatientSummaryQueryDto): { from: Date; to: Date; windowDays: number } {
    const today = this.startOfDay(new Date());
    const toStart = query.to ? this.startOfDay(new Date(`${query.to}T00:00:00`)) : today;
    const to = new Date(toStart);
    to.setHours(23, 59, 59, 999);

    if (toStart > today) {
      throw new BadRequestException('A data final não pode ser futura.');
    }

    const from = query.from
      ? this.startOfDay(new Date(`${query.from}T00:00:00`))
      : this.startOfDay(this.addDays(toStart, -(SUMMARY_WINDOW_DAYS - 1)));

    if (from > toStart) {
      throw new BadRequestException('A data inicial não pode ser maior que a data final.');
    }
    if (from.getTime() === today.getTime()) {
      throw new BadRequestException('A data inicial não pode ser o dia atual.');
    }

    const windowDays = Math.round((toStart.getTime() - from.getTime()) / 86_400_000) + 1;
    if (windowDays > SUMMARY_MAX_WINDOW_DAYS) {
      throw new BadRequestException(`O período não pode passar de ${SUMMARY_MAX_WINDOW_DAYS} dias.`);
    }

    return { from, to, windowDays };
  }
}
