export type RenderQuality = "auto" | "low" | "medium" | "high";
export interface ClientPreferences {
  quality: RenderQuality;
  reducedMotion: boolean;
  joystick: "fixed" | "floating";
  musicVolume: number;
  ambientVolume: number;
  combatVolume: number;
  uiVolume: number;
  masterVolume: number;
}
export const defaultPreferences: ClientPreferences = {
  quality: "auto",
  reducedMotion: false,
  joystick: "fixed",
  musicVolume: 0.45,
  ambientVolume: 0.35,
  combatVolume: 0.65,
  uiVolume: 0.45,
  masterVolume: 0.7,
};
let current: ClientPreferences = { ...defaultPreferences };
try {
  const raw = JSON.parse(localStorage.getItem("kiem-hiep-client-v1") ?? "{}");
  for (const key of [
    "musicVolume",
    "ambientVolume",
    "combatVolume",
    "uiVolume",
    "masterVolume",
  ] as const)
    if (typeof raw[key] === "number" && raw[key] >= 0 && raw[key] <= 1)
      current[key] = raw[key];
  if (["auto", "low", "medium", "high"].includes(raw.quality))
    current.quality = raw.quality;
  if (["fixed", "floating"].includes(raw.joystick))
    current.joystick = raw.joystick;
  if (typeof raw.reducedMotion === "boolean")
    current.reducedMotion = raw.reducedMotion;
} catch {
  /* Các tùy chọn client có thể dùng mặc định, không ảnh hưởng bản lưu RPG. */
}
function syncMotionPreference() {
  if (typeof document !== "undefined")
    document.documentElement.dataset.reducedMotion = String(
      current.reducedMotion,
    );
}
syncMotionPreference();
export const getPreferences = () => current;
export function setPreferences(next: Partial<ClientPreferences>) {
  current = { ...current, ...next };
  try {
    localStorage.setItem("kiem-hiep-client-v1", JSON.stringify(current));
  } catch {
    /* Session vẫn dùng tùy chọn mới khi storage không khả dụng. */
  }
  syncMotionPreference();
  window.dispatchEvent(new Event("kiem-hiep-preferences"));
}
export function qualityBudget(width = 1280) {
  const pref = current.quality,
    level = pref === "auto" ? (width < 1000 ? "medium" : "high") : pref;
  return {
    level,
    chunkResolution: level === "low" ? 0.5 : level === "medium" ? 0.75 : 1,
    cacheChunks: level === "low" ? 20 : level === "medium" ? 26 : 32,
    maxEffects: level === "low" ? 12 : level === "medium" ? 28 : 48,
    weather: level === "low" ? 20 : level === "medium" ? 45 : 90,
  };
}
