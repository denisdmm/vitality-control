import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, from, Observable, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { PrescriptionFileService } from './prescription-file.service';

/**
 * O multer grava o PDF antes de qualquer regra de negócio, então validação de DTO,
 * vínculo com o paciente ou falha no banco deixariam o arquivo órfão em disco.
 * Este interceptor apaga o upload quando a requisição não conclui com sucesso.
 *
 * Precisa vir depois do `FileInterceptor`, para o arquivo já existir no request.
 */
@Injectable()
export class CleanUploadOnErrorInterceptor implements NestInterceptor {
  constructor(private readonly files: PrescriptionFileService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const file = context.switchToHttp().getRequest().file as
      | Express.Multer.File
      | undefined;
    return next.handle().pipe(
      catchError((error: unknown) =>
        from(this.files.removeUpload(file)).pipe(mergeMap(() => throwError(() => error))),
      ),
    );
  }
}
