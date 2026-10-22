import { createRoot } from "react-dom/client";
import App from "./app/App";
import { stripCacheBustParam } from "./app/pwa-cache";
import "./styles/game.css";
import "./styles/overhaul.css";

// Xóa cache xong game tải lại kèm ?_cb=<mốc thời gian>; gỡ tham số đó ngay để
// thanh địa chỉ sạch và các lần tải sau không mang tham số cũ.
stripCacheBustParam();
createRoot(document.getElementById("root")!).render(<App />);

import "./styles/visual-system.css";
