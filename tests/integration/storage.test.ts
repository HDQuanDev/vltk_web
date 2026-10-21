import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  SaveRepository,
  validateSave,
} from "../../packages/game-storage/src/index";
import { createGame } from "../../packages/game-core/src/index";
describe("IndexedDB thực hiện giao dịch nguyên tử", () => {
  it("lưu/load nhiều nhân vật, không trộn inventory", async () => {
    const repo = new SaveRepository(),
      a = createGame("Nhân Vật A", "wudang", "storage-a"),
      b = createGame("Nhân Vật B", "emei", "storage-b");
    a.gold = 321;
    await repo.save(a);
    await repo.save(b);
    expect((await repo.load("storage-a"))!.gold).toBe(321);
    expect((await repo.load("storage-b"))!.name).toBe("Nhân Vật B");
  });
  it("bản trước được backup và save hỏng không ghi đè", async () => {
    const repo = new SaveRepository(),
      s = createGame("Lưu Dự Phòng", "wudang", "storage-backup");
    await repo.save(s);
    s.gold = 890;
    await repo.save(s);
    expect((await repo.recover(s.characterId))!.gold).toBe(180);
    const bad = { ...s, gold: -1 };
    await expect(repo.save(bad)).rejects.toThrow();
    expect((await repo.load(s.characterId))!.gold).toBe(890);
  });
  it("export/import khứ hồi, phân biệt saveId và characterId", async () => {
    const repo = new SaveRepository(),
      s = createGame("Xuất Nhập", "shaolin", "storage-export");
    const file = repo.export(s),
      imported = await repo.import(JSON.parse(file));
    expect(imported).toEqual(s);
    const records = await repo.list(),
      record = records.find((r) => r.characterId === s.characterId)!;
    expect(record.saveId).not.toBe(record.characterId);
    expect(record.snapshot).toEqual(s);
    await repo.delete(s.characterId);
    expect(await repo.load(s.characterId)).toBeNull();
    expect(await repo.recover(s.characterId)).toBeNull();
  });
  it("từ chối stack quá giới hạn, item ID trùng, quest reference sai", () => {
    const s = createGame("Kiểm Định");
    s.inventory[0].quantity = 100;
    expect(() => validateSave(s)).toThrow();
    s.inventory[0].quantity = 1;
    s.inventory.push({ ...s.inventory[0] });
    expect(() => validateSave(s)).toThrow();
    s.inventory.pop();
    s.quests.push({ id: "missing", status: "ready", progress: 0 });
    expect(() => validateSave(s)).toThrow();
    s.quests.pop();
    expect(() => validateSave(s)).not.toThrow();
  });
  it("bản lưu cũ thiếu questTalks vẫn nạp được, không xóa nhân vật", () => {
    const s = createGame("KiemKhach01", "wudang", "KiemKhach01");
    s.quests.push({ id: "bandits", status: "active", progress: 2, completions: 0 });
    // Bản lưu cũ (trước khi thêm trường questTalks) không có trường này.
    delete (s as { questTalks?: unknown }).questTalks;
    const valid = validateSave(s);
    expect(valid.quests[0].progress).toBe(2);
    expect(valid.questTalks).toBeUndefined();
  });
  it("lưu/load giữ nguyên tiến độ nhiệm vụ và questTalks", async () => {
    const repo = new SaveRepository(),
      s = createGame("QATest123", "wudang", "QATest123");
    s.quests.push({ id: "bandits", status: "active", progress: 3, completions: 0 });
    s.questTalks = { elder: 12 };
    await repo.save(s);
    const loaded = (await repo.load("QATest123"))!;
    expect(loaded.quests[0].progress).toBe(3);
    expect(loaded.questTalks?.elder).toBe(12);
  });
});
