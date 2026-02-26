import { z } from 'zod';
import { schemas, type TemplateName } from './schemas';

/**
 * Convert a template's Zod schema to JSON Schema format.
 * Pass the result as `response_format.json_schema` in LLM API calls
 * to constrain the model's output to valid template content.
 *
 * The .describe() annotations on each field are included as JSON Schema
 * `description` properties — they serve as per-field instructions for the LLM.
 *
 * Uses Zod v4's native z.toJSONSchema() (zod-to-json-schema is a v3 library).
 */
export function getJsonSchemaForTemplate(template: TemplateName): object {
  return z.toJSONSchema(schemas[template]);
}
