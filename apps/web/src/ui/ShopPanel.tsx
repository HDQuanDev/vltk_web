import { useState } from "react";
import { getItem, isEquipment, npcs } from "@kiem-hiep/game-content";
import type { GameCommand, GameSnapshot } from "@kiem-hiep/game-protocol";
import { ArtIcon } from "./ArtIcon";
import { rarityNames } from "./GameUI";

export function ShopPanel({
  snapshot: s,
  npcId,
  send,
}: {
  snapshot: GameSnapshot;
  npcId: string;
  send: (c: GameCommand) => void;
}) {
  const [tab, setTab] = useState("buy"),
    [category, setCategory] = useState("all");
  const service = npcs.find((n) => n.id === npcId)?.service ?? npcId;
  if (service !== "merchant" && service !== "smith") return null;
  const catalog = (
    service === "merchant"
      ? ["hp", "mp"]
      : ["sword", "robe", "boots", "ward-stone"]
  ).map(getItem);
  const rows =
    tab === "buy"
      ? catalog.map((d) => ({ definition: d, item: undefined }))
      : s.inventory.map((item) => ({
          definition: getItem(item.definitionId),
          item,
        }));
  return (
    <section className="merchant-counter" aria-label="Giao dịch thương nhân">
      <div className="merchant-wallet">
        <div>
          <small>
            {service === "smith" ? "BINH KHÍ PHƯỜNG" : "BÁCH THẢO ĐƯỜNG"}
          </small>
          <h3>
            {service === "smith" ? "Binh khí & bảo vật" : "Đan dược dưỡng sinh"}
          </h3>
        </div>
        <strong>
          {s.gold.toLocaleString("vi-VN")} <small>bạc</small>
        </strong>
      </div>
      <div className="panel-tabs">
        <button
          className={tab === "buy" ? "active" : ""}
          onClick={() => setTab("buy")}
        >
          Mua vật phẩm
        </button>
        <button
          className={tab === "sell" ? "active" : ""}
          onClick={() => setTab("sell")}
        >
          Bán từ hành trang
        </button>
      </div>
      {(tab === "sell" || service === "smith") && (
        <div className="shop-filters" aria-label="Loại hàng">
          {[
            ["all", "Tất cả"],
            ["equipment", "Trang bị"],
            ["consumable", "Đan dược"],
            ["material", "Nguyên liệu"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="shop-list shop-grid">
        {rows
          .filter(
            ({ definition: d }) =>
              category === "all" ||
              (category === "equipment"
                ? isEquipment(d.kind)
                : d.kind === category),
          )
          .map(({ definition: d, item }) => (
            <article className="shop-row shop-card" key={item?.id ?? d.id}>
              <div className={`item-slot ${d.rarity}`}>
                <ArtIcon name={d.icon} itemId={d.id} />
                {!!item?.enhancement && <b>+{item.enhancement}</b>}
              </div>
              <div>
                <small className={d.rarity}>
                  {rarityNames[d.rarity]} · Cấp {d.requiredLevel ?? d.level}
                </small>
                <h3>{d.name}</h3>
                <p>{d.description}</p>
                {item && (
                  <small>
                    Còn {item.quantity} ·{" "}
                    {item.locked ? "Đã khóa bảo vệ" : "Trong hành trang"}
                  </small>
                )}
              </div>
              <button
                className="outline-button"
                disabled={tab === "buy" ? s.gold < d.price : item?.locked}
                aria-label={`${tab === "buy" ? "Mua" : "Bán"} ${d.name}`}
                onClick={() => {
                  if (tab === "buy") send({ type: "buy", itemId: d.id });
                  else if (item) {
                    if (
                      ["epic", "legendary", "mythic"].includes(d.rarity) &&
                      !window.confirm(`Bán 1 ${d.name}?`)
                    )
                      return;
                    send({ type: "sell", instanceId: item.id });
                  }
                }}
              >
                {tab === "buy" ? d.price : Math.max(1, Math.floor(d.price / 3))}{" "}
                <span>bạc</span>
              </button>
            </article>
          ))}
      </div>
      <p className="hint">
        Mỗi lần giao dịch 1 vật phẩm · Túi {s.inventory.length}/32 ô. Vật phẩm
        khóa được bảo vệ khi bán.
      </p>
    </section>
  );
}
