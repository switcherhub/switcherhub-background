import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from './file.entity';
import { Repository } from 'typeorm';
import { FileCreateDto } from './file-create.dto';
import { isUUID } from 'class-validator';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>,
  ) {}

  async findByIdOrFail(id: string): Promise<FileEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException(`id must be uuid`);
    }

    const file = await this.repository.findOneBy({ id });

    if (!file) {
      throw new NotFoundException(`File with id ${id} not found`);
    }

    return file;
  }

  async create(createDto: FileCreateDto): Promise<FileEntity> {
    return await this.repository.save(createDto);
  }
}
