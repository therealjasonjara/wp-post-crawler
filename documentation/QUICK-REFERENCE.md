# 📋 Quick Reference Card

**WordPress Post Crawler v2.1** - Keep this handy!

---

## 🚀 Basic Workflow

```
1. Go to /wp-admin/edit.php
2. Click extension icon
3. Configure settings
4. Click "Start Crawling"
5. Close popup (optional!) ✅
6. Reopen anytime to check progress
7. Download when complete
```

---

## ⚙️ Settings Quick Guide

| Setting | Use When |
|---------|----------|
| **Published Posts** | Want published content |
| **Draft Posts** | Need drafts too |
| **Visit Each Post Page** | Need full content/images |
| **Download Images** | Want all images |
| **Skip Redirects** | Clean export only |
| **Limit: 0** | Crawl everything |
| **Limit: 10-20** | Safe testing |

---

## 📊 Export Formats

| Format | Best For |
|--------|----------|
| **JSON** | Developers, APIs |
| **Single CSV** | Excel, analysis |
| **Multiple CSV** | Individual files |

---

## ⏱️ Time Estimates

| Posts | Mode | Time |
|-------|------|------|
| 10 | Quick | 2 sec |
| 10 | Deep | 30 sec |
| 50 | Quick | 2 sec |
| 50 | Deep | 2-3 min |

---

## 🎯 Common Tasks

### Quick List Export
```
□ Visit Pages: OFF
□ Limit: 0 (all)
□ Export: CSV
→ Result: 2 seconds
```

### Full Content Export
```
□ Visit Pages: ON ✅
□ Limit: 20
□ Export: JSON
→ Result: 1 minute
```

### With Images
```
□ Visit Pages: ON ✅
□ Download Images: ON ✅
□ Organized by Post: Yes
→ Result: 2-3 minutes
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension won't load | Reload extension, restart browser |
| No content | Enable "Visit Pages" |
| Too slow | Reduce limit, close popup |
| Images not downloading | Enable "Visit Pages" |
| Can't see progress | Reopen popup |

---

## 💡 Pro Tips

✅ **Start small** - Test with 5 posts first  
✅ **Close popup** - For long crawls, close and come back  
✅ **Check progress** - Reopen popup anytime  
✅ **Organize images** - Use "Organized by Post" option  
✅ **Use limits** - Don't crawl 500 posts at once  

---

## 🔑 Keyboard Shortcuts

- **F12** - Open browser console (for debugging)
- **Ctrl+Shift+E** - Chrome extensions page
- **Ctrl+J** - Downloads folder

---

## 📱 Status Messages

| Message | Meaning |
|---------|---------|
| "Crawl started in background" | ✅ Working, can close popup |
| "Crawling post X of Y" | ⏳ In progress |
| "Successfully crawled X posts" | ✅ Complete, ready to download |
| "Please navigate to WordPress admin" | ❌ Wrong page |

---

## 🎓 Remember

**The golden rule:**  
Enable "Visit Pages" = Full content + Slower  
Disable "Visit Pages" = Basic info + Faster

**The new superpower:**  
You can close the popup! ✨  
Work continues in background.

---

## 📞 Help

**Stuck?** Check these files in order:

1. INSTALLATION-CHECKLIST.md
2. HOW-TO-USE.md (troubleshooting)
3. Browser console (F12)
4. Debug logs (extension button)

---

## 🎯 Quick Test

**Test background mode (30 seconds):**

```
1. /wp-admin/edit.php
2. Extension icon
3. Visit Pages: ✅, Limit: 5
4. Start Crawling
5. CLOSE POPUP ✨
6. Wait 20 seconds
7. Reopen popup
8. See progress? → WORKING! 🎉
```

---

## 📁 File Types

**You'll download:**
- `.json` - For developers
- `.csv` - For Excel/Sheets
- `.jpg/.png` - Images
- `.txt` - Organization guide

---

## 🚦 Decision Tree

```
Need full content? 
  Yes → Enable "Visit Pages"
  No → Leave it off

Need images?
  Yes → Enable "Visit Pages" + "Download Images"
  No → Skip it

More than 20 posts?
  Yes → Set limit, use background mode
  No → Quick crawl is fine

Opening in Excel?
  Yes → Export CSV
  No → Export JSON
```

---

**Keep this card handy for quick reference!** 📌

For full details, see HOW-TO-USE.md
