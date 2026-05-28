import { IsString, IsOptional, MaxLength, IsInt, Min, Max } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  wip_limit?: number;
}

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  wip_limit?: number;
}

export class ReorderColumnsDto {
  @IsString({ each: true })
  order!: string[];
}
