import z from 'zod';

export const IsoDate = z.coerce.date().transform((d) => d.toISOString());
