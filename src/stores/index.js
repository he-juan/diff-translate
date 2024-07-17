import { createPinia } from "pinia" //引入pinia
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'


const pinia = createPinia() //创建pinia实例

pinia.use(piniaPluginPersistedstate)
export default pinia //导出pinia用于main.js注册