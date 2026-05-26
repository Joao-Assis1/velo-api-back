import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { Instructor, Prisma } from '@prisma/client';

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  private readonly omitPassword = { password: true } as const;

  async create(
    data: CreateInstructorDto,
  ): Promise<Omit<Instructor, 'password'>> {
    return this.prisma.instructor.create({
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Instructor, 'password'>>;
  }

  async findAll() {
    return this.prisma.instructor.findMany({
      where: {
        credentialStatus: 'APPROVED',
        stripeAccountStatus: 'ACTIVE',
        isActive: true,
      },
      omit: this.omitPassword,
      include: { vehicles: true, availabilities: true },
    }) as unknown as Promise<
      Array<
        Omit<Instructor, 'password'> & {
          vehicles: any[];
          availabilities: any[];
        }
      >
    >;
  }

  async findOne(id: string) {
    return this.prisma.instructor.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        cpf: true,
        profilePicture: true,
        bio: true,
        instructorType: true,
        location: true,
        pricePerClass: true,
        rating: true,
        reviewsCount: true,
        termsAcceptedAt: true,
        cnhNumber: true,
        cnhCategory: true,
        cnhExpiry: true,
        cnhEar: true,
        certidaoNegativa: true,
        birthDate: true,
        educationLevel: true,
        renachNumber: true,
        createdAt: true,
        updatedAt: true,
        vehicles: true,
        availabilities: true,
        busySlots: true,
      },
    });
  }

  async update(
    id: string,
    data: UpdateInstructorDto,
  ): Promise<Omit<Instructor, 'password'>> {
    return this.prisma.instructor.update({
      where: { id },
      data,
      omit: this.omitPassword,
    }) as unknown as Promise<Omit<Instructor, 'password'>>;
  }

  async getEarnings(id: string, month?: string, year?: string) {
    const completedWhere: Prisma.LessonWhereInput = {
      instructorId: id,
      status: 'completed',
    };

    const pendingWhere: Prisma.LessonWhereInput = {
      instructorId: id,
      status: 'upcoming',
    };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 1);
      completedWhere.date = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [completedResult, pendingResult, history] = await Promise.all([
      this.prisma.lesson.aggregate({
        _sum: { price: true },
        where: completedWhere,
      }),
      this.prisma.lesson.aggregate({
        _sum: { price: true },
        where: pendingWhere,
      }),
      this.prisma.lesson.findMany({
        where: completedWhere,
        orderBy: { date: 'desc' },
        include: {
          student: {
            select: {
              name: true,
              profilePicture: true,
            },
          },
        },
      }),
    ]);

    return {
      availableBalance: completedResult._sum.price || 0,
      pendingBalance: pendingResult._sum.price || 0,
      transferredBalance: 0,
      history: history.map((lesson) => ({
        ...lesson,
        studentName: lesson.student?.name,
        studentImage: lesson.student?.profilePicture,
      })),
      month,
      year,
    };
  }
}
