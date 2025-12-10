# @ldesign/ppt

A powerful, feature-rich PPT/PPTX rendering library for web applications.

## Features

- 📄 **Full PPTX Support** - Parse and render Microsoft PowerPoint files
- 🎨 **Complete Styling** - Support for shapes, text, images, charts, and more
- 🎬 **Animations** - Full animation and transition support
- 🖼️ **High Fidelity** - Accurate rendering matching PowerPoint
- ⚡ **Performance** - Optimized for large presentations
- 📱 **Responsive** - Works on desktop and mobile
- 🔧 **Framework Agnostic** - Core library works with any framework
- 💚 **Vue Support** - First-class Vue 3 integration

## Packages

| Package | Description |
|---------|-------------|
| `@ldesign/ppt-core` | Core parsing and rendering engine |
| `@ldesign/ppt-vue` | Vue 3 components and composables |

## Installation

```bash
# Using pnpm
pnpm add @ldesign/ppt-core @ldesign/ppt-vue

# Using npm
npm install @ldesign/ppt-core @ldesign/ppt-vue

# Using yarn
yarn add @ldesign/ppt-core @ldesign/ppt-vue
```

## Quick Start

### Using Vue Components

```vue
<script setup lang="ts">
import { PPTViewer } from '@ldesign/ppt-vue'
</script>

<template>
  <PPTViewer 
    source="/path/to/presentation.pptx"
    :enable-animations="true"
    :show-controls="true"
    @loaded="onLoaded"
    @slideChange="onSlideChange"
  />
</template>
```

### Using Core API

```typescript
import { parsePPTX, createRenderer } from '@ldesign/ppt-core'

// Parse a PPTX file
const result = await parsePPTX(file)

// Create a renderer
const renderer = createRenderer({
  container: '#ppt-container',
  enableAnimations: true,
  showControls: true,
})

// Initialize with parsed presentation
await renderer.init(result.presentation)

// Navigate slides
renderer.next()
renderer.previous()
renderer.goToSlide(3)
```

### Using Vue Composables

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { usePPT } from '@ldesign/ppt-vue'

const containerRef = ref<HTMLElement | null>(null)

const {
  presentation,
  isLoading,
  error,
  state,
  load,
  goToSlide,
  next,
  previous,
} = usePPT({
  container: containerRef,
  renderOptions: {
    enableAnimations: true,
  },
})

// Load presentation
await load('/path/to/presentation.pptx')
</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 600px;" />
</template>
```

## API Reference

### PPTViewer Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `string \| File \| Blob \| ArrayBuffer` | - | PPTX source |
| `initialSlide` | `number` | `0` | Initial slide index |
| `enableAnimations` | `boolean` | `true` | Enable animations |
| `enableTransitions` | `boolean` | `true` | Enable transitions |
| `scaleMode` | `'fit' \| 'fill' \| 'stretch' \| 'none'` | `'fit'` | Scale mode |
| `backgroundColor` | `string` | `'#000000'` | Background color |
| `showControls` | `boolean` | `true` | Show navigation controls |
| `showProgress` | `boolean` | `true` | Show progress bar |
| `autoPlay` | `boolean` | `false` | Auto-play slides |
| `autoPlayInterval` | `number` | `5000` | Auto-play interval (ms) |
| `loop` | `boolean` | `false` | Loop presentation |

### PPTViewer Events

| Event | Payload | Description |
|-------|---------|-------------|
| `loaded` | `Presentation` | Emitted when loaded |
| `error` | `Error` | Emitted on error |
| `slideChange` | `(index, slide)` | Emitted on slide change |
| `animationStart` | `(element, animation)` | Emitted when animation starts |
| `animationComplete` | `(element, animation)` | Emitted when animation ends |

### Core Parser Options

```typescript
interface ParserOptions {
  parseAnimations?: boolean  // Parse animations (default: true)
  parseNotes?: boolean       // Parse speaker notes (default: true)
  parseComments?: boolean    // Parse comments (default: false)
  embedResources?: boolean   // Embed resources (default: false)
  lazyLoadResources?: boolean // Lazy load resources (default: true)
}
```

### Supported Features

#### Shapes
- ✅ Basic shapes (rectangles, ellipses, etc.)
- ✅ Custom geometry
- ✅ Text boxes
- ✅ Pictures/Images
- ✅ Tables
- ✅ Charts (basic)
- ✅ SmartArt (placeholder)
- ✅ Group shapes
- ✅ Connectors

#### Styling
- ✅ Solid fills
- ✅ Gradient fills
- ✅ Picture fills
- ✅ Pattern fills
- ✅ Line styles
- ✅ Shadow effects
- ✅ Glow effects

#### Text
- ✅ Paragraphs
- ✅ Text runs
- ✅ Fonts and sizes
- ✅ Bold, italic, underline
- ✅ Text colors
- ✅ Bullet points
- ✅ Hyperlinks
- ✅ Subscript/Superscript

#### Animations
- ✅ Entrance animations
- ✅ Exit animations
- ✅ Emphasis animations
- ✅ Motion paths
- ✅ Transitions
- ✅ Timing control

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode
pnpm dev

# Run tests
pnpm test

# Lint
pnpm lint
```

## Project Structure

```
packages/
├── core/                   # @ldesign/ppt-core
│   └── src/
│       ├── parser/         # PPTX parsing
│       │   ├── pptx-parser.ts
│       │   ├── xml-parser.ts
│       │   ├── shape-parser.ts
│       │   ├── text-parser.ts
│       │   └── ...
│       ├── renderer/       # Slide rendering
│       │   ├── ppt-renderer.ts
│       │   ├── slide-renderer.ts
│       │   ├── shape-renderer.ts
│       │   └── ...
│       ├── animation/      # Animation system
│       │   ├── animation-engine.ts
│       │   ├── transition-manager.ts
│       │   └── ...
│       ├── types/          # Type definitions
│       └── index.ts        # Entry point
│
└── vue/                    # @ldesign/ppt-vue
    └── src/
        ├── components/     # Vue components
        │   ├── PPTViewer.vue
        │   ├── SlideView.vue
        │   └── ...
        ├── composables/    # Vue composables
        │   ├── usePPT.ts
        │   ├── useSlide.ts
        │   └── ...
        └── index.ts        # Entry point
```

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guide before submitting PRs.