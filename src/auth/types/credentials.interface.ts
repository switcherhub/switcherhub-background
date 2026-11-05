export interface CredentialsInterface {
  id: string;
  email: string;
  password: string;
  accessToken: string | null;

  recoveryCode: string | null;
  recoveryCodeExpires: Date;

  registeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
