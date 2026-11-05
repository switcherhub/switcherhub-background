export function getEnumValues<T extends object>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj) as T[keyof T][];
}
