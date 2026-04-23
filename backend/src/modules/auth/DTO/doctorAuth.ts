import { IsString, Length, Matches, IsOptional } from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsString()
  @Matches(/^(\+?\d{8,15})$/)
  mobileNumber?: string;

  @IsString()
  @Length(2, 50)
  name: string;

  @IsOptional()
  @IsString()
  @Length(6, 20)
  password?: string;
}