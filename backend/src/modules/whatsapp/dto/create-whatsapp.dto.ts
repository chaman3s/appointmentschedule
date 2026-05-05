import {IsString,IsNotEmpty} from "class-validator"
export class CreateWhatsappDto {
  @IsString()
  @IsNotEmpty()
  from: string; // phone number

  @IsString()
  @IsNotEmpty()
  message: string; // text message
}

