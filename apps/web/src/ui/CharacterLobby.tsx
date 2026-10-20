import { CharacterPortrait } from "./GameUI";
import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowRight, Plus, ChevronLeft } from "lucide-react";
import {
  classDefinitions,
  getMap,
  getItem,
  actorVisualManifest,
} from "@kiem-hiep/game-content";
import {
  LOCAL_CHARACTER_SLOTS,
  characterNameError,
  normalizeCharacterName,
  type Direction8,
} from "@kiem-hiep/game-protocol";
import type { SaveRecord, SaveSlotIssue } from "@kiem-hiep/game-storage";
import { drawActorFrame } from "../game/animations/atlas";
import { actorSpriteFrame } from "../game/animations/actor-sprites";
import { ArtIcon } from "./ArtIcon";

const elementNames = {
  metal: "Kim",
  wood: "Mộc",
  water: "Thủy",
  fire: "Hỏa",
  earth: "Thổ",
};

export function CharacterPreview({
  classId,
  appearance = "male",
}: {
  classId: string;
  appearance?: "male" | "female";
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    // 4 hướng nhìn: xuống, phải, lên và trái (ảnh phải lật ngang).
    const directions = [2, 0, 6, 4] as Direction8[];
    const images = new Map<string, HTMLImageElement>();
    const spriteAt = (direction: Direction8) =>
      actorSpriteFrame(classId, appearance, "idle", direction, 0);
    for (const direction of directions) {
      const sprite = spriteAt(direction);
      if (!sprite) continue;
      const image = new Image();
      image.src = sprite.url;
      images.set(sprite.url, image);
    }
    let frame = 0;
    let step = 0;
    const draw = () => {
      g.clearRect(0, 0, 192, 288);
      const direction = directions[Math.floor(step / 20) % directions.length];
      const sprite = spriteAt(direction);
      const image = sprite ? images.get(sprite.url) : undefined;
      if (sprite && image?.complete && image.naturalWidth) {
        // Khung 256px neo chân y=246/256; phóng 208px cho vừa canvas 288px.
        const size = 208;
        g.save();
        if (sprite.flipX) {
          g.translate(192, 0);
          g.scale(-1, 1);
        }
        g.drawImage(image, 96 - size / 2, 288 - size, size, size);
        g.restore();
      } else {
        // Thiếu bộ ảnh (hoặc chưa tải xong): giữ bản vẽ thủ tục như cũ.
        g.save();
        g.scale(3, 3);
        drawActorFrame(
          g,
          direction,
          "idle",
          frame % 6,
          `${appearance === "female" ? "female:" : ""}${actorVisualManifest.weaponByClass[classId] ?? "sword"}`,
        );
        g.restore();
      }
      frame++;
      step++;
    };
    draw();
    const timer = setInterval(draw, 140);
    return () => clearInterval(timer);
  }, [classId, appearance]);
  return (
    <canvas
      className="lobby-actor"
      width={192}
      height={288}
      ref={canvas}
      aria-label="Xem trước nhân vật 8 hướng"
    />
  );
}

