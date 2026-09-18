import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(name: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { name } });
    if (!user) {
      // tempo uniforme para evitar enumeração simples de usuário
      await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuu');
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const payload = { sub: user.id, name: user.name, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET') || 'central-vitalidade-change-me',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.toPublicUser(user),
    };
  }

  toPublicUser(user: {
    id: string;
    name: string;
    fullName: string;
    photoUrl: string | null;
    role: string;
    inactivityTimeout: number | null;
    socialName: string | null;
    email: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      fullName: user.fullName,
      socialName: user.socialName,
      email: user.email,
      photoUrl: user.photoUrl,
      role: user.role,
      inactivityTimeout: user.inactivityTimeout,
    };
  }
}