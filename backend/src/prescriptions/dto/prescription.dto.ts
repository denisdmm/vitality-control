import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrescriptionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Campos de texto do POST multipart; o PDF vai no campo `file`. */
export class CreatePrescriptionDto {
  @ApiProperty({ example: 'Receita de pressão — Dr. Silva.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fileDisplayName: string;

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
