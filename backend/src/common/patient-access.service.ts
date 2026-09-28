import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
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
    const patient = await this.prisma.user.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente não encontrado');

    if (requesterRole !== Role.ADMINISTRADOR) {
      const link = await this.prisma.patientDoctor.findUnique({
        where: { patientId_doctorId: { patientId, doctorId: requesterId } },
      });
      if (!link) throw new ForbiddenException('Paciente não vinculado a este médico');
    }

    return {
      id: patient.id,
      name: patient.name,
      fullName: patient.fullName,
      medicalRecordNumber: patient.medicalRecordNumber,
      photoUrl: patient.photoUrl,
    };
  }
}
