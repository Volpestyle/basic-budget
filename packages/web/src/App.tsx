import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'jotai';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { BudgetPlanner } from './components/features/BudgetPlanner';
import { TransactionsPage } from './pages/TransactionsPage';
import { PaystubUpload } from './components/features/PaystubUpload';
import { BankConnection } from './components/features/BankConnection';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { sidebarCollapsedAtom } from './store/atoms';
import './styles/theme.css';
import styles from './App.module.css';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  
  return (
    <div className={styles.layout}>
      <Sidebar />
      <motion.main 
        className={styles.main}
        animate={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.main>
    </div>
  );
};

const ReportsPage: React.FC = () => (
  <div className={styles.pageContainer}>
    <h1 className={styles.pageTitle}>Reports</h1>
    <div className={styles.comingSoon}>
      <span className={styles.comingSoonIcon}>📊</span>
      <h2>Coming Soon</h2>
      <p>Detailed financial reports and analytics will be available here.</p>
    </div>
  </div>
);

function App() {
  return (
    <Provider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/budget" element={
              <div className={styles.pageContainer}>
                <BudgetPlanner />
              </div>
            } />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/paystubs" element={
              <div className={styles.pageContainer}>
                <h1 className={styles.pageTitle}>Paystub Management</h1>
                <PaystubUpload />
              </div>
            } />
            <Route path="/accounts" element={
              <div className={styles.pageContainer}>
                <h1 className={styles.pageTitle}>Bank Accounts</h1>
                <BankConnection />
              </div>
            } />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </Provider>
  );
}

export default App
