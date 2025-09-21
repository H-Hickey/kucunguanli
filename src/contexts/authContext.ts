import { createContext, ReactNode } from "react";
import { User, Permission, Module } from "@/models/User";

// 定义权限检查函数类型
type CheckPermission = (module: Module, permission: Permission) => boolean;

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  setIsAuthenticated: (user: User) => void;
  logout: () => void;
  hasPermission: CheckPermission;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  currentUser: null,
  setIsAuthenticated: () => {},
  logout: () => {},
  hasPermission: () => false,
});

// 权限检查Hook
export const usePermissions = (currentUser: User | null) => {
  const hasPermission: CheckPermission = (module, permission) => {
    if (!currentUser || !currentUser.isActive) return false;
    
    // 管理员拥有所有权限
    if (currentUser.role === 'admin') return true;
    
    // 检查用户是否有指定模块的指定权限
    return currentUser.permissions[module]?.includes(permission) || false;
  };
  
  return { hasPermission };
};