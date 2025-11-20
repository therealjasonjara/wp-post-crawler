// popup.js - Extension popup logic

// Logging system
const Logger = {
  logs: [],
  
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    this.logs.push(logEntry);
    console.log(`[${level}] ${message}`, data || '');
  },
  
  info(message, data) {
    this.log('INFO', message, data);
  },
  
  warn(message, data) {
    this.log('WARN', message, data);
  },
  
  error(message, data) {
    this.log('ERROR', message, data);
  },
  
  debug(message, data) {
    this.log('DEBUG', message, data);
  },
  
  exportLogs() {
    const json = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wp-crawler-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  clear() {
    this.logs = [];
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Logger.info('Extension popup loaded');
  
  const crawlButton = document.getElementById('crawlButton');
  const downloadButton = document.getElementById('downloadButton');
  const downloadLogsButton = document.getElementById('downloadLogsButton');
  const statusMessage = document.getElementById('statusMessage');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const statsSection = document.getElementById('statsSection');
  const postCountEl = document.getElementById('postCount');
  const imageCountEl = document.getElementById('imageCount');

  let crawledData = [];

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

  // Visit each post page individually for complete content
  async function visitEachPost(posts, currentTabId, progressCallback) {
    Logger.info('Starting individual page visits', { postCount: posts.length });
    
    const detailedPosts = [];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      
      if (!post.url || !post.url.includes('/wp-admin/')) {
        Logger.warn('Skipping post - no valid admin URL', { post: post.title });
        detailedPosts.push(post);
        continue;
      }

      try {
        // Convert view URL to edit URL
        let editUrl = post.url;
        if (post.id && !editUrl.includes('post.php')) {
          editUrl = editUrl.replace(/\/[^\/]+\/$/, `/wp-admin/post.php?post=${post.id}&action=edit`);
        }

        Logger.info(`Visiting post ${i + 1}/${posts.length}`, { 
          id: post.id, 
          title: post.title,
          url: editUrl 
        });

        // Update progress
        if (progressCallback) {
          progressCallback(i + 1, posts.length);
        }

        // Navigate to the post edit page
        await chrome.tabs.update(currentTabId, { url: editUrl });

        // Wait for page to load
        await new Promise(resolve => {
          const listener = (tabId, changeInfo) => {
            if (tabId === currentTabId && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }, 10000);
        });

        // Wait a bit more for editor to initialize
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Crawl this specific post
        const results = await chrome.scripting.executeScript({
          target: { tabId: currentTabId },
          function: crawlWordPressPosts,
          args: [{ includePublished: true, includeDrafts: true, limit: 1 }]
        });

        if (results && results[0] && results[0].result && results[0].result[0]) {
          const detailedPost = results[0].result[0];
          Logger.info('Successfully crawled post', { 
            id: detailedPost.id,
            contentLength: detailedPost.content?.length 
          });
          detailedPosts.push(detailedPost);
        } else {
          Logger.warn('Failed to crawl post, using basic data', { id: post.id });
          detailedPosts.push(post);
        }

      } catch (error) {
        Logger.error('Error visiting post', { 
          id: post.id, 
          title: post.title,
          error: error.message 
        });
        // Keep the basic data if detailed crawl fails
        detailedPosts.push(post);
      }
    }

    Logger.info('Page visits complete', { 
      attempted: posts.length, 
      successful: detailedPosts.length 
    });

    return detailedPosts;
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

  // Convert post data to CSV row
  function postToCSV(post) {
    // Escape CSV values
    function escapeCSV(value) {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    // Convert ACF fields to readable format
    let acfFieldsStr = '';
    if (post.acfFields && Object.keys(post.acfFields).length > 0) {
      acfFieldsStr = Object.entries(post.acfFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
    }

    // CSV columns
    const row = {
      id: escapeCSV(post.id),
      title: escapeCSV(post.title),
      content: escapeCSV(post.content),
      metaDescription: escapeCSV(post.metaDescription),
      acfFields: escapeCSV(acfFieldsStr),
      status: escapeCSV(post.status),
      url: escapeCSV(post.url),
      date: escapeCSV(post.date),
      isRedirected: escapeCSV(post.isRedirected),
      redirectUrl: escapeCSV(post.redirectUrl),
      imageCount: post.images ? post.images.length : 0,
      images: escapeCSV(post.images ? post.images.map(img => img.url).join('|') : '')
    };

    return row;
  }

  // Download single CSV file with all posts
  function downloadSingleCSV(data) {
    Logger.info('Exporting to single CSV', { postCount: data.length });
    
    // CSV header
    const headers = ['ID', 'Title', 'Content', 'Meta Description', 'ACF Fields', 'Status', 'URL', 'Date', 'Is Redirected', 'Redirect URL', 'Image Count', 'Image URLs'];
    let csv = headers.join(',') + '\n';

    // Add each post
    data.forEach(post => {
      const row = postToCSV(post);
      csv += [
        row.id, row.title, row.content, row.metaDescription, row.acfFields,
        row.status, row.url, row.date, row.isRedirected, 
        row.redirectUrl, row.imageCount, row.images
      ].join(',') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordpress-posts-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Logger.info('Single CSV downloaded');
  }

  // Download multiple CSV files (one per post)
  function downloadMultipleCSV(data) {
    Logger.info('Exporting to multiple CSV files', { postCount: data.length });
    
    // Since we can't use JSZip (Manifest V3 restrictions), download files one by one
    showStatus(`Preparing ${data.length} CSV files for download...`, 'info');
    
    const headers = ['ID', 'Title', 'Content', 'Meta Description', 'ACF Fields', 'Status', 'URL', 'Date', 'Is Redirected', 'Redirect URL', 'Image Count', 'Image URLs'];

    // Download each file with a delay to avoid browser blocking
    data.forEach((post, index) => {
      setTimeout(() => {
        const row = postToCSV(post);
        let csv = headers.join(',') + '\n';
        csv += [
          row.id, row.title, row.content, row.metaDescription, row.acfFields,
          row.status, row.url, row.date, row.isRedirected,
          row.redirectUrl, row.imageCount, row.images
        ].join(',');

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
        
        Logger.info(`Downloaded CSV ${index + 1}/${data.length}`, { filename });
        
        // Update status
        if (index === data.length - 1) {
          showStatus(`All ${data.length} CSV files downloaded!`, 'success');
        } else {
          showStatus(`Downloading file ${index + 1} of ${data.length}...`, 'info');
        }
      }, index * 300); // 300ms delay between each download
    });
    
    Logger.info('All CSV downloads initiated');
  }

  // Sanitize filename
  function sanitizeFilename(name) {
    return name
      .substring(0, 50) // Limit length
      .replace(/[^a-z0-9]/gi, '-') // Replace non-alphanumeric with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      .toLowerCase();
  }

  // Download all images from crawled posts
  async function downloadAllImages(posts) {
    Logger.info('Starting image downloads');
    
    // Check if we should download images organized by post
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

  // Show options for how to download images
  function showImageDownloadOptions(posts) {
    return new Promise((resolve) => {
      const totalImages = posts.reduce((sum, post) => {
        return sum + (post.images ? post.images.length : 0);
      }, 0);

      const message = `Found ${totalImages} images in ${posts.length} posts.\n\nHow would you like to download them?\n\n1. Organized by Post (one folder per post) - RECOMMENDED\n2. All in Downloads folder\n\nNote: Browser may ask permission for multiple downloads.`;
      
      const choice = confirm(message + '\n\nClick OK for Organized by Post, Cancel for all in Downloads.');
      
      resolve(choice ? 'organized' : 'simple');
    });
  }

  // Download images organized by post (creates text file with folder structure info)
  async function downloadImagesOrganized(posts) {
    Logger.info('Downloading images organized by post');
    
    let downloaded = 0;
    let failed = 0;
    const manifestData = [];

    // Process each post
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

      // Download images for this post
      for (let imgIndex = 0; imgIndex < post.images.length; imgIndex++) {
        const image = post.images[imgIndex];
        
        try {
          showStatus(`Post ${postIndex + 1}/${posts.length}: Downloading image ${imgIndex + 1}/${post.images.length}...`, 'info');
          
          await new Promise(resolve => setTimeout(resolve, 400));
          
          const extension = image.url.split('.').pop().split('?')[0] || 'jpg';
          const imageFilename = `${sanitizeFilename(image.type || 'image')}-${imgIndex + 1}.${extension}`;
          const fullPath = `${postFolder}/${imageFilename}`;
          
          // Download with folder prefix in filename
          const a = document.createElement('a');
          a.href = image.url;
          a.download = fullPath; // Browser will save as "post-123-title/featured-1.jpg"
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
          
          Logger.info(`Downloaded image for post ${post.id}`, { filename: fullPath });
          
        } catch (error) {
          failed++;
          Logger.error('Failed to download image', { 
            postId: post.id,
            url: image.url,
            error: error.message 
          });
        }
      }

      if (postManifest.images.length > 0) {
        manifestData.push(postManifest);
      }
    }

    // Create manifest/guide file
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

    const message = `Downloaded ${downloaded} images organized by post${failed > 0 ? `, ${failed} failed` : ''}!\n\nCheck IMAGE-ORGANIZATION-GUIDE.txt for organization instructions.`;
    showStatus(message, downloaded > 0 ? 'success' : 'error');
    Logger.info('Organized image downloads complete', { downloaded, failed });
  }

  // Download images simply (all to Downloads folder)
  async function downloadImagesSimple(posts) {
    Logger.info('Downloading images to Downloads folder');
    
    const allImages = [];
    
    // Collect all unique images
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
    let failed = 0;
    
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
        Logger.info(`Downloaded image ${i + 1}/${allImages.length}`, { filename });
        
      } catch (error) {
        failed++;
        Logger.error('Failed to download image', { 
          url: image.url,
          error: error.message 
        });
      }
    }

    const message = `Downloaded ${downloaded} images${failed > 0 ? `, ${failed} failed` : ''}!`;
    showStatus(message, downloaded > 0 ? 'success' : 'error');
    Logger.info('Simple image downloads complete', { downloaded, failed });
  }

  // Create manifest file for organized downloads
  function createImageManifest(manifestData) {
    let text = `WORDPRESS POST IMAGES - ORGANIZATION GUIDE
Generated: ${new Date().toLocaleString()}
Total Posts: ${manifestData.length}

============================================
HOW TO ORGANIZE YOUR DOWNLOADED IMAGES
============================================

All images have been downloaded with folder paths in their filenames.
Example: "post-123-my-post/featured-1.jpg"

OPTION 1: Automatic Organization (Windows PowerShell)
------------------------------------------------------
1. Open PowerShell in your Downloads folder
2. Copy and paste this command:

Get-ChildItem -Filter "post-*" | ForEach-Object {
    $parts = $_.Name -split '/', 2
    if ($parts.Length -eq 2) {
        $folder = $parts[0]
        $file = $parts[1]
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        Move-Item $_.FullName "$folder/$file"
    }
}

OPTION 2: Automatic Organization (Mac/Linux Terminal)
-----------------------------------------------------
1. Open Terminal in your Downloads folder
2. Copy and paste this command:

for file in post-*/; do
    if [[ -f "$file" ]]; then
        folder=$(dirname "$file")
        mkdir -p "$folder"
        mv "$file" "$folder/"
    fi
done

OPTION 3: Manual Organization
------------------------------
Create folders and move files according to the list below.

============================================
IMAGE ORGANIZATION LIST
============================================

`;

    manifestData.forEach((post, index) => {
      text += `\n${index + 1}. POST: ${post.postTitle} (ID: ${post.postId})\n`;
      text += `   Folder: ${post.folder}\n`;
      text += `   Images (${post.images.length}):\n`;
      
      post.images.forEach(img => {
        text += `   - ${img.filename} (${img.type})\n`;
        if (img.alt) text += `     Alt: ${img.alt}\n`;
      });
      
      text += '\n';
    });

    text += `\n============================================
QUICK REFERENCE
============================================

`;

    manifestData.forEach(post => {
      text += `${post.folder}/ (${post.images.length} images)\n`;
    });

    text += `
============================================
END OF GUIDE
============================================

TIP: If files downloaded flat (not in folders), use the commands above 
to automatically organize them, or manually create folders and move files.
`;

    return text;
  }

  // Start crawling
  crawlButton.addEventListener('click', async () => {
    Logger.info('Crawl button clicked');
    Logger.clear(); // Clear previous logs
    
    try {
      // Get settings
      const settings = {
        includePublished: document.getElementById('includePublished').checked,
        includeDrafts: document.getElementById('includeDrafts').checked,
        includePending: document.getElementById('includePending').checked,
        includeScheduled: document.getElementById('includeScheduled').checked,
        limit: parseInt(document.getElementById('postLimit').value) || 0,
        skipRedirects: document.getElementById('skipRedirects')?.checked ?? true,
        visitPages: document.getElementById('visitPages')?.checked ?? false
      };

      Logger.info('Crawl settings', settings);

      // Validate at least one status is selected
      if (!settings.includePublished && !settings.includeDrafts && 
          !settings.includePending && !settings.includeScheduled) {
        Logger.warn('No post status selected');
        showStatus('Please select at least one post status', 'error');
        return;
      }

      // Disable button
      crawlButton.disabled = true;
      crawlButton.textContent = 'Crawling...';
      showStatus('Starting crawler...', 'info');
      updateProgress(10);

      // Get active tab
      Logger.info('Getting active tab');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      Logger.info('Active tab', { url: tab.url, title: tab.title });

      // Check if we're on a WordPress admin page
      if (!tab.url.includes('/wp-admin/')) {
        Logger.error('Not on WordPress admin page', { url: tab.url });
        showStatus('Please navigate to WordPress admin (wp-admin)', 'error');
        crawlButton.disabled = false;
        crawlButton.textContent = 'Start Crawling';
        updateProgress(0);
        return;
      }

      Logger.info('Injecting crawler script');
      updateProgress(30);

      // Inject and execute content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: crawlWordPressPosts,
        args: [settings]
      });

      Logger.info('Script execution completed', { 
        resultsLength: results?.length,
        hasResult: results?.[0]?.result ? true : false,
        resultType: typeof results?.[0]?.result,
        resultIsArray: Array.isArray(results?.[0]?.result)
      });

      console.log('Crawl results:', results);

      updateProgress(90);

      if (results && results[0] && results[0].result) {
        crawledData = results[0].result;
        
        console.log('Crawled data:', crawledData);
        Logger.info('Raw crawled data received', { 
          count: crawledData.length,
          type: typeof crawledData,
          isArray: Array.isArray(crawledData),
          firstPost: crawledData[0] ? {
            id: crawledData[0].id,
            title: crawledData[0].title,
            hasContent: !!crawledData[0].content,
            contentLength: crawledData[0].content?.length,
            status: crawledData[0].status
          } : null
        });
        
        if (!crawledData || crawledData.length === 0) {
          Logger.warn('No posts found in crawled data');
          showStatus('No posts found. Make sure you\'re on a WordPress post or posts list page.', 'error');
          crawlButton.disabled = false;
          crawlButton.textContent = 'Start Crawling';
          updateProgress(0);
          downloadLogsButton.style.display = 'block';
          return;
        }

        // If visitPages is enabled and we're on a list page, visit each post
        if (settings.visitPages && crawledData[0]?.needsDetailedCrawl) {
          Logger.info('Visit pages mode enabled, starting individual page visits');
          showStatus('Visiting each post page for complete content...', 'info');
          
          try {
            crawledData = await visitEachPost(crawledData, tab.id, (current, total) => {
              const percent = 90 + (current / total) * 10;
              updateProgress(percent);
              showStatus(`Crawling post ${current} of ${total}...`, 'info');
            });
            Logger.info('All pages visited', { finalCount: crawledData.length });
          } catch (error) {
            Logger.error('Error visiting pages', { error: error.message });
            showStatus('Error visiting some pages. Check logs for details.', 'error');
          }
        }
        
        // Filter out redirected posts if user wants to skip them
        const skipRedirects = document.getElementById('skipRedirects')?.checked ?? true;
        const originalCount = crawledData.length;
        
        if (skipRedirects) {
          const redirectedPosts = crawledData.filter(post => post.isRedirected);
          crawledData = crawledData.filter(post => !post.isRedirected);
          
          Logger.info('Filtered redirects', {
            original: originalCount,
            redirected: redirectedPosts.length,
            remaining: crawledData.length
          });
          
          if (redirectedPosts.length > 0) {
            console.log('Skipped redirected posts:', redirectedPosts);
            showStatus(`Crawled ${crawledData.length} posts (skipped ${redirectedPosts.length} redirected)`, 'info');
          }
        }
        
        // Count total images
        const totalImages = crawledData.reduce((sum, post) => {
          return sum + (post.images ? post.images.length : 0);
        }, 0);

        Logger.info('Final stats', {
          posts: crawledData.length,
          images: totalImages
        });

        updateProgress(100);
        
        if (crawledData.length === 0 && originalCount > 0) {
          Logger.warn('All posts were redirected');
          showStatus('All posts were redirected. Uncheck "Skip Redirected Posts" to include them.', 'info');
        } else if (crawledData.length > 0) {
          Logger.info('Crawl successful');
          showStatus(`Successfully crawled ${crawledData.length} posts!`, 'success');
        }
        
        updateStats(crawledData.length, totalImages);
        
        // Download images if option is enabled
        const downloadImages = document.getElementById('downloadImages')?.checked ?? false;
        if (downloadImages && totalImages > 0) {
          Logger.info('Image download requested', { imageCount: totalImages });
          showStatus(`Preparing to download ${totalImages} images...`, 'info');
          
          // Start downloading images
          downloadAllImages(crawledData);
        }
        
        // Show download button
        downloadButton.style.display = 'block';
        
        // Reset button
        setTimeout(() => {
          crawlButton.disabled = false;
          crawlButton.textContent = 'Start Crawling';
          updateProgress(0);
        }, 1000);
      } else {
        Logger.error('No data returned from crawler', { 
          results,
          hasResults: !!results,
          resultsLength: results?.length,
          hasFirstResult: !!results?.[0],
          firstResult: results?.[0],
          resultValue: results?.[0]?.result
        });
        throw new Error('No data returned from crawler. Check the debug logs for details.');
      }

    } catch (error) {
      Logger.error('Crawl error', {
        message: error.message,
        stack: error.stack,
        errorString: error.toString(),
        errorName: error.name
      });
      console.error('Crawl error:', error);
      showStatus(`Error: ${error.message}. Click "Download Debug Logs" for details.`, 'error');
      crawlButton.disabled = false;
      crawlButton.textContent = 'Start Crawling';
      updateProgress(0);
      
      // Show logs button on error
      downloadLogsButton.style.display = 'block';
    }
  });

  // Download button handler
  downloadButton.addEventListener('click', () => {
    if (crawledData.length > 0) {
      const exportFormat = document.getElementById('exportFormat').value;
      Logger.info('Exporting data', { format: exportFormat, count: crawledData.length });
      
      switch (exportFormat) {
        case 'json':
          downloadJSON(crawledData);
          showStatus('JSON file downloaded!', 'success');
          break;
        case 'csv-single':
          downloadSingleCSV(crawledData);
          showStatus('CSV file downloaded!', 'success');
          break;
        case 'csv-multiple':
          downloadMultipleCSV(crawledData);
          showStatus('CSV files downloaded! (Check your downloads folder)', 'success');
          break;
        default:
          downloadJSON(crawledData);
          showStatus('JSON file downloaded!', 'success');
      }
    }
  });

  // Download logs button handler
  if (downloadLogsButton) {
    downloadLogsButton.addEventListener('click', () => {
      Logger.info('Debug logs downloaded by user');
      Logger.exportLogs();
      showStatus('Debug logs downloaded!', 'success');
    });
  }
});

