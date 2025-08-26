import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { categoriesAtom, type Category, totalIncomeAtom, totalExpensesAtom, totalSavingsAtom } from '../../store/atoms';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './BudgetPlanner.module.css';

export const BudgetPlanner: React.FC = () => {
  const [categories, setCategories] = useAtom(categoriesAtom);
  const [totalIncome] = useAtom(totalIncomeAtom);
  const [totalExpenses] = useAtom(totalExpensesAtom);
  const [totalSavings] = useAtom(totalSavingsAtom);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    type: 'expense',
    budgeted: 0,
    actual: 0,
    color: '#6366f1',
  });

  const handleAddCategory = () => {
    if (newCategory.name && newCategory.budgeted) {
      const category: Category = {
        id: Date.now().toString(),
        name: newCategory.name,
        type: newCategory.type as 'income' | 'expense',
        budgeted: Number(newCategory.budgeted),
        actual: 0,
        color: newCategory.color || '#6366f1',
      };
      setCategories([...categories, category]);
      setNewCategory({
        name: '',
        type: 'expense',
        budgeted: 0,
        actual: 0,
        color: '#6366f1',
      });
      setIsModalOpen(false);
    }
  };

  const handleUpdateCategory = (id: string, field: keyof Category, value: string | number) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, [field]: field === 'budgeted' ? Number(value) : value } : cat
    ));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const savingsPercentage = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  const savingsHealth = savingsPercentage >= 20 ? 'excellent' : savingsPercentage >= 10 ? 'good' : 'warning';

  return (
    <>
      <div className={styles.container}>
        <motion.div
          className={styles.summaryCards}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card variant="gradient" glow>
            <CardContent>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Income</span>
                <motion.span 
                  className={styles.summaryValue}
                  key={totalIncome}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  ${totalIncome.toLocaleString()}
                </motion.span>
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient">
            <CardContent>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Expenses</span>
                <motion.span 
                  className={styles.summaryValue}
                  key={totalExpenses}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  ${totalExpenses.toLocaleString()}
                </motion.span>
              </div>
            </CardContent>
          </Card>

          <Card variant="gradient" glow={savingsHealth === 'excellent'}>
            <CardContent>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Savings</span>
                <motion.span 
                  className={`${styles.summaryValue} ${styles[savingsHealth]}`}
                  key={totalSavings}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  ${totalSavings.toLocaleString()}
                </motion.span>
                <span className={styles.summaryPercentage}>
                  {savingsPercentage.toFixed(1)}% of income
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className={styles.categoriesSection}>
          <Card variant="elevated">
            <CardHeader
              title="Income Categories"
              action={
                <Button 
                  size="sm" 
                  onClick={() => {
                    setNewCategory({ ...newCategory, type: 'income' });
                    setIsModalOpen(true);
                  }}
                >
                  Add Income
                </Button>
              }
            />
            <CardContent>
              <div className={styles.categoryList}>
                <AnimatePresence>
                  {categories.filter(c => c.type === 'income').map((category, index) => (
                    <motion.div
                      key={category.id}
                      className={styles.categoryItem}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <div 
                        className={styles.categoryColor}
                        style={{ backgroundColor: category.color }}
                      />
                      <div className={styles.categoryName}>{category.name}</div>
                      <div className={styles.categoryBudget}>
                        <Input
                          type="number"
                          value={category.budgeted}
                          onChange={(e) => handleUpdateCategory(category.id, 'budgeted', e.target.value)}
                          variant="ghost"
                          className={styles.budgetInput}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        ✕
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader
              title="Expense Categories"
              action={
                <Button 
                  size="sm" 
                  onClick={() => {
                    setNewCategory({ ...newCategory, type: 'expense' });
                    setIsModalOpen(true);
                  }}
                >
                  Add Expense
                </Button>
              }
            />
            <CardContent>
              <div className={styles.categoryList}>
                <AnimatePresence>
                  {categories.filter(c => c.type === 'expense').map((category, index) => (
                    <motion.div
                      key={category.id}
                      className={styles.categoryItem}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <div 
                        className={styles.categoryColor}
                        style={{ backgroundColor: category.color }}
                      />
                      <div className={styles.categoryName}>{category.name}</div>
                      <div className={styles.categoryBudget}>
                        <Input
                          type="number"
                          value={category.budgeted}
                          onChange={(e) => handleUpdateCategory(category.id, 'budgeted', e.target.value)}
                          variant="ghost"
                          className={styles.budgetInput}
                        />
                      </div>
                      <div className={styles.categoryProgress}>
                        <div className={styles.progressBar}>
                          <motion.div 
                            className={styles.progressFill}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: `${Math.min((category.actual / category.budgeted) * 100, 100)}%`,
                              backgroundColor: category.actual > category.budgeted 
                                ? 'var(--color-accent-danger)' 
                                : 'var(--color-accent-success)'
                            }}
                            transition={{ type: 'spring', stiffness: 100 }}
                          />
                        </div>
                        <span className={styles.progressText}>
                          ${category.actual} / ${category.budgeted}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        ✕
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add ${newCategory.type === 'income' ? 'Income' : 'Expense'} Category`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <Input
            label="Category Name"
            placeholder="e.g., Groceries"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            fullWidth
          />
          <Input
            label="Budget Amount"
            type="number"
            placeholder="0.00"
            value={newCategory.budgeted}
            onChange={(e) => setNewCategory({ ...newCategory, budgeted: Number(e.target.value) })}
            fullWidth
          />
          <Input
            label="Color"
            type="color"
            value={newCategory.color}
            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
            fullWidth
          />
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>
              Add Category
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};