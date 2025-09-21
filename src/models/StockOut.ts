export interface StockOutOrder {
  id: string;
  orderNumber: string;
  projectId: string;
  orderDate: Date;
  status: 'draft' | 'completed' | 'cancelled';
  recipientName: string;
  recipientContact: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockOutItem {
  id: string;
  orderId: string;
  materialId: string;
  quantity: number;
  notes?: string;
}