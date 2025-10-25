# 🎬 Leaderboard CSS Animations & Effects Reference

## 📊 Animation Summary

### 1. **Back Button Animations**
```css
/* Shine Effect */
.back-button::before {
  animation: shine-pass 0.5s ease;
}

/* Hover Effects */
.back-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
}

.back-button:hover svg {
  transform: translateX(-3px);
}
```

### 2. **Header Floating Animation**
```css
.leaderboard-header::before {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -20px); }
}
```

### 3. **Stat Cards Shine Effect**
```css
.stat-card::before {
  animation: shine-pass 0.6s ease;
}

.stat-card:hover {
  transform: translateY(-6px);
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}
```

### 4. **Podium Shimmer Border**
```css
.podium-section::before {
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 0%; }
}
```

### 5. **Podium Pulsing Glow**
```css
.podium-1 {
  animation: pulse-gold 2s ease-in-out infinite;
}

@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 15px 50px rgba(255, 215, 0, 0.4); }
  50% { box-shadow: 0 20px 60px rgba(255, 215, 0, 0.6); }
}

/* Similar for silver and bronze */
```

### 6. **Avatar Ring Animation**
```css
.avatar-circle::before {
  animation: ring 2s ease-in-out infinite;
}

@keyframes ring {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0; }
}
```

### 7. **Table Row Highlight**
```css
.leaderboard-table tbody tr::before {
  animation: border-appear 0.3s ease;
}

.leaderboard-table tbody tr:hover {
  background: linear-gradient(90deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%);
  transform: translateX(4px);
}
```

### 8. **Badge Icon Interaction**
```css
.badge-icon:hover {
  transform: scale(1.3) rotate(10deg);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}
```

---

## ⏱️ Animation Timing

| Element | Duration | Timing | Effect |
|---------|----------|--------|--------|
| Back Button | 0.3s | cubic-bezier | Hover lift |
| Header Float | 6s | ease-in-out | Continuous |
| Stat Cards | 0.3s | cubic-bezier | Hover lift |
| Podium Shimmer | 3s | ease-in-out | Continuous |
| Podium Pulse | 2s | ease-in-out | Continuous |
| Avatar Ring | 2s | ease-in-out | Continuous |
| Table Row | 0.3s | cubic-bezier | Hover effect |
| Badge Icon | 0.3s | ease | Hover scale |

---

## 🎨 Transform Effects

### Hover Transforms
- **Back Button**: `translateY(-3px)` + `translateX(-3px)` on icon
- **Stat Cards**: `translateY(-6px)`
- **Podium Items**: `translateY(-12px)`
- **Table Rows**: `translateX(4px)`
- **Badge Icons**: `scale(1.3) rotate(10deg)`
- **Donor Avatars**: `scale(1.15)`

### Continuous Transforms
- **Header**: `translate(0, 0)` → `translate(20px, -20px)`
- **Avatar Ring**: `scale(1)` → `scale(1.1)`

---

## 🌈 Shadow Effects

### Box Shadows
- **Back Button Hover**: `0 8px 25px rgba(102, 126, 234, 0.5)`
- **Stat Cards Hover**: `0 8px 20px rgba(0, 0, 0, 0.15)`
- **Podium Items Hover**: `0 20px 40px rgba(0, 0, 0, 0.15)`
- **Donor Avatar**: `0 2px 8px rgba(102, 126, 234, 0.3)`

### Drop Shadows
- **Icons**: `drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))`
- **Badge Icons Hover**: `drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))`

---

## 🎯 Opacity Effects

- **Stat Card Background**: `0.15` → `0.3` on hover
- **Avatar Ring**: `0.3` → `0` (fading)
- **Podium Item Overlay**: `0` → `1` on hover

---

## 📱 Responsive Adjustments

All animations scale appropriately:
- Desktop: Full effects
- Tablet: Optimized spacing
- Mobile: Touch-friendly, no hover delays

---

## ✨ Performance Tips

1. **GPU Acceleration**: Uses `transform` and `opacity`
2. **No Layout Shifts**: Animations don't trigger reflows
3. **Smooth 60fps**: Hardware-accelerated animations
4. **Efficient**: Minimal CSS calculations

---

## 🔧 Customization Guide

To adjust animation speeds:
```css
/* Change duration */
animation: float 8s ease-in-out infinite; /* was 6s */

/* Change intensity */
transform: translate(30px, -30px); /* was 20px, -20px */

/* Change colors */
box-shadow: 0 15px 50px rgba(255, 215, 0, 0.6); /* adjust alpha */
```

---

## 🎬 Browser Compatibility

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support
- ✅ Mobile browsers: Full support

All animations use standard CSS3 properties with no vendor prefixes needed.

