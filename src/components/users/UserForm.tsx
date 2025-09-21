import { useState, useEffect } from 'react';
import { User, Role } from '@/models/User';
import { toast } from 'sonner';

interface UserFormProps {
  user?: User;
  onSave: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'staff' as Role,
    isActive: true,
    permissions: {} as User['permissions']
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const isEditMode = !!user;
  
  // 角色选项
  const roleOptions: Array<{ value: Role; label: string }> = [
    { value: 'admin', label: '管理员' },
    { value: 'manager', label: '经理' },
    { value: 'staff', label: '普通员工' }
  ];
  
  // 模块权限配置
  const modules = [
    { key: 'dashboard', name: '仪表盘', permissions: ['view'] },
    { key: 'inventory', name: '库存管理', permissions: ['view', 'edit', 'delete'] },
    { key: 'stock_in', name: '入库管理', permissions: ['view', 'edit', 'delete'] },
    { key: 'stock_out', name: '出库管理', permissions: ['view', 'edit', 'delete'] },
    { key: 'reports', name: '报表分析', permissions: ['view'] },
    { key: 'users', name: '用户管理', permissions: ['view', 'edit', 'delete', 'manage_users'] }
  ];
  
  // 初始化表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || {}
      });
    }
  }, [user]);
  
  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
  
  // 处理角色变化
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as Role;
    setFormData(prev => ({ ...prev, role }));
  };
  
  // 处理权限变化
  const handlePermissionChange = (module: string, permission: string) => {
    setFormData(prev => {
      const modulePermissions = prev.permissions[module] || [];
      const newPermissions = { ...prev.permissions };
      
      if (modulePermissions.includes(permission)) {
        // 移除权限
        newPermissions[module] = modulePermissions.filter(p => p !== permission);
      } else {
        // 添加权限
        newPermissions[module] = [...modulePermissions, permission];
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };
  
  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // 必填字段验证
    if (!formData.username.trim()) {
      errors.username = '用户名不能为空';
    }
    
    if (!isEditMode && !formData.password.trim()) {
      errors.password = '密码不能为空';
    }
    
    if (!formData.name.trim()) {
      errors.name = '姓名不能为空';
    }
    
    // 邮箱格式验证
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      // 准备提交的数据
      const userData = {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        permissions: formData.permissions,
        // 只有新建用户或修改密码时才包含密码
        ...(formData.password && { password: formData.password })
      };
      
      onSave(userData);
    } catch (error) {
      toast.error('保存用户失败: ' + (error as Error).message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">用户名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            disabled={isEditMode}
            className={`w-full px-3 py-2 border ${formErrors.username ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder="请输入用户名"
          />
          {formErrors.username && <p className="mt-1 text-sm text-red-600">{formErrors.username}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isEditMode ? '新密码' : '密码'} {!isEditMode && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              placeholder={isEditMode ? "不修改请留空" : "请输入密码"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder="请输入姓名"
          />
          {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            placeholder="请输入邮箱地址"
          />
          {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">角色 <span className="text-red-500">*</span></label>
          <select
            name="role"
            value={formData.role}
            onChange={handleRoleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {roleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              {formData.isActive ? '启用' : '禁用'}
            </label>
          </div>
        </div>
      </div>
      
      {/* 权限设置 */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">权限设置</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          {modules.map(module => (
            <div key={module.key} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{module.name}</h4>
              <div className="flex flex-wrap gap-3">
                {module.permissions.map(permission => {
                  // 权限名称映射
                  const permissionLabels: Record<string, string> = {
                    'view': '查看',
                    'edit': '编辑',
                    'delete': '删除',
                    'manage_users': '管理用户'
                  };
                  
                  return (
                    <div key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`${module.key}-${permission}`}
                        checked={formData.permissions[module.key]?.includes(permission) || false}
                        onChange={() => handlePermissionChange(module.key, permission)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`${module.key}-${permission}`}
                        className="ml-2 block text-sm text-gray-700"
                      >
                        {permissionLabels[permission] || permission}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          {isEditMode ? '更新用户' : '创建用户'}
        </button>
      </div>
    </form>
  );
}