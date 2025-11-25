// background.js - Service Worker (runs in background even when popup is closed)

// Think of this like a Queue + Worker pattern in DSA
// The popup adds jobs to a queue, and this worker processes them

let currentCrawlState = {
  isRunning: false,
  totalPosts: 0,
  crawledPosts: 0,
  posts: [],
  logs: [],
  settings: null
};

// Logger for background operations
function log(level, message, data = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data
  };
  currentCrawlState.logs.push(entry);
  console.log(`[Background ${level}]`, message, data || '');
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('INFO', 'Message received', { action: request.action });
  
  if (request.action === 'startCrawl') {
    log('INFO', 'Starting crawl operation', request.settings);
    startCrawl(request.settings, request.tabId);
    sendResponse({ success: true, message: 'Crawl started in background' });
    return true;
  }
  
  if (request.action === 'getCrawlState') {
    sendResponse({ state: currentCrawlState });
    return true;
  }
  
  if (request.action === 'stopCrawl') {
    log('INFO', 'Stopping crawl');
    currentCrawlState.isRunning = false;
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'clearState') {
    log('INFO', 'Clearing crawl state');
    currentCrawlState = {
      isRunning: false,
      totalPosts: 0,
      crawledPosts: 0,
      posts: [],
      logs: [],
      settings: null
    };
    sendResponse({ success: true });
    return true;
  }
});

// Main crawl function that runs in background
async function startCrawl(settings, tabId) {
  if (currentCrawlState.isRunning) {
    log('WARN', 'Crawl already in progress');
    return;
  }
  
  currentCrawlState.isRunning = true;
  currentCrawlState.settings = settings;
  currentCrawlState.posts = [];
  currentCrawlState.crawledPosts = 0;
  currentCrawlState.logs = [];
  
  try {
    log('INFO', 'Injecting initial crawler');
    
    // First, get the list of posts to crawl
    const initialResults = await chrome.scripting.executeScript({
      target: { tabId },
      function: crawlWordPressPosts,
      args: [settings]
    });
    
    if (!initialResults || !initialResults[0] || !initialResults[0].result) {
      throw new Error('Failed to get initial post list');
    }
    
    let posts = initialResults[0].result;
    log('INFO', 'Initial posts retrieved', { count: posts.length });
    
    currentCrawlState.totalPosts = posts.length;
    
    // If visitPages is enabled and we have posts that need detailed crawl
    if (settings.visitPages && posts.length > 0 && posts[0].needsDetailedCrawl) {
      log('INFO', 'Starting individual page visits');
      
      for (let i = 0; i < posts.length; i++) {
        if (!currentCrawlState.isRunning) {
          log('WARN', 'Crawl stopped by user');
          break;
        }
        
        const post = posts[i];
        log('INFO', `Visiting post ${i + 1}/${posts.length}`, { id: post.id, title: post.title });
        
        try {
          // Navigate to post edit page
          let editUrl = post.url;
          if (post.id && !editUrl.includes('post.php')) {
            editUrl = editUrl.replace(/\/[^\/]+\/$/, `/wp-admin/post.php?post=${post.id}&action=edit`);
          }
          
          await chrome.tabs.update(tabId, { url: editUrl });
          
          // Wait for page to load
          await waitForPageLoad(tabId);
          
          // Wait for editor to initialize
          await sleep(1500);
          
          // Crawl this specific post
          const postResults = await chrome.scripting.executeScript({
            target: { tabId },
            function: crawlWordPressPosts,
            args: [{ includePublished: true, includeDrafts: true, limit: 1 }]
          });
          
          if (postResults && postResults[0] && postResults[0].result && postResults[0].result[0]) {
            posts[i] = postResults[0].result[0];
            log('INFO', 'Post crawled successfully', { id: posts[i].id });
          } else {
            log('WARN', 'Failed to crawl post details, keeping basic info', { id: post.id });
          }
          
        } catch (error) {
          log('ERROR', 'Error crawling post', { id: post.id, error: error.message });
        }
        
        currentCrawlState.crawledPosts = i + 1;
        currentCrawlState.posts = posts;
        
        // Notify popup about progress
        notifyPopup('progress', {
          current: i + 1,
          total: posts.length,
          post: posts[i]
        });
      }
    } else {
      currentCrawlState.posts = posts;
      currentCrawlState.crawledPosts = posts.length;
    }
    
    // Filter redirects if needed
    if (settings.skipRedirects) {
      const beforeCount = currentCrawlState.posts.length;
      currentCrawlState.posts = currentCrawlState.posts.filter(post => !post.isRedirected);
      log('INFO', 'Filtered redirects', { 
        before: beforeCount, 
        after: currentCrawlState.posts.length 
      });
    }
    
    log('INFO', 'Crawl completed successfully', { 
      totalPosts: currentCrawlState.posts.length 
    });
    
    currentCrawlState.isRunning = false;
    
    // Notify popup that crawl is complete
    notifyPopup('complete', {
      posts: currentCrawlState.posts,
      logs: currentCrawlState.logs
    });
    
  } catch (error) {
    log('ERROR', 'Fatal crawl error', { 
      message: error.message, 
      stack: error.stack 
    });
    
    currentCrawlState.isRunning = false;
    
    notifyPopup('error', {
      message: error.message,
      logs: currentCrawlState.logs
    });
  }
}

