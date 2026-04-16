// src/common/utils/day.util.ts

import { BadRequestException } from '@nestjs/common';

// ✅ Normalize input like "mon", "Monday" → "MONDAY"
export function normalizeDay(input: string): string {
  const map: Record<string, string> = {
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

// ✅ Convert date → "MONDAY"
export function getDayName(date: string): string {
  const days = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new BadRequestException('Invalid date format');
  }

  return days[d.getDay()];
}