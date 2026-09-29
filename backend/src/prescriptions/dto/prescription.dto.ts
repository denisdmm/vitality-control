import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_DURATION_DAYS = 3650;

export class CreatePrescriptionMedicationInputDto {
  @ApiProperty({ example: 'Maleato de enalapril' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '10mg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  dosage: string;

  @ApiProperty({ example: '2x ao dia ( 10h/ 22h )' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  frequency: string;

  @ApiPropertyOptional({ example: ['08:00', '20:00'], description: 'Horários no formato HH:mm, sem repetição' })
  @IsArray({ message: 'medications deve ser um array JSON de medicamentos' })
  @ArrayMinSize(1, { message: 'informe ao menos um horário por medicamento' })
  @ArrayUnique({ message: 'há horário repetido no mesmo medicamento' })
  @IsString({ each: true })
  @Matches(TIME_PATTERN, { each: true, message: 'cada horário deve estar no formato HH:mm' })
  schedules: string[];

  @ApiPropertyOptional({ example: 30, description: 'Duração em dias; ausente = sem prazo definido' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'durationDays deve ser um número inteiro de dias' })
  @Min(1, { message: 'durationDays deve ser maior que zero' })
  @Max(MAX_DURATION_DAYS, { message: `durationDays deve ser no máximo ${MAX_DURATION_DAYS} dias` })
  durationDays?: number;

  @ApiPropertyOptional({ default: false, description: 'Uso contínuo — define se o medicamento entra no dashboard' })
  @IsOptional()
  @IsBoolean()
  continuousUse?: boolean;
}

/** Campos de texto do POST multipart; o PDF opcional vai no campo `file`. */
export class CreatePrescriptionDto {
  /**
   * O array de medicamentos chega no multipart como texto JSON: a notação de colchetes
   * (`medications[0][name]`) não é interpretada pelo multer e seria descartada pelo
   * `ValidationPipe` com `whitelist`. O parse e a validação de cada item ficam no
   * serviço (`PrescriptionsService.parseMedications`) porque `@Transform` na mesma
   * propriedade que `@ValidateNested` quebra a validação aninhada e ainda apaga os
   * campos do item no `whitelist`.
   */
  @ApiProperty({
    type: 'string',
    example:
      '[{"name":"Losartana","dosage":"50mg","frequency":"1x ao dia","schedules":["08:00","20:00"],"durationDays":30,"continuousUse":true}]',
    description: 'Medicamentos da receita em JSON, com ao menos um item e ao menos um horário cada',
  })
  @IsString({ message: 'medications deve ser um array JSON de medicamentos' })
  @IsNotEmpty({ message: 'a receita precisa de ao menos um medicamento' })
  medications: string;

  @ApiPropertyOptional({
    example: 'Receita de pressão — Dr. Silva.pdf',
    description: 'Obrigatório apenas se houver PDF; sem ele, vale o nome original do arquivo enviado',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'fileDisplayName não pode ficar vazio quando informado' })
  @MaxLength(200)
  fileDisplayName?: string;

  @ApiPropertyOptional({ example: '2026-09-28T10:00:00.000Z', description: 'Data de emissão; padrão: agora' })
  @IsOptional()
  @IsISO8601()
  issuedAt?: string;
}

export class UpdatePrescriptionStatusDto {
  @ApiProperty({ enum: PrescriptionStatus, example: PrescriptionStatus.ENCERRADA })
  @IsEnum(PrescriptionStatus)
  status: PrescriptionStatus;
}

export class ListPrescriptionsQueryDto {
  @ApiPropertyOptional({ enum: PrescriptionStatus })
  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;
}

export class CreatePrescriptionMedicationDto {
  @ApiProperty({ example: 'Maleato de enalapril' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '10mg' })
  @IsString()
  @MaxLength(60)
  dosage: string;

  @ApiProperty({ example: '2x ao dia ( 10h/ 22h )' })
  @IsString()
  @MaxLength(120)
  frequency: string;

  @ApiPropertyOptional({ example: 30, description: 'Duração em dias; ausente = sem prazo definido' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'durationDays deve ser um número inteiro de dias' })
  @Min(1, { message: 'durationDays deve ser maior que zero' })
  @Max(MAX_DURATION_DAYS, { message: `durationDays deve ser no máximo ${MAX_DURATION_DAYS} dias` })
  durationDays?: number;

  @ApiPropertyOptional({ default: false, description: 'Uso contínuo — define se o medicamento entra no dashboard' })
  @IsOptional()
  @IsBoolean()
  continuousUse?: boolean;
}

export class UpdatePrescriptionMedicationDto {
  @ApiPropertyOptional({ example: 'Maleato de enalapril' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '10mg' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  dosage?: string;

  @ApiPropertyOptional({ example: '2x ao dia ( 10h/ 22h )' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  frequency?: string;

  @ApiPropertyOptional({ example: 30, description: 'Duração em dias' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'durationDays deve ser um número inteiro de dias' })
  @Min(1, { message: 'durationDays deve ser maior que zero' })
  @Max(MAX_DURATION_DAYS, { message: `durationDays deve ser no máximo ${MAX_DURATION_DAYS} dias` })
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Uso contínuo — não editável pelo paciente em item prescrito' })
  @IsOptional()
  @IsBoolean()
  continuousUse?: boolean;
}

export class CreateMedicationScheduleDto {
  @ApiProperty({ example: '08:00', description: 'Horário de tomada no formato HH:mm' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'time deve estar no formato HH:mm' })
  time: string;
}
