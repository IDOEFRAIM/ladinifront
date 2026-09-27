import { z } from 'zod';

export const productionTypeEnum = z.enum(['CROP', 'LIVESTOCK']);

export const DeclareProductionSchema = z.object({
  farmId: z.string().uuid(),
  productLabel: z.string().min(1),
  productionType: productionTypeEnum.default('CROP'),
  subCategoryId: z.string().uuid().optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  estimatedAvailableAt: z.coerce.date().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().optional(),
  unit: z.string().min(1).default('KG'),
  status: z.string().min(1).default('DRAFT'),
  isPublic: z.boolean().default(false),
  preorderEnabled: z.boolean().default(false),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
  currentStock: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (data.productionType === 'CROP') {
    if (!data.expectedHarvestDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date de récolte requise', path: ['expectedHarvestDate'] });
    }
  } else {
    if (!data.species && !data.productLabel) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Espèce obligatoire pour l’élevage', path: ['species'] });
    }
    if (data.currentStock == null && data.availableQuantity == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stock initial ou disponible requis', path: ['currentStock'] });
    }
  }
});

export const UpdateVisibilitySchema = z.object({
  marketOfferId: z.string().uuid(),
  isPublic: z.boolean().optional(),
  preorderEnabled: z.boolean().optional(),
  estimatedAvailableAt: z.coerce.date().nullable().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().nullable().optional(),
  status: z.string().min(1).optional(),
  currentStock: z.number().nonnegative().optional(),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
});

export type DeclareProductionInput = z.input<typeof DeclareProductionSchema>;

export type UpdateVisibilityInput = z.input<typeof UpdateVisibilitySchema>;

export type PublicProduction = {
  id: string;
  productLabel: string;
  productionType: z.infer<typeof productionTypeEnum>;
  estimatedAvailableAt: Date | null;
  expectedHarvestDate: Date | null;
  availableQuantity: number;
  reservedQuantity: number;
  pricePerUnit: number | null;
  unit: string;
  preorderEnabled: boolean;
  species: string | null;
  breed: string | null;
  currentStock: number;
  subCategory: { id: string; name: string } | null;
  producer: {
    id: string;
    businessName: string | null;
    logoUrl: string | null;
    zoneId: string | null;
    rating: number | null;
  } | null;
  farm: { id: string; name: string; location: string | null };
};
