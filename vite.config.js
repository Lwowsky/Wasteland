import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const authPopupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/Wasteland/" : "/",

  plugins: [react()],

  server: {
    headers: authPopupHeaders,
  },

  preview: {
    headers: authPopupHeaders,
  },
});
