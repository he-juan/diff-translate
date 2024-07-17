<script setup>
import HelloWorld from './components/HelloWorld.vue'
import IndexShow from "@/components/content/Index.vue";

import { useCounterStore } from '@/stores/counter.js'
import { ref, reactive, onMounted, watch, computed } from 'vue'

let counterStore = useCounterStore()
let  tableContainer = ref('')
/**
 * 关于table滚动事件
 * **/
function scroll() {
  const rows = document.querySelectorAll('#dataTable tbody tr');
  const headerHeight = document.querySelector('thead')?.offsetHeight;

  let currentTopRowId = null;
  for (let row of rows) {
    const rowRect = row.getBoundingClientRect();
    const tableRect = tableContainer.value.getBoundingClientRect();

    if (rowRect.top >= tableRect.top + headerHeight) {
      currentTopRowId = row.id;
      break;
    }
  }

  // console.log('Current top row ID:', currentTopRowId);
}

</script>

<template>
  <div class="container">
    <header :class="{center: !counterStore.isLoading }"
    >
      <div class="wrapper watermark-container">
        <HelloWorld msg="请上传文件..." />
      </div>
    </header>

    <main
        v-if="counterStore.isLoading"
        @scroll="scroll()"
        ref="tableContainer"
    >
      <IndexShow />
    </main>
  </div>
</template>

<style scoped>
header {
  line-height: 1.5;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: center;
    flex-wrap: wrap;
  }
}

header {
  display: flex;
  place-items: center;
  padding-right: calc(var(--section-gap) / 2);
}


header .wrapper {
  display: flex;
  place-items: center;
  flex-wrap: wrap;
}

.container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

main{
  flex: 1;
  overflow-y: scroll;

  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
  margin-bottom: auto;
}

.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}


</style>
