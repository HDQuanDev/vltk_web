import { Plus, Check } from "lucide-react";
import { getSect, getClassSkills } from "@kiem-hiep/game-content";
import { characterBonuses } from "@kiem-hiep/game-core";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";
import { ArtIcon } from "./ArtIcon";
export function SectSkillsPanel({
  snapshot: s,
  send,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
}) {
  const sect = getSect(s.classId),
    branch = sect.branches.find((b) => b.id === s.branchId)!,
    bonus = characterBonuses(s);
  return (
    <>
      <div className="school-banner">
        <span>☯</span>
        <div>
          <h3>
            {sect.name} · {branch.name}
          </h3>
          <p>{sect.identity}</p>
        </div>
        <b>{s.skillPoints} điểm</b>
      </div>
      <div className="panel-tabs">
        {sect.branches.map((b) => (
          <button
            key={b.id}
            className={b.id === s.branchId ? "active" : ""}
            onClick={() => send({ type: "branch", branchId: b.id })}
          >
            {b.name}
          </button>
        ))}
      </div>
      <p className="hint">
        {branch.description} Nội công chỉ cộng chỉ số trong nhánh đang chọn. Các
        chiêu đã học được giữ khi đổi nhánh.
      </p>
      <div className="skill-list">
        {getClassSkills(s.classId, s.branchId).map((d) => {
          const level = s.skillLevels[d.id] ?? 0,
            slot = s.hotbar.indexOf(d.id);
          return (
            <article className="skill-detail-row" key={d.id}>
              <div className="skill-art">
                <ArtIcon name={d.icon} />
                <kbd>
                  {d.kind === "passive"
                    ? "Nội công"
                    : slot >= 0
                      ? slot + 2
                      : "—"}
                </kbd>
              </div>
              <div className="skill-copy">
                <h3>
                  {d.name}
                  <em>
                    Cấp {level}/{d.maxLevel}
                  </em>
                </h3>
                <p>{d.description}</p>
                <small>
                  {d.kind === "passive"
                    ? Object.entries(d.passive ?? {})
                        .filter(([, v]) => v !== 0)
                        .map(
                          ([key, value]) =>
                            `${({ attack: "Công", defense: "Thủ", maxHp: "HP", maxMp: "MP", critChance: "Bạo kích", evasion: "Né", accuracy: "Chính xác", resistance: "Kháng hệ", lifeSteal: "Hút máu" } as Record<string, string>)[key]} +${value < 1 ? `${Math.round(value * 100)}%` : value}/cấp`,
                        )
                        .join(" · ")
                    : `${d.manaCost} MP · ${d.cooldownTicks / 20}s · Vận công ${d.castTicks / 20}s`}{" "}
                  · Yêu cầu cấp {d.requiredLevel}
                </small>
                {d.kind !== "passive" && d.id !== "slash" && level > 0 && (
                  <div className="skill-bindings">
                    <span>Gán ô:</span>
                    {[0, 1, 2, 3].map((index) => (
                      <button
                        key={index}
                        className={slot === index ? "active" : ""}
                        aria-label={`Gán ${d.name} vào ô ${index + 2}`}
                        onClick={() =>
                          send({
                            type: "bindSkill",
                            slot: index,
                            skillId: d.id,
                          })
                        }
                      >
                        {slot === index ? <Check size={11} /> : index + 2}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="plus-button"
                aria-label={`Nâng ${d.name}`}
                disabled={
                  s.skillPoints <= 0 ||
                  s.level < d.requiredLevel ||
                  level >= d.maxLevel
                }
                onClick={() => send({ type: "learn", skillId: d.id })}
              >
                <Plus size={16} />
              </button>
            </article>
          );
        })}
      </div>
      <p className="hint">
        Nội công hiện có: +{bonus.attack} công, +{bonus.defense} thủ, +
        {Math.round(bonus.resistance * 100)}% kháng hệ (gồm trang bị). Cấp nhân
        vật tối đa: 100.
      </p>
    </>
  );
}
