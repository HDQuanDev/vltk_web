import Phaser from "phaser";
import { actorTexture } from "../game/animations/atlas";
import { actorVisualManifest } from "@kiem-hiep/game-content";
let game: Phaser.Game | undefined;
function render(weapon: string) {
  game?.destroy(true);
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: "atlas-preview",
    width: 1120,
    height: 1060,
    backgroundColor: "#192e23",
    banner: false,
    audio: { noAudio: true },
    scene: {
      create() {
        const key = actorTexture(this, weapon);
        const directions = [
          "Đông",
          "Đông Nam",
          "Nam",
          "Tây Nam",
          "Tây",
          "Tây Bắc",
          "Bắc",
          "Đông Bắc",
        ];
        for (const [i, label] of directions.entries())
          this.add
            .text(180 + i * 120, 18, label, {
              fontFamily: "Arial",
              fontSize: "12px",
              color: "#d8c79c",
            })
            .setOrigin(0.5);
        for (const [row, state] of actorVisualManifest.states.entries()) {
          this.add.text(20, 95 + row * 124, state, {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#b6c6a5",
          });
          for (let dir = 0; dir < 8; dir++) {
            const frame =
              row * 48 +
              dir * 6 +
              (state === "dead"
                ? 5
                : state === "revive"
                  ? 1
                  : state === "walk"
                    ? 1
                    : 3);
            this.add.ellipse(
              180 + dir * 120,
              143 + row * 124,
              45,
              15,
              0x0a1b13,
              0.5,
            );
            this.add
              .image(180 + dir * 120, 143 + row * 124, key, frame)
              .setOrigin(0.5, 88 / 96)
              .setScale(1.2);
          }
        }
      },
    },
  });
}
const select = document.getElementById("weapon") as HTMLSelectElement;
select.addEventListener("change", () => render(select.value));
render(select.value);
