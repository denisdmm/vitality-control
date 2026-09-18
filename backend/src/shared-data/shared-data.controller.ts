import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSharedDataDto } from './dto/shared-data.dto';

@ApiTags('shared-data')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('shared-data')
export class SharedDataController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Índices de saúde (thresholds usados nos alertas)' })
  async get() {
    const row = await this.prisma.sharedData.findUnique({ where: { id: 1 } });
    if (!row) {
      return {
        bpSystolic: null,
        bpDiastolic: null,
        bpSystolicIdeal: null,
        bpDiastolicIdeal: null,
        bpSystolicLimit: null,
        bpDiastolicLimit: null,
        glucosePreLimit: null,
        glucoseDiabetesLimit: null,
      };
    }
    return row;
  }

  @Put()
  @Roles(Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Atualiza índices de saúde (admin)' })
  async update(@Body() dto: UpdateSharedDataDto) {
    return this.prisma.sharedData.upsert({
      where: { id: 1 },
      update: {
        bpSystolicIdeal: dto.bpSystolicIdeal,
        bpDiastolicIdeal: dto.bpDiastolicIdeal,
        bpSystolicLimit: dto.bpSystolicLimit,
        bpDiastolicLimit: dto.bpDiastolicLimit,
        glucosePreLimit: dto.glucosePreLimit,
        glucoseDiabetesLimit: dto.glucoseDiabetesLimit,
      },
      create: { id: 1, ...dto },
    });
  }
}