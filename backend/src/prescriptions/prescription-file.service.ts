import { randomUUID } from 'crypto';
import { mkdir, readFile, stat, unlink } from 'fs/promises';
import { join } from 'path';
import multer = require('multer');

const { diskStorage } = multer;
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';

export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** `UPLOADS_DIR` ou `uploads` sob o cwd do backend; os PDFs ficam em `receitas/`. */
export function recipesUploadDir(): string {
  return join(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'), 'receitas');
}

/**
 * Nome em disco é o UUID final, então não há rename nem nome original em disco.
 * Declarado fora da classe porque os decorators são avaliados antes da injeção.
 */
export function recipesDiskStorage(): NonNullable<multer.Options['storage']> {
  return diskStorage({
    destination(_req, _file, cb) {
      const dir = recipesUploadDir();
      mkdir(dir, { recursive: true })
        .then(() => cb(null, dir))
        .catch((error: Error) => cb(error, dir));
    },
    filename(_req, _file, cb) {
      cb(null, `${randomUUID()}.pdf`);
    },
  });
}

/** Rejeita tipo/extensão não PDF antes da gravação: nada é escrito em disco. */
export const pdfFileFilter: NonNullable<multer.Options['fileFilter']> = (_req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf' && /\.pdf$/i.test(file.originalname ?? '');
  if (!isPdf) {
    cb(new BadRequestException('Somente arquivos PDF são aceitos'));
    return;
  }
  cb(null, true);
};

export interface StoredPdf {
  storedName: string;
  displayName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class PrescriptionFileService implements OnModuleInit {
  private readonly root = recipesUploadDir();

  async onModuleInit(): Promise<void> {
    await this.ensureDir();
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.root, { recursive: true });
  }

  /** Caminho absoluto; nunca devolvido nas respostas da API. */
  absolutePath(storedName: string): string {
    return join(this.root, storedName);
  }

  /**
   * O multer já gravou o arquivo: aqui só se valida e se extrai os metadados.
   * O nome de exibição é o informado no formulário, não o do upload.
   */
  register(file: Express.Multer.File | undefined, displayName?: string): StoredPdf {
    if (!file) throw new BadRequestException('Arquivo PDF é obrigatório');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Somente arquivos PDF são aceitos');
    }
    if (file.size > MAX_PDF_BYTES) {
      throw new BadRequestException('Arquivo excede o limite de 10MB');
    }
    return {
      storedName: file.filename,
      displayName: this.sanitizeDisplayName(displayName || file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async read(storedName: string): Promise<Buffer> {
    try {
      return await readFile(this.absolutePath(storedName));
    } catch {
      throw new NotFoundException('Arquivo da receita não encontrado');
    }
  }

  async exists(storedName: string): Promise<boolean> {
    try {
      await stat(this.absolutePath(storedName));
      return true;
    } catch {
      return false;
    }
  }

  /** Arquivo órfão: gravado pelo multer, mas não referenciado no banco. */
  async removeUpload(file: Express.Multer.File | undefined): Promise<void> {
    if (file?.filename) await this.removeQuietly(file.filename);
  }

  async remove(storedName: string): Promise<void> {
    await this.removeQuietly(storedName);
  }

  private async removeQuietly(name: string): Promise<void> {
    try {
      await unlink(this.absolutePath(name));
    } catch {
      /* já removido ou nunca gravado */
    }
  }

  private sanitizeDisplayName(originalName: string): string {
    const base = (originalName ?? '').split(/[\\/]/).pop() ?? '';
    const cleaned = base
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/\.{2,}/g, '.')
      .trim()
      .slice(0, 200);
    if (!cleaned) return 'receita.pdf';
    return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
  }
}
