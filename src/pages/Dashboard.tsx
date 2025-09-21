import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardSection from '@/components/dashboard/DashboardSection';
import StatCard from '@/components/dashboard/StatCard';
import ChartCard from '@/components/dashboard/ChartCard';
import ActivityItem from '@/components/dashboard/ActivityItem';
import AlertItem from '@/components/dashboard/AlertItem';
import { useInventory } from '@/pages/Inventory';
import { inventoryTransactionService } from '@/services/localStorageService';
import { InventoryTransaction } from '@/models/Inventory';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

export default function Dashboard() {
  const { inventories, materials, categories, isLoading, refreshInventory } = useInventory();
  const [stockData, setStockData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Format date to relative time (e.g. "今天 09:30", "昨天 14:20")
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  // Load and process dashboard data
  const loadDashboardData = () => {
    if (isLoading) return;
    
    setSyncStatus('syncing');
    
    try {
      // Get category-based stock data
      const categoryStockData = categories.map(category => {
        const categoryInventories = inventories.filter(
          inv => materials.find(m => m.id === inv.materialId)?.categoryId === category.id
        );
        
        const totalQuantity = categoryInventories.reduce(
          (sum, inv) => sum + inv.quantity, 0
        );
        
        return {
          name: category.name,
          value: totalQuantity
        };
      }).filter(item => item.value > 0);
      
      setStockData(categoryStockData);
      
      // Get recent activities from transactions
      const transactions = inventoryTransactionService.getAll()
        .sort((a: InventoryTransaction, b: InventoryTransaction) => 
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        )
        .slice(0, 5);
      
      const activities = transactions.map((transaction, index) => {
        const material = materials.find(m => m.id === transaction.materialId);
        const typeMap = {
          'stock_in': '入库',
          'stock_out': '出库',
          'adjustment': '调整'
        };
        
        return {
          id: index + 1,
          type: typeMap[transaction.type] || transaction.type,
          material: material?.name || '未知材料',
          quantity: Math.abs(transaction.quantity),
          date: formatRelativeDate(transaction.transactionDate),
          operator: transaction.createdBy || '系统'
        };
      });
      
      setRecentActivities(activities);
      
      // Get low stock alerts
      const alerts = inventories
        .filter(inv => inv.quantity <= inv.alertThreshold)
        .map(inv => {
          const material = materials.find(m => m.id === inv.materialId);
          return {
            name: material?.name || '未知材料',
            current: inv.quantity,
            threshold: inv.alertThreshold,
            unit: material?.unit || '个',
            id: inv.id
          };
        })
        .slice(0, 5);
      
      setLowStockAlerts(alerts);
      
      setLastSynced(new Date());
      setSyncStatus('synced');
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('加载仪表盘数据失败');
      setSyncStatus('idle');
    }
  };

  // Initial data load and event listener setup
  useEffect(() => {
    loadDashboardData();
    
    // Listen for inventory updates
    const handleInventoryUpdate = () => {
      loadDashboardData();
    };
    
    window.addEventListener('inventory-updated', handleInventoryUpdate);
    
    return () => {
      window.removeEventListener('inventory-updated', handleInventoryUpdate);
    };
  }, [inventories, materials, categories, isLoading]);

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (syncStatus === 'syncing') return;
    
    setSyncStatus('syncing');
    try {
      await refreshInventory();
      loadDashboardData();
      toast.success('仪表盘数据已更新');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      toast.error('刷新失败，请重试');
      setSyncStatus('idle');
    }
  };

  // Get material count by category
  const getCategoryMaterialCount = (categoryId: string) => {
    return materials.filter(material => material.categoryId === categoryId).length;
  };

  // Get total inventory value
  const getTotalInventoryValue = () => {
    return inventories.reduce((total, inv) => {
      const material = materials.find(m => m.id === inv.materialId);
      return total + (inv.quantity * (material?.referencePrice || 0));
    }, 0);
  };

  // Handle restock action
  const navigate = useNavigate();
  
  const handleRestock = (materialId: string) => {
    // 导航到入库页面并携带材料ID参数
    navigate(`/stock-in?materialId=${materialId}`);
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Refresh */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">库存仪表盘</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={syncStatus === 'syncing' || isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
          >
            {syncStatus === 'syncing' ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-1"></i>同步中...
              </>
            ) : (
              <>
                <i className="fa-solid fa-sync-alt mr-1"></i>刷新数据
              </>
            )}
          </button>
          
          {lastSynced && (
            <span className="text-sm text-gray-500">
              {syncStatus === 'synced' && '已同步'}
              {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总材料种类"
          value={materials.length}
          icon="fa-cubes"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          description={`共 ${categories.length} 个分类`}
        />
        <StatCard
          title="当前库存总量"
          value={inventories.reduce((sum, item) => sum + item.quantity, 0)}
          icon="fa-warehouse"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          description="件材料"
        />
        <StatCard
          title="低库存材料"
          value={lowStockAlerts.length}
          icon="fa-exclamation-triangle"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          trend={lowStockAlerts.length > 3 ? 'up' : 'stable'}
          trendValue={lowStockAlerts.length > 3 ? '警告' : ''}
        />
        <StatCard
          title="库存总价值"
          value={`¥${getTotalInventoryValue().toLocaleString()}`}
          icon="fa-yen-sign"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          description="估值"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="材料库存分布" actionLabel="查看详情">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stockData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {stockData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        
        <ChartCard title="近6个月出入库趋势" actionLabel="查看详情">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { month: '4月', 入库: 24, 出库: 18 },
                { month: '5月', 入库: 32, 出库: 25 },
                { month: '6月', 入库: 28, 出库: 22 },
                { month: '7月', 入库: 35, 出库: 28 },
                { month: '8月', 入库: 42, 出库: 30 },
                { month: '9月', 入库: 38, 出库: 28 },
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="入库" fill="#0088FE" />
              <Bar dataKey="出库" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Alerts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection title="低库存预警" actionLabel="查看全部">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>加载中...
              </div>
            ) : lowStockAlerts.length > 0 ? (
              lowStockAlerts.map((item) => (
                <AlertItem
                  key={item.id}
                  name={item.name}
                  current={item.current}
                  threshold={item.threshold}
                  unit={item.unit}
                 onRestock={() => {
                   const material = materials.find(m => m.name === item.name);
                   if (material) {
                     handleRestock(material.id);
                   }
                 }}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <i className="fa-solid fa-check-circle text-green-500 mr-2"></i>所有材料库存正常
              </div>
            )}
          </div>
        </DashboardSection>
        
        <DashboardSection title="最近活动" actionLabel="查看全部">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>加载中...
              </div>
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  id={activity.id}
                  type={activity.type}
                  material={activity.material}
                  quantity={activity.quantity}
                  date={activity.date}
                  operator={activity.operator}
                />
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <i className="fa-solid fa-clock text-gray-400 mr-2"></i>暂无近期活动记录
              </div>
            )}
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}