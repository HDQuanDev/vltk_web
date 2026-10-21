import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getItem } from "@kiem-hiep/game-content";
import { itemBonuses } from "@kiem-hiep/game-core";
import type { ItemInstance, StatusEffect } from "@kiem-hiep/game-protocol";
import { ArtIcon } from "./ArtIcon";

export const rarityNames: Record<string, string> = {
  common: "Phổ thông",
  uncommon: "Tinh xảo",
  rare: "Hiếm",
  epic: "Sử thi",
  legendary: "Truyền thuyết",
  mythic: "Thần phẩm",
};
export const slotNames: Record<string, string> = {
  weapon: "Vũ khí",
  armor: "Áo giáp",
  helmet: "Mũ",
  boots: "Giày",
  accessory: "Trang sức",
};
/**
 * Bậc phát sáng theo cấp cường hóa (A4). Chỉ đọc cấp đã có trong dữ liệu
 * trang bị, không sửa logic cường hóa và không đổi chỉ số.
 * +0..+4 không sáng; +5/+6 trắng-xanh; +7/+8 xanh dương; +9/+10 tím;
 * +11 trở lên vàng kim có nhịp.
 */
export function enhancementGlowClass(level = 0) {
  if (level >= 11) return "glow-gold pulse";
  if (level >= 9) return "glow-violet";
  if (level >= 7) return "glow-azure";
  if (level >= 5) return "glow-jade";
  return "";
}

