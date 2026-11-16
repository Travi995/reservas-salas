import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AppException } from '../../common/exceptions/app.exception.js';
import { User } from './entities/user.entity.js';
import { Role } from './enums/role.enum.js';

const UNIQUE_VIOLATION = '23505';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  static normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  findById(id: string) {
    return this.users.findOneBy({ id });
  }

  /** Incluye el hash de la contraseña (solo para el login). */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: UsersService.normalizeEmail(email) })
      .getOne();
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.users.create({
      ...data,
      email: UsersService.normalizeEmail(data.email),
    });
    try {
      const saved = await this.users.save(user);
      // No devolver el hash recién guardado.
      const { passwordHash: _, ...rest } = saved;
      return rest as User;
    } catch (e) {
      // El índice único es la garantía (dos registros simultáneos con el mismo email).
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'EMAIL_TAKEN',
          'Ya existe una cuenta con ese email.',
        );
      }
      throw e;
    }
  }
}
