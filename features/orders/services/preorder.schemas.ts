import { z } from 'zod';

export const CreatePreorderSchema = z.object({
  marketOfferId: z.string().uuid(),
  quantity: z.number().positive(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  deliveryDesc: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  paymentMethod: z.string().min(1).default('CASH'),
});

export const UpdatePreorderSchema = z.object({
  orderId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const CancelPreorderSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreatePreorderInput = z.input<typeof CreatePreorderSchema>;

export type UpdatePreorderInput = z.input<typeof UpdatePreorderSchema>;

export type CancelPreorderInput = z.input<typeof CancelPreorderSchema>;
