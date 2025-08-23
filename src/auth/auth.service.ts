import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(email: string, password: string, name?: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new BadRequestException('Email ya registrado');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({
      email, name: name ?? email.split('@')[0], passwordHash: hash,
    });
    return this.sign(user.id, user.email, user.name);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    return this.sign(user.id, user.email, user.name);
  }

  private sign(sub: string, email?: string, name?: string) {
    const payload = { sub, email, name };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });
    return { accessToken, user: { id: sub, email, name } };
  }
}
