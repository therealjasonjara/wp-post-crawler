# 📂 Extension Structure & How It Works

## File Organization
```
wp-crawler/
├── manifest.json          # Extension config (tells browser what this is)
├── popup.html            # The UI you see when clicking the icon
├── popup.js              # Main logic (handles button clicks, crawling)
├── content.js            # Runs in WordPress pages (detects WP admin)
├── icon16.png            # Small icon
├── icon48.png            # Medium icon
├── icon128.png           # Large icon
└── README.md             # Full documentation
```

## How Data Flows

```
┌─────────────────────────────────────────────────────────┐
│  YOU: Click extension icon                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  popup.html opens (the UI)                              │
│  └─ Shows settings and "Start Crawling" button          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  YOU: Click "Start Crawling"                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  popup.js runs                                           │
│  └─ Injects crawling code into WordPress page           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Crawling happens IN the WordPress page                 │
│  └─ Reads DOM (title, content, images, meta)            │
│  └─ Like querySelector() to find elements               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Data returns to popup.js                               │
│  └─ Displays stats (X posts, Y images)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  YOU: Click "Download JSON"                             │
│  └─ JSON file saved to your Downloads folder            │
└─────────────────────────────────────────────────────────┘
```

## The Crawling Process (Like Tree Traversal)

```javascript
// Step 1: Find the root (WordPress page)
const page = document;

// Step 2: Find the post node
const post = page.querySelector('#post');

// Step 3: Visit child nodes (DFS style)
const data = {
    // Direct child nodes
    title: page.querySelector('#title').value,
    status: page.querySelector('#post_status').value,
    
    // Deep child node
    content: getEditorContent(),
    
    // Traverse subtree for images
    images: extractImagesFromContent(content)
};

// Step 4: Collect and return
return data;
```

## What Happens in Each File

### manifest.json
```json
{
  "name": "WordPress Post Crawler",
  "permissions": ["activeTab"],  // Can read current tab
  "action": {
    "default_popup": "popup.html"  // Opens this when clicked
  }
}
```

### popup.html
- Shows the UI (checkboxes, buttons)
- Loads popup.js to handle interactions
- Pretty interface with gradients

### popup.js
- Listens for button clicks
- Injects the crawler into WordPress page
- Receives crawled data back
- Creates JSON download

### content.js
- Runs automatically in WordPress admin
- Shows "WP Crawler Ready" indicator
- Provides helper functions

## DOM Tree Example

When you're on a WordPress post editor:

```
document (root)
  └─ body
      └─ #wpbody
          └─ #post
              ├─ #title (input)                   ← We grab this
              ├─ #content (editor)                 ← And this
              ├─ #excerpt (textarea)               ← And this
              ├─ #postimagediv
              │   └─ img (featured image)          ← And this
              └─ #yoast_wpseo_metadesc (input)    ← And this
```

Our crawler traverses this tree like:
```javascript
// Start at root
const root = document;

// Find specific nodes
const title = root.querySelector('#title');
const content = root.querySelector('#content');
const featuredImg = root.querySelector('#postimagediv img');

// Traverse and collect
const data = {
    title: title.value,
    content: content.value,
    featuredImage: {
        url: featuredImg.src,
        alt: featuredImg.alt
    }
};
```

## Image Extraction (Subtree Traversal)

```javascript
function extractImages(htmlContent) {
    // Parse HTML content into a DOM tree
    const parser = new DOMParser();
    const contentTree = parser.parseFromString(htmlContent, 'text/html');
    
    // Find all img nodes in this subtree (like finding all leaf nodes)
    const imageNodes = contentTree.querySelectorAll('img');
    
    // Visit each node and collect data
    const images = [];
    imageNodes.forEach(node => {
        images.push({
            url: node.src,
            alt: node.alt
        });
    });
    
    return images;
}
```

This is exactly like:
```javascript
// Tree traversal to find all leaf nodes of a certain type
function findAllNodes(tree, type) {
    const result = [];
    
    function traverse(node) {
        if (node.type === type) {
            result.push(node.value);
        }
        
        if (node.children) {
            node.children.forEach(child => traverse(child));
        }
    }
    
    traverse(tree);
    return result;
}
```

## Why This Approach Works

✅ **No server access needed** - Everything runs in the browser  
✅ **Can access drafts** - You're already logged in  
✅ **Safe for live sites** - No code changes to WordPress  
✅ **Works with any WP version** - Just reads the DOM  
✅ **Private** - Data stays on your computer  

## DSA Parallels

| Extension Action | DSA Concept |
|-----------------|-------------|
| `querySelector()` | Finding a node in a tree |
| `querySelectorAll()` | BFS to get all nodes at a level |
| Parsing HTML content | Building a tree structure |
| Extracting images | Traversing a subtree |
| Looping through posts | Iterating through an array/list |
| Collecting data | Building an output array |

---

Think of the browser extension as a tool that:
1. Enters the WordPress "tree" (DOM)
2. Traverses to find the nodes you want (posts, images, etc.)
3. Collects the data from those nodes
4. Returns it in a structured format (JSON)

Just like how you'd traverse a binary tree to find all nodes with a certain value!
