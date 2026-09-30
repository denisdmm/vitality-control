import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SUMMARY_WINDOW_DAYS = 90;
export const SUMMARY_MAX_WINDOW_DAYS = 365;

export class ListDoctorPatientsQueryDto {
  @ApiPropertyOptional({
    enum: ['mine', 'all'],
    default: 'mine',
    description: '`mine` traz os vinculados ao médico; `all` traz todos os pacientes',
  })
  @IsOptional()
  @IsIn(['mine', 'all'])
  scope?: 'mine' | 'all';

  @ApiPropertyOptional({ description: 'Filtra por nome ou número de prontuário' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Lista apenas pacientes com acompanhamento pendente' })
  @IsOptional()
  @IsBooleanString()
  pendingOnly?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Período da biometria na ficha. Ausente nos dois => janela padrão de 90 dias. */
export class PatientSummaryQueryDto {
  @ApiPropertyOptional({
    description: 'Início do período (yyyy-MM-dd). Padrão: `to` menos a janela padrão',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'from deve ser uma data no formato yyyy-MM-dd' })
  from?: string;

  @ApiPropertyOptional({ description: 'Fim do período (yyyy-MM-dd). Padrão: hoje', example: '2026-09-29' })
  @IsOptional()
  @IsDateString({}, { message: 'to deve ser uma data no formato yyyy-MM-dd' })
  to?: string;
}

export class ListAuditEventsQueryDto {
  @ApiPropertyOptional({ description: 'Paciente cuja trilha será consultada' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
