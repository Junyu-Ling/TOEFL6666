import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { aiProxyPlugin } from "./vite-plugin-ai-proxy.js";

export default defineConfig({
  plugins: [react(), aiProxyPlugin()],
  server: {
    host: true,
    port: 5173,
  },
});
