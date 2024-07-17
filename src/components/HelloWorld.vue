<script setup>
import {ref, reactive, onBeforeMount} from 'vue'
import { beginParsing, processDownloadFileAsync, movePropertyToFront } from "@/processFiles/index.js"
import IndexedDBService from "@/storage/indexDB.js"
// import getLocalLanguage from "@/assets/locales/language.js";

import { storeToRefs } from 'pinia';
import { useCounterStore } from '@/stores/counter.js'

let counterStore = useCounterStore()
let { curFileType, currentOriginFileContent, updateLanguageTypeContent, indexDB, getUpdateContent } = storeToRefs(counterStore)

defineProps({
    msg: {
      type: String,
      required: true
    }
})

let uploadArea = ref() // 区域元素
let fileInput = ref() // input元素

/**
 * 文件拖拽事件
 * **/
function handleDrag(e) {
    e.preventDefault()
    handleJudgeUpData()
    fileInput.value.files = e.dataTransfer.files
    porcessFiles(e.dataTransfer.files)
}

function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
}

/**
 * 处理区域点击事件
 * **/
function handleAreaClick(event) {
    event.stopPropagation() // 阻止事件冒泡
    event.preventDefault()  // 阻止事件捕获
    handleJudgeUpData()
    fileInput.value.click()
}

/**
 * 判断当前是否存在更新的内容，若存在，则下载
 * **/
function handleJudgeUpData () {
    let isExist = Object.keys(updateLanguageTypeContent.value.content)
    if (isExist) {
        processDownloadFileAsync({ originContent: currentOriginFileContent.value.content, updateContent: updateLanguageTypeContent.value.content, curFileType: curFileType.value })
    }
}
/**
 * 处理input 更改事件
 * @param content
 * **/
async function porcessFiles(content) {
    const files = !content ? Array.from(fileInput.value.files) : Array.from(content)
    const fileContents = []

    if (files.length === 0 ) {
        alert('请选择文件')
        return
    }

    if (files.length > 2) {
        alert('最多选择两个文件')
        return
    }

    if (!(files.every(item => item.name.endsWith('.js')) || files.every(item => item.name.endsWith('.txt')))) {
        alert('请选择正确类型文件、或者文件内容结构相同的文件')
        return
    }

   await setCurFileType(files)

    // 读取文件内容
    for (let item of files) {
        const reader = new FileReader();
        reader.onload = (event) => {
            fileContents.push({name: item.name, content: event.target.result});
            if (fileContents.length === files.length) {
                displayContent(fileContents)
            }
        }
        reader.readAsText(item);
    }
}

/**
 * 展示内容
 * **/
async function displayContent(fileContents) {
    let content = await beginParsing(fileContents, curFileType.value)
    let languageArray = ['ar', 'ca', 'cz', 'de', 'el', 'en', 'es', 'fr', 'he', 'hr', 'hu', 'it', 'ja', 'ko', 'lv', 'nl', 'pl', 'pt', 'ru', 'se', 'sl', 'sv', 'tr', 'uk', 'vn', 'zh', 'zh-tw']

    let isExclude =  Object.keys(content)?.every(item => languageArray.includes(item.toLowerCase()))
    if (!isExclude) {
      alert("当前文件内容不是语言文件，请更换文件")
      return
    }

    // 将英语放在最前面
    let updateContent = await movePropertyToFront(content, 'en')
    // 设置新的内容
    await counterStore.setOriginFileContent(updateContent)
}

/**
 * 设置当前文件类型
 * @param data
 * **/
function setCurFileType(data) {
    if (data?.every(item => item.name.endsWith('.js'))) {
        counterStore.$patch((state) => {
            state.curFileType = 'web'
        })
    } else if (data.every(item => item.name.endsWith('.txt'))) {
        counterStore.$patch((state) => {
            state.curFileType = 'lcd'
        })
    }
}

/***************************** 针对样式 做处理的函数 ***********************************/

/**
 * 针对当前原始文件存在改变页面的布局样式
 * **/
function isExistOriginContent(data) {
    let content = data.value === undefined ? Object.keys(data) :Object.keys(data.value)
    let result = false

    if (content.length > 0) {
        result = true
    }

    return result
}

/**************事件处理***************/
function startDownLoad() {
    processDownloadFileAsync({ originContent: currentOriginFileContent.value.content, updateContent: updateLanguageTypeContent.value.content, curFileType: curFileType.value })
}

/**
 * 清除indexDB
 * **/
