import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { 
  totalIncomeAtom, 
  totalExpensesAtom, 
  totalSavingsAtom,
  budgetHealthAtom,
  bankAccountsAtom,
  actualSpendingAtom
} from '../store/atoms';
import { BudgetPieChart } from '../components/charts/BudgetPieChart';
import { BudgetBarChart } from '../components/charts/BudgetBarChart';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import styles from './Dashboard.module.css';

export const Dashboard: React.FC = () => {
  const [totalIncome] = useAtom(totalIncomeAtom);
  const [totalExpenses] = useAtom(totalExpensesAtom);
  const [totalSavings] = useAtom(totalSavingsAtom);
  const [budgetHealth] = useAtom(budgetHealthAtom);
  const [bankAccounts] = useAtom(bankAccountsAtom);
  const [actualSpending] = useAtom(actualSpendingAtom);

  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const spendingRate = totalExpenses > 0 ? (actualSpending / totalExpenses) * 100 : 0;
  const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const healthColors = {
    excellent: 'var(--color-accent-success)',
    good: 'var(--color-accent-info)',
    warning: 'var(--color-accent-warning)',
    danger: 'var(--color-accent-danger)',
    neutral: 'var(--color-text-secondary)',
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className={styles.dashboard}
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div className={styles.header} variants={item}>
        <h1 className={styles.title}>Financial Dashboard</h1>
        <p className={styles.subtitle}>Track your budget and spending in real-time</p>
      </motion.div>

      <motion.div className={styles.statsGrid} variants={item}>
        <Card variant="gradient" glow>
          <CardContent>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💰</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Monthly Income</span>
                <span className={styles.statValue}>
                  ${totalIncome.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient">
          <CardContent>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💳</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Monthly Expenses</span>
                <span className={styles.statValue}>
                  ${totalExpenses.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>
                  {spendingRate.toFixed(1)}% spent
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient">
          <CardContent>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏦</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Total Balance</span>
                <span className={styles.statValue}>
                  ${totalBalance.toLocaleString()}
                </span>
                <span className={styles.statSubtext}>
                  {bankAccounts.length} accounts
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" glow={budgetHealth === 'excellent'}>
          <CardContent>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Budget Health</span>
                <span 
                  className={styles.statValue}
                  style={{ color: healthColors[budgetHealth] }}
                >
                  {budgetHealth.charAt(0).toUpperCase() + budgetHealth.slice(1)}
                </span>
                <span className={styles.statSubtext}>
                  {savingsRate.toFixed(1)}% savings rate
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div className={styles.chartsSection} variants={item}>
        <div className={styles.chartGrid}>
          <BudgetPieChart type="income" />
          <BudgetPieChart type="expense" />
        </div>
        <BudgetBarChart />
      </motion.div>

      <motion.div className={styles.insightsSection} variants={item}>
        <Card variant="elevated">
          <CardHeader title="Budget Insights" />
          <CardContent>
            <div className={styles.insights}>
              <motion.div 
                className={styles.insight}
                whileHover={{ scale: 1.02 }}
              >
                <div className={styles.insightIcon} style={{ color: healthColors[budgetHealth] }}>
                  {budgetHealth === 'excellent' ? '✅' : budgetHealth === 'danger' ? '⚠️' : '📈'}
                </div>
                <div className={styles.insightContent}>
                  <h4 className={styles.insightTitle}>Budget Status</h4>
                  <p className={styles.insightText}>
                    {budgetHealth === 'excellent' 
                      ? "You're doing great! Keep up the good spending habits."
                      : budgetHealth === 'danger'
                      ? "You're overspending. Review your expenses to get back on track."
                      : "Your budget is on track. Monitor your spending to maintain balance."}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className={styles.insight}
                whileHover={{ scale: 1.02 }}
              >
                <div className={styles.insightIcon} style={{ color: 'var(--color-accent-success)' }}>
                  💡
                </div>
                <div className={styles.insightContent}>
                  <h4 className={styles.insightTitle}>Savings Goal</h4>
                  <p className={styles.insightText}>
                    You're saving ${totalSavings.toLocaleString()} per month ({savingsRate.toFixed(1)}% of income).
                    {savingsRate >= 20 
                      ? " Excellent savings rate!"
                      : " Consider increasing your savings to 20% of income."}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                className={styles.insight}
                whileHover={{ scale: 1.02 }}
              >
                <div className={styles.insightIcon} style={{ color: 'var(--color-accent-info)' }}>
                  📱
                </div>
                <div className={styles.insightContent}>
                  <h4 className={styles.insightTitle}>Next Steps</h4>
                  <p className={styles.insightText}>
                    {bankAccounts.length === 0
                      ? "Connect your bank accounts to automatically track transactions."
                      : actualSpending === 0
                      ? "Start tracking your actual spending to compare with your budget."
                      : "Review your spending categories to find opportunities to save."}
                  </p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};