import { LootNoticeWindow } from "../ui/loot-notices";
import { questNavigation } from "../ui/quest-navigation";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  UserRound,
  Backpack,
  Swords,
  ScrollText,
  Map,
  Settings,
  ChevronDown,
  ChevronRight,
  Volume2,
  VolumeX,
  BookOpen,
  ShieldCheck,
  Compass,
  MessageSquare,
  Send,
  Coins,
  Leaf,
  ArrowUpRight,
  Menu,
  LocateFixed,
  Upload,
  X,
  RotateCw,
  Smartphone,
} from "lucide-react";
import type {
  GameSession,
  SimulationDiagnostics,
  GameSnapshot,
  GameCommand,
  GameEvent,
  GroundLoot,
} from "@kiem-hiep/game-protocol";
import { LocalGameSession } from "@kiem-hiep/game-session";
import {
  SaveRepository,
  validateSave,
  type SaveRecord,
  type SaveSlotIssue,
} from "@kiem-hiep/game-storage";
import { createGame, experienceForLevel, distance } from "@kiem-hiep/game-core";
import {
  classDefinitions,
  getMap,
  skills,
  quests,
  validateContent,
  questObjectiveLabel,
  worldTime,
  getItem,
} from "@kiem-hiep/game-content";
import { registerSW } from "virtual:pwa-register";
import { Panels, type PanelName } from "../ui/Panels";
import { ArtIcon } from "../ui/ArtIcon";
import { getPreferences } from "../game/preferences";
import { playEvent, syncAudio, disposeAudio, unlockAudio } from "../game/audio";
import { useLandscapeMode } from "./useLandscapeMode";
import { CharacterLobby } from "../ui/CharacterLobby";
import { createLocalCharacterId } from "@kiem-hiep/game-protocol";
const repository = new SaveRepository();
interface Log {
  type: string;
  text: string;
  id: number;
}
const initialLogs: Log[] = [
  { id: -3, type: "system", text: "Chào mừng thiếu hiệp đến với Giang Hồ Ký." },
  {
    id: -2,
    type: "guide",
    text: "Nhấp vào mặt đất để di chuyển. Dùng WASD hoặc phím mũi tên.",
  },
  { id: -1, type: "guide", text: "Gặp Lão trưởng thôn để bắt đầu hành trình." },
];
const navigation: [PanelName, string, typeof UserRound, string][] = [
  ["character", "Nhân vật", UserRound, "C"],
  ["inventory", "Hành trang", Backpack, "I"],
  ["skills", "Võ học", Swords, "K"],
  ["quests", "Nhiệm vụ", ScrollText, "J"],
  ["map", "Bản đồ", Map, "M"],
];
export default function App() {
  const { portraitBlocked, enterLandscape } = useLandscapeMode();
  const [session, setSession] = useState<GameSession | null>(null),
    [snapshot, setSnapshot] = useState<GameSnapshot | null>(null),
    [error, setError] = useState(""),
    [panel, setPanel] = useState<PanelName | null>(null),
    [npcId, setNpcId] = useState("elder"),
    [logs, setLogs] = useState<Log[]>(initialLogs),
    [logTab, setLogTab] = useState("all"),
    [note, setNote] = useState(""),
    [toast, setToast] = useState(""),
    [records, setRecords] = useState<SaveRecord[]>([]),
    [slotIssues, setSlotIssues] = useState<SaveSlotIssue[]>([]),
    [saveStatus, setSaveStatus] = useState("Đang tải tiến trình…"),
    [offlineReady, setOfflineReady] = useState(false),
    [updateAvailable, setUpdateAvailable] = useState(false),
    [recoveryId, setRecoveryId] = useState<string | null>(null),
    [simulationDiagnostics, setSimulationDiagnostics] =
      useState<SimulationDiagnostics | null>(null),
    [loading, setLoading] = useState(true),
    [entryReady, setEntryReady] = useState(false),
    [pendingImport, setPendingImport] = useState<GameSnapshot | null>(null),
    [mobileMenu, setMobileMenu] = useState(false),
    [questCollapsed, setQuestCollapsed] = useState(() => innerWidth < 1000),
    [miniExpanded, setMiniExpanded] = useState(false),
    [saveNotice, setSaveNotice] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    fps: number;
    renderMs: number;
    objects: number;
    textures: number;
    activeChunks?: number;
    cachedChunks?: number;
    terrainBytes?: number;
    renderer?: string;
    activeEffects?: number;
  } | null>(null);
  const pendingImportOriginal = useRef<unknown>(null);
  const updateServiceWorker = useRef<
    ((reloadPage?: boolean) => Promise<void>) | null
  >(null);
  const host = useRef<HTMLDivElement>(null),
    panelRef = useRef<PanelName | null>(null),
    sessionRef = useRef<GameSession | null>(null),
    saveLocked = useRef(false),
    lastMap = useRef(""),
    importInput = useRef<HTMLInputElement>(null),
    logList = useRef<HTMLDivElement>(null);
  const portraitRef = useRef(portraitBlocked);
  const orientationPause = useRef<{
    session: GameSession;
    wasPaused: boolean;
  } | null>(null);
  portraitRef.current = portraitBlocked;
  panelRef.current = panel;
  sessionRef.current = session;
  const notify = useCallback((text: string) => {
    setToast(text);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const contentErrors = validateContent();
        if (contentErrors.length) throw new Error(contentErrors.join("; "));
        const slots = await repository.listSlots();
        const list = slots.records;
        if (cancelled) return;
        setRecords(list);
        setSlotIssues(slots.issues);
        if (list[0]) setRecoveryId(list[0].characterId);
        setEntryReady(true);
        setSaveStatus("Chọn nhân vật để bắt đầu");
      } catch (e) {
        setError(
          `Không thể đọc bản lưu. Dữ liệu được giữ nguyên. ${e instanceof Error ? e.message : ""}`,
        );
      }
    }
    void init();
    updateServiceWorker.current = registerSW({
      onNeedRefresh() {
        setUpdateAvailable(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
      onRegisterError(e) {
        console.error("PWA:", e);
      },
    });
    if (navigator.serviceWorker?.controller)
      void caches
        .match("/index.html", { ignoreSearch: true })
        .then((response) => {
          if (response) setOfflineReady(true);
        });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!saveStatus.startsWith("Đã lưu")) return;
    setSaveNotice(true);
    const timer = setTimeout(() => setSaveNotice(false), 2200);
    return () => clearTimeout(timer);
  }, [saveStatus]);
  const save = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || saveLocked.current) return false;
    saveLocked.current = true;
    setSaveStatus("Đang lưu…");
    try {
      const state = current.getSnapshot();
      const pause = orientationPause.current;
      await repository.save(
        pause?.session === current
          ? { ...state, paused: pause.wasPaused }
          : state,
      );
      setSaveStatus("Đã lưu tiến trình");
      setRecords(await refreshRoster());
      return true;
    } catch (e) {
      setSaveStatus("Lưu thất bại");
      notify(
        `Không lưu được: ${e instanceof Error ? e.message : "Lỗi IndexedDB"}`,
      );
      return false;
    } finally {
      saveLocked.current = false;
    }
  }, [notify]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const unsubscribe = session.subscribe((update) => {
      if (!active) return;
      setSnapshot(update.snapshot);
      setSimulationDiagnostics(update.diagnostics ?? null);
      syncAudio(update.snapshot);
      if (lastMap.current && lastMap.current !== update.snapshot.mapId)
        void save();
      lastMap.current = update.snapshot.mapId;
      const meaningful = update.events.filter((e) =>
        [
          "message",
          "error",
          "death",
          "loot",
          "level",
          "map",
          "dialogue",
          "craft",
          "resource",
          "equipment",
          "interrupt",
          "telegraph",
        ].includes(e.type),
      );
      if (meaningful.length)
        setLogs((previous) =>
          [
            ...previous,
            ...meaningful.map((e: GameEvent) => ({
              id: Date.now() + e.id,
              type: e.type,
              text: e.text,
            })),
          ].slice(-80),
        );
      for (const e of update.events) {
        playEvent(e, update.snapshot.settings);
        if (e.type === "dialogue") {
          setNpcId(e.entityId!);
          setPanel("dialogue");
        }
        if (e.type === "error") notify(e.text);
        if (e.type === "level") notify(e.text);
      }
    });
    void session.start();
    const timer = setInterval(() => void save(), 15000);
    const visibility = () => {
      if (document.visibilityState === "hidden") void save();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      void session.dispose();
      disposeAudio();
    };
  }, [session, save, notify]);
  useEffect(() => {
    if (!session || !portraitBlocked) return;
    const pause = { session, wasPaused: session.getSnapshot().paused };
    orientationPause.current = pause;
    session.sendCommand({ type: "stop" });
    if (!pause.wasPaused) session.sendCommand({ type: "pause", paused: true });
    return () => {
      orientationPause.current = null;
      if (!pause.wasPaused)
        session.sendCommand({ type: "pause", paused: false });
    };
  }, [session, portraitBlocked]);
  useEffect(() => {
    if (!session || !host.current) return;
    let cancelled = false;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;
    setLoading(true);
    import("../game/bootstrap")
      .then(({ bootGame }) => {
        if (cancelled || !host.current) return;
        game = bootGame(
          host.current,
          session,
          () => !!panelRef.current || portraitRef.current,
          {
            onReady: () => setLoading(false),
            onError: (message) => setError(message),
            onDiagnostics: setDiagnostics,
          },
        );
      })
      .catch((e) => setError(`Không khởi tạo được bản đồ: ${String(e)}`));
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [session]);
  useEffect(() => {
    if (logList.current)
      logList.current.scrollTop = logList.current.scrollHeight;
  }, [logs]);
  const send = useCallback((command: GameCommand) => {
    if (portraitRef.current) return;
    unlockAudio();
    sessionRef.current?.sendCommand(command);
  }, []);
  const togglePanel = useCallback((name: PanelName) => {
    unlockAudio();
    setPanel((p) => (p === name ? null : name));
    setMobileMenu(false);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (portraitRef.current) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "Escape") {
        setPanel(null);
        setMobileMenu(false);
        return;
      }
      if (panelRef.current) return;
      const shortcuts: Record<string, PanelName> = {
        i: "inventory",
        c: "character",
        k: "skills",
        m: "map",
        j: "quests",
      };
      if (shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        togglePanel(shortcuts[e.key.toLowerCase()]);
        return;
      }
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const current = sessionRef.current?.getSnapshot();
        const skillId =
          e.key === "1" ? "slash" : current?.hotbar[Number(e.key) - 2];
        if (skillId) send({ type: "skill", skillId });
      }
      if (e.key.toLowerCase() === "q" || e.key.toLowerCase() === "e") {
        const current = sessionRef.current?.getSnapshot(),
          item = current?.inventory.find(
            (i) =>
              i.definitionId === (e.key.toLowerCase() === "q" ? "hp" : "mp"),
          );
        if (item) send({ type: "useItem", instanceId: item.id });
        else notify("Bạn đã hết đan dược này.");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [send, togglePanel, notify]);
  async function refreshRoster() {
    const slots = await repository.listSlots();
    setSlotIssues(slots.issues);
    return slots.records;
  }
  async function recoverCharacter(id: string) {
    try {
      const recovered = await repository.recover(id);
      if (!recovered) return "Nhân vật này không có bản dự phòng hợp lệ.";
      await repository.save(recovered);
      setRecords(await refreshRoster());
      notify("Đã phục hồi nhân vật. Bản lỗi được giữ trong kho lưu trữ.");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  async function replaceSession(state: GameSnapshot, isNew = false) {
    if (sessionRef.current && !(await save()))
      throw new Error(
        "Chưa lưu được tiến trình hiện tại. Hãy thử lại trước khi đổi nhân vật.",
      );
    if (isNew) state = await repository.create(state);
    else await repository.save(state);
    const local = new LocalGameSession(state);
    lastMap.current = state.mapId;
    setSnapshot(state);
    setSession(local);
    setPanel(null);
    setLogs(initialLogs);
    setRecords(await refreshRoster());
  }
  async function createCharacter(
    name: string,
    classId: string,
    appearance: "male" | "female",
  ) {
    try {
      const state = createGame(
        name,
        classId,
        createLocalCharacterId(),
        Math.floor(Math.random() * 4294967295),
        appearance,
      );
      await replaceSession(state, true);
      notify(`Chào ${name}, giang hồ đang đợi bạn.`);
      return null;
    } catch (e) {
      notify(String(e));
      return e instanceof Error ? e.message : String(e);
    }
  }
  async function selectCharacter(id: string) {
    try {
      if (id === snapshot?.characterId) {
        setPanel(null);
        return null;
      }
      const state = await repository.load(id);
      if (state) await replaceSession(state);
      else return "Không tìm thấy nhân vật này.";
      return null;
    } catch (e) {
      notify(`Bản lưu không hợp lệ: ${String(e)}`);
      return e instanceof Error ? e.message : String(e);
    }
  }
  async function deleteCharacter(id: string) {
    if (id === snapshot?.characterId) {
      notify("Chọn nhân vật khác trước khi xóa nhân vật đang chơi.");
      return "Chọn nhân vật khác trước khi xóa nhân vật đang chơi.";
    }
    try {
      await repository.delete(id);
      setRecords(await refreshRoster());
      return null;
    } catch (e) {
      notify(String(e));
      return e instanceof Error ? e.message : String(e);
    }
  }
  function exportSave() {
    if (!session) return;
    const blob = new Blob([repository.export(session.getSnapshot())], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `kiem-hiep-${snapshot?.name}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Đã xuất bản lưu.");
  }
  async function readImport(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Tệp quá lớn (tối đa 10MB).");
      const source: unknown = JSON.parse(await file.text());
      pendingImportOriginal.current = source;
      const valid = validateSave(source);
      setPendingImport(valid);
    } catch (e) {
      notify(
        `Không nhập bản lưu: ${e instanceof Error ? e.message : "Dữ liệu sai"}`,
      );
    }
    if (importInput.current) importInput.current.value = "";
  }
  async function confirmImport() {
    if (!pendingImport) return;
    try {
      if (sessionRef.current && !(await save()))
        throw new Error(
          "Chưa lưu được tiến trình hiện tại. Hãy thử nhập lại sau.",
        );
      const valid = await repository.import(
        pendingImportOriginal.current ?? pendingImport,
      );
      pendingImportOriginal.current = null;
      setPendingImport(null);
      const local = new LocalGameSession(valid);
      setSession(local);
      setSnapshot(valid);
      setError("");
      setPanel(null);
      setRecords(await refreshRoster());
      notify("Đã nhập bản lưu. Bản trước được giữ dự phòng.");
    } catch (e) {
      notify(String(e));
    }
  }
  if (error)
    return (
      <div className="boot-screen">
        <div className="boot-emblem">劍</div>
        <h1>Không thể vào giang hồ</h1>
        <p>{error}</p>
        <button className="gold-button" onClick={() => location.reload()}>
          Thử lại
        </button>
        {recoveryId && (
          <button
            className="outline-button"
            onClick={() => {
              void repository
                .recover(recoveryId)
                .then((recovered) => {
                  if (!recovered) {
                    setError(
                      "Không có bản dự phòng hợp lệ. Hãy nhập tệp đã xuất trước đó.",
                    );
                    return;
                  }
                  setSession(new LocalGameSession(recovered));
                  setSnapshot(recovered);
                  setError("");
                })
                .catch((e) =>
                  setError(`Bản dự phòng cũng không hợp lệ: ${String(e)}`),
                );
            }}
          >
            Khôi phục bản dự phòng
          </button>
        )}
        <input
          type="file"
          accept=".json"
          onChange={(e) => void readImport(e.target.files?.[0])}
        />
        {pendingImport && (
          <button
            className="outline-button"
            onClick={() => void confirmImport()}
          >
            Khôi phục từ tệp hợp lệ
          </button>
        )}
      </div>
    );
  if ((!snapshot || !session) && entryReady)
    return (
      <main
        className={`game-app${portraitBlocked ? " orientation-blocked" : ""}`}
        onPointerDown={() => unlockAudio()}
      >
        {portraitBlocked && (
          <OrientationGuard enterLandscape={enterLandscape} />
        )}
        <CharacterLobby
          records={records}
          issues={slotIssues}
          onRecover={recoverCharacter}
          onCreate={createCharacter}
          onSelect={selectCharacter}
          onDelete={deleteCharacter}
        />
      </main>
    );
  if (!snapshot || !session)
    return (
      <div className="boot-screen">
        <div className="boot-emblem">劍</div>
        <h1>Kiếm Hiệp Web</h1>
        <p>Đang mở cánh cửa giang hồ…</p>
        <div className="loading-line" />
      </div>
    );
  const s = snapshot,
    player = s.entities[s.playerId],
    map = getMap(s.mapId),
    school = classDefinitions.find((c) => c.id === s.classId)!,
    area = map.areas?.find((a) => distance(player, a) < a.radius),
    activeQuest = s.quests.find((q) => q.status !== "claimed"),
    quest =
      quests.find((q) => q.id === activeQuest?.id) ??
      quests.find((q) => !s.quests.some((p) => p.id === q.id)) ??
      quests[2];
  const allQuestsDone =
    s.quests.length === quests.length &&
    s.quests.every((q) => q.status === "claimed");
  const hpPercent = (player.hp / player.maxHp) * 100,
    mpPercent = (player.mp / player.maxMp) * 100;
  const hotbarSkills = s.hotbar.map((id) => skills.find((d) => d.id === id)!);
  function potion(id: string) {
    const item = s.inventory.find((i) => i.definitionId === id);
    if (item) send({ type: "useItem", instanceId: item.id });
    else notify("Đã hết đan dược. Ghé Diệp dược sư để mua thêm.");
  }
  function attackNearest() {
    const target = Object.values(s.entities)
      .filter((e) => e.kind === "monster" && e.mapId === s.mapId && e.hp > 0)
      .sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (target) send({ type: "attack", targetId: target.id });
    else notify("Không có kẻ địch trong khu vực.");
  }
  return (
    <main
      className={`game-app${portraitBlocked ? " orientation-blocked" : ""}`}
      onPointerDown={() => unlockAudio()}
    >
      {portraitBlocked && <OrientationGuard enterLandscape={enterLandscape} />}
      <div className="world-viewport" ref={host} data-testid="game-viewport" />
      <GroundLootNotices
        key={`${s.characterId}:${s.mapId}`}
        snapshot={s}
        send={send}
      />
      {loading && <div className="world-loading">Đang dựng bản đồ…</div>}
      <nav className="hud-actions" aria-label="Menu gameplay">
        <span
          className="offline-status"
          title={
            offlineReady ? "Sẵn sàng offline" : "Đang chuẩn bị cache offline"
          }
        >
          <i className={offlineReady ? "ready" : ""} />
          <span className="sr-only">
            {offlineReady ? "Sẵn sàng offline" : "Đang chuẩn bị cache"}
          </span>
        </span>
        <button
          className="save-state hud-button"
          onClick={() => void save()}
          title={saveStatus}
          aria-label="Lưu tiến trình"
        >
          <ShieldCheck size={18} />
          <span className="sr-only">{saveStatus}</span>
        </button>
        <button
          className="hud-button"
          aria-label="Thu phóng bản đồ nhỏ"
          aria-expanded={miniExpanded}
          onClick={() => setMiniExpanded(!miniExpanded)}
        >
          <Map size={18} />
        </button>
        <button
          className="hud-button"
          aria-label="Thiết lập"
          onClick={() => togglePanel("settings")}
        >
          <Settings size={18} />
        </button>
        <button
          className="hud-button"
          aria-label="Mở menu"
          aria-expanded={mobileMenu}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <Menu size={20} />
        </button>
      </nav>
      {saveNotice && (
        <div className="save-notice" role="status">
          <ShieldCheck size={12} />
          {saveStatus}
        </div>
      )}
      <section className="player-hud" aria-label="Trạng thái nhân vật">
        <button className="avatar" onClick={() => togglePanel("character")}>
          <img src="/assets/portrait.svg" alt={s.name} />
          <span>{s.level}</span>
        </button>
        <div className="vitals">
          <div className="player-name">
            <strong>{s.name}</strong>
            <button onClick={() => togglePanel("characters")}>
              {school.name} <ChevronDown size={10} />
            </button>
          </div>
          <div className="vital-bar health">
            <i style={{ width: `${hpPercent}%` }} />
            <span>Sinh lực</span>
            <b>
              {Math.ceil(player.hp)} / {player.maxHp}
            </b>
          </div>
          <div className="vital-bar mana">
            <i style={{ width: `${mpPercent}%` }} />
            <span>Nội lực</span>
            <b>
              {Math.ceil(player.mp)} / {player.maxMp}
            </b>
          </div>
          <div className="xp-mini">
            <i
              style={{
                width: `${(s.experience / experienceForLevel(s.level)) * 100}%`,
              }}
            />
          </div>
          <div className="player-sub">
            <span>☯ {school.name}</span>
            <span>
              Ngũ hành ·{" "}
              {
                {
                  earth: "Thổ",
                  water: "Thủy",
                  metal: "Kim",
                  fire: "Hỏa",
                  wood: "Mộc",
                }[player.element]
              }
            </span>
          </div>
        </div>
      </section>
      <div className="location-heading">
        <span className="location-line" />
        <div>
          <small>
            {s.mapId === "village"
              ? "TÂN THỦ · CẤP 1–3"
              : s.mapId === "forest"
                ? "RỪNG TRÚC · CẤP 2–5"
                : "CẤM ĐỊA · CẤP 4+"}
          </small>
          <h1>{area?.name ?? map.name}</h1>
          <p>{map.subtitle}</p>
        </div>
        <span className="location-line" />
      </div>
      <aside className={`right-sidebar ${miniExpanded ? "map-expanded" : ""}`}>
        <section className="minimap-panel">
          <div className="minimap-header">
            <span>
              <Compass size={14} />
              {map.name}
            </span>
            <button
              aria-label="Mở bản đồ thế giới"
              onClick={() => togglePanel("map")}
            >
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="minimap"
            onClick={() => togglePanel("map")}
            aria-label="Bản đồ nhỏ, mở bản đồ thế giới"
          >
            <MiniMap snapshot={s} />
            <span className="north">N</span>
            <span className="map-zoom">+</span>
          </button>
          <div className="minimap-footer">
            <span>
              <MapPinIcon />
              {Math.floor(player.x)}, {Math.floor(player.y)}
            </span>
            <span>
              Giờ {worldTime(s.worldClock.timeTicks).period}{" "}
              <span className="sun">☀</span>
            </span>
          </div>
        </section>
        <section
          className={`quest-tracker ${questCollapsed ? "collapsed" : ""}`}
        >
          <button
            className="tracker-heading"
            onClick={() => setQuestCollapsed(!questCollapsed)}
          >
            <span>
              <ScrollText size={15} /> Hành trình giang hồ
            </span>
            <ChevronDown size={14} />
          </button>
          {!questCollapsed && (
            <>
              <div className="quest-chapter">
                <span>CHÍNH TUYẾN</span>
                <span>
                  CHƯƠNG{" "}
                  {quest.id === "bandits"
                    ? "I"
                    : quest.id === "wolves"
                      ? "II"
                      : "III"}
                </span>
              </div>
              <h3>
                <i /> {allQuestsDone ? "Giang hồ thái bình" : quest.name}
              </h3>
              <p>
                {allQuestsDone
                  ? "Ba chương đã khép lại. Hãy tiếp tục khám phá và rèn luyện võ học."
                  : activeQuest
                    ? activeQuest.status === "ready"
                      ? "Trở về gặp Lão trưởng thôn để nhận thưởng."
                      : quest.description
                    : "Gặp Lão trưởng thôn để nhận nhiệm vụ đầu tiên."}
              </p>
              <button
                className="quest-objective"
                onClick={() => {
                  if (allQuestsDone) togglePanel("character");
                  else {
                    const command = questNavigation(s, quest, activeQuest);
                    if (command) send(command);
                    else togglePanel("quests");
                  }
                }}
              >
                <span className="objective-diamond">◇</span>
                <span>
                  {allQuestsDone
                    ? "Tiếp tục luyện võ"
                    : activeQuest
                      ? activeQuest.status === "ready"
                        ? "Trở về báo tin"
                        : questObjectiveLabel(quest)
                      : "Nói chuyện với trưởng thôn"}
                </span>
                <b>
                  {activeQuest && activeQuest.status !== "ready" ? (
                    `${activeQuest.progress}/${quest.count}`
                  ) : (
                    <ChevronRight size={12} />
                  )}
                </b>
              </button>
              <div className="quest-tracker-bottom">
                <span>
                  {allQuestsDone ? (
                    <>
                      <ShieldCheck size={12} /> Hoàn thành 3 chương
                    </>
                  ) : (
                    <>
                      <Coins size={12} /> {quest.gold} bạc
                    </>
                  )}
                </span>
                <button onClick={() => togglePanel("quests")}>
                  Chi tiết <ArrowUpRight size={12} />
                </button>
              </div>
            </>
          )}
        </section>
        <div className="side-actions">
          <button title="Cẩm nang" onClick={() => togglePanel("guide")}>
            <BookOpen size={19} />
            <span>Cẩm nang</span>
          </button>
          <button
            title="Tìm đường đến trưởng thôn"
            onClick={() => send({ type: "interact", targetId: "elder" })}
          >
            <LocateFixed size={19} />
            <span>Tìm đường</span>
          </button>
          <button
            className={player.autoAttack ? "active" : ""}
            onClick={() =>
              send({ type: "autoAttack", enabled: !player.autoAttack })
            }
          >
            <Swords size={19} />
            <span>{player.autoAttack ? "Đang tự đánh" : "Tự chiến"}</span>
          </button>
        </div>
      </aside>
      {!s.quests.length && (
        <div className="welcome-hint">
          <span className="hint-symbol">✧</span>
          <div>
            <small>SƠ NHẬP GIANG HỒ</small>
            <p>Hữu duyên tương ngộ, thiếu hiệp.</p>
            <button
              onClick={() => send({ type: "interact", targetId: "elder" })}
            >
              Đến gặp Lão trưởng thôn <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            className="hint-close"
            aria-label="Đóng hướng dẫn"
            onClick={(e) =>
              e.currentTarget.parentElement?.classList.add("dismissed")
            }
          >
            <X size={12} />
          </button>
        </div>
      )}
      <section className="event-console">
        <div className="console-tabs">
          {[
            ["all", "Tổng hợp"],
            ["loot", "Vật phẩm"],
            ["message", "Hệ thống"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setLogTab(id)}
              className={logTab === id ? "active" : ""}
            >
              {label}
            </button>
          ))}
          <MessageSquare size={12} />
        </div>
        <div className="console-messages" ref={logList}>
          {logs
            .filter(
              (l) =>
                logTab === "all" ||
                l.type === logTab ||
                (logTab === "message" && l.type === "system"),
            )
            .map((l) => (
              <p key={l.id} className={`log-${l.type}`}>
                <span>
                  [
                  {l.type === "loot"
                    ? "Thu hoạch"
                    : l.type === "guide"
                      ? "Chỉ dẫn"
                      : l.type === "error"
                        ? "Lưu ý"
                        : "Hệ thống"}
                  ]
                </span>{" "}
                {l.text}
              </p>
            ))}
        </div>
        <form
          className="note-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) {
              setLogs((l) => [
                ...l,
                {
                  id: Date.now(),
                  type: "guide",
                  text: `Ghi chú: ${note.trim()}`,
                },
              ]);
              setNote("");
            }
          }}
        >
          <span>Ghi chép</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú trong phiên này…"
            aria-label="Ghi chép hành trình"
            maxLength={180}
          />
          <button type="submit" aria-label="Thêm ghi chép">
            <Send size={12} />
          </button>
        </form>
      </section>
      <div className="mobile-controls">
        <Joystick snapshot={s} send={send} />
        <div className="mobile-skills">
          {hotbarSkills.map((d, i) => (
            <button
              key={d.id}
              style={
                {
                  "--cooldown": `${Math.max(0, Math.min(1, ((player.cooldowns[d.id] ?? 0) - s.tick) / d.cooldownTicks)) * 100}%`,
                } as React.CSSProperties
              }
              aria-label={d.name}
              disabled={
                !(s.skillLevels[d.id] > 0) || player.hp <= 0 || s.paused
              }
              title={
                s.skillLevels[d.id] > 0
                  ? d.name
                  : `Cần học kỹ năng, yêu cầu cấp ${d.requiredLevel}`
              }
              onPointerDown={(e) => {
                e.preventDefault();
                send({ type: "skill", skillId: d.id });
              }}
              onClick={(e) => {
                if (e.detail === 0) send({ type: "skill", skillId: d.id });
              }}
            >
              <ArtIcon name={d.icon} />
              <small>
                {Math.max(
                  0,
                  Math.ceil(((player.cooldowns[d.id] ?? 0) - s.tick) / 20),
                ) || i + 2}
              </small>
            </button>
          ))}
          <button
            className="mobile-attack"
            aria-label="Đánh thường"
            onPointerDown={(e) => {
              e.preventDefault();
              attackNearest();
            }}
            onClick={(e) => {
              if (e.detail === 0) attackNearest();
            }}
          >
            <ArtIcon name="sword" />
          </button>
        </div>
        <button
          className="mobile-potion"
          aria-label="Dùng thuốc hồi máu"
          onClick={() => potion("hp")}
        >
          <ArtIcon name="potion-red" />
        </button>
      </div>
      <div className="mobile-extra-controls">
        <button
          aria-label="Dùng thuốc hồi nội lực"
          onClick={() => potion("mp")}
        >
          <ArtIcon name="potion-blue" />
        </button>
        <button
          className={player.autoAttack ? "active" : ""}
          aria-label="Tự chiến"
          onClick={() =>
            send({ type: "autoAttack", enabled: !player.autoAttack })
          }
        >
          AUTO
        </button>
        <button
          aria-label="Khóa mục tiêu"
          onClick={() => {
            const candidates = Object.values(s.entities)
              .filter(
                (e) => e.kind === "monster" && e.mapId === s.mapId && e.hp > 0,
              )
              .sort((a, b) => distance(player, a) - distance(player, b));
            const index = candidates.findIndex((e) => e.id === player.targetId);
            send({
              type: "selectTarget",
              targetId: candidates[(index + 1) % candidates.length]?.id ?? null,
            });
          }}
        >
          <LocateFixed size={19} />
        </button>
      </div>
      <div className="bottom-dock">
        <div className="hotbar-wrap">
          <div className="hotbar-caption">
            <span>KIẾM TẠI TÂM</span>
            <span className="hotbar-decoration">◆</span>
            <span>ĐẠO TẠI HÀNH</span>
          </div>
          <div className="hotbar">
            <button
              className={`hotbar-slot basic ${player.autoAttack ? "active" : ""}`}
              title="Đánh thường · Space"
              aria-label="Đánh thường"
              onClick={attackNearest}
            >
              <ArtIcon name="sword" />
              <kbd>␣</kbd>
            </button>
            <span className="hotbar-separator" />
            {hotbarSkills.map((d, i) => {
              const cooldown = Math.max(
                  0,
                  ((player.cooldowns[d.id] ?? 0) - s.tick) / 20,
                ),
                locked = !(s.skillLevels[d.id] > 0);
              return (
                <button
                  className={`hotbar-slot ${locked ? "locked" : ""}`}
                  key={d.id}
                  title={`${d.name} · Phím ${i + 2} · ${d.manaCost} nội lực`}
                  aria-label={d.name}
                  onClick={() => send({ type: "skill", skillId: d.id })}
                >
                  <ArtIcon name={d.icon} />
                  <kbd>{i + 2}</kbd>
                  {cooldown > 0 && (
                    <span className="cooldown-overlay">
                      {Math.ceil(cooldown)}
                    </span>
                  )}
                  {locked && (
                    <span className="skill-lock">Cấp {d.requiredLevel}</span>
                  )}
                </button>
              );
            })}
            <span className="hotbar-separator" />
            {[
              ["hp", "potion-red", "Q"],
              ["mp", "potion-blue", "E"],
            ].map(([id, icon, key]) => (
              <button
                className="hotbar-slot potion-slot"
                key={id}
                title={id === "hp" ? "Tiểu Hoàn Đan · Q" : "Tụ Khí Đan · E"}
                aria-label={
                  id === "hp" ? "Dùng thuốc hồi máu" : "Dùng thuốc hồi nội lực"
                }
                onClick={() => potion(id)}
              >
                <ArtIcon name={icon} />
                <kbd>{key}</kbd>
                <b>
                  {s.inventory
                    .filter((i) => i.definitionId === id)
                    .reduce((n, i) => n + i.quantity, 0)}
                </b>
              </button>
            ))}
          </div>
          <div className="hotbar-under">
            <span>
              <span className="tiny-dot" />{" "}
              {player.autoAttack
                ? "Tự động chiến đấu"
                : "Chuột trái di chuyển · Space tấn công"}
            </span>
            <button onClick={() => togglePanel("skills")}>
              Võ học <ChevronRight size={10} />
            </button>
          </div>
        </div>
        <div
          className="experience-track"
          title={`Kinh nghiệm: ${s.experience}/${experienceForLevel(s.level)}`}
        >
          <i
            style={{
              width: `${(s.experience / experienceForLevel(s.level)) * 100}%`,
            }}
          />
          <span>
            Cấp {s.level} <b>·</b> {s.experience} /{" "}
            {experienceForLevel(s.level)} EXP
          </span>
        </div>
      </div>
      <div className="game-build">
        BẢN OFFLINE <span>·</span> v0.5.0
      </div>
      {mobileMenu && (
        <nav className="mobile-menu" aria-label="Chức năng giang hồ">
          <div className="hud-menu-heading">
            <strong>Giang Hồ Ký</strong>
            <span>
              <Coins size={14} />
              {s.gold.toLocaleString("vi-VN")} bạc
            </span>
          </div>
          {updateAvailable && (
            <button
              className="update-button"
              onClick={() =>
                void save().then((saved) =>
                  saved ? updateServiceWorker.current?.(true) : undefined,
                )
              }
            >
              Cập nhật game
            </button>
          )}
          <button
            onClick={() =>
              send({ type: "settings", settings: { sound: !s.settings.sound } })
            }
          >
            {s.settings.sound ? <Volume2 size={20} /> : <VolumeX size={20} />}{" "}
            {s.settings.sound ? "Tắt âm thanh" : "Bật âm thanh"}
          </button>
          {[
            ...navigation,
            ["settings", "Thiết lập", Settings, ""],
            ["characters", "Nhân vật khác", UserRound, ""],
            ["guide", "Cẩm nang", BookOpen, ""],
            ["workshop", "Công xưởng", Swords, ""],
            ["warehouse", "Kho đồ", Backpack, ""],
            ["activities", "Nghề nghiệp", Leaf, ""],
          ].map(([name, label, Icon]) => {
            const C = Icon as typeof UserRound;
            return (
              <button
                key={String(name)}
                onClick={() => togglePanel(name as PanelName)}
              >
                <C size={20} />
                {String(label)}
              </button>
            );
          })}
        </nav>
      )}
      {panel && (
        <Panels
          key={panel + npcId}
          panel={panel}
          open={setPanel}
          diagnostics={diagnostics}
          simulationDiagnostics={simulationDiagnostics}
          snapshot={s}
          send={send}
          close={() => setPanel(null)}
          npcId={npcId}
          notify={notify}
          records={records}
          onExport={exportSave}
          onImport={() => importInput.current?.click()}
          onSave={() => void save()}
          onCreate={(n, c, a) => void createCharacter(n, c, a)}
          onSelect={(id) => void selectCharacter(id)}
          onDelete={(id) => void deleteCharacter(id)}
        />
      )}
      {s.paused && (
        <div className="pause-banner">
          <span>Thế giới đang tạm dừng</span>
          <button onClick={() => send({ type: "pause", paused: false })}>
            Tiếp tục hành trình
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Leaf size={16} />
          {toast}
        </div>
      )}
      {player.hp <= 0 && (
        <div className="death-overlay">
          <h2>Thắng bại là chuyện thường tình</h2>
          <p>Tĩnh tâm dưỡng sức, ngày sau tái ngộ.</p>
          <button
            className="gold-button"
            onClick={() => send({ type: "respawn" })}
          >
            Hồi sinh tại thôn
          </button>
          <small>
            Tự hồi sinh sau{" "}
            {Math.max(0, Math.ceil((player.respawnAt - s.tick) / 20))} giây
          </small>
        </div>
      )}
      {pendingImport && (
        <div className="modal-backdrop import-confirm">
          <section className="game-panel">
            <header className="panel-heading">
              <h2>Nhập tiến trình</h2>
              <button
                className="close-button"
                aria-label="Hủy nhập"
                onClick={() => setPendingImport(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="panel-body">
              <p>
                Nhập nhân vật <strong>{pendingImport.name}</strong>, cấp{" "}
                {pendingImport.level}, tại {getMap(pendingImport.mapId).name}?
              </p>
              <p className="hint">
                Nếu trùng nhân vật, tiến trình hiện tại sẽ được thay thế. Bản
                trước được sao lưu trong IndexedDB.
              </p>
              <button
                className="gold-button"
                onClick={() => void confirmImport()}
              >
                <Upload size={14} /> Xác nhận nhập
              </button>
              <button
                className="text-button"
                onClick={() => setPendingImport(null)}
              >
                Hủy
              </button>
            </div>
          </section>
        </div>
      )}
      <input
        hidden
        ref={importInput}
        type="file"
        accept=".json,application/json"
        onChange={(e) => void readImport(e.target.files?.[0])}
      />
    </main>
  );
}
function GroundLootNotices({
  snapshot: s,
  send,
}: {
  snapshot: GameSnapshot;
  send: (command: GameCommand) => void;
}) {
  const window = useRef(new LootNoticeWindow());
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refresh((v) => v + 1), 250);
    return () => clearInterval(timer);
  }, []);
  const player = s.entities[s.playerId];
  const nearby = Object.values(s.groundLoot)
    .filter(
      (l) =>
        l.ownerId === s.playerId &&
        l.mapId === s.mapId &&
        distance(player, l) <= 5,
    )
    .sort(
      (a, b) =>
        Number(b.gold > 0) - Number(a.gold > 0) ||
        distance(player, a) - distance(player, b),
    );
  const visible = window.current.select(nearby, performance.now());
  return (
    <aside className="ground-loot-list" aria-label="Vật phẩm gần bạn">
      {visible.map((loot) => (
        <GroundLootShortcut key={loot.id} loot={loot} send={send} />
      ))}
    </aside>
  );
}
function GroundLootShortcut({
  loot,
  send,
}: {
  loot: GroundLoot;
  send: (command: GameCommand) => void;
}) {
  const item = loot.item ? getItem(loot.item.definitionId) : null;
  return (
    <button
      className={item?.rarity ?? "gold"}
      onClick={() => send({ type: "pickup", lootId: loot.id })}
    >
      {item ? <ArtIcon name={item.icon} /> : <Coins size={18} />}
      <span>Nhặt {item?.name ?? `${loot.gold} bạc`}</span>
    </button>
  );
}
function OrientationGuard({
  enterLandscape,
}: {
  enterLandscape: () => Promise<void>;
}) {
  return (
    <div
      className="orientation-guard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orientation-title"
    >
      <div className="orientation-illustration" aria-hidden="true">
        <Smartphone size={64} />
        <RotateCw size={26} />
      </div>
      <h1 id="orientation-title">Xoay ngang điện thoại</h1>
      <p>Giang Hồ Ký chỉ chơi ở màn hình ngang. Hành trình đang tạm dừng.</p>
      <button className="gold-button" onClick={() => void enterLandscape()}>
        Chuyển sang màn hình ngang
      </button>
    </div>
  );
}
function MapPinIcon() {
  return <span className="coordinate-icon">⌖</span>;
}
function MiniMap({ snapshot: s }: { snapshot: GameSnapshot }) {
  const map = getMap(s.mapId);
  const point = (x: number, y: number) => ({
    x: 112 + (x / map.width - y / map.height) * 105,
    y: 7 + (x / map.width + y / map.height) * 54,
  });
  const waterPath = useMemo(
    () =>
      (map.water ?? [])
        .map((tile) => {
          const points = [
            [tile.x - 0.5, tile.y - 0.5],
            [tile.x + 0.5, tile.y - 0.5],
            [tile.x + 0.5, tile.y + 0.5],
            [tile.x - 0.5, tile.y + 0.5],
          ].map(
            ([x, y]) =>
              `${(112 + (x / map.width - y / map.height) * 105).toFixed(1)},${(7 + (x / map.width + y / map.height) * 54).toFixed(1)}`,
          );
          return `M${points.join("L")}Z`;
        })
        .join(""),
    [map],
  );
  return (
    <svg viewBox="0 0 224 124" aria-hidden="true">
      <defs>
        <radialGradient id="mapgreen">
          <stop stopColor="#6e8051" />
          <stop offset="1" stopColor="#2f4b39" />
        </radialGradient>
      </defs>
      <rect width="224" height="124" fill="#1b322b" />
      <path d="M112 5 218 60 112 117 6 60Z" fill="url(#mapgreen)" />
      {waterPath && <path d={waterPath} fill="#5a929b" />}
      {!map.paths && (
        <path
          d="M112 9v105M20 61h184"
          stroke="#b0a77b"
          strokeWidth="7"
          opacity=".45"
        />
      )}
      {map.props
        .filter(
          (p, i) =>
            p.type === "house" ||
            i % Math.max(1, Math.ceil(map.props.length / 65)) === 0,
        )
        .map((p, i) => {
          const a = point(p.x, p.y);
          return p.type === "house" ? (
            <path
              key={i}
              d={`M${a.x - 10} ${a.y}l10-9 12 7-11 9Z`}
              fill="#b3a481"
              stroke="#41504a"
              strokeWidth="2"
            />
          ) : (
            <circle
              key={i}
              cx={a.x}
              cy={a.y}
              r={p.type === "lantern" ? 1 : 5}
              fill={p.type === "cherry" ? "#b78584" : "#8c9a61"}
              opacity=".85"
            />
          );
        })}
      {map.paths?.map((road, i) => (
        <polyline
          key={"road" + i}
          points={road
            .map((p) => {
              const a = point(p.x, p.y);
              return `${a.x},${a.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="#bba979"
          strokeWidth="2"
          opacity=".7"
        />
      ))}
      {map.areas?.map((a) => {
        const p = point(a.x, a.y);
        return (
          <circle
            key={a.id}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill={
              a.kind === "safe"
                ? "#9ac3a5"
                : a.kind === "boss"
                  ? "#d48b69"
                  : "#d3be82"
            }
          />
        );
      })}
      {map.portals.map((p) => {
        const a = point(p.x, p.y);
        return <circle key={p.id} cx={a.x} cy={a.y} r="3" fill="#b2d4cd" />;
      })}
      {Object.values(s.entities)
        .filter((e) => e.mapId === s.mapId && e.hp > 0)
        .map((e) => {
          const p = point(e.x, e.y);
          return e.kind === "player" ? (
            <g key={e.id}>
              <circle cx={p.x} cy={p.y} r="6" fill="#eed49c" opacity=".2" />
              <path
                d={`M${p.x} ${p.y - 5}l4 8-4-2-4 2Z`}
                fill="#f0d397"
                stroke="#fff0c5"
                strokeWidth=".7"
              />
            </g>
          ) : (
            <circle key={e.id} cx={p.x} cy={p.y} r="1.8" fill="#e4a17a" />
          );
        })}
    </svg>
  );
}
function Joystick({
  snapshot,
  send,
}: {
  snapshot: GameSnapshot;
  send: (c: GameCommand) => void;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null),
    [floating, setFloating] = useState<{ x: number; y: number } | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null),
    position = useRef(snapshot.entities[snapshot.playerId]);
  position.current = snapshot.entities[snapshot.playerId];
  const vector = useRef({ x: 0, y: 0 }),
    interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const travel = useRef(36);
  const stop = () => {
    pointer.current = null;
    setFloating(null);
    touch.current = null;
    setOffset({ x: 0, y: 0 });
    vector.current = { x: 0, y: 0 };
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    send({ type: "stop" });
  };
  useEffect(
    () => () => {
      if (interval.current) clearInterval(interval.current);
    },
    [],
  );
  function move() {
    const v = vector.current,
      p = position.current,
      wx = v.x / 2 + v.y,
      wy = v.y - v.x / 2,
      len = Math.hypot(wx, wy);
    if (p.hp <= 0) return;
    const active = Math.hypot(v.x, v.y) > travel.current * 0.18;
    send({
      type: "steer",
      direction: active ? { x: wx / len, y: wy / len } : { x: 0, y: 0 },
    });
  }
  function updateVector(dx: number, dy: number) {
    const len = Math.max(1, Math.hypot(dx, dy) / travel.current);
    setOffset({ x: dx / len, y: dy / len });
    vector.current = { x: dx, y: dy };
  }
  return (
    <div
      className={`joystick ${getPreferences().joystick === "floating" ? "floating-joystick" : ""}`}
      style={
        floating
          ? { left: floating.x, top: floating.y, bottom: "auto" }
          : undefined
      }
      aria-label="Cần điều khiển di chuyển"
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        travel.current = rect.width * 0.3;
        if (getPreferences().joystick === "floating")
          setFloating({
            x: e.clientX - rect.width / 2,
            y: e.clientY - rect.height / 2,
          });
        touch.current = {
          x:
            getPreferences().joystick === "floating"
              ? e.clientX
              : rect.left + rect.width / 2,
          y:
            getPreferences().joystick === "floating"
              ? e.clientY
              : rect.top + rect.height / 2,
        };
        const dx = e.clientX - touch.current.x,
          dy = e.clientY - touch.current.y;
        updateVector(dx, dy);
        move();
        interval.current = setInterval(move, 80);
      }}
      onPointerMove={(e) => {
        if (!touch.current || pointer.current !== e.pointerId) return;
        const dx = e.clientX - touch.current.x,
          dy = e.clientY - touch.current.y;
        updateVector(dx, dy);
      }}
      onPointerUp={(e) => {
        if (pointer.current === e.pointerId) stop();
      }}
      onPointerCancel={(e) => {
        if (pointer.current === e.pointerId) stop();
      }}
      onLostPointerCapture={(e) => {
        if (pointer.current === e.pointerId) stop();
      }}
    >
      <div className="joystick-cross" />
      <div
        className="joystick-knob"
        style={{ transform: `translate(${offset.x}px,${offset.y}px)` }}
      />
    </div>
  );
}
