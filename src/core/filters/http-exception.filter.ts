import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response as ExpressResponse } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ExpressResponse>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Lỗi hệ thống' };

    // Ghi log lỗi
    const { method, url, body } = request;
    
    // Tạo body an toàn bằng cách loại bỏ mật khẩu nếu có
    const safeBody = { ...body };
    if (safeBody.password) {
      safeBody.password = '***';
    }

    if (status >= 500) {
      this.logger.error(
        `[${method}] ${url} - Status: ${status} - Body: ${JSON.stringify(safeBody)}`,
        exception instanceof Error ? exception.stack : JSON.stringify(exception),
      );
    } else {
      this.logger.warn(
        `[${method}] ${url} - Status: ${status} - Message: ${JSON.stringify(exceptionResponse)}`,
      );
    }

    let message = 'Có lỗi xảy ra';
    
    // Mapping status to message as requested
    switch (status) {
      case HttpStatus.OK:
      case HttpStatus.CREATED:
        message = 'Thành công';
        break;
      case HttpStatus.BAD_REQUEST:
        message = 'Yêu cầu không hợp lệ';
        break;
      case HttpStatus.UNAUTHORIZED:
        message = 'Không có quyền truy cập';
        break;
      case HttpStatus.FORBIDDEN:
        message = 'Bị từ chối truy cập';
        break;
      case HttpStatus.NOT_FOUND:
        message = 'Không tìm thấy tài nguyên';
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        message = 'Lỗi hệ thống';
        break;
      default:
        message = exceptionResponse.message || 'Có lỗi xảy ra';
    }

    // Handle ValidationPipe errors which are often in 'message' as an array
    const errorDetails = exceptionResponse.message || exception.message;

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(errorDetails) ? errorDetails[0] : message,
      data: Array.isArray(errorDetails) ? errorDetails : null,
    });
  }
}
