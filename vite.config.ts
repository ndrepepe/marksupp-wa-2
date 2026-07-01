import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(async ({ mode }) => {
  const plugins = [react()];

  if (mode === "development") {
    const { default: dyadComponentTagger } = await import("@dyad-sh/react-vite-component-tagger");
    plugins.unshift(dyadComponentTagger());
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Memastikan tidak ada injeksi script tambahan saat build
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});