async function clearIndexDB() {
  await counterStore.clearStateContent()
  await counterStore.$patch((state)=>{
      state.isLoading = false
  })
}

/**
 * 创建indexDB
 * **/
async function createIndexDB() {

  if (indexDB.value) {
    console.warn(" current indexDB exist")
    return
  }

  // 1. 先初始化indexDB
  let dbService = new IndexedDBService ('dataBase', 1)
  try {
    await dbService.initDB()
    console.log('Database initialized')
  } catch (error) {
    console.error('Failed to initialize database', error)
  }

  // 2. 将indexDB 存放在pinia 中
  await counterStore.$patch ((state) => {
    state.indexDB = dbService
  })
}

/**
 * 根据indexDB，重新加载时恢复原本内容
 * **/
async function updateStateContent() {
  let data = await indexDB.value.getAll({storeName: 'store'})
  console.log("get indexDB save data:",data)
  if (data.origin) {
    await counterStore.$patch((state) => {
      state.currentOriginFileContent.content = data.origin
    })

    await setCurFileType(Object.values(data.origin))
  } else if(data.update) {
    await counterStore.$patch((state) => {
      state.updateLanguageTypeContent.content = data.update
    })
  }
  await counterStore.showFileContent(data.origin)
}

onBeforeMount( async () => {
    await createIndexDB()
    let isExist = await indexDB?.value?.checkKeyExists ({key: 'origin', storeName: 'store'})
    if (isExist) {
      await updateStateContent()
    }
})

</script>

<template>
    <div class="greetings">
      <div
          class="uploadArea"
          ref="uploadArea"
          :class="{ updateUploadAreaStyle: counterStore.isLoading }"
          @click.stop="handleAreaClick($event)"
          @drop.stop="handleDrag($event)"
          @dragover.stop="handleDragOver($event)"
      >{{ msg }}</div>
      <input type="file" ref="fileInput" multiple style="display: none;" @change="porcessFiles()">
        <div class="right" v-if="counterStore.isLoading">
            <div class="rightContainer">
                <div class="wrapper marginContent">
                  <div class="circle"></div>
                  <div class="textContent backgroundColorRed">注意：文字为 <b class="red">“红色” </b> 表示超过设置的最大值</div>
                </div>

                <div class="wrapper marginContent">
                    <div class="wrapper">
                      <div class="circle"></div>
                      <div class="textContent backgroundColorOrange">注意：背景色为 <b class="red">“橙色” </b> 表示当前关键字在原始语言文件不存在</div>
                    </div>
                </div>

                <div class="wrapper marginContent">
                  <div class="circle"></div>
                  <div class="textContent">注意：当更新后的内容不需要且不需要导出时，请点击<strong class="red">
                              <span class="refreshWrapper" @click.stop="clearIndexDB()">
                                <span class="refresh"></span>
                              </span>
                  </strong>按钮，回到之前的界面 </div>
                </div>

            </div>
        </div>

        <div v-if="Object.keys(updateLanguageTypeContent?.content).length > 0">
          <div class="icon downLoad" @click="startDownLoad()"></div>
        </div>

    </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
.greetings{
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.uploadArea {
  width: 800px;
  height: 400px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  cursor: pointer;
  margin: 20px;
  user-select: none;
  font-weight: bolder;
  font-size: 20px;
  padding: 10px;
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3),-2px -2px 10px rgba(255, 255, 255, 0.3);
  padding: 10px;
  text-align: center;
  color: #0087F7;
}

.updateUploadAreaStyle {
  width: 180px;
  height: 30px;
  border: 1px dashed #0087F7;
}

.icon {
  width: 30px;
  height: 30px;
  display: inline-block;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 30px;
}

