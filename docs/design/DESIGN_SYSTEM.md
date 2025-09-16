# Solo Accountant AI - Design System

## 🎨 Brand Identity

### Brand Positioning
**Professional AI-Powered Accounting Automation**
- Trustworthy and reliable
- Cutting-edge but approachable
- Efficiency-focused
- Professional service industry standard

### Brand Personality
- **Professional:** Clean, organized, business-appropriate
- **Intelligent:** Modern, tech-forward, AI-powered
- **Efficient:** Streamlined, fast, productivity-focused
- **Trustworthy:** Secure, compliant, dependable

## 🎯 Color Palette

### Primary Colors (Trust & Professionalism)
```css
/* Primary Blue - Trust, reliability, professional */
--primary-50: #eff6ff;   /* Very light blue backgrounds */
--primary-100: #dbeafe;  /* Light blue accents */
--primary-200: #bfdbfe;  /* Subtle blue elements */
--primary-300: #93c5fd;  /* Medium blue highlights */
--primary-400: #60a5fa;  /* Interactive blue */
--primary-500: #3b82f6;  /* Main brand blue */
--primary-600: #2563eb;  /* Darker blue for emphasis */
--primary-700: #1d4ed8;  /* Dark blue for text */
--primary-800: #1e40af;  /* Very dark blue */
--primary-900: #1e3a8a;  /* Darkest blue */
```

### Secondary Colors (Professional Grays)
```css
/* Neutral Grays - Professional, clean */
--gray-50: #f9fafb;    /* Page backgrounds */
--gray-100: #f3f4f6;   /* Card backgrounds */
--gray-200: #e5e7eb;   /* Borders, dividers */
--gray-300: #d1d5db;   /* Disabled states */
--gray-400: #9ca3af;   /* Placeholder text */
--gray-500: #6b7280;   /* Secondary text */
--gray-600: #4b5563;   /* Primary text */
--gray-700: #374151;   /* Headings */
--gray-800: #1f2937;   /* Dark headings */
--gray-900: #111827;   /* Darkest text */
```

### Accent Colors (Status & Actions)
```css
/* Success Green - Completed, approved */
--success-50: #ecfdf5;
--success-500: #10b981;
--success-600: #059669;

/* Warning Orange - Attention needed */
--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

/* Error Red - Problems, rejections */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-600: #dc2626;

/* Info Purple - AI processing, insights */
--info-50: #faf5ff;
--info-500: #8b5cf6;
--info-600: #7c3aed;
```

## 📝 Typography

### Font Stack
```css
/* Primary Font - Inter (Professional, readable) */
font-family: 'Inter', system-ui, -apple-system, sans-serif;

/* Monospace Font - Fira Code (Code, data) */
font-family: 'Fira Code', 'Monaco', 'Cascadia Code', monospace;
```

### Type Scale
```css
/* Headings */
--text-xs: 0.75rem;     /* 12px - Small labels */
--text-sm: 0.875rem;    /* 14px - Body text, captions */
--text-base: 1rem;      /* 16px - Default body text */
--text-lg: 1.125rem;    /* 18px - Large body text */
--text-xl: 1.25rem;     /* 20px - Small headings */
--text-2xl: 1.5rem;     /* 24px - Section headings */
--text-3xl: 1.875rem;   /* 30px - Page headings */
--text-4xl: 2.25rem;    /* 36px - Hero headings */
--text-5xl: 3rem;       /* 48px - Large hero text */
```

### Font Weights
```css
--font-light: 300;      /* Light text, less emphasis */
--font-normal: 400;     /* Default body text */
--font-medium: 500;     /* Slightly emphasized text */
--font-semibold: 600;   /* Subheadings, important text */
--font-bold: 700;       /* Headings, strong emphasis */
--font-extrabold: 800;  /* Hero text, major headings */
```

## 📐 Spacing & Layout

### Spacing Scale (Tailwind-based)
```css
--space-1: 0.25rem;   /* 4px - Tight spacing */
--space-2: 0.5rem;    /* 8px - Small spacing */
--space-3: 0.75rem;   /* 12px - Medium-small spacing */
--space-4: 1rem;      /* 16px - Default spacing */
--space-5: 1.25rem;   /* 20px - Medium spacing */
--space-6: 1.5rem;    /* 24px - Large spacing */
--space-8: 2rem;      /* 32px - Extra large spacing */
--space-10: 2.5rem;   /* 40px - Section spacing */
--space-12: 3rem;     /* 48px - Large section spacing */
--space-16: 4rem;     /* 64px - Page section spacing */
```

