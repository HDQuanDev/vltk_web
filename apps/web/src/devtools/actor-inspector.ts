import { actorSpriteManifest } from "@kiem-hiep/game-content";
import {
  actorSpriteFiles,
  actorSpriteHeight,
} from "../game/animations/actor-sprites";
const owners = Object.values(actorSpriteManifest.sets).flatMap((genders) =>
  Object.values(genders),
) as string[];
const select = document.getElementById("set") as HTMLSelectElement;
const grid = document.getElementById("grid") as HTMLElement;
const status = document.getElementById("status") as HTMLElement;
for (const owner of owners) {
  const option = document.createElement("option");
  option.value = owner;
  option.textContent = owner;
  select.append(option);
}
const requested = new URLSearchParams(location.search).get("set");
select.value = requested && owners.includes(requested) ? requested : owners[0];
select.addEventListener("change", () => render(select.value));
/**
 * Dựng lưới 13 state × 4 hướng từ chính URL runtime dùng, để mắt người đối
 * chiếu được với `preview-tong-hop.png` của từng bộ.
 */
function render(owner: string) {
  grid.replaceChildren();
  const files = actorSpriteFiles(owner);
  const url = (facing: string, state: string) =>
    files.find((f) => f.facing === facing && f.state === state)!.url;
  const columns = [
    { label: "down (xuống)", facing: "down", flip: false },
    { label: "right (phải)", facing: "right", flip: false },
    { label: "up (lên)", facing: "up", flip: false },
    { label: "left (phải lật)", facing: "right", flip: true },
  ];
  const total = actorSpriteManifest.states.length * columns.length;
  let ready = 0,
    missing = 0;
  const update = () => {
    status.textContent = `${owner} · ${ready}/${total} ảnh đã tải · thiếu ${missing} · khung hiển thị ${actorSpriteHeight}px`;
    status.dataset.ready = String(ready);
    status.dataset.missing = String(missing);
  };
  for (const state of actorSpriteManifest.states)
    for (const column of columns) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.alt = `${owner} ${state} ${column.label}`;
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
