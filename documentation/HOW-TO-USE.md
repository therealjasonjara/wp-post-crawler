# 🚀 How to Use WordPress Post Crawler (Background Mode)

## 📖 Table of Contents
1. [What's New in v2.1](#whats-new)
2. [Quick Start](#quick-start)
3. [Understanding Background Mode](#background-mode)
4. [Step-by-Step Guide](#step-by-step)
5. [Export Options](#export-options)
6. [Image Downloads](#image-downloads)
7. [Troubleshooting](#troubleshooting)
8. [Technical Explanation](#technical)

---

## 🎉 What's New in v2.1 {#whats-new}

### ✅ Background Processing
**The extension now runs in the background!**

**Before (v2.0):**
- ❌ Had to keep popup open
- ❌ Closing popup stopped the crawl
- ❌ Lost progress if popup closed

**Now (v2.1):**
- ✅ Close popup anytime
- ✅ Crawl continues in background
- ✅ Check progress by reopening popup
- ✅ Go to other tabs while crawling

### How It Works (Simple Analogy)

Think of it like ordering food delivery:

**Old way (v2.0)** = Standing at the restaurant waiting for your food
- You had to stay there the whole time
- If you left, your order was cancelled

**New way (v2.1)** = Order online and go do other things
- Place your order
- Go watch TV, work, etc.
- Check your phone for delivery updates
- Food arrives even if you're not watching the app

---

## 🚀 Quick Start {#quick-start}

### Installation (5 minutes)

1. **Download all files:**
   - background.js ⭐ NEW!
   - manifest.json (updated)
   - popup-new.js (use this as popup.js)
   - popup.html
   - content.js
   - icon files (icon16.png, icon48.png, icon128.png)

2. **Create folder:**
   ```
   Create: C:\wp-crawler (Windows) or ~/wp-crawler (Mac)
   Put all files in this folder
   ```

3. **Load in browser:**
   
   **Chrome/Edge:**
   - Open `chrome://extensions/`
   - Turn on "Developer mode"
   - Click "Load unpacked"
   - Select your wp-crawler folder
   - Done! 🎉

   **Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select manifest.json
   - Done! 🎉

---

## 🧠 Understanding Background Mode {#background-mode}

### The Architecture (for JavaScript developers)

```javascript
// Old Architecture (v2.0)
popup.js (does everything)
  └─ When popup closes → everything stops ❌

// New Architecture (v2.1)
popup.js (UI only)
  ↓ sends message
background.js (worker - always running)
  ↓ does the work
  └─ sends updates back to popup ✅
```

### Data Structure & Algorithms Perspective

**The background worker is like a Queue + Worker Thread:**

```javascript
// Queue Pattern
const crawlQueue = {
  isRunning: false,      // Semaphore
  totalPosts: 0,         // Queue size
  crawledPosts: 0,       // Items processed
  posts: [],             // Result array
  settings: {}           // Job configuration
};

// Worker Thread Pattern
async function processQueue() {
  while (queue.hasItems()) {
    const item = queue.dequeue();
    const result = await process(item);
    queue.results.push(result);
    notifyUI(queue.progress);  // Non-blocking UI update
  }
}
```

This is similar to:
- **JavaScript Event Loop** - background worker = microtask queue
- **Message Queue** - popup sends jobs, worker processes
- **Producer-Consumer** - popup = producer, background = consumer

---

## 📝 Step-by-Step Guide {#step-by-step}

### Method 1: Crawl from Posts List (Quick Overview)

Best for: Getting basic info from many posts

```
1. Go to: wp-admin/edit.php (Posts list)

2. Click extension icon

3. Settings:
   ✅ Published Posts
   ✅ Draft Posts  
   ☐ Visit Each Post Page (leave unchecked for speed)
   Limit: 50

4. Click "Start Crawling"

5. ✨ CLOSE POPUP if you want! Crawl continues.

6. Later: Click icon again → See progress

7. When done: Click "Download Output Files"
```

**Result:** Basic info (title, URL, status) in ~5 seconds

---

### Method 2: Deep Crawl (Full Content)

Best for: Complete content extraction with images

```
1. Go to: wp-admin/edit.php (Posts list)

2. Click extension icon

3. Settings:
   ✅ Published Posts
   ✅ Draft Posts
   ✅ Visit Each Post Page ⭐ (ENABLE THIS)
   ✅ Download Images (optional)
   Limit: 20 (start small)

4. Click "Start Crawling"

5. See message: "Crawl started in background"

6. ✨ YOU CAN NOW:
   - Close the popup
   - Switch tabs
   - Browse other sites
   - Get coffee ☕

7. Check progress anytime:
   - Click extension icon
   - See: "Crawling post 5 of 20..."

8. When complete:
   - Popup shows: "Successfully crawled 20 posts!"
   - Click "Download Output Files"

9. Choose export format:
   - Single JSON
   - Single CSV
   - Multiple CSV (one per post)
```

**Time:** ~2-3 seconds per post = ~1 minute for 20 posts

---

### Method 3: Single Post Deep Dive

Best for: Testing or one specific post

```
1. Go to: wp-admin/post.php?post=123&action=edit

2. Click extension icon

3. Settings:
   ✅ Published Posts
   ☐ Visit Pages (not needed - already on post)

4. Click "Start Crawling"

5. Instant results (2 seconds)

6. Download files
```

---

## 📊 Export Options {#export-options}

### Option 1: Single JSON File

**Best for:** Developers, APIs, JavaScript processing

**Contains:**
```json
[
  {
    "id": "123",
    "title": "My Post",
    "content": "<p>Full HTML content...</p>",
    "metaDescription": "SEO description",
    "acfFields": {
      "custom_field": "value"
    },
    "images": [
      {
        "url": "https://site.com/image.jpg",
        "alt": "Image description",
        "type": "featured"
      }
    ],
    "status": "publish",
    "url": "https://site.com/my-post/",
    "date": "2024-01-15"
  }
]
```

---

### Option 2: Single CSV File

**Best for:** Excel, Google Sheets, data analysis

**Columns:**
```
ID | Title | Content | Meta Description | ACF Fields | Status | URL | Date | Image Count | Image URLs
```

**Opens in:** Excel, Google Sheets, any spreadsheet app

---

### Option 3: Multiple CSV Files (One Per Post)

**Best for:** Individual file management, organized archives

**Downloads:**
```
post-123-my-first-post.csv
post-124-another-post.csv
post-125-third-post.csv
...
```

Each file contains just that one post's data.

---

## 🖼️ Image Downloads {#image-downloads}

### Enable Image Downloads

```
Settings:
  ✅ Visit Each Post Page (REQUIRED for images)
  ✅ Download Images

Start Crawling
```

### Two Download Methods

**Method 1: Organized by Post** ⭐ RECOMMENDED
```
Downloads as:
  post-123-title/featured-1.jpg
  post-123-title/content-2.jpg
  post-124-title/featured-1.jpg
  ...

Plus: IMAGE-ORGANIZATION-GUIDE.txt

Run the script in the guide:
  → Instant folder organization! ✅
```

**Method 2: All in Downloads Folder**
```
Downloads as:
  post-123-featured-1.jpg
  post-123-content-2.jpg
  post-124-featured-1.jpg
  ...

Simple flat structure
```

### Organization Guide

After download, you get `IMAGE-ORGANIZATION-GUIDE.txt`:

**Windows (PowerShell):**
```powershell
Get-ChildItem -Filter "post-*" | ForEach-Object {
    $parts = $_.Name -split '/', 2
    if ($parts.Length -eq 2) {
        $folder = $parts[0]
        $file = $parts[1]
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        Move-Item $_.FullName "$folder/$file"
    }
}
```

**Mac/Linux (Terminal):**
```bash
for file in post-*/; do
    if [[ -f "$file" ]]; then
        folder=$(dirname "$file")
        mkdir -p "$folder"
        mv "$file" "$folder/"
    fi
done
```

Run this in your Downloads folder → Automatic organization! ✨

---

## 🔧 Troubleshooting {#troubleshooting}

### "Popup closed and crawl stopped"

**Solution:** Make sure you're using the NEW version (v2.1)
- Check that background.js exists in your folder
- Check manifest.json has `"background": { "service_worker": "background.js" }`
- Reload the extension

---

### "Can't see progress"

**Solution:** Click the extension icon again
- Background worker updates every 2 seconds
- Reopen popup to see current status
- Status persists even if popup was closed

---

### "No content extracted"

**Solution:** Enable "Visit Each Post Page"
- From posts list, basic info only is available
- Enable "Visit Pages" to get full content
- This takes longer but gets everything

---

### "Too slow"

**Solution:** Reduce post limit
- Start with 10-20 posts
- Each post visit takes ~2-3 seconds
- 50 posts = ~2-3 minutes
- Remember: You can close popup while waiting!

---

### "Extension stopped working after Chrome restart"

**Cause:** Service workers can be stopped by browser

**Solution:**
1. Click extension icon (wakes up service worker)
2. Check crawl state automatically resumes
3. If not, check browser console for errors

---

### "Images not downloading"

**Checklist:**
- ✅ "Visit Each Post Page" is enabled
- ✅ "Download Images" is checked
- ✅ Browser allows multiple downloads (check browser settings)
- ✅ Images exist in the posts

---

## 🧑‍💻 Technical Explanation {#technical}

### Architecture Components

```
┌─────────────────────────────────────┐
│  popup.html + popup.js              │
│  (UI Layer - Shows status, buttons) │
└──────────┬──────────────────────────┘
           │ chrome.runtime.sendMessage()
           ▼
┌─────────────────────────────────────┐
│  background.js (Service Worker)     │
│  (Business Logic - Does the work)   │
│  - Manages crawl state              │
│  - Visits pages                     │
│  - Collects data                    │
│  - Persists even when popup closed  │
└──────────┬──────────────────────────┘
           │ chrome.scripting.executeScript()
           ▼
┌─────────────────────────────────────┐
│  WordPress Admin Page               │
│  (Data Source - DOM to crawl)       │
└─────────────────────────────────────┘
```

### Message Flow

```javascript
// 1. User clicks "Start Crawling"
popup.js → chrome.runtime.sendMessage({
  action: 'startCrawl',
  settings: {...},
  tabId: 123
})

// 2. Background worker receives
background.js → starts async crawl operation
  - State stored in: currentCrawlState {}
  - Can run for minutes
  - Popup can close safely

// 3. Background sends updates
background.js → chrome.runtime.sendMessage({
  action: 'crawlUpdate',
  type: 'progress',
  data: { current: 5, total: 20 }
})

// 4. Popup checks state anytime
popup.js → chrome.runtime.sendMessage({
  action: 'getCrawlState'
})

background.js → responds with current state
```

### Why This Architecture?

**Problem with old approach:**
```javascript
// popup.js doing everything
async function crawl() {
  for (let i = 0; i < 100; i++) {
    await visitPage(i);  // Takes 2-3 seconds
    // If popup closes here → ALL WORK LOST! ❌
  }
}
```

**Solution with service worker:**
```javascript
// background.js (separate process)
async function crawl() {
  for (let i = 0; i < 100; i++) {
    await visitPage(i);
    // Popup can close → work continues! ✅
    notifyPopup({ progress: i / 100 });
  }
}
```

### Data Structure Used

```javascript
// State management (like Redux)
const crawlState = {
  isRunning: boolean,     // Mutex/lock
  totalPosts: number,     // Array length
  crawledPosts: number,   // Iterator position
  posts: Array<Post>,     // Accumulated results
  logs: Array<Log>,       // Debug info
  settings: Object        // Configuration
};

// Similar to:
class Queue {
  constructor() {
    this.items = [];
    this.processing = false;
  }
  
  enqueue(item) { ... }
  dequeue() { ... }
  getStatus() { return this.processing; }
}
```

---

## 🎯 Best Practices

### 1. Start Small
```
First crawl: 5 posts
If successful: 20 posts
Then: 50+ posts
```

### 2. Use Background Mode
```
- Enable "Visit Pages" for quality
- Start crawl
- Close popup
- Do other work
- Check back later
```

### 3. Organize Downloads
```
- Use "Organized by Post" for images
- Run organization script immediately
- Get perfect folder structure
```

### 4. Export Strategy
```
For development: JSON
For Excel analysis: Single CSV
For file management: Multiple CSV
```

---

## 📱 Quick Reference

### Settings Cheat Sheet

| Setting | When to Use |
|---------|-------------|
| Visit Pages: OFF | Quick list, basic info, 100+ posts |
| Visit Pages: ON | Full content, images, 10-50 posts |
| Download Images: ON | Need images, have time |
| Skip Redirects: ON | Clean export, no redirect posts |
| Limit: 0 | Crawl everything (careful!) |
| Limit: 20 | Safe testing, reasonable time |

### Time Estimates

| Posts | Visit Pages | Time |
|-------|-------------|------|
| 10 | OFF | 2 seconds |
| 10 | ON | 30 seconds |
| 50 | OFF | 2 seconds |
| 50 | ON | 2-3 minutes |
| 100 | OFF | 2 seconds |
| 100 | ON | 5-6 minutes |

---

## 🎓 For Developers

### Understanding the Code

**Queue Processing:**
```javascript
// Background worker = Queue processor
async function processQueue(items) {
  for (const item of items) {
    // Long operation
    const result = await crawlPost(item);
    
    // Update shared state
    state.results.push(result);
    state.progress++;
    
    // Non-blocking notification
    notifyUI(state);
  }
}
```

**Similar to:**
- Browser Event Loop (microtasks)
- Web Workers (background threads)
- Service Workers (persistent background tasks)
- Redux/Flux (centralized state)

---

## 💡 Tips & Tricks

1. **Close popup freely** - Work continues in background
2. **Check progress anytime** - Just reopen popup
3. **Start with small limits** - Test before big crawls
4. **Use organized downloads** - Easier file management
5. **Export to CSV for Excel** - Easy data analysis
6. **Enable debug logs** - Troubleshoot issues
7. **Refresh extension if stuck** - Chrome extensions menu

---

## 🆘 Need Help?

### Common Questions

**Q: Can I close my browser?**
A: No - service worker stops when browser closes. Keep browser open, but you can close the popup and switch tabs.

**Q: How do I know it's still running?**
A: Click the extension icon - you'll see progress like "Crawling post 15 of 50"

**Q: Can I stop a crawl?**
A: Close the browser tab or reload the extension

**Q: Images not organizing automatically?**
A: Run the script from IMAGE-ORGANIZATION-GUIDE.txt in your Downloads folder

---

**You're all set! Start crawling! 🚀**

For issues, check debug logs or browser console (F12).
