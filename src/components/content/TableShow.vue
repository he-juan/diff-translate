<script setup>
import {ref, reactive, onMounted, onBeforeMount} from 'vue'
import { useCounterStore } from '@/stores/counter.js'
import { storeToRefs } from "pinia";
let counterStore = useCounterStore()
let { curFileType, currentOriginFileContent, currentLanguageType, currentDisplayContent, updateLanguageTypeContent, indexDB, getUpdateContent } = storeToRefs(counterStore)

let tableContainer = ref('') // 表格
let searchInput = ref('') // 当前搜索的术语
/******************** 针对样式处理 *****************************/

/**
 * 判断初始内容和设置内容阈值的大小
 * **/
function compareContentLen(data) {
    if (data?.string && data?.maxLength) {
        let dataLen = data.string?.length
        let threshold = data?.maxLength
        if (dataLen > threshold) {
            data.isOverMaxLen = true
            return true
        }
    }
    return false
}

/** 判断文字是否超出设置的阈值
 * @param event 事件
 * @param data 当前内容
 * 1.处理文字内容颜色
 * **/
function compareUpdateContentLen(event, data) {

    let target = event.target
    let content = target.value
    let maxLen = target.getAttribute('maxLen');
    if (!maxLen) {
        console.log("current no maxLen")
        return
    }

    if (content.length > maxLen) {
        if (!target.classList.contains('limit-text-len')) {
            target.classList.add('limit-text-len')
        }
        data.isOverMaxLen = true
    } else {
        if (target.classList.contains('limit-text-len')) {
            target.classList.remove('limit-text-len')
        }
        delete data.isOverMaxLen
    }
}

/**
 * 是否存在当前关键字
 * **/
function isExistCurrentKeysWord(content) {
    if (content?.notKeywordForOriginalFile) {
        return true
    } else {
        return false
    }
}

/**
 * 设置禁用
 * **/
function setDisabled(data) {
    return data.length >= 2 ? true: false
}

/**
 * 设置 title
 * @param content
 * **/
function setTitle(content){
    if (content?.notKeywordForOriginalFile) {
        return `原始文件中，当前 ${content.language} 类型语言针对此关键字不存在`
    }
    return null
}

/*********************** 点击事件 *********************************/

/**
 * 搜索next 下一个未翻译的关键字
 * **/
function nextUntranslatedKeyword(event) {
    let target = event.target
    let curLanguage = currentLanguageType.value.find( (lang) => target.classList.contains(lang))
    let keyWord = currentDisplayContent.value.map(content => {
        const item = content.find(({ string, language }) => string === '' && language === curLanguage)
        return item ? item.index : null
    }).find(index => index !== null)

   if (!keyWord) {
       alert(`当前${curLanguage}语言未翻译关键字的内容 不存在`)
       return
   } else {
      console.warn("keyword:",keyWord)
   }
   searchTable(keyWord)
}

/**
 * 搜索next 下一个超出设置最大值的关键字
 * **/
function nextExceedsMaxLenKeyword(event) {
    let target = event.target
    let curLanguage = currentLanguageType.value.find( (lang) => target.classList.contains(lang))
    let keyWord = currentDisplayContent.value.map(content => {
        const item = content.find(({ isOverMaxLen, language }) => isOverMaxLen && language === curLanguage)
        return item ? item.index : null
    }).find(index => index !== null)

    if (!keyWord) {
        alert(`当前${curLanguage}语言超出设置最大值关键字的内容 不存在`)
        return
    } else {
        console.warn("keyword:",keyWord)
    }
    searchTable(keyWord)
}


/**
 * 查找table中下一个内容
 * **/

