import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/detector-de-sismos/",
  server: {
    proxy: {
      "/esp32": {
        target: "http://192.168.4.1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/esp32/, "")
      }
    }
  }
});
