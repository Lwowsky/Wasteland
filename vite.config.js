import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const authPopupHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

// GitHub project Pages uses /repository/; other hosts default to /.
// A subfolder on another host can be set with VITE_BASE_PATH (no code changes).
const projectName = process.env.GITHUB_REPOSITORY?.split("/").pop();
const requestedBase = process.env.VITE_BASE_PATH ||
  (process.env.GITHUB_PAGES === "true" && projectName ? `/${projectName}/` : "/");
const base = `/${requestedBase.split("/").filter(Boolean).join("/")}`.replace(/\/?$/, "/");

export default defineConfig({
  base,

  plugins: [react()],

  server: {
    headers: authPopupHeaders,
  },

  preview: {
    headers: authPopupHeaders,
  },
});
