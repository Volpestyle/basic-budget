import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { FileStorage, S3Service } from '@/lib/s3';
import { authMiddleware, requireUserId } from '@/middleware/auth';
import { standardRateLimit, strictRateLimit } from '@/middleware/rateLimit';
import { paystubUploadSchema, paystubDataSchema, paginationSchema, dateRangeSchema } from '@/validators';

const paystubs = new Hono();

// Apply middleware
paystubs.use('*', authMiddleware);
paystubs.use('/upload', requireUserId, strictRateLimit);
paystubs.use('*', standardRateLimit);

// GET /paystubs - List paystubs
paystubs.get('/',
  requireUserId,
  zValidator('query', paginationSchema.merge(dateRangeSchema)),
  async (c) => {
    const userId = c.get('userId')!;
    const { page, limit, sort = 'uploadedAt', order, startDate, endDate } = c.req.valid('query');
    
    // Build where clause
    const where: any = {
      userId,
      ...(startDate && { payDate: { gte: new Date(startDate) } }),
      ...(endDate && { payDate: { ...where?.payDate, lte: new Date(endDate) } }),
    };
    
    const [paystubs, total] = await Promise.all([
      prisma.paystub.findMany({
        where,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
          processedAt: true,
          employerName: true,
          payPeriodStart: true,
          payPeriodEnd: true,
          payDate: true,
          grossPay: true,
          netPay: true,
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.paystub.count({ where }),
    ]);
    
    const response = {
      data: paystubs.map(p => ({
        ...p,
        grossPay: p.grossPay ? Number(p.grossPay) : null,
        netPay: p.netPay ? Number(p.netPay) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
    
    return c.json(response);
  }
);

// GET /paystubs/summary - Get paystub summary
paystubs.get('/summary',
  requireUserId,
  zValidator('query', dateRangeSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const { startDate, endDate } = c.req.valid('query');
    
    // Build date filter
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
    
    const [totalGross, totalNet, totalFederal, totalState, count] = await Promise.all([
      prisma.paystub.aggregate({
        where: {
          userId,
          payDate: dateFilter,
        },
        _sum: { grossPay: true },
      }),
      prisma.paystub.aggregate({
        where: {
          userId,
          payDate: dateFilter,
        },
        _sum: { netPay: true },
      }),
      prisma.paystub.aggregate({
        where: {
          userId,
          payDate: dateFilter,
        },
        _sum: { federalTax: true },
      }),
      prisma.paystub.aggregate({
        where: {
          userId,
          payDate: dateFilter,
        },
        _sum: { stateTax: true },
      }),
      prisma.paystub.count({
        where: {
          userId,
          payDate: dateFilter,
        },
      }),
    ]);
    
    return c.json({
      totalGrossPay: Number(totalGross._sum.grossPay || 0),
      totalNetPay: Number(totalNet._sum.netPay || 0),
      totalFederalTax: Number(totalFederal._sum.federalTax || 0),
      totalStateTax: Number(totalState._sum.stateTax || 0),
      paystubCount: count,
      averageGrossPay: count > 0 ? Number(totalGross._sum.grossPay || 0) / count : 0,
      averageNetPay: count > 0 ? Number(totalNet._sum.netPay || 0) / count : 0,
    });
  }
);

// GET /paystubs/:id - Get specific paystub
paystubs.get('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const paystubId = c.req.param('id');
    
    const paystub = await prisma.paystub.findFirst({
      where: {
        id: paystubId,
        userId,
      },
    });
    
    if (!paystub) {
      return c.json({ error: 'Paystub not found' }, 404);
    }
    
    // Generate download URL if using S3
    let downloadUrl: string | null = null;
    if (S3Service.isEnabled() && paystub.fileUrl) {
      try {
        downloadUrl = await S3Service.getDownloadUrl(paystub.fileUrl);
      } catch (error) {
        console.error('Failed to generate download URL:', error);
      }
    }
    
    return c.json({
      ...paystub,
      grossPay: paystub.grossPay ? Number(paystub.grossPay) : null,
      netPay: paystub.netPay ? Number(paystub.netPay) : null,
      federalTax: paystub.federalTax ? Number(paystub.federalTax) : null,
      stateTax: paystub.stateTax ? Number(paystub.stateTax) : null,
      socialSecurity: paystub.socialSecurity ? Number(paystub.socialSecurity) : null,
      medicare: paystub.medicare ? Number(paystub.medicare) : null,
      downloadUrl,
    });
  }
);

// POST /paystubs/upload - Upload paystub
paystubs.post('/upload',
  async (c) => {
    const userId = c.get('userId')!;
    
    try {
      const formData = await c.req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }
      
      // Validate file
      const validation = paystubUploadSchema.safeParse({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      
      if (!validation.success) {
        return c.json({ error: 'Invalid file', details: validation.error }, 400);
      }
      
      // Upload file
      let fileUrl: string;
      if (S3Service.isEnabled()) {
        fileUrl = await S3Service.uploadFile(file, file.name, userId);
      } else {
        fileUrl = await FileStorage.uploadFile(file, file.name, userId);
      }
      
      // Create paystub record
      const paystub = await prisma.paystub.create({
        data: {
          userId,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          mimeType: file.type,
        },
      });
      
      // Queue for processing (in production, use a job queue)
      processPaystub(paystub.id, file).catch(console.error);
      
      // Invalidate cache
      await cache.invalidatePattern(`paystubs:${userId}:*`);
      
      return c.json({
        id: paystub.id,
        fileName: paystub.fileName,
        uploadedAt: paystub.uploadedAt,
        status: 'processing',
      }, 201);
    } catch (error) {
      console.error('Upload error:', error);
      return c.json({ error: 'Upload failed' }, 500);
    }
  }
);

// POST /paystubs/upload-url - Get presigned upload URL (for direct browser upload)
paystubs.post('/upload-url',
  requireUserId,
  zValidator('json', z.object({
    fileName: z.string().min(1).max(255),
    contentType: z.string(),
  })),
  async (c) => {
    const userId = c.get('userId')!;
    const { fileName, contentType } = c.req.valid('json');
    
    if (!S3Service.isEnabled()) {
      return c.json({ error: 'Direct upload not available' }, 501);
    }
    
    try {
      const { uploadUrl, key } = await S3Service.getUploadUrl(
        fileName,
        contentType,
        userId
      );
      
      // Create placeholder record
      const paystub = await prisma.paystub.create({
        data: {
          userId,
          fileName,
          fileUrl: key,
          fileSize: 0, // Will be updated after upload
          mimeType: contentType,
        },
      });
      
      return c.json({
        uploadUrl,
        paystubId: paystub.id,
      });
    } catch (error) {
      console.error('Presigned URL error:', error);
      return c.json({ error: 'Failed to generate upload URL' }, 500);
    }
  }
);

// PUT /paystubs/:id - Update paystub data
paystubs.put('/:id',
  requireUserId,
  zValidator('json', paystubDataSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const paystubId = c.req.param('id');
    const data = c.req.valid('json');
    
    // Verify ownership
    const existing = await prisma.paystub.findFirst({
      where: {
        id: paystubId,
        userId,
      },
    });
    
    if (!existing) {
      return c.json({ error: 'Paystub not found' }, 404);
    }
    
    // Update paystub
    const paystub = await prisma.paystub.update({
      where: { id: paystubId },
      data: {
        employerName: data.employerName,
        payPeriodStart: data.payPeriodStart ? new Date(data.payPeriodStart) : undefined,
        payPeriodEnd: data.payPeriodEnd ? new Date(data.payPeriodEnd) : undefined,
        payDate: data.payDate ? new Date(data.payDate) : undefined,
        grossPay: data.grossPay,
        netPay: data.netPay,
        federalTax: data.federalTax,
        stateTax: data.stateTax,
        socialSecurity: data.socialSecurity,
        medicare: data.medicare,
        metadata: data.metadata,
        processedAt: new Date(),
      },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`paystubs:${userId}:*`);
    
    return c.json({
      ...paystub,
      grossPay: paystub.grossPay ? Number(paystub.grossPay) : null,
      netPay: paystub.netPay ? Number(paystub.netPay) : null,
      federalTax: paystub.federalTax ? Number(paystub.federalTax) : null,
      stateTax: paystub.stateTax ? Number(paystub.stateTax) : null,
      socialSecurity: paystub.socialSecurity ? Number(paystub.socialSecurity) : null,
      medicare: paystub.medicare ? Number(paystub.medicare) : null,
    });
  }
);

// DELETE /paystubs/:id - Delete paystub
paystubs.delete('/:id',
  requireUserId,
  async (c) => {
    const userId = c.get('userId')!;
    const paystubId = c.req.param('id');
    
    // Verify ownership
    const paystub = await prisma.paystub.findFirst({
      where: {
        id: paystubId,
        userId,
      },
    });
    
    if (!paystub) {
      return c.json({ error: 'Paystub not found' }, 404);
    }
    
    // Delete file
    if (paystub.fileUrl) {
      try {
        if (S3Service.isEnabled()) {
          await S3Service.deleteFile(paystub.fileUrl);
        } else {
          await FileStorage.deleteFile(paystub.fileUrl);
        }
      } catch (error) {
        console.error('File deletion error:', error);
      }
    }
    
    // Delete record
    await prisma.paystub.delete({
      where: { id: paystubId },
    });
    
    // Invalidate cache
    await cache.invalidatePattern(`paystubs:${userId}:*`);
    
    return c.json({ success: true });
  }
);

// Process paystub (extract data from PDF/image)
async function processPaystub(paystubId: string, file: File) {
  try {
    // In production, this would use OCR/AI services to extract data
    // For now, we'll just mark it as processed
    
    await prisma.paystub.update({
      where: { id: paystubId },
      data: {
        processedAt: new Date(),
        // In production, extracted data would be saved here
      },
    });
  } catch (error) {
    console.error('Paystub processing error:', error);
  }
}

export default paystubs;