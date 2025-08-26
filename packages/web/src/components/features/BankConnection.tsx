import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { bankAccountsAtom, type BankAccount } from '../../store/atoms';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import styles from './BankConnection.module.css';

const bankLogos: Record<string, string> = {
  'Chase': '🏦',
  'Bank of America': '🏛️',
  'Wells Fargo': '🏪',
  'Citi': '🌆',
  'Capital One': '💳',
  'US Bank': '🇺🇸',
};

export const BankConnection: React.FC = () => {
  const [bankAccounts, setBankAccounts] = useAtom(bankAccountsAtom);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const handleConnectBank = (bankName: string) => {
    setSelectedBank(bankName);
    setIsConnecting(true);
    
    // Simulate Plaid connection flow
    setTimeout(() => {
      const newAccount: BankAccount = {
        id: Date.now().toString(),
        institution: bankName,
        name: `${bankName} Checking`,
        balance: 5000 + Math.random() * 10000,
        type: 'checking',
        lastSync: new Date(),
      };
      
      setBankAccounts([...bankAccounts, newAccount]);
      setIsConnecting(false);
      setIsModalOpen(false);
      setSelectedBank(null);
    }, 2000);
  };

  const handleSyncAccount = (accountId: string) => {
    setBankAccounts(bankAccounts.map(account => 
      account.id === accountId 
        ? { ...account, lastSync: new Date(), balance: account.balance + (Math.random() * 1000 - 500) }
        : account
    ));
  };

  const handleDisconnectAccount = (accountId: string) => {
    setBankAccounts(bankAccounts.filter(account => account.id !== accountId));
  };

  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <>
      <div className={styles.container}>
        <Card variant="elevated">
          <CardHeader
            title="Connected Accounts"
            subtitle="Link your bank accounts for automatic transaction import"
            action={
              <Button onClick={() => setIsModalOpen(true)}>
                Connect Bank
              </Button>
            }
          />
          <CardContent>
            {bankAccounts.length === 0 ? (
              <motion.div 
                className={styles.emptyState}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className={styles.emptyIcon}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className={styles.emptyTitle}>No accounts connected</h3>
                <p className={styles.emptyText}>
                  Connect your bank accounts to automatically import transactions and track your spending
                </p>
                <Button onClick={() => setIsModalOpen(true)}>
                  Connect Your First Account
                </Button>
              </motion.div>
            ) : (
              <>
                <div className={styles.totalBalance}>
                  <span className={styles.balanceLabel}>Total Balance</span>
                  <motion.span 
                    className={styles.balanceValue}
                    key={totalBalance}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </motion.span>
                </div>
                
                <div className={styles.accountList}>
                  <AnimatePresence>
                    {bankAccounts.map((account, index) => (
                      <motion.div
                        key={account.id}
                        className={styles.accountCard}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        layout
                      >
                        <div className={styles.accountHeader}>
                          <div className={styles.accountIcon}>
                            {bankLogos[account.institution] || '🏦'}
                          </div>
                          <div className={styles.accountInfo}>
                            <h4 className={styles.accountName}>{account.name}</h4>
                            <p className={styles.accountInstitution}>{account.institution}</p>
                          </div>
                          <div className={styles.accountType}>
                            <span className={styles.typeChip}>{account.type}</span>
                          </div>
                        </div>
                        
                        <div className={styles.accountBody}>
                          <div className={styles.accountBalance}>
                            <span className={styles.balanceLabel}>Balance</span>
                            <span className={styles.balanceAmount}>
                              ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          <div className={styles.accountSync}>
                            <span className={styles.syncLabel}>
                              Last synced: {account.lastSync ? new Date(account.lastSync).toLocaleTimeString() : 'Never'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.accountActions}>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleSyncAccount(account.id)}
                          >
                            Sync
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDisconnectAccount(account.id)}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isConnecting && setIsModalOpen(false)}
        title="Connect Bank Account"
        size="md"
        closeOnOverlayClick={!isConnecting}
      >
        <div className={styles.modalContent}>
          {!selectedBank ? (
            <>
              <p className={styles.modalText}>
                Select your bank to securely connect your account through Plaid
              </p>
              <div className={styles.bankGrid}>
                {Object.entries(bankLogos).map(([bank, logo]) => (
                  <motion.button
                    key={bank}
                    className={styles.bankOption}
                    onClick={() => handleConnectBank(bank)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className={styles.bankLogo}>{logo}</span>
                    <span className={styles.bankName}>{bank}</span>
                  </motion.button>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.connectingState}>
              <motion.div
                className={styles.connectingIcon}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              <h3 className={styles.connectingTitle}>Connecting to {selectedBank}</h3>
              <p className={styles.connectingText}>
                Securely connecting to your bank account...
              </p>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};