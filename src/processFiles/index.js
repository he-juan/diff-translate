/************************** 解析文件内容 **********************************/

/**
 * 处理原始获取文件的内容
 * 对txt文件内容进行设置相同格式和属性
 * @return
 *     {
 *         {
 *             filename: '',
 *             language:'',
 *             languageContraction:'',
 *             rtl: '',
 *             content: {                   // 翻译内容
 *                 en: {
 *                     index:'',
 *                     maxLength: '',
 *                     string: ''
 *                 }
 *             }
 *         }
 *     }
 * **/
async function handleProcessTxtFile(param) {
    let getCurrentTypeAllContents = {}
    for (let i = 0; i < param.length; i++) {
        let language;
        let item = param[i]
        let changeData = {
            name: item.name,
            language: '',
            rtl: '',
            languageContraction: '',
            content: {},
            string: ''
        }
        
        let handleContent = () => {
            const startChar = 'STRING'
            if (item.content.indexOf(startChar) !== -1) {
                let startIndex = item.content.indexOf (startChar) + 7;      // 找到起始字符的索引并加1
                let substring = item.content.substring (startIndex);        // 从起始字符后开始截取
                return substring.toString ().split ('\n')
            }
            return null
        }
        
        let handleHeaderContent = () => {
            const startChar = 'INDEX'
            let startIndex = item.content.indexOf (startChar) - 1 // 找到起始字符的索引并加1
            let substring = item.content.substring (0, startIndex) || item.content; // 从起始字符后开始截取
            return substring.toString ().split (',')
        }
        
        let headerContent = await handleHeaderContent()
        language = headerContent[0].trim().slice(1,-1)
        changeData.language = language.toLowerCase()
        changeData.rtl = headerContent.length > 3 ? headerContent[2].trim(): ''
        changeData.languageContraction = headerContent[1].trim()
        changeData.string = item.content
        
        let content = await handleContent()
        
        if (!content) {
            console.log("current file no content, fileName:",item.type)
            getCurrentTypeAllContents[language] = changeData
            continue;
        }
        
        // 优化格式
        for (const key in content) {
            let item = content[key]
            
            /**
             * 去除双引号: 检查字符串是否以单引号或双引号开头和结尾
             * **/
            let removeOuterQuotes = (str) => {
                if ((str?.startsWith("'") && str?.endsWith("'")) || (str?.startsWith('"') && str?.endsWith('"'))) {
                    // 去除最外层引号
                    return str.slice(1, -1);
                }
                return str?.trim();
            }
            
            /**
             * 获取第一个大括号里面的内容
             * **/
            let getFirstBraceContent = (str)=> {
                const regex = /{([^}]+)}/;
                const match = str?.match(regex);
                return match ? match[1] : null;
            }
            
            let handleContent = (value) => {
                
                const changeItemMatch = getFirstBraceContent(value.trim())
                if (changeItemMatch) {
                    const itemArray = changeItemMatch ? changeItemMatch.split(',') : []
                    if (itemArray.length > 0) {
                        let index = parseInt(itemArray[0], 10)
                        let maxLength = parseInt(itemArray[1], 10)
                        let curContent = itemArray.length > 3 ? removeOuterQuotes(itemArray.slice(2).join()) : itemArray[2]?.trim() !== '""' ? itemArray[2].trim() : null
                        let string = removeOuterQuotes(curContent) ||  curContent?.substring(0, curContent?.length - 1)
                        changeData.content[index] = { index, maxLength, string }
                    }
                }
            }
            handleContent(item);
        }
        
        getCurrentTypeAllContents[language] = changeData
    }
    
    return getCurrentTypeAllContents
}

/**
 * 对js 文件内容进行设置相同格式和属性
 * 保证js 文件数据结构类型和txt 文件结构一致；
 * **/

function handleProcessJsFile(data){
    console.log("handleProcessJsFile:",data)
    for (let lang in data) {
        let item = data[lang].content
        let newContent = {}
        for (let key in item ) {
            let content= {}
            content.index = key
            content.maxLength = ''
            content.string = item[key]
            newContent[key] = content
        }
        data[lang].content = newContent
    }
    
    return data
}

/**
 * （1）处理当前内容转换成数组
 * （2）针对两个不同的语言查找对应的关键字并显示内容
 * @param data 对象类型
 * **/
