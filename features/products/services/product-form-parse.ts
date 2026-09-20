import { codedError } from '@/lib/errors';
import { CreateProductSchema } from '@/lib/validators';

export function parseStringField(formData: FormData, key: string, defaultValue: string = ''): string {
  return String(formData.get(key) || defaultValue);
}

export function parseOptionalStringField(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) || '');
  return value || undefined;
}

export function parseNumberField(formData: FormData, key: string, defaultValue: number = 0): number {
  return parseFloat(String(formData.get(key) || defaultValue)) || defaultValue;
}

export function parseOptionalNumberField(formData: FormData, key: string): number | undefined {
  const raw = formData.get(key);
  if (raw == null) return undefined;
  const n = parseFloat(String(raw));
  return Number.isNaN(n) ? undefined : n;
}

export function parseProductFormData(formData: FormData) {
  const subCategoryId = String(formData.get('subCategoryId') || formData.get('categoryId') || '').trim();
  const quantityForSaleRaw = formData.get('quantityForSale') ?? formData.get('quantity');
  return {
    name: parseStringField(formData, 'name'),
    categoryLabel: parseStringField(formData, 'categoryLabel'),
    subCategoryId: subCategoryId || undefined,
    description: parseOptionalStringField(formData, 'description'),
    price: parseNumberField(formData, 'price'),
    quantityForSale: parseFloat(String(quantityForSaleRaw ?? 0)) || 0,
    unit: parseStringField(formData, 'unit', 'KG'),
  };
}

export async function validateProductFormData(formData: FormData) {
  const raw = parseProductFormData(formData);
  const validation = CreateProductSchema.safeParse(raw);
  if (!validation.success) {
    // Attach Zod validation details and the parsed raw input for debugging
    const err = codedError('INVALID_FORM', 'Invalid form data', { validation: validation.error, raw });
    console.warn('Product form validation failed', { raw, errors: validation.error.format?.() ?? validation.error.issues });
    throw err;
  }
  return validation;
}

export async function validateProductUpdateFormData(formData: FormData) {
  const values: {
    name?: string; categoryLabel?: string; subCategoryId?: string; description?: string;
    price?: number; quantityForSale?: number; unit?: string;
  } = {};
  const name = parseOptionalStringField(formData, 'name');
  if (name) values.name = name;
  const categoryLabel = parseOptionalStringField(formData, 'categoryLabel');
  if (categoryLabel) values.categoryLabel = categoryLabel;
  const subCategoryId = parseOptionalStringField(formData, 'subCategoryId') || parseOptionalStringField(formData, 'categoryId');
  if (subCategoryId) values.subCategoryId = subCategoryId;
  const description = parseOptionalStringField(formData, 'description');
  if (description) values.description = description;
  const price = parseOptionalNumberField(formData, 'price');
  if (price !== undefined) values.price = price;
  const quantity = parseOptionalNumberField(formData, 'quantityForSale') ?? parseOptionalNumberField(formData, 'quantity');
  if (quantity !== undefined) values.quantityForSale = quantity;
  const unit = parseOptionalStringField(formData, 'unit');
  if (unit) values.unit = unit;
  return values;
}