function searchTable(keyWord) {
    let searchTerm = keyWord || searchInput.value.value.toLowerCase()// 搜索内容
    const rows = document.querySelectorAll('#dataTable tbody tr');

    let found = false;
    rows.forEach(row => {
        row.classList.remove('highlight')
        if (row.classList.contains(searchTerm)) {
            const offsetTop = row.offsetTop;
            const headerHeight = document.querySelector('thead').offsetHeight
            tableContainer.value.parentElement.scrollTop = offsetTop - headerHeight

            // Highlight the found row
            row.classList.add('highlight')
            found = true
            return
        }
    })

    if (!found) {
        alert('No matching rows found.');
    }
}

/**
 * 输入change事件，更新内容
 * @param event
 * @param curDisplayContent
 * **/
function updateChange(event, curDisplayContent) {
    event.preventDefault()
    event.stopPropagation()
    let target = event.target
    let content = target.value
    let maxLength = Number(target.getAttribute('maxLen'))
    let keysWord = typeof maxLength === 'number'? Number(target.getAttribute('type')): target.getAttribute('type')
    let langType = target.getAttribute('language')

    curDisplayContent.string = content

    updateCurrentContent({ langType, keysWord, content ,maxLength})
}

/**
 * 一键粘贴功能
 * @param event
 * @param preContent 前一个元素的数据内容
 * @param nextContent 后一个元素的数据内容
 * **/

function oneClickPaste(event, preContent, nextContent) {
    let target = event.target
    let curClickDirective // 表示当前点击粘贴的方向（左：后面元素的内容复制到前面元素； 右：前面的元素内容复制到后面元素）
    if (target.classList.contains('leftCopy')) {
        curClickDirective = 'left'
    } else if (target.classList.contains('rightCopy')) {
        curClickDirective = 'right'
    }

    // 兄弟元素，更新内容
    let brother
    let langType
    let isUpdate = false
    switch (curClickDirective) {
        case 'left':
            brother = target.parentElement.previousElementSibling.childNodes[0]
            isUpdate = brother.value !== nextContent.string
            brother.value = nextContent.string
            preContent.string = nextContent.string

            langType = preContent.language
            break
        case 'right':
            brother = target.parentElement.nextElementSibling.childNodes[0]
            isUpdate = brother.value !== preContent.string
            brother.value = preContent.string
            nextContent.string = preContent.string

            langType = nextContent.language
            break
       default:
         break
    }

    // 更新保存内容
    if (isUpdate) {
      let keysWord = (typeof preContent.maxLength === 'number' || typeof nextContent.maxLength === 'number') ? Number(target.getAttribute('type')) : target.getAttribute('type')
      let maxLength = (typeof preContent.maxLength === 'number' || typeof nextContent.maxLength === 'number') ? Number(preContent.maxLength) || Number(nextContent.maxLength) : ''

      updateCurrentContent({ langType, keysWord, content: brother.value, maxLength})
    }
}

/******************** 更新内容 ********************************/
/**
 * 更新内容
 * @param data.langType  语言类型
 * @param data.keysWord  关键字
 * @param data.content   更新内容
 * @param data.maxLength    最大值
 * **/
async function updateCurrentContent(data) {
    console.log("updateCurrentContent:", data)
    let { langType, keysWord, content, maxLength} = data

    // 首先判断当前是否存在该属性，如果不存在，在添加时，添加标识；
    let curContent = {index: keysWord, maxLength, string: content}

    // 更新原本保存的内容 update origin content
    await counterStore.$patch((state) => {
        state.currentOriginFileContent.content[langType].content[keysWord] = curContent
    })

    // 标记更新语言
    let isExistCurLang = `${langType}` in updateLanguageTypeContent.value.content

    if (!isExistCurLang) {
        await counterStore.$patch( async (state) => {
            state.updateLanguageTypeContent.content[langType] = {}
            state.updateLanguageTypeContent.content[langType][keysWord] = typeof maxLength === 'number' ? {keysWord, maxLength, content} : {keysWord, content}
        })

    } else {
        await counterStore.$patch( async (state) => {
           state.updateLanguageTypeContent.content[langType][keysWord] = typeof maxLength === 'number' ? {keysWord, maxLength, content} : {keysWord, content}
        })
    }

    // save content
    await indexDB.value.update({key: 'origin', content: currentOriginFileContent.value.content, storeName: 'store'})
    await indexDB.value.update({key: 'update', content: updateLanguageTypeContent.value.content, storeName: 'store'})
}

