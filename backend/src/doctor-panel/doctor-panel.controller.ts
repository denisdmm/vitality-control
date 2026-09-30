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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateClinicalNoteDto, UpdateClinicalNoteDto } from './dto/clinical-note.dto';
import {
  ListAuditEventsQueryDto,
  ListDoctorPatientsQueryDto,
  PatientSummaryQueryDto,
} from './dto/doctor-panel.dto';
import { DoctorPanelService } from './doctor-panel.service';

@ApiTags('doctor-panel')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.MEDICO, Role.ADMINISTRADOR)
@Controller('doctor')
export class DoctorPanelController {
  constructor(private readonly service: DoctorPanelService) {}

  @Get('patients')
  @ApiOperation({
    summary: 'Lista pacientes do médico (ou todos, com scope=all) com última consulta e sinais',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDoctorPatientsQueryDto,
  ) {
    return this.service.listPatients(user, query);
  }

  // Leitura liberado para o PACIENTE porque ele abre a própria ficha; quem é
  // dono dos dados e quem não é é decidido em `assertCanReadChart`.
  @Get('patients/:patientId/summary')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR, Role.PACIENTE)
  @ApiOperation({
    summary:
      'Ficha resumida do paciente: biometria do período (90 dias por padrão, `from`/`to` para outro intervalo), medicamentos, receitas, exames e anotações',
  })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query() query: PatientSummaryQueryDto,
  ) {
    return this.service.summary(user, patientId, query);
  }

  @Post('patients/:patientId/links')
  @ApiOperation({ summary: 'Vincula o paciente aos meus pacientes (idempotente)' })
  link(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.linkPatient(user, patientId);
  }

  @Post('patients/:patientId/transfer')
  @ApiOperation({
    summary: 'Assume o paciente, removendo os vínculos de outros médicos e preservando os de administrador',
  })
  transfer(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.transferPatient(user, patientId);
  }

  @Get('patients/:patientId/notes')
  @Roles(Role.MEDICO, Role.ADMINISTRADOR, Role.PACIENTE)
  @ApiOperation({ summary: 'Anotações clínicas do paciente, da mais recente para a mais antiga' })
  listNotes(@CurrentUser() user: AuthenticatedUser, @Param('patientId') patientId: string) {
    return this.service.listNotes(user, patientId);
  }

  @Post('patients/:patientId/notes')
  @ApiOperation({ summary: 'Registra anotação clínica no prontuário do paciente' })
  createNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Body() dto: CreateClinicalNoteDto,
  ) {
    return this.service.createNote(user, patientId, dto);
  }

  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'Edita anotação clínica (apenas o autor)' })
  updateNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateClinicalNoteDto,
  ) {
    return this.service.updateNote(user, noteId, dto);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Apaga anotação clínica (autor ou administrador)' })
  deleteNote(@CurrentUser() user: AuthenticatedUser, @Param('noteId', ParseUUIDPipe) noteId: string) {
    return this.service.deleteNote(user, noteId);
  }
}

@ApiTags('doctor-panel')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMINISTRADOR, Role.PACIENTE)
@Controller('doctor/audit-events')
export class DoctorAuditController {
  constructor(private readonly service: DoctorPanelService) {}

  @Get()
  @ApiOperation({ summary: 'Trilha de auditoria do paciente (admin ou o próprio paciente)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditEventsQueryDto) {
    return this.service.auditEvents(user, query);
  }
}