.downLoad {
  background-image: url("data:image/svg+xml;base64,PHN2ZyB0PSIxNzIwNjY1MzQ4ODA0IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE0NTA3IiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHBhdGggZD0iTTQ5MS41MiA4NTguMTEybC0xMDguNTQ0LTEwNi40OTZjLTguMTkyLTguMTkyLTIwLjQ4LTguMTkyLTI4LjY3MiAwLTguMTkyIDguMTkyLTguMTkyIDIwLjQ4IDAgMjguNjcybDEzOS4yNjQgMTM1LjE2OGMwIDIuMDQ4IDIuMDQ4IDYuMTQ0IDQuMDk2IDguMTkyIDQuMDk2IDQuMDk2IDEwLjI0IDYuMTQ0IDE2LjM4NCA2LjE0NCA2LjE0NCAwIDEyLjI4OC0yLjA0OCAxNi4zODQtNi4xNDQgMi4wNDgtMi4wNDggNC4wOTYtNC4wOTYgNC4wOTYtOC4xOTJsMTM5LjI2NC0xMzUuMTY4YzguMTkyLTguMTkyIDguMTkyLTIwLjQ4IDAtMjguNjcyLTguMTkyLTguMTkyLTIwLjQ4LTguMTkyLTI4LjY3MiAwbC0xMTAuNTkyIDEwOC41NDR2LTM2OC42NGMwLTEyLjI4OC04LjE5Mi0yMC40OC0yMC40OC0yMC40OHMtMjAuNDggOC4xOTItMjAuNDggMjAuNDh2MzY2LjU5MnogbS0zOTkuMzYtMzQ0LjA2NHYtMzA3LjJjMC00NS4wNTYgMzYuODY0LTgxLjkyIDgxLjkyLTgxLjkyaDY3NS44NGM0NS4wNTYgMCA4MS45MiAzNi44NjQgODEuOTIgODEuOTJ2MzA3LjJjMCA0NS4wNTYtMzYuODY0IDgxLjkyLTgxLjkyIDgxLjkyaC05Ni4yNTZjLTEyLjI4OCAwLTIwLjQ4IDguMTkyLTIwLjQ4IDIwLjQ4czguMTkyIDIwLjQ4IDIwLjQ4IDIwLjQ4aDk2LjI1NmM2Ny41ODQgMCAxMjIuODgtNTUuMjk2IDEyMi44OC0xMjIuODh2LTMwNy4yYzAtNjcuNTg0LTU1LjI5Ni0xMjIuODgtMTIyLjg4LTEyMi44OGgtNjc1Ljg0Yy02Ny41ODQgMC0xMjIuODggNTUuMjk2LTEyMi44OCAxMjIuODh2MzA3LjJjMCA2Ny41ODQgNTUuMjk2IDEyMi44OCAxMjIuODggMTIyLjg4di00MC45NmgtNC4wOTZ2NDAuOTZoMTAyLjRjMTIuMjg4IDAgMjAuNDgtOC4xOTIgMjAuNDgtMjAuNDhzLTguMTkyLTIwLjQ4LTIwLjQ4LTIwLjQ4aC05OC4zMDRjLTQ1LjA1NiAwLTgxLjkyLTM2Ljg2NC04MS45Mi04MS45MnogbTI5Ni45Ni0yMzcuNTY4Yy0xMi4yODggMC0yMC40OCA4LjE5Mi0yMC40OCAyMC40OHM4LjE5MiAyMC40OCAyMC40OCAyMC40OGgyNDUuNzZjMTIuMjg4IDAgMjAuNDgtOC4xOTIgMjAuNDgtMjAuNDhzLTguMTkyLTIwLjQ4LTIwLjQ4LTIwLjQ4aC0yNDUuNzZ6IiBmaWxsPSIjMTI5NmRiIiBwLWlkPSIxNDUwOCI+PC9wYXRoPjwvc3ZnPg==");
}

.refreshWrapper {
  padding: 0 5px;
}

