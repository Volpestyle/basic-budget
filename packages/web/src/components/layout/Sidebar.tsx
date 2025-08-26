import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { sidebarCollapsedAtom } from '../../store/atoms';
import styles from './Sidebar.module.css';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/budget', label: 'Budget Planner', icon: '💰' },
  { path: '/transactions', label: 'Transactions', icon: '📝' },
  { path: '/paystubs', label: 'Paystubs', icon: '📄' },
  { path: '/accounts', label: 'Bank Accounts', icon: '🏦' },
  { path: '/reports', label: 'Reports', icon: '📈' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <motion.aside 
      className={styles.sidebar}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className={styles.header}>
        <motion.div 
          className={styles.logo}
          animate={{ scale: collapsed ? 0.8 : 1 }}
        >
          💸
        </motion.div>
        {!collapsed && (
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Basic Budget
          </motion.h1>
        )}
        <button 
          className={styles.collapseBtn}
          onClick={() => setCollapsed(!collapsed)}
        >
          <motion.svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none"
            animate={{ rotate: collapsed ? 180 : 0 }}
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </button>
      </div>

      <nav className={styles.nav}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <motion.span 
              className={styles.navIcon}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {item.icon}
            </motion.span>
            {!collapsed && (
              <motion.span 
                className={styles.navLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {item.label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <motion.div 
          className={styles.userInfo}
          animate={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          <div className={styles.userAvatar}>👤</div>
          {!collapsed && (
            <motion.div
              className={styles.userDetails}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className={styles.userName}>John Doe</span>
              <span className={styles.userEmail}>john@example.com</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.aside>
  );
};