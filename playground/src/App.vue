<script setup lang="ts">
import { ref, computed } from 'vue'
import { PPTViewer } from '@ldesign/ppt-vue'
import PPTXJsRenderer from './PPTXJsRenderer.vue'
import type { Presentation, Slide } from '@ldesign/ppt-core'

// State
const file = ref<File | null>(null)
const presentation = ref<Presentation | null>(null)
const currentSlide = ref(0)
const totalSlides = ref(0)
const isLoading = ref(false)
const error = ref<string | null>(null)
const isDragging = ref(false)
const renderer = ref<'custom' | 'pptxjs'>('custom') // 'custom' or 'pptxjs'

// Computed
const fileName = computed(() => file.value?.name || 'No file selected')
// ... (rest of computed properties)

// ... (rest of functions: handleFileSelect, handleDragOver, etc.)

// Load file
function loadFile(f: File) {
  file.value = f
  error.value = null
  if (renderer.value === 'custom') {
    isLoading.value = true
  }
  console.log('Loading file:', f.name, 'Size:', (f.size / 1024 / 1024).toFixed(2), 'MB')
}

// ... (rest of functions)

// Handle renderer change
function handleRendererChange(event: Event) {
  const target = event.target as HTMLSelectElement
  renderer.value = target.value as 'custom' | 'pptxjs'
}

</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <h1><span>@ldesign/ppt</span> Playground</h1>
      <div class="controls">
        <select class="renderer-select" :value="renderer" @change="handleRendererChange">
          <option value="custom">自研渲染器 (@ldesign/ppt)</option>
          <option value="pptxjs">参考渲染器 (PPTXjs)</option>
        </select>
        <button class="btn btn-secondary" @click="loadDemo">
          📄 加载示例
        </button>
        <button class="btn btn-secondary" @click="loadTarget">
          🎯 加载调试文件
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <!-- Sidebar -->
      <aside class="sidebar">
        <!-- ... (Upload Card) ... -->

        <!-- File Info Card -->
        <div v-if="file" class="card">
          <!-- ... (existing file info) ... -->
        </div>

        <!-- Thumbnails Card (Only for custom renderer currently) -->
        <div v-if="presentation && renderer === 'custom'" class="card">
          <div class="card-title">幻灯片</div>
          <div class="thumbnails">
            <div v-for="(slide, index) in presentation.slides" :key="slide.id" class="thumbnail"
              :class="{ active: index === currentSlide }" @click="goToSlide(index)">
              <div class="thumbnail-preview">
                {{ index + 1 }}
              </div>
              <div class="thumbnail-info">
                <div class="thumbnail-title">幻灯片 {{ index + 1 }}</div>
                <div class="thumbnail-meta">{{ slide.elements.length }} 个元素</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Viewer Container -->
      <div class="viewer-container">
        <div class="viewer-header">
          <span class="viewer-info">
            {{ file ? fileName : 'PPT 演示文稿查看器' }}
          </span>
          <div v-if="presentation && renderer === 'custom'" class="controls">
            <button class="btn btn-secondary" :disabled="currentSlide === 0" @click="currentSlide--">
              ◀ 上一页
            </button>
            <button class="btn btn-secondary" :disabled="currentSlide >= totalSlides - 1" @click="currentSlide++">
              下一页 ▶
            </button>
            <button class="btn btn-primary">
              ⛶ 全屏
            </button>
          </div>
        </div>

        <div class="viewer-content">
          <!-- Empty State -->
          <div v-if="!file" class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div>上传 PPTX 文件开始预览</div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="error empty-state">
            <div class="error-icon">⚠️</div>
            <div>{{ error }}</div>
            <button class="btn btn-primary" style="margin-top: 16px" @click="file = null; error = null">
              重试
            </button>
          </div>

          <!-- PPT Viewer (handles its own loading state) -->
          <template v-else>
            <div v-if="renderer === 'custom'" style="width: 100%; height: 100%">
              <!-- Loading overlay -->
              <div v-if="isLoading" class="loading-overlay">
                <div class="spinner"></div>
                <div>正在解析演示文稿...</div>
              </div>

              <!-- PPT Viewer -->
              <PPTViewer :source="file" :enable-animations="true" :enable-transitions="true" :show-controls="true"
                :show-progress="true" scale-mode="fit" background-color="#1a1a1a" :parser-options="parserOptions"
                @loaded="handleLoaded" @error="handleError" @slide-change="handleSlideChange"
                :current-slide="currentSlide" />
            </div>

            <div v-else style="width: 100%; height: 100%">
              <PPTXJsRenderer :file="file" />
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ... existing styles ... */
.renderer-select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #444;
  background: #333;
  color: white;
  margin-right: 12px;
  cursor: pointer;
}

.renderer-select:focus {
  outline: none;
  border-color: #646cff;
}

/* ... existing styles ... */
</style>
