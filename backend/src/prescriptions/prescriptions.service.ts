import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Prescription, PrescriptionStatus, Prisma, Role } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PatientAccessService } from '../common/patient-access.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePrescriptionDto,
  CreatePrescriptionMedicationDto,
  CreatePrescriptionMedicationInputDto,
  CreateMedicationScheduleDto,
  ListPrescriptionsQueryDto,
  UpdatePrescriptionMedicationDto,
  UpdatePrescriptionStatusDto,
} from './dto/prescription.dto';
import { PrescriptionFileService, StoredPdf } from './prescription-file.service';

const MEDICATION_INCLUDE = {
  prescription: { select: { id: true, status: true, issuedAt: true, doctorId: true } },
  schedules: { select: { id: true, time: true }, orderBy: { time: 'asc' as const } },
} satisfies Prisma.MedicationInclude;

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientAccess: PatientAccessService,
    private readonly files: PrescriptionFileService,
  ) {}

  // ── Criação ──────────────────────────────────────────────────────────────

  async createForPatient(user: AuthenticatedUser, dto: CreatePrescriptionDto, file?: Express.Multer.File) {
    return this.create(user.id, null, user.id, dto, file);
  }

  async createForDoctor(
    user: AuthenticatedUser,
    patientId: string,
    dto: CreatePrescriptionDto,
    file?: Express.Multer.File,
  ) {
    await this.patientAccess.assertDoctorCanAccess(user.id, user.role as Role, patientId);
    return this.create(patientId, user.id, user.id, dto, file);
  }

  private async create(
    patientId: string,
    doctorId: string | null,
    createdById: string,
    dto: CreatePrescriptionDto,
    file?: Express.Multer.File,
  ) {
    const isDoctor = doctorId !== null;
    let stored: StoredPdf | null;
    try {
      stored = this.files.register(file, dto.fileDisplayName);
    } catch (error) {
      await this.files.removeUpload(file);
      throw error;
    }
    try {
      // Receita, medicamentos e horários entram juntos: evita a receita vazia que o
      // cadastro em dois passos deixava quando um medicamento falhava.
      const prescription = await this.prisma.prescription.create({
        data: {
          patientId,
          doctorId,
          createdById,
          fileStoredName: stored?.storedName ?? null,
          fileDisplayName: stored?.displayName ?? null,
          fileMimeType: stored?.mimeType ?? null,
          fileSize: stored?.size ?? null,
          ...(dto.issuedAt ? { issuedAt: new Date(dto.issuedAt) } : {}),
          medications: {
            create: this.parseMedications(dto.medications).map((medication) => ({
              userId: patientId,
              name: medication.name.trim(),
              dosage: medication.dosage.trim(),
              frequency: medication.frequency.trim(),
              continuousUse: medication.continuousUse ?? false,
              durationDays: medication.durationDays ?? null,
              prescribedById: isDoctor ? doctorId : null,
              schedules: { create: medication.schedules.map((time) => ({ time })) },
            })),
          },
        },
        include: { medications: { include: MEDICATION_INCLUDE, orderBy: { name: 'asc' } } },
      });
      return this.toResponse(prescription, prescription.medications);
    } catch (error) {
      await this.files.removeUpload(file);
      throw error;
    }
  }

  /**
   * `medications` chega como texto JSON no multipart. O parse fica aqui (e não em um
   * `@Transform` no DTO) porque `@Transform` combinado com `@ValidateNested` na mesma
   * propriedade quebra a validação aninhada: os itens perdem os campos no `whitelist`
   * e chegam com `undefined` no serviço.
   */
  private parseMedications(raw: string): CreatePrescriptionMedicationInputDto[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('medications deve ser um array JSON de medicamentos');
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new BadRequestException('a receita precisa de ao menos um medicamento');
    }
    return parsed.map((item, index) => {
      const medication = plainToInstance(CreatePrescriptionMedicationInputDto, item);
      const errors = validateSync(medication, { whitelist: true });
      if (errors.length > 0) {
        const messages = errors.flatMap((error) =>
          Object.values(error.constraints ?? {}).map((message) => `medicamentos[${index}]: ${message}`),
        );
        throw new BadRequestException(messages);
      }
      return medication;
    });
  }

  // ── Listagem ─────────────────────────────────────────────────────────────

  async listMine(userId: string, query: ListPrescriptionsQueryDto) {
    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId: userId, ...(query.status ? { status: query.status } : {}) },
      include: { medications: { include: MEDICATION_INCLUDE, orderBy: { name: 'asc' } } },
      orderBy: { issuedAt: 'desc' },
    });
    return prescriptions.map((p) => this.toResponse(p, p.medications));
  }

  async listForPatient(
    user: AuthenticatedUser,
    patientId: string,
    query: ListPrescriptionsQueryDto,
  ) {
    await this.patientAccess.assertDoctorCanAccess(user.id, user.role as Role, patientId);
    const prescriptions = await this.prisma.prescription.findMany({
      where: { patientId, ...(query.status ? { status: query.status } : {}) },
      include: { medications: { include: MEDICATION_INCLUDE, orderBy: { name: 'asc' } } },
      orderBy: { issuedAt: 'desc' },
    });
    return prescriptions.map((p) => this.toResponse(p, p.medications));
  }

  // ── Detalhe e arquivo ────────────────────────────────────────────────────

  async findOne(user: AuthenticatedUser, id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { medications: { include: MEDICATION_INCLUDE, orderBy: { name: 'asc' } } },
    });
    if (!prescription) throw new NotFoundException('Receita não encontrada');
    await this.assertCanAccessPrescription(user, prescription);
    return this.toResponse(prescription, prescription.medications);
  }

  async file(user: AuthenticatedUser, id: string) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundException('Receita não encontrada');
    await this.assertCanAccessPrescription(user, prescription);
    if (!prescription.fileStoredName || !(await this.files.exists(prescription.fileStoredName))) {
      throw new NotFoundException('Receita sem arquivo');
    }
    return {
      buffer: await this.files.read(prescription.fileStoredName),
      displayName: prescription.fileDisplayName ?? 'receita.pdf',
      mimeType: prescription.fileMimeType ?? 'application/pdf',
    };
  }

  // ── Status e exclusão ────────────────────────────────────────────────────

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdatePrescriptionStatusDto) {
    const prescription = await this.findPrescriptionForOwner(user, id);
    await this.prisma.prescription.update({
      where: { id: prescription.id },
      data: { status: dto.status },
    });
    return this.findOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const prescription = await this.findPrescriptionForOwner(user, id);
    await this.prisma.prescription.delete({ where: { id: prescription.id } });
    await this.files.remove(prescription.fileStoredName);
    return { deleted: prescription.id, fileRemoved: true };
  }

  // ── Medicamentos ─────────────────────────────────────────────────────────

  async addMedication(
    user: AuthenticatedUser,
    prescriptionId: string,
    dto: CreatePrescriptionMedicationDto,
  ) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });
    if (!prescription) throw new NotFoundException('Receita não encontrada');
    await this.assertCanAccessPrescription(user, prescription);
    if (prescription.status !== PrescriptionStatus.ATIVA) {
      throw new BadRequestException('Não é possível adicionar medicamento a uma receita encerrada');
    }

    const isDoctor = user.role === Role.MEDICO || user.role === Role.ADMINISTRADOR;
    const medication = await this.prisma.medication.create({
      data: {
        userId: prescription.patientId,
        prescriptionId: prescription.id,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        continuousUse: dto.continuousUse ?? false,
        durationDays: dto.durationDays ?? null,
        prescribedById: isDoctor ? user.id : null,
      },
      include: MEDICATION_INCLUDE,
    });
    return this.medicationResponse(medication);
  }

  async updateMedication(user: AuthenticatedUser, id: string, dto: UpdatePrescriptionMedicationDto) {
    const medication = await this.findMedication(user, id);
    this.assertCanEditMedication(user, medication);

    const updated = await this.prisma.medication.update({
      where: { id: medication.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.dosage !== undefined ? { dosage: dto.dosage } : {}),
        ...(dto.frequency !== undefined ? { frequency: dto.frequency } : {}),
        ...(dto.continuousUse !== undefined ? { continuousUse: dto.continuousUse } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: dto.durationDays } : {}),
      },
      include: MEDICATION_INCLUDE,
    });
    return this.medicationResponse(updated);
  }

  async removeMedication(user: AuthenticatedUser, id: string) {
    const medication = await this.findMedication(user, id);
    this.assertCanEditMedication(user, medication);
    await this.prisma.medication.delete({ where: { id: medication.id } });
    return { deleted: medication.id, name: medication.name };
  }

  // ── Horários ─────────────────────────────────────────────────────────────

  async addSchedule(user: AuthenticatedUser, medicationId: string, dto: CreateMedicationScheduleDto) {
    const medication = await this.findMedication(user, medicationId);
    this.assertPatientOwnsMedication(user, medication);

    const existing = await this.prisma.medicationSchedule.findUnique({
      where: { medicationId_time: { medicationId, time: dto.time } },
    });
    if (existing) throw new ConflictException('Horário já cadastrado para este medicamento');

    const created = await this.prisma.medicationSchedule.create({
      data: { medicationId, time: dto.time },
    });
    return created;
  }

  async removeSchedule(user: AuthenticatedUser, scheduleId: string) {
    const schedule = await this.prisma.medicationSchedule.findUnique({
      where: { id: scheduleId },
      include: { medication: true },
    });
    if (!schedule) throw new NotFoundException('Horário não encontrado');
    this.assertPatientOwnsMedication(user, schedule.medication);
    await this.prisma.medicationSchedule.delete({ where: { id: schedule.id } });
    return { deleted: schedule.id, time: schedule.time };
  }

  // ── Ativos ───────────────────────────────────────────────────────────────

  async activeForPatient(userId: string) {
    return this.activeQuery({ userId });
  }

  async activeForDoctor(user: AuthenticatedUser, patientId: string) {
    await this.patientAccess.assertDoctorCanAccess(user.id, user.role as Role, patientId);
    return this.activeQuery({ userId: patientId });
  }

  private async activeQuery(where: { userId: string }) {
    const medications = await this.prisma.medication.findMany({
      where: { ...where, continuousUse: true, prescription: { status: PrescriptionStatus.ATIVA } },
      include: MEDICATION_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return medications.map((m) => this.medicationResponse(m));
  }

  // ── Autorização ──────────────────────────────────────────────────────────

  /** Paciente só o próprio; médico exige vínculo; admin passa. 404 para recurso alheio. */
  private async assertCanAccessPrescription(
    user: AuthenticatedUser,
    prescription: { patientId: string; doctorId: string | null },
  ): Promise<void> {
    if (prescription.patientId === user.id) return;
    if (user.role === Role.PACIENTE) throw new NotFoundException('Receita não encontrada');
    await this.patientAccess.assertDoctorCanAccess(user.id, user.role as Role, prescription.patientId);
  }

  /** Status e exclusão: apenas o paciente dono ou o médico emissor. */
  private async findPrescriptionForOwner(
    user: AuthenticatedUser,
    id: string,
  ): Promise<PrescriptionWithRelations> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: { medications: { include: MEDICATION_INCLUDE, orderBy: { name: 'asc' } } },
    });
    if (!prescription) throw new NotFoundException('Receita não encontrada');
    if (prescription.patientId !== user.id) {
      if (user.role === Role.PACIENTE) throw new NotFoundException('Receita não encontrada');
      if (prescription.doctorId !== user.id && user.role !== Role.ADMINISTRADOR) {
        throw new ForbiddenException('Somente o paciente dono ou o médico emissor pode alterar a receita');
      }
    }
    return prescription;
  }

  private async findMedication(user: AuthenticatedUser, id: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id },
      include: { prescription: true },
    });
    if (!medication) throw new NotFoundException('Medicamento não encontrado');
    await this.assertCanAccessPrescription(user, medication.prescription);
    return medication;
  }

  /** Item prescrito pelo médico é imutável pelo paciente; item próprio é livre. */
  private assertCanEditMedication(
    user: AuthenticatedUser,
    medication: { prescribedById: string | null },
  ): void {
    if (medication.prescribedById && user.role === Role.PACIENTE) {
      throw new ForbiddenException(
        'Medicamento prescrito pelo médico: o paciente pode alterar apenas os horários',
      );
    }
  }

  private assertPatientOwnsMedication(
    user: AuthenticatedUser,
    medication: { userId: string },
  ): void {
    if (medication.userId !== user.id) {
      throw new ForbiddenException('Somente o paciente dono do medicamento pode editar os horários');
    }
  }

  // ── Projeção de resposta ─────────────────────────────────────────────────

  /** `fileStoredName` e o caminho interno nunca saem daqui. */
  private toResponse(prescription: Prescription, medications: MedicationWithRelations[] = []) {
    return {
      id: prescription.id,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      issuedAt: prescription.issuedAt,
      status: prescription.status,
      hasFile: Boolean(prescription.fileStoredName),
      fileDisplayName: prescription.fileDisplayName,
      fileMimeType: prescription.fileMimeType,
      fileSize: prescription.fileSize,
      createdAt: prescription.createdAt,
      updatedAt: prescription.updatedAt,
      medications: medications.map((m) => this.medicationResponse(m)),
    };
  }

  private medicationResponse(medication: MedicationWithRelations) {
    return {
      id: medication.id,
      prescriptionId: medication.prescriptionId,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      continuousUse: medication.continuousUse,
      durationDays: medication.durationDays,
      prescribedById: medication.prescribedById,
      prescriptionStatus: medication.prescription?.status ?? null,
      schedules: (medication.schedules ?? [])
        .map((s) => ({ id: s.id, time: s.time }))
        .sort((a, b) => a.time.localeCompare(b.time)),
    };
  }
}

type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: { medications: { include: typeof MEDICATION_INCLUDE } };
}>;

type MedicationWithRelations = Prisma.MedicationGetPayload<{
  include: typeof MEDICATION_INCLUDE;
}>;
