import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { auth } from '../middleware/auth';
import { db, paystubs } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { queuePaystubProcessing } from '../queue';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { nanoid } from 'nanoid';

const paystubsRouter = new Hono();

// Apply auth middleware to all routes
paystubsRouter.use('*', auth);

// Initialize S3 client if configured
const s3Client = config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

// List paystubs
paystubsRouter.get('/', async (c) => {
  const user = c.get('user');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  const status = c.req.query('status');
  
  let conditions: any[] = [eq(paystubs.userId, user.id)];
  
  if (status) {
    conditions.push(eq(paystubs.status, status as any));
  }
  
  const paystubList = await db
    .select()
    .from(paystubs)
    .where(and(...conditions))
    .orderBy(desc(paystubs.createdAt))
    .limit(limit)
    .offset(offset);
  
  return c.json(paystubList);
});

// Get single paystub
paystubsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const paystubId = c.req.param('id');
  
  const [paystub] = await db
    .select()
    .from(paystubs)
    .where(
      and(
        eq(paystubs.id, paystubId),
        eq(paystubs.userId, user.id)
      )
    )
    .limit(1);
  
  if (!paystub) {
    throw new HTTPException(404, { message: 'Paystub not found' });
  }
  
  return c.json(paystub);
});

// Upload paystub
paystubsRouter.post('/upload', async (c) => {
  const user = c.get('user');
  
  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new HTTPException(400, { message: 'No file provided' });
  }
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    throw new HTTPException(400, { 
      message: 'Invalid file type. Only PDF and images are allowed.' 
    });
  }
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new HTTPException(400, { 
      message: 'File too large. Maximum size is 10MB.' 
    });
  }
  
  let fileUrl: string;
  
  if (s3Client && config.S3_BUCKET_NAME) {
    // Upload to S3
    const fileKey = `paystubs/${user.id}/${nanoid()}-${file.name}`;
    const buffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET_NAME,
      Key: fileKey,
      Body: new Uint8Array(buffer),
      ContentType: file.type,
      Metadata: {
        userId: user.id,
        originalName: file.name,
      },
    });
    
    await s3Client.send(command);
    fileUrl = `https://${config.S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/${fileKey}`;
  } else {
    // Local storage fallback (for development)
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    fileUrl = `data:${file.type};base64,${base64}`;
  }
  
  // Create paystub record
  const [paystub] = await db
    .insert(paystubs)
    .values({
      userId: user.id,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: 'pending',
    })
    .returning();
  
  if (!paystub) {
    throw new HTTPException(500, { message: 'Failed to create paystub record' });
  }
  
  // Queue for processing
  await queuePaystubProcessing(paystub.id, user.id, fileUrl);
  
  return c.json({
    message: 'Paystub uploaded successfully',
    paystub,
  }, 201);
});

// Delete paystub
paystubsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const paystubId = c.req.param('id');
  
  // Check ownership
  const [existing] = await db
    .select()
    .from(paystubs)
    .where(
      and(
        eq(paystubs.id, paystubId),
        eq(paystubs.userId, user.id)
      )
    )
    .limit(1);
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Paystub not found' });
  }
  
  // TODO: Delete file from S3 if using S3 storage
  
  // Delete paystub record
  await db
    .delete(paystubs)
    .where(eq(paystubs.id, paystubId));
  
  return c.json({ message: 'Paystub deleted successfully' });
});

// Retry processing for failed paystubs
paystubsRouter.post('/:id/retry', async (c) => {
  const user = c.get('user');
  const paystubId = c.req.param('id');
  
  // Get paystub
  const [paystub] = await db
    .select()
    .from(paystubs)
    .where(
      and(
        eq(paystubs.id, paystubId),
        eq(paystubs.userId, user.id),
        eq(paystubs.status, 'failed')
      )
    )
    .limit(1);
  
  if (!paystub) {
    throw new HTTPException(404, { 
      message: 'Paystub not found or not in failed state' 
    });
  }
  
  // Reset status and queue for reprocessing
  await db
    .update(paystubs)
    .set({
      status: 'pending',
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(paystubs.id, paystubId));
  
  await queuePaystubProcessing(paystubId, user.id, paystub.fileUrl);
  
  return c.json({ message: 'Paystub queued for reprocessing' });
});

export { paystubsRouter };