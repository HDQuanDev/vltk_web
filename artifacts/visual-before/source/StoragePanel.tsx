import { useState } from "react";
import { getItem } from "@kiem-hiep/game-content";
import {
  INVENTORY_CAPACITY,
  WAREHOUSE_CAPACITY,
  type GameSnapshot,
  type GameCommand,
} from "@kiem-hiep/game-protocol";
import { ArtIcon } from "./ArtIcon";
export function StoragePanel({
  snapshot: s,
  send,
  close,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
  close: () => void;
}) {
  const [tab, setTab] = useState("deposit");
  const list = tab === "deposit" ? s.inventory : s.warehouse;
  return (
    <>
      <div className="workshop-navigation">
        <button
          className="outline-button"
          onClick={() => {
            close();
            send({ type: "interact", targetId: "elder" });
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
      <p className="hint">
        Bấm vật phẩm để chuyển cả stack. Cần ở gần Lão trưởng thôn. Trang bị,
        cấp cường hóa và ngọc được giữ nguyên.
      </p>
      <div className="warehouse-grid">
        {list.map((i) => (
          <button
            key={i.id}
            title={`${getItem(i.definitionId).name} ×${i.quantity}`}
            className={`item-slot ${getItem(i.definitionId).rarity}`}
            aria-label={`${tab === "deposit" ? "Gửi" : "Rút"} ${getItem(i.definitionId).name}`}
            onClick={() =>
              send({
                type: tab === "deposit" ? "deposit" : "withdraw",
                instanceId: i.id,
              })
            }
          >
            <ArtIcon name={getItem(i.definitionId).icon} />
            <b>
              {i.quantity > 1
                ? i.quantity
                : i.enhancement
                  ? `+${i.enhancement}`
                  : ""}
            </b>
          </button>
        ))}
      </div>
      {!list.length && (
        <p className="hint">Chưa có vật phẩm trong khu vực này.</p>
      )}
    </>
  );
}
