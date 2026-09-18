import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { HealthRecordsService } from './health-records.service';
import {
  CreateHealthRecordDto,
  CreateSubItemDto,
  UpdateHealthRecordDto,
  UpdateSubItemDto,
} from './dto/health-record.dto';

@ApiTags('health-records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly records: HealthRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista exames do usuário (admin: todos)' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.records.list(user.id, user.role as Role);
  }

  @Post()
  @ApiOperation({ summary: 'Cria exame' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHealthRecordDto) {
    return this.records.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do exame com sub-itens' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.records.findOne(user.id, user.role as Role, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza exame (status, datas, resultado...)' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateHealthRecordDto,
  ) {
    return this.records.update(user.id, user.role as Role, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove exame' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.records.remove(user.id, user.role as Role, id);
  }

  @Post(':id/sub-items')
  @ApiOperation({ summary: 'Adiciona componente (sub-item) ao exame' })
  addSubItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateSubItemDto,
  ) {
    return this.records.addSubItem(user.id, user.role as Role, id, dto);
  }

  @Patch(':id/sub-items/:subId')
  @ApiOperation({ summary: 'Atualiza componente do exame' })
  updateSubItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('subId') subId: string,
    @Body() dto: UpdateSubItemDto,
  ) {
    return this.records.updateSubItem(user.id, user.role as Role, id, subId, dto);
  }

  @Delete(':id/sub-items/:subId')
  @ApiOperation({ summary: 'Remove componente do exame' })
  removeSubItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('subId') subId: string,
  ) {
    return this.records.removeSubItem(user.id, user.role as Role, id, subId);
  }
}