import { BadRequestException } from '@nestjs/common';
export function normalizeDay(input: string): string {
  const map = {
    mon: 'MONDAY',
    monday: 'MONDAY',
    tue: 'TUESDAY',
    tuesday: 'TUESDAY',
    wed: 'WEDNESDAY',
    wednesday: 'WEDNESDAY',
    thu: 'THURSDAY',
    thursday: 'THURSDAY',
    fri: 'FRIDAY',
    friday: 'FRIDAY',
    sat: 'SATURDAY',
    saturday: 'SATURDAY',
    sun: 'SUNDAY',
    sunday: 'SUNDAY',
  };

  const key = input.toLowerCase();

  if (!map[key]) {
    throw new BadRequestException(`Invalid day: ${input}`);
  }

  return map[key];
}