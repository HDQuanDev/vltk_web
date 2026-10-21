import { ArrowRight, Check } from "lucide-react";
import { quests, getItem } from "@kiem-hiep/game-content";
import { questOrder } from "./quest-progress";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";
export function QuestOffers({
  snapshot: s,
  npcId,
  send,
}: {
  snapshot: GameSnapshot;
  npcId: string;
  send: (c: GameCommand) => void;
}) {
  const available = quests
    .filter(
      (q) =>
        q.npc === npcId &&
        (!q.requires ||
          s.quests.some((p) => p.id === q.requires && p.status === "claimed")),
    )
    .filter((q) => {
      const p = s.quests.find((p) => p.id === q.id);
      return (
        !p ||
        p.status !== "claimed" ||
        (q.repeatTicks > 0 && s.tick - (p.lastClaimTick ?? 0) >= q.repeatTicks)
      );
    });
  return (
    <div className="dialogue-options">
      {available.map((q) => {
        const progress = s.quests.find((p) => p.id === q.id),
          accept = !progress || progress.status === "claimed",
          order = questOrder(quests.findIndex((d) => d.id === q.id));
        return (
          <article className="npc-quest" key={q.id}>
            <small>
              {order} · {q.chapter}
            </small>
            <h3>{q.name}</h3>
            <p>{q.description}</p>
            <small>
              {q.exp} kinh nghiệm · {q.gold} bạc · {getItem(q.rewardItem).name}
            </small>
            {accept ? (
              <button
                className="gold-button"
                onClick={() => send({ type: "acceptQuest", questId: q.id })}
              >
                Nhận nhiệm vụ <ArrowRight size={14} />
              </button>
            ) : progress.status === "ready" ? (
              <button
                className="gold-button"
                onClick={() => send({ type: "claimQuest", questId: q.id })}
              >
                Nhận phần thưởng <Check size={14} />
              </button>
            ) : (
              <p className="positive">
                Đang thực hiện · {progress.progress} / {q.count}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
