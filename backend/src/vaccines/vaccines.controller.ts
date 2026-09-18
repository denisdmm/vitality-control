import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVaccineDto, UpdateVaccineDto } from './dto/vaccine.dto';

@ApiTags('vaccines')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('vaccines')
export class VaccinesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista vacinas do usuário' })
  list(@CurrentUser('id') userId: string) {
    return this.prisma.vaccine.findMany({
      where: { userId },
      orderBy: { vaccinationDate: 'desc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Adiciona vacina' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateVaccineDto) {
    return this.prisma.vaccine.create({
      data: {
        userId,
        vaccineName: dto.vaccineName,
        vaccinationDate: new Date(dto.vaccinationDate),
        seriesSchedule: dto.seriesSchedule,
        intervalBetweenDoses: dto.intervalBetweenDoses,
        intervalBetweenBoosterDoses: dto.intervalBetweenBoosterDoses,
      },
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza vacina' })
  async update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateVaccineDto) {
    await this.owned(userId, id);
    return this.prisma.vaccine.update({
      where: { id },
      data: {
        vaccineName: dto.vaccineName,
        vaccinationDate: dto.vaccinationDate ? new Date(dto.vaccinationDate) : undefined,
        seriesSchedule: dto.seriesSchedule,
        intervalBetweenDoses: dto.intervalBetweenDoses,
        intervalBetweenBoosterDoses: dto.intervalBetweenBoosterDoses,
      },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove vacina' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.owned(userId, id);
    const { vaccineName } = await this.prisma.vaccine.delete({ where: { id } });
    return { deleted: id, vaccineName };
  }

  private async owned(userId: string, id: string) {
    const found = await this.prisma.vaccine.findUnique({ where: { id } });
    if (!found || found.userId !== userId) throw new NotFoundException('Vacina não encontrada');
  }
}