import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'maria.silva' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Senha123' })
  @IsString()
  @MaxLength(200)
  password: string;

  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @MaxLength(160)
  fullName: string;

  @ApiPropertyOptional({ example: 'Maria' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  socialName?: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0012345/7' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  medicalRecordNumber?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  crm?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.PACIENTE })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 1.72 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  inactivityTimeout?: number;

  @ApiPropertyOptional({ description: 'dataURL ou URL da foto' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'IDs de médicos vinculados (apenas pacientes)' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  doctorIds?: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'maria.silva' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'NovaSenha' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;

  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional({ example: 'Maria' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  socialName?: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0012345/7' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  medicalRecordNumber?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  crm?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 1.72 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  inactivityTimeout?: number;

  @ApiPropertyOptional({ description: 'dataURL ou URL da foto' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'IDs de médicos vinculados (apenas pacientes)' })
  @IsOptional()
  @IsArray()
  doctorIds?: string[];

  @ApiPropertyOptional({ example: false, description: 'Se true, não altera os vínculos médico-paciente' })
  @IsOptional()
  @IsBoolean()
  keepDoctorIdsIntact?: boolean;
}