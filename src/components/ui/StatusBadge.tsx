'use client'

import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'synced' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function StatusBadge({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className 
}: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-warning-100 text-warning-800 border-warning-200',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Pending Review',
          pulse: true
        }
      case 'approved':
        return {
          color: 'bg-success-100 text-success-800 border-success-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Approved',
          pulse: false
        }
      case 'rejected':
        return {
          color: 'bg-error-100 text-error-800 border-error-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Rejected',
          pulse: false
        }
      case 'processing':
        return {
          color: 'bg-info-100 text-info-800 border-info-200',
          icon: (
            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          label: 'Processing',
          pulse: true
        }
      case 'synced':
        return {
          color: 'bg-primary-100 text-primary-800 border-primary-200',
          icon: (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          label: 'Synced',
          pulse: false
        }
      case 'error':
        return {
          color: 'bg-error-100 text-error-800 border-error-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Error',
          pulse: true
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Unknown',
          pulse: false
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'lg':
        return 'px-3 py-1.5 text-sm'
      default:
        return 'px-2.5 py-1 text-xs'
    }
  }

  const config = getStatusConfig(status)
  const sizeClasses = getSizeClasses(size)

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      config.color,
      sizeClasses,
      config.pulse && 'animate-pulse',
      className
    )}>
      {showIcon && (
        <span className="mr-1">{config.icon}</span>
      )}
      {config.label}
    </span>
  )
}

// Status Dot Component (minimal version)
interface StatusDotProps {
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'synced' | 'error'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function StatusDot({ status, size = 'md', className }: StatusDotProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-500'
      case 'approved':
        return 'bg-success-500'
      case 'rejected':
        return 'bg-error-500'
      case 'processing':
        return 'bg-info-500 animate-pulse'
      case 'synced':
        return 'bg-primary-500'
      case 'error':
        return 'bg-error-500 animate-pulse'
      default:
        return 'bg-gray-500'
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-3 h-3'
    }
  }

  return (
    <div className={cn(
      'rounded-full',
      getStatusColor(status),
      getSizeClasses(size),
      className
    )} />
  )
}

// Status Timeline Component
interface StatusTimelineProps {
  statuses: Array<{
    status: 'pending' | 'approved' | 'rejected' | 'processing' | 'synced' | 'error'
    timestamp: string
    description?: string
  }>
  className?: string
}

export function StatusTimeline({ statuses, className }: StatusTimelineProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {statuses.map((item, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <StatusDot status={item.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <StatusBadge status={item.status} size="sm" />
              <span className="text-xs text-gray-500">
                {new Date(item.timestamp).toLocaleString()}
              </span>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Status Summary Component
interface StatusSummaryProps {
  counts: {
    pending?: number
    approved?: number
    rejected?: number
    processing?: number
    synced?: number
    error?: number
  }
  className?: string
}

export function StatusSummary({ counts, className }: StatusSummaryProps) {
  const statusTypes = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'processing', label: 'Processing' },
    { key: 'synced', label: 'Synced' },
    { key: 'error', label: 'Error' }
  ] as const

  const total = Object.values(counts).reduce((sum, count) => sum + (count || 0), 0)

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4', className)}>
      {statusTypes.map(({ key, label }) => {
        const count = counts[key] || 0
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
        
        return (
          <div key={key} className="text-center">
            <div className="flex items-center justify-center mb-2">
              <StatusDot status={key} className="mr-2" />
              <span className="text-2xl font-bold text-gray-900">{count}</span>
            </div>
            <div className="text-sm text-gray-600">{label}</div>
            <div className="text-xs text-gray-500">{percentage}%</div>
          </div>
        )
      })}
    </div>
  )
}