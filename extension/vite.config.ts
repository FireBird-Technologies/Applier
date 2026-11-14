import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

// MV3 needs the service worker at a stable, non-hashed path referenced by manifest.json.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, "sidepanel.html"),
        editor: resolve(__dirname, "editor.html"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "assets/[name].js"),
      },
    },
  },
});
