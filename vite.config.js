import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { aiProxyPlugin } from "./vite-plugin-ai-proxy.js";
import { syncProxyPlugin } from "./vite-plugin-sync-proxy.js";
import { ttsProxyPlugin } from "./vite-plugin-tts-proxy.js";
import { accessProxyPlugin } from "./vite-plugin-access-proxy.js";
import { obfuscatePlugin } from "./vite-plugin-obfuscate.js";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    aiProxyPlugin(),
    syncProxyPlugin(),
    ttsProxyPlugin(),
    accessProxyPlugin(),
    obfuscatePlugin({ enabled: mode === "production" }),
  ],
  build: {
    // 敏感拉题逻辑单独拆包，便于定向混淆
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("readingFillSecure") || id.includes("usePassageContentProtection")) {
            return "rf-secure";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
}));
