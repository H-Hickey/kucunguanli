export interface StockInOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  projectId?: string;
  orderDate: Date;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockInItem {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}