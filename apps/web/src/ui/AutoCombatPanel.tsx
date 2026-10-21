import { useState } from "react";
import {
  AUTO_COMBAT_TICK_MS,
  AUTO_COMBAT_RANGE,
} from "@kiem-hiep/game-core";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";
import {
  getPreferences,
  setPreferences,
  type ClientPreferences,
} from "../game/preferences";

/**
 * Bảng cấu hình tự chiến (A1.7).
 *
 * Cấu hình lưu ở cài đặt chung của client (không theo nhân vật) và được đẩy
 * xuống simulation qua đúng lệnh `configureAuto` sẵn có.
 */
export function AutoCombatPanel({
  snapshot: s,
  send,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
}) {
  const [prefs, setPrefs] = useState(getPreferences());
  const player = s.entities[s.playerId];
  const updateAuto = (next: Partial<ClientPreferences["autoCombat"]>) => {
    const merged = { ...prefs.autoCombat, ...next };
    setPreferences({ autoCombat: merged });
    setPrefs(getPreferences());
    send({
      type: "configureAuto",
      settings: {
        hpThreshold: merged.hpThreshold,
        mpThreshold: merged.mpThreshold,
        // Ngưỡng 0 = tắt uống thuốc: tắt luôn cờ `potions` của simulation.
        potions: merged.hpThreshold > 0 || merged.mpThreshold > 0,
        skills: merged.useSkills,
        autoPickup: merged.autoPickup,
        pickup: merged.autoPickup,
      },
    });
  };
  return (
    <>
      <div className="setting-row">
        <span>
          Tự chiến<small>Bấm icon khiên hoặc phím F để bật/tắt</small>
        </span>
        <button
          className="outline-button"
          onClick={() =>
            send({ type: "autoAttack", enabled: !player.autoAttack })
          }
        >
          {player.autoAttack ? "Đang bật" : "Đang tắt"}
        </button>
      </div>
      <div className="setting-row">
        <span>
          Uống đan hồi sinh lực khi dưới
          <small>Chọn "Tắt" để không tự uống</small>
        </span>
        <select
          aria-label="Ngưỡng sinh lực uống thuốc"
          value={prefs.autoCombat.hpThreshold}
          onChange={(e) => updateAuto({ hpThreshold: Number(e.target.value) })}
        >
          <option value={0}>Tắt</option>
          <option value={0.2}>20%</option>
          <option value={0.3}>30%</option>
          <option value={0.4}>40%</option>
          <option value={0.5}>50%</option>
        </select>
      </div>
      <div className="setting-row">
        <span>
          Uống đan hồi nội lực khi dưới
          <small>Chọn "Tắt" để không tự uống</small>
        </span>
        <select
          aria-label="Ngưỡng nội lực uống thuốc"
          value={prefs.autoCombat.mpThreshold}
          onChange={(e) => updateAuto({ mpThreshold: Number(e.target.value) })}
        >
          <option value={0}>Tắt</option>
          <option value={0.15}>15%</option>
          <option value={0.25}>25%</option>
          <option value={0.35}>35%</option>
        </select>
      </div>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={prefs.autoCombat.useSkills}
            onChange={(e) => updateAuto({ useSkills: e.target.checked })}
          />{" "}
          Dùng kỹ năng
        </label>
      </div>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={prefs.autoCombat.autoPickup}
            onChange={(e) => updateAuto({ autoPickup: e.target.checked })}
          />{" "}
          Tự nhặt đồ
        </label>
      </div>
      <p className="hint">
        Tự chiến ra quyết định mỗi {AUTO_COMBAT_TICK_MS}ms, quét quái trong{" "}
        {AUTO_COMBAT_RANGE} ô. Bấm phím di chuyển hoặc click xuống đất sẽ tắt
        ngay. Mở hội thoại/shop thì tự chiến tạm dừng.
      </p>
    </>
  );
}
