import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './file/file.entity';
import { FileService } from './file/file.service';
import { StaticModule } from './static/serve-static.module';
import { FileUploadController } from './upload/file-upload.controller';
import { FileUploadService } from './upload/file-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity]), StaticModule],
  controllers: [FileUploadController],
  providers: [FileService, FileUploadService],
  exports: [FileUploadService],
})
export class FileManagerModule {}
