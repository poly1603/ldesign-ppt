<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'

const props = defineProps<{
  file: File | null
}>()

const containerRef = ref<HTMLElement | null>(null)
let blobUrl: string | null = null

// Global jQuery
declare const $: any

function render() {
  if (!props.file || !containerRef.value) return

  // Cleanup previous blob url
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
  }

  // Create new blob url
  blobUrl = URL.createObjectURL(props.file)

  // Clear container
  containerRef.value.innerHTML = ''

  // Create wrapper div
  const wrapper = document.createElement('div')
  wrapper.className = 'pptxjs-wrapper'
  containerRef.value.appendChild(wrapper)

  try {
    console.log('[PPTXJs] Rendering file:', props.file.name, blobUrl)
    // Make sure wrapper is in DOM
    if (!containerRef.value.contains(wrapper)) {
      console.warn('[PPTXJs] Wrapper not in DOM?')
    }

    $(wrapper).pptxToHtml({
      pptxFileUrl: blobUrl,
      slidesScale: "100%", // Fix scale
      slideMode: false,
      keyBoardShortCut: false,
      mediaProcess: true,
      jsZipV2: false,
      themeProcess: true,
      slideType: "divs2slidesjs",
      slideModeConfig: {
        first: 1,
        nav: false,
        navTxtColor: "white",
        showPlayPauseBtn: false,
        keyBoardShortCut: false,
        showSlideNum: false,
        showTotalSlideNum: false,
        autoSlide: false,
        randomAutoSlide: false,
        loop: false,
        background: "black",
        transition: "default",
        transitionTime: 1
      }
    })
    console.log('[PPTXJs] pptxToHtml called')
  } catch (e) {
    console.error('[PPTXJs] Render error:', e)
    if (containerRef.value) {
      containerRef.value.innerHTML = `<div class="error">PPTXjs 渲染失败: ${e}</div>`
    }
  }
}

watch(() => props.file, () => {
  // Add a small delay to ensure DOM is ready if needed, or just call render
  setTimeout(render, 100)
})

onMounted(() => {
  render()
})

onUnmounted(() => {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl)
  }
})
</script>

<template>
  <div class="pptxjs-container" ref="containerRef">
    <div v-if="!file" class="empty">请选择文件</div>
  </div>
</template>

<style scoped>
.pptxjs-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #333;
  /* Dark background to match slides usually */
  padding: 20px;
}

.empty {
  color: white;
  text-align: center;
  margin-top: 50px;
}

/* Scoped styles might not affect pptxjs generated content heavily, relying on global css injected in index.html */
:deep(.pptxjs-wrapper) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
</style>
