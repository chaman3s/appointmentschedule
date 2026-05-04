import { ThrottlerGuard } from '@nestjs/throttler';

export class WhatsappThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
  return Promise.resolve(req.body?.from || req.ip);
}
}