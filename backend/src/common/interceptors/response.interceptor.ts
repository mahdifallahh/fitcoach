import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/**
 * Wraps every successful controller return value in a consistent envelope:
 *   { success: true, data: <value> }
 * Errors are shaped by AllExceptionsFilter instead.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiSuccess<T>> {
    return next.handle().pipe(map((data) => ({ success: true as const, data })));
  }
}
