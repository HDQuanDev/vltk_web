# Ảnh + số đo hiệu ứng "giả 3D" môi trường

Sinh bởi `scripts/capture-daynight-effects.mjs` (save tổng hợp nhập qua UI thật, không hook debug):

```sh
RUN=after LABEL=allOn PHASE=shots node scripts/capture-daynight-effects.mjs
RUN=after LABEL=allOn PHASE=perf  node scripts/capture-daynight-effects.mjs
RUN=after LABEL=allOn PHASE=mapchange node scripts/capture-daynight-effects.mjs
RUN=after LABEL=d1-before-vs-allOff PHASE=compare \
  A=artifacts/daynight-effects/before/default B=artifacts/daynight-effects/after/allOff \
  node scripts/capture-daynight-effects.mjs
```

Viewport 1366×768, headless Chromium + SwiftShader, renderer WebGL, cảnh Tân Thủ Thôn.

## Thư mục

| Thư mục | Nội dung |
|---|---|
| `before/default/` | 4 mốc worldClock **trước khi sửa** (Ngọ 6000, Dậu 12000, Tý 18000, Mão 24000) + report đo hiệu năng gốc |
| `after/allOn/` | 4 mốc sau khi sửa, 5 công tắc bật (mặc định) + perf + đổi map |
| `after/allOff/` | 4 mốc sau khi sửa, tắt cả 5 công tắc |
| `after/onlyGlow`, `onlyDusk`, `onlyFog`, `onlyParallax` | mỗi ảnh chỉ bật đúng 1 công tắc, ở mốc thời gian tương ứng |
| `after/reducedMotion/` | mốc Tý với `reducedMotion: true` |
| `after/pAllOff`, `pOnlyFog`, `pOnlyDusk` | đo hiệu năng khi tắt hết / chỉ bật từng hạng mục |
| `after/d1…d6`, `after/cmpReduced` | `diff.json`: meanAbsDiff, % pixel đổi, độ sáng trung bình của từng cặp ảnh |

## So sánh chính

| Cặp | Ngọ | Dậu | Tý | Mão |
|---|---|---|---|---|
| trước ↔ sau (tắt hết) `d1` | 0.12 / 0.22% | 0.39 / 0.19% | 29.6 / 80.7% | 0.12 / 0.20% |
| tắt hết ↔ bật hết `d2` | 5.18 / 21.8% | 18.47 / 80.5% | 4.30 / 11.6% | 18.53 / 80.5% |
| tắt hết ↔ chỉ glow `d3` (Tý) | – | – | 1.49 / 5.8% | – |
| tắt hết ↔ chỉ dusk `d4` (Dậu) | – | 16.23 / 80.0% | – | – |
| tắt hết ↔ chỉ fog `d5` (Ngọ) | 4.13 / 21.5% | – | – | – |
| tắt hết ↔ chỉ parallax `d6` (Ngọ) | 2.31 / 5.4% | – | – | – |

Độ sáng trung bình (0–255): Ngọ 98.85, Dậu 103.60, Tý 79.35, Mão 103.74 (bản trước khi sửa: 97.53 ở cả 4 mốc vì lớp đêm chưa bao giờ vẽ — xem `docs/EXECUTION_STATE.md`).

## Hiệu năng (fps đứng yên 30s / chạy 4 vòng × 5s)

| Quality | Trước | Sau (bật hết) | Chênh |
|---|---|---|---|
| high | 30.73 / 28.70 | 26.40 / 23.90 | −14.1% / −16.7% |
| low | 30.63 / 28.80 | 32.27 / 30.55 | +5.4% / +6.1% |
| high, tắt hết (`pAllOff`) | 30.73 / 28.70 | 30.43 / 28.85 | −1.0% / +0.5% |
| high, chỉ fog (`pOnlyFog`) | 30.73 / 28.70 | 27.33 / 24.50 | −11.1% / −14.6% |
| high, chỉ dusk (`pOnlyDusk`) | 30.73 / 28.70 | 28.47 / 26.35 | −7.4% / −8.2% |

`renderMs` (CPU của WorldScene.update) 0.10–0.20ms ở mọi cấu hình → chi phí nằm ở fill-rate của lớp phủ toàn màn hình trong SwiftShader, không phải logic JS. Chưa đo trên GPU thật.
