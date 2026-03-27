# Welp Component Styles & Specifications

## Cards

### Selection Cards (Signup Flow)
```css
/* Base card */
- Border: `border-2`
- Hover border color: `hover:border-[#4A90E2]` (customer) or `hover:border-[#F5D033]` (business)
- Transition: `transition-all`
- Hover effects: `hover:shadow-lg hover:scale-[1.02]`
- Cursor: `cursor-pointer`
```

### Card Container
- Background: White (`bg-white`)
- Padding: Variable (`p-4`, `p-6`, `p-8`)
- Border radius: Inherited from Tailwind Card component
- Shadow: Default card shadow, enhanced on hover

## Buttons

### Primary Button Variants

#### Default Button (from component library)
```css
- Base: `inline-flex items-center justify-center`
- Padding: `h-10 px-4 py-2` (default), `h-9 px-3` (small), `h-11 px-8` (large)
- Border radius: `rounded-md`
- Transition: `transition-colors`
- Focus: `focus-visible:ring-2 focus-visible:ring-ring`
```

#### Blue CTA Button (Customer/Primary)
```css
- Background: `bg-[#4A90E2]`
- Hover: `hover:bg-[#357ABD]`
- Text: `text-white`
- Example: "Sign In" button
```

#### Yellow CTA Button (Business)
```css
- Background: `bg-[#F5D033]`
- Hover: `hover:bg-[#E6C029]`
- Text: `text-gray-900`
- Font: `font-semibold`
- Example: "Create Business Account"
```

#### Gradient Button (Hero CTA)
```css
- Background: `bg-gradient-to-r from-blue-600 to-blue-700`
- Hover: `hover:from-blue-700 hover:to-blue-800`
- Text: `text-white`
- Padding: `px-6 py-3`
- Border radius: `rounded-lg`
- Font: `font-semibold`
- Effects: `shadow-lg hover:shadow-xl hover:scale-105`
- Transition: `transition-all duration-300`
```

#### Outline Button
```css
- Border: `border border-blue-600`
- Text: `text-blue-600`
- Hover: `hover:bg-blue-600 hover:text-white`
- Font: `font-medium`
- Transition: `transition-all duration-300`
```

## Input Fields

### Text Input
```css
- Base styling from Tailwind Input component
- Background: Inherits from `--input` CSS variable
- Border: Default input border
- Border radius: Inherited from form controls
- Padding: Standard form padding
- Disabled state: `disabled:opacity-50`
```

### Form Labels
```css
- Font size: Default
- Color: Inherited from Label component
- Spacing: `space-y-2` between label and input
```

## Navigation

### Header/Navbar
```css
- Background: `backdrop-blur-md bg-white/90`
- Border: `border-b border-white/20`
- Shadow: `shadow-lg`
- Height: `h-20`
- Fixed position: `fixed top-0 left-0 right-0 z-50`
```

### Nav Links
```css
- Base: `px-4 py-2`
- Text: `text-gray-700`
- Hover: `hover:text-blue-600`
- Background hover: `hover:bg-blue-50`
- Effects: `hover:shadow-md transform hover:-translate-y-0.5`
- Border radius: `rounded-lg`
- Transition: `transition-all duration-300`
- Underline effect: `w-0 hover:w-full` (animated underline)
```

## Icons & Avatars

### Icon Containers
```css
- Size: `w-16 h-16` (large), `w-8 h-8` (medium), `w-6 h-6` (small)
- Background: Color with opacity (e.g., `bg-[#4A90E2]/10`)
- Border radius: `rounded-full`
- Alignment: `flex items-center justify-center`
```

## Backgrounds & Gradients

### Page Backgrounds
```css
/* Light gradient background */
- `bg-gradient-to-br from-blue-50 to-yellow-50`

/* Hero gradient */
- `bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700`

/* With animation */
- `animate-gradient-x`
```

### Decorative Elements
```css
/* Floating orbs */
- Size: Various (`w-16 h-16`, `w-24 h-24`, etc.)
- Background: Color with low opacity (`bg-yellow-400/20`)
- Effect: `blur-xl`
- Border radius: `rounded-full`
- Position: Absolute positioning
```

## Spacing & Layout

### Container Widths
- Max width: `max-w-7xl` (main container)
- Card max width: `max-w-md`, `max-w-xl`, `max-w-2xl`
- Padding: `px-4 sm:px-6 lg:px-8`

### Common Spacing
- Section padding: `py-20`
- Card padding: `p-4`, `p-6`, `p-8`
- Element spacing: `space-y-1` to `space-y-6`
- Grid gaps: `gap-3`, `gap-4`, `gap-6`

## Border Radius Values
- Default: `--radius: 1.5rem`
- Large: `rounded-lg` (var(--radius))
- Medium: `rounded-md` (calc(var(--radius) - 2px))
- Small: `rounded-sm` (calc(var(--radius) - 4px))
- Full: `rounded-full` (for circular elements)

## Shadows
- Default card: `--shadow-card: 0 8px 24px -4px hsl(charcoal/8%)`
- Soft shadow: `--shadow-soft: 0 4px 20px -2px hsl(mustard/10%)`
- Hover shadow: `--shadow-hover: 0 10px 30px -5px hsl(mustard/20%)`
- Large shadow: `shadow-lg`
- Extra large: `shadow-xl`

## Animations & Transitions

### Transition Durations
- Fast: `duration-300` (300ms)
- Medium: `duration-500` (500ms)
- Custom easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- Bounce: `cubic-bezier(0.68, -0.55, 0.265, 1.55)`

### Common Animations
- Scale on hover: `hover:scale-105`, `hover:scale-110`, `hover:scale-[1.02]`
- Translate: `hover:-translate-y-0.5`
- Opacity changes
- Color transitions
- Width animations (for underlines)

## Responsive Design
- Mobile first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Mobile menu: Hidden on `md:` and above
- Touch optimization: `touch-action: manipulation`
- Reduced motion support included