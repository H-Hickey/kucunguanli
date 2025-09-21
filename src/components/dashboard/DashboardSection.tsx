import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DashboardSectionProps {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function DashboardSection({
  title,
  actionLabel,
  onActionClick,
  children,
  className = '',
}: DashboardSectionProps) {
  return (
    <motion.div
      className={cn("bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actionLabel && onActionClick && (
          <button
            onClick={onActionClick}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}