function handleProcessFileLanguage(data) {
    console.log("handleProcessFileLanguage:",data)
    let languageArray = Object.keys(data)
    
    // 获取当前两种语言类型的所有关键字
    let keysWord = languageArray.length === 1 ?  getUniqueKeys(data[languageArray[0]].content): getUniqueKeys(data[languageArray[0]].content, data[languageArray[1]].content)
    let newLangContent = {}
    for(let language of languageArray){
        newLangContent[language] = data[language]
    }
    
    // 更新数据的类型，遍历所有键
    let result = []
    for (let i = 0; i < keysWord.length; i++) {
        let curKey = keysWord[i]
        const items = []
        
        // 遍历所有语言
        for (let j = 0; j < languageArray.length; j++) {
            let curLang = languageArray[j]
            let otherLang = languageArray[j - 1] || languageArray[j + 1]
            let curLangContent = newLangContent[curLang]?.content
            let item = {}
            item.index =  curKey || curLangContent && curLangContent[curKey]?.index ;
            item.language = curLang
            item.maxLength = curLangContent && curLangContent[curKey]?.maxLength || newLangContent[otherLang]?.content[curKey]?.maxLength
            item.string = curLangContent && curLangContent[curKey]?.string || ''
            if (!item.string) {
                item.notKeywordForOriginalFile = true
            }
            items.push(item)
        }
        
        result.push(items)
    }
    
    return result
}

/**
 * 合并对象的key，并确保唯一
 * **/
function getUniqueKeys(objArray1, objArray2) {
    let key1 = objArray1 ? Object.values(objArray1)?.map(key => key.index) : []
    let key2 = objArray2 ? Object.values(objArray2)?.map(key => key.index) : []
    
    let keys = key1.concat(key2)
    keys = new Set(keys)
    return [...keys]
}


/**
 * 解析原始文件
 * @param data
 * @param fileType
 * **/
async function beginParsing(data, fileType) {
    
    let updateContent
    switch (fileType) {
        case 'lcd':
            updateContent = await handleProcessTxtFile(data)
            break
        case 'web':
            let newObjJsFile = {}
            for (let file of data) {
                eval(file.content)
                let languageType = file.name.split('.')[1].toLowerCase()
                let content = window['GRP_LOCALES'][languageType]
                newObjJsFile[languageType] = { name: file.name, language: languageType, content: content, string: file.content }
            }
            updateContent = await handleProcessJsFile(newObjJsFile)
            break
        default:
            console.warn("current content no parse")
            break
    }
    console.warn("updateContent:",updateContent)
    return updateContent
}

/******************************* 处理下载内容 **********************************************/

/**
 * 针对不同类型文件下载时做匹配处理
 * @param data.originContent
 * @param data.updateContent
 * @param data.curFileType 当前文件类型
 * @param data.isClearUpdateContent 可选 是否清除当前保存内容
 * ***/
function processDownloadFileAsync(data) {
    let { curFileType } = data
    
    //判断当前文件类型
    switch (curFileType) {
        case 'lcd':
            processLcdTypeFileDownLoad(data)
            break
        case 'web':
            processWebTypeFileDownLoad(data)
            break
        default:
            console.log("No match found for the file type")
            break
    }
    
}

/**
 * 下载：匹配 lcd 类型文件相关内容并下载
 * @param data.originContent
 * @param data.updateContent
 * @param data.isClearUpdateContent 可选 是否清除当前保存内容
 * **/
async function processLcdTypeFileDownLoad(data) {
    let { originContent, updateContent } = data

    if (Object.keys(updateContent).length === 0) {
        console.log("lcd type  content no update")
        return
    }
    
    // 匹配字符串内容
    let replaceContentInPattern = (str, targetNumber, maxLen, newContent) => {
        // 构建正则表达式，用于匹配特定格式的字符串
        let regex = new RegExp(`{${targetNumber},${maxLen}, ['"]([^'"]+)['"]}`);
        
        // 使用正则表达式查找并替换匹配的内容
        let newStr = str.replace(regex, `{${targetNumber},${maxLen}, "${newContent}"}`);
        
        // 如果没有匹配到内容，则在字符串末尾添加新的内容
        if (!regex.test(str)) {
            newStr += `\r\n{${targetNumber},${maxLen}, "${newContent}"},`;
        }
        
        return newStr
    }
    
    for (let lang in updateContent) {
        let curLangContent = updateContent[lang]
        for (let key in curLangContent) {
            let content = curLangContent[key]
            let string = content.content
            let maxLen = content.maxLength
            let langObj = originContent[lang].string
            originContent[lang].string =  await replaceContentInPattern(langObj, Number(key), maxLen, string)
        }
        await processDownloadFile({content: originContent[lang].string, langType: lang, mimeType: 'text/javascript', fileType: 'lcd'})
    }
}