// Helper: Wait for page load
function waitForPageLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
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
}

// Helper: Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Notify popup about progress
function notifyPopup(type, data) {
  // Try to send message to popup
  // If popup is closed, this will silently fail (which is fine)
  chrome.runtime.sendMessage({
    action: 'crawlUpdate',
    type,
    data
  }).catch(() => {
    // Popup is closed, that's okay
    log('DEBUG', 'Popup not available to receive update');
  });
}

// Injected function (same as before, but defined here for background execution)
function crawlWordPressPosts(settings) {
  const debugLog = [];
  
  function log(message, data = null) {
    const entry = { timestamp: new Date().toISOString(), message, data };
    debugLog.push(entry);
    console.log('[WP Crawler]', message, data || '');
  }
  
  try {
    log('Crawler function started', { settings, url: window.location.href });
    
    // Helper function to remove WordPress shortcodes
    function removeShortcodes(content) {
      if (!content) return content;
      // Remove all shortcodes: [shortcode], [shortcode attr="value"], [/shortcode]
      // Pattern matches: [word] or [word attributes] or [/word]
      return content.replace(/\[\/?\w+(?:\s+[^\]]*?)?\]/g, '');
    }
    
    // Helper function to extract meta description
    function getMetaDescription() {
      log('Getting meta description');
      const yoastInput = document.querySelector('#yoast_wpseo_metadesc');
      if (yoastInput && yoastInput.value) return yoastInput.value;
      
      const rankMathInput = document.querySelector('input[name="rank_math_description"]');
      if (rankMathInput && rankMathInput.value) return rankMathInput.value;
      
      const aioseoInput = document.querySelector('textarea[name="aioseo_description"]');
      if (aioseoInput && aioseoInput.value) return aioseoInput.value;
      
      const excerptField = document.querySelector('#excerpt');
      if (excerptField && excerptField.value) return excerptField.value.substring(0, 160);
      
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
        const yoastRedirect = document.querySelector('input[name="yoast_wpseo_redirect"]');
        if (yoastRedirect && yoastRedirect.value) {
          result.isRedirected = true;
          result.redirectUrl = yoastRedirect.value;
          result.redirectType = 'Yoast SEO';
          return result;
        }
        
        const rankMathRedirect = document.querySelector('input[name="rank_math_redirection_url_to"]');
        if (rankMathRedirect && rankMathRedirect.value) {
          result.isRedirected = true;
          result.redirectUrl = rankMathRedirect.value;
          result.redirectType = 'Rank Math';
          return result;
        }
        
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
        redirectUrl: '',
        acfFields: {}
      };
      
      const postIdInput = document.querySelector('#post_ID');
      if (postIdInput) postData.id = postIdInput.value;
      
      const titleInput = document.querySelector('#title');
      if (titleInput) postData.title = titleInput.value;
      
      // Get content
      let contentExtracted = false;
      
      if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/editor')) {
        try {
          postData.content = wp.data.select('core/editor').getEditedPostContent();
          if (postData.content) {
            contentExtracted = true;
            log('Content from Gutenberg', { length: postData.content.length });
          }
        } catch (e) {
          log('ERROR getting Gutenberg content', { error: e.message });
        }
      }
      
      if (!contentExtracted && typeof tinymce !== 'undefined' && tinymce.activeEditor) {
        postData.content = tinymce.activeEditor.getContent();
        if (postData.content) {
          contentExtracted = true;
          log('Content from TinyMCE', { length: postData.content.length });
        }
      }
      
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
      
      // Get ACF fields
      if (typeof acf !== 'undefined') {
        try {
          const acfFieldGroups = document.querySelectorAll('.acf-field');
          log('Found ACF field groups', { count: acfFieldGroups.length });
          
          acfFieldGroups.forEach(fieldGroup => {
            const fieldName = fieldGroup.getAttribute('data-name');
            const fieldType = fieldGroup.getAttribute('data-type');
            
            if (fieldName) {
              let fieldValue = null;
              
              const input = fieldGroup.querySelector('input[type="text"], input[type="number"], textarea');
              if (input) fieldValue = input.value;
              
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
              
              const select = fieldGroup.querySelector('select');
              if (select) fieldValue = select.value;
              
              const checked = fieldGroup.querySelector('input[type="checkbox"]:checked, input[type="radio"]:checked');
              if (checked) fieldValue = checked.value;
              
              const imageField = fieldGroup.querySelector('.acf-image-uploader img');
              if (imageField) fieldValue = imageField.src;
              
              if (fieldValue !== null) {
                postData.acfFields[fieldName] = fieldValue;
              }
            }
          });
        } catch (e) {
          log('Error extracting ACF fields', { error: e.message });
        }
      }
      
      postData.metaDescription = getMetaDescription();
      
      const redirectInfo = checkRedirect();
      postData.isRedirected = redirectInfo.isRedirected;
      postData.redirectUrl = redirectInfo.redirectUrl;
      
      const statusSelect = document.querySelector('#post_status');
      if (statusSelect) postData.status = statusSelect.value;
      
      const permalinkEl = document.querySelector('#sample-permalink a');
      if (permalinkEl) postData.url = permalinkEl.href;
      
      postData.images = extractImages(postData.content);
      
      const featuredImage = getFeaturedImage();
      if (featuredImage) {
        postData.images.unshift(featuredImage);
      }
      
      // Remove shortcodes if requested
      if (settings.removeShortcodes && postData.content) {
        postData.content = removeShortcodes(postData.content);
        log('Shortcodes removed from content');
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
      
      postRows.forEach((row) => {
        if (settings.limit > 0 && posts.length >= settings.limit) return;
        
        const statusClasses = row.className.split(' ');
        let postStatus = 'publish';
        if (statusClasses.includes('status-draft')) postStatus = 'draft';
        else if (statusClasses.includes('status-pending')) postStatus = 'pending';
        else if (statusClasses.includes('status-future')) postStatus = 'future';
        
        if (postStatus === 'publish' && !settings.includePublished) return;
        if (postStatus === 'draft' && !settings.includeDrafts) return;
        if (postStatus === 'pending' && !settings.includePending) return;
        if (postStatus === 'future' && !settings.includeScheduled) return;
        
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
          redirectUrl: '',
          acfFields: {}
        };
        
        const checkbox = row.querySelector('input[name="post[]"]');
        if (checkbox) postData.id = checkbox.value;
        
        const titleLink = row.querySelector('.row-title');
        if (titleLink) {
          postData.title = titleLink.textContent.trim();
          postData.url = titleLink.href;
        }
        
        const dateEl = row.querySelector('.date');
        if (dateEl) postData.date = dateEl.textContent.trim();
        
        postData.content = '[Content not available in list view - visit individual post to crawl]';
        postData.metaDescription = '[Meta description not available in list view]';
        
        posts.push(postData);
      });
      
      log('Multiple posts crawl complete', { postsFound: posts.length });
      return posts;
    }
    
    const isSinglePostPage = window.location.href.includes('post.php');
    log('Page type detected', { isSinglePostPage, url: window.location.href });
    
    let result;
    if (isSinglePostPage) {
      result = crawlSinglePost(settings);
    } else {
      result = crawlMultiplePosts(settings);
    }
    
    log('Crawl completed', { postsFound: result?.length });
    
    if (result && result.length > 0 && result[0]) {
      result[0]._debugLog = debugLog;
    }
    
    return result;
    
  } catch (error) {
    log('Fatal error in crawler', { 
      message: error.message,
      stack: error.stack 
    });
    return [{
      error: true,
      message: error.message,
      stack: error.stack,
      _debugLog: debugLog
    }];
  }
}

log('INFO', 'Background service worker initialized');
