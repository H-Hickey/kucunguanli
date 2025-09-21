import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend,
  trendValue,
  description,
}: StatCardProps) {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">{value}</h3>
            {description && (
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${iconBgColor}`}>
            <i className={`fa-solid ${icon} ${iconColor}`}></i>
          </div>
        </div>
        
        {trend && trendValue && (
          <div className="mt-4 flex items-center">
            <span className={`flex items-center text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' ? (
                <i className="fa-solid fa-arrow-up mr-1"></i>
              ) : trend === 'down' ? (
                <i className="fa-solid fa-arrow-down mr-1"></i>
              ) : (
                <i className="fa-solid fa-minus mr-1"></i>
              )}
              {trendValue}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}