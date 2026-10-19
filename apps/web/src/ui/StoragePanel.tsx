import { useState } from "react";
import { getItem, isEquipment, npcs } from "@kiem-hiep/game-content";
import {
  INVENTORY_CAPACITY,
  WAREHOUSE_CAPACITY,
  type GameSnapshot,
  type GameCommand,
} from "@kiem-hiep/game-protocol";
import { ItemSlot } from "./GameUI";
export function StoragePanel({
  snapshot: s,
  send,
  close,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
  close: () => void;
}) {
  const [tab, setTab] = useState("deposit"),
    [filter, setFilter] = useState("all");
  const keeper =
    npcs.find(
      (n) => n.mapId === s.mapId && (n.service === "elder" || n.id === "elder"),
    )?.id ?? "elder";
  return (
    <>
      <div className="workshop-navigation">
        <button
          className="outline-button"
          onClick={() => {
            close();
            send({ type: "interact", targetId: keeper });
          }}
        >
          Đến thủ kho / trưởng thôn
        </button>
        <span>
          Túi {s.inventory.length}/{INVENTORY_CAPACITY} · Kho{" "}
          {s.warehouse.length}/{WAREHOUSE_CAPACITY}
        </span>
      </div>
      <div className="panel-tabs">
        <button
          className={tab === "deposit" ? "active" : ""}
          onClick={() => setTab("deposit")}
        >
          Gửi từ hành trang
        </button>
        <button
          className={tab === "withdraw" ? "active" : ""}
          onClick={() => setTab("withdraw")}
        >
          Rút từ kho
        </button>
      </div>
      <div className="shop-filters" aria-label="Lọc kho đồ">
        {[
          ["all", "Tất cả"],
          ["equipment", "Trang bị"],
          ["material", "Nguyên liệu"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="storage-columns">
        {(["deposit", "withdraw"] as const).map((direction) => {
          const list = direction === "deposit" ? s.inventory : s.warehouse;
          const filtered = list.filter(
            (i) =>
              filter === "all" ||
              (filter === "equipment"
                ? isEquipment(getItem(i.definitionId).kind)
                : getItem(i.definitionId).kind === filter),
          );
          return (
            <section
              className={tab === direction ? "storage-active" : ""}
              key={direction}
              aria-label={
                direction === "deposit" ? "Hành trang cá nhân" : "Kho lưu trữ"
              }
            >
              <header>
                <h3>
                  {direction === "deposit" ? "Hành trang" : "Kho lưu trữ"}
                </h3>
                <small>
                  {list.length}/
                  {direction === "deposit"
                    ? INVENTORY_CAPACITY
                    : WAREHOUSE_CAPACITY}{" "}
                  ô
                </small>
              </header>
              <div className="warehouse-grid">
                {filtered.map((i) => (
                  <ItemSlot
                    key={i.id}
                    item={i}
                    label={`${direction === "deposit" ? "Gửi" : "Rút"} ${getItem(i.definitionId).name}`}
                    onClick={() => send({ type: direction, instanceId: i.id })}
                  />
                ))}
              </div>
              {!filtered.length && (
                <div className="storage-empty">
                  <span>◇</span>
                  <p>
                    {list.length
                      ? "Không có vật phẩm phù hợp bộ lọc"
                      : "Chưa có vật phẩm"}
                  </p>
                </div>
              )}
            </section>
          );
        })}
      </div>
      <p className="hint">
        Bấm vật phẩm để chuyển cả chồng. Cần ở gần thủ kho. Trang bị, cấp cường
        hóa và ngọc được giữ nguyên.
      </p>
    </>
  );
}
