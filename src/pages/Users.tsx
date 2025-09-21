import { useState, useEffect, useContext } from 'react';
import { User } from '@/models/User';
import { userService } from '@/services/userService';
import UserForm from '@/components/users/UserForm';
import { AuthContext } from '@/contexts/authContext';
import { toast } from 'sonner';
import DashboardSection from '@/components/dashboard/DashboardSection';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { currentUser: authUser, hasPermission } = useContext(AuthContext);
  
  // 加载用户列表
  const loadUsers = () => {
    setIsLoading(true);
    try {
      const allUsers = userService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      toast.error('加载用户失败: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初始化加载
  useEffect(() => {
    // 检查权限
    if (!hasPermission('users', 'manage_users')) {
      toast.error('您没有管理用户的权限');
      return;
    }
    
    loadUsers();
    
    // 初始化默认管理员用户（如果不存在）
    try {
      userService.initializeDefaultAdmin();
    } catch (error) {
      console.log('管理员已初始化');
    }
  }, []);
  
  // 打开创建用户模态框
  const openCreateModal = () => {
    setCurrentUser(null);
    setIsModalOpen(true);
  };
  
  // 打开编辑用户模态框
  const openEditModal = (user: User) => {
    setCurrentUser(user);
    setIsModalOpen(true);
  };
  
  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
  };
  
  // 保存用户
  const saveUser = (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (currentUser) {
        // 更新用户
        const updatedUser = userService.updateUser(currentUser.id, userData);
        if (updatedUser) {
          toast.success('用户更新成功');
          loadUsers();
          closeModal();
        } else {
          toast.error('用户更新失败');
        }
      } else {
        // 创建新用户
        userService.createUser(userData);
        toast.success('用户创建成功');
        loadUsers();
        closeModal();
      }
    } catch (error) {
      toast.error('保存用户失败: ' + (error as Error).message);
    }
  };
  
   // 删除用户
  const deleteUser = (id: string) => {
    // 检查删除权限
    if (!hasPermission('users', 'delete')) {
      toast.error('您没有删除用户的权限');
      return;
    }
    
    if (!window.confirm('确定要删除此用户吗？')) return;
    
    try {
      // 不能删除自己
      if (authUser && id === authUser.id) {
        toast.error('不能删除当前登录用户');
        return;
      }
      
      const success = userService.deleteUser(id);
      if (success) {
        toast.success('用户删除成功');
        loadUsers();
      } else {
        toast.error('用户删除失败');
      }
    } catch (error) {
      toast.error('删除用户失败: ' + (error as Error).message);
    }
  };
  
  // 切换用户状态
  const toggleUserStatus = (id: string) => {
    try {
      // 不能禁用自己
      if (authUser && id === authUser.id) {
        toast.error('不能禁用当前登录用户');
        return;
      }
      
      const user = userService.getUserById(id);
      if (user) {
        userService.toggleUserStatus(id);
        toast.success(`用户已${user.isActive ? '禁用' : '启用'}`);
        loadUsers();
      }
    } catch (error) {
      toast.error('操作失败: ' + (error as Error).message);
    }
  };
  
  // 角色标签样式
  const getRoleClass = (role: string) => {
    const roleClasses: Record<string, string> = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'staff': 'bg-green-100 text-green-800'
    };
    
    return roleClasses[role] || 'bg-gray-100 text-gray-800';
  };
  
  // 角色名称映射
  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      'admin': '管理员',
      'manager': '经理',
      'staff': '普通员工'
    };
    
    return roleNames[role] || role;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <button
          onClick={openCreateModal}
          disabled={!hasPermission('users', 'manage_users')}
          className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <i className="fa-solid fa-plus mr-1"></i>新增用户
        </button>
      </div>
      
      <DashboardSection title="用户列表">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <i className="fa-solid fa-spinner fa-spin text-blue-600 text-2xl"></i>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-10">
            <i className="fa-solid fa-user-friends text-gray-400 text-4xl mb-2"></i>
            <p className="text-gray-500">暂无用户数据，请点击"新增用户"按钮添加</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={!user.isActive ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={!hasPermission('users', 'edit')}
                          className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                        >
                         <i className="fa-solid fa-edit mr-1"></i>编辑
                       </button>
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          disabled={!hasPermission('users', 'edit') || (authUser && user.id === authUser.id)}
                          className={`${
                            user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                          } mr-4 disabled:opacity-50`}
                        >
                         <i className={`fa-solid ${user.isActive ? 'fa-ban' : 'fa-check'} mr-1`}></i>
                         {user.isActive ? '禁用' : '启用'}
                       </button>
                        {hasPermission('users', 'delete') && (
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={(authUser && user.id === authUser.id)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            <i className="fa-solid fa-trash mr-1"></i>删除
                          </button>
                        )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>
      
      {/* 用户编辑/创建模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentUser ? '编辑用户' : '创建新用户'}
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
              <UserForm
                user={currentUser || undefined}
                onSave={saveUser}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}