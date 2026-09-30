import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  MAX_PDF_BYTES,
  pdfFileFilter,
  recipesDiskStorage,
} from './prescription-file.service';
import { CleanUploadOnErrorInterceptor } from './clean-upload-on-error.interceptor';
import { PrescriptionsService } from './prescriptions.service';
import {
  CreateMedicationScheduleDto,
  CreatePrescriptionDto,
  CreatePrescriptionMedicationDto,
  ListPrescriptionsQueryDto,
  UpdatePrescriptionMedicationDto,
  UpdatePrescriptionStatusDto,
} from './dto/prescription.dto';

// O monorepo tem duas copias de @types/express (5 na raiz, 4 no backend), o que
// torna `Request` estruturalmente incompativel entre multer e o FileInterceptor
// do Nest. O objeto e valido em runtime; o cast fica isolado aqui.
const PDF_UPLOAD = {
  storage: recipesDiskStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: pdfFileFilter,
} as unknown as MulterOptions;

@ApiTags('prescriptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', PDF_UPLOAD), CleanUploadOnErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreatePrescriptionDto,
    description:
      'Multipart com `medications` em JSON e, opcionalmente, `file` (PDF). Registra a receita e ' +
      'seus medicamentos em uma única transação.',
  })
  @ApiOperation({ summary: 'Registra receita do próprio paciente com medicamentos (PDF opcional)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrescriptionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.createForPatient(user, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as receitas do paciente, da mais recente para a mais antiga' })
  list(@CurrentUser('id') userId: string, @Query() query: ListPrescriptionsQueryDto) {
    return this.service.listMine(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da receita com medicamentos e horários' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Get(':id/file')
  @ApiOperation({ summary: 'Download do PDF da receita (paciente dono ou médico vinculado)' })
  @ApiResponse({ status: 200, description: 'PDF da receita', content: { 'application/pdf': {} } })
  async file(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, displayName, mimeType } = await this.service.file(user, id);
    const safeName = displayName ?? 'receita.pdf';
    const ascii = safeName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    );
    res.send(buffer);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Encerra ou reabre a receita (paciente dono ou médico emissor)' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a receita e o PDF em disco (paciente dono ou médico emissor)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/medications')
  @ApiOperation({ summary: 'Cadastra medicamento na receita' })
  addMedication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePrescriptionMedicationDto,
  ) {
    return this.service.addMedication(user, id, dto);
  }
}

@ApiTags('medications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('medications')
export class PrescriptionMedicationsController {
  constructor(private readonly service: PrescriptionsService) {}

  // Declarado antes de qualquer rota com ':id' para não ser capturado pelo parâmetro.
  @Get('active')
  @ApiOperation({ summary: 'Medicamentos em uso: receita ativa + uso contínuo' })
  active(@CurrentUser('id') userId: string) {
    return this.service.activeForPatient(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza medicamento (item prescrito é imutável para o paciente)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionMedicationDto,
  ) {
    return this.service.updateMedication(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove medicamento (item prescrito é imutável para o paciente)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeMedication(user, id);
  }

  @Post(':id/schedules')
  @ApiOperation({ summary: 'Adiciona horário de tomada (HH:mm) — paciente dono do medicamento' })
  addSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMedicationScheduleDto,
  ) {
    return this.service.addSchedule(user, id, dto);
  }
}

@ApiTags('medication-schedules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('medication-schedules')
export class MedicationSchedulesController {
  constructor(private readonly service: PrescriptionsService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Remove horário de tomada — paciente dono do medicamento' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.removeSchedule(user, id);
  }
}

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('patients')
export class PatientPrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post(':patientId/prescriptions')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('file', PDF_UPLOAD), CleanUploadOnErrorInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: CreatePrescriptionDto,
    description:
      'Multipart com `medications` em JSON e, opcionalmente, `file` (PDF). Os itens ficam marcados ' +
      'como prescritos por este médico.',
  })
  @ApiOperation({ summary: 'Médico registra receita para paciente vinculado (PDF opcional)' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.createForDoctor(user, patientId, dto, file);
  }

  @Get(':patientId/prescriptions')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Receitas de um paciente vinculado' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query() query: ListPrescriptionsQueryDto,
  ) {
    return this.service.listForPatient(user, patientId, query);
  }

  @Get(':patientId/medications/active')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR)
  @ApiOperation({ summary: 'Medicamentos ativos de um paciente (mesma lista do dashboard dele)' })
  active(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.activeForDoctor(user, patientId);
  }
}
