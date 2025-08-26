import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { paystubsAtom, type Paystub } from '../../store/atoms';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import styles from './PaystubUpload.module.css';

export const PaystubUpload: React.FC = () => {
  const [paystubs, setPaystubs] = useAtom(paystubsAtom);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Paystub | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploading(true);
    
    // Simulate upload and parsing
    setTimeout(() => {
      const newPaystubs = acceptedFiles.map(file => ({
        id: Date.now().toString() + Math.random(),
        date: new Date(),
        grossPay: 5000 + Math.random() * 2000,
        netPay: 3800 + Math.random() * 1500,
        deductions: {
          'Federal Tax': 800 + Math.random() * 200,
          'State Tax': 300 + Math.random() * 100,
          '401k': 300,
          'Health Insurance': 200,
        },
        fileName: file.name,
        uploadDate: new Date(),
      }));
      
      setPaystubs([...paystubs, ...newPaystubs]);
      setPreview(newPaystubs[0]);
      setUploading(false);
    }, 1500);
  }, [paystubs, setPaystubs]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    multiple: true,
  });

  return (
    <>
      <Card variant="elevated">
        <CardHeader
          title="Upload Paystubs"
          subtitle="Drag and drop or click to upload paystub documents"
        />
        <CardContent>
          <div
            {...getRootProps()}
            className={styles.dropzone}
            style={{
              transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
              borderColor: isDragActive ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
            }}
          >
            <input {...getInputProps()} />
            
            <motion.div
              className={styles.dropzoneContent}
              animate={{ opacity: uploading ? 0.5 : 1 }}
            >
              <motion.div
                className={styles.uploadIcon}
                animate={{ 
                  y: isDragActive ? -10 : 0,
                  scale: isDragActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 10L12 5L17 10M12 5V15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 15V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
              
              <p className={styles.dropzoneText}>
                {uploading ? 'Processing...' : isDragActive ? 'Drop files here' : 'Drop paystub files here or click to browse'}
              </p>
              <p className={styles.dropzoneSubtext}>
                Supports PDF, PNG, JPG files
              </p>
            </motion.div>
          </div>

          {paystubs.length > 0 && (
            <motion.div
              className={styles.paystubList}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h4 className={styles.listTitle}>Recent Uploads</h4>
              <div className={styles.listItems}>
                <AnimatePresence>
                  {paystubs.slice(-3).reverse().map((paystub, index) => (
                    <motion.div
                      key={paystub.id}
                      className={styles.paystubItem}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setPreview(paystub)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={styles.paystubIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 2V8H20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className={styles.paystubInfo}>
                        <p className={styles.paystubName}>{paystub.fileName}</p>
                        <p className={styles.paystubDate}>
                          {new Date(paystub.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={styles.paystubAmount}>
                        <p className={styles.amountLabel}>Net Pay</p>
                        <p className={styles.amountValue}>
                          ${paystub.netPay.toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.previewCard}
        >
          <Card variant="glass">
            <CardHeader
              title="Paystub Details"
              subtitle={preview.fileName}
              action={
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  Close
                </Button>
              }
            />
            <CardContent>
              <div className={styles.previewGrid}>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Date</span>
                  <span className={styles.previewValue}>
                    {new Date(preview.date).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Gross Pay</span>
                  <span className={styles.previewValue}>
                    ${preview.grossPay.toFixed(2)}
                  </span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Net Pay</span>
                  <span className={styles.previewValue}>
                    ${preview.netPay.toFixed(2)}
                  </span>
                </div>
                <div className={styles.previewDeductions}>
                  <h5>Deductions</h5>
                  {Object.entries(preview.deductions).map(([key, value]) => (
                    <div key={key} className={styles.deductionItem}>
                      <span>{key}</span>
                      <span>${value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
};