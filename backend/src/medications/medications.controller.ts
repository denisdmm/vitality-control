import { Controller, Get, Post, Patch, Delete, Body, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateMedicationDto, UpdateMedicationDto } from './dto/medication.dto';

@ApiTags('medications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista medicamentos do usuário' })
  list(@CurrentUser('id') userId: string) {
    return this.prisma.medication.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Adiciona medicamento' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMedicationDto) {
    return this.prisma.medication.create({
      data: { userId, name: dto.name, dosage: dto.dosage, frequency: dto.frequency },
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza medicamento' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    await this.owned(userId, id);
    return this.prisma.medication.update({
      where: { id },
      data: { name: dto.name, dosage: dto.dosage, frequency: dto.frequency },
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove medicamento' })
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.owned(userId, id);
    const { name } = await this.prisma.medication.delete({ where: { id } });
    return { deleted: id, name };
  }

  private async owned(userId: string, id: string) {
    const found = await this.prisma.medication.findUnique({ where: { id } });
    if (!found || found.userId !== userId) throw new NotFoundException('Medicamento não encontrado');
  }
}