import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  FileText, 
  CreditCard, 
  PieChart, 
  Upload,
  Settings,
  User,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { currentViewAtom } from '@/store/budget';
import { useMobile } from '@/hooks/use-mobile';

interface NavigationProps {
  className?: string;
}

export function AppNavigation({ className }: NavigationProps) {
  const [currentView, setCurrentView] = useAtom(currentViewAtom);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useMobile();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: PieChart,
      description: 'Budget overview and tracking',
    },
    {
      id: 'budget',
      label: 'Budget Planner',
      icon: Calculator,
      description: 'Plan your monthly budget',
    },
    {
      id: 'paystub',
      label: 'Paystub Upload',
      icon: FileText,
      description: 'Upload and extract paystub data',
      badge: 'Coming Soon',
    },
    {
      id: 'accounts',
      label: 'Bank Accounts',
      icon: CreditCard,
      description: 'Connect your bank accounts',
      badge: 'Coming Soon',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Upload,
      description: 'View and categorize transactions',
      badge: 'Coming Soon',
    },
  ];

  const sidebarVariants = {
    expanded: { width: '256px' },
    collapsed: { width: '80px' },
  };

  const itemVariants = {
    active: { 
      backgroundColor: 'var(--sidebar-primary)',
      color: 'var(--sidebar-primary-foreground)',
      transition: { duration: 0.2 },
    },
    inactive: { 
      backgroundColor: 'transparent',
      color: 'var(--sidebar-foreground)',
      transition: { duration: 0.2 },
    },
  };

  const handleNavClick = (itemId: string) => {
    setCurrentView(itemId);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const renderNavigationContent = () => (
    <>
      {/* Logo/Brand */}
      <motion.div 
        className="mb-8"
        animate={{ opacity: isCollapsed && !isMobile ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {(!isCollapsed || isMobile) && (
          <>
            <h1 className="text-xl font-medium text-sidebar-foreground">Budget App</h1>
            <p className="text-sm text-sidebar-foreground/70">Personal Finance Manager</p>
          </>
        )}
      </motion.div>

      {/* Authentication Status */}
      <AnimatePresence>
        {(!isCollapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="mb-6 p-3 bg-sidebar-accent">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="p-2 bg-sidebar-primary/10 rounded-full"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {isAuthenticated ? (
                    <User className="h-4 w-4 text-sidebar-primary" />
                  ) : (
                    <LogIn className="h-4 w-4 text-sidebar-primary" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-accent-foreground">
                    {isAuthenticated ? 'John Doe' : 'Anonymous Mode'}
                  </p>
                  <p className="text-xs text-sidebar-accent-foreground/70">
                    {isAuthenticated ? 'Account synced' : 'Data stored locally'}
                  </p>
                </div>
              </div>
              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    onClick={() => setIsAuthenticated(true)}
                  >
                    Sign In with Google
                  </Button>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = !!item.badge;
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <motion.button
                className={`w-full rounded-lg p-3 flex items-center space-x-3 transition-colors ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                variants={itemVariants}
                animate={isActive ? 'active' : 'inactive'}
                whileHover={!isDisabled ? { scale: 1.02 } : {}}
                whileTap={!isDisabled ? { scale: 0.98 } : {}}
                onClick={() => !isDisabled && handleNavClick(item.id)}
                disabled={isDisabled}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isCollapsed && !isMobile ? 'mx-auto' : ''}`} />
                <AnimatePresence>
                  {(!isCollapsed || isMobile) && (
                    <motion.div 
                      className="flex-1 text-left"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs opacity-70 mt-1">{item.description}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          );
        })}
      </nav>

      {/* Settings */}
      <motion.div 
        className="pt-4 border-t border-sidebar-border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          className={`w-full rounded-lg p-3 flex items-center space-x-3 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
            isCollapsed && !isMobile ? 'justify-center' : ''
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavClick('settings')}
        >
          <Settings className={`h-4 w-4 ${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
          {(!isCollapsed || isMobile) && <span>Settings</span>}
        </motion.button>
      </motion.div>
    </>
  );

  // Mobile menu overlay
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar border-r border-sidebar-border p-4 flex flex-col z-40 md:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 20 }}
              >
                {renderNavigationContent()}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop sidebar
  return (
    <motion.div
      className={`h-screen bg-sidebar border-r border-sidebar-border p-4 flex flex-col ${className}`}
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {renderNavigationContent()}
    </motion.div>
  );
}