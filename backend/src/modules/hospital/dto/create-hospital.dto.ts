import { IsString, IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Optional } from '@nestjs/common';

export class CreateHospitalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Optional()
  @IsString()
  address?: string;

  
}