'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Download, 
  Copy, 
  Check, 
  Code, 
  Settings, 
  Trash2, 
  Search, 
  Globe, 
  Video, 
  Terminal, 
  HelpCircle, 
  ExternalLink, 
  FileCode, 
  Settings2,
  RefreshCw,
  Plus,
  X,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import JSZip from 'jszip';

// Dynamic type for code segments
type FileKey = 'manifest' | 'background' | 'popupHtml' | 'popupJs';

interface SimulatedRequest {
  url: string;
  type: string;
  status: number;
  method: string;
  detected: boolean;
  detectType?: string;
  size: string;
}

interface CapturedStream {
  id: string;
  url: string;
  type: string;
  tabTitle: string;
  tabUrl: string;
  tabIcon: string;
  timestamp: string;
  method: string;
}

interface SitePreset {
  name: string;
  url: string;
  favicon: string;
  requests: SimulatedRequest[];
}

export default function Page() {
  // Configurator Settings
  const [extensions, setExtensions] = useState<string[]>(['.m3u8', '.m3u', '.mpd']);
  const [keywords, setKeywords] = useState<string[]>(['api/stream', 'get-manifest', 'playlist']);
  const [enableBadge, setEnableBadge] = useState<boolean>(true);
  const [badgeMode, setBadgeMode] = useState<'tab' | 'global'>('tab');
  const [newKeyword, setNewKeyword] = useState<string>('');

  // Active Code tab
  const [activeFile, setActiveFile] = useState<FileKey>('manifest');
  const [copiedFile, setCopiedFile] = useState<FileKey | null>(null);
  
  // Custom keyword inputs
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim().toLowerCase();
    if (clean && !keywords.includes(clean)) {
      setKeywords([...keywords, clean]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const toggleExtension = (ext: string) => {
    if (extensions.includes(ext)) {
      setExtensions(extensions.filter(e => e !== ext));
    } else {
      setExtensions([...extensions, ext]);
    }
  };

  // ----------------------------------------------------
  // Dynamic Source Code Generators
  // ----------------------------------------------------

  const getManifestCode = () => {
    return `{
  "manifest_version": 3,
  "name": "Stream Interceptor Pro",
  "version": "1.0.0",
  "description": "Intercepts and captures video streaming links (.m3u8, .m3u, .mpd) and custom API stream requests.",
  "permissions": [
    "webRequest",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Stream Interceptor Pro",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;
  };

  const getBackgroundCode = () => {
    const extArrayJson = JSON.stringify(extensions);
    const kwArrayJson = JSON.stringify(keywords);
    
    return `// background.js - Stream Interceptor MV3 Service Worker
// Automatically intercepts and extracts streaming manifest and playlist files dynamically.

// Current user-defined settings, synced from local storage
let config = {
  extensions: ${extArrayJson},
  keywords: ${kwArrayJson},
  enableBadge: ${enableBadge},
  badgeMode: "${badgeMode}"
};

// Update config from storage at startup
function updateConfig() {
  chrome.storage.local.get({ settings: null }, (result) => {
    if (result.settings) {
      config = { ...config, ...result.settings };
      refreshBadges();
    }
  });
}

// Watch for changes in settings or captured streams
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.settings) {
      config = { ...config, ...changes.settings.newValue };
    }
    refreshBadges();
  }
});

// Run config update on start
updateConfig();

// Helper function to check if URL is a target streaming link
function getStreamType(url) {
  const lowerUrl = url.toLowerCase();
  
  // Check against file extensions
  for (const ext of config.extensions) {
    if (lowerUrl.includes(ext)) {
      if (ext === ".m3u8") return "HLS (.m3u8)";
      if (ext === ".mpd") return "MPEG-DASH (.mpd)";
      if (ext === ".m3u") return "IPTV Playlist (.m3u)";
      return ext.toUpperCase().replace(".", "") + " Stream";
    }
  }
  
  // Check against custom keywords
  for (const kw of config.keywords) {
    if (lowerUrl.includes(kw.toLowerCase())) {
      return "Backend API Stream";
    }
  }
  
  return null;
}

// Refresh Chrome extension badge count
function refreshBadges() {
  if (!config.enableBadge) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  chrome.storage.local.get({ streams: [] }, (result) => {
    const streams = result.streams || [];
    
    if (config.badgeMode === "global") {
      const countText = streams.length > 0 ? streams.length.toString() : "";
      chrome.action.setBadgeText({ text: countText });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // Emerald
    } else {
      // Per tab badge updates
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            const tabStreams = streams.filter(s => s.tabUrl === tab.url || s.tabId === tab.id);
            const countText = tabStreams.length > 0 ? tabStreams.length.toString() : "";
            chrome.action.setBadgeText({ tabId: tab.id, text: countText });
            chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#6366f1" }); // Indigo
          }
        });
      });
    }
  });
}

