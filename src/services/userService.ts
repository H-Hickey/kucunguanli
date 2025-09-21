import { User, generateDefaultPermissions } from '@/models/User';

// 生成唯一ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// 用户服务类
export class UserService {
  private key: string = 'users';
  
  // 获取所有用户
  getAllUsers(): User[] {
    const users = localStorage.getItem(this.key);
    return users ? JSON.parse(users) : [];
  }
  
  // 获取用户 by ID
  getUserById(id: string): User | null {
    const users = this.getAllUsers();
    const user = users.find((user: User) => user.id === id);
    return user || null;
  }
  
  // 获取用户 by 用户名
  getUserByUsername(username: string): User | null {
    const users = this.getAllUsers();
    const user = users.find((user: User) => user.username === username);
    return user || null;
  }
  
  // 创建新用户
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const users = this.getAllUsers();
    
    // 检查用户名是否已存在
    const existingUser = this.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }
    
    const now = new Date().toISOString();
    
    // 创建新用户
    const newUser: User = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      ...userData,
      // 如果没有提供权限，生成默认权限
      permissions: userData.permissions || generateDefaultPermissions(userData.role)
    };
    
    // 保存到localStorage
    users.push(newUser);
    localStorage.setItem(this.key, JSON.stringify(users));
    
    return newUser;
  }
  
  // 更新用户
  updateUser(id: string, userData: Partial<User>): User | null {
    const users = this.getAllUsers();
    const index = users.findIndex((user: User) => user.id === id);
    
    if (index === -1) return null;
    
    // 更新用户信息
    const updatedUser = {
      ...users[index],
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    users[index] = updatedUser;
    localStorage.setItem(this.key, JSON.stringify(users));
    
    return updatedUser;
  }
  
  // 删除用户
  deleteUser(id: string): boolean {
    const users = this.getAllUsers();
    const newUsers = users.filter((user: User) => user.id !== id);
    
    if (users.length === newUsers.length) return false;
    
    localStorage.setItem(this.key, JSON.stringify(newUsers));
    return true;
  }
  
  // 更新用户权限
  updateUserPermissions(id: string, permissions: User['permissions']): User | null {
    return this.updateUser(id, { permissions, updatedAt: new Date().toISOString() });
  }
  
  // 切换用户激活状态
  toggleUserStatus(id: string): User | null {
    const user = this.getUserById(id);
    if (!user) return null;
    
    return this.updateUser(id, { isActive: !user.isActive });
  }
  
  // 初始化默认管理员用户
  initializeDefaultAdmin(): void {
    const users = this.getAllUsers();
    if (users.length === 0) {
      // 创建默认管理员
      this.createUser({
        username: 'admin',
        password: 'admin123', // 在实际应用中应使用加密密码
        name: '系统管理员',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        permissions: generateDefaultPermissions('admin')
      });
    }
  }
}

// 创建用户服务实例
export const userService = new UserService();