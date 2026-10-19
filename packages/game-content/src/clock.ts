export const DAY_LENGTH_TICKS = 24000;
export function worldTime(ticks: number) {
  const absoluteMinutes = 360 + Math.floor((ticks * 1440) / DAY_LENGTH_TICKS);
  const hour = Math.floor(absoluteMinutes / 60) % 24,
    minute = absoluteMinutes % 60;
  return {
    day: Math.floor(absoluteMinutes / 1440) + 1,
    hour,
    minute,
    period: [
      "Tý",
      "Sửu",
      "Dần",
      "Mão",
      "Thìn",
      "Tỵ",
      "Ngọ",
      "Mùi",
      "Thân",
      "Dậu",
      "Tuất",
      "Hợi",
    ][Math.floor(((hour + 1) % 24) / 2)],
  };
}
