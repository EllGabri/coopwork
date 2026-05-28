import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

export class UpdateWorkspaceDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}
