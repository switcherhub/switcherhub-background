import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';

export interface AppVersionInterface extends ParameterBaseInterface {
  minimumRequiredVersion: string;
  type: AppVersionTypeEnum;
}

export enum AppVersionTypeEnum {
  ANDROID = 'android',
  IOS = 'ios',
}