.refresh {
  width: 24px;
  height: 24px;
  display: inline-block;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: 24px;
  background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzIwNzY2ODU4MDk0IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE1ODI3IiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiPjxwYXRoIGQ9Ik05MjcuOTk5NDM2IDUzMS4wMjg1MjJhMzEuOTk4OTg0IDMxLjk5ODk4NCAwIDAgMC0zMS45OTg5ODQgMzEuOTk4OTg0YzAgNTEuODUyOTQ4LTEwLjE0NzM0MSAxMDIuMTM4MDk4LTMwLjE2Mzg2NSAxNDkuNDYxMDQ4YTM4NS40NzI1MiAzODUuNDcyNTIgMCAwIDEtMjA0LjM3NzM0NSAyMDQuMzc3MzQ1Yy00Ny4zMjI5NSAyMC4wMTY1MjQtOTcuNjA4MSAzMC4xNjM4NjUtMTQ5LjQ2MTA0OCAzMC4xNjM4NjVzLTEwMi4xMzgwOTgtMTAuMTQ3MzQxLTE0OS40NjEwNDgtMzAuMTYzODY1YTM4NS40NzI1MiAzODUuNDcyNTIgMCAwIDEtMjA0LjM3NzM0NS0yMDQuMzc3MzQ1Yy0yMC4wMTY1MjQtNDcuMzIyOTUtMzAuMTYzODY1LTk3LjYwODEtMzAuMTYzODY1LTE0OS40NjEwNDhzMTAuMTQ3MzQxLTEwMi4xMzgwOTggMzAuMTYzODY1LTE0OS40NjEwNDhhMzg1LjQ3MjUyIDM4NS40NzI1MiAwIDAgMSAyMDQuMzc3MzQ1LTIwNC4zNzczNDVjNDcuMzIyOTUtMjAuMDE2NTI0IDk3LjYwODEtMzAuMTYzODY1IDE0OS40NjEwNDgtMzAuMTYzODY1YTM4Ny4zNzk4ODggMzg3LjM3OTg4OCAwIDAgMSA1OS4xOTM0MjQgNC41MzM2MTFsLTU2LjUzODI4MiAyMi4wMzU4NzhBMzEuOTk4OTg0IDMxLjk5ODk4NCAwIDEgMCA1MzcuODkyMTU2IDI2NS4yMzI0OTFsMTM3LjA0MTQ4My01My40MDI2ODVhMzEuOTk4OTg0IDMxLjk5ODk4NCAwIDAgMCAxOC4xOTU4NTUtNDEuNDM0Njc0TDYzOS43MjMxOTcgMzMuMzU3MjYxYTMxLjk5ODk4NCAzMS45OTg5ODQgMCAxIDAtNTkuNjMwNTI5IDIzLjIzODgybDI2LjY5NTkyMyA2OC41MDI2NzlhNDQ5Ljk2OTAwNSA0NDkuOTY5MDA1IDAgMCAwLTk0Ljc4Njc4NS0xMC4wNjA2NDJjLTYwLjQ2NTAwMyAwLTExOS4xMzgyMzYgMTEuODQ4OC0xNzQuMzkwNDg5IDM1LjIxNzY2N2E0NDkuMjE0MDA1IDQ0OS4yMTQwMDUgMCAwIDAtMjM4LjM4ODQ1NyAyMzguMzg4NDU3Yy0yMy4zNjE2NDMgNTUuMjUyMjUzLTM1LjIyMTI4IDExMy45MjU0ODYtMzUuMjIxMjggMTc0LjM5MDQ4OXMxMS44NDg4IDExOS4xMzgyMzYgMzUuMjE3NjY4IDE3NC4zOTA0ODlhNDQ5LjIxNDAwNSA0NDkuMjE0MDA1IDAgMCAwIDIzOC4zODg0NTcgMjM4LjM4ODQ1N2M1NS4yNTIyNTMgMjMuMzY4ODY3IDExMy45MjU0ODYgMzUuMjE3NjY3IDE3NC4zOTA0ODkgMzUuMjE3NjY3czExOS4xMzgyMzYtMTEuODQ4OCAxNzQuMzkwNDg5LTM1LjIxNzY2N0E0NDkuMjEwMzkzIDQ0OS4yMTAzOTMgMCAwIDAgOTI0Ljc4NDM2NSA3MzcuNDI1MjJjMjMuMzY4ODY3LTU1LjI3MDMxNiAzNS4yMTc2NjctMTEzLjkyNTQ4NiAzNS4yMTc2NjctMTc0LjM5MDQ4OWEzMS45OTg5ODQgMzEuOTk4OTg0IDAgMCAwLTMyLjAwMjU5Ni0zMi4wMDYyMDl6IiBmaWxsPSIjMTI5NmRiIiBwLWlkPSIxNTgyOCI+PC9wYXRoPjwvc3ZnPg==");
  z-index: 2;
}


/*******/
.right {
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: start;
}

.rightContainer {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.wrapper {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.marginContent {
  padding: 2px;
  margin: 0 5px;
}

.textContent {
  display: flex;
  align-items: center;
  justify-content: start;
  flex-shrink: 0;
}

.circle {
  width: 10px;      /* 设置元素的宽度 */
  height: 10px;     /* 设置元素的高度 */
  border-radius: 50%; /* 设置圆角半径为50%，得到圆形 */
  background-color:red;
  border: 0; /* 设置边框的宽度和颜色 */
  display: inline-block; /* 使元素呈现为行内块元素 */
  margin-right: 5px;
  flex-shrink: 0;
}

.backgroundColorRed {
  background-color: red;
}

.backgroundColorOrange {
  background-color: orange ;
}


</style>
