import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const PUBLIC_SELECT = {
  id: true,
  name: true,
  fullName: true,
  socialName: true,
  email: true,
  medicalRecordNumber: true,
  crm: true,
  photoUrl: true,
  role: true,
  height: true,
  inactivityTimeout: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...PUBLIC_SELECT,
        patientLinks: { include: { doctor: { select: PUBLIC_SELECT } } },
        doctorLinks: { include: { patient: { select: PUBLIC_SELECT } } },
      },
    });
    return this.withLinks(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const data: Prisma.UserUpdateInput = {
      fullName: dto.fullName,
      socialName: dto.socialName,
      email: dto.email,
      photoUrl: dto.photoUrl,
      height: dto.height,
      inactivityTimeout: dto.inactivityTimeout,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
    };
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: PUBLIC_SELECT,
    });
  }

  // ---- ADMIN ----

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        ...PUBLIC_SELECT,
        patientLinks: { include: { doctor: { select: PUBLIC_SELECT } } },
        doctorLinks: { include: { patient: { select: PUBLIC_SELECT } } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map((u) => this.withLinks(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_SELECT,
        patientLinks: { include: { doctor: { select: PUBLIC_SELECT } } },
        doctorLinks: { include: { patient: { select: PUBLIC_SELECT } } },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.withLinks(user);
  }

  async create(dto: CreateUserDto) {
    await this.assertUnique(dto.name, dto.crm);
    const doctorIds = dto.role === Role.PACIENTE && dto.doctorIds?.length ? dto.doctorIds : [];
    if (doctorIds.length) await this.assertDoctorsExist(doctorIds);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, 10),
        fullName: dto.fullName,
        socialName: dto.socialName,
        email: dto.email,
        medicalRecordNumber: dto.medicalRecordNumber,
        crm: dto.crm,
        photoUrl: dto.photoUrl,
        role: dto.role ?? Role.PACIENTE,
        height: dto.height,
        inactivityTimeout: dto.inactivityTimeout,
        patientLinks:
          doctorIds.length
            ? { create: doctorIds.map((doctorId) => ({ doctor: { connect: { id: doctorId } } })) }
            : undefined,
      },
      select: PUBLIC_SELECT,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuário não encontrado');
    await this.assertUnique(dto.name, dto.crm, id);

    const doctorIds = dto.doctorIds;

    const data: Prisma.UserUpdateInput = {
      name: dto.name,
      fullName: dto.fullName,
      socialName: dto.socialName,
      email: dto.email,
      medicalRecordNumber: dto.medicalRecordNumber,
      crm: dto.crm,
      photoUrl: dto.photoUrl,
      role: dto.role,
      height: dto.height,
      inactivityTimeout: dto.inactivityTimeout,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
      updatedAt: new Date(),
    };

    if (doctorIds && !dto.keepDoctorIdsIntact) {
      await this.assertDoctorsExist(doctorIds);
      const newRole = dto.role ?? existing.role;
      data.patientLinks =
        newRole === Role.PACIENTE
          ? {
              deleteMany: {},
              create: doctorIds.map((doctorId) => ({ doctor: { connect: { id: doctorId } } })),
            }
          : { deleteMany: {} };
    }

    return this.prisma.user.update({ where: { id }, data, select: PUBLIC_SELECT });
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Usuário não encontrado');
    const { name } = existing;
    await this.prisma.user.delete({ where: { id } });
    return { deleted: id, name };
  }

  // ── helpers ──────────────────────────────────────────────

  private withLinks(u: any) {
    const doctors =
      u.role === Role.PACIENTE
        ? (u.patientLinks || []).map((l: any) => l.doctor)
        : [];
    const patients =
      u.role === Role.MEDICO
        ? (u.doctorLinks || []).map((l: any) => l.patient)
        : [];
    const { patientLinks, doctorLinks, ...rest } = u;
    return { ...rest, doctors, patients };
  }

  private async assertUnique(name?: string, crm?: string, ignoreId?: string) {
    if (name) {
      const dup = await this.prisma.user.findFirst({ where: { name, NOT: { id: ignoreId ?? '' } } });
      if (dup) throw new BadRequestException('Nome de usuário já está em uso');
    }
    if (crm) {
      const dup = await this.prisma.user.findFirst({ where: { crm, NOT: { id: ignoreId ?? '' } } });
      if (dup) throw new BadRequestException('CRM já está em uso');
    }
  }

  private async assertDoctorsExist(doctorIds: string[]) {
    const count = await this.prisma.user.count({
      where: { id: { in: doctorIds }, role: Role.MEDICO },
    });
    if (count !== doctorIds.length) {
      throw new BadRequestException('Um ou mais médicos vinculados não existem');
    }
  }
}