import { useState } from 'react';
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
  LogIn
} from 'lucide-react';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function AppNavigation({ currentView, onViewChange }: NavigationProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: PieChart,
      description: 'Budget overview and tracking'
    },
    {
      id: 'budget',
      label: 'Budget Planner',
      icon: Calculator,
      description: 'Plan your monthly budget'
    },
    {
      id: 'paystub',
      label: 'Paystub Upload',
      icon: FileText,
      description: 'Upload and extract paystub data',
      badge: 'Coming Soon'
    },
    {
      id: 'accounts',
      label: 'Bank Accounts',
      icon: CreditCard,
      description: 'Connect your bank accounts',
      badge: 'Coming Soon'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Upload,
      description: 'View and categorize transactions',
      badge: 'Coming Soon'
    }
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border p-4 flex flex-col">
      {/* Logo/Brand */}
      <div className="mb-8">
        <h1 className="text-xl font-medium text-sidebar-foreground">Budget App</h1>
        <p className="text-sm text-sidebar-foreground/70">Personal Finance Manager</p>
      </div>

      {/* Authentication Status */}
      <Card className="mb-6 p-3 bg-sidebar-accent">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sidebar-primary/10 rounded-full">
            {isAuthenticated ? (
              <User className="h-4 w-4 text-sidebar-primary" />
            ) : (
              <LogIn className="h-4 w-4 text-sidebar-primary" />
            )}
          </div>
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
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            onClick={() => setIsAuthenticated(true)}
          >
            Sign In with Google
          </Button>
        )}
      </Card>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isDisabled = !!item.badge;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start h-auto p-3 ${
                isActive 
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !isDisabled && onViewChange(item.id)}
              disabled={isDisabled}
            >
              <div className="flex items-center space-x-3 w-full">
                <Icon className="h-5 w-5 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs opacity-70 mt-1">{item.description}</p>
                </div>
              </div>
            </Button>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => onViewChange('settings')}
        >
          <Settings className="h-4 w-4 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  );
}