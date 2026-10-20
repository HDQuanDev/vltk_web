import { describe, expect, it } from "vitest";
import { stat } from "node:fs/promises";
import {
  actorGender,
  actorSpriteFiles,
  actorSpriteFrame,
  actorSpriteHeight,
  actorSpriteOriginY,
  actorSpriteOwner,
  actorSpriteWarmUrls,
} from "../../apps/web/src/game/animations/actor-sprites";
import { actorSpriteManifest, classDefinitions } from "@kiem-hiep/game-content";
import type { Direction8 } from "@kiem-hiep/game-protocol";
describe("ánh xạ sprite nhân vật", () => {
  it("đăng ký đủ 10 phái × 2 giới + bộ trung lập", () => {
    for (const sect of classDefinitions)
      for (const gender of ["male", "female"] as const)
        expect(actorSpriteManifest.sets[sect.id]?.[gender], sect.id).toBe(
          `${sect.id}/${gender}`,
        );
    expect(actorSpriteManifest.sets.neutral?.male).toBe("neutral/male");
    const owners = Object.values(actorSpriteManifest.sets).flatMap((g) =>
      Object.values(g),
    );
    expect(owners).toHaveLength(21);
  });
  it("chọn bộ theo (phái, giới); thiếu thì mượn bộ trung lập, không lỗi", () => {
    expect(actorSpriteOwner("wudang", "female")).toEqual({
      owner: "wudang/female",
      exact: true,
    });
    expect(actorSpriteOwner("shaolin", "male")).toEqual({
      owner: "shaolin/male",
      exact: true,
    });
    // Giới tính lạ coi như nam, giống cách atlas cũ chọn sprite.
    expect(actorGender("female")).toBe("female");
    expect(actorGender("elder")).toBe("male");
    // Phái không có bộ (ví dụ NPC/nhân vật lạ) → bộ trung lập.
    expect(actorSpriteOwner("khong-co-phai", "male")).toEqual({
      owner: "neutral/male",
      exact: false,
    });
  });
  it("URL đúng cấu trúc thư mục, 13 state × 3 hướng", () => {
    expect(actorSpriteFrame("wudang", "female", "idle", 2, 0)).toEqual({
      url: "/assets/actors/wudang/female/sprites/down/stand.png",
      owner: "wudang/female",
      state: "stand",
      facing: "down",
      flipX: false,
      exact: true,
    });
    expect(actorSpriteFiles("kunlun/male")).toHaveLength(39);
    expect(actorSpriteFiles("kunlun/male")[0].url).toBe(
      "/assets/actors/kunlun/male/sprites/down/stand.png",
    );
  });
  it("hướng trái là ảnh phải lật ngang", () => {
    expect(actorSpriteFrame("emei", "female", "idle", 4, 0)).toMatchObject({
      url: "/assets/actors/emei/female/sprites/right/stand.png",
      flipX: true,
    });
    for (const direction of [1, 2, 3] as Direction8[])
      expect(
        actorSpriteFrame("emei", "female", "idle", direction, 0)?.facing,
      ).toBe("down");
    for (const direction of [5, 6, 7] as Direction8[])
      expect(
        actorSpriteFrame("emei", "female", "idle", direction, 0)?.facing,
      ).toBe("up");
  });
  it("ánh xạ trạng thái và nhịp walk, nhân vật không dùng run", () => {
    expect(actorSpriteFrame("wudang", "male", "walk", 0, 0)?.state).toBe(
      "walk-1",
    );
    expect(actorSpriteFrame("wudang", "male", "walk", 0, 4)?.state).toBe(
      "walk-2",
    );
    expect(actorSpriteFrame("wudang", "male", "attack", 0, 0)?.state).toBe(
      "attack",
    );
    expect(actorSpriteFrame("wudang", "male", "cast", 0, 0)?.state).toBe(
      "cast",
    );
    expect(actorSpriteFrame("wudang", "male", "dead", 0, 9)?.state).toBe("die");
    expect(actorSpriteFrame("wudang", "male", "revive", 0, 0)?.state).toBe(
      "die",
    );
    expect(actorSpriteFrame("wudang", "male", "interact", 0, 0)?.state).toBe(
      "use",
    );
    expect(
      actorSpriteFrame("wudang", "male", "hit", 0, 0, { lowHp: true })?.state,
    ).toBe("hurt");
  });
  it("kích thước hiển thị và neo chân khớp khung 256px", () => {
    expect(actorSpriteHeight).toBe(112);
    expect(actorSpriteOriginY).toBeCloseTo(246 / 256);
    expect(actorSpriteWarmUrls("wudang/male")).toHaveLength(9);
  });
});
describe("file sprite nhân vật trong public", () => {
  it("đủ 819 file cho 21 bộ, đúng đường dẫn runtime", async () => {
    for (const genders of Object.values(actorSpriteManifest.sets))
      for (const owner of Object.values(genders)) {
        const files = actorSpriteFiles(owner);
        expect(files).toHaveLength(39);
        for (const file of files) {
          const info = await stat("apps/web/public" + file.url);
          expect(info.size, file.url).toBeGreaterThan(1000);
        }
      }
  });
});
