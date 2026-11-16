import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service.js';
import { AvailabilityQueryDto } from './dtos/availability-query.dto.js';
import { WeekQueryDto } from './dtos/week-query.dto.js';

@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /** 200 · 400 · 401. Busy slots per active room for one day. */
  @Get()
  forDay(@Query() query: AvailabilityQueryDto) {
    return this.availability.forDay(query);
  }

  /** 200 · 400 · 401 · 404. Weekly calendar of one room (Monday to Sunday of the week containing `date`). */
  @Get('week')
  forWeek(@Query() query: WeekQueryDto) {
    return this.availability.forWeek(query);
  }
}
