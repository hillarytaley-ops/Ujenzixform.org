# 🚀 MradiPro - Quick Start Card

**Print this and keep it on your desk! 📌**

---

## ⚡ 5-Minute Setup

```bash
# 1. Clone repository
git clone https://github.com/hillarytaley-ops/UjenziPro.git
cd UjenziPro

# 2. Install dependencies (takes ~2 minutes)
npm install

# 3. Create environment file
touch .env.local

# 4. Add your Supabase credentials to .env.local
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here

# 5. Start development server
npm run dev

# 6. Open browser
# http://localhost:5173

# ✅ Done! You're coding! 🎉
```

---

## 🎯 Daily Workflow

```
┌─────────────────────────────────────────┐
│  1. START CODING                        │
│     $ npm run dev                       │
│     → http://localhost:5173             │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  2. MAKE CHANGES                        │
│     • Edit files in src/                │
│     • Save → See updates instantly ⚡   │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  3. TEST BUILD                          │
│     $ npm run build                     │
│     ✅ Should complete successfully     │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  4. COMMIT & PUSH                       │
│     $ git add .                         │
│     $ git commit -m "Your changes"      │
│     $ git push origin main              │
└─────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│  5. AUTO-DEPLOY                         │
│     Vercel deploys automatically        │
│     ⏱️ 2-3 minutes → LIVE! 🎉           │
└─────────────────────────────────────────┘
```

---

## 📝 Essential Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start local server (port 5173) |
| `npm run build` | Test production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code quality |
| `git status` | See what changed |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Save changes |
| `git push origin main` | Push to GitHub (auto-deploys) |

---

## 🔧 Troubleshooting

### Problem: Changes not showing after deploy
**Solution:**
```
1. Hard refresh: Ctrl + Shift + R
2. Clear service worker in DevTools
3. Check Vercel dashboard for deployment status
```

### Problem: Build failing on Vercel
**Solution:**
```
1. Test locally: npm run build
2. Check environment variables in Vercel
3. View build logs in Vercel dashboard
```

### Problem: Port 5173 already in use
**Solution:**
```
Kill the process:
Windows: taskkill /PID <PID> /F
Mac/Linux: kill -9 <PID>

Or let Vite use another port automatically
```

### Problem: Module not found error
**Solution:**
```
1. Check file path is correct
2. Restart dev server (Ctrl+C, then npm run dev)
3. Verify import statement syntax
```

---

## 📂 Where to Edit What

| Want to change | Edit this file |
|----------------|---------------|
| Homepage | `src/pages/Index.tsx` |
| Login/Signup | `src/pages/Auth.tsx` |
| Navigation bar | `src/components/Navigation.tsx` |
| Footer | `src/components/Footer.tsx` |
| New page | Create in `src/pages/` |
| New component | Create in `src/components/` |
| Styles | `src/index.css` or inline with Tailwind |
| Routes | `src/App.tsx` |

---

## 🌐 Important URLs

| Resource | URL |
|----------|-----|
| **Local Development** | http://localhost:5173 |
| **Live Production** | https://ujenzipro.vercel.app |
| **GitHub Repo** | https://github.com/hillarytaley-ops/UjenziPro |
| **Vercel Dashboard** | https://vercel.com/dashboard |
| **Supabase Dashboard** | https://app.supabase.com |

---

## 📦 Project Structure (Simplified)

```
UjenziPro/
│
├── src/
│   ├── pages/          ← Add new pages here
│   ├── components/     ← Add new components here
│   ├── App.tsx         ← Add routes here
│   └── main.tsx        ← Entry point (rarely touch)
│
├── public/
│   └── assets/         ← Add images here
│
├── vercel.json         ← Vercel config
├── vite.config.ts      ← Build config
├── package.json        ← Dependencies
└── .env.local          ← Local secrets (DON'T COMMIT!)
```

---

## ✅ Pre-Deployment Checklist

Before pushing to production:

- [ ] `npm run lint` - No errors
- [ ] `npm run build` - Completes successfully
- [ ] `npm run preview` - Everything works
- [ ] Test on mobile view (Chrome DevTools)
- [ ] Check console for errors
- [ ] Commit message is clear
- [ ] `.env.local` not committed

---

## 🚨 Emergency Rollback

If deployment breaks the site:

```
1. Go to Vercel Dashboard
2. Click Deployments
3. Find previous working deployment
4. Click "..." → "Promote to Production"
5. Site rolls back in ~30 seconds
```

---

## 💡 Pro Tips

1. **Always test build before pushing**
   ```bash
   npm run build && npm run preview
   ```

2. **Use meaningful commit messages**
   ```
   ✅ "Add county filter to supplier search"
   ❌ "updates"
   ```

3. **Work in feature branches for big changes**
   ```bash
   git checkout -b feature/new-feature
   # Work on feature
   git push origin feature/new-feature
   # Create Pull Request → Preview deployment
   ```

4. **Monitor Vercel Analytics after deploy**
   - Check for errors
   - Monitor performance
   - Watch user metrics

5. **Keep dependencies updated**
   ```bash
   npm outdated
   npm update
   ```

---

## 📞 Get Help

- 📖 **Full Guide**: `LOCAL_DEVELOPMENT_TO_VERCEL_GUIDE.md`
- 🎨 **Visual Guide**: `LOCAL_TO_VERCEL_VISUAL_GUIDE.md`
- 📚 **Workflow**: `MRADIPRO_VERCEL_COMPREHENSIVE_WORKFLOW.md`
- 💬 **Support**: support@mradipro.co.ke

---

## 🎓 Learning Resources

- **Vite**: https://vitejs.dev
- **React**: https://react.dev
- **Vercel**: https://vercel.com/docs
- **Tailwind CSS**: https://tailwindcss.com
- **Supabase**: https://supabase.com/docs

---

## ⚡ Quick Reference

```
DEVELOPMENT          DEPLOYMENT          TROUBLESHOOTING
───────────          ──────────          ───────────────
npm run dev          git add .           npm run build
npm run build        git commit -m       npm run lint
npm run preview      git push            npm audit
npm run lint         (auto-deploys)      git status
```

---

**🎉 Ready to build something amazing! 🚀**

**🇰🇪 MradiPro - Empowering Kenya's Builders! 🏗️**

---

*Keep this card handy for quick reference! 📌*
















