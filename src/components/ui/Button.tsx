'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-medium rounded-lg',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95'
    ]

    const variantClasses = {
      primary: [
        'bg-primary-600 text-white',
        'hover:bg-primary-700',
        'focus:ring-primary-500',
        'shadow-sm hover:shadow-md'
      ],
      secondary: [
        'bg-gray-100 text-gray-900',
        'hover:bg-gray-200',
        'focus:ring-gray-500',
        'shadow-sm hover:shadow-md'
      ],
      outline: [
        'bg-white text-gray-700 border border-gray-300',
        'hover:bg-gray-50 hover:border-gray-400',
        'focus:ring-primary-500',
        'shadow-sm hover:shadow-md'
      ],
      ghost: [
        'bg-transparent text-gray-700',
        'hover:bg-gray-100',
        'focus:ring-gray-500'
      ],
      danger: [
        'bg-error-600 text-white',
        'hover:bg-error-700',
        'focus:ring-error-500',
        'shadow-sm hover:shadow-md'
      ],
      success: [
        'bg-success-600 text-white',
        'hover:bg-success-700',
        'focus:ring-success-500',
        'shadow-sm hover:shadow-md'
      ],
      warning: [
        'bg-warning-600 text-white',
        'hover:bg-warning-700',
        'focus:ring-warning-500',
        'shadow-sm hover:shadow-md'
      ]
    }

    const sizeClasses = {
      xs: 'px-2 py-1 text-xs min-h-[24px]',
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-4 py-2 text-sm min-h-[40px]',
      lg: 'px-6 py-3 text-base min-h-[48px]',
      xl: 'px-8 py-4 text-lg min-h-[56px]'
    }

    const widthClasses = fullWidth ? 'w-full' : ''

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          widthClasses,
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="mr-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          </div>
        )}
        {!loading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

// Button Group Component
interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function ButtonGroup({ 
  children, 
  className, 
  orientation = 'horizontal',
  size = 'md'
}: ButtonGroupProps) {
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col'
  }

  return (
    <div className={cn(
      'inline-flex',
      orientationClasses[orientation],
      '[&>button]:rounded-none',
      '[&>button:first-child]:rounded-l-lg',
      '[&>button:last-child]:rounded-r-lg',
      orientation === 'vertical' && [
        '[&>button:first-child]:rounded-t-lg [&>button:first-child]:rounded-b-none',
        '[&>button:last-child]:rounded-b-lg [&>button:last-child]:rounded-t-none'
      ],
      '[&>button:not(:first-child)]:border-l-0',
      orientation === 'vertical' && '[&>button:not(:first-child)]:border-t-0 [&>button:not(:first-child)]:border-l',
      className
    )}>
      {children}
    </div>
  )
}

// Icon Button Component
interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  'aria-label': string
}

export function IconButton({ icon, className, ...props }: IconButtonProps) {
  return (
    <Button
      className={cn('p-2', className)}
      {...props}
    >
      {icon}
    </Button>
  )
}

// Floating Action Button Component
interface FABProps extends ButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

export function FloatingActionButton({ 
  position = 'bottom-right', 
  className,
  children,
  ...props 
}: FABProps) {
  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6'
  }

  return (
    <Button
      className={cn(
        positionClasses[position],
        'rounded-full shadow-lg hover:shadow-xl',
        'z-50 h-14 w-14',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

// Split Button Component
interface SplitButtonProps {
  children: React.ReactNode
  onMainClick: () => void
  onMenuClick: () => void
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function SplitButton({
  children,
  onMainClick,
  onMenuClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className
}: SplitButtonProps) {
  return (
    <ButtonGroup className={className}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        loading={loading}
        onClick={onMainClick}
      >
        {children}
      </Button>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onMenuClick}
        className="px-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
    </ButtonGroup>
  )
}

// Button with Tooltip
interface TooltipButtonProps extends ButtonProps {
  tooltip: string
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right'
}

export function TooltipButton({ 
  tooltip, 
  tooltipPosition = 'top', 
  className,
  children,
  ...props 
}: TooltipButtonProps) {
  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  return (
    <div className="relative group">
      <Button className={className} {...props}>
        {children}
      </Button>
      <div className={cn(
        'invisible group-hover:visible absolute z-10',
        tooltipPositionClasses[tooltipPosition]
      )}>
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  )
}