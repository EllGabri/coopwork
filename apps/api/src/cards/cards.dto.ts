import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  IsArray,
  IsUUID,
  Matches,
} from 'class-validator';

const HEX_RGB_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export class CreateCardDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Matches(HEX_RGB_REGEX)
  color?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assignee_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Matches(HEX_RGB_REGEX)
  color?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assignee_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MoveCardDto {
  @IsUUID()
  column_id!: string;

  @IsInt()
  @Min(0)
  position!: number;
}
