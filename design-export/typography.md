# Welp Typography System

## Font Families

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Primary Fonts

1. **Fredoka** - Playful display font for headings
   - Weights: 300, 400, 500, 600, 700
   - Usage: All headings (h1-h6)
   - CSS: `font-fredoka`

2. **Nunito** - Clean sans-serif for body text
   - Weights: 400, 500, 600, 700, 800
   - Usage: Body text, paragraphs, default font
   - CSS: `font-nunito`

3. **Caveat** - Handwritten/cursive accent font
   - Weights: 400, 500, 600, 700
   - Usage: Accent text, handwritten style elements
   - CSS: `font-caveat`

## Type Scale (Tailwind Classes Used)

### Headings
- `text-2xl` - Large headings (e.g., "Join Welp")
- `text-xl` - Section headings (e.g., "Create Customer Account", card titles)
- `text-lg` - Subheadings
- `text-base` - Default text size
- `text-sm` - Small text (descriptions, list items)
- `text-xs` - Extra small text (captions, labels)

### Font Weights
- `font-bold` - Bold text for headings
- `font-semibold` - Semi-bold for emphasis
- `font-medium` - Medium weight for labels
- `font-normal` - Default weight (400)

## Typography Hierarchy

### Page Titles
- Font: Fredoka
- Size: `text-2xl`
- Weight: `font-bold`
- Color: `text-gray-900` or `text-[#4A90E2]`

### Section Headers
- Font: Fredoka
- Size: `text-xl`
- Weight: `font-semibold`
- Color: `text-gray-900`

### Card Titles
- Font: Default (Nunito)
- Size: `text-xl`
- Weight: `font-semibold`
- Color: `text-gray-900`

### Body Text
- Font: Nunito
- Size: `text-base` (default)
- Weight: `font-normal`
- Color: `text-gray-600`

### Small Text/Descriptions
- Font: Nunito
- Size: `text-sm`
- Weight: `font-normal`
- Color: `text-gray-500` or `text-gray-600`

### Accent/Handwritten Text
- Font: Caveat
- Size: `text-xl`
- Weight: varies
- Color: `text-brand-primary`
- Example usage: "100% real business owner here!" text

### Labels
- Font: Nunito
- Size: `text-xs`
- Weight: `font-medium`
- Color: `text-gray-700`

### Button Text
- Font: Nunito (default)
- Weight: `font-semibold` or `font-medium`
- Size: Inherits from button size
- Color: Contrasts with button background

## Text Colors

### Primary Text Colors
- Headers: `text-gray-900`
- Body: `text-gray-600`
- Secondary: `text-gray-500`
- Links: `text-[#4A90E2]`
- Error: `text-red-600`
- White (on dark backgrounds): `text-white`

### Brand Text Colors
- Primary Blue: `text-[#4A90E2]`
- Business Yellow: `text-[#F5D033]`
- Success Green: `text-brand-accent`
- Brand Primary: `text-brand-primary`
- Brand Text: `text-brand-text`

## Line Heights and Spacing
- Default line height from Tailwind
- `leading-tight` - Tight line height for subtitles
- `space-y-1` to `space-y-6` - Vertical spacing between elements

## Text Alignment
- `text-center` - Frequently used for card content, headers
- `text-left` - Default for body text
- Default responsive alignment based on screen size