# ✅ Installation Checklist

## Files You Need

```
□ background.js (NEW - the background worker)
□ manifest.json (UPDATED - v2.1.0)
□ popup-new.js (UPDATED - rename to popup.js)
□ popup.html (unchanged)
□ content.js (unchanged)
□ icon16.png (unchanged)
□ icon48.png (unchanged)
□ icon128.png (unchanged)
```

**Total: 8 files**

---

## Pre-Installation

```
□ Downloaded all 8 files to your computer
□ Created a folder: wp-crawler
□ Moved all 8 files into that folder
□ Renamed popup-new.js to popup.js
□ Checked that background.js exists
□ Checked that manifest.json says "version": "2.1.0"
```

---

## Chrome/Edge Installation

```
□ Opened Chrome/Edge
□ Went to: chrome://extensions/
□ Enabled "Developer mode" (top right toggle)
□ Clicked "Load unpacked"
□ Selected your wp-crawler folder
□ Extension appeared in list ✓
□ Extension icon appeared in toolbar ✓
```

---

## Firefox Installation

```
□ Opened Firefox
□ Went to: about:debugging#/runtime/this-firefox
□ Clicked "Load Temporary Add-on"
□ Selected manifest.json from your folder
□ Extension appeared in list ✓
□ Extension icon appeared in toolbar ✓
```

---

## Testing (5 minutes)

```
□ Opened WordPress admin
□ Went to: /wp-admin/edit.php
□ Clicked extension icon
□ Popup opened ✓
□ Saw all settings ✓

Test 1: Quick Crawl
□ Set limit to 5 posts
□ Checked "Published Posts"
□ Unchecked "Visit Each Post Page"
□ Clicked "Start Crawling"
□ Saw "Successfully crawled X posts" ✓
□ Clicked "Download Output Files"
□ JSON file downloaded ✓

Test 2: Background Mode (THE BIG TEST!)
□ Set limit to 5 posts
□ Checked "Published Posts"
□ Checked "Visit Each Post Page" ✅
□ Clicked "Start Crawling"
□ Saw "Crawl started in background" ✓
□ CLOSED THE POPUP ✅
□ Waited 10 seconds
□ Reopened extension popup
□ Saw progress: "Crawling post X of 5" ✓
   OR "Successfully crawled 5 posts" ✓
□ BACKGROUND MODE WORKS! 🎉
```

---

## Troubleshooting

### Extension Won't Load

```
□ Check all 8 files are in the folder
□ Check manifest.json is valid JSON
□ Check background.js exists
□ Try restarting browser
□ Try removing and reinstalling
```

### No Icon in Toolbar

```
□ Check if extension is enabled
□ Click puzzle icon (⚙️) in toolbar
□ Pin WordPress Post Crawler
□ Icon should appear
```

### Background Mode Not Working

```
□ Check browser console (F12)
□ Look for "Background service worker initialized"
□ If not there:
  □ Check manifest.json has background section
  □ Check background.js exists
  □ Reload extension
  □ Restart browser
```

### Popup Opens but Nothing Happens

```
□ Check you're on WordPress admin page
□ URL should have /wp-admin/ in it
□ Try going to /wp-admin/edit.php
□ Check browser console for errors
```

---

## Success Criteria

✅ **You've successfully installed if:**

1. Extension icon appears in toolbar
2. Clicking icon opens popup with settings
3. Can crawl 5 posts quickly (without "Visit Pages")
4. Can start a crawl with "Visit Pages" enabled
5. **Can close popup while crawling**
6. **Progress persists when reopening popup**
7. Can download files when complete

---

## File Structure Check

Your folder should look like this:

```
wp-crawler/
├── background.js         ← NEW!
├── manifest.json         ← UPDATED!
├── popup.js              ← UPDATED! (renamed from popup-new.js)
├── popup.html            ← Same
├── content.js            ← Same
├── icon16.png            ← Same
├── icon48.png            ← Same
└── icon128.png           ← Same
```

---

## Next Steps

```
□ Read HOW-TO-USE.md for complete guide
□ Read MIGRATION-GUIDE.md if upgrading from v2.0
□ Read ARCHITECTURE.md to understand how it works
□ Start with small crawls (5-10 posts)
□ Test closing popup during crawl
□ Try larger crawls (50+ posts)
□ Export to different formats (JSON, CSV)
□ Test image downloads
```

---

## Common First-Time Issues

### "Not on WordPress admin"
**Solution:** Navigate to /wp-admin/edit.php first

### "No posts found"
**Solution:** Make sure site has posts, check status filters

### "Content is empty"
**Solution:** Enable "Visit Each Post Page" for full content

### "Too slow"
**Solution:** This is normal! Each post takes 2-3 seconds. Reduce limit or close popup and come back later.

---

## Documentation Files

```
□ HOW-TO-USE.md - Complete usage guide
□ MIGRATION-GUIDE.md - Upgrade guide for v2.0 users
□ ARCHITECTURE.md - How it works (with DSA analogies)
□ INSTALLATION-CHECKLIST.md - This file
```

---

## Quick Reference Card

```
Start Crawl:
  1. Go to /wp-admin/edit.php
  2. Click extension icon
  3. Set limit (start with 10)
  4. Check "Visit Each Post Page" for full content
  5. Click "Start Crawling"
  6. Close popup if you want! ✅
  7. Come back later
  8. Download files

Check Progress:
  - Click extension icon anytime
  - See "Crawling post X of Y"
  - Or "Successfully crawled Y posts"

Download:
  - Click "Download Output Files"
  - Choose format (JSON/CSV)
  - Files download automatically

Troubleshoot:
  - Check browser console (F12)
  - Download debug logs
  - Reload extension
  - Check documentation
```

---

## Version Check

Make sure you have v2.1.0:

```
□ Open manifest.json
□ Check: "version": "2.1.0"
□ Check: "background": { "service_worker": "background.js" }
□ If yes → You have the right version ✓
□ If no → Download the updated files
```

---

## Support Resources

**If something doesn't work:**

1. Check browser console (F12) for errors
2. Download debug logs from extension
3. Read troubleshooting section in HOW-TO-USE.md
4. Check ARCHITECTURE.md to understand the system
5. Try with a fresh browser profile

---

## You're Ready! 🎉

If all checkboxes above are marked, you're all set!

**Test it now:**
1. Go to WordPress admin
2. Start a 5-post crawl with "Visit Pages" enabled
3. Close the popup
4. Wait 20 seconds
5. Reopen popup
6. If you see progress → SUCCESS! 🎊

**The extension now runs in the background!**

No more babysitting popups. Start your crawl and go grab coffee! ☕

---

**Happy Crawling! 🚀**
