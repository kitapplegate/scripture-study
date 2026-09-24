import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background: "#8a5a2b",
          color: "#fbf8f3",
          fontFamily: "Georgia, serif",
          fontSize: 106,
          fontWeight: 700,
        }}
      >
        K
      </div>
    ),
    size,
  );
}
