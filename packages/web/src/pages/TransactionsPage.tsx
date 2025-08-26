import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { transactionsAtom, categoriesAtom, type Transaction } from '../store/atoms';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import styles from './TransactionsPage.module.css';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useAtom(transactionsAtom);
  const [categories] = useAtom(categoriesAtom);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    description: '',
    amount: 0,
    categoryId: '',
    date: new Date(),
  });

  const handleAddTransaction = () => {
    if (newTransaction.description && newTransaction.amount && newTransaction.categoryId) {
      const transaction: Transaction = {
        id: Date.now().toString(),
        description: newTransaction.description,
        amount: Number(newTransaction.amount),
        categoryId: newTransaction.categoryId,
        date: newTransaction.date || new Date(),
      };
      
      setTransactions([...transactions, transaction]);
      setNewTransaction({
        description: '',
        amount: 0,
        categoryId: '',
        date: new Date(),
      });
      setIsModalOpen(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || t.categoryId === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCategoryById = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  return (
    <>
      <div className={styles.container}>
        <motion.div 
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={styles.title}>Transactions</h1>
          <Button onClick={() => setIsModalOpen(true)}>
            Add Transaction
          </Button>
        </motion.div>

        <Card variant="elevated">
          <CardContent>
            <div className={styles.controls}>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                variant="filled"
                className={styles.searchInput}
              />
              
              <select 
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.transactionsList}>
              <AnimatePresence>
                {filteredTransactions.length === 0 ? (
                  <motion.div 
                    className={styles.emptyState}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className={styles.emptyIcon}>📝</div>
                    <h3>No transactions found</h3>
                    <p>Start by adding your first transaction</p>
                  </motion.div>
                ) : (
                  filteredTransactions.map((transaction, index) => {
                    const category = getCategoryById(transaction.categoryId);
                    return (
                      <motion.div
                        key={transaction.id}
                        className={styles.transactionItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <div 
                          className={styles.categoryIndicator}
                          style={{ backgroundColor: category?.color }}
                        />
                        
                        <div className={styles.transactionInfo}>
                          <div className={styles.transactionMain}>
                            <h4 className={styles.transactionDescription}>
                              {transaction.description}
                            </h4>
                            <span className={styles.transactionCategory}>
                              {category?.name}
                            </span>
                          </div>
                          <span className={styles.transactionDate}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className={styles.transactionAmount}>
                          <span className={`${styles.amount} ${category?.type === 'income' ? styles.income : styles.expense}`}>
                            {category?.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          ✕
                        </Button>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
        size="sm"
      >
        <div className={styles.modalContent}>
          <Input
            label="Description"
            placeholder="e.g., Grocery shopping"
            value={newTransaction.description}
            onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
            fullWidth
          />
          
          <Input
            label="Amount"
            type="number"
            placeholder="0.00"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
            fullWidth
          />
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Category</label>
            <select 
              className={styles.select}
              value={newTransaction.categoryId}
              onChange={(e) => setNewTransaction({ ...newTransaction, categoryId: e.target.value })}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </select>
          </div>
          
          <Input
            label="Date"
            type="date"
            value={newTransaction.date ? new Date(newTransaction.date).toISOString().split('T')[0] : ''}
            onChange={(e) => setNewTransaction({ ...newTransaction, date: new Date(e.target.value) })}
            fullWidth
          />
          
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTransaction}>
              Add Transaction
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};