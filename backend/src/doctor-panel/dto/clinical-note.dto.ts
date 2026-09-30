import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const MAX_NOTE_LENGTH = 4000;

export class CreateClinicalNoteDto {
  @ApiProperty({ minLength: 1, maxLength: MAX_NOTE_LENGTH, example: 'Paciente relata melhora da dor.' })
  @IsString()
  @IsNotEmpty({ message: 'a anotação não pode ficar vazia' })
  @MinLength(1)
  @MaxLength(MAX_NOTE_LENGTH)
  body!: string;
}

export class UpdateClinicalNoteDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: MAX_NOTE_LENGTH })
  @IsString()
  @IsNotEmpty({ message: 'a anotação não pode ficar vazia' })
  @MinLength(1)
  @MaxLength(MAX_NOTE_LENGTH)
  body!: string;
}
