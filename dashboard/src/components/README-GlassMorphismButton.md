# GlassMorphismButton Component

## Overview
Standardized glass morphism button component for all AI/script/automation operations across the B9 Dashboard. Ensures consistent styling and user experience.

## Usage

### Basic Import
```tsx
import { GlassMorphismButton } from '@/components/GlassMorphismButton'
// Or use preset variants
import { AIButton, StartButton, StopButton, ProcessButton, BrandButton } from '@/components/GlassMorphismButton'
```

### Examples

#### AI Operations (Pink/Purple gradient)
```tsx
<AIButton
  icon={Sparkles}
  label="AI Categorize"
  sublabel="500 items"
  onClick={handleCategorize}
  disabled={loading}
/>
```

#### Start/Stop Operations
```tsx
<GlassMorphismButton
  variant={isRunning ? 'stop' : 'start'}
  icon={isRunning ? Square : Play}
  label={isRunning ? 'Stop Scraper' : 'Start Scraper'}
  sublabel={isRunning ? 'Running' : 'Ready'}
  onClick={handleToggle}
/>
```

#### Brand Operations (B9 Pink)
```tsx
<BrandButton
  icon={Upload}
  label="Export Data"
  sublabel="CSV Format"
  onClick={handleExport}
  size="lg"
/>
```

## Variants

| Variant | Use Case | Colors |
|---------|----------|--------|
| `ai` | AI/Magic operations | Pink → Purple → Blue gradient |
| `brand` | B9 brand actions | B9 Pink gradient (#FF8395 → #FF4D68) |
| `start` | Start operations | Green gradient |
| `stop` | Stop operations | Red gradient |
| `process` | Processing/Loading | Blue gradient |
| `success` | Success states | Emerald gradient |
| `warning` | Warning actions | Amber gradient |
| `danger` | Dangerous actions | Rose gradient |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | ButtonVariant | 'brand' | Color scheme to use |
| `size` | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| `icon` | LucideIcon | - | Icon component to display |
| `label` | string | - | Main button text |
| `sublabel` | string | - | Secondary text below label |
| `onClick` | () => void | - | Click handler |
| `disabled` | boolean | false | Disable state |
| `loading` | boolean | false | Shows spinning icon |
| `className` | string | '' | Additional CSS classes |
| `style` | CSSProperties | - | Additional inline styles |

## Features

- **Glass Morphism Effect**: Blur backdrop with semi-transparent gradients
- **Hover Effects**: Scale animation, gradient overlay, and shine effect
- **Accessibility**: Full keyboard navigation and ARIA support
- **Performance**: Memoized components for optimal rendering
- **Responsive**: Adapts to different screen sizes

## Design Principles

1. **Consistency**: All AI/automation buttons use the same base style
2. **Clarity**: Clear visual states (hover, disabled, loading)
3. **Brand Identity**: B9 pink prominently featured in brand variant
4. **User Feedback**: Smooth animations and state transitions
5. **Accessibility**: High contrast gradients with readable text

## Migration Guide

Replace old button implementations:

```tsx
// OLD
<button className="custom-styles...">
  <Sparkles className="icon..." />
  <span>AI Review</span>
</button>

// NEW
<AIButton
  icon={Sparkles}
  label="AI Review"
  onClick={handleReview}
/>
```

## Notes

- Loading state automatically spins the icon
- Disabled state reduces opacity to 50%
- All animations use GPU-accelerated transforms
- Backdrop filter requires browser support (all modern browsers)