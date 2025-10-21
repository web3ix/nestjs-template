import {
  NumberFieldOptional,
  StringFieldOptional,
} from '@/common/decorators/field.decorators';
import { DEFAULT_PAGE_LIMIT } from '@/constants/app.constant';

export class PageOptionsDto {
  @StringFieldOptional()
  afterCursor?: string;

  @StringFieldOptional()
  beforeCursor?: string;

  @NumberFieldOptional({
    min: 1,
    default: DEFAULT_PAGE_LIMIT,
    int: true,
  })
  readonly limit?: number = DEFAULT_PAGE_LIMIT;

  @StringFieldOptional()
  readonly q?: string;
}
