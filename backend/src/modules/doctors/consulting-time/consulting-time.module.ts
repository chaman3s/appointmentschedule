import { Module } from '@nestjs/common';
import { ConsultingTimeController } from './consulting-time.controller';
import { ConsultingTimeService } from './consulting-time.service';

@Module({
  controllers: [ConsultingTimeController],
  providers: [ConsultingTimeService]
})
export class ConsultingTimeModule {}