### Border Radius
```css
--radius-sm: 0.125rem;  /* 2px - Small elements */
--radius: 0.25rem;      /* 4px - Default radius */
--radius-md: 0.375rem;  /* 6px - Medium elements */
--radius-lg: 0.5rem;    /* 8px - Large elements */
--radius-xl: 0.75rem;   /* 12px - Cards, modals */
--radius-2xl: 1rem;     /* 16px - Large cards */
--radius-full: 9999px;  /* Full circle - Avatars, pills */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

## 🧩 Component Library

### Button Variants
```css
/* Primary Button - Main actions */
.btn-primary {
  background: var(--primary-600);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: var(--font-medium);
}

/* Secondary Button - Secondary actions */
.btn-secondary {
  background: white;
  color: var(--primary-600);
  border: 1px solid var(--primary-600);
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: var(--font-medium);
}

/* Success Button - Approve, confirm */
.btn-success {
  background: var(--success-600);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: var(--font-medium);
}

/* Danger Button - Delete, reject */
.btn-danger {
  background: var(--error-600);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  font-weight: var(--font-medium);
}
```

### Card Components
```css
/* Standard Card */
.card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}

/* Transaction Card */
.transaction-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/* Status Card */
.status-card {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  text-align: center;
}
```

### Form Elements
```css
/* Input Fields */
.input {
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  font-size: var(--text-sm);
  background: white;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

/* Select Dropdowns */
.select {
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  font-size: var(--text-sm);
  background: white;
  width: 100%;
}

/* Checkboxes */
.checkbox {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  background: white;
}
```

## 🎭 Status Indicators

### AI Confidence Levels
```css
/* High Confidence (90%+) */
.confidence-high {
  background: var(--success-50);
  color: var(--success-700);
  border: 1px solid var(--success-200);
}

/* Medium Confidence (70-89%) */
.confidence-medium {
  background: var(--warning-50);
  color: var(--warning-700);
  border: 1px solid var(--warning-200);
}

/* Low Confidence (<70%) */
.confidence-low {
  background: var(--error-50);
  color: var(--error-700);
  border: 1px solid var(--error-200);
}

/* AI Processing */
.ai-processing {
  background: var(--info-50);
  color: var(--info-700);
  border: 1px solid var(--info-200);
}
```

### Transaction States
```css
/* Approved */
.status-approved {
  background: var(--success-100);
  color: var(--success-800);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

/* Pending Review */
.status-pending {
  background: var(--warning-100);
  color: var(--warning-800);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

/* Rejected */
.status-rejected {
  background: var(--error-100);
  color: var(--error-800);
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}
```

## 🎬 Animations & Interactions

### Micro-interactions
```css
/* Hover States */
.btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

/* Loading States */
.loading {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade In */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide Up */
.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { 
    transform: translateY(10px); 
    opacity: 0; 
  }
  to { 
    transform: translateY(0); 
    opacity: 1; 
  }
}
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Small laptops */
--screen-xl: 1280px;  /* Laptops */
--screen-2xl: 1536px; /* Large screens */
```

### Mobile-First Components
- Touch targets minimum 44px
- Simplified navigation for mobile
- Swipe gestures for transaction review
- Bottom sheet modals for mobile
- Progressive disclosure of information

## ♿ Accessibility Standards

### Color Contrast
- All text meets WCAG 2.1 AA standards (4.5:1 ratio)
- Interactive elements have sufficient contrast
- Focus indicators clearly visible

### Keyboard Navigation
- All interactive elements keyboard accessible
- Logical tab order throughout interface
- Skip links for main content areas
- Escape key closes modals and dropdowns

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for complex interactions
- Alternative text for all images
- Status announcements for dynamic content

## 🎯 Day 1 Design Deliverables

1. **Design System Documentation** ✅ (This document)
2. **Tailwind Config Update** (Next: Update tailwind.config.ts with new tokens)
3. **Component Library** (Next: Create base React components)
4. **Brand Assets** (Next: Logo and icon selection)

**Next 5-minute goal:** Update Tailwind configuration with design tokens