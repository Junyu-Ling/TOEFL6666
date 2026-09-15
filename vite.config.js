import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { aiProxyPlugin } from "./vite-plugin-ai-proxy.js";
import { syncProxyPlugin } from "./vite-plugin-sync-proxy.js";
import { ttsProxyPlugin } from "./vite-plugin-tts-proxy.js";
import { accessProxyPlugin } from "./vite-plugin-access-proxy.js";

export default defineConfig({
  plugins: [react(), aiProxyPlugin(), syncProxyPlugin(), ttsProxyPlugin(), accessProxyPlugin()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
});
