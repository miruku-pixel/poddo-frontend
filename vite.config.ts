import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Load env file based on mode (e.g., .env, .env.development, etc.)
  const env = loadEnv(mode, process.cwd()); // ✅ FIXED: use process.cwd()

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL, // Use env var here
          changeOrigin: true,
        },
      },
    },
  };
});
