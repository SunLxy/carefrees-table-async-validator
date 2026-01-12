import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  output: {
    assetPrefix: '/carefrees-table-async-validator/',
  },
  server: {
    base: '/carefrees-table-async-validator/',
  },
  plugins: [pluginReact()],
});