/**
 * 下载：匹配 web类型文件相关内容并下载
 * @param data.originContent
 * @param data.updateContent
 * @param data.isClearUpdateContent 可选 是否清除当前保存内容
 * **/
async function processWebTypeFileDownLoad(data) {
    let {originContent, updateContent} = data

    if (Object.keys (updateContent).length === 0) {
        console.log ("web type  content no update")
        return
    }
    
    // 查找最外层的括号
    let removeOuterBrace = (str) => {
        // 查找最外层的闭合括号
        const closingBraceIndex = str.match(/}[^}]*$/)
        // 如果找到了闭合括号，删除它，否则返回原字符串
        return closingBraceIndex ? str.slice(0, closingBraceIndex.index) : str
    }
    
    /** 判断当前字符最后是否存在换行符，
     * 若存在,就换成逗号，
     * 若不存在，就添加逗号，
     **/
    let clearEndOfLineAndAddComma = (str) => {
        // 清除字符串最后的所有空白字符,在末尾添加逗号
        return str.replace(/\\s+$/, '')
    }
    
    // 匹配字符串内容
    let replaceContentInPattern = (key, string, content) => {
        let newStr
        // 使用正则表达式检查是否存在匹配项
        let regex = new RegExp(`'${key}': '[^']*'`)
        if (regex.test(content)) {
            newStr = content.replace(regex, `'${key}': '${string}'`)
        } else {
            let replacement = `  '${key}': '${string}'` // 添加时需要空格
            let str = removeOuterBrace(content) // 输出删除最外面层的大括号之前的字符串
            str = clearEndOfLineAndAddComma(str) // 清除字符串最后的所有空白字符
            newStr = str +  replacement + ',\r\n' + '}'
        }
        
        return newStr
    }
    
    for (let lang in updateContent){
        let item = updateContent[lang]
        for (let key in item) {
            let string = item[key].content
            let content = originContent[lang].string
            originContent[lang].string = await replaceContentInPattern(key, string, content)
        }
        await processDownloadFile({content: originContent[lang].string, langType: lang, mimeType: 'text/javascript', fileType: 'web'})
    }
}

/**
 * 处理下载内容流程
 * @param data.content
 * @param data.mimeType
 * @param data.langType
 * @param data.fileType
 * **/
function processDownloadFile(data) {
    console.log("process Download File:",data)
    if (!data || !data.content) {
        console.warn("current handle down files: invalid param")
        return
    }
    
    let {content, fileType, langType, mimeType} = data
    let myBlob = new Blob([content], { type: mimeType })
    let myUrl = window.URL.createObjectURL(myBlob)
    downloadFile({url: myUrl, fileName: langType, fileType: fileType})
}

/**
 * 文件下载
 * @param data.url
 * @param data.fileName
 * @param data.fileType
 * **/
function downloadFile(data){
    console.log("down load file:",data)
    let { url, fileName, fileType} = data
    let suffixName = fileType === 'lcd'? 'txt': 'js'
    let prefixName = fileType === 'lcd'? 'display': 'locale'
    let updateFileName = fileType === 'lcd' ? `${fileName}_${prefixName}.${suffixName}`: `${prefixName}.${fileName}.${suffixName}`
    console.log("download type is ", data.fileType + ', current file name is ', updateFileName)
    
    let a = document.createElement('a')
    a.href = url
    a.download = updateFileName // 下载后文件名
    document.body.appendChild(a)
    a.click() // 点击下载
    document.body.removeChild(a) // 下载完成移除元素
}

/**
 * 将指定属性移至对象的开头
 * @param {Object} obj 要操作的对象
 * @param {string} prop 要移动的属性名
 */
function movePropertyToFront(obj, prop) {
    // 检查对象是否具有指定属性
    if (obj.hasOwnProperty(prop)) {
        // 存储属性值和属性名
        const value = obj[prop]
        const key = prop
        
        // 删除原属性
        delete obj[prop]
        
        // 创建一个新对象，将指定属性放在开头，其余属性随后
        return { [key]: value,...obj }
    }
    
    return obj
}

export {
    beginParsing,
    handleProcessFileLanguage,
    processDownloadFileAsync,
    movePropertyToFront,
}