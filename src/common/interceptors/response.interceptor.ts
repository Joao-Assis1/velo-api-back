import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

// Brasília: UTC-3 (sem horário de verão desde 2019)
const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;

function formatDateBR(date: Date): string {
  const isDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0;

  if (isDateOnly) {
    // Datas armazenadas como midnight UTC → usar partes UTC diretamente
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  }

  // Timestamps com hora → converter para BRT
  const brt = new Date(date.getTime() + BRT_OFFSET_MS);
  const day = String(brt.getUTCDate()).padStart(2, '0');
  const month = String(brt.getUTCMonth() + 1).padStart(2, '0');
  const hours = String(brt.getUTCHours()).padStart(2, '0');
  const minutes = String(brt.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${brt.getUTCFullYear()} ${hours}:${minutes}`;
}

function transformDates(value: unknown): unknown {
  if (value instanceof Date) return formatDateBR(value);
  if (Array.isArray(value)) return value.map(transformDates);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, transformDates(v)]),
    );
  }
  return value;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        const response: ApiResponse<T> = {
          success: true,
          message: 'Operação realizada com sucesso',
          data: transformDates(data) as T,
          timestamp: new Date().toISOString(),
        };
        return response;
      }),
    );
  }
}
