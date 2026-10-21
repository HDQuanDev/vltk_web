import * as THREE from "three";
import { getPreferences, qualityBudget } from "../preferences";
import { pxToUnits } from "./coords";

/**
 * Thời tiết 3D: mưa và sương.
 *
 * Mưa vẽ bằng `LineSegments`: mỗi hạt là một đoạn thẳng dài 14px rơi chéo
 * 4px — đúng hình bản 2D vẽ bằng `Graphics.lineBetween(x, y, x − 4, y + 14)`.
 * Dùng `LineSegments` thay `THREE.Points` vì kích thước điểm theo px không
 * đổi theo khoảng cách ở một số driver và hạt gần như vô hình ở camera xa.
 *
 * Số hạt mưa theo `qualityBudget().weather` (20/45/90); nếu `settings.effects`
 * không phải "high" thì dùng 15 hạt — khớp bản 2D.
 */
export class Weather3D {
  private group = new THREE.Group();
  private rain?: THREE.LineSegments;
  private rainCount = 0;
  private mist: THREE.Mesh[] = [];
  private current: "clear" | "rain" | "mist" = "clear";

  constructor(private scene: THREE.Scene) {
    this.group.name = "weather";
    this.scene.add(this.group);
  }

  private ensureRain(count: number) {
    if (this.rain && this.rainCount === count) return;
    if (this.rain) {
      this.group.remove(this.rain);
      this.rain.geometry.dispose();
      (this.rain.material as THREE.Material).dispose();
    }
    this.rainCount = count;
    // Mỗi hạt = 2 đỉnh (đầu trên, đuôi dưới chéo).
    const positions = new Float32Array(count * 6);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xc1dad2,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      // Hạt mưa không bị fog xóa (bản 2D vẽ mưa ở lớp trên cùng, sau fog).
      fog: false,
    });
    this.rain = new THREE.LineSegments(geometry, material);
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 9;
    this.group.add(this.rain);
  }

  private ensureMist() {
    if (this.mist.length) return;
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          color: 0xaebfb5,
          transparent: true,
          opacity: 0.04,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.renderOrder = 9;
      this.group.add(mesh);
      this.mist.push(mesh);
    }
  }

  update(
    weather: "clear" | "rain" | "mist",
    effects: "low" | "medium" | "high",
    camera: THREE.Camera,
    tick: number,
    focus?: { x: number; y: number },
  ) {
    const reduced = getPreferences().reducedMotion;
    this.current = weather;
    if (weather === "rain") {
      const budget = qualityBudget(window.innerWidth);
      const count = effects === "high" ? budget.weather : 15;
      this.ensureRain(count);
      this.rain!.visible = !reduced;
      for (const mesh of this.mist) mesh.visible = false;
      if (!reduced && this.rain) {
        // Hạt rơi trong hộp quanh điểm nhìn (người chơi), tái chế vòng tròn.
        const attr = this.rain.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        const cam = camera.getWorldPosition(new THREE.Vector3());
        const focusX = focus?.x ?? cam.x;
        const focusZ = focus?.y ?? cam.z;
        // Đoạn hạt dài 14px rơi chéo 4px (theo px màn hình của bản 2D).
        const length = pxToUnits(14);
        const slant = pxToUnits(4);
        for (let i = 0; i < this.rainCount; i++) {
          let y = (i * 3.77) % 9;
          y -= 0.28;
          if (y < 0) y += 9;
          const x = focusX - 12 + ((i * 7.13) % 24);
          const z = focusZ - 12 + ((i * 11.31) % 24);
          attr.setXYZ(i * 2, x, y, z);
          attr.setXYZ(i * 2 + 1, x - slant, y - length, z);
        }
        attr.needsUpdate = true;
      }
      return;
    }
    if (this.rain) this.rain.visible = false;
    if (weather === "mist") {
      this.ensureMist();
      const cam = camera.getWorldPosition(new THREE.Vector3());
      for (let i = 0; i < this.mist.length; i++) {
        const mesh = this.mist[i];
        mesh.visible = true;
        const drift = reduced ? 0 : (tick * 0.3 + i * 233) % 60;
        mesh.position.set(
          cam.x - 30 + drift,
          2 + i * 1.6,
          cam.z - 20 + i * 4,
        );
        mesh.scale.set(40, 4, 1);
        mesh.rotation.set(0, 0, 0);
      }
      return;
    }
    for (const mesh of this.mist) mesh.visible = false;
  }

  /** Fog sương: `far` co còn ~45 khi trời sương. */
  applyFog(scene: THREE.Scene, night: number) {
    if (!(scene.fog instanceof THREE.Fog)) return;
    const misty = this.current === "mist";
    scene.fog.far = misty ? 45 : 75 - night * 30;
    scene.fog.near = misty ? 12 : 30 - night * 6;
  }

  destroy() {
    if (this.rain) {
      this.rain.geometry.dispose();
      (this.rain.material as THREE.Material).dispose();
    }
    for (const mesh of this.mist) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.mist = [];
    this.scene.remove(this.group);
  }
}
