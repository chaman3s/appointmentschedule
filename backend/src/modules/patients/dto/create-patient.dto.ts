import { IsString, IsNumber, IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  patient_name: string;

  @Type(() => Number)
  @IsInt()
  patient_age: number;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @Type(() => Number)
  @IsNumber()
  weight: number;

  @IsString()
  @IsNotEmpty()
  relation: string;
}