
import IndexedDBService from "@/storage/indexDB.js"
import {onMounted, onUnmounted, ref} from "vue"

export default function useIndexedDB() {
    const dbService = ref()

    onMounted(async () => {
        console.warn("hook 组件：")
        dbService.value = new IndexedDBService('dataBase', 1)
        try {
            await dbService.value.initDB()
            console.log('hook 组件：Database initialized')
        } catch (error) {
            console.error('Failed to initialize database', error)
        }
    })

    onUnmounted(() => {
        // 清理操作，如果需要的话
    })

    return {
        dbService,
    }
}