import { achievements } from "@kiem-hiep/game-content";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";

/**
 * Panel Thành tựu (B3.3).
 *
 * Tiến độ đọc từ chính snapshot: thành tựu dạng `counter` lấy từ bộ đếm lưu
 * theo nhân vật, dạng `state` suy ra từ cấp/bạc/khu vực/nhiệm vụ. Nút nhận
 * thưởng chỉ bấm được khi đã đạt và chỉ nhận 1 lần (authority kiểm tra).
 */
export function AchievementPanel({
  snapshot: s,
  send,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
}) {
  const counters = s.achievements?.counters,
    claimed = new Set(s.achievements?.claimed ?? []);
  const value = (source: (typeof achievements)[number]["source"]) => {
    switch (source) {
      case "kills":
        return counters?.kills ?? 0;
      case "wolfKills":
        return counters?.wolfKills ?? 0;
      case "peakGold":
        return counters?.peakGold ?? 0;
      case "enhancementSuccess":
        return counters?.enhancementSuccess ?? 0;
      case "level":
        return s.level;
      case "gold":
        return s.gold;
      case "maps":
        return s.visitedMaps.length;
      case "quests":
        return s.quests.filter((q) => q.status === "claimed").length;
    }
  };
  return (
    <div className="quest-list">
      {achievements.map((a) => {
        const current = Math.min(value(a.source), a.threshold),
          done = value(a.source) >= a.threshold,
          got = claimed.has(a.id);
        return (
          <article
            className={`quest-detail ${got ? "completed" : ""}`}
            key={a.id}
            data-achievement-id={a.id}
            data-achievement-done={done ? "true" : "false"}
            data-achievement-claimed={got ? "true" : "false"}
          >
            <small>
              {a.kind === "counter" ? "Bộ đếm hành trình" : "Cột mốc"} ·{" "}
              {a.reward} bạc
            </small>
            <h3>
              {a.name}
              {got && <span className="positive"> · Đã nhận</span>}
            </h3>
            <p>{a.description}</p>
            <div className="objective">
              <span>{done ? "Đã đạt" : "Chưa đạt"}</span>
              <b>
                {current}/{a.threshold}
              </b>
            </div>
            {got ? (
              <small className="positive">Đã nhận phần thưởng</small>
            ) : done ? (
              <button
                className="gold-button"
                onClick={() =>
                  send({ type: "claimAchievement", achievementId: a.id })
                }
              >
                Nhận thưởng
              </button>
            ) : (
              <small className="muted">Chưa đạt</small>
            )}
          </article>
        );
      })}
    </div>
  );
}
