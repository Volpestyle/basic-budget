import { useState } from 'react';
import { BudgetDashboard } from './components/BudgetDashboard';
import { AppNavigation } from './components/AppNavigation';
import { ThemeToggle } from './components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { 
  FileText, 
  CreditCard, 
  Settings as SettingsIcon, 
  Upload,
  Camera,
  Link,
  Bell,
  Shield
} from 'lucide-react';

function ComingSoonView({ title, description, icon: Icon }: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto p-4 bg-muted rounded-full w-fit mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{description}</p>
          <Badge variant="secondary">Coming Soon</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex-1 p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium">Settings</h1>
          <p className="text-muted-foreground">Manage your budget app preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Budget alerts</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Weekly reports</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Privacy & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Two-factor authentication</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Data export</span>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Currently using local storage. Sign in to sync your data across devices.
              </p>
              <Button variant="outline" className="w-full">
                <Link className="h-4 w-4 mr-2" />
                Connect to Cloud Storage
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm"><strong>Version:</strong> 1.0.0-beta</p>
              <p className="text-sm"><strong>Build:</strong> Frontend Only</p>
              <p className="text-sm text-muted-foreground">
                This is a prototype budget application built with React and modern web technologies.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
      case 'budget':
        return <BudgetDashboard />;
      case 'paystub':
        return (
          <ComingSoonView
            title="Paystub Upload"
            description="Upload your paystubs to automatically extract income and deduction information using our PDF processing service."
            icon={FileText}
          />
        );
      case 'accounts':
        return (
          <ComingSoonView
            title="Bank Accounts"
            description="Connect your bank accounts securely using Plaid integration to automatically track transactions and categorize expenses."
            icon={CreditCard}
          />
        );
      case 'transactions':
        return (
          <ComingSoonView
            title="Transactions"
            description="View and categorize all your transactions from connected bank accounts to track spending against your budget."
            icon={Upload}
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return <BudgetDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AppNavigation currentView={currentView} onViewChange={setCurrentView} />
      {renderCurrentView()}
      <ThemeToggle />
    </div>
  );
}