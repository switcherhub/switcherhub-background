import { ParameterBaseController } from 'src/parameter/controllers/parameter.controller';
import { UserListEntity } from '../entities/user-list.entity';
import { UserListCreateDto } from '../dto/user-list-create.dto';
import { UserListUpdateDto } from '../dto/user-list-update.dto';
import { UserListService } from '../services/user-list.service';

export const UserListAdminController = ParameterBaseController(
  UserListEntity,
  UserListCreateDto,
  UserListUpdateDto,
  UserListService,
  'admin/user-list',
);
