import { monsterSpriteManifest, monsters } from "@kiem-hiep/game-content";
import {
  isBossMonster,
  monsterSpriteFiles,
  monsterSpriteHeight,
} from "../game/animations/monster-sprites";
const ids = monsterSpriteManifest.monsters as readonly string[];
const select = document.getElementById("monster") as HTMLSelectElement;
const grid = document.getElementById("grid") as HTMLElement;
const status = document.getElementById("status") as HTMLElement;
for (const id of ids) {
  const definition = monsters.find((m) => m.id === id);
  const option = document.createElement("option");
  option.value = id;
  option.textContent = `${definition?.name ?? id} (${id})`;
  select.append(option);
}
const requested = new URLSearchParams(location.search).get("monster");
select.value = requested && ids.includes(requested) ? requested : ids[0];
select.addEventListener("change", () => render(select.value));
/**
 * Dựng lưới 13 state × 4 hướng từ chính URL runtime dùng, để mắt người đối
 * chiếu được với `preview-tong-hop.png` của từng bộ.
 */
function render(id: string) {
  grid.replaceChildren();
  const files = monsterSpriteFiles(id);
  const url = (facing: string, state: string) =>
    files.find((f) => f.facing === facing && f.state === state)!.url;
  const columns = [
    { label: "down (xuống)", facing: "down", flip: false },
    { label: "right (phải)", facing: "right", flip: false },
    { label: "up (lên)", facing: "up", flip: false },
    { label: "left (phải lật)", facing: "right", flip: true },
  ];
  const total = monsterSpriteManifest.states.length * columns.length;
  let ready = 0,
    missing = 0;
  const update = () => {
    status.textContent = `${id} · ${ready}/${total} ảnh đã tải · thiếu ${missing} · khung hiển thị ${monsterSpriteHeight(id)}px${isBossMonster(id) ? " (boss ×1.5)" : ""}`;
    status.dataset.ready = String(ready);
    status.dataset.missing = String(missing);
  };
  for (const state of monsterSpriteManifest.states)
    for (const column of columns) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.alt = `${id} ${state} ${column.label}`;
      image.style.transform = column.flip ? "scaleX(-1)" : "";
      image.addEventListener("load", () => {
        ready++;
        update();
      });
      image.addEventListener("error", () => {
        missing++;
        figure.classList.add("missing");
        update();
      });
      image.src = url(column.facing, state);
      const caption = document.createElement("figcaption");
      caption.textContent = `${state} · ${column.label}`;
      figure.append(image, caption);
      grid.append(figure);
    }
  update();
}
render(select.value);
