import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "",
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, "extension"),
  publicDir: "public",
  build: {
    outDir: path.resolve(__dirname, "dist/extension"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "extension/index.html"),
        background: path.resolve(__dirname, "extension/background.ts"),
        content: path.resolve(__dirname, "extension/content.ts")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]"
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
