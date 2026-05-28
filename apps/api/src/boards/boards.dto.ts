import { IsString, IsOptional, MaxLength } from 'class-validator';
import { SanitizeText } from '../common/sanitize';

export class CreateBoardDto {
  @IsString()
  @MaxLength(100)
  @SanitizeText()
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeText()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
