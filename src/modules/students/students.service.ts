import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { Student, Prisma } from '@prisma/client';
import * as Tesseract from 'tesseract.js';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(private prisma: PrismaService) {}

  private readonly omitPassword = { password: true } as const;

  async create(data: CreateStudentDto): Promise<Omit<Student, 'password'>> {
    return this.prisma.student.create({
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>>;
  }

  async findAll(): Promise<Omit<Student, 'password'>[]> {
    return this.prisma.student.findMany({
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>[]>;
  }

  async findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        cpf: true,
        profilePicture: true,
        ladvUploaded: true,
        ladv_document_url: true,
        ladv_validation_date: true,
        termsAcceptedAt: true,
        birthDate: true,
        motherName: true,
        ufDomicile: true,
        intendedCategory: true,
        createdAt: true,
        updatedAt: true,
        paymentMethods: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.StudentUpdateInput,
  ): Promise<Omit<Student, 'password'>> {
    return this.prisma.student.update({
      where: { id },
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Student, 'password'>>;
  }

  async uploadLadv(
    id: string,
    _fileName: string,
    filePath: string,
  ): Promise<Omit<Student, 'password'>> {
    this.logger.log(`Starting OCR for student ${id} LADV: ${filePath}`);

    try {
      const { data: { text, confidence } } = await Tesseract.recognize(filePath, 'por', {
        logger: m => this.logger.debug(m)
      });

      this.logger.log(`OCR Confidence: ${confidence}%`);

      // C-010: Verify confidence and keywords
      const keywords = ['LADV', 'LICENÇA', 'APRENDIZAGEM', 'DETRAN'];
      const hasKeywords = keywords.some(keyword => text.toUpperCase().includes(keyword));

      if (confidence < 50 || !hasKeywords) {
        this.logger.warn(`LADV OCR failed: Confidence ${confidence}%, Keywords found: ${hasKeywords}`);
        throw new BadRequestException('LADV document seems invalid or unreadable. Please upload a clear image.');
      }

      return this.prisma.student.update({
        where: { id },
        data: {
          ladvUploaded: true,
          ladv_document_url: filePath,
          ladv_validation_date: new Date(),
        },
        omit: this.omitPassword,
      }) as unknown as Promise<Omit<Student, 'password'>>;
    } catch (error) {
      this.logger.error(`Error during LADV OCR: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to process LADV document');
    }
  }

  async getLadvStatus(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        ladvUploaded: true,
        ladv_validation_date: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return {
      studentId: student.id,
      ladvUploaded: student.ladvUploaded,
      ladvValidationDate: student.ladv_validation_date,
      canBook: student.ladvUploaded,
    };
  }
}
