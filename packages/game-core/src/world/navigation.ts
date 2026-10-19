import type { Vec2 } from "../../../game-protocol/src/index";
import type { MapDefinition } from "../../../game-content/src/index";
export const worldToScreen = ({ x, y }: Vec2): Vec2 => ({
  x: (x - y) * 48,
  y: (x + y) * 24,
});
export const screenToWorld = ({ x, y }: Vec2): Vec2 => ({
  x: x / 96 + y / 48,
  y: y / 48 - x / 96,
});
export const getTileAt = (p: Vec2): Vec2 => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const NAV_CHUNK_SIZE = 16;
const CACHE_LIMIT = 64;
class Heap<T extends { f: number; order: number }> {
  private data: T[] = [];
  get length() {
    return this.data.length;
  }
  private less(a: T, b: T) {
    return a.f < b.f || (a.f === b.f && a.order < b.order);
  }
  push(n: T) {
    const h = this.data;
    h.push(n);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(h[i], h[p])) break;
      [h[i], h[p]] = [h[p], h[i]];
      i = p;
    }
  }
  pop(): T {
    const h = this.data,
      head = h[0],
      last = h.pop()!;
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        let small = i;
        for (const c of [i * 2 + 1, i * 2 + 2])
          if (c < h.length && this.less(h[c], h[small])) small = c;
        if (small === i) break;
        [h[i], h[small]] = [h[small], h[i]];
        i = small;
      }
    }
    return head;
  }
}
interface NavIndex {
  source: MapDefinition["blocked"];
  size: number;
  width: number;
  height: number;
  cells: Uint8Array;
  columns: number;
  rows: number;
  edges: Map<number, Set<number>>;
  components: Int32Array;
  componentChunks: number[];
  portals: Map<string, { from: Vec2; to: Vec2 }[]>;
  routes: Map<string, Vec2[]>;
  queries: number;
  cacheHits: number;
  visited: number;
  chunkVisited: number;
  failures: number;
  lastVisited: number;
}
const indices = new WeakMap<MapDefinition, NavIndex>();
const revisions = new WeakMap<MapDefinition, number>();
/** Call after editing a collision array in place. Runtime editors should use setNavigationObstacle. */
export function invalidateNavigation(map: MapDefinition) {
  indices.delete(map);
  revisions.set(map, (revisions.get(map) ?? 0) + 1);
}
export function setNavigationObstacle(
  map: MapDefinition,
  point: Vec2,
  blocked: boolean,
) {
  const p = getTileAt(point);
  map.blocked = map.blocked.filter((b) => b.x !== p.x || b.y !== p.y);
  if (blocked) map.blocked.push(p);
  invalidateNavigation(map);
}
function indexFor(map: MapDefinition): NavIndex {
  const old = indices.get(map);
  if (
    old &&
    old.source === map.blocked &&
    old.size === map.blocked.length &&
    old.width === map.width &&
    old.height === map.height
  )
    return old;
  const cells = new Uint8Array(map.width * map.height);
  for (const p of map.blocked)
    if (p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height)
      cells[p.y * map.width + p.x] = 1;
  const n: NavIndex = {
    source: map.blocked,
    size: map.blocked.length,
    width: map.width,
    height: map.height,
    cells,
    columns: Math.ceil(map.width / NAV_CHUNK_SIZE),
    rows: Math.ceil(map.height / NAV_CHUNK_SIZE),
    edges: new Map(),
    components: new Int32Array(map.width * map.height).fill(-1),
    componentChunks: [],
    portals: new Map(),
    routes: new Map(),
    queries: 0,
    cacheHits: 0,
    visited: 0,
    chunkVisited: 0,
    failures: 0,
    lastVisited: 0,
  };
  const open = (x: number, y: number) =>
    x >= 1 &&
    y >= 1 &&
    x < map.width - 1 &&
    y < map.height - 1 &&
    !cells[y * map.width + x];
  // Split every chunk into connected walkable components, including islands cut by rivers/walls.
  for (let cy = 0; cy < n.rows; cy++)
    for (let cx = 0; cx < n.columns; cx++) {
      const minX = Math.max(1, cx * NAV_CHUNK_SIZE),
        minY = Math.max(1, cy * NAV_CHUNK_SIZE);
      const maxX = Math.min(map.width - 1, (cx + 1) * NAV_CHUNK_SIZE),
        maxY = Math.min(map.height - 1, (cy + 1) * NAV_CHUNK_SIZE);
      for (let y = minY; y < maxY; y++)
        for (let x = minX; x < maxX; x++) {
          if (!open(x, y) || n.components[y * map.width + x] >= 0) continue;
          const id = n.componentChunks.length;
          n.componentChunks.push(cy * n.columns + cx);
          const queue = [y * map.width + x];
          n.components[queue[0]] = id;
          for (let at = 0; at < queue.length; at++) {
            const cell = queue[at],
              px = cell % map.width,
              py = Math.floor(cell / map.width);
            for (const [dx, dy] of [
              [0, 1],
              [1, 0],
              [0, -1],
              [-1, 0],
            ]) {
              const nx = px + dx,
                ny = py + dy,
                key = ny * map.width + nx;
              if (
                nx < minX ||
                nx >= maxX ||
                ny < minY ||
                ny >= maxY ||
                !open(nx, ny) ||
                n.components[key] >= 0
              )
                continue;
              n.components[key] = id;
              queue.push(key);
            }
          }
        }
    }
  const join = (from: Vec2, to: Vec2) => {
    const a = n.components[from.y * map.width + from.x],
      b = n.components[to.y * map.width + to.x];
    if (a < 0 || b < 0) return;
    for (const [id, next, pair] of [
      [a, b, { from, to }],
      [b, a, { from: to, to: from }],
    ] as const) {
      if (!n.edges.has(id)) n.edges.set(id, new Set());
      n.edges.get(id)!.add(next);
      const key = `${id}:${next}`,
        portals = n.portals.get(key) ?? [];
      portals.push(pair);
      n.portals.set(key, portals);
    }
  };
  for (let cx = 1; cx < n.columns; cx++) {
    const x = cx * NAV_CHUNK_SIZE;
    for (let y = 1; y < map.height - 1; y++)
      if (open(x - 1, y) && open(x, y)) join({ x: x - 1, y }, { x, y });
  }
  for (let cy = 1; cy < n.rows; cy++) {
    const y = cy * NAV_CHUNK_SIZE;
    for (let x = 1; x < map.width - 1; x++)
      if (open(x, y - 1) && open(x, y)) join({ x, y: y - 1 }, { x, y });
  }
  indices.set(map, n);
  return n;
}
export function isWalkable(map: MapDefinition, p: Vec2): boolean {
  const t = getTileAt(p);
  return (
    t.x >= 1 &&
    t.y >= 1 &&
    t.x < map.width - 1 &&
    t.y < map.height - 1 &&
    !indexFor(map).cells[t.y * map.width + t.x]
  );
}
export function navigationDiagnostics(map: MapDefinition) {
  const n = indexFor(map);
  return {
    revision: revisions.get(map) ?? 0,
    chunks: n.columns * n.rows,
    indexBytes: n.cells.byteLength + n.components.byteLength,
    components: n.componentChunks.length,
    cachedRoutes: n.routes.size,
    queries: n.queries,
    cacheHits: n.cacheHits,
    visited: n.visited,
    chunkVisited: n.chunkVisited,
    lastVisited: n.lastVisited,
    failures: n.failures,
  };
}
export function findPath(
  map: MapDefinition,
  start: Vec2,
  end: Vec2,
  maxVisited = 16384,
): Vec2[] {
  const goal = getTileAt(end),
    origin = getTileAt(start),
    n = indexFor(map);
  n.queries++;
  n.lastVisited = 0;
  if (!isWalkable(map, goal) || !isWalkable(map, origin) || maxVisited < 1) {
    n.failures++;
    return [];
  }
  const cacheKey = `${origin.x},${origin.y}:${goal.x},${goal.y}:${maxVisited}`;
  const cached = n.routes.get(cacheKey);
  if (cached) {
    n.cacheHits++;
    n.routes.delete(cacheKey);
    n.routes.set(cacheKey, cached);
    return cached.map((p) => ({ ...p }));
  }
  let remaining = Math.floor(maxVisited);
  const cellKey = (p: Vec2) => p.y * map.width + p.x;
  let coarseRoute: number[] | undefined;
  if (distance(origin, goal) > NAV_CHUNK_SIZE * 2) {
    const from = n.components[cellKey(origin)],
      to = n.components[cellKey(goal)];
    type Coarse = {
      id: number;
      g: number;
      f: number;
      order: number;
      parent: Coarse | null;
    };
    const heap = new Heap<Coarse>(),
      closed = new Set<number>();
    const destinationChunk = n.componentChunks[to];
    const heuristic = (component: number) => {
      const chunk = n.componentChunks[component];
      return (
        Math.abs((chunk % n.columns) - (destinationChunk % n.columns)) +
        Math.abs(
          Math.floor(chunk / n.columns) -
            Math.floor(destinationChunk / n.columns),
        )
      );
    };
    let order = 0;
    heap.push({
      id: from,
      g: 0,
      f: heuristic(from),
      order: order++,
      parent: null,
    });
    const scores = new Map([[from, 0]]);
    while (heap.length && remaining > 0) {
      const c = heap.pop();
      if (closed.has(c.id)) continue;
      closed.add(c.id);
      remaining--;
      n.chunkVisited++;
      n.lastVisited++;
      if (c.id === to) {
        coarseRoute = [];
        for (let node: Coarse | null = c; node; node = node.parent)
          coarseRoute.push(node.id);
        coarseRoute.reverse();
        break;
      }
      for (const id of n.edges.get(c.id) ?? []) {
        const g = c.g + 1;
        if (g >= (scores.get(id) ?? Infinity)) continue;
        scores.set(id, g);
        heap.push({ id, g, f: g + heuristic(id), order: order++, parent: c });
      }
    }
    if (!coarseRoute) {
      n.failures++;
      return [];
    }
  }
  type Node = {
    p: Vec2;
    g: number;
    f: number;
    order: number;
    parent: Node | null;
  };
  const search = (
    from: Vec2,
    destination: Vec2,
    component?: number,
  ): Vec2[] => {
    const heap = new Heap<Node>(),
      scores = new Map<number, number>(),
      closed = new Set<number>();
    const key = (p: Vec2) => p.y * map.width + p.x;
    let order = 0;
    scores.set(key(from), 0);
    heap.push({
      p: from,
      g: 0,
      f: distance(from, destination),
      order: order++,
      parent: null,
    });
    while (heap.length && remaining > 0) {
      const node = heap.pop(),
        k = key(node.p);
      if (closed.has(k)) continue;
      closed.add(k);
      remaining--;
      n.visited++;
      n.lastVisited++;
      if (node.p.x === destination.x && node.p.y === destination.y) {
        const path: Vec2[] = [];
        for (let c: Node | null = node; c?.parent; c = c.parent) path.push(c.p);
        return path.reverse();
      }
      for (const [dx, dy] of [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const p = { x: node.p.x + dx, y: node.p.y + dy };
        if (
          (component !== undefined && n.components[cellKey(p)] !== component) ||
          !isWalkable(map, p) ||
          (dx &&
            dy &&
            (!isWalkable(map, { x: node.p.x + dx, y: node.p.y }) ||
              !isWalkable(map, { x: node.p.x, y: node.p.y + dy })))
        )
          continue;
        const g = node.g + Math.hypot(dx, dy),
          id = key(p);
        if (g >= (scores.get(id) ?? Infinity)) continue;
        scores.set(id, g);
        heap.push({
          p,
          g,
          f: g + distance(p, destination),
          order: order++,
          parent: node,
        });
      }
    }
    return [];
  };
  let result: Vec2[] = [];
  if (coarseRoute) {
    let current = origin,
      complete = true;
    for (let i = 1; i < coarseRoute.length; i++) {
      const gateways = n.portals.get(
        `${coarseRoute[i - 1]}:${coarseRoute[i]}`,
      )!;
      const pair = [...gateways].sort(
        (a, b) =>
          distance(current, a.from) +
          distance(a.to, goal) * 0.1 -
          distance(current, b.from) -
          distance(b.to, goal) * 0.1,
      )[0];
      const segment = search(current, pair.from, coarseRoute[i - 1]);
      if (!segment.length && distance(current, pair.from) > 0) {
        complete = false;
        break;
      }
      result.push(...segment, { ...pair.to });
      current = pair.to;
    }
    if (complete) {
      const segment = search(
        current,
        goal,
        coarseRoute[coarseRoute.length - 1],
      );
      if (segment.length || distance(current, goal) === 0)
        result.push(...segment);
      else complete = false;
    }
    if (!complete) result = remaining > 0 ? search(origin, goal) : [];
  } else result = search(origin, goal);
  if (result.length) {
    n.routes.set(
      cacheKey,
      result.map((p) => ({ ...p })),
    );
    if (n.routes.size > CACHE_LIMIT)
      n.routes.delete(n.routes.keys().next().value!);
  } else if (distance(origin, goal) > 0) n.failures++;
  return result;
}
export function hasLineOfSight(map: MapDefinition, a: Vec2, b: Vec2) {
  const steps = Math.ceil(distance(a, b) * 5);
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    if (
      !isWalkable(map, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
    )
      return false;
  }
  return true;
}
