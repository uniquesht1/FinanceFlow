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
