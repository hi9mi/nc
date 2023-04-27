import { defineConfig, splitVendorChunkPlugin } from "vite";
import Unfonts from "unplugin-fonts/vite";

export default defineConfig({
  plugins: [
    splitVendorChunkPlugin(),
    Unfonts({
      google: {
        preconnect: false,
        display: "swap",
        injectTo: "head-prepend",
        families: [
          {
            name: "Lexend Mega",
            defer: true,
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
