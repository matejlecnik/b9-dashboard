import React from 'react';
import { cn } from '@/lib/utils';

interface AppleSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'pink' | 'gray' | 'white';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  pink: 'text-b9-pink',
  gray: 'text-gray-400',
  white: 'text-white',
};

export function AppleSpinner({ 
  size = 'md', 
  className = '', 
  color = 'pink' 
}: AppleSpinnerProps) {
  return (
    <div 
      className={cn(
        'inline-block animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="20"
          className="opacity-25"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="15"
          strokeDashoffset="15"
          className="opacity-75"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="1s"
            repeatCount="indefinite"
            values="0 12 12;360 12 12"
          />
        </circle>
      </svg>
    </div>
  );
}

export function AppleSpinnerOverlay({ 
  children, 
  isLoading, 
  className = '' 
}: {
  children: React.ReactNode;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <AppleSpinner size="lg" />
            <p className="text-sm text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppleSpinnerFullScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-xl flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 p-8">
        <AppleSpinner size="xl" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-1">{message}</p>
          <p className="text-sm text-gray-500">Please wait while we load your data</p>
        </div>
      </div>
    </div>
  );
}

export default AppleSpinner;