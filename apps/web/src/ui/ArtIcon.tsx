import { iconUrl } from "./interface-art";
export function ArtIcon({
  name,
  className = "",
  itemId,
}: {
  name: string;
  className?: string;
  itemId?: string;
}) {
  const url = iconUrl(!itemId && name === "sword" ? "slash" : name, itemId);
  if (url)
    return (
      <img
        className={`art-icon painted-icon ${className}`}
        src={url}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    );
  const color =
    name === "potion-red"
      ? "#d36550"
      : name === "potion-blue"
        ? "#78b8dd"
        : name === "herb"
          ? "#aacb78"
          : name === "gem"
            ? "#b69bdf"
            : "#d4bd82";
  return (
    <svg
      className={`art-icon ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={"glow" + name}>
          <stop stopColor={color} stopOpacity=".2" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill={`url(#glow${name})`} />
      {name.includes("potion") ? (
        <>
          <path
            d="M20 9h8v10c0 4 9 7 9 15 0 7-26 7-26 0 0-8 9-11 9-15Z"
            fill={color}
            fillOpacity=".6"
            stroke={color}
          />
          <path
            d="M19 9h10M20 13h8M17 30c-3 7 0 8 3 8"
            stroke="#ead6af"
            strokeWidth="2"
          />
          <path d="M18 7h12v5H18Z" fill="#a28754" />
        </>
      ) : name === "robe" ? (
        <>
          <path
            d="m16 10-9 7 4 12 7-5-4 17h21l-5-17 7 5 4-12-11-7-7 9Z"
            fill="#5d8691"
            stroke="#c8bd90"
          />
          <path
            d="m17 10 7 10 7-10M24 20v20M17 26h14"
            stroke="#dccda5"
            strokeWidth="2"
          />
        </>
      ) : name === "boots" ? (
        <>
          <path
            d="m14 9 11 2-2 20 12 4-2 7H12l-2-8Z"
            fill="#5f7b7e"
            stroke="#c1b485"
            strokeWidth="2"
          />
          <path d="m13 18 10 2m-11 6 10 2" stroke="#b7a57a" />
        </>
      ) : name === "herb" ? (
        <>
          <path
            d="m20 42 8-29m-3 15C6 24 9 11 9 11c14 0 16 14 16 17Zm2-7C29 7 40 7 40 7s0 15-13 14Zm-6 14C7 36 6 25 6 25s13-2 15 10Z"
            stroke="#c6d898"
            fill="#6e9f5b"
          />
        </>
      ) : name === "gem" ? (
        <path
          d="m24 6 16 13-6 20-21-3-5-19Zm0 0-7 15 17 18m-17-18-4 15m4-15 23-2"
          fill="#68778b"
          stroke="#c3b8d4"
          strokeWidth="2"
        />
      ) : name === "lotus" ? (
        <>
          <path
            d="M24 39C8 36 5 26 7 20c9 0 14 8 17 19Zm0 0C40 36 43 26 41 20c-9 0-14 8-17 19Z"
            fill="#78aeaa"
            stroke="#d2ddbe"
          />
          <path
            d="M24 38C8 25 22 7 24 6c3 2 16 20 0 32Z"
            fill="#a0bba7"
            stroke="#e1e4c3"
          />
        </>
      ) : name === "shield" ? (
        <>
          <path
            d="M24 5 40 13v12c0 10-16 18-16 18S8 35 8 25V13Z"
            stroke="#e0c77e"
            strokeWidth="2"
            fill="#79968c"
            fillOpacity=".4"
          />
          <path d="m15 24 6 7 13-16" stroke="#f0d89f" strokeWidth="2" />
        </>
      ) : name === "wind" ? (
        <>
          <path
            d="M7 34C45 36 45 1 26 9 10 16 11 29 29 25M5 41c20 3 36-9 37-22M10 21C12 7 25 1 34 4"
            stroke="#a0dde3"
            strokeWidth="3"
          />
          <path d="m17 24 22-15-15 27Z" fill="#d2edf0" />
        </>
      ) : name === "lightning" ? (
        <>
          <path d="m30 3-19 25h13l-5 17 20-28H26Z" fill="#b8e5ee" />
          <path
            d="m7 41 10-11m17-18 7-8M5 25l7-9m22 18 8-11"
            stroke="#69b5db"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <path d="m15 36 23-31-9 36-6-9Z" fill="#c6dcda" stroke="#eff3d9" />
          <path d="m10 27 18 13m-14-6-8 10" stroke="#c5a766" strokeWidth="4" />
          <path d="m25 15 5-10m2 24 10-9" stroke="#75bcce" />
        </>
      )}
    </svg>
  );
}
