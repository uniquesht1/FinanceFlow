import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-charts": ["recharts"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-date": ["date-fns"],
        },
      },
    },
  },
}));
export const componentTagger = (): Plugin => {
  return {
    name: "component-tagger",
    transform(code: string, id: string) {
      if (/\.[jt]sx?$/.test(id) && !id.includes("node_modules")) {
        const componentName = id
          .split("/")
          .pop()
          ?.replace(/\.[jt]sx?$/, "");
        return {
          code: `${code}\nif (typeof window !== "undefined") { window.__COMPONENT__ = "${componentName}"; }`,
          map: null,
        };
      }
    },
  };
};
