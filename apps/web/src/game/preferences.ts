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
  /** Đốm sáng quanh đèn lồng/vật phát sáng vào ban đêm. */
  glowLanterns: boolean;
  /** Tông hoàng hôn/bình minh phủ ấm khi chuyển ngày–đêm. */
  duskTint: boolean;
  /** Sương theo chiều sâu ở phía xa khung hình. */
  depthFog: boolean;
  /** Lớp tiền cảnh trôi lệch tốc độ camera. */
  parallaxForeground: boolean;
  /** Camera nhìn trước theo hướng di chuyển + hơi phóng khi chạy nhanh. */
  cameraLookahead: boolean;
  /**
   * Bộ hiển thị: "2d" (Phaser, mặc định) hoặc "3d" (Three.js).
   * Đổi giá trị này chỉ có hiệu lực ở lần `bootGame` kế tiếp — không chuyển
   * nóng giữa phiên, vì cả hai bộ đều giữ chính canvas và vòng lặp riêng.
   */
  renderMode: "2d" | "3d";
  /** Bóng đổ thật trong bộ hiển thị 3D (mặc định tắt, chỉ bật khi đo được). */
  shadows3d: boolean;
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
  glowLanterns: true,
  duskTint: true,
  depthFog: true,
  parallaxForeground: true,
  cameraLookahead: true,
  renderMode: "2d",
  shadows3d: false,
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
  for (const key of [
    "glowLanterns",
    "duskTint",
    "depthFog",
    "parallaxForeground",
    "cameraLookahead",
  ] as const)
    if (typeof raw[key] === "boolean") current[key] = raw[key];
  if (["2d", "3d"].includes(raw.renderMode))
    current.renderMode = raw.renderMode;
  if (typeof raw.shadows3d === "boolean") current.shadows3d = raw.shadows3d;
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
