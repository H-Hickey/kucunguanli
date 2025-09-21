export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}