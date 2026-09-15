import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { aiProxyPlugin } from "./vite-plugin-ai-proxy.js";
import { syncProxyPlugin } from "./vite-plugin-sync-proxy.js";
import { ttsProxyPlugin } from "./vite-plugin-tts-proxy.js";

export default defineConfig({
  plugins: [react(), aiProxyPlugin(), syncProxyPlugin(), ttsProxyPlugin()],
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
});