</script>

<template>
  <div class="table-container"  ref='tableContainer'
       v-if="counterStore.currentDisplayContent.length > 0"
  >
      <table id="dataTable">
          <colgroup span="2" >
              <col style="width: 220px;">
              <col>
              <col style="width: 150px;" v-if="currentLanguageType.length > 1">
              <col v-if="currentLanguageType.length > 1">
          </colgroup>

          <thead class="sticky">
              <tr>
                  <th rowspan="2">关键字</th>
                  <th v-for="(item, index) of currentLanguageType" :key="index"
                  >{{ item }}</th>
              </tr>
              <tr>
                  <th>
<!--                      <input ref="searchInput" @change="searchTable()"/>-->
                      <button
                          class="btn"
                          :class="`${currentLanguageType[0]}`"
                          @click="nextUntranslatedKeyword"
                      >跳转到下个未翻译的关键字</button>
                      <button

                          v-if="curFileType === 'lcd'"
                          class="btn"
                          :class="`${currentLanguageType[0]}`"
                          @click="nextExceedsMaxLenKeyword"
                      >跳转到下个超出最大值的关键字</button>
                  </th>
                  <th  v-if="currentLanguageType.length > 1"></th>
                  <th  v-if="currentLanguageType.length > 1">
                      <button
                          class="btn"
                          :class="`${currentLanguageType[currentLanguageType.length - 1]}`"
                          @click="nextUntranslatedKeyword"
                      >跳转到下个未翻译的关键字</button>
                      <button
                          v-if="curFileType === 'lcd' "
                          class="btn"
                          :class="`${currentLanguageType[currentLanguageType.length - 1]}`"
                          @click="nextExceedsMaxLenKeyword"
                      >跳转到下个超出最大值的关键字</button>
                  </th>
              </tr>

          </thead>
          <tbody>
               <tr v-for="(row, rowIndex) of currentDisplayContent" :key="rowIndex" class="table_tbody"
                   :id="`${row[0].index}`"
                   :class="`${row[0].index}`"
               >
                   <td class="sticky-column fontWeight-bolder" v-bind="{ type: row[0].index}" :title="row[0].index">
                      {{row[0].index}}
                   </td>

                   <td
                       v-bind="{ type: row[0].index, language: row[0].language}"
                       :class="{'setBackground_keysWord': isExistCurrentKeysWord(row[0])}"
                       :title="setTitle(row[0])"
                   >
                        <textarea
                            v-bind="{ type: row[0].index, language: row[0].language, maxLen:row[0]?.maxLength }"
                            :class="{'limit-text-len': compareContentLen(row[0]), 'setCurSor': setDisabled(row)}"
                            @change.stop="updateChange($event,row[0])"
                            @input="compareUpdateContentLen($event, row[0])"
                            class="content-full"
                        >{{row[0].string}}</textarea>
                   </td>

                   <td v-if="currentLanguageType.length >= 2"
                       v-for="(item, index) in row.length - 1" :key="index"
                       v-bind="{ type: row[index + 1].index }"
                       class="spaceAround"
                   >
                     <div class="icon leftCopy" @click.stop="oneClickPaste($event, row[0], row[index+1])"  v-bind="{ type: row[index + 1].index }"></div>
                     <div class="icon rightCopy" @click.stop="oneClickPaste($event, row[0], row[index+1])" v-bind="{ type: row[index + 1].index }"></div>
                   </td>

                   <td v-for="(item, index) in row.length - 1" :key="index"
                       v-bind="{ type: row[index + 1].index, language: row[index + 1].language }"
                       v-memo="[row[index + 1]]"
                       :class="{ [`text-${row[index + 1].index}-${row[index + 1].language}`]: row[index + 1], 'setBackground_keysWord': isExistCurrentKeysWord(row[index + 1])}"
                       :title="setTitle(row[index + 1])"
                       class="otherLanguage"
                   >
                       <textarea
                           v-bind="{ type: row[index + 1].index, language: row[index + 1].language, maxLen: row[index + 1].maxLength }"
                           :class="{'limit-text-len': compareContentLen(row[index + 1])}"
                           @change.stop="updateChange($event,row[index+1])"
                           @input="compareUpdateContentLen($event,row[index+1])"
                       >{{row[index+1].string}}</textarea>
                   </td>
               </tr>

          </tbody>
      </table>
  </div>
