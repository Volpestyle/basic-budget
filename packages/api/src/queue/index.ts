import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../lib/redis';
import { config } from '../config';
import { db, paystubs } from '../db';
import { eq } from 'drizzle-orm';

// Queue configuration
const queueConfig = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
};

// Paystub processing queue
export const paystubQueue = new Queue('paystub-processing', queueConfig);

// Paystub processing worker
export const paystubWorker = new Worker(
  'paystub-processing',
  async (job: Job) => {
    const { paystubId, userId, fileUrl } = job.data;
    
    console.log(`Processing paystub ${paystubId} for user ${userId}`);
    
    try {
      // Update status to processing
      await db
        .update(paystubs)
        .set({
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(paystubs.id, paystubId));
      
      // TODO: Implement actual OCR/parsing logic here
      // This would typically involve:
      // 1. Download file from S3
      // 2. Run OCR (e.g., using AWS Textract or similar)
      // 3. Parse extracted text for pay information
      // 4. Store structured data
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Mock processed data
      const processedData = {
        employerName: 'Mock Employer',
        grossPay: 5000,
        netPay: 3750,
        deductions: {
          federalTax: 750,
          stateTax: 250,
          socialSecurity: 250,
        },
        payPeriod: {
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      };
      
      // Update paystub with processed data
      await db
        .update(paystubs)
        .set({
          status: 'completed',
          processedData,
          grossPay: processedData.grossPay.toString(),
          netPay: processedData.netPay.toString(),
          employerName: processedData.employerName,
          payPeriodStart: processedData.payPeriod.start,
          payPeriodEnd: processedData.payPeriod.end,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paystubs.id, paystubId));
      
      console.log(`Successfully processed paystub ${paystubId}`);
      
      return { success: true, paystubId };
    } catch (error) {
      console.error(`Failed to process paystub ${paystubId}:`, error);
      
      // Update status to failed
      await db
        .update(paystubs)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date(),
        })
        .where(eq(paystubs.id, paystubId));
      
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 paystubs concurrently
  }
);

// Export queue functions
export const queuePaystubProcessing = async (
  paystubId: string,
  userId: string,
  fileUrl: string
) => {
  return paystubQueue.add(
    'process-paystub',
    {
      paystubId,
      userId,
      fileUrl,
    },
    {
      priority: 1,
    }
  );
};

// Start worker if not in serverless environment
if (config.NODE_ENV !== 'production') {
  paystubWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });
  
  paystubWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
}