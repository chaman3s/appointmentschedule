import {
 IsBoolean,
 IsNotEmpty,
 IsOptional,
 IsString,
 Matches
} from 'class-validator';

export class CreateDoctorLeaveDto {

 @IsNotEmpty()
 @Matches(/^\d{4}-\d{2}-\d{2}$/, {
   message:'startDate must be YYYY-MM-DD'
 })
 startDate:string;

 @IsOptional()
 @Matches(/^\d{4}-\d{2}-\d{2}$/)
 endDate?: string;

 @IsBoolean()
 isFullDay:boolean;

 @IsNotEmpty()
 @IsString()
 @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
   message:'startTime must be HH:mm'
 })
 startTime:string;

 @IsOptional()
 @IsString()
 @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
 endTime:string;

 @IsOptional()
 @IsString()
 reason:string;
}
