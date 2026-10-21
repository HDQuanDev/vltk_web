/**
 * Lớp DOM phủ cho nhãn, thanh máu và hiệu ứng chữ bay của bộ hiển thị 3D.
 *
 * Các phần tử được tạo một lần và tái sử dụng (bể tối đa), ẩn khi không dùng.
 * Lớp không bắt chuột (`pointer-events: none`) nên không chặn tương tác.
 */
export class DomOverlay {
  readonly root: HTMLDivElement;

  constructor(parent: HTMLElement, className = "three-overlay") {
    this.root = document.createElement("div");
    this.root.className = className;
    this.root.style.position = "absolute";
    this.root.style.inset = "0";
    this.root.style.pointerEvents = "none";
    this.root.style.overflow = "hidden";
    parent.appendChild(this.root);
  }

  destroy() {
    this.root.remove();
  }
}

/** Một bộ nhãn dùng lại cho entity (tên, thanh máu, thanh niệm, chấm trạng thái). */
export interface EntityLabel {
  root: HTMLDivElement;
  name: HTMLDivElement;
  bar: HTMLDivElement;
  fill: HTMLDivElement;
  cast: HTMLDivElement;
  castFill: HTMLDivElement;
  dots: HTMLDivElement;
}

export function createEntityLabel(overlay: DomOverlay): EntityLabel {
  const root = document.createElement("div");
  root.style.position = "absolute";
  root.style.transform = "translate(-50%, -100%)";
  root.style.display = "none";
  root.style.whiteSpace = "nowrap";
  root.style.textAlign = "center";
  const name = document.createElement("div");
  name.style.fontFamily = "Arial, sans-serif";
  name.style.fontSize = "12px";
  name.style.stroke = "#233229";
  // `text-stroke` không phải chuẩn ở mọi trình duyệt; dùng text-shadow để
  // viền chữ dày tương đương `strokeThickness: 3` của bản 2D.
  name.style.textShadow =
    "-1px -1px 0 #233229, 1px -1px 0 #233229, -1px 1px 0 #233229, 1px 1px 0 #233229";
  const bar = document.createElement("div");
  bar.style.position = "relative";
  bar.style.width = "46px";
  bar.style.height = "4px";
  bar.style.margin = "1px auto 0";
  bar.style.background = "rgba(21,35,28,0.9)";
  bar.style.borderRadius = "1px";
  const fill = document.createElement("div");
  fill.style.position = "absolute";
  fill.style.left = "1px";
  fill.style.top = "1px";
  fill.style.height = "2px";
  fill.style.borderRadius = "1px";
  bar.appendChild(fill);
  const cast = document.createElement("div");
  cast.style.position = "relative";
  cast.style.width = "44px";
  cast.style.height = "3px";
  cast.style.margin = "4px auto 0";
  cast.style.background = "rgba(18,41,35,0.9)";
  cast.style.display = "none";
  const castFill = document.createElement("div");
  castFill.style.position = "absolute";
  castFill.style.left = "0";
  castFill.style.top = "0";
  castFill.style.height = "3px";
  castFill.style.background = "#c4d4b1";
  cast.appendChild(castFill);
  const dots = document.createElement("div");
  dots.style.margin = "3px auto 0";
  dots.style.height = "4px";
  root.append(name, bar, cast, dots);
  overlay.root.appendChild(root);
  return { root, name, bar, fill, cast, castFill, dots };
}

/** Bộ chấm trạng thái dùng lại (tối đa 6 chấm, màu theo loại trạng thái). */
export function createStatusDots(container: HTMLDivElement, count: number) {
  const dots: HTMLDivElement[] = [];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("div");
    dot.style.display = "inline-block";
    dot.style.width = "3px";
    dot.style.height = "3px";
    dot.style.borderRadius = "50%";
    dot.style.margin = "0 1px";
    container.appendChild(dot);
    dots.push(dot);
  }
  return dots;
}
