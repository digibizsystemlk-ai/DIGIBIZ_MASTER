import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.join(__dirname, 'www'),
  build: {
    outDir: path.join(__dirname, 'dist'),
    minify: false,
    emptyOutDir: true,
  },
});
