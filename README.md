# 🔍 WordPress Post Crawler - Browser Extension

A powerful Chrome/Firefox browser extension to crawl and extract data from WordPress posts directly from your browser - no PHP code needed!

## ✨ Features

- 🎯 **Crawl from Browser**: No need to edit `functions.php` or install plugins
- 📝 **Extract Everything**: Title, content, meta descriptions, and all images
- 🔐 **Access Drafts**: Works with published posts, drafts, pending, and scheduled posts
- 🚀 **Live Site Safe**: No server-side code, runs entirely in your browser
- 💾 **Export to JSON**: Download clean, structured JSON data
- 🎨 **Beautiful UI**: Modern, intuitive interface
- ⚡ **Fast**: Crawls multiple posts instantly

## 📦 What Gets Crawled?

✅ **Post Title**  
✅ **Post Content** (HTML with full formatting)  
✅ **Meta Description** (from Yoast SEO, Rank Math, or All in One SEO)  
✅ **Featured Image**  
✅ **Content Images** (all images in post content)  
✅ **Gallery Images**  
✅ **Post Status** (published, draft, pending, scheduled)  
✅ **Post URL & Date**  
✅ **Redirect Detection** (automatically skips redirected posts)  

## 🚀 Installation

### For Chrome:
1. Download all extension files to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the folder containing the extension files
6. Done! You'll see the extension icon in your toolbar

### For Firefox:
1. Download all extension files to a folder
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file
5. Done! (Note: temporary add-ons are removed when Firefox closes)

## 📖 How to Use

### Method 1: Crawl Single Post (Best for detailed data)
1. Log into your WordPress admin
2. Open any post in the editor (`/wp-admin/post.php?post=XXX`)
3. Click the extension icon in your toolbar
4. Configure settings (post statuses to include)
5. Click **"Start Crawling"**
6. Click **"Download JSON"** to save the data

### Method 2: Crawl Multiple Posts (Quick overview)
1. Go to WordPress Posts list (`/wp-admin/edit.php`)
2. Click the extension icon
3. Configure how many posts to crawl
4. Click **"Start Crawling"**
5. Download the JSON file

**Note:** When crawling from the posts list, content and images are limited. For full content extraction, use Method 1 (single post view).

## 📊 Output Format

```json
[
  {
    "id": "123",
    "title": "My Awesome Post",
    "content": "<p>Full HTML content here...</p>",
    "metaDescription": "SEO meta description",
    "images": [
      {
        "url": "https://example.com/wp-content/uploads/2024/image.jpg",
        "alt": "Image description",
        "title": "Image title",
        "type": "featured"
      },
      {
        "url": "https://example.com/another-image.jpg",
        "alt": "Content image",
        "title": "",
        "type": "content"
      }
    ],
    "status": "publish",
    "url": "https://example.com/my-awesome-post/",
    "date": "Published 2024-01-15",
    "isRedirected": false,
    "redirectUrl": ""
  }
]
```

## 🧠 DSA Analogy: DOM Tree Traversal

This extension is like **Tree Traversal + BFS/DFS** algorithms:

### The WordPress Page is a Tree Structure:
```
        [WordPress Admin Page - Root]
              |
        [Post Editor - Node]
        /    |    |    \
    Title  Content Meta  Images
                    |
            [Featured, Content, Gallery]
```

### How It Works (JavaScript/DSA Perspective):

**1. BFS-like Approach for Multiple Posts:**
```javascript
// Visit each post at the same level (like BFS)
const postRows = document.querySelectorAll('tr.type-post');
const crawledPosts = [];

// Level-by-level traversal
postRows.forEach(row => {
    const postData = extractBasicInfo(row); // Visit node
    crawledPosts.push(postData);           // Collect data
});
```

**2. DFS-like Approach for Single Post:**
```javascript
// Go deep into the post structure (like DFS)
function crawlSinglePost() {
    const post = {};
    
    // Visit root node (post)
    post.title = getTitle();
    
    // Go deep into content (visit children)
    post.content = getContent();
    
    // Recursively find images (traverse subtree)
    post.images = extractImages(post.content);
    
    return post;
}
```

**3. Image Extraction = Subtree Traversal:**
```javascript
// Find all img nodes in the content tree
function extractImages(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Traverse the DOM tree to find all img elements
    const images = [];
    const imgNodes = doc.querySelectorAll('img'); // Get all leaf nodes
    
    imgNodes.forEach(img => {
        images.push({
            url: img.src,
            alt: img.alt
        });
    });
    
    return images;
}
```

### Key Concepts:
- **querySelector** = Finding a specific node in the tree
- **querySelectorAll** = Getting all nodes at a level (like BFS)
- **DOM traversal** = Walking through parent/child relationships
- **Parsing HTML** = Building and traversing a tree structure
- **Data extraction** = Visiting nodes and collecting values

Think of it like this:
1. The WordPress page is a **tree** (DOM tree)
2. We **traverse** this tree to find specific elements
3. We **extract data** from each node we visit
4. We **collect results** in an array (like BFS/DFS output)

## 🎛️ Settings

- **Post Status Filters**: Choose which post types to include
- **Number of Posts**: Limit how many posts to crawl (0 = all posts)
- **Skip Redirected Posts**: Automatically exclude posts that redirect to other pages (enabled by default)

### Redirect Detection
The extension automatically detects redirects from:
- ✅ Yoast SEO redirects
- ✅ Rank Math redirects
- ✅ Redirection plugin
- ✅ Simple 301 Redirects
- ✅ Custom redirect fields
- ✅ Canonical URL redirects

When enabled, redirected posts are filtered out before export. Uncheck "Skip Redirected Posts" to include them in your export.

## ⚠️ Important Notes

### Content Limitations:
- **Single Post View**: Full content and all images ✅
- **Posts List View**: Limited to basic info (title, status, URL) ⚠️

### Supported Editors:
- ✅ Classic Editor (TinyMCE)
- ✅ Gutenberg (Block Editor)

### SEO Plugin Support:
- ✅ Yoast SEO
- ✅ Rank Math
- ✅ All in One SEO Pack

## 🔧 Troubleshooting

- **"Please navigate to WordPress admin"**: Make sure you're on `/wp-admin/`
- **No content extracted**: Open individual posts for full content
- **Extension not appearing**: Check `chrome://extensions/` and refresh

## 📁 Files Included

- `manifest.json` - Extension configuration
- `popup.html` - Extension interface
- `popup.js` - Main logic and crawling code
- `content.js` - WordPress page integration
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons

## 🔒 Privacy

- ✅ All processing happens locally in your browser
- ✅ No data sent to external servers
- ✅ Only accesses pages you're logged into

---

**Made with ❤️ for WordPress content creators**
