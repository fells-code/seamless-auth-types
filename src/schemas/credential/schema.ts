import z from 'zod';
import { IsoDate } from '../../shared.js';

// Mirrors WebAuthn's AuthenticatorTransportFuture. Authenticators report
// transports the browser passes through verbatim, so anything narrower rejects
// credentials the platform considers valid.
export const TransportSchema = z.enum([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);

export type Transport = z.infer<typeof TransportSchema>;

export const DeviceTypeSchema = z.enum(['singleDevice', 'multiDevice']);

export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const CredentialSchema = z.object({
  id: z.string(),
  userId: z.string(),

  publicKey: z.string(),
  counter: z.number(),

  transports: z.array(TransportSchema).optional(),

  deviceType: DeviceTypeSchema.optional(),

  backedUp: z.boolean(),

  friendlyName: z.string().nullable().optional(),
  lastUsedAt: IsoDate.nullable().optional(),

  platform: z.string().nullable().optional(),
  browser: z.string().nullable().optional(),
  deviceInfo: z.string().nullable().optional(),

  createdAt: IsoDate,
  updatedAt: IsoDate.optional(),
});

export type Credential = z.infer<typeof CredentialSchema>;

export const UpdateCredentialRequestSchema = z.object({
  id: z.string(),
  friendlyName: z.string().min(1).max(128).optional(),
  deviceInfo: z.string().max(256).optional(),
});

export type UpdateCredentialRequest = z.infer<typeof UpdateCredentialRequestSchema>;

export const DeleteCredentialRequestSchema = z.object({
  id: z.string(),
});

export type DeleteCredentialRequest = z.infer<typeof DeleteCredentialRequestSchema>;

export const CredentialApiSchema = CredentialSchema.pick({
  id: true,
  transports: true,
  deviceType: true,
  backedUp: true,
  counter: true,
  friendlyName: true,
  lastUsedAt: true,
  platform: true,
  browser: true,
  deviceInfo: true,
  createdAt: true,
});

export type CredentialApi = z.infer<typeof CredentialApiSchema>;

/**
 * A credential as the API returns it. `backedup` is the historical lowercase
 * spelling kept alongside `backedUp` so older SDK builds keep working; new
 * consumers should read `backedUp`.
 */
export const CredentialResponseSchema = CredentialApiSchema.extend({
  backedup: z.boolean(),
  backedUp: z.boolean(),
  prfCapable: z.boolean().optional(),
});

export type CredentialResponse = z.infer<typeof CredentialResponseSchema>;

export const CredentialUpdateResponseSchema = z.object({
  message: z.string(),
  credential: CredentialResponseSchema,
});

export const CredentialCountResponseSchema = z.object({
  count: z.number(),
});
