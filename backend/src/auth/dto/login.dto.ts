import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'denisdmm', description: 'Nome de usuário (login)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'senha', description: 'Senha (texto puro, comparada com bcrypt)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}