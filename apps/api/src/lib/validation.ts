import { z } from 'zod';
import { loginSchema } from '@school-fees/contracts';

export const parseBody = <T>(schema: z.ZodType<T>, data: unknown) => schema.parse(data);

export { loginSchema };
