'use client'

import { cn } from '@/lib/utils'

interface LoadingProps {
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Loading = ({ 
  text = 'Loading...', 
  className,
  size = 'md'
}: LoadingProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[60vh] gap-4',
      className
    )}>
      <div className={cn(
        'animate-spin rounded-full border-4 border-secondary',
        'border-t-moonstone',
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-dark/70 font-medium">{text}</p>
      )}
    </div>
  )
}

export default Loading 