export function CharacterLobby({
  records,
  issues = [],
  onRecover,
  onCreate,
  onSelect,
  onDelete,
}: {
  records: SaveRecord[];
  issues?: SaveSlotIssue[];
  onRecover?: (id: string) => Promise<string | null>;
  onCreate: (
    name: string,
    classId: string,
    appearance: "male" | "female",
  ) => Promise<string | null>;
  onSelect: (id: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [creating, setCreating] = useState(records.length === 0);
  const [selectedId, setSelectedId] = useState(records[0]?.characterId ?? "");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("wudang");
  const [appearance, setAppearance] = useState<"male" | "female">("male");
  const [error, setError] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const selected =
    records.find((r) => r.characterId === selectedId) ?? records[0];
  const sect =
    classDefinitions.find(
      (s) => s.id === (creating ? classId : selected?.snapshot.classId),
    ) ?? classDefinitions[0];
  async function act(work: () => Promise<string | null>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const error = await work();
      if (error) setError(error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`character-lobby ${creating ? "creating-character" : "selecting-character"}`}
      aria-label={creating ? "Tạo nhân vật" : "Chọn nhân vật"}
    >
      <header className="lobby-heading">
        <div className="lobby-seal">劍</div>
        <div>
          <small>GIANG HỒ KÝ</small>
          <h1>{creating ? "Khởi bước giang hồ" : "Chọn nhân vật"}</h1>
          <p>Một danh xưng. Một hành trình của riêng bạn.</p>
        </div>
        <span>
          {records.length + issues.length}/{LOCAL_CHARACTER_SLOTS} nhân vật
        </span>
      </header>
      {issues.length > 0 && (
        <aside className="lobby-recovery" aria-label="Bản lưu cần khôi phục">
          {issues.map((issue) => (
            <div key={issue.characterId}>
              <strong>{issue.name} · Bản lưu lỗi</strong>
              <p>{issue.error} Các nhân vật khác vẫn chơi được.</p>
              <button
                className="outline-button"
                disabled={busy || !issue.hasBackup || !onRecover}
                onClick={() => void act(() => onRecover!(issue.characterId))}
              >
                Khôi phục {issue.name}
              </button>
              {!issue.hasBackup && (
                <small>
                  Không có dự phòng hợp lệ. Bản nguồn được giữ nguyên.
                </small>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setSelectedId(issue.characterId);
                  setDeleting(true);
                }}
              >
                Xóa ô lỗi {issue.name}
              </button>
              {deleting && selectedId === issue.characterId && (
                <div className="inline-confirm">
                  <p>
                    Xóa ô lỗi? Primary và backup sẽ được giữ trong kho lưu trữ.
                  </p>
                  <button
                    className="danger-button"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        const result = await onDelete(issue.characterId);
                        if (!result) setDeleting(false);
                        return result;
                      })
                    }
                  >
                    Xác nhận xóa ô lỗi
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setDeleting(false)}
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          ))}
          {error && (
            <p className="lobby-error" role="alert">
              {error}
            </p>
          )}
        </aside>
      )}
      <div className="lobby-layout">
        <aside
          className={`lobby-roster${creating ? " sect-roster" : ""}`}
          aria-label={creating ? "Môn phái" : "Nhân vật đã lưu"}
        >
          {creating
            ? classDefinitions.map((s) => (
                <button
                  key={s.id}
                  className={classId === s.id ? "selected" : ""}
                  aria-pressed={classId === s.id}
                  onClick={() => setClassId(s.id)}
                >
                  <strong>{s.name}</strong>
                  <small>
                    {elementNames[s.element]} · {s.weapon}
                  </small>
                </button>
              ))
            : records.map((r) => (
                <button
                  key={r.characterId}
                  className={
                    selected?.characterId === r.characterId ? "selected" : ""
                  }
                  aria-pressed={selected?.characterId === r.characterId}
                  onClick={() => {
                    setSelectedId(r.characterId);
                    setDeleting(false);
                    setError("");
                  }}
                >
                  <CharacterPortrait appearance={r.snapshot.appearance} />
                  <span>
                    <strong>{r.snapshot.name}</strong>
                    <small>
                      {
                        classDefinitions.find(
                          (s) => s.id === r.snapshot.classId,
                        )?.name
                      }{" "}
                      · Cấp {r.snapshot.level}
                    </small>
                  </span>
                </button>
              ))}
        </aside>
        <div
          className="lobby-stage"
          style={{ "--sect-color": sect.color } as React.CSSProperties}
        >
          <div className="lobby-stage-ring" />
          <small className="lobby-stage-caption">
            HIỆP KHÁCH ·{" "}
            {creating
              ? appearance === "female"
                ? "NỮ HIỆP"
                : "NAM HIỆP"
              : "HỒ SƠ GIANG HỒ"}
          </small>
          <div className="lobby-visual">
            {showModel ? (
              <CharacterPreview
                classId={sect.id}
                appearance={
                  creating ? appearance : selected?.snapshot.appearance
                }
              />
            ) : (
              <CharacterPortrait
                className="lobby-illustration"
                appearance={
                  creating ? appearance : selected?.snapshot.appearance
                }
              />
            )}
          </div>
          <button
            className="lobby-preview-toggle"
            onClick={() => setShowModel(!showModel)}
          >
            {showModel ? "Xem chân dung" : "Xem ngoại hình 8 hướng"}
          </button>
          <h2>
            {creating
              ? normalizeCharacterName(name) || "Danh xưng của bạn"
              : selected?.snapshot.name}
          </h2>
          <span>
            {sect.name} · Ngũ hành {elementNames[sect.element]}
          </span>
          {!creating && selected && (
            <div className="lobby-equipment">
              {Object.values(selected.snapshot.equipment).map((i) => (
                <div
                  className={`item-slot ${getItem(i.definitionId).rarity}`}
                  key={i.id}
                  title={getItem(i.definitionId).name}
                >
                  <ArtIcon name={getItem(i.definitionId).icon} />
                  {i.enhancement ? <b>+{i.enhancement}</b> : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lobby-details">
          <small>THẬP ĐẠI MÔN PHÁI · {sect.role}</small>
          <h2>{sect.name}</h2>
          <p>{sect.identity}</p>
          <div className="lobby-branches">
            {sect.branches.map((b) => (
              <div key={b.id}>
                <strong>{b.name}</strong>
                <p>{b.description}</p>
              </div>
            ))}
          </div>
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const error = characterNameError(name);
                if (error) {
                  setError(error);
                  return;
                }
                void act(() =>
                  onCreate(normalizeCharacterName(name), classId, appearance),
                );
              }}
            >
              <label>
                Tên nhân vật
                <input
                  autoComplete="off"
                  maxLength={36}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="Nhập danh xưng 2–18 ký tự"
                  required
                />
              </label>
              <label>
                Ngoại hình
                <select
                  aria-label="Ngoại hình"
                  value={appearance}
                  onChange={(e) =>
                    setAppearance(e.target.value as "male" | "female")
                  }
                >
                  <option value="male">Nam hiệp</option>
                  <option value="female">Nữ hiệp</option>
                </select>
              </label>
              {error && (
                <p className="lobby-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="gold-button"
                type="submit"
                disabled={
                  busy ||
                  records.length + issues.length >= LOCAL_CHARACTER_SLOTS
                }
              >
                {busy ? "Đang tạo…" : "Tạo nhân vật và vào game"}
                <ArrowRight size={16} />
              </button>
              {records.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setCreating(false);
                    setError("");
                  }}
                >
                  <ChevronLeft size={14} /> Chọn nhân vật đã lưu
                </button>
              )}
            </form>
          ) : (
            selected && (
              <>
                <dl className="lobby-character-info">
                  <div>
                    <dt>Cấp độ</dt>
                    <dd>{selected.snapshot.level}</dd>
                  </div>
                  <div>
                    <dt>Đang ở</dt>
                    <dd>{getMap(selected.snapshot.mapId).name}</dd>
                  </div>
                  <div>
                    <dt>Đã hành tẩu</dt>
                    <dd>
                      {Math.floor(selected.snapshot.playedTicks / 72000)} giờ{" "}
                      {Math.floor(selected.snapshot.playedTicks / 1200) % 60}{" "}
                      phút
                    </dd>
                  </div>
                </dl>
                {error && (
                  <p className="lobby-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="gold-button"
                  disabled={busy}
                  onClick={() => void act(() => onSelect(selected.characterId))}
                >
                  Vào game
                  <ArrowRight size={16} />
                </button>
                <button
                  className="outline-button"
                  disabled={
                    busy ||
                    records.length + issues.length >= LOCAL_CHARACTER_SLOTS
                  }
                  onClick={() => {
                    setCreating(true);
                    setError("");
                  }}
                >
                  <Plus size={15} /> Tạo nhân vật mới
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 size={14} /> Xóa nhân vật
                </button>
                {deleting && (
                  <div className="inline-confirm">
                    <p>
                      Xóa {selected.snapshot.name}? Bản lưu sẽ được giữ trong
                      kho lưu trữ dự phòng.
                    </p>
                    <button
                      className="danger-button"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          const error = await onDelete(selected.characterId);
                          if (!error) {
                            setDeleting(false);
                            if (records.length === 1) setCreating(true);
                          }
                          return error;
                        })
                      }
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setDeleting(false)}
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