// Intercept HTTP network requests using Chrome webRequest API
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;
    
    // Ignore Chrome internal protocols and core static file assets to avoid noise
    if (
      url.startsWith("chrome") || 
      url.startsWith("about:") || 
      url.includes("chrome-extension://") ||
      (url.includes(".js") && !url.includes("playlist")) || 
      url.includes(".css") || 
      url.includes(".woff") ||
      url.includes(".png") ||
      url.includes(".jpg") ||
      url.includes(".ico")
    ) {
      return;
    }

    const streamType = getStreamType(url);
    
    if (streamType) {
      const tabId = details.tabId;
      const timestamp = new Date().toISOString();

      if (tabId && tabId !== chrome.tabs.TAB_ID_NONE) {
        chrome.tabs.get(tabId, (tab) => {
          // Check for any runtime error if the tab is inactive/closed during fetching
          const err = chrome.runtime.lastError;
          const tabTitle = tab ? tab.title : "Unknown Site";
          const tabUrl = tab ? tab.url : "";
          const favIcon = tab ? tab.favIconUrl : "";
          
          saveStream({
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
            url: url,
            type: streamType,
            tabTitle: tabTitle,
            tabUrl: tabUrl,
            tabIcon: favIcon,
            tabId: tabId,
            timestamp: timestamp,
            method: details.method || "GET"
          });
        });
      } else {
        saveStream({
          id: Math.random().toString(36).substring(2, 11),
          url: url,
          type: streamType,
          tabTitle: "Background Connection",
          tabUrl: "",
          tabIcon: "",
          tabId: null,
          timestamp: timestamp,
          method: details.method || "GET"
        });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Save the intercepted URL safely inside chrome.storage
function saveStream(newStream) {
  chrome.storage.local.get({ streams: [] }, (result) => {
    let streams = result.streams || [];
    
    // Deduplicate streams added within a short window (e.g. 5 seconds) to avoid polling pollution
    const isDuplicate = streams.some(s => 
      s.url === newStream.url && 
      (new Date(newStream.timestamp) - new Date(s.timestamp)) < 5000
    );
    
    if (!isDuplicate) {
      streams.unshift(newStream);
      
      // Keep lists compact to maximize performance and comply with storage limits
      if (streams.length > 250) {
        streams = streams.slice(0, 250);
      }
      
      chrome.storage.local.set({ streams: streams }, () => {
        refreshBadges();
      });
    }
  });
}

// Watch for tab activations or updates to sync visual badges
chrome.tabs.onActivated.addListener(() => refreshBadges());
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    refreshBadges();
  }
});
`;
  };

  const getPopupHtmlCode = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stream Detector Pro</title>
  <style>
    /* Elegant Dark Slate Custom Stylesheet - inline to comply with MV3 Security constraints */
    :root {
      --bg-dark: #090d16;
      --bg-card: #131c2e;
      --bg-input: #1b263e;
      --bg-hover: #243252;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --color-primary: #6366f1; /* Indigo */
      --color-primary-dark: #4f46e5;
      --color-accent: #10b981; /* Emerald */
      --color-danger: #ef4444; /* Rose */
      --border-color: #243252;
    }

    * {
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color) transparent;
    }

    body {
      width: 440px;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text-main);
      overflow-x: hidden;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 520px;
    }

    /* Header Bar */
    header {
      background-color: var(--bg-card);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    header h1 {
      font-size: 16px;
      margin: 0;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    .badge-count {
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--color-accent);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
    }

    /* Actions Hub */
    .controls-hub {
      padding: 12px 16px;
      background-color: var(--bg-dark);
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      padding: 8px 12px 8px 36px;
      border-radius: 6px;
      color: var(--text-main);
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .search-input:focus {
      border-color: var(--color-primary);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      color: var(--text-muted);
      width: 16px;
      height: 16px;
      pointer-events: none;
    }

    .actions-row {
      display: flex;
      gap: 8px;
    }

    .btn {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
      outline: none;
      color: white;
      transition: opacity 0.1s, transform 0.1s;
    }

    .btn:active {
      transform: scale(0.98);
    }

    .btn-primary {
      background-color: var(--color-primary);
    }

    .btn-primary:hover {
      background-color: var(--color-primary-dark);
    }

    .btn-secondary {
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-main);
    }

    .btn-secondary:hover {
      background-color: var(--bg-hover);
    }

    .btn-danger {
      background-color: var(--color-danger);
    }

    .btn-danger:hover {
      opacity: 0.9;
    }

    /* Scrollable Stream List */
    .stream-list {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .stream-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.2s, border-color 0.2s;
    }

    .stream-card:hover {
      border-color: var(--color-primary);
    }

    .stream-meta-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .site-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-muted);
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .site-favicon {
      width: 14px;
      height: 14px;
      border-radius: 2px;
      background-color: var(--bg-input);
    }

    .stream-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      letter-spacing: 0.3px;
    }

    .tag-hls {
      background-color: rgba(99, 102, 241, 0.2);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.4);
    }

    .tag-dash {
      background-color: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    .tag-iptv {
      background-color: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }

    .tag-api {
      background-color: rgba(14, 165, 233, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.4);
    }

    .stream-url-box {
      background-color: var(--bg-input);
      border-radius: 6px;
      padding: 6px 8px;
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      user-select: all;
      color: #cbd5e1;
      max-height: 48px;
      overflow-y: auto;
    }

    .stream-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .action-icon-btn {
      background-color: var(--bg-input);
      border: 1px solid var(--border-color);
      color: var(--text-main);
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-icon-btn:hover {
      background-color: var(--bg-hover);
      color: var(--color-accent);
    }

    .action-icon-btn.btn-delete:hover {
      color: var(--color-danger);
    }

    /* Notification Overlay */
    .toast-notif {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #10b981;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      display: none;
      animation: fadeInOut 2s forwards;
      z-index: 100;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, 10px); }
      15% { opacity: 1; transform: translate(-50%, 0); }
      85% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -10px); }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-title {
      font-size: 14px;
      color: var(--text-main);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .empty-desc {
      font-size: 12px;
      max-width: 240px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <div class="logo-icon">S</div>
        <h1>Stream Detector MV3</h1>
      </div>
      <div class="badge-count" id="streams-count">0 Detected</div>
    </header>

    <div class="controls-hub">
      <div class="search-wrapper">
        <!-- SVG search icon -->
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" class="search-input" id="search-bar" placeholder="Search intercepted links...">
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" id="btn-copy-all">
          Copy All
        </button>
        <button class="btn btn-secondary" id="btn-export-json">
          Export JSON
        </button>
        <button class="btn btn-danger" id="btn-clear-all">
          Clear All
        </button>
      </div>
    </div>

    <!-- Scrollable container for streams -->
    <div class="stream-list" id="stream-list">
      <!-- Generated dynamically in popup.js -->
    </div>

    <div class="toast-notif" id="toast">Copied to clipboard!</div>
  </div>

  <!-- Source JavaScript file -->
  <script src="popup.js"></script>
</body>
</html>`;
  };

  const getPopupJsCode = () => {
    return `// popup.js - Manages the extension interface popup
// Connects to chrome.storage.local to fetch and render stream URLs.

document.addEventListener("DOMContentLoaded", () => {
  const streamListContainer = document.getElementById("stream-list");
  const streamsCountBadge = document.getElementById("streams-count");
  const searchBar = document.getElementById("search-bar");
  const btnCopyAll = document.getElementById("btn-copy-all");
  const btnExportJson = document.getElementById("btn-export-json");
  const btnClearAll = document.getElementById("btn-clear-all");
  const toast = document.getElementById("toast");

  let allStreams = [];
  let filterQuery = "";

  // Show status toast notification
  function showToast(message, color = "#10b981") {
    toast.textContent = message;
    toast.style.backgroundColor = color;
    toast.style.display = "block";
    
    // Reset animation
    toast.style.animation = "none";
    toast.offsetHeight; // trigger reflow
    toast.style.animation = "fadeInOut 2.2s forwards";
    
    setTimeout(() => {
      toast.style.display = "none";
    }, 2200);
  }

  // Load and render streams from storage
  function fetchAndRender() {
    chrome.storage.local.get({ streams: [] }, (result) => {
      allStreams = result.streams || [];
      renderStreams();
    });
  }

  // Determine CSS class based on stream type tag
  function getTagClass(type) {
    const lower = type.toLowerCase();
    if (lower.includes("hls") || lower.includes("m3u8")) return "tag-hls";
    if (lower.includes("dash") || lower.includes("mpd")) return "tag-dash";
    if (lower.includes("iptv") || lower.includes("m3u")) return "tag-iptv";
    return "tag-api";
  }

  // Render streams based on search query
  function renderStreams() {
    // Filter list based on search bar query
    const filtered = allStreams.filter(stream => {
      const query = filterQuery.toLowerCase();
      return (
        stream.url.toLowerCase().includes(query) ||
        stream.type.toLowerCase().includes(query) ||
        stream.tabTitle.toLowerCase().includes(query)
      );
    });

    // Update count display
    streamsCountBadge.textContent = \`\${filtered.length} Detected\`;

    if (filtered.length === 0) {
      streamListContainer.innerHTML = \`
        <div class="empty-state">
          <div class="empty-icon">🎬</div>
          <div class="empty-title">\${allStreams.length > 0 ? 'No Matching Links' : 'No Streams Detected Yet'}</div>
          <div class="empty-desc">
            \${allStreams.length > 0 ? 'Try searching another keyword.' : 'Open a website with a video stream and play the video to begin capture.'}
          </div>
        </div>
      \`;
      return;
    }

    // Build list HTML
    let html = "";
    filtered.forEach((stream) => {
      const tagClass = getTagClass(stream.type);
      const host = stream.tabUrl ? new URL(stream.tabUrl).hostname : "System/Static";
      const iconUrl = stream.tabIcon || 'https://www.google.com/s2/favicons?domain=' + host;
      
      html += \`
        <div class="stream-card" id="card-\${stream.id}">
          <div class="stream-meta-header">
            <div class="site-info" title="\${stream.tabTitle}">
              <img class="site-favicon" src="\${iconUrl}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2394a3b8\\' stroke-width=\\'2\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'10\\'/><path d=\\'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\\'/><path d=\\'M2 12h20\\'/></svg>'" />
              <span>\${host} - \${stream.tabTitle.substring(0, 24)}\${stream.tabTitle.length > 24 ? '...' : ''}</span>
            </div>
            <span class="stream-tag \${tagClass}">\${stream.type}</span>
          </div>
          <div class="stream-url-box" title="Click to copy">\${stream.url}</div>
          <div class="stream-actions">
            <button class="action-icon-btn btn-copy" data-url="\s\${stream.url}" title="Copy Link Address">
              <!-- SVG Copy Icon -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="action-icon-btn btn-open" data-url="\s\${stream.url}" title="Open stream directly in browser tab">
              <!-- SVG External link Icon -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
            <button class="action-icon-btn btn-delete" data-id="\${stream.id}" title="Remove stream from logs">
              <!-- SVG Trash Icon -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      \`;
    });

    streamListContainer.innerHTML = html;

    // Attach click events on the newly created DOM elements
    document.querySelectorAll(".btn-copy").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const urlToCopy = e.currentTarget.getAttribute("data-url").trim();
        navigator.clipboard.writeText(urlToCopy).then(() => {
          showToast("Stream link copied!");
        });
      });
    });

    document.querySelectorAll(".btn-open").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const urlToOpen = e.currentTarget.getAttribute("data-url").trim();
        chrome.tabs.create({ url: urlToOpen });
      });
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idToDelete = e.currentTarget.getAttribute("data-id");
        deleteItem(idToDelete);
      });
    });
  }

  // Delete a single item
  function deleteItem(id) {
    chrome.storage.local.get({ streams: [] }, (result) => {
      const streams = result.streams || [];
      const updated = streams.filter(s => s.id !== id);
      chrome.storage.local.set({ streams: updated }, () => {
        allStreams = updated;
        renderStreams();
        showToast("Stream link removed.", "#ef4444");
      });
    });
  }

  // Action: Copy all filtered stream links
  btnCopyAll.addEventListener("click", () => {
    const query = filterQuery.toLowerCase();
    const filtered = allStreams.filter(stream => 
      stream.url.toLowerCase().includes(query) ||
      stream.type.toLowerCase().includes(query) ||
      stream.tabTitle.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      showToast("Nothing to copy!", "#ef4444");
      return;
    }

    const compiledUrls = filtered.map(s => s.url).join("\\n");
    navigator.clipboard.writeText(compiledUrls).then(() => {
      showToast(\`Copied all \${filtered.length} stream links!\`);
    });
  });

  // Action: Export filtered streams list as JSON file
  btnExportJson.addEventListener("click", () => {
    if (allStreams.length === 0) {
      showToast("Nothing to export!", "#ef4444");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allStreams, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "stream-detector-exports.json");
    dlAnchorElem.click();
    showToast("JSON Config downloaded!");
  });

  // Action: Clear all stored streams
  btnClearAll.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all logged streaming links?")) {
      chrome.storage.local.set({ streams: [] }, () => {
        allStreams = [];
        renderStreams();
        showToast("Logs completely cleared.", "#ef4444");
      });
    }
  });

  // Search input typing handler
  searchBar.addEventListener("input", (e) => {
    filterQuery = e.target.value;
    renderStreams();
  });

  // Automatically listen to updates from the background service worker in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.streams) {
      allStreams = changes.streams.newValue || [];
      renderStreams();
    }
  });

  // Initial Fetch
  fetchAndRender();
});
`;
  };

  // Helper copy-to-clipboard functionality for app UI
  const copyToClipboard = (text: string, fileKey: FileKey) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileKey);
    setTimeout(() => {
      setCopiedFile(null);
    }, 2000);
  };

  // ----------------------------------------------------
  // Interactive Browser Simulation State
  // ----------------------------------------------------
  const [browserUrl, setBrowserUrl] = useState<string>('https://cinestream-pro.com/watch/movies');
  const [activeTabName, setActiveTabName] = useState<string>('CineStream Pro - Watch Movies');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedNetworkLogs, setSimulatedNetworkLogs] = useState<SimulatedRequest[]>([]);
  const [capturedSimulationStreams, setCapturedSimulationStreams] = useState<CapturedStream[]>([]);
  const [searchSimQuery, setSearchSimQuery] = useState<string>('');
  const [isExtensionPopupOpen, setIsExtensionPopupOpen] = useState<boolean>(false);
  
  // Ref for the simulated logs container to scroll automatically
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = logsEndRef.current.scrollHeight;
    }
  }, [simulatedNetworkLogs]);

  const presetSites: SitePreset[] = [
    {
      name: 'CineStream Pro',
      url: 'https://cinestream-pro.com/watch/movies',
      favicon: '🎬',
      requests: [
        { url: 'https://cinestream-pro.com/watch/movies', type: 'Document', status: 200, method: 'GET', detected: false, size: '42 KB' },
        { url: 'https://cdn.cinestream-pro.com/assets/player.css', type: 'Stylesheet', status: 200, method: 'GET', detected: false, size: '18 KB' },
        { url: 'https://cdn.cinestream-pro.com/assets/player-core.js', type: 'Script', status: 200, method: 'GET', detected: false, size: '280 KB' },
        { url: 'https://api.cinestream-pro.com/v2/auth/session', type: 'Fetch/XHR', status: 200, method: 'POST', detected: false, size: '1.2 KB' },
        { url: 'https://edge-cdn-us.cinestream-pro.com/hls/sci-fi/master.m3u8', type: 'Playlist', status: 200, method: 'GET', detected: true, detectType: 'HLS (.m3u8)', size: '820 B' },
        { url: 'https://edge-cdn-us.cinestream-pro.com/hls/sci-fi/1080p_index.m3u8', type: 'Playlist', status: 200, method: 'GET', detected: true, detectType: 'HLS (.m3u8)', size: '1.4 KB' },
        { url: 'https://edge-cdn-us.cinestream-pro.com/hls/sci-fi/segment-001.ts', type: 'Media Chunk', status: 200, method: 'GET', detected: false, size: '2.4 MB' },
        { url: 'https://edge-cdn-us.cinestream-pro.com/hls/sci-fi/segment-002.ts', type: 'Media Chunk', status: 200, method: 'GET', detected: false, size: '2.4 MB' }
      ]
    },
    {
      name: 'GlobalSports Live',
      url: 'https://globalsports-live.net/match/champions-league',
      favicon: '⚽',
      requests: [
        { url: 'https://globalsports-live.net/match/champions-league', type: 'Document', status: 200, method: 'GET', detected: false, size: '54 KB' },
        { url: 'https://api.globalsports-live.net/v1/user/entitlements', type: 'Fetch/XHR', status: 200, method: 'GET', detected: false, size: '850 B' },
        { url: 'https://dash-cdn.globalsports-live.net/streams/live-pitch-A/manifest.mpd', type: 'Manifest', status: 200, method: 'GET', detected: true, detectType: 'MPEG-DASH (.mpd)', size: '4.2 KB' },
        { url: 'https://dash-cdn.globalsports-live.net/streams/live-pitch-A/init-audio.mp4', type: 'Media Chunk', status: 200, method: 'GET', detected: false, size: '64 KB' },
        { url: 'https://dash-cdn.globalsports-live.net/streams/live-pitch-A/init-video.mp4', type: 'Media Chunk', status: 200, method: 'GET', detected: false, size: '128 KB' },
        { url: 'https://dash-cdn.globalsports-live.net/streams/live-pitch-A/chunk-v1-001.m4s', type: 'Media Chunk', status: 200, method: 'GET', detected: false, size: '1.8 MB' }
      ]
    },
    {
      name: 'RetroFM & IPTV',
      url: 'https://retrofm-iptv.org/player',
      favicon: '📻',
      requests: [
        { url: 'https://retrofm-iptv.org/player', type: 'Document', status: 200, method: 'GET', detected: false, size: '31 KB' },
        { url: 'https://retrofm-iptv.org/playlists/retro_radio_channels.m3u', type: 'Playlist', status: 200, method: 'GET', detected: true, detectType: 'IPTV Playlist (.m3u)', size: '24 KB' },
        { url: 'https://stream.retrofm-iptv.org/api/stream/shoutcast-96kbps', type: 'Stream Feed', status: 200, method: 'GET', detected: true, detectType: 'Backend API Stream', size: 'Live Feed' }
      ]
    }
  ];

  // Helper to trigger simulation
  const runSimulationForSite = (site: SitePreset) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedNetworkLogs([]);
    setBrowserUrl(site.url);
    setActiveTabName(`${site.name} - Watch Live`);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < site.requests.length) {
        const nextRequest = site.requests[currentIndex];
        setSimulatedNetworkLogs(prev => [...prev, nextRequest]);

        // If the request matches captured formats, inject into captured simulated state
        if (nextRequest.detected) {
          // Check if we captured this URL format in user settings
          const lowerUrl = nextRequest.url.toLowerCase();
          let shouldCapture = false;
          let calculatedType = nextRequest.detectType || 'Captured Stream';

          // Validate if extension matches user checkboxes
          for (const ext of extensions) {
            if (lowerUrl.includes(ext)) {
              shouldCapture = true;
            }
          }

          // Validate if custom keywords match
          for (const kw of keywords) {
            if (lowerUrl.includes(kw.toLowerCase())) {
              shouldCapture = true;
            }
          }

          if (shouldCapture) {
            const isDuplicate = capturedSimulationStreams.some(s => s.url === nextRequest.url);
            if (!isDuplicate) {
              const newCap: CapturedStream = {
                id: Math.random().toString(36).substring(2, 9),
                url: nextRequest.url,
                type: calculatedType,
                tabTitle: `${site.name} - Watch Live`,
                tabUrl: site.url,
                tabIcon: site.favicon,
                timestamp: new Date().toLocaleTimeString(),
                method: nextRequest.method
              };
              setCapturedSimulationStreams(prev => [newCap, ...prev]);
            }
          }
        }
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 600);
  };

  // Run initial simulation on load
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulationForSite(presetSites[0]);
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCapturedStreams = () => {
    setCapturedSimulationStreams([]);
  };

  const removeCapturedStream = (id: string) => {
    setCapturedSimulationStreams(prev => prev.filter(s => s.id !== id));
  };

  const [simCopyNotification, setSimCopyNotification] = useState<string | null>(null);

  const copySimulatedToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setSimCopyNotification("Copied stream link!");
    setTimeout(() => {
      setSimCopyNotification(null);
    }, 2000);
  };

  // Export to ZIP logic
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const downloadExtensionZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // Add files
      zip.file('manifest.json', getManifestCode());
      zip.file('background.js', getBackgroundCode());
      zip.file('popup.html', getPopupHtmlCode());
      zip.file('popup.js', getPopupJsCode());
      
      // Dynamic icons subfolder
      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        // Draw icon dynamically in various sizes, pack them as Blobs!
        const sizes = [16, 48, 128];
        for (const size of sizes) {
          const blob = await generateIconBlob(size);
          if (blob) {
            iconsFolder.file(`icon${size}.png`, blob);
          }
        }
      }

      // Add simple README installation guide
      const readmeText = `# Stream Interceptor Pro - Chrome Extension Installation Guide

Thank you for downloading your customized Stream Interceptor Pro Chrome Extension!
Follow these simple steps to load it into Chrome or any Chromium-based browser (Edge, Brave, Opera, Vivaldi).

## Installation Steps:
1. Extract the downloaded \`stream-interceptor-extension.zip\` into a folder on your computer.
2. Open your browser and navigate to the Extensions page:
   - Chrome: Enter \`chrome://extensions\` in the address bar.
   - Edge: Enter \`edge://extensions\`.
   - Brave: Enter \`brave://extensions\`.
3. Locate the **Developer mode** toggle switch in the top-right corner of the Extensions page and turn it **ON**.
4. Click on the **Load unpacked** button (usually located in the top-left sub-header).
5. Select the folder where you extracted the extension files (the directory containing \`manifest.json\`).
6. The extension is now successfully installed! Click the puzzle icon in your browser toolbar, pin **Stream Interceptor Pro**, and enjoy!

## Supported Formats (Your Configuration):
- File Extensions: ${extensions.join(', ')}
- Capture Keywords: ${keywords.join(', ')}

Enjoy stream catching!`;
      
      zip.file('README.txt', readmeText);

      // Generate content and trigger browser download
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'stream-interceptor-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("ZIP Generation Failed", e);
    } finally {
      setIsZipping(false);
    }
  };

  // Function to draw extension icon on a temporary canvas and return a png blob
  const generateIconBlob = (size: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Rounded rectangle background with gradient
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#6366f1'); // Indigo
      gradient.addColorStop(1, '#10b981'); // Emerald
      ctx.fillStyle = gradient;
      
      // Round Rect
      const r = size * 0.2;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, r);
      ctx.fill();

      // Play Triangle overlapping concentric waves
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = size * 0.08;
      ctx.lineCap = 'round';

      const cx = size * 0.44;
      const cy = size * 0.5;
      const radius = size * 0.22;

      // Play Button
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.5, cy - radius * 0.7);
      ctx.lineTo(cx + radius * 0.7, cy);
      ctx.lineTo(cx - radius * 0.5, cy + radius * 0.7);
      ctx.closePath();
      ctx.fill();

      // Signal Waves
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.3, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.8, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  // Filter list of streams in popup simulation
  const filteredSimStreams = capturedSimulationStreams.filter(stream => {
    const q = searchSimQuery.toLowerCase();
    return (
      stream.url.toLowerCase().includes(q) ||
      stream.type.toLowerCase().includes(q) ||
      stream.tabTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6 text-zinc-100 select-none font-sans">
      
      {/* Dynamic Toast Notification inside Dashboard */}
      <AnimatePresence>
        {simCopyNotification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 bg-indigo-600 border border-indigo-500/30 text-white font-semibold py-3 px-6 rounded-xl shadow-2xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{simCopyNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bento Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-100">
              StreamSniffer <span className="text-indigo-400">V3</span>
            </h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest font-mono">
              Manifest V3 Inspector • Interactive Suite
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-500 tracking-wider">INTERCEPTOR ACTIVE</span>
          </div>
          <button
            onClick={downloadExtensionZip}
            disabled={isZipping}
            className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isZipping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>EXPORT EXTENSION ZIP</span>
          </button>
        </div>
      </header>

      {/* Main Bento Grid Layout */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* BENTO CARD 1: Capture Summary (Stats Card) [Col Span: 3] */}
        <section className="col-span-1 lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4 transition hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Capture Summary</h3>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono font-bold">LIVE METRIC</span>
          </div>
          <div className="flex items-end justify-between my-2">
            <span className="text-5xl font-black text-indigo-400 tracking-tighter">
              {capturedSimulationStreams.length > 0 ? (capturedSimulationStreams.length + 24) : '24'}
            </span>
            <div className="text-right">
              <p className="text-xs font-bold text-emerald-400">+12% vs last hr</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">TOTAL REQUESTS SCANNED</p>
            </div>
          </div>
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Active Buffers detected</span>
            <span className="font-mono text-indigo-400 font-bold">4.2MB</span>
          </div>
        </section>

        {/* BENTO CARD 2: Developer Mode (Action Showcase Card) [Col Span: 5] */}
        <section className="col-span-1 lg:col-span-5 bg-indigo-600 rounded-2xl p-5 flex flex-col justify-between text-white shadow-xl shadow-indigo-950/40 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 -translate-y-10 group-hover:scale-110 transition duration-500" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-indigo-200">DEVELOPER SUITE ACTIVE</p>
              <h3 className="text-lg font-extrabold tracking-tight">StreamSniffer Engine V3</h3>
            </div>
          </div>
          <p className="text-xs text-indigo-100 leading-relaxed font-medium my-3">
            V3 Manifest background services worker is listening. Play simulated streams to capture high fidelity IPTV, HLS (.m3u8), and MPEG-DASH files directly.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-indigo-200">
            <span>Engine: WebRequest Blocking API</span>
            <span className="bg-white/10 px-2 py-0.5 rounded font-bold">ACTIVE</span>
          </div>
        </section>

        {/* BENTO CARD 3: Integration Snippet (Code preview snippet) [Col Span: 4] */}
        <section className="col-span-1 lg:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-3 font-mono text-[11px] leading-normal text-indigo-300 transition hover:border-zinc-700">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-sans">Required Permissions</span>
            <span className="text-[9px] text-zinc-600">manifest.json</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/60 flex-grow font-mono">
            <p className="text-zinc-500">{`"permissions": [`}</p>
            <p className="pl-4">{`"webRequest",`}</p>
            <p className="pl-4">{`"storage"`}</p>
            <p className="text-zinc-500">{`],`}</p>
            <p className="text-zinc-500">{`"host_permissions": [`}</p>
            <p className="pl-4">{`"<all_urls>"`}</p>
            <p className="text-zinc-500">{`]`}</p>
          </div>
          <span className="text-[9px] text-zinc-500 font-sans">Manifest version 3 fully compliant</span>
        </section>

        {/* BENTO CARD 4: Filter Rules & Formats (Extension Configurator) [Col Span: 4] */}
        <section className="col-span-1 lg:col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 transition hover:border-zinc-700">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Filter Rules</h3>
            </div>
            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono font-bold">CONFIG</span>
          </div>

          {/* Formats Checklist */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-mono">
              <Video className="w-3 h-3 text-indigo-400" /> Target Extensions
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { ext: '.m3u8', label: 'HLS (.m3u8)' },
                { ext: '.mpd', label: 'DASH (.mpd)' },
                { ext: '.m3u', label: 'IPTV (.m3u)' },
                { ext: '.mp4', label: 'MP4 Video' }
              ].map((item) => {
                const isActive = extensions.includes(item.ext);
                return (
                  <button
                    key={item.ext}
                    onClick={() => toggleExtension(item.ext)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition text-xs font-mono ${
                      isActive 
                        ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300' 
                        : 'bg-zinc-950/20 border-zinc-800/80 text-zinc-500 hover:border-zinc-700'
                    }`}
                  >
                    <span>{item.ext}</span>
                    <span className={`w-3.5 h-3.5 rounded-full relative flex items-center justify-center border ${
                      isActive ? 'bg-indigo-600 border-indigo-400' : 'border-zinc-700'
                    }`}>
                      {isActive && <Check className="w-2 h-2 text-white stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Keywords Form */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 font-mono">
              <Search className="w-3 h-3 text-indigo-400" /> API Keywords
            </span>
            <form onSubmit={handleAddKeyword} className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. stream-feed..."
                className="flex-1 bg-zinc-950 text-zinc-200 border border-zinc-800 px-3 py-2 rounded-xl text-xs placeholder:text-zinc-650 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="flex flex-wrap gap-1 mt-1 max-h-[72px] overflow-y-auto">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 bg-zinc-950 border border-zinc-850 text-zinc-400 px-2.5 py-0.5 rounded-full text-[10px] font-mono"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-zinc-600 hover:text-rose-400 transition"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Badge Count Controls */}
          <div className="pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-300">Show Extension Badge</span>
                <span className="text-[10px] text-zinc-500">Enable numeric overlays on icon</span>
              </div>
              <button
                onClick={() => setEnableBadge(!enableBadge)}
                className={`w-9 h-5 rounded-full p-0.5 transition ${
                  enableBadge ? 'bg-emerald-500' : 'bg-zinc-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition ${
                  enableBadge ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* BENTO CARD 5: Simulated Web Environment & Browser Viewport [Col Span: 8] */}
        <section className="col-span-1 lg:col-span-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden transition hover:border-zinc-700">
          
          {/* Browser Address Header */}
          <div className="bg-zinc-950/80 px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            
            {/* Address Input Mock */}
            <div className="flex-1 max-w-md bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 flex items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate text-[11px] text-zinc-300 font-mono">{browserUrl}</span>
              </div>
              <RefreshCw 
                className={`w-3.5 h-3.5 text-zinc-500 shrink-0 cursor-pointer hover:text-zinc-300 transition ${isSimulating ? 'animate-spin' : ''}`} 
                onClick={() => {
                  const found = presetSites.find(p => p.url === browserUrl);
                  if (found) runSimulationForSite(found);
                }}
              />
            </div>

            {/* Quick simulated popup button */}
            <button
              onClick={() => setIsExtensionPopupOpen(!isExtensionPopupOpen)}
              className={`p-1.5 rounded-lg border transition flex items-center justify-center relative cursor-pointer ${
                isExtensionPopupOpen 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Simulated Extension Popup"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {enableBadge && capturedSimulationStreams.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white border border-indigo-400 text-[9px] font-bold px-1 py-0.2 rounded-full scale-90">
                  {capturedSimulationStreams.length}
                </span>
              )}
            </button>
          </div>

          <div className="p-4 flex flex-col gap-4 bg-zinc-900/20">
            {/* Web presets selection */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">Interactive Websites</span>
              <div className="flex flex-wrap gap-2">
                {presetSites.map((site) => (
                  <button
                    key={site.name}
                    onClick={() => runSimulationForSite(site)}
                    disabled={isSimulating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      browserUrl === site.url
                        ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-300 font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 disabled:opacity-50'
                    }`}
                  >
                    <span className="text-sm">{site.favicon}</span>
                    <span>{site.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated HTML5 Video Player Frame */}
            <div className="relative aspect-video max-h-[220px] mx-auto w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center text-center p-6 group">
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-zinc-950/40 z-10" />
              
              {isSimulating ? (
                <div className="flex items-center gap-1.5 z-20">
                  <span className="w-1.5 h-10 bg-indigo-500 rounded animate-[bounce_0.8s_infinite]" />
                  <span className="w-1.5 h-14 bg-emerald-500 rounded animate-[bounce_0.6s_infinite]" />
                  <span className="w-1.5 h-18 bg-indigo-500 rounded animate-[bounce_0.9s_infinite_0.2s]" />
                  <span className="w-1.5 h-12 bg-emerald-500 rounded animate-[bounce_0.7s_infinite_0.1s]" />
                  <span className="w-1.5 h-6 bg-indigo-500 rounded animate-[bounce_0.5s_infinite]" />
                </div>
              ) : (
                <button
                  onClick={() => {
                    const found = presetSites.find(p => p.url === browserUrl);
                    if (found) runSimulationForSite(found);
                  }}
                  className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl hover:shadow-indigo-500/20 flex items-center justify-center transform hover:scale-105 active:scale-95 transition z-20 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
                </button>
              )}

              <div className="flex flex-col gap-1 mt-4 z-20">
                <span className="text-xs font-bold text-zinc-200">{activeTabName}</span>
                <span className="text-[10px] text-zinc-500">
                  {isSimulating ? 'Simulating playback, intercepting packets...' : 'Click play to simulate streaming network traffic'}
                </span>
              </div>
            </div>
          </div>

          {/* Simulated DevTools Console logs */}
          <div className="flex-grow flex flex-col border-t border-zinc-800 bg-zinc-950 min-h-[140px]">
            <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-[10px] font-bold tracking-wider text-zinc-500 uppercase font-mono">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Console Network Interceptor Logs</span>
              </div>
              <span>{simulatedNetworkLogs.length} requests</span>
            </div>

            <div 
              ref={logsEndRef}
              className="flex-1 p-3 font-mono text-[10px] overflow-y-auto max-h-[160px] flex flex-col gap-1"
            >
              {simulatedNetworkLogs.length === 0 ? (
                <span className="text-zinc-600 italic text-center py-6">No requests captured. Click Play to load the media streaming streams.</span>
              ) : (
                simulatedNetworkLogs.map((req, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start justify-between gap-4 p-1 rounded transition ${
                      req.detected 
                        ? 'bg-emerald-950/20 text-emerald-400 border-l-2 border-emerald-500' 
                        : 'text-zinc-500'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 max-w-[75%] truncate">
                      <span className="truncate">{req.url}</span>
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 mt-0.5">
                        <span className="font-bold text-zinc-500">{req.method}</span>
                        <span>•</span>
                        <span>{req.type}</span>
                        <span>•</span>
                        <span>{req.size}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-zinc-500 bg-zinc-900 px-1 py-0.2 rounded">
                        {req.status}
                      </span>
                      {req.detected && (
                        <span className="text-[8px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-1 rounded animate-pulse">
                          CAPTURED
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* BENTO CARD 6: Simulated Captured Streams Popup Module [Col Span: 5] */}
        <section className="col-span-1 lg:col-span-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden transition hover:border-zinc-700">
          <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Captured Streams</h3>
            </div>
            <span className="text-[10px] bg-zinc-850 px-2 py-0.5 rounded text-zinc-500 font-bold">
              {filteredSimStreams.length} Links Detected
            </span>
          </div>

          <div className="p-3 bg-zinc-950/40 border-b border-zinc-800 flex flex-col gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
              <input
                type="text"
                value={searchSimQuery}
                onChange={(e) => setSearchSimQuery(e.target.value)}
                placeholder="Filter stream URLs..."
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl py-1.5 pl-8 pr-7 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              {searchSimQuery && (
                <button onClick={() => setSearchSimQuery('')} className="absolute right-2.5 text-zinc-500 hover:text-zinc-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (filteredSimStreams.length === 0) return;
                  const text = filteredSimStreams.map(s => s.url).join('\n');
                  copySimulatedToClipboard(text);
                }}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-1 px-2.5 rounded-lg text-[10px] transition cursor-pointer"
              >
                Copy All
              </button>
              <button
                onClick={clearCapturedStreams}
                className="flex-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold py-1 px-2.5 rounded-lg text-[10px] transition cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Interactive Captured Streams Container */}
          <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2 min-h-[160px] max-h-[300px]">
            {filteredSimStreams.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center gap-1.5 text-zinc-600">
                <span className="text-3xl">📡</span>
                <span className="text-xs font-bold text-zinc-400">No Captures Recorded</span>
                <span className="text-[10px] max-w-[200px] leading-relaxed">Interceptors are active. Choose a custom preset site above and trigger a playback simulation to catch live flows.</span>
              </div>
            ) : (
              filteredSimStreams.map((stream) => (
                <div key={stream.id} className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2 transition hover:border-zinc-700">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <span className="text-xs shrink-0">{stream.tabIcon}</span>
                      <span className="text-[11px] font-medium text-zinc-300 truncate">{stream.tabTitle}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                      {stream.type}
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-850/50 rounded-lg p-2 text-[10px] font-mono text-zinc-400 truncate break-all select-all">
                    {stream.url}
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1 border-t border-zinc-850/40">
                    <span>{stream.method} Request</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copySimulatedToClipboard(stream.url)}
                        className="p-1 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-indigo-400 transition"
                        title="Copy Stream URL"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeCapturedStream(stream.id)}
                        className="p-1 rounded bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-zinc-500 hover:text-rose-400 transition"
                        title="Delete Capture"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* BENTO CARD 7: Source Code Viewport [Col Span: 7] */}
        <section className="col-span-1 lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden transition hover:border-zinc-700">
          <div className="bg-zinc-950 px-4 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chrome Codebase</h3>
            </div>

            <button
              onClick={() => {
                let code = '';
                if (activeFile === 'manifest') code = getManifestCode();
                else if (activeFile === 'background') code = getBackgroundCode();
                else if (activeFile === 'popupHtml') code = getPopupHtmlCode();
                else if (activeFile === 'popupJs') code = getPopupJsCode();
                copyToClipboard(code, activeFile);
              }}
              className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedFile === activeFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Sub-tab Switches */}
          <div className="grid grid-cols-4 border-b border-zinc-800 bg-zinc-950/60 p-1">
            {[
              { key: 'manifest', label: 'manifest.json', icon: <Code className="w-3.5 h-3.5" /> },
              { key: 'background', label: 'background.js', icon: <Terminal className="w-3.5 h-3.5" /> },
              { key: 'popupHtml', label: 'popup.html', icon: <Globe className="w-3.5 h-3.5" /> },
              { key: 'popupJs', label: 'popup.js', icon: <FileCode className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFile(tab.key as FileKey)}
                className={`py-2 px-1 sm:px-3 text-[10px] sm:text-xs font-bold font-mono flex items-center justify-center gap-1 transition border-b-2 cursor-pointer ${
                  activeFile === tab.key
                    ? 'border-indigo-500 text-zinc-100 bg-zinc-900/40'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Core code preview container */}
          <div className="flex-grow p-4 bg-zinc-950 font-mono text-xs overflow-auto text-indigo-300/90 max-h-[380px] min-h-[300px] select-text">
            {activeFile === 'manifest' && (
              <pre className="whitespace-pre-wrap leading-relaxed">{getManifestCode()}</pre>
            )}
            {activeFile === 'background' && (
              <pre className="whitespace-pre leading-relaxed">{getBackgroundCode()}</pre>
            )}
            {activeFile === 'popupHtml' && (
              <pre className="whitespace-pre leading-relaxed">{getPopupHtmlCode()}</pre>
            )}
            {activeFile === 'popupJs' && (
              <pre className="whitespace-pre leading-relaxed">{getPopupJsCode()}</pre>
            )}
          </div>

          {/* Interactive File Explainer */}
          <div className="bg-zinc-900 p-4 border-t border-zinc-800 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-[11px] leading-relaxed">
              <span className="font-bold text-zinc-300">
                {activeFile === 'manifest' && 'manifest.json — Extension Metadata'}
                {activeFile === 'background' && 'background.js — Service Interceptor'}
                {activeFile === 'popupHtml' && 'popup.html — Interface Markup'}
                {activeFile === 'popupJs' && 'popup.js — Storage Link Controller'}
              </span>
              <p className="text-zinc-500">
                {activeFile === 'manifest' && 'Registers active permissions, matches host URLs for extraction rules, and references MV3 service workers.'}
                {activeFile === 'background' && 'Hooks directly into the chrome.webRequest life-cycle dynamically to stream-capture target URLs in deep background.'}
                {activeFile === 'popupHtml' && 'Pristine user interface rendering with pre-bundled inline styles matching extension security rules.'}
                {activeFile === 'popupJs' && 'Handles active view state. Queries captured stream logs from persistent chrome.storage on request.'}
              </p>
            </div>
          </div>
        </section>

        {/* BENTO CARD 8: Step Guide [Col Span: 12] */}
        <section className="col-span-1 lg:col-span-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-5 transition hover:border-zinc-700">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Chrome Installation Guide</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {[
              {
                step: '01',
                title: 'Extract Saved ZIP',
                desc: 'Download the custom ZIP folder package, then unpack/extract its files on your system.'
              },
              {
                step: '02',
                title: 'Turn Developer Mode On',
                desc: 'Open chrome://extensions in a new tab, and toggle Developer Mode in the top-right.'
              },
              {
                step: '03',
                title: 'Load Unpacked & Sync',
                desc: 'Click on Load unpacked, select the extracted folder directory, and enjoy live captures!'
              }
            ].map((item, index) => (
              <div key={item.step} className="flex flex-col gap-2 p-4 bg-zinc-950/40 border border-zinc-800/80 rounded-xl relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black font-mono text-indigo-500">{item.step}</span>
                  {index < 2 && (
                    <ArrowRight className="hidden md:block w-3.5 h-3.5 text-zinc-700 absolute -right-3.5 top-1/2 -translate-y-1/2 z-10" />
                  )}
                </div>
                <h4 className="text-xs font-bold text-zinc-300">{item.title}</h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

    </div>
  );
}
