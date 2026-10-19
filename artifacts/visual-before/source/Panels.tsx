import { questNavigation } from "./quest-navigation";
import { ClientSettings } from "./ClientSettings";
import { SectSkillsPanel } from "./SectSkillsPanel";
import { WorkshopPanel } from "./WorkshopPanel";
import { StoragePanel } from "./StoragePanel";
import { ActivityPanel } from "./ActivityPanel";
import { QuestOffers } from "./QuestOffers";
import { itemBonuses, respecCost } from "@kiem-hiep/game-core";
import { useState, type ReactNode } from "react";
import {
  X,
  Plus,
  Check,
  ArrowRight,
  ChevronRight,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Trash2,
  UserPlus,
  MapPin,
  Coins,
  Shield,
  Heart,
  Swords,
  Sparkles,
  Footprints,
} from "lucide-react";
import type {
  GameSnapshot,
  SimulationDiagnostics,
  GameCommand,
  Attributes,
} from "@kiem-hiep/game-protocol";
import {
  affixPool,
  classDefinitions,
  getItem,
  quests,
  maps,
  npcs,
  questObjectiveLabel,
  equipmentSlots,
  isEquipment,
} from "@kiem-hiep/game-content";
import { experienceForLevel } from "@kiem-hiep/game-core";
import type { SaveRecord } from "@kiem-hiep/game-storage";
import { ArtIcon } from "./ArtIcon";
export type PanelName =
  | "character"
  | "inventory"
  | "skills"
  | "quests"
  | "map"
  | "settings"
  | "guide"
  | "characters"
  | "dialogue"
  | "workshop"
  | "warehouse"
  | "activities";
interface Props {
  panel: PanelName;
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
  close: () => void;
  open: (name: PanelName) => void;
  diagnostics?: {
    fps: number;
    renderMs: number;
    objects: number;
    textures: number;
    activeChunks?: number;
    cachedChunks?: number;
    terrainBytes?: number;
    renderer?: string;
    activeEffects?: number;
  } | null;
  simulationDiagnostics?: SimulationDiagnostics | null;
  npcId: string;
  notify: (s: string) => void;
  onExport: () => void;
  onImport: () => void;
  onSave: () => void;
  records: SaveRecord[];
  onCreate: (
    name: string,
    classId: string,
    appearance: "male" | "female",
  ) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}
