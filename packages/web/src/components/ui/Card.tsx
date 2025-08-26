import { forwardRef, type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, keyof HTMLMotionProps<'div'>> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  hover?: boolean;
  glow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps & HTMLMotionProps<'div'>>(
  ({ 
    children, 
    variant = 'default',
    hover = false,
    glow = false,
    padding = 'md',
    className,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={clsx(
          styles.card,
          styles[variant],
          styles[`padding-${padding}`],
          hover && styles.hover,
          glow && styles.glow,
          className
        )}
        whileHover={hover ? { 
          y: -4,
          transition: { type: 'spring', stiffness: 400, damping: 17 }
        } : undefined}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  title, 
  subtitle, 
  action, 
  children,
  className,
  ...props 
}) => {
  return (
    <div className={clsx(styles.header, className)} {...props}>
      {children || (
        <>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </>
      )}
    </div>
  );
};

export const CardContent: React.FC<HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  className,
  ...props 
}) => {
  return (
    <div className={clsx(styles.content, className)} {...props}>
      {children}
    </div>
  );
};