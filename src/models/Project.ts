export interface Project {
  id: string;
  name: string;
  address: string;
  manager: string;
  managerContact: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}