// Clubcode, teams en Sportlink-codes: data staat in club.json, schema in schemas.ts.
// Een fout laat de build falen, zodat het programma niet stilletjes breekt.
import json from './club.json';
import { club as schema } from './schemas';

export const club = schema.parse(json);
