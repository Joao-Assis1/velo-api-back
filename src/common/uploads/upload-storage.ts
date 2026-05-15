import { diskStorage, StorageEngine } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function buildUploadStorage(folder: string): StorageEngine {
  return diskStorage({
    destination: (req: Request, _file, cb) => {
      const studentId = (req.user as { id: string } | undefined)?.id ?? 'anonymous';
      const path = `uploads/${folder}/${studentId}`;
      if (!existsSync(path)) mkdirSync(path, { recursive: true });
      cb(null, path);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

export function uploadFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(
      new BadRequestException(
        `Mimetype ${file.mimetype} not allowed. Accepted: PDF, JPEG, PNG.`,
      ),
      false,
    );
    return;
  }
  cb(null, true);
}
