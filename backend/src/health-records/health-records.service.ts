import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHealthRecordDto,
  CreateSubItemDto,
  UpdateHealthRecordDto,
  UpdateSubItemDto,
} from './dto/health-record.dto';

@Injectable()
export class HealthRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(userId: string, role: Role, recordId: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: recordId },
      select: { id: true, userId: true },
    });
    if (!record) throw new NotFoundException('Exame não encontrado');
    if (record.userId !== userId && role !== Role.ADMINISTRADOR) {
      throw new ForbiddenException('Exame não pertence ao usuário atual');
    }
    return record.id;
  }

  async list(userId: string, role: Role) {
    const where: Prisma.HealthRecordWhereInput =
      role === Role.ADMINISTRADOR ? {} : { userId };
    return this.prisma.healthRecord.findMany({
      where,
      include: { subItems: { orderBy: { id: 'asc' } } },
      orderBy: { requestDate: 'desc' },
    });
  }

  async findOne(userId: string, role: Role, id: string) {
    const ownedId = await this.assertOwner(userId, role, id);
    return this.prisma.healthRecord.findUniqueOrThrow({
      where: { id: ownedId },
      include: { subItems: { orderBy: { id: 'asc' } } },
    });
  }

  async create(userId: string, dto: CreateHealthRecordDto) {
    return this.prisma.healthRecord.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type ?? '',
        requestDate: dto.requestDate ? new Date(dto.requestDate) : new Date(),
        examDate: dto.examDate ? new Date(dto.examDate) : null,
        result: dto.result,
        status: dto.status ?? 'SOLICITADO',
        requestingDoctorName: dto.requestingDoctorName,
        requestingDoctorCrm: dto.requestingDoctorCrm,
      },
      include: { subItems: true },
    });
  }

  async update(userId: string, role: Role, id: string, dto: UpdateHealthRecordDto) {
    const ownedId = await this.assertOwner(userId, role, id);
    return this.prisma.healthRecord.update({
      where: { id: ownedId },
      data: {
        name: dto.name,
        type: dto.type,
        requestDate: dto.requestDate ? new Date(dto.requestDate) : undefined,
        examDate: dto.examDate !== undefined ? (dto.examDate ? new Date(dto.examDate) : null) : undefined,
        result: dto.result,
        status: dto.status,
        requestingDoctorName: dto.requestingDoctorName,
        requestingDoctorCrm: dto.requestingDoctorCrm,
      },
      include: { subItems: true },
    });
  }

  async remove(userId: string, role: Role, id: string) {
    const ownedId = await this.assertOwner(userId, role, id);
    const { name } = await this.prisma.healthRecord.delete({ where: { id: ownedId } });
    return { deleted: ownedId, name };
  }

  // ── sub-itens ─────────────────────────────────────────────

  async addSubItem(userId: string, role: Role, recordId: string, dto: CreateSubItemDto) {
    const ownedId = await this.assertOwner(userId, role, recordId);
    return this.prisma.subItem.create({
      data: { recordId: ownedId, name: dto.name, result: dto.result, reference: dto.reference },
    });
  }

  async updateSubItem(userId: string, role: Role, recordId: string, subId: string, dto: UpdateSubItemDto) {
    const ownedId = await this.assertOwner(userId, role, recordId);
    const found = await this.prisma.subItem.findUnique({ where: { id: subId } });
    if (!found || found.recordId !== ownedId) throw new NotFoundException('Subitem não encontrado');
    return this.prisma.subItem.update({
      where: { id: subId },
      data: { name: dto.name, result: dto.result, reference: dto.reference },
    });
  }

  async removeSubItem(userId: string, role: Role, recordId: string, subId: string) {
    const ownedId = await this.assertOwner(userId, role, recordId);
    const found = await this.prisma.subItem.findUnique({ where: { id: subId } });
    if (!found || found.recordId !== ownedId) throw new NotFoundException('Subitem não encontrado');
    await this.prisma.subItem.delete({ where: { id: subId } });
    return { deleted: subId };
  }
}