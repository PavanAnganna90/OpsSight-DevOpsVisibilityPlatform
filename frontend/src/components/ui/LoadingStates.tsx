import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '', 
  label = 'Loading...' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400`}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular',
  animation = 'pulse' 
}) => {
  const baseClasses = 'bg-slate-700/50';
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full'
  };
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer'
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-8" variant="circular" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4 mb-3" variant="text" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" variant="text" />
        <Skeleton className="h-4 w-2/3" variant="text" />
      </div>
    </div>
  </div>
);

export const SkeletonMetric: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-slate-500 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-8 w-8" variant="circular" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-5 w-24 mb-3" variant="text" />
      <div className="flex items-center space-x-4 mb-3">
        <Skeleton className="h-12 w-12" variant="circular" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-16" variant="text" />
          <Skeleton className="h-3 w-20" variant="text" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" variant="text" />
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 ${className}`}>
    <div className="animate-pulse">
      <div className="flex items-center mb-4">
        <Skeleton className="h-5 w-5 mr-2" variant="circular" />
        <Skeleton className="h-5 w-32" variant="text" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <Skeleton className="h-4 w-20 mb-2" variant="text" />
          <div className="h-16 bg-slate-700/30 rounded-lg p-2">
            <div className="h-full flex items-end space-x-1">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-5 w-12 mt-2" variant="text" />
        </div>
        <div>
          <Skeleton className="h-4 w-24 mb-2" variant="text" />
          <div className="h-16 bg-slate-700/30 rounded-lg p-2">
            <div className="h-full flex items-end space-x-1">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="flex-1 h-full" />
              ))}
            </div>
          </div>
          <Skeleton className="h-5 w-12 mt-2" variant="text" />
        </div>
      </div>
    </div>
  </div>
);

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = 'Loading...', 
  children 
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="bg-slate-800/90 rounded-lg p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="md" label={message} />
              <span className="text-white font-medium">{message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  label, 
  className = '',
  showPercentage = true 
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          {showPercentage && (
            <span className="text-sm text-slate-400">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div 
        className="w-full bg-slate-700 rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Add shimmer animation CSS on client side only
if (typeof window !== 'undefined') {
  const existingStyle = document.getElementById('shimmer-animation');
  if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'shimmer-animation';
    style.textContent = `
      @keyframes shimmer {
        0% {
          background-position: -200px 0;
        }
        100% {
          background-position: calc(200px + 100%) 0;
        }
      }
      
      .animate-shimmer {
        background: linear-gradient(90deg, #334155 25%, #475569 37%, #334155 63%);
        background-size: 400px 100%;
        animation: shimmer 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
} 