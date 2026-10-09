import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const authPopupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: authPopupHeaders,
  },
  preview: {
    headers: authPopupHeaders,
  },
});
