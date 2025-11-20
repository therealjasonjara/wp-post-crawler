// content.js - Runs in WordPress admin pages

// Detect WordPress admin pages
if (window.location.href.includes('/wp-admin/')) {
  console.log('WordPress Post Crawler: Active on WP Admin page');
  
  // Add visual indicator that extension is ready
  const indicator = document.createElement('div');
  indicator.id = 'wp-crawler-indicator';
  indicator.innerHTML = '🔍 WP Crawler Ready';
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 15px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    opacity: 0;
    animation: fadeInOut 3s ease-in-out;
  `;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateY(10px); }
      10% { opacity: 1; transform: translateY(0); }
      90% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);
  
  // Remove after animation
  setTimeout(() => {
    if (document.getElementById('wp-crawler-indicator')) {
      document.body.removeChild(indicator);
    }
  }, 3000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkWordPress') {
    const isWordPress = window.location.href.includes('/wp-admin/');
    sendResponse({ isWordPress });
  }
  
  return true;
});

// Helper: Detect WordPress editor type
function detectEditorType() {
  if (typeof wp !== 'undefined' && wp.data && wp.data.select('core/editor')) {
    return 'gutenberg';
  } else if (typeof tinymce !== 'undefined' && tinymce.activeEditor) {
    return 'classic';
  }
  return 'unknown';
}

// Helper: Get post data in current context
function getCurrentPostData() {
  const editorType = detectEditorType();
  
  const data = {
    editorType,
    hasContent: false,
    postId: null
  };
  
  // Get post ID
  const postIdInput = document.querySelector('#post_ID');
  if (postIdInput) {
    data.postId = postIdInput.value;
  }
  
  // Check if content is available
  if (editorType === 'gutenberg') {
    try {
      const content = wp.data.select('core/editor').getEditedPostContent();
      data.hasContent = !!content;
    } catch (e) {
      data.hasContent = false;
    }
  } else if (editorType === 'classic') {
    data.hasContent = !!tinymce.activeEditor.getContent();
  }
  
  return data;
}

// Export for debugging
window.wpCrawlerUtils = {
  detectEditorType,
  getCurrentPostData
};
