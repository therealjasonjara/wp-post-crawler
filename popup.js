// popup.js - Simplified popup that delegates to background worker
// Think of this as the UI layer that sends jobs to a worker thread

document.addEventListener('DOMContentLoaded', () => {
  const crawlButton = document.getElementById('crawlButton');
  const downloadButton = document.getElementById('downloadButton');
  const downloadLogsButton = document.getElementById('downloadLogsButton');
  const statusMessage = document.getElementById('statusMessage');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const statsSection = document.getElementById('statsSection');
  const postCountEl = document.getElementById('postCount');
  const imageCountEl = document.getElementById('imageCount');
  
  let checkInterval = null;

  // Show status message
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
  }

  // Update progress bar
  function updateProgress(percent) {
    if (percent > 0) {
      progressBar.classList.add('active');
      progressFill.style.width = `${percent}%`;
    } else {
      progressBar.classList.remove('active');
    }
  }

  // Update stats
  function updateStats(posts, images) {
    postCountEl.textContent = posts;
    imageCountEl.textContent = images;
    statsSection.style.display = 'block';
  }

  // Check crawl state from background worker
  async function checkCrawlState() {
    const response = await chrome.runtime.sendMessage({ action: 'getCrawlState' });
    const state = response.state;
    
    if (state.isRunning) {
      // Crawl is running
      crawlButton.disabled = true;
      crawlButton.textContent = 'Crawling...';
      downloadButton.style.display = 'none';
      
      if (state.totalPosts > 0) {
        const percent = Math.round((state.crawledPosts / state.totalPosts) * 100);
        updateProgress(percent);
        showStatus(`Crawling post ${state.crawledPosts} of ${state.totalPosts}...`, 'info');
      } else {
        updateProgress(50);
        showStatus('Starting crawl...', 'info');
      }
    } else {
      // Crawl is not running
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      
      crawlButton.disabled = false;
      crawlButton.textContent = 'Start Crawling';
      updateProgress(0);
      
      if (state.posts.length > 0) {
        // Crawl completed
        const totalImages = state.posts.reduce((sum, post) => {
          return sum + (post.images ? post.images.length : 0);
        }, 0);
        
        updateStats(state.posts.length, totalImages);
        showStatus(`Successfully crawled ${state.posts.length} posts!`, 'success');
        downloadButton.style.display = 'block';
        
        // Handle image downloads if enabled
        const downloadImages = document.getElementById('downloadImages')?.checked ?? false;
        if (downloadImages && totalImages > 0) {
          showStatus(`Crawl complete! Ready to download. ${totalImages} images found.`, 'success');
        }
      }
    }
    
    return state;
  }

  // Download JSON
  function downloadJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordpress-posts-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Download single CSV
  function downloadSingleCSV(data) {
    function escapeCSV(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }
    
    const headers = ['ID', 'Title', 'Content', 'Meta Description', 'ACF Fields', 'Status', 'URL', 'Date', 'Is Redirected', 'Redirect URL', 'Image Count', 'Image URLs'];
    let csv = headers.join(',') + '\n';
    
    data.forEach(post => {
      let acfFieldsStr = '';
      if (post.acfFields && Object.keys(post.acfFields).length > 0) {
        acfFieldsStr = Object.entries(post.acfFields)
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ');
      }
      
      const row = [
        escapeCSV(post.id),
        escapeCSV(post.title),
        escapeCSV(post.content),
        escapeCSV(post.metaDescription),
        escapeCSV(acfFieldsStr),
        escapeCSV(post.status),
        escapeCSV(post.url),
        escapeCSV(post.date),
        escapeCSV(post.isRedirected),
        escapeCSV(post.redirectUrl),
        post.images ? post.images.length : 0,
        escapeCSV(post.images ? post.images.map(img => img.url).join('|') : '')
      ];
      
      csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordpress-posts-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Download multiple CSV files
  function downloadMultipleCSV(data) {
    showStatus(`Preparing ${data.length} CSV files for download...`, 'info');
    
    function escapeCSV(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }
    
    function sanitizeFilename(name) {
      return name
        .substring(0, 50)
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    }
    
    const headers = ['ID', 'Title', 'Content', 'Meta Description', 'ACF Fields', 'Status', 'URL', 'Date', 'Is Redirected', 'Redirect URL', 'Image Count', 'Image URLs'];
    
    data.forEach((post, index) => {
      setTimeout(() => {
        let acfFieldsStr = '';
        if (post.acfFields && Object.keys(post.acfFields).length > 0) {
          acfFieldsStr = Object.entries(post.acfFields)
            .map(([key, value]) => `${key}: ${value}`)
            .join(' | ');
        }
        
        let csv = headers.join(',') + '\n';
        const row = [
          escapeCSV(post.id),
          escapeCSV(post.title),
          escapeCSV(post.content),
          escapeCSV(post.metaDescription),
          escapeCSV(acfFieldsStr),
          escapeCSV(post.status),
          escapeCSV(post.url),
          escapeCSV(post.date),
          escapeCSV(post.isRedirected),
          escapeCSV(post.redirectUrl),
          post.images ? post.images.length : 0,
          escapeCSV(post.images ? post.images.map(img => img.url).join('|') : '')
        ];
        
        csv += row.join(',');
        
        const filename = `post-${post.id || index + 1}-${sanitizeFilename(post.title)}.csv`;
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (index === data.length - 1) {
          showStatus(`All ${data.length} CSV files downloaded!`, 'success');
        } else {
          showStatus(`Downloading file ${index + 1} of ${data.length}...`, 'info');
        }
      }, index * 300);
    });
  }

  // Download images
  async function downloadImages(posts) {
    const organizationMethod = await showImageDownloadOptions(posts);
    
    if (!organizationMethod) {
      showStatus('Image download cancelled', 'info');
      return;
    }
    
    if (organizationMethod === 'organized') {
      await downloadImagesOrganized(posts);
    } else {
      await downloadImagesSimple(posts);
    }
  }

  function showImageDownloadOptions(posts) {
    return new Promise((resolve) => {
      const totalImages = posts.reduce((sum, post) => {
        return sum + (post.images ? post.images.length : 0);
      }, 0);
      
      const message = `Found ${totalImages} images in ${posts.length} posts.\n\nHow would you like to download them?\n\n1. Organized by Post (one folder per post) - RECOMMENDED\n2. All in Downloads folder`;
      
      const choice = confirm(message + '\n\nClick OK for Organized, Cancel for Simple.');
      resolve(choice ? 'organized' : 'simple');
    });
  }

  async function downloadImagesOrganized(posts) {
    let downloaded = 0;
    const manifestData = [];
    
    function sanitizeFilename(name) {
      return name.substring(0, 50).replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    }
    
    for (let postIndex = 0; postIndex < posts.length; postIndex++) {
      const post = posts[postIndex];
      if (!post.images || post.images.length === 0) continue;
      
      const postFolder = `post-${post.id}-${sanitizeFilename(post.title)}`;
      const postManifest = {
        postId: post.id,
        postTitle: post.title,
        folder: postFolder,
        images: []
      };
      
      for (let imgIndex = 0; imgIndex < post.images.length; imgIndex++) {
        const image = post.images[imgIndex];
        
        try {
          showStatus(`Post ${postIndex + 1}/${posts.length}: Downloading image ${imgIndex + 1}/${post.images.length}...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 400));
          
          const extension = image.url.split('.').pop().split('?')[0] || 'jpg';
          const imageFilename = `${sanitizeFilename(image.type || 'image')}-${imgIndex + 1}.${extension}`;
          const fullPath = `${postFolder}/${imageFilename}`;
          
          const a = document.createElement('a');
          a.href = image.url;
          a.download = fullPath;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          downloaded++;
          postManifest.images.push({
            filename: imageFilename,
            url: image.url,
            type: image.type,
            alt: image.alt
          });
        } catch (error) {
          console.error('Failed to download image:', error);
        }
      }
      
      if (postManifest.images.length > 0) {
        manifestData.push(postManifest);
      }
    }
    
    // Create manifest file
    const manifestText = createImageManifest(manifestData);
    const blob = new Blob([manifestText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IMAGE-ORGANIZATION-GUIDE.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus(`Downloaded ${downloaded} images! Check IMAGE-ORGANIZATION-GUIDE.txt`, 'success');
  }

  async function downloadImagesSimple(posts) {
    const allImages = [];
    
    function sanitizeFilename(name) {
      return name.substring(0, 50).replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
    }
    
    posts.forEach(post => {
      if (post.images && post.images.length > 0) {
        post.images.forEach(img => {
          if (!allImages.find(i => i.url === img.url)) {
            allImages.push({
              url: img.url,
              postId: post.id,
              postTitle: post.title,
              type: img.type,
              alt: img.alt || ''
            });
          }
        });
      }
    });
    
    let downloaded = 0;
    
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
      
      try {
        showStatus(`Downloading image ${i + 1} of ${allImages.length}...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const extension = image.url.split('.').pop().split('?')[0] || 'jpg';
        const filename = `post-${image.postId}-${sanitizeFilename(image.type || 'image')}-${i + 1}.${extension}`;
        
        const a = document.createElement('a');
        a.href = image.url;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        downloaded++;
      } catch (error) {
        console.error('Failed to download image:', error);
      }
    }
    
    showStatus(`Downloaded ${downloaded} images!`, 'success');
  }

  function createImageManifest(manifestData) {
    let text = `WORDPRESS POST IMAGES - ORGANIZATION GUIDE
Generated: ${new Date().toLocaleString()}
Total Posts: ${manifestData.length}

============================================
HOW TO ORGANIZE YOUR DOWNLOADED IMAGES
============================================

OPTION 1: Automatic (Windows PowerShell)
Get-ChildItem -Filter "post-*" | ForEach-Object {
    $parts = $_.Name -split '/', 2
    if ($parts.Length -eq 2) {
        $folder = $parts[0]; $file = $parts[1]
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        Move-Item $_.FullName "$folder/$file"
    }
}

OPTION 2: Automatic (Mac/Linux)
for file in post-*/; do
    if [[ -f "$file" ]]; then
        folder=$(dirname "$file")
        mkdir -p "$folder"
        mv "$file" "$folder/"
    fi
done

============================================
IMAGE LIST
============================================

`;
    
    manifestData.forEach((post, index) => {
      text += `\n${index + 1}. ${post.postTitle} (ID: ${post.postId})\n`;
      text += `   Folder: ${post.folder}\n`;
      text += `   Images: ${post.images.length}\n`;
      post.images.forEach(img => {
        text += `   - ${img.filename} (${img.type})\n`;
      });
    });
    
    return text;
  }

  // Start crawling - delegate to background worker
  crawlButton.addEventListener('click', async () => {
    try {
      const settings = {
        includePublished: document.getElementById('includePublished').checked,
        includeDrafts: document.getElementById('includeDrafts').checked,
        includePending: document.getElementById('includePending').checked,
        includeScheduled: document.getElementById('includeScheduled').checked,
        limit: parseInt(document.getElementById('postLimit').value) || 0,
        skipRedirects: document.getElementById('skipRedirects')?.checked ?? true,
        visitPages: document.getElementById('visitPages')?.checked ?? false
      };
      
      if (!settings.includePublished && !settings.includeDrafts && 
          !settings.includePending && !settings.includeScheduled) {
        showStatus('Please select at least one post status', 'error');
        return;
      }
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('/wp-admin/')) {
        showStatus('Please navigate to WordPress admin', 'error');
        return;
      }
      
      // Clear previous state
      await chrome.runtime.sendMessage({ action: 'clearState' });
      
      // Start crawl in background
      showStatus('Starting crawl in background...', 'info');
      const response = await chrome.runtime.sendMessage({ 
        action: 'startCrawl',
        settings: settings,
        tabId: tab.id
      });
      
      if (response.success) {
        showStatus('Crawl started! You can close this popup. Click the extension icon again to check progress.', 'success');
        
        // Start checking state every 2 seconds
        checkInterval = setInterval(checkCrawlState, 2000);
        checkCrawlState(); // Check immediately
      }
      
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
      console.error('Crawl error:', error);
    }
  });

  // Download button
  downloadButton.addEventListener('click', async () => {
    const state = await checkCrawlState();
    if (state.posts.length === 0) return;
    
    const exportFormat = document.getElementById('exportFormat').value;
    
    switch (exportFormat) {
      case 'json':
        downloadJSON(state.posts);
        showStatus('JSON downloaded!', 'success');
        break;
      case 'csv-single':
        downloadSingleCSV(state.posts);
        showStatus('CSV downloaded!', 'success');
        break;
      case 'csv-multiple':
        downloadMultipleCSV(state.posts);
        break;
    }
    
    // Download images if requested
    const downloadImagesOption = document.getElementById('downloadImages')?.checked ?? false;
    if (downloadImagesOption) {
      const totalImages = state.posts.reduce((sum, post) => {
        return sum + (post.images ? post.images.length : 0);
      }, 0);
      
      if (totalImages > 0) {
        setTimeout(() => downloadImages(state.posts), 1000);
      }
    }
  });

  // Download logs
  if (downloadLogsButton) {
    downloadLogsButton.addEventListener('click', async () => {
      const state = await checkCrawlState();
      const json = JSON.stringify(state.logs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wp-crawler-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('Logs downloaded!', 'success');
    });
  }

  // Check state on popup open
  checkCrawlState();
  
  // Listen for updates from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'crawlUpdate') {
      if (request.type === 'progress') {
        checkCrawlState();
      } else if (request.type === 'complete') {
        checkCrawlState();
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      } else if (request.type === 'error') {
        showStatus(`Error: ${request.data.message}`, 'error');
        downloadLogsButton.style.display = 'block';
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }
    }
  });
});
