export interface Material {
  id: string;
  name: string;
  specification: string;
  categoryId: string;
  unit: string;
  supplierId?: string;
  referencePrice: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}