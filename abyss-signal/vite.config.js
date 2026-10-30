import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'./',build:{outDir:'../dist/abyss-signal',emptyOutDir:true},server:{host:'127.0.0.1',port:5178}});
