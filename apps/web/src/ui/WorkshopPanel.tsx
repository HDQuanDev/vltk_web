import { useEffect, useRef, useState } from "react";
import {
  Hammer,
  Coins,
  ArrowRight,
  LockKeyhole,
  UnlockKeyhole,
} from "lucide-react";
import {
  recipes,
  getItem,
  professionNames,
  professionLevel,
  enhancementRules,
  isEquipment,
} from "@kiem-hiep/game-content";
import { enhancementPreview, itemBonuses } from "@kiem-hiep/game-core";
import type { GameSnapshot, GameCommand } from "@kiem-hiep/game-protocol";
import { ArtIcon } from "./ArtIcon";
export function WorkshopPanel({
  snapshot: s,
  send,
  close,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
  close: () => void;
}) {
  const [tab, setTab] = useState("craft"),
    [selected, setSelected] = useState(""),
    [gemId, setGemId] = useState(""),
    [protect, setProtect] = useState(false),
    [forge, setForge] = useState<"idle" | "charging" | "success" | "failure">(
      "idle",
    );
  const pending = useRef<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReceipt = s.enhanceLog?.at(-1);
  const receiptKey = lastReceipt
    ? `${lastReceipt.tick}:${lastReceipt.from}:${lastReceipt.to}`
    : "none";
  useEffect(() => {
    if (
      pending.current === null ||
      pending.current === receiptKey ||
      !lastReceipt
    )
      return;
    pending.current = null;
    revealTimer.current = setTimeout(
      () => setForge(lastReceipt.success ? "success" : "failure"),
      480,
    );
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current);
    };
  }, [receiptKey, lastReceipt?.success]);
  useEffect(() => {
    if (forge !== "charging") return;
    const timer = setTimeout(() => {
      pending.current = null;
      setForge("idle");
    }, 4000);
    return () => clearTimeout(timer);
  }, [forge]);
  const equipment = [
      ...Object.values(s.equipment),
      ...s.inventory.filter((i) => isEquipment(getItem(i.definitionId).kind)),
    ],
    target = equipment.find((i) => i.id === selected) ?? equipment[0],
    gem =
      s.inventory.find(
        (i) => i.id === gemId && getItem(i.definitionId).kind === "gem",
      ) ?? s.inventory.find((i) => getItem(i.definitionId).kind === "gem");
  const preview = target ? enhancementPreview(target) : null,
    bonuses = target ? itemBonuses(target) : null,
    next = target
      ? itemBonuses({ ...target, enhancement: (target.enhancement ?? 0) + 1 })
      : null;
  const ward = s.inventory.find(
      (i) => i.definitionId === enhancementRules.protectionItemId && !i.locked,
    ),
    history = (s.enhanceLog ?? []).slice(-5).reverse();
  return (
    <div className={`workshop-content workshop-${tab}`}>
      <div className="panel-tabs">
        {[
          ["craft", "Chế tạo"],
          ["enhance", "Cường hóa"],
          ["socket", "Khảm ngọc"],
        ].map(([id, name]) => (
          <button
            key={id}
            className={id === tab ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="workshop-navigation">
        <button
          className="outline-button"
          onClick={() => {
            close();
            send({ type: "interact", targetId: "smith" });
          }}
        >
          Đến thợ rèn <ArrowRight size={13} />
        </button>
        <button
          className="outline-button"
          onClick={() => {
            close();
            send({ type: "interact", targetId: "merchant" });
          }}
        >
          Đến dược sư <ArrowRight size={13} />
        </button>
        <span>
          <Coins size={13} /> {s.gold} bạc
        </span>
      </div>
      {tab === "craft" ? (
        <div className="recipe-list">
          {recipes.map((r) => {
            const unlocked =
              professionLevel(s.professionXp[r.profession] ?? 0) >=
              r.requiredLevel;
            return (
              <article className="recipe-row" key={r.id}>
                <div className={`item-slot ${getItem(r.output.itemId).rarity}`}>
                  <ArtIcon
                    name={getItem(r.output.itemId).icon}
                    itemId={r.output.itemId}
                  />
                </div>
                <div>
                  <h3>
                    {r.name} <small>×{r.output.quantity}</small>
                  </h3>
                  <div className="ingredient-list">
                    {r.materials.map((m) => {
                      const owned = s.inventory
                        .filter((i) => i.definitionId === m.itemId && !i.locked)
                        .reduce((n, i) => n + i.quantity, 0);
                      return (
                        <span
                          key={m.itemId}
                          className={
                            owned >= m.quantity ? "available" : "missing"
                          }
                        >
                          <ArtIcon
                            name={getItem(m.itemId).icon}
                            itemId={m.itemId}
                          />
                          {getItem(m.itemId).name}{" "}
                          <b>
                            {owned}/{m.quantity}
                          </b>
                        </span>
                      );
                    })}
                  </div>
                  <small>
                    {professionNames[r.profession]} cấp {r.requiredLevel} ·{" "}
                    {r.station === "smith" ? "Thợ rèn" : "Dược sư"} · {r.gold}{" "}
                    bạc
                  </small>
                </div>
                <button
                  className="outline-button"
                  disabled={
                    !unlocked ||
                    s.gold < r.gold ||
                    r.materials.some(
                      (m) =>
                        s.inventory
                          .filter(
                            (i) => i.definitionId === m.itemId && !i.locked,
                          )
                          .reduce((n, i) => n + i.quantity, 0) < m.quantity,
                    )
                  }
                  onClick={() => send({ type: "craft", recipeId: r.id })}
                >
                  Chế tạo
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <>
          <label className="workshop-select">
            Trang bị
            <select
              disabled={forge === "charging"}
              value={target?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {equipment.map((i) => (
                <option key={i.id} value={i.id}>
                  {getItem(i.definitionId).name} +{i.enhancement ?? 0}
                  {s.inventory.some((n) => n.id === i.id)
                    ? " (trong túi)"
                    : " (đang mặc)"}
                </option>
              ))}
            </select>
          </label>
          {target && preview && bonuses && next && (
            <div className="upgrade-card">
              <div
                className={`item-slot large ${getItem(target.definitionId).rarity}`}
              >
                <ArtIcon
                  name={getItem(target.definitionId).icon}
                  itemId={target.definitionId}
                />
              </div>
              <div>
                <h3>
                  {getItem(target.definitionId).name} +{preview.level}
                </h3>
                <p>
                  Công kích {bonuses.attack}
                  {tab === "enhance" ? ` → ${next.attack}` : ""} · Phòng ngự{" "}
                  {bonuses.defense}
                  {tab === "enhance" ? ` → ${next.defense}` : ""}
                </p>
                <p className="hint">
                  {target.locked
                    ? "Đang khóa bảo vệ khỏi bán/tiêu hao."
                    : "Có thể khóa bảo vệ trang bị."}
                </p>
                <button
                  className="text-button"
                  onClick={() =>
                    send({
                      type: "lockItem",
                      instanceId: target.id,
                      locked: !target.locked,
                    })
                  }
                >
                  {target.locked ? (
                    <LockKeyhole size={13} />
                  ) : (
                    <UnlockKeyhole size={13} />
                  )}{" "}
                  {target.locked ? "Mở khóa" : "Khóa bảo vệ"}
                </button>
              </div>
            </div>
          )}
          {target &&
            preview &&
            (tab === "enhance" ? (
              <>
                <div
                  className={`forge-scene forge-${forge}`}
                  aria-label="Lò rèn trang bị"
                >
                  <div className="forge-runes" aria-hidden="true">
                    金 · 木 · 水 · 火 · 土
                  </div>
                  <div className="forge-orbit" aria-hidden="true" />
                  <div
                    className={`forge-offering item-slot ${getItem(target.definitionId).rarity}`}
                  >
                    <ArtIcon
                      name={getItem(target.definitionId).icon}
                      itemId={target.definitionId}
                    />
                    <b>+{preview.level}</b>
                  </div>
                  <div className="forge-coals" aria-hidden="true" />
                  <div className="forge-sparks" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, n) => (
                      <i
                        key={n}
                        style={{ "--spark": n } as React.CSSProperties}
                      />
                    ))}
                  </div>
                  <div className="forge-materials">
                    <span>
                      <ArtIcon name="ore" />
                      {preview.ore} Huyền Thiết
                    </span>
                    <strong>
                      {Math.round(preview.successRate * 100)}%
                      <small>Thành công</small>
                    </strong>
                    <span>
                      <ArtIcon name="ward" />
                      {protect && ward ? "Đang bảo hộ" : "Chưa bảo hộ"}
                    </span>
                  </div>
                  <p className="forge-result" role="status">
                    {forge === "charging"
                      ? "Đang tụ linh khí…"
                      : forge === "success"
                        ? `Cường hóa thành công · +${lastReceipt?.to}`
                        : forge === "failure"
                          ? `Cường hóa thất bại · +${lastReceipt?.to}`
                          : "Đưa binh khí vào lò · Rèn luyện tâm pháp"}
                  </p>
                  {forge === "charging" && (
                    <button
                      className="text-button forge-skip"
                      onClick={() => {
                        pending.current = null;
                        if (revealTimer.current)
                          clearTimeout(revealTimer.current);
                        setForge("idle");
                      }}
                    >
                      Bỏ qua diễn hoạt
                    </button>
                  )}
                </div>
                <p className="hint">
                  Chi phí +{preview.nextLevel}: {preview.gold} bạc +{" "}
                  {preview.ore} Huyền Thiết.{" "}
                  {preview.successRate >= 1
                    ? `Thành công 100%, không mất cấp (an toàn tới +${preview.safeLevel}).`
                    : `Thành công ${Math.round(preview.successRate * 100)}%; thất bại ${
                        preview.failureLoss === 0
                          ? "giữ nguyên cấp"
                          : `mất ${preview.failureLoss} cấp`
                      }.`}{" "}
                  Cấp +3 mở ô ngọc thứ hai.
                </p>
                <p className="hint enhance-glow-note">
                  Từ +5 trang bị bắt đầu phát sáng: trắng-xanh (+5), xanh dương
                  (+7), tím (+9), vàng kim (+11).
                </p>
                <label className="enhance-protect">
                  <input
                    type="checkbox"
                    checked={protect && !!ward}
                    disabled={!ward}
                    onChange={(e) => setProtect(e.target.checked)}
                  />
                  Dùng Đá Hộ Mệnh (+{preview.protection.gold} bạc
                  {ward ? `, còn ${ward.quantity}` : ", chưa có trong túi"}) —
                  không mất cấp nếu thất bại
                </label>
                <button
                  className="gold-button"
                  disabled={
                    forge === "charging" ||
                    s.gold < preview.gold ||
                    s.inventory
                      .filter((i) => i.definitionId === "ore" && !i.locked)
                      .reduce((n, i) => n + i.quantity, 0) < preview.ore ||
                    preview.level >= preview.maxLevel ||
                    (s.entities[s.playerId].cooldowns.enhance ?? 0) > s.tick
                  }
                  onClick={() => {
                    pending.current = receiptKey;
                    setForge("charging");
                    send({
                      type: "enhance",
                      instanceId: target.id,
                      protect: protect && !!ward,
                    });
                  }}
                >
                  <Hammer size={15} /> Cường hóa +{preview.nextLevel}
                </button>
                {history.length > 0 && (
                  <ul className="enhance-log">
                    {history.map((record, index) => (
                      <li
                        key={`${record.tick}:${index}`}
                        className={record.success ? "success" : "fail"}
                      >
                        {getItem(record.definitionId).name} +{record.from} → +
                        {record.to} ·{" "}
                        {record.success
                          ? "thành công"
                          : record.protected
                            ? "thất bại, giữ cấp nhờ Đá Hộ Mệnh"
                            : "thất bại"}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <label className="workshop-select">
                  Chọn ngọc
                  <select
                    value={gem?.id ?? ""}
                    onChange={(e) => setGemId(e.target.value)}
                  >
                    {s.inventory
                      .filter((i) => getItem(i.definitionId).kind === "gem")
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {getItem(i.definitionId).name} ×{i.quantity}
                        </option>
                      ))}
                    {!gem && (
                      <option value="">Chưa có ngọc, hãy chế tạo</option>
                    )}
                  </select>
                </label>
                <button
                  className="gold-button"
                  disabled={!gem}
                  onClick={() =>
                    gem &&
                    send({
                      type: "socket",
                      instanceId: target.id,
                      gemInstanceId: gem.id,
                    })
                  }
                >
                  Khảm ngọc · 40 bạc
                </button>
                <div className="gem-preview">
                  <ArtIcon
                    name={gem ? getItem(gem.definitionId).icon : "gem"}
                    itemId={gem?.definitionId}
                  />
                  <div>
                    <strong>
                      {gem
                        ? getItem(gem.definitionId).name
                        : "Chọn ngọc để khảm"}
                    </strong>
                    <p>
                      {gem
                        ? `Công kích +${getItem(gem.definitionId).gemStats?.attack ?? 0} · Phòng ngự +${getItem(gem.definitionId).gemStats?.defense ?? 0}`
                        : "Ngọc nhận từ chế tạo hoặc chiến lợi phẩm"}
                    </p>
                    <small>
                      {target.gems?.length ?? 0}/
                      {(target.enhancement ?? 0) >= 3 ? 2 : 1} ô ngọc đã khảm
                    </small>
                  </div>
                </div>
                <div className="socket-list">
                  {(target.gems ?? []).map((id, index) => (
                    <div key={`${id}:${index}`}>
                      <ArtIcon name="gem" itemId={id} />
                      <span>{getItem(id).name}</span>
                      <button
                        className="text-button"
                        onClick={() =>
                          send({
                            type: "removeGem",
                            instanceId: target.id,
                            socket: index,
                          })
                        }
                      >
                        Tháo · 100 bạc
                      </button>
                    </div>
                  ))}
                </div>
                <p className="hint">
                  Ngọc được trả lại vào túi khi tháo. Giao dịch bị từ chối
                  nguyên vẹn nếu không đủ tiền/chỗ trống.
                </p>
              </>
            ))}
        </>
      )}
      <p className="hint">
        Mọi thao tác cần đứng gần đúng NPC. Nguyên liệu đã khóa không bị tiêu
        hao.
      </p>
    </div>
  );
}