/** Shared focus ownership for gameplay windows, independent of simulation. */
export function GamePanel({
  children,
  label,
  className = "",
  close,
}: {
  children: ReactNode;
  label: string;
  className?: string;
  close: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = root.current!;
    const focusable = () =>
      [
        ...element.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ].filter((e) => e.getClientRects().length > 0);
    (focusable()[0] ?? element).focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const list = focusable(),
        first = list[0],
        last = list.at(-1);
      if (!first) {
        event.preventDefault();
        element.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === element)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    element.addEventListener("keydown", key);
    return () => {
      element.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <section
      ref={root}
      tabIndex={-1}
      className={`game-panel ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {children}
    </section>
  );
}

export function StatComparison({
  item,
  equipped,
}: {
  item: ItemInstance;
  equipped?: ItemInstance;
}) {
  const next = itemBonuses(item),
    current = equipped ? itemBonuses(equipped) : null;
  return (
    <dl className="item-comparison" aria-label="So sánh trang bị">
      {(
        [
          ["attack", "Công kích"],
          ["defense", "Phòng ngự"],
          ["maxHp", "Sinh lực"],
          ["maxMp", "Nội lực"],
        ] as const
      ).map(([key, label]) => {
        const delta = next[key] - (current?.[key] ?? 0);
        if (!next[key] && !current?.[key]) return null;
        return (
          <div key={key}>
            <dt>{label}</dt>
            <dd>
              +{next[key]}{" "}
              {current && (
                <em className={delta >= 0 ? "positive" : "negative"}>
                  {delta >= 0 ? "▲ +" : "▼ "}
                  {delta}
                </em>
              )}
            </dd>
          </div>
        );
      })}
      {equipped && (
        <small>
          So với {getItem(equipped.definitionId).name} +
          {equipped.enhancement ?? 0}
        </small>
      )}
    </dl>
  );
}

export function ItemSlot({
  item,
  label,
  selected = false,
  equipped = false,
  comparison,
  onClick,
  disabled = false,
}: {
  item?: ItemInstance;
  label?: string;
  selected?: boolean;
  equipped?: boolean;
  comparison?: ItemInstance;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const definition = item ? getItem(item.definitionId) : null;
  function show() {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect || !definition || !matchMedia("(hover: hover)").matches) return;
    setTip({
      left: Math.max(8, Math.min(rect.right + 12, innerWidth - 280)),
      top: Math.max(8, Math.min(rect.top, innerHeight - 310)),
    });
  }
  useEffect(() => {
    if (!tip) return;
    const hide = () => setTip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [tip]);
  return (
    <>
      <button
        ref={anchor}
        className={`item-slot ${definition?.rarity ?? "empty-slot"} ${selected ? "selected" : ""} ${enhancementGlowClass(item?.enhancement)}`}
        aria-label={label ?? definition?.name ?? "Ô trống"}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => {
          setTip(null);
          onClick?.();
        }}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") show();
        }}
        onPointerLeave={() => setTip(null)}
        onFocus={show}
        onBlur={() => setTip(null)}
      >
        {definition && item ? (
          <>
            <ArtIcon name={definition.icon} itemId={definition.id} />
            {!!item.enhancement && (
              <span className="slot-enhancement">+{item.enhancement}</span>
            )}
            {item.quantity > 1 && <b>{item.quantity}</b>}
            {item.locked && (
              <span className="slot-lock" aria-label="Đã khóa">
                ◆
              </span>
            )}
            {!!item.gems?.length && (
              <span
                className="slot-gems"
                aria-label={`${item.gems.length} ngọc`}
              >
                {item.gems.map((_, n) => (
                  <i key={n} />
                ))}
              </span>
            )}
            {equipped && <span className="slot-equipped">Đang mặc</span>}
          </>
        ) : (
          <span className="slot-empty-mark" aria-hidden="true">
            ◇
          </span>
        )}
      </button>
      {tip &&
        definition &&
        item &&
        createPortal(
          <aside
            className={`game-tooltip ${definition.rarity}`}
            role="tooltip"
            style={{
              left: tip.left,
              top: tip.top,
              maxHeight: `calc(100dvh - ${tip.top + 8}px)`,
            }}
          >
            <strong>
              {definition.name} {item.enhancement ? `+${item.enhancement}` : ""}
            </strong>
            <small>
              {rarityNames[definition.rarity]} · Cấp{" "}
              {definition.requiredLevel ?? definition.level}
            </small>
            <p>{definition.description}</p>
            <StatComparison item={item} equipped={comparison} />
            {item.locked && <small>Đã khóa bảo vệ</small>}
          </aside>,
          document.body,
        )}
    </>
  );
}

export function ResourceBar({
  value,
  max,
  label,
  kind,
}: {
  value: number;
  max: number;
  label: string;
  kind: "health" | "mana";
}) {
  return (
    <div
      className={`vital-bar ${kind}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.ceil(value)}
    >
      <i
        style={{
          width: `${Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))}%`,
        }}
      />
      <span>{label}</span>
      <b>
        {Math.ceil(value)} / {max}
      </b>
    </div>
  );
}

export function CharacterPortrait({
  appearance = "male",
  name = "",
  className = "",
}: {
  appearance?: "male" | "female";
  name?: string;
  className?: string;
}) {
  return (
    <img
      className={`character-portrait ${className}`}
      src={`/assets/interface/portrait-${appearance}-v1.png`}
      alt={name}
      draggable={false}
    />
  );
}

export function StatusStrip({
  statuses,
  tick,
}: {
  statuses: StatusEffect[];
  tick: number;
}) {
  const names: Record<string, [string, string]> = {
    poison: ["Trúng độc", "herb"],
    burn: ["Thiêu đốt", "slash"],
    regen: ["Hồi phục", "lotus"],
    slow: ["Làm chậm", "wind"],
    stun: ["Choáng", "lightning"],
    freeze: ["Đóng băng", "wind"],
    silence: ["Cấm chiêu", "manual"],
    shield: ["Hộ thuẫn", "shield"],
    armorBreak: ["Phá giáp", "slash"],
    haste: ["Tăng tốc", "wind"],
    attackBuff: ["Tăng công", "slash"],
    defenseBuff: ["Tăng thủ", "shield"],
    vampirism: ["Hút sinh lực", "potion-red"],
    invulnerable: ["Vô địch", "shield"],
  };
  if (!statuses.length) return null;
  return (
    <div className="status-effects" aria-label="Hiệu ứng nhân vật">
      {statuses.map((status) => {
        const [label, icon] = names[status.kind],
          seconds = Math.max(0, Math.ceil((status.expiresAt - tick) / 20));
        return (
          <span
            key={status.id}
            role="img"
            aria-label={`${label} · ${seconds} giây`}
            title={`${label} · ${seconds} giây`}
          >
            <ArtIcon name={icon} />
            <small>{seconds}</small>
            {status.stacks > 1 && <b>{status.stacks}</b>}
          </span>
        );
      })}
    </div>
  );
}
