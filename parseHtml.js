import { parse } from 'node-html-parser'

const needBasePathArr = ['src', 'data-src']

function htmlPostBuildPlugin(base) {
    return {
        name: 'html-post-build',
        enforce: 'post',
        apply: 'build',
        transformIndexHtml(html) {
            const root = parse(html)
            
            // 删除所有带有 module 属性的 script 标签
            while (root.querySelector('script[type="module"]')) {
                root.querySelector('script[type="module"]').remove()
            }
            
            // 删除 modulepreload 标签
            const prereloadScript = root.querySelector('link[rel="modulepreload"]')
            if (prereloadScript) {
                prereloadScript.remove()
            }
            
            // 删除css 文件中 crossorigin 属性
            const stylesheets = root.querySelectorAll('link[rel="stylesheet"]')
            for (let css of stylesheets) {
                css.remove('crossorigin')
            }
            
            // 删除 nomodule 属性并处理 script 标签的 src 或 data-src 属性
            const nomoduleScripts = root.querySelectorAll('script[nomodule]')
            for (const script of nomoduleScripts) {
                script.removeAttribute('nomodule')
                script.removeAttribute('crossorigin')
                
                // 如果提供了 base 路径，更新 src 和 data-src 属性
                if (base) {
                    needBasePathArr.forEach(attrName => {
                        if (script.hasAttribute(attrName)) {
                            let value = script.getAttribute(attrName)
                            if (!value.startsWith(base)) {
                                value = base + value
                                script.setAttribute(attrName, value)
                            }
                        }
                    })
                }
            }
            
            return root.innerHTML
        }
    }
}

export default htmlPostBuildPlugin
