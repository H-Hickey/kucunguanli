import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  
  // Get page title based on current path
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return '仪表盘';
      case '/basic-data':
        return '基础数据管理';
      case '/stock-in':
        return '入库管理';
      case '/stock-out':
        return '出库管理';
      case '/inventory':
        return '库存管理';
      case '/reports':
        return '报表分析';
      default:
        return '材料管理系统';
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div 
        className={`${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out`}
      >
        <Sidebar isCollapsed={sidebarCollapsed} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header 
          title={getPageTitle()} 
          onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}