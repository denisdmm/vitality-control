import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BloodPressureUpdateDto,
  DateRangeDto,
  GlucoseUpdateDto,
  VitalsDailyDto,
  WeightUpdateDto,
} from './dto/vitals.dto';

@Injectable()
export class VitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, range?: DateRangeDto) {
    const where: Prisma.VitalScoreWhereInput = { userId };
    if (range?.from || range?.to) {
      where.date = {};
      if (range.from) Object.assign(where.date, { gte: this.parseDate(range.from) });
      if (range.to) Object.assign(where.date, { lte: this.parseDate(range.to) });
    }
    return this.prisma.vitalScore.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async day(userId: string, date: string) {
    const found = await this.prisma.vitalScore.findUnique({
      where: { userId_date: { userId, date: this.parseDate(date) } },
    });
    return found;
  }

  /** Registro unificado "Sinais Vitais" (PA + glicemia + peso de um dia). */
  async saveDaily(userId: string, dto: VitalsDailyDto) {
    const date = this.parseDate(dto.date);
    const existing = await this.prisma.vitalScore.findUnique({
      where: { userId_date: { userId, date } },
    });
    const bloodPressurePeriods = dto.bloodPressure ? this.mergeBp(existing?.bloodPressurePeriods as any, dto.bloodPressure as any) : undefined;
    const glucosePeriods = dto.glucose ? this.mergeGlucose(existing?.glucosePeriods as any, dto.glucose as any) : undefined;

    return this.prisma.vitalScore.upsert({
      where: { userId_date: { userId, date } },
      update: {
        bloodPressurePeriods: this.jsonOrNull(bloodPressurePeriods),
        glucosePeriods: this.jsonOrNull(glucosePeriods),
        weight: dto.weight !== undefined ? dto.weight : undefined,
      },
      create: {
        userId,
        date,
        bloodPressurePeriods: dto.bloodPressure ? this.mergeBp(null, dto.bloodPressure as any) as any : Prisma.DbNull,
        glucosePeriods: dto.glucose ? this.mergeGlucose(null, dto.glucose as any) as any : Prisma.DbNull,
        weight: dto.weight ?? undefined,
      },
    });
  }

  async setBloodPressure(userId: string, dateStr: string, dto: BloodPressureUpdateDto) {
    const date = this.parseDate(dateStr);
    const existing = await this.prisma.vitalScore.findUnique({
      where: { userId_date: { userId, date } },
    });
    const bloodPressurePeriods = this.mergeBp(existing?.bloodPressurePeriods as any, dto as any);
    return this.prisma.vitalScore.upsert({
      where: { userId_date: { userId, date } },
      update: { bloodPressurePeriods: this.jsonOrNull(bloodPressurePeriods) },
      create: { userId, date, bloodPressurePeriods: bloodPressurePeriods as any },
    });
  }

  async setGlucose(userId: string, dateStr: string, dto: GlucoseUpdateDto) {
    const date = this.parseDate(dateStr);
    const existing = await this.prisma.vitalScore.findUnique({
      where: { userId_date: { userId, date } },
    });
    const glucosePeriods = this.mergeGlucose(existing?.glucosePeriods as any, dto as any);
    return this.prisma.vitalScore.upsert({
      where: { userId_date: { userId, date } },
      update: { glucosePeriods: this.jsonOrNull(glucosePeriods) },
      create: { userId, date, glucosePeriods: glucosePeriods as any },
    });
  }

  async setWeight(userId: string, dateStr: string, dto: WeightUpdateDto) {
    const date = this.parseDate(dateStr);
    return this.prisma.vitalScore.upsert({
      where: { userId_date: { userId, date } },
      update: { weight: dto.weight },
      create: { userId, date, weight: dto.weight },
    });
  }

  async remove(userId: string, dateStr: string) {
    const date = this.parseDate(dateStr);
    const existing = await this.prisma.vitalScore.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (!existing) throw new NotFoundException('Registro não encontrado');
    await this.prisma.vitalScore.delete({ where: { id: existing.id } });
    return { deleted: date.toISOString().slice(0, 10) };
  }

  /** Médico: pressão de um paciente vinculado (admin: qualquer paciente). */
  async pressureForPatient(requesterId: string, requesterRole: Role, patientId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    if (requesterRole !== Role.ADMINISTRADOR) {
      const link = await this.prisma.patientDoctor.findUnique({
        where: { patientId_doctorId: { patientId, doctorId: requesterId } },
      });
      if (!link) throw new ForbiddenException('Paciente não vinculado a este médico');
    }
    const vitals = await this.prisma.vitalScore.findMany({
      where: { userId: patientId },
      orderBy: { date: 'desc' },
    });
    return {
      patient: {
        id: patient.id,
        name: patient.name,
        fullName: patient.fullName,
        medicalRecordNumber: patient.medicalRecordNumber,
        photoUrl: patient.photoUrl,
      },
      vitals,
    };
  }

  async patientsOfMedico(medicoId: string) {
    const links = await this.prisma.patientDoctor.findMany({
      where: { doctorId: medicoId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            fullName: true,
            medicalRecordNumber: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { patient: { fullName: 'asc' } },
    });
    return links.map((l) => l.patient);
  }

  // ── helpers ────────────────────────────────────────────────

  private parseDate(date: string): Date {
    const d = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new NotFoundException('Data inválida');
    return d;
  }

  private cleanPeriod(p: any) {
    if (!p) return null;
    const out: Record<string, number> = {};
    for (const k of ['systolic', 'diastolic', 'pulse', 'value']) {
      if (typeof p[k] === 'number') out[k] = p[k];
    }
    return Object.keys(out).length ? out : null;
  }

  private jsonOrNull(v: Record<string, any> | null | undefined) {
    return v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);
  }

  private mergeBp(existing: any, patch: any) {
    if (!patch && !existing) return null;
    const base = { manha: null, tarde: null, noite: null, ...(existing ?? {}) };
    for (const k of ['manha', 'tarde', 'noite']) {
      if (k in patch) base[k] = k in patch ? this.cleanPeriod(patch[k]) : base[k];
    }
    return { manha: base.manha, tarde: base.tarde, noite: base.noite };
  }

  private mergeGlucose(existing: any, patch: any) {
    if (!patch && !existing) return null;
    const base = { manha: null, tarde: null, noite: null, ...(existing ?? {}) };
    for (const k of ['manha', 'tarde', 'noite']) {
      if (k in patch) base[k] = k in patch ? this.cleanPeriod(patch[k]) : base[k];
    }
    return { manha: base.manha, tarde: base.tarde, noite: base.noite };
  }
}