import { Global, Injectable, Module } from '@nestjs/common';

/** Source of "now". Injected so business rules can be tested with a fixed time (ADR-0004). */
export abstract class Clock {
  abstract now(): Date;
}

@Injectable()
export class SystemClock extends Clock {
  now() {
    return new Date();
  }
}

@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
