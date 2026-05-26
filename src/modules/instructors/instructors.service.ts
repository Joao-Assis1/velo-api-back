import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { Instructor, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from '../payments-stripe/stripe.client';
import { idempotencyKey } from '../payments-stripe/lib/idempotency';

@Injectable()
export class InstructorsService {
  constructor(
    private prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: InstanceType<typeof Stripe>,
  ) {}

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

  async seedTest(instructorId: string) {
    const instructor = await this.prisma.instructor.findUnique({
      where: { id: instructorId },
      select: { id: true, email: true, name: true, stripeAccountId: true },
    });
    if (!instructor) throw new NotFoundException(`Instructor ${instructorId} not found`);

    let accountId = instructor.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.accounts.create(
        {
          type: 'express',
          country: 'BR',
          email: instructor.email,
          capabilities: { transfers: { requested: true } },
        },
        { idempotencyKey: idempotencyKey(instructorId, 'seed-connect-account') },
      );
      accountId = account.id;
    }

    const updated = await this.prisma.instructor.update({
      where: { id: instructorId },
      data: {
        stripeAccountId: accountId,
        stripeAccountStatus: 'ACTIVE',
        stripePayoutsEnabled: true,
      },
    });

    return updated;
  }
}
