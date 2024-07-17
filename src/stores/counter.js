import { ref, shallowReactive, reactive, computed } from 'vue'
import { defineStore } from 'pinia'
import { handleProcessFileLanguage } from "@/processFiles/index.js"
export const useCounterStore = defineStore('counter', () => {
    const indexDB = ref('')
    const curFileType = ref('') // 当前文件类型
    const currentOriginFileContent = shallowReactive({content: {}}) // 解析后的获取文件原始内容
    const currentDisplayContent = ref([]) // 页面展示内容
    const currentLanguageType = ref([]) // 页面展示的语言
    const updateLanguageTypeContent = reactive({ content: {}}) // 页面更新的内容
    const isLoading = ref(false)
    
    async function clearStateContent() {
        currentDisplayContent.value = []
        currentLanguageType.value = []
        updateLanguageTypeContent.content = {}
        currentOriginFileContent.content = {}
       
        // 清空数据库
        await indexDB.value?.clearDB({ storeName: 'store' })
    }

    // 设置原始文件内容
    async function setOriginFileContent(content) {
        // 设置前都需要重新清空一下对应 数组 和 indexDB 的内容
        console.warn("set origin content:", content)
        await clearStateContent()
        isLoading.value = true
        currentOriginFileContent.content = content
        await showFileContent(content)
        
        // 添加到数据库
        await indexDB.value?.add({key: 'origin', content: content, storeName: 'store'})
        await indexDB.value?.add({key: 'update', content: updateLanguageTypeContent.content, storeName: 'store'})
    }
  
    // 处理显示内容
    async function showFileContent(content) {
        let curContent = await handleProcessFileLanguage (content)
        currentDisplayContent.value = currentDisplayContent.value.concat(curContent)
        
        let curLanguageType = Object.keys(currentOriginFileContent.content)
        curLanguageType = addEmptyValueBeforeLastElement (curLanguageType)
        currentLanguageType.value = currentLanguageType.value.concat(curLanguageType)
    }
    
    // 获取更新内容
    function getUpdateContent() {
        return updateLanguageTypeContent.content
    }
    
    // 针对当前语言类型中添加空值
    function addEmptyValueBeforeLastElement(array) {
        // 检查数组长度是否大于2
        if (array.length >= 2) {
            // 在倒数第一个元素前插入一个空值
            array.splice(-1, 0, null);
        }
        return array;
    }
    
    return {
        isLoading,
        curFileType,
        currentOriginFileContent,
        currentDisplayContent,
        currentLanguageType,
        updateLanguageTypeContent,
        indexDB,
        showFileContent,
        setOriginFileContent,
        clearStateContent,
        getUpdateContent
    }
},{
    persist: {
        key: 'loading',
        storage: localStorage,
        paths:['isLoading']
    }
})
