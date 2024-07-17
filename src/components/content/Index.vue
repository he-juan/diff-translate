<script setup>
import {defineAsyncComponent, onBeforeMount, onMounted, Suspense} from "vue";

const TableShow = defineAsyncComponent(()=>import('@/components/content/TableShow.vue'))

onBeforeMount(async ()=>{
  console.warn("suspense 组件：")
})


</script>

<template>
    <Suspense>
        <template v-slot:default>
            <TableShow/>
        </template>
        <template v-slot:fallback>
            <h3>加载中......</h3>
        </template>
    </Suspense>
</template>

<style scoped>

h3{
  text-align:center;
  font-size: large;
  font-weight: bolder;
  font-size: 24px;
}
</style>