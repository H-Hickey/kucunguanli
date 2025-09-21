export interface InventoryItem {
  id: string;
  materialId: string;
  quantity: number;
  alertThreshold: number;
  lastUpdated: Date;
}

export interface InventoryTransaction {
  id: string;
  materialId: string;
  type: 'stock_in' | 'stock_out' | 'adjustment';
  quantity: number; // positive for in, negative for out
  referenceId?: string; // ID of related stock-in/out document
  notes?: string;
  transactionDate: Date;
  createdBy: string;
}

export interface InventoryCheck {
  id: string;
  checkDate: Date;
  status: 'draft' | 'completed';
  notes?: string;
  createdBy: string;
  completedBy?: string;
  completedAt?: Date;
}

export interface InventoryCheckItem {
  id: string;
  checkId: string;
  materialId: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  notes?: string;
}