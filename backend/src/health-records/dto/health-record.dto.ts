import { IsDateString, IsEnum, IsNotEmptyObject, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { HealthRecordStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHealthRecordDto {
  @ApiProperty({ example: 'Hemograma Completo' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Clínico' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  type?: string;

  @ApiPropertyOptional({ example: '2025-09-04T22:43:50.973Z' })
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiPropertyOptional({ example: '2025-09-04T03:00:00Z' })
  @IsOptional()
  @IsDateString()
  examDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ enum: HealthRecordStatus, default: HealthRecordStatus.SOLICITADO })
  @IsOptional()
  @IsEnum(HealthRecordStatus)
  status?: HealthRecordStatus;

  @ApiPropertyOptional({ example: 'Dr. Astolfa' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  requestingDoctorName?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  requestingDoctorCrm?: string;
}

export class UpdateHealthRecordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  examDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({ enum: HealthRecordStatus })
  @IsOptional()
  @IsEnum(HealthRecordStatus)
  status?: HealthRecordStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  requestingDoctorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  requestingDoctorCrm?: string;
}

export class CreateSubItemDto {
  @ApiProperty({ example: 'Colesterol LDL' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '110' })
  @IsString()
  result: string;

  @ApiProperty({ example: 'até 130' })
  @IsString()
  reference: string;
}

export class UpdateSubItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;
}

export class UpsertSubItemsDto {
  @ApiProperty({ type: [CreateSubItemDto] })
  @IsObject()
  @IsNotEmptyObject()
  items: CreateSubItemDto[];
}