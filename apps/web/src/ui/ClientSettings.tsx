import { useState } from "react";
import {
  getPreferences,
  setPreferences,
  type ClientPreferences,
} from "../game/preferences";
import { audioDiagnostics, previewAudio } from "../game/audio";
export function ClientSettings() {
  const [p, setP] = useState(getPreferences());
  const update = (next: Partial<ClientPreferences>) => {
    setPreferences(next);
    setP(getPreferences());
  };
  const audio = audioDiagnostics();
  return (
    <>
      <h3 className="section-heading">Hiển thị & điều khiển</h3>
      <div className="setting-row">
        <span>
          Chất lượng dựng hình<small>Không thay đổi simulation</small>
        </span>
        <select
          aria-label="Chất lượng dựng hình"
          value={p.quality}
          onChange={(e) =>
            update({ quality: e.target.value as ClientPreferences["quality"] })
          }
        >
          {[
            ["auto", "Tự động"],
            ["low", "Thấp"],
            ["medium", "Vừa"],
            ["high", "Cao"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={p.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
          />{" "}
          Giảm chuyển động / tắt rung camera
        </label>
      </div>
      <div className="setting-row">
        <span>Cần di chuyển</span>
        <select
          aria-label="Chế độ joystick"
          value={p.joystick}
          onChange={(e) =>
            update({
              joystick: e.target.value as ClientPreferences["joystick"],
            })
          }
        >
          <option value="fixed">Cố định</option>
          <option value="floating">Nổi tại điểm chạm</option>
        </select>
      </div>
      <h3 className="section-heading">Hiệu ứng trong game</h3>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={p.damageNumbers}
            onChange={(e) => update({ damageNumbers: e.target.checked })}
          />{" "}
          Số sát thương
        </label>
      </div>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={p.playerNightLight}
            onChange={(e) => update({ playerNightLight: e.target.checked })}
          />{" "}
          Sáng quanh nhân vật ban đêm
        </label>
      </div>
      <div className="setting-row">
        <label>
          <input
            type="checkbox"
            checked={p.showFps}
            onChange={(e) => update({ showFps: e.target.checked })}
          />{" "}
          Hiện FPS
        </label>
      </div>
      <h3 className="section-heading">Bộ trộn âm thanh</h3>
      {(
        [
          ["masterVolume", "Tổng"],
          ["musicVolume", "Nhạc"],
          ["ambientVolume", "Môi trường"],
          ["combatVolume", "Chiến đấu"],
          ["uiVolume", "Giao diện"],
        ] as const
      ).map(([key, label]) => (
        <div className="setting-row audio-slider" key={key}>
          <label htmlFor={key}>{label}</label>
          <input
            id={key}
            aria-label={`Âm lượng ${label}`}
            type="range"
            min="0"
            max="1"
            step=".05"
            value={p[key]}
            onChange={(e) => update({ [key]: Number(e.target.value) })}
          />
          <small>{Math.round(p[key] * 100)}%</small>
        </div>
      ))}
      <button className="outline-button" onClick={previewAudio}>
        Thử âm thanh
      </button>
      <p className="hint">
        Audio {audio.context} · {audio.voices}/{audio.maxVoices} voices · Nhạc:{" "}
        {audio.track || "chưa mở"}. Nhạc/SFX gốc tổng hợp; chưa phải thư viện
        nhạc cụ thu âm sản xuất.
      </p>
    </>
  );
}
