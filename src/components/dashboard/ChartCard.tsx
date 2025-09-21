import { motion } from 'framer-motion';
import DashboardSection from './DashboardSection';

interface ChartCardProps {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  children: React.ReactNode;
  height?: number;
}

export default function ChartCard({
  title,
  actionLabel,
  onActionClick,
  children,
  height = 300,
}: ChartCardProps) {
  return (
    <DashboardSection 
      title={title} 
      actionLabel={actionLabel} 
      onActionClick={onActionClick}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ height }}
      >
        {children}
      </motion.div>
    </DashboardSection>
  );
}