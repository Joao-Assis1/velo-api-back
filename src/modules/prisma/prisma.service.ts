import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Neon free tier suporta ~100 conexões por projeto, mas cada instância da API
      // deve manter um pool pequeno para não esgotar o limite sob deploy multi-instância.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      // Tempo máximo aguardando conexão disponível antes de lançar erro.
      connectionTimeoutMillis: 5_000,
      // Libera conexões ociosas após 30s — reduz compute billing no Neon.
      idleTimeoutMillis: 30_000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
