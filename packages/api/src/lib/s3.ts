import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';
import { nanoid } from 'nanoid';

// Initialize S3 client only if AWS credentials are provided
const s3Client = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

export class S3Service {
  static isEnabled(): boolean {
    return !!s3Client && !!env.S3_BUCKET_NAME;
  }
  
  // Generate presigned URL for upload
  static async getUploadUrl(
    fileName: string,
    contentType: string,
    userId: string
  ): Promise<{ uploadUrl: string; key: string }> {
    if (!this.isEnabled()) {
      throw new Error('S3 storage is not configured');
    }
    
    const key = `paystubs/${userId}/${nanoid()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: {
        userId,
        originalFileName: fileName,
      },
    });
    
    const uploadUrl = await getSignedUrl(s3Client!, command, { expiresIn: 3600 });
    
    return { uploadUrl, key };
  }
  
  // Generate presigned URL for download
  static async getDownloadUrl(key: string): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('S3 storage is not configured');
    }
    
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    });
    
    return getSignedUrl(s3Client!, command, { expiresIn: 3600 });
  }
  
  // Upload file directly (for server-side uploads)
  static async uploadFile(
    file: File | Blob,
    fileName: string,
    userId: string
  ): Promise<string> {
    if (!this.isEnabled()) {
      throw new Error('S3 storage is not configured');
    }
    
    const key = `paystubs/${userId}/${nanoid()}-${fileName}`;
    const buffer = await file.arrayBuffer();
    
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: file.type,
      Metadata: {
        userId,
        originalFileName: fileName,
      },
    });
    
    await s3Client!.send(command);
    
    return key;
  }
  
  // Delete file
  static async deleteFile(key: string): Promise<void> {
    if (!this.isEnabled()) {
      throw new Error('S3 storage is not configured');
    }
    
    const command = new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    });
    
    await s3Client!.send(command);
  }
}

// Local file storage fallback (for development without AWS)
export class LocalFileStorage {
  private static readonly BASE_PATH = './uploads';
  
  static async uploadFile(
    file: File | Blob,
    fileName: string,
    userId: string
  ): Promise<string> {
    const dir = `${this.BASE_PATH}/paystubs/${userId}`;
    const filePath = `${dir}/${nanoid()}-${fileName}`;
    
    // Ensure directory exists
    await Bun.write(filePath, file);
    
    return filePath;
  }
  
  static async getFile(path: string): Promise<Blob> {
    const file = Bun.file(path);
    return file;
  }
  
  static async deleteFile(path: string): Promise<void> {
    await Bun.write(path, ''); // Clear file
    // In production, you'd actually delete the file
  }
}

// Export unified interface
export const FileStorage = S3Service.isEnabled() ? S3Service : LocalFileStorage;