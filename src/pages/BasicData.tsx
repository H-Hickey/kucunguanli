import { useState, useEffect } from 'react';
import { 
  categoryService, 
  materialService, 
  projectService, 
  supplierService 
} from '@/services/localStorageService';
import { Category } from '@/models/Category';
import { Material } from '@/models/Material';
import { Project } from '@/models/Project';
import { Supplier } from '@/models/Supplier';
import DashboardSection from '@/components/dashboard/DashboardSection';
import { cn } from '@/lib/utils';

// 定义标签页类型
type TabType = 'categories' | 'materials' | 'projects' | 'suppliers';

export default function BasicData() {
  // 状态管理
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 加载数据
  useEffect(() => {
    loadAllData();
  }, []);

  // 加载所有数据
  const loadAllData = () => {
    setCategories(categoryService.getAll());
    setMaterials(materialService.getAll());
    setProjects(projectService.getAll());
    setSuppliers(supplierService.getAll());
  };

  // 切换标签页
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    resetForm();
  };

  // 打开新增/编辑模态框
  const openModal = (item?: any, isEdit = false) => {
    setIsModalOpen(true);
    setIsEditing(isEdit);
    
    if (isEdit && item) {
      setCurrentItem(item);
      setFormData({ ...item });
    } else {
      setCurrentItem(null);
      resetForm();
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setFormData(getDefaultFormData());
    setFormErrors({});
  };

  // 获取默认表单数据
  const getDefaultFormData = () => {
    switch (activeTab) {
      case 'categories':
        return { name: '', description: '', parentId: '' };
      case 'materials':
        return { 
          name: '', 
          specification: '', 
          categoryId: '', 
          unit: '', 
          supplierId: '', 
          referencePrice: 0,
          description: ''
        };
      case 'projects':
        return { 
          name: '', 
          address: '', 
          manager: '', 
          managerContact: '', 
          startDate: new Date().toISOString().split('T')[0], 
          endDate: '',
          status: 'planning',
          description: ''
        };
      case 'suppliers':
        return { 
          name: '', 
          contactPerson: '', 
          phone: '', 
          email: '', 
          address: '',
          description: ''
        };
      default:
        return {};
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    switch (activeTab) {
      case 'categories':
        if (!formData.name) errors.name = '分类名称不能为空';
        break;
      case 'materials':
        if (!formData.name) errors.name = '材料名称不能为空';
        if (!formData.specification) errors.specification = '规格型号不能为空';
        if (!formData.categoryId) errors.categoryId = '请选择材料分类';
        if (!formData.unit) errors.unit = '单位不能为空';
        if (!formData.referencePrice || isNaN(Number(formData.referencePrice))) {
          errors.referencePrice = '请输入有效的参考单价';
        }
        break;
      case 'projects':
        if (!formData.name) errors.name = '项目名称不能为空';
        if (!formData.address) errors.address = '项目地址不能为空';
        if (!formData.manager) errors.manager = '项目经理不能为空';
        if (!formData.managerContact) errors.managerContact = '联系方式不能为空';
        if (!formData.startDate) errors.startDate = '开工日期不能为空';
        break;
      case 'suppliers':
        if (!formData.name) errors.name = '供应商名称不能为空';
        if (!formData.contactPerson) errors.contactPerson = '联系人不能为空';
        if (!formData.phone) errors.phone = '联系电话不能为空';
        break;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 保存数据
  const saveData = () => {
    if (!validateForm()) return;
    
    try {
      switch (activeTab) {
        case 'categories':
          if (isEditing && currentItem) {
            categoryService.update(currentItem.id, formData);
          } else {
            categoryService.create(formData);
          }
          setCategories(categoryService.getAll());
          break;
        case 'materials':
          if (isEditing && currentItem) {
            materialService.update(currentItem.id, formData);
          } else {
            materialService.create(formData);
          }
          setMaterials(materialService.getAll());
          break;
        case 'projects':
          if (isEditing && currentItem) {
            projectService.update(currentItem.id, formData);
          } else {
            projectService.create(formData);
          }
          setProjects(projectService.getAll());
          break;
        case 'suppliers':
          if (isEditing && currentItem) {
            supplierService.update(currentItem.id, formData);
          } else {
            supplierService.create(formData);
          }
          setSuppliers(supplierService.getAll());
          break;
      }
      
      closeModal();
    } catch (error) {
      console.error('保存数据失败:', error);
      alert('保存数据失败，请重试');
    }
  };

  // 删除数据
  const deleteData = (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      switch (activeTab) {
        case 'categories':
          categoryService.delete(id);
          setCategories(categoryService.getAll());
          break;
        case 'materials':
          materialService.delete(id);
          setMaterials(materialService.getAll());
          break;
        case 'projects':
          projectService.delete(id);
          setProjects(projectService.getAll());
          break;
        case 'suppliers':
          supplierService.delete(id);
          setSuppliers(supplierService.getAll());
          break;
      }
    } catch (error) {
      console.error('删除数据失败:', error);
      alert('删除数据失败，请重试');
    }
  };

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'categories':
        return renderCategoryTable();
      case 'materials':
        return renderMaterialTable();
      case 'projects':
        return renderProjectTable();
      case 'suppliers':
        return renderSupplierTable();
      default:
        return null;
    }
  };

  // 渲染分类表格
  const renderCategoryTable = () => (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">父分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">描述</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap">{category.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {category.parentId ? categories.find(c => c.id === category.parentId)?.name || '未知' : '无'}
                </td>
                <td className="px-6 py-4">{category.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => openModal(category, true)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <i className="fa-solid fa-edit mr-1"></i>编辑
                  </button>
                  <button 
                    onClick={() => deleteData(category.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <i className="fa-solid fa-trash mr-1"></i>删除
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">暂无分类数据，请点击"新增"按钮添加</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  // 渲染材料表格
  const renderMaterialTable = () => (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">材料名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">规格型号</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">参考单价</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material.id}>
                <td className="px-6 py-4 whitespace-nowrap">{material.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{material.specification}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {categories.find(c => c.id === material.categoryId)?.name || '未知'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{material.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap">¥{Number(material.referencePrice).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => openModal(material, true)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <i className="fa-solid fa-edit mr-1"></i>编辑
                  </button>
                  <button 
                    onClick={() => deleteData(material.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <i className="fa-solid fa-trash mr-1"></i>删除
                  </button>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">暂无材料数据，请点击"新增"按钮添加</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  // 渲染项目表格
  const renderProjectTable = () => (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目经理</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开工日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => {
              // 格式化日期
              const startDate = new Date(project.startDate).toLocaleDateString();
              const endDate = project.endDate ? new Date(project.endDate).toLocaleDateString() : '未设置';
              
              // 状态中文显示
              const statusMap: Record<string, string> = {
                'planning': '规划中',
                'in_progress': '进行中',
                'completed': '已完成',
                'cancelled': '已取消'
              };
              
              return (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{project.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{project.manager}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{startDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statusMap[project.status] || project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => openModal(project, true)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <i className="fa-solid fa-edit mr-1"></i>编辑
                    </button>
                    <button 
                      onClick={() => deleteData(project.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <i className="fa-solid fa-trash mr-1"></i>删除
                    </button>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">暂无项目数据，请点击"新增"按钮添加</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  // 渲染供应商表格
  const renderSupplierTable = () => (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系人</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">联系电话</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-6 py-4 whitespace-nowrap">{supplier.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{supplier.contactPerson}</td>
                <td className="px-6 py-4 whitespace-nowrap">{supplier.phone}</td>
                <td className="px-6 py-4">{supplier.address || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => openModal(supplier, true)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <i className="fa-solid fa-edit mr-1"></i>编辑
                  </button>
                  <button 
                    onClick={() => deleteData(supplier.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <i className="fa-solid fa-trash mr-1"></i>删除
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">暂无供应商数据，请点击"新增"按钮添加</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  // 渲染表单
  const renderForm = () => {
    switch (activeTab) {
      case 'categories':
        return renderCategoryForm();
      case 'materials':
        return renderMaterialForm();
      case 'projects':
        return renderProjectForm();
      case 'suppliers':
        return renderSupplierForm();
      default:
        return null;
    }
  };

  // 渲染分类表单
  const renderCategoryForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">分类名称 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">父分类</label>
        <select
          name="parentId"
          value={formData.parentId || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- 无父分类 --</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
    </div>
  );

  // 渲染材料表单
  const renderMaterialForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">材料名称 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">规格型号 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="specification"
          value={formData.specification || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.specification ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.specification && <p className="mt-1 text-sm text-red-600">{formErrors.specification}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">材料分类 <span className="text-red-500">*</span></label>
        <select
          name="categoryId"
          value={formData.categoryId || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.categoryId ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        >
          <option value="">-- 请选择分类 --</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {formErrors.categoryId && <p className="mt-1 text-sm text-red-600">{formErrors.categoryId}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">单位 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="unit"
          value={formData.unit || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.unit ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          placeholder="如：个、米、卷、桶等"
        />
        {formErrors.unit && <p className="mt-1 text-sm text-red-600">{formErrors.unit}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
        <select
          name="supplierId"
          value={formData.supplierId || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- 请选择供应商 --</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">参考单价 <span className="text-red-500">*</span></label>
        <input
          type="number"
          name="referencePrice"
          value={formData.referencePrice || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.referencePrice ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          step="0.01"
          min="0"
        />
        {formErrors.referencePrice && <p className="mt-1 text-sm text-red-600">{formErrors.referencePrice}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
    </div>
  );

  // 渲染项目表单
  const renderProjectForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目名称 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目地址 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.address ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.address && <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目经理 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="manager"
          value={formData.manager || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.manager ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.manager && <p className="mt-1 text-sm text-red-600">{formErrors.manager}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">联系方式 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="managerContact"
          value={formData.managerContact || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.managerContact ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.managerContact && <p className="mt-1 text-sm text-red-600">{formErrors.managerContact}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开工日期 <span className="text-red-500">*</span></label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate || ''}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${formErrors.startDate ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          />
          {formErrors.startDate && <p className="mt-1 text-sm text-red-600">{formErrors.startDate}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">竣工日期</label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目状态</label>
        <select
          name="status"
          value={formData.status || 'planning'}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="planning">规划中</option>
          <option value="in_progress">进行中</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目描述</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
    </div>
  );

  // 渲染供应商表单
  const renderSupplierForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="contactPerson"
          value={formData.contactPerson || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.contactPerson ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.contactPerson && <p className="mt-1 text-sm text-red-600">{formErrors.contactPerson}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
        <input
          type="text"
          name="phone"
          value={formData.phone || ''}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
        />
        {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">电子邮箱</label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleInputChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>
    </div>
  );

  // 获取当前标签页标题
  const getTabTitle = () => {
    const titles: Record<TabType, string> = {
      'categories': '材料分类',
      'materials': '材料信息',
      'projects': '项目信息',
      'suppliers': '供应商信息'
    };
    return titles[activeTab];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">基础数据管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理系统中的基础数据信息，包括材料分类、材料信息、项目信息和供应商信息</p>
        </div>
        
        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('categories')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'categories' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-sitemap mr-2"></i>材料分类
            </button>
            <button
              onClick={() => handleTabChange('materials')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'materials' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-cubes mr-2"></i>材料信息
            </button>
            <button
              onClick={() => handleTabChange('projects')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'projects' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-building mr-2"></i>项目信息
            </button>
            <button
              onClick={() => handleTabChange('suppliers')}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                activeTab === 'suppliers' 
                  ? "border-blue-500 text-blue-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <i className="fa-solid fa-truck mr-2"></i>供应商信息
            </button>
          </nav>
        </div>
        
        {/* 内容区域 */}
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-gray-900">{getTabTitle()}管理</h3>
            <button
              onClick={() => openModal(null, false)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <i className="fa-solid fa-plus mr-1"></i>新增{getTabTitle()}
            </button>
          </div>
          
          {renderTabContent()}
        </div>
      </div>
      
      {/* 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditing ? '编辑' : '新增'}{getTabTitle()}
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
              {renderForm()}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                onClick={saveData}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}