import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Permite abrir el servidor local a través de un túnel de ngrok.
const allowedHosts = [".ngrok-free.app"];

export default defineConfig({
  plugins: [react()],
  server: { allowedHosts },
  preview: { allowedHosts },
});
