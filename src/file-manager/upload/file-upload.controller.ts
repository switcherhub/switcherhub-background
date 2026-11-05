import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileUploadService } from './file-upload.service';
import { FileService } from '../file/file.service';
import { FileEntity } from '../file/file.entity';

@Controller('files')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly fileService: FileService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(16)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadFile(@UploadedFile() file) {
    return await this.fileUploadService.uploadFile(file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<FileEntity> {
    return this.fileService.findByIdOrFail(id);
  }
}
