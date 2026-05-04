import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
@Controller('whatsapp/chat')
@UseGuards(ThrottlerGuard) // ✅ use default guard
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 5, ttl: 60 } })
@Post()
create(@Body() dto: CreateWhatsappDto) {
  return this.whatsappService.create(dto);
}
}