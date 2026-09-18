import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class UpdateSharedDataDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(1)
  bpSystolicIdeal?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsInt()
  @Min(1)
  bpDiastolicIdeal?: number;

  @ApiPropertyOptional({ example: 130 })
  @IsOptional()
  @IsInt()
  @Min(1)
  bpSystolicLimit?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  bpDiastolicLimit?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  glucosePreLimit?: number;

  @ApiPropertyOptional({ example: 126 })
  @IsOptional()
  @IsInt()
  @Min(1)
  glucoseDiabetesLimit?: number;
}

export class PublicSharedDataDto extends PartialType(UpdateSharedDataDto) {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  id?: number;
}