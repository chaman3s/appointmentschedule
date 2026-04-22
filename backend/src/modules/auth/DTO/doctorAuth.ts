import { IsString, Length, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @Matches(/^(\+?\d{8,15})$/)
  mobileNumber?: string;

  @IsString()
  @Length(2, 50)
  name!: string;

  @IsString()
  @Length(6, 20)
  password?: string;
}
