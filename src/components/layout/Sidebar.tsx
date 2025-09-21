import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
}

export default function Sidebar({ isCollapsed }: SidebarProps) {
  const { currentUser } = useContext(AuthContext);
  const navItems = [
    { name: '仪表盘', path: '/dashboard', icon: 'fa-tachometer-alt' },
    { name: '基础数据管理', path: '/basic-data', icon: 'fa-database' },
    { name: '入库管理', path: '/stock-in', icon: 'fa-box-open' },
    { name: '出库管理', path: '/stock-out', icon: 'fa-sign-out-alt' },
    { name: '库存管理', path: '/inventory', icon: 'fa-warehouse' },
    { name: '用户管理', path: '/users', icon: 'fa-users' },
  ];

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      <div className={`flex items-center justify-center h-16 border-b border-gray-200 ${isCollapsed ? 'px-4' : 'px-6'}`}>
        {!isCollapsed && <h1 className="text-xl font-bold text-blue-600">材料管理系统</h1>}
        {isCollapsed && <i class="fa-solid fa-cubes text-blue-600 text-xl"></i>}
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <i class={`fa-solid ${item.icon} mr-3`}></i>
            {!isCollapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      
           <div className="p-4 border-t border-gray-200">
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
      <i class="fa-solid fa-user-circle text-gray-500 text-xl"></i>
      {!isCollapsed && (
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-700">{currentUser?.name || '用户'}</p>
          <p className="text-xs text-gray-500">{currentUser?.username}</p>
        </div>
      )}
    </div>
  </div>
    </div>
  );
}