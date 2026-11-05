import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { writeFileSync } from 'fs';
import { extname, join } from 'path';
import { FileCreateDto } from '../file/file-create.dto';
import { FileEntity } from '../file/file.entity';
import { FileService } from '../file/file.service';

@Injectable()
export class FileUploadService {
  constructor(private readonly fileService: FileService) {}

  async uploadFile(file: Express.Multer.File): Promise<FileEntity> {
    const fileCreateDto: FileCreateDto = {
      path: file.path,
      name: file.filename,
      size: file.size,
      type: file.mimetype,
    };

    return this.fileService.create(fileCreateDto);
  }

  async uploadFileFromURL(url: string): Promise<FileEntity> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    const ext = extname(url);
    const fileName = Array(16)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const filePath = join('./uploads', `${fileName}${ext}`);

    writeFileSync(filePath, response.data);

    const fileCreateDto: FileCreateDto = {
      path: filePath,
      name: fileName,
      size: Number(response.headers['content-length']),
      type: response.headers['content-type'],
    };

    return this.fileService.create(fileCreateDto);
  }
}
