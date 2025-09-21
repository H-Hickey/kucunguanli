import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { 
  stockInService, 
  stockInItemService,
  materialService,
  supplierService,
  projectService,
  categoryService,
  inventoryService,
  inventoryTransactionService
} from '@/services/localStorageService';
import { StockInOrder } from '@/models/StockIn';
import { Material } from '@/models/Material';
import { Supplier } from '@/models/Supplier';
import { Project } from '@/models/Project';
import { Category } from '@/models/Category';
import DashboardSection from '@/components/dashboard/DashboardSection';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

// 定义入库单项目类型
interface StockInItemForm {
  id?: string;
  materialId: string;
  material?: Material;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// 定义搜索条件类型
interface SearchCriteria {
  startDate?: string;
  endDate?: string;
  materialType?: string;
  supplierId?: string;
}

export default function StockIn() {
  const { hasPermission } = useContext(AuthContext);
  // 状态管理
  const [activeTab, setActiveTab] = useState<'create' | 'query'>('create');
  const [stockInOrders, setStockInOrders] = useState<StockInOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [currentOrder, setCurrentOrder] = useState<Partial<StockInOrder> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 入库单表单状态
  const [formData, setFormData] = useState({
    orderNumber: '',
    supplierId: '',
    projectId: '',
    orderDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'draft' as 'draft' | 'completed' | 'cancelled',
    items: [] as StockInItemForm[]
  });
  
  // 搜索条件状态
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({});
  const [filteredOrders, setFilteredOrders] = useState<StockInOrder[]>([]);
  
  // 表单错误状态
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // 检查URL参数中是否有材料ID，有则自动打开入库单模态框并选择该材料
  useEffect(() => {
    const materialId = searchParams.get('materialId');
    if (materialId) {
      // 打开入库单模态框
      openCreateModal();
      
      // 延迟设置材料，确保模态框已打开且表单已初始化
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          supplierId: prev.supplierId || suppliers[0]?.id,
          items: [
            {
              materialId,
              quantity: 1,
              unitPrice: 0,
              totalPrice: 0
            }
          ]
        }));
      }, 300);
    }
  }, [searchParams, suppliers]);
  
  // 加载数据
  useEffect(() => {
    loadAllData();
  }, []);
  
  // 当订单数据变化时重新应用筛选
  useEffect(() => {
    applySearchFilters();
  }, [stockInOrders, searchCriteria]);
  
  // 加载所有数据
  const loadAllData = () => {
    setStockInOrders(stockInService.getAll());
    setMaterials(materialService.getAll());
    setSuppliers(supplierService.getAll());
    setProjects(projectService.getAll());
    setCategories(categoryService.getAll());
  };
  
  // 添加入库单项目
  const addStockInItem = () => {
    const newItem: StockInItemForm = {
      materialId: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };
  
  // 移除入库单项目
  const removeStockInItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  // 更新入库单项目
  const updateStockInItem = (index: number, field: keyof StockInItemForm, value: any) => {
    const updatedItems = [...formData.items];
    
    // 更新字段值
    updatedItems[index][field] = value;
    
    // 如果更新的是数量或单价，重新计算总价
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    // 如果更新的是材料，自动填充单价
    if (field === 'materialId') {
      const selectedMaterial = materials.find(m => m.id === value);
      if (selectedMaterial) {
        updatedItems[index].unitPrice = Number(selectedMaterial.referencePrice);
        updatedItems[index].totalPrice = updatedItems[index].quantity * Number(selectedMaterial.referencePrice);
        updatedItems[index].material = selectedMaterial;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };
  
  // 生成入库单号
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 获取当天的入库单数量
    const today = date.toISOString().split('T')[0];
  const todayOrders = stockInOrders.filter(order => 
    typeof order.orderDate === 'string' && order.orderDate.startsWith(today)
  );
    
    // 生成单号: RK + 年月日 + 3位序号
    return `RK${year}${month}${day}${String(todayOrders.length + 1).padStart(3, '0')}`;
  };
  
  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // 基本信息验证
    if (!formData.supplierId) errors.supplierId = '请选择供应商';
    if (!formData.orderDate) errors.orderDate = '请选择入库日期';
    
    // 项目验证
    if (formData.items.length === 0) {
      errors.items = '请至少添加一项入库材料';
    } else {
      // 验证每个项目
      formData.items.forEach((item, index) => {
        if (!item.materialId) {
          errors[`item_${index}_material`] = '请选择材料';
        }
        if (!item.quantity || item.quantity <= 0) {
          errors[`item_${index}_quantity`] = '请输入有效的数量';
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors[`item_${index}_price`] = '请输入有效的单价';
        }
      });
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 保存入库单
    const saveStockInOrder = () => {
    if (!validateForm()) return;
    
    try {
      // 验证入库单数据完整性
      if (!formData.supplierId) throw new Error('请选择供应商');
      if (!formData.orderDate) throw new Error('请选择入库日期');
      if (formData.items.length === 0) throw new Error('请至少添加一项入库材料');
      
      // 准备入库单数据
      const stockInData = {
        orderNumber: formData.orderNumber || generateOrderNumber(),
        supplierId: formData.supplierId,
        projectId: formData.projectId || undefined,
        // 确保日期格式正确
        orderDate: formData.orderDate ? new Date(formData.orderDate).toISOString() : new Date().toISOString(),
        status: formData.status,
        notes: formData.notes
      };
      
      // 创建或更新入库单
      let savedOrder;
      if (isEditing && currentOrder?.id) {
        // 更新现有入库单
        savedOrder = stockInService.update(currentOrder.id, stockInData);
        if (!savedOrder) throw new Error('更新入库单失败');
        
        // 删除原有入库单项目
        const existingItems = stockInItemService.getAll()
          .filter(item => item.orderId === currentOrder.id);
        existingItems.forEach(item => stockInItemService.delete(item.id));
      } else {
        // 创建新入库单
          savedOrder = stockInService.create(stockInData);
          if (!savedOrder) throw new Error('创建入库单失败');
        if (!savedOrder) throw new Error('创建入库单失败');
      }
      
      // 保存入库单项目
      formData.items.forEach(item => {
        if (!item.materialId) throw new Error('材料信息不完整');
        if (item.quantity <= 0) throw new Error('材料数量必须大于0');
        if (item.unitPrice <= 0) throw new Error('材料单价必须大于0');
        
        const createdItem = stockInItemService.create({
          orderId: savedOrder.id,
          materialId: item.materialId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes
        });
        
        if (!createdItem) throw new Error('保存入库单项目失败');
        
        // 更新库存
        if (formData.status === 'completed') {
          updateInventory(item.materialId, item.quantity);
        }
      });
      
      // 刷新数据
      loadAllData();
      
      // 关闭模态框
      closeModal();
      
      // 显示成功消息
       // 根据状态显示不同的成功消息
        if (formData.status === 'completed') {
          // 确保库存已更新后再通知
          setTimeout(() => {
            toast.success(isEditing ? '入库单更新成功，库存已更新' : '入库单创建成功，库存已更新');
            
            try {
              // 触发库存更新事件 - 使用自定义事件确保冒泡和细节传递
              const event = new CustomEvent('inventory-updated', {
                bubbles: true,
                cancelable: true,
                detail: { 
                  source: 'stock-in', 
                  orderId: savedOrder.id,
                  timestamp: new Date().getTime(),
                  materialIds: formData.items.map(item => item.materialId)
                }
              });
              
              console.log('Dispatching inventory-updated event from stock-in');
              window.dispatchEvent(event);
              
              // 双重保障：直接更新localStorage并触发storage事件
              localStorage.setItem('inventory', JSON.stringify(inventoryService.getAll()));
              console.log('Inventory data updated in localStorage');
            } catch (error) {
              console.error('Failed to dispatch inventory update event:', error);
              toast.error('库存更新通知失败，请手动刷新页面');
            }
          }, 100);
        } else {
          toast.success(isEditing ? '入库单更新成功' : '入库单创建成功');
        }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('保存入库单失败:', errorMessage);
      toast.error(`保存入库单失败: ${errorMessage}，请重试`);
    }
  };
  
  // 更新库存
  const updateInventory = (materialId: string, quantity: number) => {
    // 查找现有库存记录
    let inventoryItem = inventoryService.getAll().find(item => item.materialId === materialId);
    
    if (inventoryItem) {
      // 更新现有库存
      inventoryService.update(inventoryItem.id, {
        quantity: inventoryItem.quantity + quantity
      });
    } else {
      // 创建新库存记录，默认预警阈值为10
      inventoryService.create({
        materialId,
        quantity,
        alertThreshold: 10,
        lastUpdated: new Date().toISOString()
      });
    }
    
    // 记录库存变动
    inventoryTransactionService.create({
      materialId,
      type: 'stock_in',
      quantity: quantity,
      referenceId: currentOrder?.id || '',
      notes: '入库',
      transactionDate: new Date().toISOString(),
      createdBy: 'admin' // 在实际系统中应使用当前登录用户
    });
  };
  
  // 打开入库单编辑模态框
  const openEditModal = (order: StockInOrder) => {
    setIsModalOpen(true);
    setIsEditing(true);
    setCurrentOrder(order);
    
    // 获取该入库单的项目
    const orderItems = stockInItemService.getAll()
      .filter(item => item.orderId === order.id);
    
    // 准备表单数据
    setFormData({
      orderNumber: order.orderNumber,
      supplierId: order.supplierId,
       projectId: order.projectId || '',
        orderDate: order.orderDate && typeof order.orderDate === 'string' && !isNaN(new Date(order.orderDate).getTime()) 
          ? new Date(order.orderDate).toISOString() 
          : new Date().toISOString(),
      notes: order.notes || '',
      status: order.status,
      items: orderItems.map(item => ({
        id: item.id,
        materialId: item.materialId,
        material: materials.find(m => m.id === item.materialId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes
      }))
    });
  };
  
  // 打开新增入库单模态框
  const openCreateModal = () => {
    setIsModalOpen(true);
    setIsEditing(false);
    setCurrentOrder(null);
    
    // 重置表单
    setFormData({
      orderNumber: '',
      supplierId: '',
      projectId: '',
      orderDate: new Date().toISOString().split('T')[0],
      notes: '',
      status: 'draft',
      items: []
    });
    setFormErrors({});
  };
  
  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    setFormErrors({});
  };
  
  // 应用搜索筛选
  const applySearchFilters = () => {
    let result = [...stockInOrders];
    
    // 日期筛选
    if (searchCriteria.startDate) {
      result = result.filter(order => order.orderDate >= searchCriteria.startDate!);
    }
    if (searchCriteria.endDate) {
      result = result.filter(order => order.orderDate <= searchCriteria.endDate!);
    }
    
    // 材料类型筛选
    if (searchCriteria.materialType) {
      // 获取该分类下的所有材料
      const categoryMaterials = materials
        .filter(material => material.categoryId === searchCriteria.materialType)
        .map(material => material.id);
      
      // 获取包含这些材料的入库单
      const orderIds = new Set<string>();
      stockInItemService.getAll().forEach(item => {
        if (categoryMaterials.includes(item.materialId)) {
          orderIds.add(item.orderId);
        }
      });
      
      result = result.filter(order => orderIds.has(order.id));
    }
    
    // 供应商筛选
    if (searchCriteria.supplierId) {
      result = result.filter(order => order.supplierId === searchCriteria.supplierId);
    }
    
    setFilteredOrders(result);
  };
  
  // 处理搜索条件变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSearchCriteria(prev => ({
      ...prev,
      [name]: value || undefined
    }));
  };
  
  // 重置搜索条件
  const resetSearch = () => {
    setSearchCriteria({});
  };
  
   // 获取供应商名称
  const getSupplierName = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.name : '未知供应商';
  };
  
  // 删除入库单
   const deleteStockInOrder = (id: string) => {
    // 检查删除权限
    if (!hasPermission('stock_in', 'delete')) {
      toast.error('您没有删除入库单的权限');
      return;
    }
    
    if (!window.confirm('确定要删除此入库单吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      // 删除入库单关联的项目
      const orderItems = stockInItemService.getAll().filter(item => item.orderId === id);
      orderItems.forEach(item => stockInItemService.delete(item.id));
      
      // 删除入库单
      const deleted = stockInService.delete(id);
      
      if (deleted) {
        // 更新UI显示
        loadAllData();
        toast.success('入库单已成功删除');
      } else {
        toast.error('删除入库单失败，请重试');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除入库单时发生错误';
      console.error('删除入库单失败:', errorMessage);
      toast.error(`删除失败: ${errorMessage}`);
    }
  };
  
  // 获取项目名称
  const getProjectName = (id?: string) => {
    if (!id) return '无';
    const project = projects.find(p => p.id === id);
    return project ? project.name : '未知项目';
  };
  
  // 获取入库单状态中文
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'draft': '草稿',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  };
  
  // 获取状态标签样式
  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classMap[status] || 'bg-gray-100 text-gray-800';
  };
  
  // 计算入库单总金额
  const calculateOrderTotal = (orderId: string) => {
    const items = stockInItemService.getAll().filter(item => item.orderId === orderId);
    return items.reduce((total, item) => total + item.totalPrice, 0);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">入库管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理材料入库记录，包括创建入库单和查询入库历史</p>
        </div>
        
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'create' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-plus-circle mr-2"></i>创建入库单
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'query' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-search mr-2"></i>入库记录查询
            </button>
          </nav>
        </div>
        
        {/* 创建入库单表单 */}
        {activeTab === 'create' && (
          <div className="p-5">
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreateModal}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <i className="fa-solid fa-plus mr-1"></i>新增入库单
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-base font-medium text-gray-900 mb-3">入库单创建说明</h3>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                <li>点击"新增入库单"按钮创建新的入库记录</li>
                <li>选择供应商、入库日期和相关项目（可选）</li>
                <li>添加入库材料明细，包括材料名称、规格、数量和单价</li>
                <li>入库单状态为"已完成"时将自动更新库存数量</li>
                <li>入库单创建后可在"入库记录查询"中查看和管理</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* 入库记录查询 */}
        {activeTab === 'query' && (
          <div className="p-5">
            {/* 搜索条件 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-base font-medium text-gray-900 mb-3">查询条件</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
                  <input
                    type="date"
                    name="startDate"
                    value={searchCriteria.startDate || ''}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                  <input
                    type="date"
                    name="endDate"
                    value={searchCriteria.endDate || ''}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">材料类型</label>
                  <select
                    name="materialType"
                    value={searchCriteria.materialType || ''}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- 全部类型 --</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                  <select
                    name="supplierId"
                    value={searchCriteria.supplierId || ''}
                    onChange={handleSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- 全部供应商 --</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
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
                  onClick={applySearchFilters}
                  className="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <i className="fa-solid fa-search mr-1"></i>查询
                </button>
              </div>
            </div>
            
            {/* 入库单列表 */}
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">入库单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">入库日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">关联项目</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{order.orderNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{getSupplierName(order.supplierId)}</td>
                         <td className="px-6 py-4 whitespace-nowrap">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getProjectName(order.projectId)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ¥{calculateOrderTotal(order.id).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                             <button 
                               onClick={() => openEditModal(order)}
                               disabled={!hasPermission('stock_in', 'edit')}
                               className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                             >
                               <i className="fa-solid fa-edit mr-1"></i>查看/编辑
                             </button>
                             <button 
                               onClick={() => deleteStockInOrder(order.id)}
                               disabled={!hasPermission('stock_in', 'delete')}
                               className="text-red-600 hover:text-red-900 disabled:opacity-50"
                             >
                               <i className="fa-solid fa-trash mr-1"></i>删除
                             </button>
                           </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {Object.keys(searchCriteria).length > 0 ? '没有找到符合条件的入库记录' : '暂无入库记录，请创建新的入库单'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* 入库单编辑模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? '编辑入库单' : '新增入库单'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <form className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
                      <input
                        type="text"
                        value={formData.orderNumber}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">供应商 <span className="text-red-500">*</span></label>
                    <select
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      className={`w-full px-3 py-2 border ${formErrors.supplierId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    >
                      <option value="">-- 请选择供应商 --</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.supplierId && <p className="mt-1 text-sm text-red-600">{formErrors.supplierId}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">入库日期 <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                      className={`w-full px-3 py-2 border ${formErrors.orderDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                    {formErrors.orderDate && <p className="mt-1 text-sm text-red-600">{formErrors.orderDate}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
                    <select
                      name="projectId"
                      value={formData.projectId}
                      onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- 无关联项目 --</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    name="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'completed' | 'cancelled' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="draft">草稿</option>
                    <option value="completed">已完成</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
                
                {/* 材料明细 */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">入库材料明细 <span className="text-red-500">*</span></label>
                    <button
                      type="button"  
                      onClick={addStockInItem}
                      className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <i className="fa-solid fa-plus mr-1"></i>添加材料
                    </button>
                  </div>
                  
                  {formErrors.items && <p className="mt-1 text-sm text-red-600 mb-3">{formErrors.items}</p>}
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料名称</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">规格型号</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单价(元)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总价(元)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">备注</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {formData.items.length > 0 ? (
                          formData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <select
                                  value={item.materialId}
                                  onChange={(e) => updateStockInItem(index, 'materialId', e.target.value)}
                                  className={`w-full px-3 py-2 border ${formErrors[`item_${index}_material`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                >
                                  <option value="">-- 请选择材料 --</option>
                                  {materials.map(material => (
                                    <option key={material.id} value={material.id}>
                                      {material.name}
                                    </option>
                                  ))}
                                </select>
                                {formErrors[`item_${index}_material`] && <p className="mt-1 text-xs text-red-600">{formErrors[`item_${index}_material`]}</p>}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {item.material?.specification || '-'}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {item.material?.unit || '-'}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateStockInItem(index, 'quantity', parseFloat(e.target.value))}
                                  className={`w-full px-3 py-2 border ${formErrors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                />
                                {formErrors[`item_${index}_quantity`] && <p className="mt-1 text-xs text-red-600">{formErrors[`item_${index}_quantity`]}</p>}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateStockInItem(index, 'unitPrice', parseFloat(e.target.value))}
                                  className={`w-full px-3 py-2 border ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                />
                                {formErrors[`item_${index}_price`] && <p className="mt-1 text-xs text-red-600">{formErrors[`item_${index}_price`]}</p>}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                {item.totalPrice.toFixed(2)}
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <input
                                  type="text"
                                  value={item?.notes || ''}
                                  onChange={(e) => updateStockInItem(index, 'notes', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('确定要删除这项材料吗？')) {
                                      const newItems = [...formData.items];
                                      newItems.splice(index, 1);
                                      setFormData(prev => ({ ...prev, items: newItems }));
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                              暂无材料明细，请点击"添加材料"按钮
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={saveStockInOrder}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? '更新入库单' : '保存入库单'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}