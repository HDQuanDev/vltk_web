import { describe, expect, it } from "vitest";
import { readFile, stat } from "node:fs/promises";
import {
  hasMonsterSprites,
  isBossMonster,
  isFastMonster,
  monsterFacing,
  monsterSpriteFiles,
  monsterSpriteFrame,
  monsterSpriteHeight,
  monsterSpriteOriginY,
  monsterSpriteState,
} from "../../apps/web/src/game/animations/monster-sprites";
import { monsterSpriteManifest, monsters } from "@kiem-hiep/game-content";
import type { Direction8 } from "@kiem-hiep/game-protocol";
describe("ánh xạ sprite quái", () => {
  it("mọi bộ sprite trong manifest đều có monster def", () => {
    const known = new Set(monsters.map((m) => m.id));
    for (const id of monsterSpriteManifest.monsters)
      expect(known.has(id), id).toBe(true);
    expect(monsterSpriteManifest.monsters.length).toBe(16);
  });
  it("hướng trái là ảnh phải lật ngang, chéo gộp theo trục dọc", () => {
    expect(monsterFacing(0)).toEqual({ facing: "right", flipX: false });
    expect(monsterFacing(2)).toEqual({ facing: "down", flipX: false });
    expect(monsterFacing(6)).toEqual({ facing: "up", flipX: false });
    expect(monsterFacing(4)).toEqual({ facing: "right", flipX: true });
    for (const direction of [1, 2, 3] as Direction8[])
      expect(monsterFacing(direction).facing).toBe("down");
    for (const direction of [5, 6, 7] as Direction8[])
      expect(monsterFacing(direction).facing).toBe("up");
    // Chỉ hướng tây mới lật ngang: ba hướng vẽ sẵn không bị mirror.
    const flipped = ([0, 1, 2, 3, 4, 5, 6, 7] as Direction8[]).filter(
      (d) => monsterFacing(d).flipX,
    );
    expect(flipped).toEqual([4]);
  });
  it("ánh xạ trạng thái simulation sang tên file", () => {
    expect(monsterSpriteState("idle", 0)).toBe("stand");
    expect(monsterSpriteState("attack", 0)).toBe("attack");
    expect(monsterSpriteState("cast", 0)).toBe("cast");
    expect(monsterSpriteState("dead", 40)).toBe("die");
    expect(monsterSpriteState("revive", 0)).toBe("die");
    expect(monsterSpriteState("interact", 0)).toBe("use");
    expect(monsterSpriteState("hit", 0, { lowHp: false })).toBe("hit");
    expect(monsterSpriteState("hit", 0, { lowHp: true })).toBe("hurt");
  });
  it("walk/run lặp khung theo nhịp, run chỉ dùng cho quái nhanh", () => {
    // 20Hz, walk 6fps: đổi khung sau ~3.33 tick; run 8fps: sau 2.5 tick.
    expect(mapWalk(0)).toBe("walk-1");
    expect(mapWalk(3)).toBe("walk-1");
    expect(mapWalk(4)).toBe("walk-2");
    expect(mapWalk(7)).toBe("walk-1");
    expect(mapRun(0)).toBe("run-1");
    expect(mapRun(2)).toBe("run-1");
    expect(mapRun(3)).toBe("run-2");
    expect(isFastMonster("bandit")).toBe(false);
    expect(isFastMonster("shadow-blade")).toBe(true);
    expect(monsterSpriteState("walk", 4, { fast: true })).toBe("run-2");
  });
  it("URL ghép đúng cấu trúc thư mục, 13 state × 3 hướng", () => {
    const frame = monsterSpriteFrame("bandit", "idle", 2, 0);
    expect(frame).toEqual({
      url: "/assets/monsters/bandit/sprites/down/stand.png",
      state: "stand",
      facing: "down",
      flipX: false,
    });
    expect(monsterSpriteFiles("bandit")).toHaveLength(39);
    expect(monsterSpriteFiles("boss")[0].url).toBe(
      "/assets/monsters/boss/sprites/down/stand.png",
    );
  });
  it("quái không có bộ ảnh trả null để giữ bản vẽ thủ tục", () => {
    expect(hasMonsterSprites("bandit")).toBe(true);
    expect(hasMonsterSprites("khong-ton-tai")).toBe(false);
    expect(monsterSpriteFrame("khong-ton-tai", "idle", 0, 0)).toBeNull();
  });
  it("boss hiển thị lớn hơn quái thường, neo chân trong khung 256px", () => {
    expect(isBossMonster("boss")).toBe(true);
    expect(isBossMonster("cloud-beast")).toBe(true);
    expect(isBossMonster("bandit")).toBe(false);
    expect(monsterSpriteHeight("bandit")).toBe(112);
    expect(monsterSpriteHeight("boss")).toBe(168);
    expect(monsterSpriteOriginY).toBeCloseTo(246 / 256);
  });
});
describe("file sprite quái trong public", () => {
  it("đủ 624 PNG cho 16 bộ, đúng đường dẫn runtime", async () => {
    for (const id of monsterSpriteManifest.monsters) {
      const files = monsterSpriteFiles(id);
      expect(files).toHaveLength(39);
      for (const file of files) {
        const path = "apps/web/public" + file.url;
        const info = await stat(path);
        expect(info.size, path).toBeGreaterThan(1000);
        const header = (await readFile(path)).subarray(1, 4).toString();
        expect(header, path).toBe("PNG");
      }
    }
  });
});
function mapWalk(elapsed: number) {
  return monsterSpriteState("walk", elapsed, { fast: false });
}
function mapRun(elapsed: number) {
  return monsterSpriteState("walk", elapsed, { fast: true });
}
