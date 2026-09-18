import { IsEmail, IsInt, IsNumber, IsOptional, IsString, MaxLength, MinLength, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({ description: 'dataURL ou URL da foto' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 1.72, description: 'Altura em metros (IMC)' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 60000, description: 'Timeout de inatividade em ms' })
  @IsOptional()
  @IsInt()
  inactivityTimeout?: number;

  @ApiPropertyOptional({ description: 'Nova senha (opcional)' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  password?: string;
}