// This function will be injected into the WordPress page
function crawlWordPressPosts(settings) {
  const debugLog = [];
  
  function log(message, data = null) {
    const entry = { timestamp: new Date().toISOString(), message, data };
    debugLog.push(entry);
    console.log('[WP Crawler]', message, data || '');
  }
  
  try {
    log('Crawler function started', { settings, url: window.location.href });
    
    // Helper function to extract meta description
    function getMetaDescription() {
      log('Getting meta description');
      // Try Yoast SEO
      const yoastInput = document.querySelector('#yoast_wpseo_metadesc');
      if (yoastInput && yoastInput.value) {
        log('Found Yoast meta description');
        return yoastInput.value;
      }

      // Try Rank Math
      const rankMathInput = document.querySelector('input[name="rank_math_description"]');
      if (rankMathInput && rankMathInput.value) {
        log('Found Rank Math meta description');
        return rankMathInput.value;
      }

      // Try All in One SEO
      const aioseoInput = document.querySelector('textarea[name="aioseo_description"]');
      if (aioseoInput && aioseoInput.value) {
        log('Found AIOSEO meta description');
        return aioseoInput.value;
      }

      // Fallback: Try excerpt
      const excerptField = document.querySelector('#excerpt');
      if (excerptField && excerptField.value) {
        log('Using excerpt as meta description');
        return excerptField.value.substring(0, 160);
      }

      log('No meta description found');
      return '';
    }

    // Helper function to extract images from content
    function extractImages(content) {
      const images = [];
      if (!content) return images;
      
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const imgElements = doc.querySelectorAll('img');

        imgElements.forEach(img => {
          images.push({
            url: img.src,
            alt: img.alt || '',
            title: img.title || '',
            type: 'content'
          });
        });
        log(`Extracted ${images.length} images from content`);
      } catch (e) {
        console.warn('Error extracting images:', e);
      }

      return images;
    }

    // Get featured image
    function getFeaturedImage() {
      const featuredImg = document.querySelector('#postimagediv img');
      if (featuredImg) {
        return {
          url: featuredImg.src,
          alt: featuredImg.alt || '',
          title: 'Featured Image',
          type: 'featured'
        };
      }
      return null;
    }

    // Check if post is redirected
    function checkRedirect() {
      const result = {
        isRedirected: false,
        redirectUrl: '',
        redirectType: ''
      };

      try {
        // Check Yoast SEO redirect
        const yoastRedirect = document.querySelector('input[name="yoast_wpseo_redirect"]');
        if (yoastRedirect && yoastRedirect.value) {
          result.isRedirected = true;
          result.redirectUrl = yoastRedirect.value;
          result.redirectType = 'Yoast SEO';
          return result;
        }

        // Check Rank Math redirect
        const rankMathRedirect = document.querySelector('input[name="rank_math_redirection_url_to"]');
        if (rankMathRedirect && rankMathRedirect.value) {
          result.isRedirected = true;
          result.redirectUrl = rankMathRedirect.value;
          result.redirectType = 'Rank Math';
          return result;
        }

        // Check Simple 301 Redirects
        const simple301 = document.querySelector('input[name="_301_redirect_url"]');
        if (simple301 && simple301.value) {
          result.isRedirected = true;
          result.redirectUrl = simple301.value;
          result.redirectType = 'Simple 301';
          return result;
        }
      } catch (e) {
        console.warn('Error checking redirects:', e);
      }

      return result;
    }

    // Crawl single post (when on post.php)
    function crawlSinglePost(settings) {
      log('Starting crawlSinglePost');
      
      const postData = {
        id: null,
        title: '',
        content: '',
        metaDescription: '',
        images: [],
        status: '',
        url: '',
        date: '',
        isRedirected: false,
        redirectUrl: ''
      };

      // Get post ID
      const postIdInput = document.querySelector('#post_ID');
      if (postIdInput) {
        postData.id = postIdInput.value;
        log('Post ID found', { id: postData.id });
      } else {
        log('WARNING: Post ID input not found');
      }

      // Get title
      const titleInput = document.querySelector('#title');
      if (titleInput) {
        postData.title = titleInput.value;
        log('Title found', { length: postData.title.length });
      } else {
        log('WARNING: Title input not found');
      }

      // Get content (try different editors)
      log('Getting content', {
        hasTinyMCE: typeof tinymce !== 'undefined',
        hasWP: typeof wp !== 'undefined',
        hasACF: typeof acf !== 'undefined'
      });
      
      let contentExtracted = false;
      
      // Block Editor (Gutenberg) - Try this first as it's more common
      if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/editor')) {
        try {
          postData.content = wp.data.select('core/editor').getEditedPostContent();
          if (postData.content) {
            contentExtracted = true;
            log('Content from Gutenberg', { length: postData.content.length });
          }
        } catch (e) {
          log('ERROR getting Gutenberg content', { error: e.message });
          console.warn('Could not get Gutenberg content', e);
        }
      }
      
      // Classic Editor (TinyMCE)
      if (!contentExtracted && typeof tinymce !== 'undefined' && tinymce.activeEditor) {
        postData.content = tinymce.activeEditor.getContent();
        if (postData.content) {
          contentExtracted = true;
          log('Content from TinyMCE', { length: postData.content.length });
        }
      }
      
      // Fallback: textarea
      if (!contentExtracted) {
        const contentArea = document.querySelector('#content');
        if (contentArea) {
          postData.content = contentArea.value;
          if (postData.content) {
            contentExtracted = true;
            log('Content from textarea', { length: postData.content.length });
          }
        }
      }
      
      // If still no content, try to get from post content div (for some page builders)
      if (!contentExtracted) {
        const postContent = document.querySelector('#post-body-content, .editor-post-text-editor, [name="content"]');
        if (postContent) {
          postData.content = postContent.value || postContent.textContent || postContent.innerHTML;
          if (postData.content) {
            contentExtracted = true;
            log('Content from alternative source', { length: postData.content.length });
          }
        }
      }
      
      if (!contentExtracted) {
        log('WARNING: No content source found or content is empty');
      }

      // Get ACF fields if available
      postData.acfFields = {};
      if (typeof acf !== 'undefined') {
        try {
          // Get all ACF fields on the page
          const acfFieldGroups = document.querySelectorAll('.acf-field');
          log('Found ACF field groups', { count: acfFieldGroups.length });
          
          acfFieldGroups.forEach(fieldGroup => {
            const fieldKey = fieldGroup.getAttribute('data-key');
            const fieldName = fieldGroup.getAttribute('data-name');
            const fieldType = fieldGroup.getAttribute('data-type');
            
            if (fieldName) {
              let fieldValue = null;
              
              // Text, textarea, number
              const input = fieldGroup.querySelector('input[type="text"], input[type="number"], textarea');
              if (input) {
                fieldValue = input.value;
              }
              
              // WYSIWYG editor
              const wysiwyg = fieldGroup.querySelector('.acf-editor-wrap');
              if (wysiwyg) {
                const editorId = wysiwyg.getAttribute('data-editor');
                if (editorId && typeof tinymce !== 'undefined' && tinymce.get(editorId)) {
                  fieldValue = tinymce.get(editorId).getContent();
                } else {
                  const textarea = fieldGroup.querySelector('textarea');
                  if (textarea) fieldValue = textarea.value;
                }
              }
              
              // Select
              const select = fieldGroup.querySelector('select');
              if (select) {
                fieldValue = select.value;
              }
              
              // Checkbox/Radio
              const checked = fieldGroup.querySelector('input[type="checkbox"]:checked, input[type="radio"]:checked');
              if (checked) {
                fieldValue = checked.value;
              }
              
              // Image field
              const imageField = fieldGroup.querySelector('.acf-image-uploader img');
              if (imageField) {
                fieldValue = imageField.src;
              }
              
              if (fieldValue !== null) {
                postData.acfFields[fieldName] = fieldValue;
                log('ACF field extracted', { name: fieldName, type: fieldType, valueLength: String(fieldValue).length });
              }
            }
          });
          
          log('ACF fields extracted', { count: Object.keys(postData.acfFields).length });
        } catch (e) {
          log('Error extracting ACF fields', { error: e.message });
          console.warn('Could not extract ACF fields', e);
        }
      }

      // Get meta description
      postData.metaDescription = getMetaDescription();

      // Check if post is redirected
      const redirectInfo = checkRedirect();
      postData.isRedirected = redirectInfo.isRedirected;
      postData.redirectUrl = redirectInfo.redirectUrl;

      // Get post status
      const statusSelect = document.querySelector('#post_status');
      if (statusSelect) {
        postData.status = statusSelect.value;
      }

      // Get permalink
      const permalinkEl = document.querySelector('#sample-permalink a');
      if (permalinkEl) {
        postData.url = permalinkEl.href;
      }

      // Extract images from content
      postData.images = extractImages(postData.content);

      // Get featured image
      const featuredImage = getFeaturedImage();
      if (featuredImage) {
        postData.images.unshift(featuredImage);
        log('Featured image added');
      }

      log('Single post crawl complete', {
        id: postData.id,
        hasTitle: !!postData.title,
        hasContent: !!postData.content,
        contentLength: postData.content.length,
        imageCount: postData.images.length
      });

      return [postData];
    }

    // Crawl multiple posts (when on edit.php)
    function crawlMultiplePosts(settings) {
      log('Starting crawlMultiplePosts');
      
      const posts = [];
      const postRows = document.querySelectorAll('tr.type-post, tr.status-draft, tr.status-pending, tr.status-future');

      log('Found post rows', { count: postRows.length });

      postRows.forEach((row, index) => {
        // Check limit
        if (settings.limit > 0 && posts.length >= settings.limit) {
          return;
        }

        // Get post status
        const statusClasses = row.className.split(' ');
        let postStatus = 'publish';
        if (statusClasses.includes('status-draft')) postStatus = 'draft';
        else if (statusClasses.includes('status-pending')) postStatus = 'pending';
        else if (statusClasses.includes('status-future')) postStatus = 'future';

        // Filter by status settings
        if (postStatus === 'publish' && !settings.includePublished) return;
        if (postStatus === 'draft' && !settings.includeDrafts) return;
        if (postStatus === 'pending' && !settings.includePending) return;
        if (postStatus === 'future' && !settings.includeScheduled) return;

        // Extract post data
        const postData = {
          id: null,
          title: '',
          content: '',
          metaDescription: '',
          images: [],
          status: postStatus,
          url: '',
          date: '',
          needsDetailedCrawl: true,
          isRedirected: false,
          redirectUrl: ''
        };

        // Get post ID from checkbox
        const checkbox = row.querySelector('input[name="post[]"]');
        if (checkbox) {
          postData.id = checkbox.value;
        }

        // Get title
        const titleLink = row.querySelector('.row-title');
        if (titleLink) {
          postData.title = titleLink.textContent.trim();
          postData.url = titleLink.href;
        }

        // Get date
        const dateEl = row.querySelector('.date');
        if (dateEl) {
          postData.date = dateEl.textContent.trim();
        }

        // Note: Content and images can't be scraped from list view
        postData.content = '[Content not available in list view - visit individual post to crawl]';
        postData.metaDescription = '[Meta description not available in list view]';

        posts.push(postData);
      });

      log('Multiple posts crawl complete', { postsFound: posts.length });
      return posts;
    }

    // Check if we're on a single post edit page
    const isSinglePostPage = window.location.href.includes('post.php');
    log('Page type detected', { isSinglePostPage, url: window.location.href });
    
    let result;
    if (isSinglePostPage) {
      log('Crawling single post');
      // Single post page - crawl this post
      result = crawlSinglePost(settings);
    } else {
      log('Crawling multiple posts');
      // Posts list page - crawl multiple posts
      result = crawlMultiplePosts(settings);
    }
    
    log('Crawl completed', { 
      postsFound: result?.length,
      debugLogEntries: debugLog.length 
    });
    
    // Attach debug log to result
    if (result && result.length > 0 && result[0]) {
      result[0]._debugLog = debugLog;
      log('Debug log attached to first post');
    }
    
    return result;
    
  } catch (error) {
    log('Fatal error in crawler', { 
      message: error.message,
      stack: error.stack 
    });
    console.error('[WP Crawler] Fatal error:', error);
    const errorLog = {
      error: true,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      _debugLog: debugLog
    };
    console.error('[WP Crawler] Error details:', errorLog);
    // Return error information
    return [{
      error: true,
      message: error.message,
      stack: error.stack,
      _debugLog: debugLog
    }];
  }
}
