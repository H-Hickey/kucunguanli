import { useState, useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { AuthContext } from '@/contexts/authContext';
import { 
  inventoryService,
  inventoryTransactionService,
  materialService,
  categoryService
} from '@/services/localStorageService';
import { InventoryItem, InventoryTransaction } from '@/models/Inventory';
import { Material } from '@/models/Material';
import { Category } from '@/models/Category';
import DashboardSection from '@/components/dashboard/DashboardSection';
import AlertItem from '@/components/dashboard/AlertItem';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// 定义搜索条件类型
interface SearchCriteria {
  materialName?: string;
  categoryId?: string;
  stockStatus?: 'all' | 'low' | 'normal';
}

// 定义库存调整表单类型
interface AdjustmentForm {
  materialId: string;
  quantity: number;
  reason: string;
  notes?: string;
}

// 创建库存上下文
interface InventoryContextType {
  inventories: InventoryItem[];
  materials: Material[];
  categories: Category[];
  transactions: InventoryTransaction[];
  isLoading: boolean;
  refreshInventory: () => Promise<void>;
  adjustInventory: (itemId: string, quantity: number, reason: string, notes?: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// 库存提供者组件
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载所有库存相关数据
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 获取最新的材料数据
      const latestMaterials = materialService.getAll();
      setMaterials(latestMaterials);
      
      // 获取最新的库存数据
      let inventoryItems = inventoryService.getAll();
      
      // 检查是否有新材料需要添加到库存
      latestMaterials.forEach(material => {
        const inventoryExists = inventoryItems.some(item => item.materialId === material.id);
        if (!inventoryExists) {
          // 为新材料创建初始库存记录
          inventoryService.create({
            materialId: material.id,
            quantity: 0,
            alertThreshold: 10,
            lastUpdated: new Date().toISOString()
          });
        }
      });
      
      // 重新获取包含新材料的库存数据
      inventoryItems = inventoryService.getAll();
      setInventories(inventoryItems);
      
      // 获取分类数据
      setCategories(categoryService.getAll());
      
      // 获取库存交易记录并按日期排序
      const trans = inventoryTransactionService.getAll()
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
      setTransactions(trans);
      
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      toast.error('加载库存数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化数据加载
  // 添加同步状态和时间戳跟踪
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const lastUpdateTimestamp = useRef<number>(0);
  
  // 修改现有的forceRefresh函数
  const forceRefresh = (source?: string) => {
    if (syncStatus === 'syncing') return;
    
    setSyncStatus('syncing');
    setRefreshTrigger(prev => prev + 1);
    
    // 添加日志以便调试
    console.log(`Forcing inventory refresh from ${source || 'unknown source'}`);
    
    // 调用现有的loadAllData函数并添加同步状态处理
    loadAllData()
      .then(() => {
        setSyncStatus('synced');
        setLastSynced(new Date());
        console.log('Inventory data refreshed successfully');
      })
      .catch(error => {
        console.error('Failed to refresh inventory data:', error);
        setSyncStatus('idle');
      });
  };
  
  // 修改现有的useEffect
  useEffect(() => {
    // 修改初始加载以使用新的同步状态
    const initLoad = async () => {
      setSyncStatus('syncing');
      try {
        await loadAllData();
        setSyncStatus('synced');
        setLastSynced(new Date());
      } catch (error) {
        console.error('Initial data load failed:', error);
        setSyncStatus('idle');
      }
    };
    
    initLoad();
    
    // 库存更新事件处理
    const handleInventoryUpdate = (event: CustomEvent) => {
      if (event.detail?.timestamp && event.detail.timestamp <= lastUpdateTimestamp.current) return;
      
      if (event.detail?.timestamp) {
        lastUpdateTimestamp.current = event.detail.timestamp;
      }
      
      forceRefresh(`event: ${event.detail?.source}`);
      toast.info('库存数据已更新');
    };
    
    // 存储变化事件处理
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && ['inventory', 'stockInOrders', 'stockOutOrders'].includes(e.key)) {
        forceRefresh(`storage: ${e.key}`);
      }
    };
    
    // 页面焦点事件
    const handleFocus = () => forceRefresh('focus');
    
    // 设置事件监听器
    window.addEventListener('inventory-updated', handleInventoryUpdate);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    
    // 定时刷新
    const syncIntervalId = setInterval(() => forceRefresh('interval'), 30000);
    
    return () => {
      window.removeEventListener('inventory-updated', handleInventoryUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(syncIntervalId);
    };
     
    // 添加定时刷新作为最后的保障措施
  }, [refreshTrigger]);

  // 同步状态指示器
  useEffect(() => {
    const indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '20px';
    indicator.style.right = '20px';
    indicator.style.padding = '8px 12px';
    indicator.style.borderRadius = '20px';
    indicator.style.fontSize = '12px';
    indicator.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    indicator.style.zIndex = '1000';
    indicator.style.display = 'none';
    
    document.body.appendChild(indicator);
    
    const updateIndicator = () => {
      switch(syncStatus) {
        case 'syncing':
          indicator.textContent = '库存同步中...';
          indicator.style.backgroundColor = '#eff6ff';
          indicator.style.color = '#2563eb';
          indicator.style.display = 'block';
          break;
        case 'synced':
          indicator.textContent = lastSynced ? `最后同步: ${lastSynced.toLocaleTimeString()}` : '同步完成';
          indicator.style.backgroundColor = '#f0fdf4';
          indicator.style.color = '#166534';
          indicator.style.display = 'block';
          
          setTimeout(() => {
            if (syncStatus === 'synced') indicator.style.display = 'none';
          }, 3000);
          break;
        default:
          indicator.style.display = 'none';
      }
    };
    
    updateIndicator();
    
    return () => document.body.removeChild(indicator);
  }, [syncStatus, lastSynced]);

  // 调整库存
    const { hasPermission } = useContext(AuthContext);
    
    const adjustInventory = async (
    itemId: string, 
    quantity: number, 
    reason: string, 
    notes?: string
  ) => {
    // 检查编辑权限
    if (!hasPermission('inventory', 'edit')) {
      toast.error('您没有调整库存的权限');
      return;
    }
    
    if (quantity === 0) {
      toast.error('调整数量不能为零');
      return;
    }
    
    setIsLoading(true);
    try {
      const inventoryItem = inventoryService.getById(itemId);
      if (!inventoryItem) {
        throw new Error('库存项目不存在');
      }
      
      // 计算新库存数量
      const newQuantity = inventoryItem.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('调整后库存不能为负数');
      }
      
      // 更新库存记录
      inventoryService.update(itemId, {
        quantity: newQuantity,
        lastUpdated: new Date().toISOString()
      });
      
      // 记录库存交易
      inventoryTransactionService.create({
        materialId: inventoryItem.materialId,
        type: 'adjustment',
        quantity: quantity,
        notes: `调整原因: ${reason}。备注: ${notes || '无'}`,
        transactionDate: new Date().toISOString(),
        createdBy: 'admin'
      });
      
      toast.success('库存调整成功');
      window.dispatchEvent(new Event('inventory-updated'));
      await loadAllData();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '库存调整失败';
      console.error('Inventory adjustment failed:', error);
      toast.error(`库存调整失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
<InventoryContext.Provider value={{
  inventories,
  materials,
  categories,
  transactions,
  isLoading,
  refreshInventory: loadAllData,
  adjustInventory
}}>
      {children}
    </InventoryContext.Provider>
  );
}

// 自定义Hook用于访问库存上下文

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

// 库存列表组件
function InventoryList() {
  const { hasPermission } = useContext(AuthContext);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    stockStatus: 'all'
  });
  const [filteredInventories, setFilteredInventories] = useState<InventoryItem[]>([]);
  const { inventories, materials, categories, isLoading, refreshInventory } = useInventory();
  
  // 应用搜索筛选
  useEffect(() => {
    let result = [...inventories];
    
    // 按材料名称筛选
    if (searchCriteria.materialName) {
      const searchTerm = searchCriteria.materialName.toLowerCase();
      result = result.filter(item => {
        const material = materials.find(m => m.id === item.materialId);
        return material && material.name.toLowerCase().includes(searchTerm);
      });
    }
    
    // 按分类筛选
    if (searchCriteria.categoryId) {
      result = result.filter(item => {
        const material = materials.find(m => m.id === item.materialId);
        return material && material.categoryId === searchCriteria.categoryId;
      });
    }
    
    // 按库存状态筛选
    if (searchCriteria.stockStatus === 'low') {
      result = result.filter(item => item.quantity <= item.alertThreshold);
    } else if (searchCriteria.stockStatus === 'normal') {
      result = result.filter(item => item.quantity > item.alertThreshold);
    }
    
    setFilteredInventories(result);
  }, [inventories, materials, searchCriteria]);
  
  // 处理搜索条件变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchCriteria(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // 重置搜索条件
  const resetSearch = () => {
    setSearchCriteria({
      materialName: '',
      categoryId: '',
      stockStatus: 'all'
    });
  };
  
  // 获取材料名称
  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? material.name : '未知材料';
  };
  
  // 获取材料规格
  const getMaterialSpecification = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? material.specification : '未知规格';
  };
  
  // 获取材料单位
  const getMaterialUnit = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? material.unit : '个';
  };
  
  // 获取分类名称
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '未知分类';
  };
  
  return (
    <div className="p-5">
      {/* 搜索条件 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-base font-medium text-gray-900 mb-3">查询条件</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">材料名称</label>
            <input
              type="text"
              name="materialName"
              value={searchCriteria.materialName || ''}
              onChange={handleSearchChange}
              placeholder="输入材料名称搜索"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">材料分类</label>
            <select
              name="categoryId"
              value={searchCriteria.categoryId || ''}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- 全部分类 --</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">库存状态</label>
            <select
              name="stockStatus"
              value={searchCriteria.stockStatus || 'all'}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全部库存</option>
              <option value="low">低库存</option>
              <option value="normal">正常库存</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-3 space-x-2">
          <button
            onClick={resetSearch}
            className="px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            重置
          </button>
          <button
            onClick={() => {}} // 筛选已经通过useEffect自动应用
            className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <i className="fa-solid fa-search mr-1"></i>查询
          </button>
        </div>
      </div>
      
      {/* 库存列表表格 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">规格型号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前库存</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预警阈值</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上次更新</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>加载中...
                </td>
              </tr>
            ) : filteredInventories.length > 0 ? (
              filteredInventories.map((item) => {
                const material = materials.find(m => m.id === item.materialId);
                const category = material ? categories.find(c => c.id === material.categoryId) : null;
                const isLowStock = item.quantity <= item.alertThreshold;
                
                return (
                  <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {material ? material.name : '未知材料'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {material ? material.specification : '未知规格'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category ? category.name : '未知分类'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {material ? material.unit : '个'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'} transition-colors duration-300`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.alertThreshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : '-'}
                    </td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <button 
                           onClick={() => {
                             // 这里会触发库存调整模态框
                             (window as any).openAdjustModal(item);
                           }}
                           disabled={!hasPermission('inventory', 'edit')}
                           className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                         >
                           <i className="fa-solid fa-sliders-h mr-1"></i>调整库存
                         </button>
                       </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  没有找到符合条件的库存记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 库存流水记录组件
function InventoryHistory() {
  const { transactions, materials, isLoading } = useInventory();
  
  // 获取材料名称
  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? material.name : '未知材料';
  };
  
  // 获取库存交易类型中文名称
  const getTransactionTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'stock_in': '入库',
      'stock_out': '出库',
      'adjustment': '调整'
    };
    return typeMap[type] || type;
  };
  
  return (
    <div className="p-5">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">变动类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">变动数量</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>加载中...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.transactionDate).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getMaterialName(transaction.materialId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.type === 'stock_in' ? 'bg-green-100 text-green-800' :
                      transaction.type === 'stock_out' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {getTransactionTypeName(transaction.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.createdBy}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    {transaction.notes || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  暂无库存交易记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 库存调整模态框组件
function InventoryAdjustmentModal({
  isOpen,
  onClose,
  item,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem;
  onSave: (quantity: number, reason: string, notes?: string) => void;
}) {
  const [adjustForm, setAdjustForm] = useState<AdjustmentForm>({
    materialId: '',
    quantity: 0,
    reason: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { materials } = useInventory();
  
  // 当项目变化时初始化表单
  useEffect(() => {
    if (item) {
      setAdjustForm({
        materialId: item.materialId,
        quantity: 0,
        reason: '',
        notes: ''
      });
      setFormErrors({});
    }
  }, [item]);
  
  // 处理表单变化
  const handleAdjustFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdjustForm(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseFloat(value) : value
    }));
    
    // 清除对应字段的错误
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!adjustForm.reason) {
      errors.reason = '请选择调整原因';
    }
    
    if (adjustForm.quantity === 0) {
      errors.quantity = '调整数量不能为零';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 提交表单
  const handleSubmit = () => {
    if (!validateForm() || !item) return;
    
    onSave(adjustForm.quantity, adjustForm.reason, adjustForm.notes);
  };
  
  // 获取材料信息
  const getMaterialInfo = () => {
    if (!item) return { name: '', specification: '', unit: '' };
    const material = materials.find(m => m.id === item.materialId);
    return {
      name: material?.name || '未知材料',
      specification: material?.specification || '未知规格',
      unit: material?.unit || '个'
    };
  };
  
  const materialInfo = getMaterialInfo();
  
  if (!isOpen || !item) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              库存调整
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="px-6 py-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">材料信息</label>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium">{materialInfo.name}</p>
              <p className="text-sm text-gray-500">{materialInfo.specification}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium">{item.quantity} {materialInfo.unit}</p>
              <p className="text-sm text-gray-500">预警阈值: {item.alertThreshold} {materialInfo.unit}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整数量 <span className="text-red-500">*</span></label>
              <div className="flex items-center">
                <button 
                  type="button"
                  onClick={() => setAdjustForm(prev => ({ 
                    ...prev, 
                    quantity: Math.max(prev.quantity - 1, -item.quantity) 
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 hover:bg-gray-100"
                >
                  <i className="fa-solid fa-minus"></i>
                </button>
                <input
                  type="number"
                  name="quantity"
                  value={adjustForm.quantity}
                  onChange={handleAdjustFormChange}
                  className={`flex-1 px-3 py-2 border-t border-b border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center ${formErrors.quantity ? 'border-red-500' : ''}`}
                  min={-item.quantity}
                  step="1"
                />
                <button 
                  type="button"
                  onClick={() => setAdjustForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                  className="px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 hover:bg-gray-100"
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">提示: 减少库存请输入负数，增加库存请输入正数</p>
              {formErrors.quantity && <p className="mt-1 text-sm text-red-600">{formErrors.quantity}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整原因 <span className="text-red-500">*</span></label>
              <select
                name="reason"
                value={adjustForm.reason}
                onChange={handleAdjustFormChange}
                className={`w-full px-3 py-2 border ${formErrors.reason ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="">-- 请选择调整原因 --</option>
                <option value="inventory_check">库存盘点调整</option>
                <option value="damage">材料损坏</option>
                <option value="loss">材料丢失</option>
                <option value="return">退货</option>
                <option value="other">其他原因</option>
              </select>
              {formErrors.reason && <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea
                name="notes"
                value={adjustForm.notes || ''}
                onChange={handleAdjustFormChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入调整备注信息"
              ></textarea>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            保存调整
          </button>
        </div>
      </div>
    </div>
  );
}

// 低库存预警组件
function LowStockAlerts() {
  const { inventories, materials, isLoading } = useInventory();
  
  // 获取低库存预警列表
  const getLowStockAlerts = () => {
    return inventories
      .filter(item => item.quantity <= item.alertThreshold)
      .map(item => {
        const material = materials.find(m => m.id === item.materialId);
        return {
          name: material?.name || '未知材料',
          current: item.quantity,
          threshold: item.alertThreshold,
          unit: material?.unit || '个',
          id: item.id
        };
      })
      .sort((a, b) => a.current - b.current);
  };
  
  const lowStockItems = getLowStockAlerts();
  
  if (lowStockItems.length === 0 && !isLoading) return null;
  
  return (
    <DashboardSection title="低库存预警" actionLabel="查看全部">
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">
            <i className="fa-solid fa-spinner fa-spin mr-2"></i>加载中...
          </div>
        ) : lowStockItems.length > 0 ? (
          lowStockItems.slice(0,5).map((item, index) => (
            <AlertItem
              key={index}
              name={item.name}
              current={item.current}
              threshold={item.threshold}
              unit={item.unit}
              onRestock={() => {
                // 在实际应用中，这里可以跳转到入库页面
                alert(`补货: ${item.name}`);
              }}
            />
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            暂无低库存预警
          </div>
        )}
      </div>
    </DashboardSection>
  );
}

// 库存统计卡片组件
function InventoryStatCards() {
  const { inventories, transactions, isLoading } = useInventory();
  
  // 计算统计数据
  const totalMaterials = inventories.length;
  const lowStockCount = inventories.filter(item => item.quantity <= item.alertThreshold).length;
  const monthlyAdjustments = transactions.filter(t => {
    const date = new Date(t.transactionDate);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">总材料种类</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">
              {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : totalMaterials}
            </h3></div><div className="p-3 rounded-full bg-blue-100">
            <i className="fa-solid fa-cubes text-blue-600 text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">低库存材料</p>
            <h3 className="mt-1 text-2xl font-bold text-yellow-600">
              {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : lowStockCount}
            </h3>
          </div>
          <div className="p-3 rounded-full bg-yellow-100">
            <i className="fa-solid fa-exclamation-triangle text-yellow-600 text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-yellow-500 h-2 rounded-full" 
              style={{ width: `${totalMaterials > 0 ? Math.min((lowStockCount / totalMaterials) * 100, 100) : 0}%` }}></div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">本月调整记录</p>
            <h3 className="mt-1 text-2xl font-bold text-purple-600">
              {isLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : monthlyAdjustments}
            </h3>
          </div>
          <div className="p-3 rounded-full bg-purple-100">
            <i className="fa-solid fa-history text-purple-600 text-xl"></i>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '65%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主库存管理组件
const InventoryContent = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const { adjustInventory, refreshInventory, isLoading } = useInventory();
  
  // 打开调整模态框
  const openAdjustModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setIsModalOpen(true);
  };
  
  // 关闭调整模态框
  const closeAdjustModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
  };
  
  // 保存库存调整
  const saveInventoryAdjustment = async (quantity: number, reason: string, notes?: string) => {
    if (!currentItem) return;
    
    await adjustInventory(currentItem.id, quantity, reason, notes);
    closeAdjustModal();
    toast.success('库存调整成功');
  };
  
  // 将openAdjustModal方法附加到window对象，供子组件调用
  (window as any).openAdjustModal = openAdjustModal;
  
  return (
    <div className="space-y-6">
      {/* 库存概览统计 */}
      <InventoryStatCards />
      
      {/* 低库存预警 */}
      <LowStockAlerts />
      
      {/* 库存管理标签页 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200 flex justify-between items-center">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'list' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-list mr-2"></i>库存列表
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'history' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-history mr-2"></i>库存流水
            </button>
          </nav>
          <button
            onClick={() => refreshInventory()}
            disabled={isLoading}
            className="mr-4 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
          >
            <i className={`fa-solid ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} mr-1`}></i>
            刷新数据
          </button>
        </div>
        
        {/* 库存列表 */}
        {activeTab === 'list' && <InventoryList />}
        
        {/* 库存流水记录 */}
        {activeTab === 'history' && <InventoryHistory />}
      </div>
      
      {/* 库存调整模态框 */}
      <InventoryAdjustmentModal
        isOpen={isModalOpen}
        onClose={closeAdjustModal}
        item={currentItem}
        onSave={saveInventoryAdjustment}
      />
    </div>
  );
};

export default function Inventory() {
  return (
    <InventoryProvider>
      <InventoryContent />
    </InventoryProvider>
  );
}