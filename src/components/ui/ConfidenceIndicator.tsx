'use client'

import { cn } from '@/lib/utils'

interface ConfidenceIndicatorProps {
  confidence: 'high' | 'medium' | 'low'
  score?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  showScore?: boolean
  className?: string
}

export function ConfidenceIndicator({
  confidence,
  score,
  size = 'md',
  showLabel = true,
  showScore = false,
  className
}: ConfidenceIndicatorProps) {
  const getConfidenceConfig = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return {
          color: 'bg-success-100 text-success-800 border-success-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          label: 'High Confidence',
          description: '95%+ accuracy'
        }
      case 'medium':
        return {
          color: 'bg-warning-100 text-warning-800 border-warning-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Medium Confidence',
          description: '70-94% accuracy'
        }
      case 'low':
        return {
          color: 'bg-error-100 text-error-800 border-error-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Low Confidence',
          description: 'Manual review needed'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
          label: 'Unknown',
          description: 'Not processed'
        }
    }
  }

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-sm'
      default:
        return 'px-2.5 py-1.5 text-xs'
    }
  }

  const config = getConfidenceConfig(confidence)
  const sizeClasses = getSizeClasses(size)

  return (
    <div className={cn(
      'inline-flex items-center rounded-full border font-medium',
      config.color,
      sizeClasses,
      className
    )}>
      {config.icon}
      {showLabel && (
        <span className="ml-1.5">
          {showScore && score ? `${Math.round(score * 100)}%` : config.label}
        </span>
      )}
    </div>
  )
}

// Confidence Progress Bar Component
interface ConfidenceProgressProps {
  confidence: 'high' | 'medium' | 'low'
  score: number
  className?: string
}

export function ConfidenceProgress({ confidence, score, className }: ConfidenceProgressProps) {
  const getProgressColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-success-500'
      case 'medium':
        return 'bg-warning-500'
      case 'low':
        return 'bg-error-500'
      default:
        return 'bg-gray-500'
    }
  }

  const progressColor = getProgressColor(confidence)
  const percentage = Math.round(score * 100)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">AI Confidence</span>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', progressColor)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  )
}

// Confidence Tooltip Component
interface ConfidenceTooltipProps {
  confidence: 'high' | 'medium' | 'low'
  score: number
  reasoning?: string
  children: React.ReactNode
}

export function ConfidenceTooltip({ confidence, score, reasoning, children }: ConfidenceTooltipProps) {
  const getTooltipContent = () => {
    const percentage = Math.round(score * 100)
    const config = {
      high: {
        title: 'High Confidence',
        description: 'AI is very confident in this categorization',
        recommendation: 'Safe to auto-approve'
      },
      medium: {
        title: 'Medium Confidence', 
        description: 'AI has moderate confidence in this categorization',
        recommendation: 'Quick review recommended'
      },
      low: {
        title: 'Low Confidence',
        description: 'AI is uncertain about this categorization',
        recommendation: 'Manual review required'
      }
    }[confidence]

    return (
      <div className="p-3 max-w-xs">
        <div className="font-semibold text-gray-900 mb-1">
          {config.title} ({percentage}%)
        </div>
        <div className="text-sm text-gray-600 mb-2">
          {config.description}
        </div>
        <div className="text-xs text-gray-500 mb-2">
          💡 {config.recommendation}
        </div>
        {reasoning && (
          <div className="text-xs text-gray-600 border-t pt-2">
            <strong>AI Reasoning:</strong> {reasoning}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group relative inline-block">
      {children}
      <div className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
          {getTooltipContent()}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-white"></div>
          </div>
        </div>
      </div>
    </div>
  )
}