import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates a request body against a schema from `@probo/shared`.
 *
 * The same schema guards the API and the front end, so a payload the browser
 * accepts is one the server accepts — and a rule is written once.
 *
 * The error carries Zod's issue list, which names the offending fields. That is
 * safe here: the caller sent the payload, so it tells them nothing they did not
 * already know.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
