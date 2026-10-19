import { useEffect, useState } from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

const isTouchScreen = () => matchMedia("(pointer: coarse)").matches;
const isPortrait = () =>
  isTouchScreen() && matchMedia("(orientation: portrait)").matches;

export function useLandscapeMode() {
  const [portraitBlocked, setPortraitBlocked] = useState(isPortrait);

  async function lockLandscape() {
    const orientation = screen.orientation as LockableOrientation | undefined;
    if (!isTouchScreen() || !orientation?.lock) return;
    try {
      await orientation.lock("landscape");
    } catch {
      // The portrait guard remains visible when native locking is unavailable.
    }
  }

  async function enterLandscape() {
    if (
      document.documentElement.requestFullscreen &&
      !document.fullscreenElement
    ) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Installed PWAs can support orientation locking without fullscreen.
      }
    }
    await lockLandscape();
  }

  useEffect(() => {
    const portrait = matchMedia("(orientation: portrait)");
    const touch = matchMedia("(pointer: coarse)");
    const update = () => setPortraitBlocked(isPortrait());
    const restore = () => {
      update();
      if (document.visibilityState === "visible") void lockLandscape();
    };
    const retryLock = () => void lockLandscape();
    portrait.addEventListener("change", update);
    touch.addEventListener("change", restore);
    window.addEventListener("resize", update);
    document.addEventListener("visibilitychange", restore);
    document.addEventListener("fullscreenchange", restore);
    document.addEventListener("pointerdown", retryLock, { once: true });
    restore();
    return () => {
      portrait.removeEventListener("change", update);
      touch.removeEventListener("change", restore);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", restore);
      document.removeEventListener("fullscreenchange", restore);
      document.removeEventListener("pointerdown", retryLock);
    };
  }, []);

  return { portraitBlocked, enterLandscape };
}
