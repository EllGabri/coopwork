import { IsString, MaxLength } from 'class-validator';
import { SanitizeRichText } from '../common/sanitize';

export class CreateCommentDto {
  @IsString()
  @MaxLength(5000)
  @SanitizeRichText()
  content!: string;
}
