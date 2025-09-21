import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  name: string;
  current: number;
  threshold: number;
  unit: string;
  onRestock: () => void;
}

export default function AlertItem({
  name,
  current,
  threshold,
  unit,
  onRestock,
}: AlertItemProps) {
  // Calculate percentage of threshold
  const percentage = (current / threshold) * 100;
  
  return (
    <motion.div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-yellow-100 p-2 rounded-full">
          <i className="fa-solid fa-exclamation-triangle text-yellow-600"></i>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <div className="mt-1 flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <span className="ml-2 text-xs text-gray-500">
              {current} {unit} / {threshold} {unit}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onRestock}
        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
      >
        补货
      </button>
    </motion.div>
  );
}