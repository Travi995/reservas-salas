import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isPgError, PG } from '../../common/database/pg-errors.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { User } from './entities/user.entity.js';
import { Role } from './enums/role.enum.js';

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

  /** Includes the password hash (for login only). */
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
      // Do not return the freshly stored hash.
      const { passwordHash: _, ...rest } = saved;
      return rest as User;
    } catch (e) {
      // The unique index is the real guarantee (two concurrent registrations with the same email).
      if (isPgError(e, PG.UNIQUE_VIOLATION)) {
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
