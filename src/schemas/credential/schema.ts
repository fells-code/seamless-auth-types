import z from 'zod';
import { IsoDate } from '../../shared.js';

const TransportSchema = z.enum(['usb', 'ble', 'nfc', 'internal']);

const DeviceTypeSchema = z.enum(['singleDevice', 'multiDevice']);

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
