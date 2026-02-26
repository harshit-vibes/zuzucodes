import type { z } from 'zod';
import type { schemas, TemplateName } from './schemas';

/** Infer the content type for any template name. Never hand-write these. */
export type TemplateContent<T extends TemplateName> = z.infer<typeof schemas[T]>;
