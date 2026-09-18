import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVaccineDto {
  @ApiProperty({ example: 'Influenza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  vaccineName: string;

  @ApiProperty({ example: '2025-04-10T12:00:00.000Z' })
  @IsDateString()
  vaccinationDate: string;

  @ApiPropertyOptional({ example: 'two-dose', enum: ['single-dose', 'two-dose', 'three-dose'] })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  seriesSchedule?: string;

  @ApiPropertyOptional({ example: 1, description: 'Intervalo entre doses em meses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalBetweenDoses?: number;

  @ApiPropertyOptional({ example: 12, description: 'Intervalo entre doses de reforço em meses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalBetweenBoosterDoses?: number;
}

export class UpdateVaccineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  vaccineName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vaccinationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  seriesSchedule?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalBetweenDoses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  intervalBetweenBoosterDoses?: number;
}