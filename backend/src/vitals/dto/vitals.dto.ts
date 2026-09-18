import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BloodPressurePeriodDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  systolic?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  diastolic?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(250)
  pulse?: number;
}

export class GlucosePeriodDto {
  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(600)
  value?: number;
}

export class BloodPressureUpdateDto {
  @ApiPropertyOptional({ description: 'Período da manhã (null apaga)' })
  @IsOptional()
  @ValidateNested()
  @IsObject()
  @Type(() => BloodPressurePeriodDto)
  manha?: BloodPressurePeriodDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BloodPressurePeriodDto)
  tarde?: BloodPressurePeriodDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BloodPressurePeriodDto)
  noite?: BloodPressurePeriodDto | null;
}

export class GlucoseUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GlucosePeriodDto)
  manha?: GlucosePeriodDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GlucosePeriodDto)
  tarde?: GlucosePeriodDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GlucosePeriodDto)
  noite?: GlucosePeriodDto | null;
}

export class WeightUpdateDto {
  @ApiProperty({ example: 82.5, description: 'Peso em kg' })
  @IsNumber()
  @Min(30)
  @Max(400)
  weight: number;
}

export class DateRangeDto {
  @ApiPropertyOptional({ example: '2025-08-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-09-30' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class VitalsDailyDto {
  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BloodPressureUpdateDto)
  @IsNotEmptyObject({ nullable: true })
  bloodPressure?: BloodPressureUpdateDto | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => GlucoseUpdateDto)
  glucose?: GlucoseUpdateDto | null;

  @ApiPropertyOptional({ example: 82.5 })
  @IsOptional()
  @IsNumber()
  weight?: number | null;
}