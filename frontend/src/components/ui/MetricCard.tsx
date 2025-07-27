import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'info';
  icon: LucideIcon;
  description?: string;
  isLoading?: boolean;
  className?: string;
  gradient?: string;
}

export const MetricCard = React.memo<MetricCardProps>(function MetricCard({
  title,
  value,
  change,
  changeType = 'neutral',
  status,
  icon: Icon,
  description,
  isLoading = false,
  className,
  gradient = 'from-blue-500 to-indigo-500'
}) {
  const getChangeStyles = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50';
      case 'negative':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return ArrowUpRight;
      case 'negative':  
        return ArrowDownRight;
      default:
        return Minus;
    }
  };

  const getStatusStyles = () => {
    if (!status) return '';
    
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10';
      case 'error':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case 'info':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        'bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700',
        className
      )}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16 mb-3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
            </div>
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const ChangeIcon = getChangeIcon();

  return (
    <div className={cn(
      'group relative overflow-hidden bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-lg border-0 transition-all duration-300',
      status && 'border-l-4',
      getStatusStyles(),
      className
    )}>
      {/* Gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
          
          {change && (
            <div className="flex items-center justify-between">
              <div className={cn(
                'inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                getChangeStyles()
              )}>
                <ChangeIcon className="h-3 w-3" />
                <span>{change}</span>
              </div>
              {description && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {description}
                </div>
              )}
            </div>
          )}
          
          {!change && description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      
      {/* Subtle animation on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/20 dark:to-slate-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
});

// Grid component for organizing metric cards
interface MetricCardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: number;
}

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({ 
  children, 
  className,
  columns = 4 
}) => {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  }[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={cn(
      'grid gap-4',
      gridClass,
      className
    )}>
      {children}
    </div>
  );
};

export default MetricCard;