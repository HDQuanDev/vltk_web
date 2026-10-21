import * as THREE from "three";

/**
 * Vật liệu cơ bản cho `InstancedMesh` có thuộc tính per-instance tùy chỉnh.
 *
 * - `aCell` (vec2): ô atlas (cột, hàng) để chọn khung sprite trong atlas.
 * - `aFlip` (float): 1 = lật ngang ô đang chọn.
 * - `aTint` (vec3): nhân màu (dùng cho nháy sáng khi trúng đòn).
 * - `aAlpha` (float): nhân alpha (dùng cho entity chết mờ 0.55).
 *
 * Vật liệu dùng `MeshBasicMaterial` (không phải sáng) để khớp bản 2D: sprite 2D
 * không bị ánh sáng hóa.
 */
export interface InstancedAttributes {
  cell?: boolean;
  flip?: boolean;
  tint?: boolean;
  alpha?: boolean;
}

export interface InstancedMaterialOptions extends InstancedAttributes {
  map?: THREE.Texture;
  color?: number;
  transparent?: boolean;
  alphaTest?: number;
  side?: THREE.Side;
  depthWrite?: boolean;
  blending?: THREE.Blending;
  /** Kích thước atlas (dùng khi `cell` bật). */
  atlas?: { columns: number; rows: number };
}

const VERTEX_PARS = /* glsl */ `
attribute vec2 aCell;
attribute float aFlip;
attribute vec3 aTint;
attribute float aAlpha;
varying float vAlpha;
varying vec3 vTint;
`;

const VERTEX_BODY = /* glsl */ `
vAlpha = aAlpha;
vTint = aTint;
`;

const FRAGMENT_PARS = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
`;

const FRAGMENT_BODY = /* glsl */ `
diffuseColor.rgb *= vTint;
diffuseColor.a *= vAlpha;
`;

/**
 * Tạo vật liệu instanced. `atlas` mô tả lưới ô của atlas (cột × hàng) để
 * shader chọn đúng khung theo `aCell`.
 */
export function createInstancedMaterial(
  options: InstancedMaterialOptions,
): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({
    map: options.map,
    color: options.color ?? 0xffffff,
    transparent: options.transparent ?? false,
    alphaTest: options.alphaTest ?? 0,
    side: options.side ?? THREE.FrontSide,
    depthWrite: options.depthWrite ?? true,
    blending: options.blending ?? THREE.NormalBlending,
  });
  const atlas = options.atlas;
  const useCell = !!options.cell && !!atlas;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\n${VERTEX_PARS}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n${VERTEX_BODY}`,
      );
    if (useCell) {
      // Chọn ô atlas: u = (cột + quãy trong ô) / số cột, v tính từ dưới lên
      // (texture flipY mặc định nên hàng 0 của canvas nằm ở v = 1).
      shader.vertexShader = shader.vertexShader.replace(
        "#include <uv_vertex>",
        /* glsl */ `#include <uv_vertex>
        {
          float quadU = uv.x;
          float quadV = uv.y;
          ${options.flip ? "if (aFlip > 0.5) quadU = 1.0 - quadU;" : ""}
          float cellW = 1.0 / ${atlas!.columns.toFixed(1)};
          float cellH = 1.0 / ${atlas!.rows.toFixed(1)};
          float vBase = 1.0 - (aCell.y + 1.0) * cellH;
          vMapUv = vec2(
            (aCell.x + quadU) * cellW,
            vBase + quadV * cellH
          );
        }`,
      );
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>\n${FRAGMENT_BODY}`,
      );
  };
  material.customProgramCacheKey = () =>
    `instanced-${useCell ? "cell" : "plain"}-${options.flip ? "flip" : ""}`;
  return material;
}

/** Gắn thuộc tính instanced vào geometry của một InstancedMesh. */
export function attachInstancedAttributes(
  mesh: THREE.InstancedMesh,
  count: number,
  options: {
    cell?: boolean;
    flip?: boolean;
    tint?: boolean;
    alpha?: boolean;
  },
) {
  const geometry = mesh.geometry;
  if (options.cell) {
    geometry.setAttribute(
      "aCell",
      new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2),
    );
  }
  if (options.flip) {
    geometry.setAttribute(
      "aFlip",
      new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
    );
  }
  if (options.tint) {
    const tint = new Float32Array(count * 3).fill(1);
    geometry.setAttribute(
      "aTint",
      new THREE.InstancedBufferAttribute(tint, 3),
    );
  }
  if (options.alpha) {
    const alpha = new Float32Array(count).fill(1);
    geometry.setAttribute(
      "aAlpha",
      new THREE.InstancedBufferAttribute(alpha, 1),
    );
  }
}

/** Ghi giá trị thuộc tính instanced theo index. */
export function setInstanceCell(
  mesh: THREE.InstancedMesh,
  index: number,
  column: number,
  row: number,
) {
  const attr = mesh.geometry.getAttribute("aCell");
  if (!attr) return;
  attr.setXY(index, column, row);
  attr.needsUpdate = true;
}

export function setInstanceFlip(
  mesh: THREE.InstancedMesh,
  index: number,
  flip: boolean,
) {
  const attr = mesh.geometry.getAttribute("aFlip");
  if (!attr) return;
  attr.setX(index, flip ? 1 : 0);
  attr.needsUpdate = true;
}

export function setInstanceTint(
  mesh: THREE.InstancedMesh,
  index: number,
  color: THREE.Color,
) {
  const attr = mesh.geometry.getAttribute("aTint");
  if (!attr) return;
  attr.setXYZ(index, color.r, color.g, color.b);
  attr.needsUpdate = true;
}

export function setInstanceAlpha(
  mesh: THREE.InstancedMesh,
  index: number,
  alpha: number,
) {
  const attr = mesh.geometry.getAttribute("aAlpha");
  if (!attr) return;
  attr.setX(index, alpha);
  attr.needsUpdate = true;
}
