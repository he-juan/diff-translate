
class IndexedDBService {
    constructor(dbName, dbVersion) {
        this.dbName = dbName
        this.dbVersion = dbVersion
        this.db = null
    }
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                if (!this.db.objectStoreNames.contains('store')) {
                    this.createStores()
                }
            }
            
            request.onsuccess = (event) => {
                this.db = request.result
                resolve(event.target.result)
            };
            
            request.onerror = (event) => {
                reject(event.target.error)
            };
        });
    }
    
    createStores() {
        this.store = this.db.createObjectStore('store', { keyPath: 'key', autoIncrement: true });
    }
    
    
    
    /***********************************表格的 增 删 改 查 ******************************************/
    
    /**
     * @param data.key 主键
     * @param data.storeName  表格名称
     * **/
    async get(data) {
        if (!data ||!data.storeName) {
            console.log("add: current no storeName!")
            return
        }
        let {key, storeName} = data
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readonly")
            const objectStore = transaction.objectStore(storeName);
            const req = objectStore.get(key);
            
            req.onsuccess = function () {
                resolve(req.result)
                console.log('get content successfully')
            }
            req.onerror = reject
        })
    }
    
    /**
     * 添加storeName表格内容
     * @param data.content 更新内容
     * @param data.storeName  表格名称
     * **/
    async add(data) {
        if (!data ||!data.storeName) {
            console.log("add: current no storeName!")
            return
        }
        let {key: id, content, storeName} = data
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], "readwrite")
            const objectStore = transaction.objectStore(storeName)
            const select = objectStore.add( {key: id, value: JSON.stringify(content)})
            select.onsuccess = (event) => {
                resolve(event.target.result)
                console.log('Add data successfully written.', event)
            }
            select.onerror = (event)=> {
                reject(event)
                console.log('Add data failed written.', event)
            }
        })
    }
    
    /**
     * 更新storeName表格的某个内容
     * @param data.key  主键
     * @param data.content 更新内容
     * @param data.storeName 表格名称
     * **/
    async update(data) {
        if (!data ||!data.storeName) {
            console.log("update: current no storeName!")
            return
        }
        let {key: id , content, storeName} = data
        return new Promise((resolve, reject) => {
            const select = this.db
                .transaction([storeName], "readwrite")
                .objectStore(storeName)
                .put({key: id  , value: JSON.stringify(content)})
            
            select.onsuccess = (event) => {
                const result = event.target.result
                resolve(result)
                console.log('update data:', result)
            }
            select.onerror = reject
        })
    }
    
    /**
     * 删除storeName表格的某个内容
     * @param data.key  主键
     * @param data.content 更新内容
     * @param data.storeName 表格名称
     * **/
    async remove(data){
        if (!data ||!data.storeName) {
            console.log("update: current no storeName!")
            return
        }
        let {key, storeName} = data
        return new Promise((resolve, reject) => {
            const select = this.db
                .transaction([storeName], "readwrite")
                .objectStore(storeName)
                .delete(key)
            
            select.onsuccess = (event) => {
                resolve(event.target.result)
                console.log("删除成功...")
            }
            select.onerror = reject
        })
    }
    
    /*****************************某个表格内容获取所有内容、清除所有内容 ***************************************/
    
    /**
     * 获取storeName表格的所有内容
     * @param data.storeName 表格名称
     * **/
    async getAll(data) {
        if (!data ||!data.storeName) {
            console.log("getAll: current no storeName!")
            return
        }
        let {storeName} = data
        return new Promise((res,rej)=>{
            const transaction = this.db.transaction([storeName], "readonly")
            const objectStore = transaction.objectStore(storeName);
            const req = objectStore.getAll()
            req.onsuccess = function (event) {
                const result = event.target.result
                const data = result.reduce((acc, item) => {
                    acc[item.key] = item.value? JSON.parse(item.value): ''
                    return acc;
                }, {})
                res(data)
            }
            req.onerror = (err)=>{
                rej(err)
            }
        })
    }
    
    /**
     * 清除storeName表格的所有内容
     * @param data.storeName 表格名称
     * **/
    async clearDB(data) {
        if (!data ||!data.storeName || !this.db) {
            console.log("getAll: current no storeName!")
            return
        }
        let {storeName} = data
        await this.remove({key: 1, storeName: 'store'})
        return new Promise((res,rej)=>{
            const transaction = this.db.transaction([storeName], "readwrite")
            const objectStore = transaction.objectStore(storeName);
            // 清空对象存储空间 store1
            objectStore.clear();
            
            // 成功后的回调
            transaction.oncomplete = function(event) {
                if (event.type === 'complete') {
                    res(true)
                } else {
                    res(false)
                }
                console.log(`${storeName} has been cleared.`, event)
            }
            
            // 错误时的回调
            transaction.onerror = function() {
                console.error(`Error clearing ${storeName}`)
                rej()
            }
        })
    }
    
    /**
     * 判断当前是否存在对应的key
     *@param data.key
     *@param data.storeName
     * **/
    async checkKeyExists(data) {
        if (!data ||!data.storeName) {
            console.log("getAll: current no storeName!")
            return false
        }
        let {key,storeName} = data
        
        return new Promise((res,rej)=>{
            const transaction = this.db.transaction([storeName], "readonly")
            const objectStore = transaction.objectStore(storeName)
            const req = objectStore.get(key)
            req.onsuccess = function (event) {
                const result = req.result
                // 如果获取到了数据，则说明该键存在
                if (result) {
                    res(true)
                } else {
                    res(false)
                }
            }
            req.onerror = (err)=>{
                rej(false)
            }
        })
    }
}

export default IndexedDBService