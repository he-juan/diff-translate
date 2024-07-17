import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import {resolve} from 'path'
import { createHtmlPlugin } from 'vite-plugin-html'
import { viteSingleFile } from 'vite-plugin-singlefile'
import htmlPostBuildPlugin from './parseHtml.js'


// https://vitejs.dev/config/
const base = './'
const htmlParams = {
    minify: false,
    entry: 'src/main.js',
    filename: 'index.html',
    template: './index.html',
    inject: {
        data: {
            title: 'index',
            injectScript: ``,
        },
    }
}
export default defineConfig({
    base: base,
    publicDir: 'public',
    plugins: [
        // viteSingleFile(),
        legacy({
            targets: ['ie>=11'],
            additionalLegacyPolyfills: ['regenerator-runtime/runtime']
        }),
        vue(),
        
        htmlPostBuildPlugin(base),
        createHtmlPlugin(htmlParams)
    ],
    build:{
        sourcemap: true,
        outDir: 'dist', // 指定输出路径，要和库的包区分开
        assetsDir: 'static', // 指定生成静态资源的存放路径
        // rollupOptions:{
        //     input:{
        //         main: resolve(__dirname, 'index.html'),
        //     },
        //     output: {
        //         compact: true,
        //         entryFileNames: "src/[name]-[hash].js",
        //         chunkFileNames: "src/[name]-[hash].js",
        //         assetFileNames: "static/[ext]/[name].[ext]",
        //     }
        // },
    },
    resolve: {
        extensions:['.js', '.vue', '.json'],
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server:{
        host:'0.0.0.0'
    }
})
