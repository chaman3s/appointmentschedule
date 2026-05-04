import { IsOptional, IsString, IsNumber, IsEmail, IsUrl, Length, } from 'class-validator';

export class UpdateProfileDoctorDto {
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsEmail()
    email?: string;
    @IsOptional()
    address?:string
    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsNumber()
    experienceYears?: number;

    @IsOptional()
    @IsString()
    achievement?: string;

    @IsOptional()
    @IsUrl()
    googleReviewUrl?: string;
}