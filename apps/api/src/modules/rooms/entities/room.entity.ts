import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const DEFAULT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ length: 120 })
  location: string;

  /** IANA time zone of the office: bookings and the "day" of availability are computed in it. */
  @Column({ name: 'time_zone', length: 64, default: DEFAULT_TIME_ZONE })
  timezone: string;

  /** Inactive rooms reject new reservations; existing ones (past and future) are kept. */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', select: false })
  createdAt: Date;
}
