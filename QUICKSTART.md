# 🚀 Quick Start Guide

## Installation (2 minutes)

### Chrome:
1. Download ALL 8 files from this folder
2. Create a new folder on your computer called `wp-crawler`
3. Put all files in that folder
4. Open Chrome → `chrome://extensions/`
5. Toggle "Developer mode" ON (top right)
6. Click "Load unpacked" → Select your `wp-crawler` folder
7. Done! 🎉

### Firefox:
1. Download ALL 8 files
2. Put them in a folder
3. Open Firefox → `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file
6. Done! 🎉

## Usage (30 seconds)

1. Go to your WordPress admin (`yoursite.com/wp-admin`)
2. Open a post in the editor
3. Click the extension icon (🔍) in your browser toolbar
4. Click "Start Crawling"
5. Click "Download JSON"

That's it!

## Files You Need (All 8)
- ✅ manifest.json
- ✅ popup.html
- ✅ popup.js
- ✅ content.js
- ✅ icon16.png
- ✅ icon48.png
- ✅ icon128.png
- ✅ README.md

## 💡 Pro Tips

**For Best Results:**
- Crawl individual posts (post.php) to get full content + images
- Use posts list (edit.php) for quick metadata overview

**To Crawl Drafts:**
- Just check "Draft Posts" in the extension settings
- Works perfectly since you're already logged in!

**Large Sites:**
- Set a limit (e.g., 50 posts at a time)
- Crawl in batches to avoid slowdowns

## 🧠 The DSA Connection

Think of this like traversing a tree:
```javascript
// The WordPress page = Tree structure
const post = document.querySelector('#post');

// DFS: Go deep into each post
function crawl(post) {
    const data = {
        title: post.querySelector('#title').value,      // Visit node
        content: getContent(),                           // Visit child
        images: extractImages(content)                   // Traverse subtree
    };
    return data;
}

// BFS: Process multiple posts level-by-level
const posts = document.querySelectorAll('.type-post');
posts.forEach(post => crawl(post));
```

Just like:
- **querySelector()** finds a node in the DOM tree
- **querySelectorAll()** gets all nodes at a level
- **extractImages()** traverses the content subtree
- We collect data while visiting each node

## Need Help?

Check the full README.md for:
- Detailed explanations
- Troubleshooting tips
- Advanced features
- Complete DSA analogies

---

Happy crawling! 🎉
