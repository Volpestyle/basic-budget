import { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  variant?: 'default' | 'filled' | 'ghost';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label,
    error,
    helperText,
    icon,
    iconPosition = 'left',
    variant = 'default',
    fullWidth = false,
    className,
    onFocus,
    onBlur,
    ...props 
  }, ref) => {
    const [focused, setFocused] = useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    return (
      <div className={clsx(styles.container, fullWidth && styles.fullWidth, className)}>
        {label && (
          <motion.label 
            className={styles.label}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}
        
        <div className={clsx(
          styles.inputWrapper,
          styles[variant],
          focused && styles.focused,
          error && styles.error,
          icon && styles.hasIcon,
          icon && iconPosition === 'right' && styles.iconRight
        )}>
          {icon && (
            <motion.span 
              className={styles.icon}
              animate={{ 
                color: focused ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
                scale: focused ? 1.1 : 1
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {icon}
            </motion.span>
          )}
          
          <input
            ref={ref}
            className={styles.input}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          
          <motion.div 
            className={styles.focusLine}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: focused ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>
        
        <AnimatePresence mode="wait">
          {error ? (
            <motion.span
              key="error"
              className={styles.errorText}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.span>
          ) : helperText ? (
            <motion.span
              key="helper"
              className={styles.helperText}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {helperText}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';