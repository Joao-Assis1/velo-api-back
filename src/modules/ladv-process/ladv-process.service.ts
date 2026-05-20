import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { readFileSync } from 'fs';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { JourneyService } from '../journey/journey.service';
import { extractLadvFields, LadvOcrResult } from './lib/ladv-ocr';
import { LadvStatusDto } from './dto/ladv-status.dto';
import { ManualLadvDto } from './dto/manual-ladv.dto';

const UF_GUIDES: Record<string, { steps: string[] }> = {
  MS: {
    steps: [
      'Baixe o app CNH do Brasil (Senatran/Ministério dos Transportes)',
      'Faça login com gov.br e selecione "Solicitar LADV"',
      'Confirme seus dados pessoais e a categoria B',
      'Aguarde a emissão pelo DETRAN-MS (https://www.meudetran.ms.gov.br/) — você receberá uma notificação no app',
      'Salve o PDF gerado e faça o upload aqui em /ladv/me/upload',
    ],
  },
};

@Injectable()
export class LadvProcessService {
  private readonly logger = new Logger(LadvProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly journey: JourneyService,
  ) {}

  getGuide(uf: string): { uf: string; steps: string[] } {
    const normalized = (uf ?? '').toUpperCase();
    const guide = UF_GUIDES[normalized];
    if (guide) return { uf: normalized, steps: guide.steps };
    return {
      uf: normalized,
      steps: [
        'Baixe o app CNH do Brasil disponível na Apple Store e Google Play',
        'Faça login com gov.br e siga as instruções do seu DETRAN',
        'Aguarde a emissão da LADV pelo seu DETRAN',
        'Faça o upload do PDF aqui em /ladv/me/upload',
      ],
    };
  }

  async getMine(studentId: string): Promise<LadvStatusDto> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        ladvNumber: true,
        ladvIssuedAt: true,
        ladvValidUntil: true,
        ladvOcrConfidence: true,
        ladvOcrStatus: true,
        ladv_document_url: true,
        journeyStage: true,
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    const canBook =
      student.ladvOcrStatus === 'PASS' &&
      !!student.ladvValidUntil &&
      student.ladvValidUntil > new Date();
    return {
      ladvNumber: student.ladvNumber,
      ladvIssuedAt: student.ladvIssuedAt,
      ladvValidUntil: student.ladvValidUntil,
      ladvOcrConfidence: student.ladvOcrConfidence,
      ladvOcrStatus: student.ladvOcrStatus as LadvStatusDto['ladvOcrStatus'],
      ladvDocumentUrl: student.ladv_document_url,
      stage: student.journeyStage,
      canBook,
    };
  }

  private async persist(
    studentId: string,
    parsed: LadvOcrResult,
    documentUrl: string | null,
  ): Promise<LadvStatusDto> {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        ladvNumber: parsed.ladvNumber,
        ladvIssuedAt: parsed.issuedAt,
        ladvValidUntil: parsed.validUntil,
        ladvOcrConfidence: parsed.confidence === 0 ? null : parsed.confidence,
        ladvOcrStatus: parsed.status,
        ladvUploaded: parsed.status === 'PASS',
        ladv_document_url: documentUrl,
        ladv_validation_date: new Date(),
      },
    });
    await this.journey.refresh(studentId);
    return this.getMine(studentId);
  }

  private async extractTextFromFile(
    filePath: string,
  ): Promise<{ text: string; confidence: number }> {
    const isPdf = extname(filePath).toLowerCase() === '.pdf';

    if (isPdf) {
      const buffer = readFileSync(filePath);
      const data = await pdfParse(buffer);
      return { text: data.text, confidence: 90 };
    }

    const { data } = await Tesseract.recognize(filePath, 'por');
    return { text: data.text, confidence: data.confidence };
  }

  async uploadFromFile(
    studentId: string,
    filePath: string,
  ): Promise<LadvStatusDto> {
    this.logger.log(`Starting extraction for student ${studentId} LADV: ${filePath}`);
    let recognition: { text: string; confidence: number };
    try {
      recognition = await this.extractTextFromFile(filePath);
    } catch (e) {
      this.logger.error(`Extraction error: ${(e as Error).message}`);
      throw new BadRequestException(
        'Failed to process LADV document — try uploading a clearer image or a valid PDF',
      );
    }

    const parsed = extractLadvFields(recognition.text, recognition.confidence);
    if (parsed.status === 'FAIL') {
      throw new BadRequestException(
        `LADV document failed validation (confidence ${recognition.confidence}%, keywords missing or unreadable)`,
      );
    }
    return this.persist(studentId, parsed, filePath);
  }

  async saveManual(
    studentId: string,
    dto: ManualLadvDto,
  ): Promise<LadvStatusDto> {
    if (dto.ladvValidUntil <= new Date()) {
      throw new BadRequestException('ladvValidUntil must be in the future');
    }
    return this.persist(
      studentId,
      {
        ladvNumber: dto.ladvNumber,
        issuedAt: dto.ladvIssuedAt,
        validUntil: dto.ladvValidUntil,
        confidence: 0,
        status: 'PASS',
      },
      null,
    );
  }
}
