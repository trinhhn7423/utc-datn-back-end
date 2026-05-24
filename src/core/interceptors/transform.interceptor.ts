import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  totalElement?: number;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // If data is already a response object with message, extract it
        const message = data?.message || 'Thành công';
        const responseData = data?.data !== undefined ? data.data : data;

        return {
          statusCode: statusCode,
          message: message,
          data: responseData,
          ...(data?.totalElement !== undefined && { totalElement: data.totalElement }),
        };
      }),
    );
  }
}
