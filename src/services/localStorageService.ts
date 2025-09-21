import { Category } from '@/models/Category';
import { Material } from '@/models/Material';
import { Project } from '@/models/Project';
import { Supplier } from '@/models/Supplier';
import { InventoryItem, InventoryTransaction } from '@/models/Inventory';
import { StockInOrder, StockInItem } from '@/models/StockIn';
import { StockOutOrder, StockOutItem } from '@/models/StockOut';

// Generate unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Base service class for localStorage operations
class LocalStorageService<T> {
  private key: string;
  
  constructor(key: string) {
    this.key = key;
  }
  
  // Get all items
  getAll(): T[] {
    const items = localStorage.getItem(this.key);
    return items ? JSON.parse(items) : [];
  }
  
  // Get item by ID
  getById(id: string): T | null {
    const items = this.getAll();
    const item = items.find((item: any) => item.id === id);
    return item || null;
  }
  
  // Create new item
  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const items = this.getAll();
    
    // Generate timestamps
    const now = new Date().toISOString();
    
    // Create new item with auto-generated ID and timestamps
    const newItem = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      ...item
    } as T;
    
    // Save to localStorage
    items.push(newItem);
    localStorage.setItem(this.key, JSON.stringify(items));
    
    return newItem;
  }
  
  // Update item
  update(id: string, item: Partial<Omit<T, 'id' | 'createdAt'>>): T | null {
    const items = this.getAll();
    const index = items.findIndex((item: any) => item.id === id);
    
    if (index === -1) return null;
    
     // Update item with new data and updated timestamp
     const updatedItem = {
       ...items[index],
       ...item,
       updatedAt: new Date().toISOString()
     } as T;
     
      // Save to localStorage with error handling
      try {
        items[index] = updatedItem;
        localStorage.setItem(this.key, JSON.stringify(items));
        console.log(`Successfully updated ${this.key} item with id: ${id}`);
        
        // 对于库存更新，触发专门的inventory-updated事件
        if (this.key === 'inventory') {
          if (window && window.dispatchEvent) {
            console.log('Dispatching inventory-updated event from storage service');
            window.dispatchEvent(new CustomEvent('inventory-updated', {
              bubbles: true,
              cancelable: true,
              detail: { 
                source: 'localStorageService', 
                itemId: id,
                timestamp: new Date().getTime()
              }
            }));
          }
        } else {
          // 触发自定义更新事件
          if (window && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent(`${this.key}-updated`, {
              detail: { id, updatedItem, timestamp: new Date().getTime() }
            }));
          }
        }
        
        return updatedItem;
      } catch (error) {
        console.error(`Failed to update ${this.key} item:`, error);
        throw new Error(`Failed to update ${this.key} item: ${error.message}`);
      }
  }
  
  // Delete item
  delete(id: string): boolean {
    const items = this.getAll();
    const newItems = items.filter((item: any) => item.id !== id);
    
    if (items.length === newItems.length) return false;
    
    localStorage.setItem(this.key, JSON.stringify(newItems));
    return true;
  }
  
  // Clear all items
  clear(): void {
    localStorage.setItem(this.key, JSON.stringify([]));
  }
}

// Service instances for each data type
export const categoryService = new LocalStorageService<Category>('categories');
export const materialService = new LocalStorageService<Material>('materials');
export const projectService = new LocalStorageService<Project>('projects');
export const supplierService = new LocalStorageService<Supplier>('suppliers');
export const inventoryService = new LocalStorageService<InventoryItem>('inventory');
export const inventoryTransactionService = new LocalStorageService<InventoryTransaction>('inventoryTransactions');
export const stockInService = new LocalStorageService<StockInOrder>('stockInOrders');
export const stockInItemService = new LocalStorageService<StockInItem>('stockInItems');
export const stockOutService = new LocalStorageService<StockOutOrder>('stockOutOrders');
export const stockOutItemService = new LocalStorageService<StockOutItem>('stockOutItems');

// Initial data setup
export const initializeData = () => {
  // Check if data already exists
  if (localStorage.getItem('initialized') === 'true') return;
  
  // Create initial categories
  const 水电Category = categoryService.create({
    name: '水电材料',
    description: '水电工程相关材料'
  });
  
  const 木作Category = categoryService.create({
    name: '木作材料',
    description: '木工工程相关材料'
  });
  
  const 油漆Category = categoryService.create({
    name: '油漆涂料',
    description: '油漆和涂料相关材料'
  });
  
  // Create initial suppliers
  const supplier1 = supplierService.create({
    name: '诚信建材供应商',
    contactPerson: '张三',
    phone: '13800138000',
    address: '建材市场A区12号'
  });
  
  const supplier2 = supplierService.create({
    name: '远大五金有限公司',
    contactPerson: '李四',
    phone: '13900139000',
    address: '五金城B栋5号'
  });
  
  // Create initial materials
  if (水电Category &&木作Category &&油漆Category && supplier1 && supplier2) {
    materialService.create({
      name: '电线',
      specification: 'BV-2.5mm²',
      categoryId:水电Category.id,
      unit: '卷',
      supplierId: supplier1.id,
      referencePrice: 180,
      description: '国标铜芯电线'
    });
    
    materialService.create({
      name: '水管',
      specification: 'PPR-20mm',
      categoryId:水电Category.id,
      unit: '米',
      supplierId: supplier1.id,
      referencePrice: 15,
      description: '冷热通用PPR水管'
    });
    
    materialService.create({
      name: '木板',
      specification: '18mm多层实木板',
      categoryId:木作Category.id,
      unit: '块',
      supplierId: supplier2.id,
      referencePrice: 120,
      description: '环保E0级多层实木板'
    });
    
    materialService.create({
      name: '乳胶漆',
      specification: '5L/桶',
      categoryId:油漆Category.id,
      unit: '桶',
      supplierId: supplier2.id,
      referencePrice: 450,
      description: '环保乳胶漆'
    });
  }
  
  // Create initial project
  projectService.create({
    name: '幸福家园1号楼302室',
    address: '城市新区幸福家园小区1号楼302室',
    manager: '王五',
    managerContact: '13700137000',
    startDate: new Date().toISOString(),
    status: 'in_progress',
    description: '三室一厅精装修项目'
  });
  
  // Mark data as initialized
  localStorage.setItem('initialized', 'true');
};