import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { ReservationStatus } from '../enums/reservation-status.enum.js';

/**
 * A booking of a room for the half-open interval [startsAt, endsAt), stored in UTC (ADR-0004).
 * The database forbids overlapping active reservations in the same room (EXCLUDE constraint, ADR-0003).
 */
@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 120 })
  title: string;

  /** Shared by every occurrence of a recurring reservation; null for one-off reservations. */
  @Column({ name: 'series_id', type: 'uuid', nullable: true })
  seriesId: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservation_status',
    default: ReservationStatus.Active,
  })
  status: ReservationStatus;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by', type: 'uuid', nullable: true })
  cancelledById: string | null;

  /** Who cancelled it: the owner or an admin. Kept as an audit trail and shown to the owner. */
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cancelled_by' })
  cancelledBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', select: false })
  createdAt: Date;
}
