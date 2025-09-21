import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/authContext';

// 定义通知接口
interface Notification {
  id: number;
  type: 'warning' | 'reminder';
  title: string;
  message: string;
  isRead: boolean;
  icon: string;
  color: string;
}

interface HeaderProps {
  title: string;
  onSidebarToggle: () => void;
}

export default function Header({ title, onSidebarToggle }: HeaderProps) {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      type: 'warning',
      title: '低库存预警',
      message: '电线库存低于设定阈值，请及时补充',
      isRead: false,
      icon: 'fa-exclamation-triangle',
      color: 'text-yellow-500'
    },
    {
      id: 2,
      type: 'warning',
      title: '低库存预警',
      message: '木板库存低于设定阈值，请及时补充',
      isRead: false,
      icon: 'fa-exclamation-triangle',
      color: 'text-yellow-500'
    },
    {
      id: 3,
      type: 'reminder',
      title: '库存盘点提醒',
      message: '本月库存盘点尚未完成，请尽快处理',
      isRead: false,
      icon: 'fa-calendar-alt',
      color: 'text-blue-500'
    }
  ]);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // 计算未读通知数量
  const unreadCount = notifications.filter(notification => !notification.isRead).length;
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // 标记通知为已读
  const markAsRead = (id: number) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };
  
  // 标记所有通知为已读
  const markAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, isRead: true }))
    );
  };
  
  // 点击外部关闭通知框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current && 
        !notificationRef.current.contains(event.target as Node) &&
        notificationsOpen
      ) {
        setNotificationsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              onClick={onSidebarToggle}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              aria-label="打开侧边栏"
            >
              <i class="fa-solid fa-bars"></i>
            </button>
            
            <div className="ml-4 flex items-center md:ml-6">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
          </div>
          
          <div className="flex items-center relative" ref={notificationRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 relative transition-colors"
              aria-label="查看通知"
            >
              <i class="fa-solid fa-bell"></i>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <div className="absolute right-4 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200 animate-fadeIn">
                <div className="px-4 py-2 flex justify-between items-center text-sm font-medium text-gray-900 border-b border-gray-100">
                  <h3>通知</h3>
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    全部标为已读
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`block px-4 py-3 text-sm hover:bg-gray-100 border-b border-gray-100 cursor-pointer ${
                        !notification.isRead ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <i className={`fa-solid ${notification.icon} ${notification.color} mt-1`}></i>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium">{notification.title}</p>
                            {!notification.isRead && (
                              <span className="inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{notification.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <a href="#" className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 text-center">
                  查看所有通知
                </a>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="ml-4 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
              aria-label="退出登录"
            >
              <i class="fa-solid fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}