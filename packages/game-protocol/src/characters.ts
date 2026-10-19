export const LOCAL_CHARACTER_SLOTS = 5;

export function createLocalCharacterId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function normalizeCharacterName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function characterNameKey(value: string) {
  return normalizeCharacterName(value).toLocaleLowerCase("vi-VN");
}

export function characterNameError(value: string): string | null {
  const name = normalizeCharacterName(value);
  if ([...name].length < 2 || [...name].length > 18)
    return "Tên nhân vật cần từ 2 đến 18 ký tự.";
  if (!/^[\p{L}\p{M}\p{N} '\-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name))
    return "Tên chỉ gồm chữ, số, khoảng trắng, dấu nháy hoặc gạch nối.";
  return null;
}
