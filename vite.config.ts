import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/detector-de-sismos/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/esp32": {
        target: "http://192.168.4.1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/esp32/, "")
      }
    }
  }
});