function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="section-heading">
      <span />
      {children}
      <span />
    </h3>
  );
}
export function Panels(p: Props) {
  const { panel, snapshot: s, send, close } = p,
    player = s.entities[s.playerId];
  const [selected, setSelected] = useState<string | null>(null),
    [tab, setTab] = useState("all"),
    [name, setName] = useState(""),
    [classId, setClassId] = useState("wudang"),
    [appearance, setAppearance] = useState<"male" | "female">("male"),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const item = s.inventory.find((i) => i.id === selected),
    definition = item ? getItem(item.definitionId) : null;
  const school = classDefinitions.find((c) => c.id === s.classId)!;
  const titles: Record<PanelName, [string, string]> = {
    workshop: ["Công xưởng", "RÈN LUYỆN & CHẾ TÁC"],
    warehouse: ["Kho đồ", "GIỮ LẠI HÀNH TRANG GIANG HỒ"],
    activities: ["Sinh hoạt giang hồ", "NGHỀ NGHIỆP & TÀI NGUYÊN"],
    character: ["Nhân vật", "THUỘC TÍNH & TRANG BỊ"],
    inventory: ["Hành trang", "VẬT PHẨM CỦA THIẾU HIỆP"],
    skills: ["Võ học", "LẤY TĨNH CHẾ ĐỘNG"],
    quests: ["Nhiệm vụ", "MỖI BƯỚC CHÂN, MỘT CÂU CHUYỆN"],
    map: ["Thiên hạ đồ", "CÁC MIỀN GIANG HỒ"],
    settings: ["Thiết lập", "TRẢI NGHIỆM CỦA BẠN"],
    guide: ["Cẩm nang giang hồ", "VẠN DẶM BẮT ĐẦU TỪ MỘT BƯỚC"],
    characters: ["Chọn nhân vật", "HÀNH TRÌNH CỦA RIÊNG BẠN"],
    dialogue: [
      npcs.find((n) => n.id === p.npcId)?.name ?? "Hội thoại",
      "KHÁCH QUÝ TỪ PHƯƠNG XA",
    ],
  };
  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={`game-panel panel-${panel}`}
        role="dialog"
        aria-modal="true"
        aria-label={titles[panel][0]}
      >
        <header className="panel-heading">
          <div>
            <small>{titles[panel][1]}</small>
            <h2>{titles[panel][0]}</h2>
          </div>
          <button
            className="close-button"
            onClick={close}
            aria-label="Đóng cửa sổ"
          >
            <X size={19} />
          </button>
        </header>
        <div className="panel-body">
          {panel === "character" && (
            <>
              <div className="character-layout">
                <div className="character-display">
                  <div className="character-element">☯</div>
                  <img src="/assets/hero.svg" alt="Nhân vật của bạn" />
                  <h3>{s.name}</h3>
                  <p>
                    {school.name} · Cấp {s.level}
                  </p>
                  <div className="equipment-row">
                    {equipmentSlots.map((slot) => {
                      const i = s.equipment[slot];
                      return (
                        <button
                          key={slot}
                          title={
                            i
                              ? `${getItem(i.definitionId).name} · Bấm để tháo`
                              : "Chưa trang bị"
                          }
                          onClick={() => i && send({ type: "unequip", slot })}
                          className={`item-slot ${i ? getItem(i.definitionId).rarity : ""}`}
                        >
                          {i ? (
                            <ArtIcon name={getItem(i.definitionId).icon} />
                          ) : (
                            <Shield size={20} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="character-stats">
                  <Heading>Chỉ số chiến đấu</Heading>
                  {[
                    [
                      Heart,
                      "Sinh lực",
                      `${Math.ceil(player.hp)} / ${player.maxHp}`,
                    ],
                    [
                      Sparkles,
                      "Nội lực",
                      `${Math.ceil(player.mp)} / ${player.maxMp}`,
                    ],
                    [Swords, "Lực công kích", player.attack],
                    [Shield, "Phòng ngự", Math.round(player.defense)],
                    [Footprints, "Tốc độ di chuyển", "3.4 ô / giây"],
                  ].map(([Icon, label, value]) => {
                    const Component = Icon as typeof Heart;
                    return (
                      <div className="stat-row" key={String(label)}>
                        <span>
                          <Component size={14} />
                          {String(label)}
                        </span>
                        <strong>{String(value)}</strong>
                      </div>
                    );
                  })}
                  <Heading>
                    Tiềm năng <em>{s.attributePoints} điểm</em>
                  </Heading>
                  {(
                    [
                      ["strength", "Sức mạnh"],
                      ["dexterity", "Thân pháp"],
                      ["vitality", "Sinh khí"],
                      ["energy", "Nội công"],
                    ] as [keyof Attributes, string][]
                  ).map(([key, label]) => (
                    <div className="stat-row" key={key}>
                      <span>{label}</span>
                      <strong>{s.attributes[key]}</strong>
                      <button
                        className="plus-button"
                        disabled={!s.attributePoints}
                        onClick={() =>
                          send({ type: "allocate", attribute: key })
                        }
                        aria-label={`Tăng ${label}`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => send({ type: "resetStats" })}
              >
                Tẩy tiềm năng · {respecCost(s.level)} bạc
              </button>
              <div className="progress-info">
                <span>
                  Kinh nghiệm{" "}
                  <b>
                    {s.experience} / {experienceForLevel(s.level)}
                  </b>
                </span>
                <div className="thin-progress">
                  <i
                    style={{
                      width: `${(s.experience / experienceForLevel(s.level)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
          {panel === "inventory" && (
            <>
              <div className="panel-tabs">
                {[
                  ["all", "Tất cả"],
                  ["equipment", "Trang bị"],
                  ["consumable", "Đan dược"],
                  ["material", "Nguyên liệu"],
                ].map(([id, label]) => (
                  <button
                    className={tab === id ? "active" : ""}
                    key={id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="inventory-layout">
                <div className="inventory-grid">
                  {Array.from({ length: 32 }, (_, n) => {
                    const i = s.inventory.filter(
                      (i) =>
                        tab === "all" ||
                        (tab === "equipment"
                          ? isEquipment(getItem(i.definitionId).kind)
                          : getItem(i.definitionId).kind === tab),
                    )[n];
                    const d = i ? getItem(i.definitionId) : null;
                    return (
                      <button
                        key={i?.id ?? n}
                        className={`item-slot ${d?.rarity ?? ""} ${selected === i?.id ? "selected" : ""}`}
                        onClick={() => setSelected(i?.id ?? null)}
                        title={d?.name ?? "Ô trống"}
                        aria-label={d?.name ?? `Ô trống ${n + 1}`}
                      >
                        {d && (
                          <>
                            <ArtIcon name={d.icon} />
                            {i!.quantity > 1 && <b>{i!.quantity}</b>}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="item-details">
                  {definition && item ? (
                    <>
                      <div className={`item-slot large ${definition.rarity}`}>
                        <ArtIcon name={definition.icon} />
                      </div>
                      <h3 className={definition.rarity}>
                        {definition.name}
                        {item?.enhancement ? ` +${item.enhancement}` : ""}
                      </h3>
                      <small>
                        {
                          {
                            common: "Phổ thông",
                            uncommon: "Tinh xảo",
                            rare: "Hiếm",
                            epic: "Sử thi",
                            legendary: "Truyền thuyết",
                            mythic: "Thần phẩm",
                          }[definition.rarity]
                        }{" "}
                        · Cấp {definition.level}
                        {definition.requiredLevel
                          ? ` · Cần cấp ${definition.requiredLevel}`
                          : ""}
                      </small>
                      {(item.affixes ?? []).length > 0 && (
                        <p className="affix-list">
                          {(item.affixes ?? []).map((affix) => (
                            <span key={affix.id}>
                              {affixPool.find((a) => a.id === affix.id)?.name ??
                                affix.id}{" "}
                              +{affix.value}
                              {affix.stat === "attack"
                                ? " công"
                                : affix.stat === "defense"
                                  ? " thủ"
                                  : affix.stat === "maxHp"
                                    ? " sinh lực"
                                    : " nội lực"}
                            </span>
                          ))}
                        </p>
                      )}
                      <p>{definition.description}</p>
                      {definition.attack > 0 && (
                        <p className="positive">
                          Công kích +{itemBonuses(item!).attack}
                        </p>
                      )}
                      {definition.defense > 0 && (
                        <p className="positive">
                          Phòng ngự +{itemBonuses(item!).defense}
                        </p>
                      )}
                      {definition.maxHp > 0 && (
                        <p className="positive">
                          Sinh lực +{itemBonuses(item!).maxHp}
                        </p>
                      )}
                      {definition.maxMp > 0 && (
                        <p className="positive">
                          Nội lực +{itemBonuses(item!).maxMp}
                        </p>
                      )}
                      {definition.kind === "consumable" ? (
                        <button
                          className="gold-button"
                          onClick={() =>
                            send({ type: "useItem", instanceId: item.id })
                          }
                        >
                          Sử dụng
                        </button>
                      ) : isEquipment(definition.kind) ? (
                        <button
                          className="gold-button"
                          onClick={() => {
                            send({ type: "equip", instanceId: item.id });
                            setSelected(null);
                          }}
                        >
                          Trang bị
                        </button>
                      ) : null}
                      <button
                        className="text-button"
                        onClick={() =>
                          send({ type: "sell", instanceId: item.id })
                        }
                      >
                        Bán 1 · {Math.floor(definition.price / 3)} bạc
                      </button>
                    </>
                  ) : (
                    <div className="empty-detail">
                      <Sparkles size={29} />
                      <p>
                        Chọn một vật phẩm
                        <br />
                        để xem chi tiết
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="inventory-utilities">
                <button
                  className="outline-button"
                  onClick={() => send({ type: "sortInventory" })}
                >
                  Sắp xếp
                </button>
                <button
                  className="outline-button"
                  onClick={() => p.open("workshop")}
                >
                  Công xưởng
                </button>
                <button
                  className="outline-button"
                  onClick={() => p.open("warehouse")}
                >
                  Kho đồ
                </button>
                <button
                  className="outline-button"
                  onClick={() => p.open("activities")}
                >
                  Nghề nghiệp
                </button>
                {item && (
                  <button
                    className="outline-button"
                    onClick={() =>
                      send({
                        type: "lockItem",
                        instanceId: item.id,
                        locked: !item.locked,
                      })
                    }
                  >
                    {item.locked ? "Mở khóa" : "Khóa vật phẩm"}
                  </button>
                )}
              </div>
              <div className="panel-footer">
                <span>
                  <Coins size={16} /> {s.gold.toLocaleString("vi-VN")} bạc
                </span>
                <small>{s.inventory.length} / 32 ô</small>
                <button
                  className="text-button"
                  onClick={() => {
                    close();
                    send({ type: "interact", targetId: "merchant" });
                  }}
                >
                  Đến dược sư <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}
          {panel === "skills" && <SectSkillsPanel snapshot={s} send={send} />}
          {panel === "workshop" && (
            <WorkshopPanel snapshot={s} send={send} close={close} />
          )}
          {panel === "warehouse" && (
            <StoragePanel snapshot={s} send={send} close={close} />
          )}
          {panel === "activities" && (
            <ActivityPanel snapshot={s} send={send} close={close} />
          )}
          {panel === "quests" && (
            <div className="quest-list">
              {quests.map((q, i) => {
                const state = s.quests.find((n) => n.id === q.id),
                  unlocked =
                    !q.requires ||
                    s.quests.some(
                      (n) => n.id === q.requires && n.status === "claimed",
                    );
                return (
                  <article
                    className={`quest-detail ${state?.status === "claimed" ? "completed" : ""}`}
                    key={q.id}
                  >
                    <small>{q.chapter}</small>
                    <h3>
                      <span>0{i + 1}</span>
                      {q.name}
                      {state?.status === "claimed" && <Check size={18} />}
                    </h3>
                    <p>{q.description}</p>
                    <div className="objective">
                      <span>{questObjectiveLabel(q)}</span>
                      <b>
                        {state?.progress ?? 0} / {q.count}
                      </b>
                    </div>
                    <div className="quest-rewards">
                      +{q.exp} kinh nghiệm <span>·</span> +{q.gold} bạc{" "}
                      <span>·</span> {getItem(q.rewardItem).name}
                    </div>
                    {state?.status === "claimed" ? (
                      <small className="positive">Đã nhận phần thưởng</small>
                    ) : state?.status === "active" ? (
                      <button
                        className="outline-button"
                        onClick={() => {
                          const command = questNavigation(s, q, state);
                          close();
                          if (command) send(command);
                          else
                            p.notify(
                              "Mục tiêu này cần thực hiện qua hoạt động tương ứng.",
                            );
                        }}
                      >
                        Theo dõi mục tiêu <ArrowRight size={14} />
                      </button>
                    ) : unlocked ? (
                      <button
                        className="gold-button"
                        onClick={() => {
                          const command = questNavigation(s, q, state);
                          close();
                          if (command) send(command);
                        }}
                      >
                        {state?.status === "ready"
                          ? "Trở về nhận thưởng"
                          : `Gặp ${npcs.find((n) => n.id === q.npc)?.name ?? q.npc}`}{" "}
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <small className="muted">
                        Hoàn thành chương trước để mở khóa
                      </small>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {panel === "map" && (
            <>
              <div className="world-map-art">
                <div className="map-mountains">山</div>
                <svg viewBox="0 0 600 220">
                  {maps.flatMap((m, i) =>
                    m.portals
                      .filter((portal) => m.id < portal.to)
                      .map((portal) => {
                        const j = maps.findIndex(
                          (destination) => destination.id === portal.to,
                        );
                        if (j < 0) return null;
                        const a = worldMapPoint(i),
                          b = worldMapPoint(j);
                        return (
                          <line
                            key={`${m.id}:${portal.id}`}
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke="#ccba85"
                            strokeWidth="2"
                            strokeDasharray="4 5"
                          />
                        );
                      }),
                  )}
                  {maps.map((m, i) => (
                    <g
                      key={m.id}
                      transform={`translate(${worldMapPoint(i).x},${worldMapPoint(i).y})`}
                    >
                      <circle
                        r="26"
                        fill="#223c30"
                        stroke={m.id === s.mapId ? "#eed197" : "#8a986d"}
                        strokeWidth="2"
                      />
                      <path
                        d="m-12 2 12-14L12 2M-9 0v12H9V0"
                        stroke="#d9c393"
                        strokeWidth="2"
                        fill="none"
                      />
                      <text
                        y="48"
                        textAnchor="middle"
                        fill="#e6d6ac"
                        fontSize="14"
                        fontFamily="serif"
                      >
                        {m.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <p className="map-note">
                <MapPin size={14} /> Hiện tại:{" "}
                {maps.find((m) => m.id === s.mapId)?.name} ·{" "}
                {Math.floor(player.x)}, {Math.floor(player.y)}
              </p>
              <Heading>Đường đi trong khu vực</Heading>
              {getCurrentPortals(s).map((portal) => (
                <button
                  className="destination-row"
                  key={portal.id}
                  onClick={() => {
                    send({ type: "interact", targetId: `portal:${portal.id}` });
                    close();
                  }}
                >
                  <MapPin size={18} />
                  <div>
                    <strong>{portal.name}</strong>
                    <small>Tự tìm đường đến cổng truyền tống</small>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
              {(maps.find((m) => m.id === s.mapId)?.areas ?? []).map((area) => (
                <button
                  className="destination-row"
                  key={area.id}
                  onClick={() => {
                    send({
                      type: "move",
                      destination: { x: area.x, y: area.y },
                    });
                    close();
                  }}
                >
                  <MapPin size={18} />
                  <div>
                    <strong>{area.name}</strong>
                    <small>
                      Cấp {area.level} · {area.x}, {area.y} · Tìm đường
                    </small>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))}
              <p className="hint">
                Nhấp vào nền đất để di chuyển. Đến cổng sáng để chuyển khu vực.
              </p>
            </>
          )}
          {panel === "dialogue" && (
            <>
              <div className="dialogue-scene">
                <img src="/assets/hero.svg" alt="Nhân vật NPC" />
                <div>
                  <small>{npcs.find((n) => n.id === p.npcId)?.role}</small>
                  <p>“{npcs.find((n) => n.id === p.npcId)?.dialogue}”</p>
                </div>
              </div>
              <QuestOffers snapshot={s} npcId={p.npcId} send={send} />
              {["merchant", "smith"].includes(p.npcId) && (
                <div className="shop-list">
                  {(p.npcId === "merchant"
                    ? ["hp", "mp"]
                    : ["sword", "robe", "boots"]
                  ).map((id) => {
                    const d = getItem(id);
                    return (
                      <div className="shop-row" key={id}>
                        <div className={`item-slot ${d.rarity}`}>
                          <ArtIcon name={d.icon} />
                        </div>
                        <div>
                          <h3>{d.name}</h3>
                          <small>
                            {d.attack
                              ? `Công kích +${d.attack}`
                              : d.defense
                                ? `Phòng ngự +${d.defense}`
                                : d.description}{" "}
                            · Cấp {d.level}
                          </small>
                        </div>
                        <button
                          className="outline-button"
                          onClick={() => send({ type: "buy", itemId: id })}
                        >
                          {d.price} <Coins size={13} />
                        </button>
                      </div>
                    );
                  })}
                  <p className="hint">
                    Đang có {s.gold} bạc. Mở hành trang khi đứng gần thương nhân
                    để bán vật phẩm.
                  </p>
                </div>
              )}
              <div className="inventory-utilities">
                {["elder", "merchant", "smith"].includes(p.npcId) && (
                  <button
                    className="outline-button"
                    onClick={() =>
                      p.open(p.npcId === "elder" ? "warehouse" : "workshop")
                    }
                  >
                    {p.npcId === "elder" ? "Mở kho đồ" : "Mở công xưởng"}
                  </button>
                )}
                <button
                  className="outline-button"
                  onClick={() => p.open("activities")}
                >
                  Nghề nghiệp & tài nguyên
                </button>
              </div>
              <button className="text-button dialogue-goodbye" onClick={close}>
                Tại hạ cáo từ <ArrowRight size={13} />
              </button>
            </>
          )}
          {panel === "settings" && (
            <>
              <Heading>Âm thanh & hình ảnh</Heading>
              <div className="setting-row">
                <div>
                  {s.settings.sound ? (
                    <Volume2 size={18} />
                  ) : (
                    <VolumeX size={18} />
                  )}
                  <span>
                    Âm thanh chiến đấu<small>Hiệu ứng âm thanh tổng hợp</small>
                  </span>
                </div>
                <button
                  className={`toggle ${s.settings.sound ? "on" : ""}`}
                  aria-label="Bật tắt âm thanh"
                  aria-pressed={s.settings.sound}
                  onClick={() =>
                    send({
                      type: "settings",
                      settings: { sound: !s.settings.sound },
                    })
                  }
                >
                  <i />
                </button>
              </div>
              <div className="setting-row">
                <div>
                  <Sparkles size={18} />
                  <span>
                    Nhạc nền<small>Giai điệu ngũ cung nhẹ nhàng</small>
                  </span>
                </div>
                <button
                  className={`toggle ${s.settings.music ? "on" : ""}`}
                  aria-label="Bật tắt nhạc nền"
                  aria-pressed={s.settings.music}
                  onClick={() =>
                    send({
                      type: "settings",
                      settings: { music: !s.settings.music },
                    })
                  }
                >
                  <i />
                </button>
              </div>
              <div className="setting-row">
                <span>Chất lượng hiệu ứng</span>
                <select
                  value={s.settings.effects}
                  onChange={(e) =>
                    send({
                      type: "settings",
                      settings: { effects: e.target.value as "high" | "low" },
                    })
                  }
                >
                  <option value="high">Cao</option>
                  <option value="low">Tiết kiệm</option>
                </select>
              </div>
              <div className="setting-row">
                <span>
                  Giới hạn khung hình{" "}
                  <small>Áp dụng sau khi tải lại game</small>
                </span>
                <select
                  value={s.settings.fps}
                  onChange={(e) =>
                    send({
                      type: "settings",
                      settings: { fps: Number(e.target.value) as 30 | 60 },
                    })
                  }
                >
                  <option value="60">60 FPS</option>
                  <option value="30">30 FPS</option>
                </select>
              </div>
              <ClientSettings />
              <Heading>Thế giới & mô phỏng</Heading>
              <div className="setting-row">
                <span>Tạm dừng thời gian game</span>
                <button
                  className="outline-button"
                  onClick={() => send({ type: "pause", paused: !s.paused })}
                >
                  {s.paused ? "Tiếp tục" : "Tạm dừng"}
                </button>
              </div>
              <div className="diagnostics-row">
                Tick {s.tick} ·{" "}
                {
                  Object.values(s.entities).filter((e) => e.mapId === s.mapId)
                    .length
                }{" "}
                entity map hiện tại
                {p.diagnostics && (
                  <>
                    {" "}
                    · {Math.round(p.diagnostics.fps)} FPS · CPU render{" "}
                    {p.diagnostics.renderMs.toFixed(2)}ms ·{" "}
                    {p.diagnostics.objects} objects · {p.diagnostics.textures}{" "}
                    textures · {p.diagnostics.renderer} ·{" "}
                    {p.diagnostics.activeChunks}/{p.diagnostics.cachedChunks}{" "}
                    chunks · terrain CPU{" "}
                    {(
                      Number(p.diagnostics.terrainBytes ?? 0) / 1048576
                    ).toFixed(1)}{" "}
                    MiB · {p.diagnostics.activeEffects ?? 0} VFX
                  </>
                )}
                {p.simulationDiagnostics && (
                  <p>
                    AI: {p.simulationDiagnostics.aiUpdated} / active{" "}
                    {p.simulationDiagnostics.active} · nearby{" "}
                    {p.simulationDiagnostics.nearby} · inactive{" "}
                    {p.simulationDiagnostics.inactive} · tick{" "}
                    {p.simulationDiagnostics.tickMs.toFixed(2)}ms · publish{" "}
                    {p.simulationDiagnostics.publishMs.toFixed(2)}ms
                  </p>
                )}
                <p>
                  Gửi {Object.keys(s.entities).length}/
                  {s.worldTotals?.entities ?? Object.keys(s.entities).length}{" "}
                  entity · dormant{" "}
                  {(s.worldTotals?.monsters ?? 0) -
                    Object.values(s.entities).filter(
                      (e) => e.kind === "monster",
                    ).length}{" "}
                  quái · Loot{" "}
                  {s.worldTotals?.groundLoot ??
                    Object.keys(s.groundLoot).length}
                  /512 · Kho vùng{" "}
                  {s.worldTotals?.deferredLoot ??
                    Object.keys(s.deferredLoot).length}
                  /2048 · Hết hạn {s.lootMetrics.expired} · Từ chối{" "}
                  {s.lootMetrics.rejected} · Thu hồi thường{" "}
                  {s.lootMetrics.commonReplaced}
                </p>
              </div>
              <Heading>Tiến trình của bạn</Heading>
              <p className="hint">
                Tự động lưu mỗi 15 giây và khi đổi bản đồ. Bản lưu trước được
                giữ dự phòng trong IndexedDB.
              </p>
              <div className="save-actions">
                <button className="gold-button" onClick={p.onSave}>
                  Lưu ngay
                </button>
                <button className="outline-button" onClick={p.onExport}>
                  <Download size={15} /> Xuất bản lưu
                </button>
                <button className="outline-button" onClick={p.onImport}>
                  <Upload size={15} /> Nhập bản lưu
                </button>
              </div>
              <p className="hint">
                Bản offline được lưu trên trình duyệt này. Hãy xuất bản lưu
                trước khi xóa dữ liệu trình duyệt.
              </p>
            </>
          )}
          {panel === "guide" && (
            <>
              <p className="guide-intro">
                Chào mừng thiếu hiệp đến với <em>Giang Hồ Ký</em>.<br />
                Một thế giới nhỏ. Một hành trình của riêng bạn.
              </p>
              <Heading>Bước đầu hành tẩu</Heading>
              <div className="guide-steps">
                {[
                  [
                    "01",
                    "Gặp Lão trưởng thôn",
                    "Nhận nhiệm vụ đầu tiên ở quảng trường.",
                  ],
                  [
                    "02",
                    "Rèn kiếm bên thôn",
                    "Đánh bại 5 sơn tặc ở phía đông nam.",
                  ],
                  [
                    "03",
                    "Khám phá giang hồ",
                    "Qua cổng Thanh Trúc Lâm, chiến thắng Lang vương.",
                  ],
                  [
                    "04",
                    "Đối đầu Hắc Phong",
                    "Trang bị đồ tốt, mang đan dược và khiêu chiến trại chủ.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n}>
                    <b>{n}</b>
                    <span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                  </div>
                ))}
              </div>
              <Heading>Điều khiển</Heading>
              <div className="key-guide">
                {[
                  ["Chuột trái", "Di chuyển / chọn quái / NPC"],
                  ["W A S D", "Di chuyển nhân vật"],
                  ["Space", "Đánh thường, tự tiếp cận mục tiêu"],
                  ["1 – 5", "Thi triển kỹ năng"],
                  ["Q / E", "Dùng đan hồi máu / nội lực"],
                  ["C · I · K", "Nhân vật · Hành trang · Võ học"],
                  ["J · M · Esc", "Nhiệm vụ · Bản đồ · Đóng cửa sổ"],
                ].map(([key, value]) => (
                  <div key={key}>
                    <kbd>{key}</kbd>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
              <p className="hint">
                Trên điện thoại: dùng cần điều khiển trái, cụm chiêu thức phải.
                Game chơi offline sau khi PWA báo sẵn sàng.
              </p>
            </>
          )}
          {panel === "characters" && (
            <>
              <Heading>Nhân vật đã lưu</Heading>
              <div className="saved-characters">
                {p.records.map((r) => (
                  <div className="saved-character" key={r.characterId}>
                    <img src="/assets/portrait.svg" alt="" />
                    <div>
                      <h3>
                        {r.snapshot.name}{" "}
                        {r.characterId === s.characterId && (
                          <small className="positive">Đang chơi</small>
                        )}
                      </h3>
                      <p>
                        {
                          classDefinitions.find(
                            (c) => c.id === r.snapshot.classId,
                          )?.name
                        }{" "}
                        · Cấp {r.snapshot.level}
                      </p>
                    </div>
                    <button
                      className="outline-button"
                      onClick={() => p.onSelect(r.characterId)}
                    >
                      Vào game
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Xóa ${r.snapshot.name}`}
                      onClick={() => setDeleteId(r.characterId)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              {deleteId && (
                <div className="inline-confirm">
                  <p>
                    Xóa nhân vật? Bản lưu sẽ được giữ trong kho lưu trữ dự
                    phòng.
                  </p>
                  <button
                    className="danger-button"
                    onClick={() => {
                      p.onDelete(deleteId);
                      setDeleteId(null);
                    }}
                  >
                    Xác nhận xóa
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setDeleteId(null)}
                  >
                    Hủy
                  </button>
                </div>
              )}
              <Heading>Tạo nhân vật mới</Heading>
              <form
                className="creation-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim().length >= 2)
                    p.onCreate(name.trim(), classId, appearance);
                }}
              >
                <label>
                  Tên nhân vật
                  <input
                    maxLength={18}
                    minLength={2}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Danh xưng của thiếu hiệp"
                  />
                </label>
                <label>
                  Môn phái
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    {classDefinitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ngoại hình
                  <select
                    value={appearance}
                    onChange={(e) =>
                      setAppearance(e.target.value as "male" | "female")
                    }
                  >
                    <option value="male">Nam hiệp</option>
                    <option value="female">Nữ hiệp</option>
                  </select>
                </label>
                <p className="hint">
                  Mỗi môn phái có hai nhánh riêng, nội công bị động và kỹ năng
                  đặc trưng. Đổi nhánh và gán chiêu trong Võ học. Bộ atlas hiện
                  cần rà soát art sản xuất.
                </p>
                <button type="submit" className="gold-button">
                  <UserPlus size={16} /> Bắt đầu hành trình
                </button>
              </form>
            </>
          )}
        </div>
        <footer className="panel-bottom">
          <span>KIẾM HIỆP WEB</span>
          <small>Giang hồ trong một tấc lòng</small>
        </footer>
      </section>
    </div>
  );
}
function getCurrentPortals(s: GameSnapshot) {
  return maps.find((m) => m.id === s.mapId)!.portals;
}

function worldMapPoint(i: number) {
  return {
    x: 65 + i * (470 / Math.max(1, maps.length - 1)),
    y: 140 - (i % 2) * 55,
  };
}
