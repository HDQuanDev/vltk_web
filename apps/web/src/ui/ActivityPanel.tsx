import {
  getMap,
  resourceNodes,
  worldTime,
  professionNames,
  professionLevel,
} from "@kiem-hiep/game-content";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";
export function ActivityPanel({
  snapshot: s,
  send,
  close,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
  close: () => void;
}) {
  const time = worldTime(s.worldClock.timeTicks);
  return (
    <>
      <div className="world-clock-card">
        <strong>
          Ngày {time.day} · {String(time.hour).padStart(2, "0")}:
          {String(time.minute).padStart(2, "0")}
        </strong>
        <span>
          {
            { clear: "Trời trong", rain: "Mưa", mist: "Sương mù" }[
              s.worldClock.weather
            ]
          }
        </span>
      </div>
      <h3 className="section-heading">Tự chiến</h3>
      <div className="auto-settings">
        <label>
          <input
            type="checkbox"
            checked={s.autoCombat.pickup}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { pickup: e.target.checked },
              })
            }
          />
          Tự nhặt đồ trong bãi farm
        </label>
        <label>
          Phẩm chất nhặt tối thiểu
          <select
            value={s.autoCombat.lootRarity}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: {
                  lootRarity: e.target
                    .value as GameSnapshot["autoCombat"]["lootRarity"],
                },
              })
            }
          >
            <option value="all">Tất cả</option>
            <option value="uncommon">Tốt</option>
            <option value="rare">Hiếm</option>
            <option value="epic">Quý</option>
            <option value="legendary">Truyền thuyết</option>
            <option value="mythic">Thần phẩm</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.autoCombat.stopWhenFull}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { stopWhenFull: e.target.checked },
              })
            }
          />
          Dừng tự chiến khi túi đầy
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.autoCombat.rotation}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { rotation: e.target.checked },
              })
            }
          />{" "}
          Dùng kỹ năng theo bộ chiêu đang gán
        </label>
        <label>
          <input
            type="checkbox"
            checked={s.autoCombat.potions}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { potions: e.target.checked },
              })
            }
          />{" "}
          Tự dùng đan dược
        </label>
        <label>
          Hồi máu khi dưới
          <select
            value={s.autoCombat.hpThreshold}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { hpThreshold: Number(e.target.value) },
              })
            }
          >
            <option value={0.25}>25%</option>
            <option value={0.35}>35%</option>
            <option value={0.5}>50%</option>
            <option value={0.7}>70%</option>
          </select>
        </label>
        <label>
          Hồi nội lực khi dưới
          <select
            value={s.autoCombat.mpThreshold}
            onChange={(e) =>
              send({
                type: "configureAuto",
                settings: { mpThreshold: Number(e.target.value) },
              })
            }
          >
            <option value={0.2}>20%</option>
            <option value={0.35}>35%</option>
            <option value={0.5}>50%</option>
          </select>
        </label>
        <button
          className="outline-button"
          onClick={() =>
            send({
              type: "autoAttack",
              enabled: !s.entities[s.playerId].autoAttack,
            })
          }
        >
          {s.entities[s.playerId].autoAttack ? "Dừng tự chiến" : "Bật tự chiến"}
        </button>
      </div>
      <h3 className="section-heading">Nghề nghiệp</h3>
      <div className="profession-grid">
        {Object.entries(professionNames).map(([id, name]) => (
          <div key={id}>
            <strong>{name}</strong>
            <span>Cấp {professionLevel(s.professionXp[id] ?? 0)}</span>
            <small>{s.professionXp[id] ?? 0} kinh nghiệm</small>
          </div>
        ))}
      </div>
      <h3 className="section-heading">
        Tài nguyên trong {getMap(s.mapId).name}
      </h3>
      {resourceNodes
        .filter((n) => n.mapId === s.mapId)
        .map((n) => {
          const remaining = Math.max(
            0,
            (s.resources[n.id]?.availableAt ?? 0) - s.tick,
          );
          return (
            <div className="destination-row" key={n.id}>
              <div>
                <strong>{n.name}</strong>
                <small>
                  {n.x}, {n.y} ·{" "}
                  {remaining
                    ? `Tái sinh sau ${Math.ceil(remaining / 20)} giây game`
                    : `Có thể thu thập · ${professionNames[n.kind]} cấp ${n.requiredLevel}`}
                </small>
              </div>
              <button
                className="outline-button"
                disabled={remaining > 0}
                onClick={() => {
                  send({ type: "gather", nodeId: n.id });
                  close();
                }}
              >
                Tìm đường
              </button>
            </div>
          );
        })}
      <p className="hint">
        Chu kỳ ngày/đêm dài 20 phút game. Thời tiết thay đổi theo seeded RNG mỗi
        2 phút game. Tạm dừng sẽ dừng cả hồi tài nguyên và nhiệm vụ tuần hoàn.
      </p>
    </>
  );
}
