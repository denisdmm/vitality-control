import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { VitalsService } from './vitals.service';
import {
  BloodPressureUpdateDto,
  DateRangeDto,
  GlucoseUpdateDto,
  VitalsDailyDto,
  WeightUpdateDto,
} from './dto/vitals.dto';

@ApiTags('vitals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('vitals')
export class VitalsController {
  constructor(private readonly vitals: VitalsService) {}

  @Get()
  @ApiOperation({ summary: 'Biometria do usuário (range opcional from/to)' })
  list(@CurrentUser('id') userId: string, @Query() range: DateRangeDto) {
    return this.vitals.list(userId, range);
  }

  @Get('patients')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Pacientes vinculados ao médico (para seleção na tela)' })
  patients(@CurrentUser('id') medicoId: string) {
    return this.vitals.patientsOfMedico(medicoId);
  }

  @Get('pressure/:patientId')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Pressão arterial de um paciente (médico vinculado ou admin)' })
  pressureOf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.vitals.pressureForPatient(user.id, user.role as Role, patientId);
  }

  @Get(':date')
  @ApiOperation({ summary: 'Biometria de um dia específico' })
  day(@CurrentUser('id') userId: string, @Param('date') date: string) {
    return this.vitals.day(userId, date);
  }

  @Put('daily')
  @ApiOperation({ summary: 'Registra Sinais Vitais (PA + glicemia + peso) do dia' })
  saveDaily(@CurrentUser('id') userId: string, @Body() dto: VitalsDailyDto) {
    return this.vitals.saveDaily(userId, dto);
  }

  @Put('blood-pressure/:date')
  @ApiOperation({ summary: 'Grava périodos de pressão arterial do dia' })
  bloodPressure(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
    @Body() dto: BloodPressureUpdateDto,
  ) {
    return this.vitals.setBloodPressure(userId, date, dto);
  }

  @Put('glucose/:date')
  @ApiOperation({ summary: 'Grava períodos de glicemia do dia' })
  glucose(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
    @Body() dto: GlucoseUpdateDto,
  ) {
    return this.vitals.setGlucose(userId, date, dto);
  }

  @Put('weight/:date')
  @ApiOperation({ summary: 'Grava peso do dia' })
  weight(
    @CurrentUser('id') userId: string,
    @Param('date') date: string,
    @Body() dto: WeightUpdateDto,
  ) {
    return this.vitals.setWeight(userId, date, dto);
  }

  @Delete(':date')
  @ApiOperation({ summary: 'Remove biometria do dia' })
  remove(@CurrentUser('id') userId: string, @Param('date') date: string) {
    return this.vitals.remove(userId, date);
  }
}