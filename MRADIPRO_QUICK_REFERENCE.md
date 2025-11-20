# ⚡ MradiPro Quick Reference - One Page Cheat Sheet

**Version:** 2.0.0 | **Platform:** Kenya's Construction Marketplace | **Host:** Vercel

---

## 🚀 Quick Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (localhost:5173)
npm run build           # Build for production
npm run preview         # Preview build (localhost:4173)

# Git Workflow
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push origin main    # Deploy to Vercel (auto)
git log --oneline -5    # View recent commits

# Troubleshooting
npm run lint            # Check code quality
npm audit               # Security check
Ctrl+Shift+R            # Hard refresh browser
```

---

## 📊 Deployment Flow (2-3 minutes)

```
Code → Push → GitHub → Webhook → Vercel Build → CDN → LIVE ✅
```

---

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI
│   ├── Navigation.tsx (MradiPro logo)
│   └── Footer.tsx (© MradiPro)
├── pages/         # Routes
│   ├── Index.tsx (Homepage - MradiPro)
│   ├── Suppliers.tsx
│   └── ...
├── App.tsx        # Main app
└── main.tsx       # Entry point
```

---

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `index.html` | HTML template, meta tags |
| `vercel.json` | Deployment config |
| `vite.config.ts` | Build settings |
| `package.json` | Dependencies (v2.0.0) |
| `public/sw.js` | Service worker (cache) |

---

## 🔧 Troubleshooting

**Changes not showing?**
1. Clear cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+Shift+R`
3. Incognito mode test
4. Check Vercel dashboard

**Build failing?**
1. Test locally: `npm run build`
2. Fix TypeScript errors
3. Check environment variables
4. View Vercel build logs

---

## 📱 Branding Elements

- **App Name:** MradiPro
- **Tagline:** Building Kenya's Future
- **Logo:** `/mradipro-logo-circular.svg`
- **Favicon:** `/mradipro-favicon.svg`
- **Colors:** Blue (#2563eb), Green, Red
- **Emoji:** 🇰🇪 🏗️
- **Version:** 2.0.0

---

## 🌐 Important URLs

- **Live Site:** https://ujenzipro.vercel.app
- **GitHub:** https://github.com/hillarytaley-ops/UjenziPro
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Support:** support@mradipro.co.ke

---

## ⚡ Performance Targets

- First Paint: < 1s ✅
- Interactive: < 1.5s ✅
- Bundle: < 200KB ✅
- Score: > 90/100 ✅

---

## 📞 Support

- **Technical:** support@mradipro.co.ke
- **Emergency:** +254-700-EMERGENCY
- **Hours:** Mon-Fri 8AM-6PM, Sat 9AM-4PM

---

**🇰🇪 MradiPro - Kenya's Premier Construction Platform 🏗️**

*Quick, Simple, Always Handy!*


