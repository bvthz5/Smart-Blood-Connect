# 👨‍💻 Leaderboard Page - Developer Guide

## 🚀 Quick Start

### Files to Know
- **Component**: `frontend/src/pages/donor/Leaderboard.jsx`
- **Styles**: `frontend/src/pages/donor/leaderboard.css`
- **Route**: Typically accessed via `/leaderboard` or similar

### Key Dependencies
```jsx
import { Trophy, Medal, Award, MapPin, Droplets, TrendingUp, Users, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
```

---

## 🔧 Component Structure

### State Management
```jsx
const [activeTab, setActiveTab] = useState('kerala');
const [selectedDistrict, setSelectedDistrict] = useState('Ernakulam');
const [keralaLeaderboard, setKeralaLeaderboard] = useState([]);
const [districtLeaderboard, setDistrictLeaderboard] = useState([]);
const [topDonors, setTopDonors] = useState([]);
const [stats, setStats] = useState(null);
const [loading, setLoading] = useState(true);
```

### API Endpoints Used
```javascript
GET /api/leaderboard/kerala?limit=100
GET /api/leaderboard/top-donors
GET /api/leaderboard/stats
GET /api/leaderboard/district/{district}?limit=50
```

### Navigation
```jsx
const navigate = useNavigate();

// Go back
navigate(-1);

// Go to specific page
navigate('/path');
```

---

## 🎨 CSS Classes Reference

### Back Button
```css
.back-button              /* Main button */
.back-button::before      /* Shine effect */
.back-button:hover        /* Hover state */
.back-button:active       /* Active state */
.back-button svg          /* Icon styling */
```

### Header
```css
.leaderboard-header       /* Main header */
.leaderboard-header::before  /* Floating animation */
.header-content           /* Content wrapper */
.header-icon              /* Trophy icon */
.header-text              /* Title & description */
```

### Stats
```css
.stats-grid               /* Grid container */
.stat-card                /* Individual card */
.stat-card::before        /* Shine effect */
.stat-icon                /* Icon styling */
.stat-value               /* Number display */
.stat-label               /* Label text */
```

### Podium
```css
.podium-section           /* Main section */
.podium-section::before   /* Shimmer border */
.podium                   /* Flex container */
.podium-item              /* Individual item */
.podium-1, .podium-2, .podium-3  /* Rank-specific */
.avatar-circle            /* Avatar styling */
.avatar-circle::before    /* Ring animation */
```

### Table
```css
.leaderboard-table-container  /* Table wrapper */
.leaderboard-table            /* Table element */
.leaderboard-table tbody tr   /* Row styling */
.leaderboard-table tbody tr::before  /* Border animation */
.donor-avatar                 /* Donor avatar */
.badge-icon                   /* Badge styling */
```

---

## 🎬 Animation Classes

### Keyframe Animations
```css
@keyframes float          /* Header floating */
@keyframes shimmer        /* Podium shimmer */
@keyframes pulse-gold     /* Gold pulsing */
@keyframes pulse-silver   /* Silver pulsing */
@keyframes pulse-bronze   /* Bronze pulsing */
@keyframes ring           /* Avatar ring */
```

### Timing Values
```css
0.3s cubic-bezier(0.4, 0, 0.2, 1)  /* Quick interactions */
2s ease-in-out                       /* Continuous animations */
3s ease-in-out                       /* Shimmer effect */
6s ease-in-out                       /* Float effect */
```

---

## 🔄 Data Flow

```
Component Mount
    ↓
loadLeaderboards()
    ↓
Fetch 3 endpoints in parallel
    ↓
Update state
    ↓
Render UI with animations
    ↓
User interactions trigger hover effects
```

---

## 🛠️ Customization Guide

### Change Back Button Color
```css
.back-button {
  background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
}
```

### Adjust Animation Speed
```css
@keyframes float {
  /* Change 6s to desired duration */
  animation: float 8s ease-in-out infinite;
}
```

### Modify Hover Effects
```css
.stat-card:hover {
  transform: translateY(-6px);  /* Change -6px to desired value */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);  /* Adjust shadow */
}
```

### Change Podium Colors
```css
.podium-1 {
  background: linear-gradient(135deg, #NEW_COLOR1 0%, #NEW_COLOR2 100%);
}
```

---

## 🐛 Debugging Tips

### Check Console
```javascript
// Verify API calls
console.log('Leaderboard data:', keralaLeaderboard);
console.log('Top donors:', topDonors);
console.log('Stats:', stats);
```

### Inspect Animations
1. Open DevTools (F12)
2. Go to Elements tab
3. Select element
4. Check Animations panel
5. Slow down animations for inspection

### Common Issues

**Back button not working**
- Check if `useNavigate` is imported
- Verify React Router is set up
- Check browser history

**Animations not smooth**
- Check GPU acceleration (use `transform` not `left/top`)
- Verify CSS is loaded
- Check for JavaScript conflicts

**Styling not applied**
- Clear browser cache
- Check CSS file is imported
- Verify class names match

---

## 📊 Performance Optimization

### Current Optimizations
- ✅ GPU-accelerated animations (transform, opacity)
- ✅ No layout shifts (no width/height changes)
- ✅ Efficient selectors
- ✅ CSS-only animations (no JavaScript)

### Further Optimization
```css
/* Use will-change sparingly */
.podium-item {
  will-change: transform;
}

/* Reduce animation complexity if needed */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

---

## 🧪 Testing Checklist

- [ ] Back button navigates correctly
- [ ] All animations play smoothly
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors
- [ ] API calls return correct data
- [ ] Hover effects work on all elements
- [ ] Loading state displays correctly
- [ ] Error handling works

---

## 📚 Related Files

- `LEADERBOARD_ENHANCEMENTS.md` - Feature overview
- `LEADERBOARD_CSS_ANIMATIONS.md` - Animation reference
- `LEADERBOARD_DESIGN_SUMMARY.md` - Complete summary

---

## 💡 Pro Tips

1. **Use DevTools Animations Panel** to slow down and inspect animations
2. **Test on Real Devices** to verify smooth performance
3. **Check Accessibility** with keyboard navigation
4. **Monitor Performance** with Chrome DevTools Performance tab
5. **Keep Animations Subtle** to avoid distraction

---

## 🎯 Next Steps

1. Test the page thoroughly
2. Gather user feedback
3. Iterate on design if needed
4. Deploy to production
5. Monitor performance metrics

**Happy coding! 🚀**