</template>

<style scoped>

.table-container {
  width: 100%;
  height: 100%;
  padding: 5px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/** 表格样式 ***/
table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  border-spacing: 0;
  border: 1px solid #DDDDDD;
  word-break: break-all;
}

table thead > th:nth-child(1), table tbody > td:nth-child(1) {;
  font-weight: bolder;
}

table thead > th:nth-child(1) textarea, table tbody > td:nth-child(1) textarea {
  text-align: center;
}

table thead > tr {
  background-color: #008c8c;
  color: #fff;
}

table thead tr > th {
  font-size: 20px;
  font-weight: bolder;
  border: 1px solid #999;
  padding: 10px;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.thead_head {
  display: flex;
  flex-direction: column;
}

.thead_head_language {
  width: 100%;
  height: 30px;
  border: 1px solid #999;
}

table tbody > tr > td {
  height: 60px;
  min-height: 60px;
  max-height: 60px;
  overflow-y: auto;
  border: 1px solid #999;
  text-align: center;

  white-space: nowrap;
  text-overflow: ellipsis;
  position: relative;
  scrollbar-width: none; /* 隐藏滚动条: 适用于Firefox浏览器  */
}

table tbody > tr > td::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}

.content-full{
  position: absolute;
  top: 0;
  left: 0;
}

.fontWeight-bolder{
  font-weight: bolder;
}

textarea {
  width: 100%;
  height:100%;
  line-height: 1.5;
  border:none;
  outline: none;
  resize: none;
  font-family: Arial, sans-serif;
  font-size: 16px;

  display: flex;
  justify-content: center;
  align-items:center;
}

.td-container > textarea:hover {
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.1) !important;
}

.table_tbody:hover * {
  background-color: #c2c2d0 !important; /* 浅黄色背景 */
}

/** 固定第一行 **/
table thead > tr > th {
  background-color: #3381d9;
  position: sticky;
  top: 0;
  z-index: 1;
}

table thead > tr:nth-child(2) > th {
  background-color: #3381d9;
  position: sticky;
  top: 53px;
  z-index: 2;
}


.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
}

/****************** 针对页面样式进行处理 ***************************/
.limit-text-len {
  color: red; /* 如果内容超过限制长度，显示红色 */
}

.setBackground_keysWord *{
  background-color: orange;
}

