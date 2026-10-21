import {
  quests,
  npcs,
  maps,
  questObjectiveLabel,
} from "@kiem-hiep/game-content";
import type { GameSnapshot, QuestProgress } from "@kiem-hiep/game-protocol";

/**
 * Nguồn tiến độ nhiệm vụ DUY NHẤT cho toàn bộ UI.
 *
 * Panel Nhiệm vụ và khung theo dõi bên trái phải đọc từ cùng hàm này và
 * cùng cập nhật trong cùng một thời điểm (mỗi lần `snapshot` đổi), nếu
 * không hai nơi sẽ lệch nhau. Không đọc `s.quests` rải rác ở từng chỗ.
 */

export interface QuestDisplay {
  /** Định nghĩa nhiệm vụ trong catalog (28 nhiệm vụ, thứ tự cố định). */
  definition: (typeof quests)[number];
  /** Tiến độ hiện tại của nhân vật, hoặc null nếu chưa nhận nhiệm vụ. */
  progress: QuestProgress | null;
  /** Số thứ tự hiển thị, luôn 2 chữ số: 01, 02, ... 28. */
  order: string;
  /** Nhãn mục tiêu đã dịch sang tiếng Việt (không dùng tên quái thô). */
  objective: string;
  /** Tiến độ hiện tại / cần đạt. */
  current: number;
  /** Số lượng cần đạt. */
  count: number;
  /** Đã đủ điều kiện nhận thưởng (active → ready). */
  ready: boolean;
  /** Đã nhận thưởng. */
  claimed: boolean;
  /** Đang thực hiện (đã nhận, chưa xong). */
  active: boolean;
  /** Nhiệm vụ mở khóa (đã claim nhiệm vụ tiền điều kiện). */
  unlocked: boolean;
  /**
   * Đã nói chuyện với NPC làm nhiệm vụ hay chưa (bước hội thoại trước khi
   * nhận nhiệm vụ). Đọc từ `questTalks` nên giữ được sau khi tải lại trang.
   */
  talkedNpc: boolean;
  /** Bước hội thoại của chính mục tiêu nhiệm vụ đã hoàn thành hay chưa. */
  talked: boolean;
}

/** Số thứ tự nhiệm vụ dạng 2 chữ số: 01, 02, ... 09, 10, ... 28. */
export const questOrder = (index: number) => String(index + 1).padStart(2, "0");

/**
 * Tên khu vực (map/area) của một mục tiêu khám phá, để thông báo tiến độ
 * đọc được bằng tiếng Việt thay vì id kỹ thuật.
 */
export function exploreLabel(target: string): string {
  const map = maps.find(
    (m) => m.id === target || m.areas?.some((a) => a.id === target),
  );
  if (!map) return "Khám phá khu vực yêu cầu";
  const area = map.areas?.find((a) => a.id === target);
  return area ? `Khám phá ${area.name}` : `Đến ${map.name}`;
}

/**
 * Nhãn bước hiện tại của nhiệm vụ.
 *
 * - Quest chưa nhận: bước đầu là "Gặp <NPC> để nhận nhiệm vụ"; sau khi đã nói
   chuyện với NPC giao nhiệm vụ thì bước hội thoại hoàn tất và chuyển sang
   "Nhận nhiệm vụ: <tên>".
 * - Quest loại `talk`: sau khi nói chuyện với NPC mục tiêu thì chuyển sang
   bước kế tiếp.
 */
export function questStepLabel(
  display: Pick<QuestDisplay, "definition" | "talked" | "talkedNpc" | "progress">,
): string {
  const q = display.definition;
  if (q.objectiveKind === "talk") {
    const npcName = npcs.find((n) => n.id === q.target)?.name ?? q.target;
    return display.talked
      ? `Nhận nhiệm vụ: ${q.name}`
      : `Nói chuyện với ${npcName}`;
  }
  if (!display.progress) {
    const npcName = npcs.find((n) => n.id === q.npc)?.name ?? q.npc;
    return display.talkedNpc
      ? `Nhận nhiệm vụ: ${q.name}`
      : `Gặp ${npcName} để nhận nhiệm vụ`;
  }
  if (q.objectiveKind === "explore") return exploreLabel(q.target);
  return questObjectiveLabel(q);
}

/** Tất cả 28 nhiệm vụ kèm tiến độ hiện tại, đúng thứ tự catalog. */
export function questDisplays(snapshot: GameSnapshot): QuestDisplay[] {
  return quests.map((definition, index) => {
    const progress = snapshot.quests.find((p) => p.id === definition.id) ?? null;
    return {
      definition,
      progress,
      order: questOrder(index),
      objective: questObjectiveLabel(definition),
      current: progress?.progress ?? 0,
      count: definition.count,
      ready: progress?.status === "ready",
      claimed: progress?.status === "claimed",
      active: progress?.status === "active",
      unlocked:
        !definition.requires ||
        snapshot.quests.some(
          (p) => p.id === definition.requires && p.status === "claimed",
        ),
      talkedNpc: Boolean(snapshot.questTalks?.[definition.npc]),
      talked:
        definition.objectiveKind === "talk"
          ? Boolean(snapshot.questTalks?.[definition.target])
          : false,
    };
  });
}

/**
 * Nhiệm vụ đang theo dõi: ưu tiên nhiệm vụ đã nhận và chưa xong, theo đúng
 * thứ tự catalog. Trả về `null` khi người chơi chưa nhận nhiệm vụ nào.
 */
export function trackedQuest(displays: QuestDisplay[]): QuestDisplay | null {
  return (
    displays.find((d) => d.active || d.ready) ??
    displays.find((d) => d.unlocked && !d.progress) ??
    null
  );
}
