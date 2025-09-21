import { motion } from 'framer-motion';

interface ActivityItemProps {
  id: number;
  type: '入库' | '出库' | '盘点';
  material: string;
  quantity: number;
  date: string;
  operator: string;
}

export default function ActivityItem({
  id,
  type,
  material,
  quantity,
  date,
  operator,
}: ActivityItemProps) {
  // Determine icon and color based on activity type
const getActivityIcon = () => {
    switch (type) {
      case '入库':
        return { icon: 'fa-box-open', bgColor: 'bg-green-100', textColor: 'text-green-600' };
      case '出库':
        return { icon: 'fa-sign-out-alt', bgColor: 'bg-red-100', textColor: 'text-red-600' };
      case '盘点':
        return { icon: 'fa-list-check', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
      case '调整':
        return { icon: 'fa-sliders-h', bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
      default:
        return { icon: 'fa-question-circle', bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
    }
  };
  
  const { icon, bgColor, textColor } = getActivityIcon();
  
  return (
    <motion.div
      className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`flex-shrink-0 p-2 rounded-full ${bgColor}`}>
        <i className={`fa-solid ${icon} ${textColor}`}></i>
      </div>
      <div className="ml-3 flex-1">
        <div className="flex justify-between">
          <p className="text-sm font-medium text-gray-900">
            {type} - {material}
          </p>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
        <div className="mt-1 flex justify-between items-center">
          <p className="text-xs text-gray-500">操作人: {operator}</p>
          {quantity > 0 && (
            <p className={`text-xs font-medium ${
              type === '入库' ? 'text-green-600' : 'text-red-600'
            }`}>
              {type === '入库' ? '+' : '-'} {quantity}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}