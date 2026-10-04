import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),plugins:[react()],define:{'process.env':{NODE_ENV:'development'}},resolve:{alias:{'@':fileURLToPath(new URL('../../../',import.meta.url))}},server:{host:'127.0.0.1',port:5190,strictPort:true,fs:{allow:[fileURLToPath(new URL('../../../',import.meta.url))]}}});