.spaceAround {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.icon {
  width: 30px;
  height: 30px;
  display: inline-block;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 30px;
}

.leftCopy {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB0PSIxNzIwNjYzNTUxODM4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjEzMDI2IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTQ1MC4yIDYxMy43bDg2LjUtODYuNS04Ni41LTg2LjVjLTEuMy0xLjMtMi4yLTMuMy0yLjItNS4xIDAtMS44IDAuOS0zLjcgMi4yLTUuMWwxMS0xMWMxLjMtMS4zIDMuMy0yLjIgNS4xLTIuMiAxLjggMCAzLjcgMC45IDUuMSAyLjJMNTc0IDUyMi4xYzEuMyAxLjMgMi4yIDMuMyAyLjIgNS4xIDAgMS43LTAuOSAzLjctMi4yIDUuMUw0NzEuMyA2MzQuOGMtMS4zIDEuMy0zLjMgMi4yLTUuMSAyLjItMS44IDAtMy44LTAuOS01LjEtMi4ybC0xMS0xMWMtMS4zLTEuMy0yLjItMy4xLTIuMi01LjEgMC4xLTEuNyAxLTMuNyAyLjMtNXoiIGZpbGw9IiMxMjk2ZGIiIHAtaWQ9IjEzMDI3Ij48L3BhdGg+PHBhdGggZD0iTTgwNy4xIDEzNi42YzQ3LjQgMCA4NiAzOC42IDg2IDg2djU3OC44YzAgNDcuNC0zOC42IDg2LTg2IDg2SDIxNi45Yy00Ny40IDAtODYtMzguNi04Ni04NlYyMjIuNmMwLTQ3LjQgMzguNi04NiA4Ni04Nmg1OTAuMm0wLTM0LjRIMjE2LjljLTY2LjUgMC0xMjAuNCA1My45LTEyMC40IDEyMC40djU3OC44YzAgNjYuNSA1My45IDEyMC40IDEyMC40IDEyMC40aDU5MC4zYzY2LjUgMCAxMjAuNC01My45IDEyMC40LTEyMC40VjIyMi42Yy0wLjEtNjYuNS01NC0xMjAuNC0xMjAuNS0xMjAuNHoiIGZpbGw9IiMxMjk2ZGIiIHAtaWQ9IjEzMDI4Ij48L3BhdGg+PC9zdmc+");
  transform: rotate(180deg)
}

.rightCopy {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB0PSIxNzIwNjYzNTUxODM4IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjEzMDI2IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTQ1MC4yIDYxMy43bDg2LjUtODYuNS04Ni41LTg2LjVjLTEuMy0xLjMtMi4yLTMuMy0yLjItNS4xIDAtMS44IDAuOS0zLjcgMi4yLTUuMWwxMS0xMWMxLjMtMS4zIDMuMy0yLjIgNS4xLTIuMiAxLjggMCAzLjcgMC45IDUuMSAyLjJMNTc0IDUyMi4xYzEuMyAxLjMgMi4yIDMuMyAyLjIgNS4xIDAgMS43LTAuOSAzLjctMi4yIDUuMUw0NzEuMyA2MzQuOGMtMS4zIDEuMy0zLjMgMi4yLTUuMSAyLjItMS44IDAtMy44LTAuOS01LjEtMi4ybC0xMS0xMWMtMS4zLTEuMy0yLjItMy4xLTIuMi01LjEgMC4xLTEuNyAxLTMuNyAyLjMtNXoiIGZpbGw9IiMxMjk2ZGIiIHAtaWQ9IjEzMDI3Ij48L3BhdGg+PHBhdGggZD0iTTgwNy4xIDEzNi42YzQ3LjQgMCA4NiAzOC42IDg2IDg2djU3OC44YzAgNDcuNC0zOC42IDg2LTg2IDg2SDIxNi45Yy00Ny40IDAtODYtMzguNi04Ni04NlYyMjIuNmMwLTQ3LjQgMzguNi04NiA4Ni04Nmg1OTAuMm0wLTM0LjRIMjE2LjljLTY2LjUgMC0xMjAuNCA1My45LTEyMC40IDEyMC40djU3OC44YzAgNjYuNSA1My45IDEyMC40IDEyMC40IDEyMC40aDU5MC4zYzY2LjUgMCAxMjAuNC01My45IDEyMC40LTEyMC40VjIyMi42Yy0wLjEtNjYuNS01NC0xMjAuNC0xMjAuNS0xMjAuNHoiIGZpbGw9IiMxMjk2ZGIiIHAtaWQ9IjEzMDI4Ij48L3BhdGg+PC9zdmc+");
}

.icon:hover {
  cursor: pointer;
}


.highlight * {
  background-color: yellow;
}

.btn {
  height: 35px;
  padding: 5px;
  border: none;
  border-radius: 5px;
  margin: 0 10px;
}
</style>