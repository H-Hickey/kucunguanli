import { z } from 'zod';

// 定义权限类型
export type Permission = 'view' | 'edit' | 'delete' | 'manage_users' | 'manage_settings';

// 定义模块类型
export type Module = 'dashboard' | 'inventory' | 'stock_in' | 'stock_out' | 'reports' | 'users';

// 定义权限配置接口
export interface PermissionConfig {
  [module: string]: Permission[];
}

// 定义角色类型
export type Role = 'admin' | 'manager' | 'staff';

// 用户接口
export interface User {
  id: string;
  username: string;
  password: string; // 在实际应用中应存储加密后的密码
  name: string;
  email: string;
  role: Role;
  permissions: PermissionConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 默认角色权限配置
export const DEFAULT_PERMISSIONS: Record<Role, PermissionConfig> = {
  admin: {
    dashboard: ['view'],
    inventory: ['view', 'edit', 'delete'],
    stock_in: ['view', 'edit', 'delete'],
    stock_out: ['view', 'edit', 'delete'],
    reports: ['view'],
    users: ['view', 'edit', 'delete', 'manage_users']
  },
  manager: {
    dashboard: ['view'],
    inventory: ['view', 'edit'],
    stock_in: ['view', 'edit'],
    stock_out: ['view', 'edit'],
    reports: ['view'],
    users: ['view']
  },
  staff: {
    dashboard: ['view'],
    inventory: ['view'],
    stock_in: ['view', 'edit'],
    stock_out: ['view', 'edit'],
    reports: [],
    users: []
  }
};

// 用户验证schema
export const userSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(2, '姓名不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
  role: z.enum(['admin', 'manager', 'staff']),
  isActive: z.boolean()
});

// 生成默认权限
export const generateDefaultPermissions = (role: Role): PermissionConfig => {
  return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[role]));
}