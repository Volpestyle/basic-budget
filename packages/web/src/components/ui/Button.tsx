import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<'button'>> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps & HTMLMotionProps<'button'>>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false,
    loading = false,
    icon,
    iconPosition = 'left',
    className,
    disabled,
    ...props 
  }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={clsx(
          styles.button,
          styles[variant],
          styles[size],
          fullWidth && styles.fullWidth,
          loading && styles.loading,
          className
        )}
        disabled={disabled || loading}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {loading ? (
          <span className={styles.loader}>
            <motion.span
              className={styles.loaderDot}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <motion.span
              className={styles.loaderDot}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
            />
            <motion.span
              className={styles.loaderDot}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: 0.4, repeat: Infinity }}
            />
          </span>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className={styles.icon}>{icon}</span>}
            {children && <span className={styles.text}>{String(children)}</span>}
            {icon && iconPosition === 'right' && <span className={styles.icon}>{icon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';