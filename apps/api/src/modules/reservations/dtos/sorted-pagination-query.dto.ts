import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

/**
 * Columns a reservation listing can be sorted by. A whitelist: the value picks a fixed SQL expression
 * in the service, it is never interpolated into the query.
 */
export const SORT_FIELDS = [
  'date',
  'time',
  'title',
  'room',
  'user',
  'status',
] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** `?page&pageSize&sortBy=title&sortDir=desc`. Sorting happens in the database, so it applies to every page. */
export class SortedPaginationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: SORT_FIELDS,
    description:
      'Columna por la que ordenar: `date` (inicio), `time` (hora del día en la zona de la sala), `title`, `room`, `user` (quien reservó) o `status`. Sin indicarla, el orden por defecto de cada listado. Los empates se resuelven por fecha de inicio e id, así que las páginas no repiten ni saltan filas.',
  })
  @IsOptional()
  @IsIn(SORT_FIELDS, {
    message: `sortBy debe ser uno de: ${SORT_FIELDS.join(', ')}.`,
  })
  sortBy?: SortField;

  @ApiPropertyOptional({ enum: SORT_DIRECTIONS, default: 'asc' })
  @IsOptional()
  @IsIn(SORT_DIRECTIONS, { message: 'sortDir debe ser asc o desc.' })
  sortDir?: SortDirection;
}
