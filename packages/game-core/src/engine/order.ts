// Không dùng locale của máy chạy làm tie-break trong simulation/replay.
export const compareStableText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;
