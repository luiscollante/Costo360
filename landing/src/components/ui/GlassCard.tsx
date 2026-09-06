import React from 'react';
import { cn } from '@/lib/utils';
import { Spotlight } from './Spotlight';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'dark';
  spotlight?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  spotlight = true,
  ...props
}: GlassCardProps) {
  const baseClasses = cn(
    'rounded-3xl p-6 md:p-8 relative overflow-hidden transition-all duration-300',
    variant === 'default' && 'glass-panel',
    variant === 'hover' && 'glass-panel glass-panel-hover',
    variant === 'dark' && 'glass-emerald-dark text-white',
    className
  );

  if (spotlight) {
    return (
      <Spotlight
        className={baseClasses}
        fill={variant === 'dark' ? 'rgba(212, 175, 55, 0.12)' : 'rgba(21, 97, 46, 0.08)'}
        {...props}
      >
        {children}
      </Spotlight>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
}
