export function isVacancyPayload(obj: any): boolean {
  return obj && typeof obj.vacancyId === 'string';
}

export function isResumePayload(obj: any): boolean {
  return obj && typeof obj.resumeId === 'string';
}

export function isImagePayload(obj: any): boolean {
  return obj && typeof obj.imageUrl === 'string';
}

export function isFilePayload(obj: any): boolean {
  return obj && typeof obj.fileUrl === 'string';
}
