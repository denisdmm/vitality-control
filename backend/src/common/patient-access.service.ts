import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientAuditAction, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PatientAccessSummary = Pick<
  User,
  'id' | 'name' | 'fullName' | 'medicalRecordNumber' | 'photoUrl'
>;

/**
 * Acesso de médico a paciente via PatientDoctor, liberando ADMINISTRADOR.
 * Extraído de VitalsService.pressureForPatient porque o receituário precisa da
 * mesma regra em outro módulo.
 */
@Injectable()
export class PatientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDoctorCanAccess(
    requesterId: string,
    requesterRole: Role,
    patientId: string,
  ): Promise<PatientAccessSummary> {
    const patient = await this.assertPatientExists(patientId);

    if (requesterRole !== Role.ADMINISTRADOR) {
      const link = await this.prisma.patientDoctor.findUnique({
        where: { patientId_doctorId: { patientId, doctorId: requesterId } },
      });
      if (!link) throw new ForbiddenException('Paciente não vinculado a este médico');
    }

    return this.toSummary(patient);
  }

  /**
   * Leitura da ficha: qualquer MEDICO abre qualquer paciente, ADMINISTRADOR
   * também, e o PACIENTE apenas a si mesmo. Escrita continua exigindo vínculo
   * em `assertDoctorCanAccess` — este método não substitui aquele.
   *
   * Toda abertura por terceiro fica registrada em `patient_audit_events`
   * (CHART_VIEWED); o próprio paciente acessando os dados dele não gera evento.
   */
  async assertCanReadChart(
    requesterId: string,
    requesterRole: Role,
    patientId: string,
    options: { record?: boolean } = {},
  ): Promise<PatientAccessSummary> {
    if (requesterRole === Role.PACIENTE && requesterId !== patientId) {
      throw new ForbiddenException('Acesso ao prontuário de outro paciente não permitido');
    }
    const patient = await this.assertPatientExists(patientId);
    // `record: false` para leituras parciais (ex.: lista de anotações) que fazem parte
    // da ficha já registrada, evitando um evento por trecho da tela.
    if (options.record !== false) {
      await this.recordChartView(requesterId, requesterRole, patientId);
    }
    return this.toSummary(patient);
  }

  /** O alvo precisa ser um paciente de verdade, não apenas um usuário vinculado. */
  private async assertPatientExists(patientId: string) {
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');
    if (patient.role !== Role.PACIENTE) throw new NotFoundException('Paciente não encontrado');
    return patient;
  }

  private async recordChartView(requesterId: string, requesterRole: Role, patientId: string) {
    if (requesterRole === Role.PACIENTE) return;
    await this.prisma.patientAuditEvent.create({
      data: { patientId, actorId: requesterId, action: PatientAuditAction.CHART_VIEWED },
    });
  }

  private toSummary(patient: {
    id: string;
    name: string;
    fullName: string;
    medicalRecordNumber: string | null;
    photoUrl: string | null;
  }): PatientAccessSummary {
    return {
      id: patient.id,
      name: patient.name,
      fullName: patient.fullName,
      medicalRecordNumber: patient.medicalRecordNumber,
      photoUrl: patient.photoUrl,
    };
  }
}
