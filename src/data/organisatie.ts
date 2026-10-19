// Bestuur en commissies: data staat in organisatie.json, schema in schemas.ts.
import json from './organisatie.json';
import { organisatie as schema } from './schemas';

export const organisatie = schema.parse(json);
