import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Prisma, Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DateRangeDto } from '../vitals/dto/vitals.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('consolidated')
  @ApiOperation({ summary: 'Relatório consolidado (pressão + glicemia + peso) por período' })
  @ApiQuery({ name: 'from', required: false, example: '2025-08-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-09-30' })
  async consolidated(@CurrentUser() user: AuthenticatedUser, @Query() range: DateRangeDto) {
    const where: Prisma.VitalScoreWhereInput = { userId: user.id };
    if (range.from || range.to) {
      where.date = {};
      if (range.from) Object.assign(where.date, { gte: this.day(range.from) });
      if (range.to) Object.assign(where.date, { lte: this.day(range.to) });
    }
    const [vitals, indices, profile] = await Promise.all([
      this.prisma.vitalScore.findMany({ where, orderBy: { date: 'asc' } }),
      this.prisma.sharedData.findUnique({ where: { id: 1 } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    ]);

    return {
      userId: user.id,
      from: range.from ?? null,
      to: range.to ?? null,
      profile: {
        fullName: profile.fullName,
        height: profile.height,
        medicalRecordNumber: profile.medicalRecordNumber,
      },
      indices,
      vitals,
      summary: this.summarize(vitals),
    };
  }

  @Get('pressure')
  @ApiOperation({ summary: 'Relatório de pressão arterial por período' })
  async pressure(@CurrentUser('id') userId: string, @Query() range: DateRangeDto) {
    const where: Prisma.VitalScoreWhereInput = { userId };
    if (range.from || range.to) {
      where.date = {};
      if (range.from) Object.assign(where.date, { gte: this.day(range.from) });
      if (range.to) Object.assign(where.date, { lte: this.day(range.to) });
    }
    const all = await this.prisma.vitalScore.findMany({ where, orderBy: { date: 'asc' } });
    const vitals = all.filter((v) => v.bloodPressurePeriods && Object.keys(v.bloodPressurePeriods as any).length > 0);
    return { userId, vitals, summary: this.summarize(vitals) };
  }

  private day(s: string) {
    return new Date(`${s}T00:00:00.000Z`);
  }

  private summarize(vitals: any[]) {
    const vals: Record<string, number[]> = { systolic: [], diastolic: [], pulse: [], glucose: [], weight: [] };
    for (const v of vitals) {
      if (v.bloodPressurePeriods) {
        const periods = v.bloodPressurePeriods as Record<string, any>;
        for (const p of Object.values(periods)) {
          if (!p) continue;
          if (typeof p.systolic === 'number') vals.systolic.push(p.systolic);
          if (typeof p.diastolic === 'number') vals.diastolic.push(p.diastolic);
          if (typeof p.pulse === 'number') vals.pulse.push(p.pulse);
        }
      }
      if (v.glucosePeriods) {
        const periods = v.glucosePeriods as Record<string, any>;
        for (const p of Object.values(periods)) {
          if (p && typeof p.value === 'number') vals.glucose.push(p.value);
        }
      }
      if (typeof v.weight === 'number') vals.weight.push(v.weight);
    }
    const stat = (arr: number[]) => {
      if (!arr.length) return { count: 0, min: null, max: null, avg: null };
      const sum = arr.reduce((a, b) => a + b, 0);
      return {
        count: arr.length,
        min: Math.min(...arr),
        max: Math.max(...arr),
        avg: Math.round((sum / arr.length) * 10) / 10,
      };
    };
    return {
      systolic: stat(vals.systolic),
      diastolic: stat(vals.diastolic),
      pulse: stat(vals.pulse),
      glucose: stat(vals.glucose),
      weight: stat(vals.weight),
    };
  }
}