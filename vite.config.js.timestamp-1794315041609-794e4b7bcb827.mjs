// vite.config.js
import { defineConfig } from "file:///C:/papki/work/web/bitrix24/ittochka/mdg-accounts/node_modules/vitest/dist/config.js";
import copy from "file:///C:/papki/work/web/bitrix24/ittochka/mdg-accounts/node_modules/rollup-plugin-copy/dist/index.commonjs.js";
import vue from "file:///C:/papki/work/web/bitrix24/ittochka/mdg-accounts/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///C:/papki/work/web/bitrix24/ittochka/mdg-accounts/vite.config.js";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  base: "",
  build: {
    assetsDir: "assets",
    emptyOutDir: true
  },
  plugins: [
    vue(),
    copy({
      targets: [
        { src: "public/fonts/*", dest: "dist/assets/fonts" }
      ],
      verbose: true,
      hook: "writeBundle",
      apply: "build"
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    exclude: ["src/tests/sum.test.ts", "src/tests/sum.test.js"]
  },
  server: {
    https: {
      key: fs.readFileSync("./private.key"),
      cert: fs.readFileSync("./cert.pem")
    },
    proxy: {
      "/requests.json": {
        target: "https://dev2.smartbusinessclub.ru/timofei/b24_iw2sts_bitrix24_ru/requests.json",
        changeOrigin: true,
        secure: false
      }
    },
    host: "127.0.0.1",
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwYXBraVxcXFx3b3JrXFxcXHdlYlxcXFxiaXRyaXgyNFxcXFxpdHRvY2hrYVxcXFxtZGctYWNjb3VudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXHBhcGtpXFxcXHdvcmtcXFxcd2ViXFxcXGJpdHJpeDI0XFxcXGl0dG9jaGthXFxcXG1kZy1hY2NvdW50c1xcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovcGFwa2kvd29yay93ZWIvYml0cml4MjQvaXR0b2Noa2EvbWRnLWFjY291bnRzL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZydcbmltcG9ydCBjb3B5IGZyb20gJ3JvbGx1cC1wbHVnaW4tY29weSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIGJhc2U6ICcnLFxuICBidWlsZDoge1xuICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXG4gICAgZW1wdHlPdXREaXI6IHRydWUsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICB2dWUoKSxcbiAgICBjb3B5KHtcbiAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgeyBzcmM6ICdwdWJsaWMvZm9udHMvKicsIGRlc3Q6ICdkaXN0L2Fzc2V0cy9mb250cycgfSxcbiAgICAgIF0sXG4gICAgICB2ZXJib3NlOiB0cnVlLFxuICAgICAgaG9vazogJ3dyaXRlQnVuZGxlJyxcbiAgICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxuICAgIGluY2x1ZGU6IFsnc3JjL3Rlc3RzLyoqLyoudGVzdC50cyddLFxuICAgIGV4Y2x1ZGU6IFsnc3JjL3Rlc3RzL3N1bS50ZXN0LnRzJywgJ3NyYy90ZXN0cy9zdW0udGVzdC5qcyddLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBodHRwczoge1xuICAgICAga2V5OiBmcy5yZWFkRmlsZVN5bmMoJy4vcHJpdmF0ZS5rZXknKSxcbiAgICAgIGNlcnQ6IGZzLnJlYWRGaWxlU3luYygnLi9jZXJ0LnBlbScpLFxuICAgIH0sXG4gICAgcHJveHk6IHtcbiAgICAgICcvcmVxdWVzdHMuanNvbic6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly9kZXYyLnNtYXJ0YnVzaW5lc3NjbHViLnJ1L3RpbW9mZWkvYjI0X2l3MnN0c19iaXRyaXgyNF9ydS9yZXF1ZXN0cy5qc29uJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGhvc3Q6ICcxMjcuMC4wLjEnLFxuICAgIHBvcnQ6IDUxNzMsXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVixTQUFTLG9CQUFvQjtBQUM3VyxPQUFPLFVBQVU7QUFDakIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUx1TCxJQUFNLDJDQUEyQztBQU90USxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUU3RCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsRUFDTixPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsRUFDZjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osS0FBSztBQUFBLE1BQ0gsU0FBUztBQUFBLFFBQ1AsRUFBRSxLQUFLLGtCQUFrQixNQUFNLG9CQUFvQjtBQUFBLE1BQ3JEO0FBQUEsTUFDQSxTQUFTO0FBQUEsTUFDVCxNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsSUFDVCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxLQUFLO0FBQUEsSUFDcEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxNQUFNO0FBQUEsSUFDSixhQUFhO0FBQUEsSUFDYixTQUFTLENBQUMsd0JBQXdCO0FBQUEsSUFDbEMsU0FBUyxDQUFDLHlCQUF5Qix1QkFBdUI7QUFBQSxFQUM1RDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsS0FBSyxHQUFHLGFBQWEsZUFBZTtBQUFBLE1BQ3BDLE1BQU0sR0FBRyxhQUFhLFlBQVk7QUFBQSxJQUNwQztBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsa0JBQWtCO0FBQUEsUUFDaEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
