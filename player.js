/**
 * Zenith Stream Video Player
 * High-quality streaming video player with smart buffering
 */

class StreamFlowPlayer {
    constructor() {
        // DOM Elements
        this.urlSection = document.getElementById('urlSection');
        this.playerSection = document.getElementById('playerSection');
        this.playerContainer = document.getElementById('playerContainer');
        this.video = document.getElementById('videoPlayer');
        this.urlInput = document.getElementById('videoUrl');
        this.loadBtn = document.getElementById('loadBtn');
        this.backBtn = document.getElementById('backBtn');
        this.mobileBackBtn = document.getElementById('mobileBackBtn');
        this.bigPlayBtn = document.getElementById('bigPlayBtn');
        this.videoTitle = document.getElementById('videoTitle');
        this.useProxyCheckbox = document.getElementById('useProxy');
        
        // Recent History Grid
        this.recentSection = document.getElementById('recentSection');
        this.recentGrid = document.getElementById('recentGrid');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        // Overlays
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorText = document.getElementById('errorText');
        this.bufferIndicator = document.getElementById('bufferIndicator');
        this.proxyStat = document.getElementById('proxyStat');
        
        // History
        this.historyBtn = document.getElementById('historyBtn');
        this.historyModal = document.getElementById('historyModal');
        this.closeHistory = document.getElementById('closeHistory');
        this.historyList = document.getElementById('historyList');

        // Controls
        this.controls = document.getElementById('controls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.skipBackBtn = document.getElementById('skipBackBtn');
        this.skipForwardBtn = document.getElementById('skipForwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeFill = document.getElementById('volumeFill');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.pipBtn = document.getElementById('pipBtn');
        this.screenshotBtn = document.getElementById('screenshotBtn');
        this.theaterBtn = document.getElementById('theaterBtn');
        this.lockBtn = document.getElementById('lockBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.speedMenu = document.getElementById('speedMenu');
        this.speedValue = document.getElementById('speedValue');
        this.retryBtn = document.getElementById('retryBtn');

        // Brightness
        this.brightnessBtn = document.getElementById('brightnessBtn');
        this.brightnessSlider = document.getElementById('brightnessSlider');
        this.brightnessFill = document.getElementById('brightnessFill');
        
        // Progress
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBuffer = document.getElementById('progressBuffer');
        this.progressPlayed = document.getElementById('progressPlayed');
        this.progressThumb = document.getElementById('progressThumb');
        this.progressTooltip = document.getElementById('progressTooltip');
        
        // Time Display
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timeInputWrapper = document.getElementById('timeInputWrapper');
        this.timeInput = document.getElementById('timeInput');
        this.timeGoBtn = document.getElementById('timeGoBtn');
        
        // Stats
        this.bufferPercent = document.getElementById('bufferPercent');
        this.networkSpeed = document.getElementById('networkSpeed');
        
        // Shortcuts Modal
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.closeShortcuts = document.getElementById('closeShortcuts');
        
        // State
        this.isPlaying = false;
        this.isMuted = false;
        this.isFullscreen = false;
        this.isLocked = false;
        this.controlsTimeout = null;
        this.cursorTimeout = null;
        this.lastVolume = 1;
        this.currentUrl = '';
        this.loadStartTime = 0;
        this.bytesLoaded = 0;
        this.currentBrightness = 1;
        
        // Touch State
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.touchStartVol = 0;
        this.touchStartBrit = 0;
        this.activeTouchAction = null; // 'volume', 'brightness', 'seek'
        
        // Buffer Management
        this.bufferCheckInterval = null;
        this.targetBufferAhead = 60; // seconds to buffer ahead
        this.historyBufferRatio = 0.10; // 10% of watched video as history buffer
        this.maxWatchedPosition = 0; // track furthest watched position
        this.bufferRanges = []; // store all buffer ranges for visualization
        
        // Network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.maxSpeedSamples = 10; // rolling average of last 10 samples
        
        // Range request support detection
        this.supportsRangeRequests = null; // null = unknown, true/false after check
        this.rangeRequestChecked = false;
        
        this.init();
    }
    
    init() {
        this.loadSettings();
        this.renderRecentGrid();
        this.createGestureOverlay();
        this.bindEvents();
        this.setupVideoEvents();
        this.updateVolumeUI();
        this.updateBrightnessUI();
        this.setupMobileGestures();
        
        // Focus input on load
        this.urlInput.focus();
        
        // Check for URL in query params
        const params = new URLSearchParams(window.location.search);
        const videoUrl = params.get('url');
        if (videoUrl) {
            this.urlInput.value = decodeURIComponent(videoUrl);
            this.loadVideo();
        }
    }

    createGestureOverlay() {
        this.gestureOverlay = document.createElement('div');
        this.gestureOverlay.className = 'gesture-overlay';
        this.gestureOverlay.innerHTML = `
            <div class="gesture-icon-container"></div>
            <span class="gesture-text"></span>
            <div class="gesture-bar-container">
                <div class="gesture-bar-fill"></div>
            </div>
        `;
        this.playerContainer.appendChild(this.gestureOverlay);
        
        this.gestureIconContainer = this.gestureOverlay.querySelector('.gesture-icon-container');
        this.gestureText = this.gestureOverlay.querySelector('.gesture-text');
        this.gestureBarFill = this.gestureOverlay.querySelector('.gesture-bar-fill');
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('zenithStreamSettings'));
            if (settings) {
                if (settings.volume !== undefined) this.setVolume(settings.volume);
                if (settings.brightness !== undefined) this.setBrightness(settings.brightness);
                if (settings.useProxy !== undefined) {
                    this.useProxyCheckbox.checked = settings.useProxy;
                }
            } else {
                // Default proxy to true if no settings exist
                this.useProxyCheckbox.checked = true;
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
            this.useProxyCheckbox.checked = true;
        }
    }

    saveSettings() {
        const settings = {
            volume: this.video.muted ? 0 : this.video.volume,
            brightness: this.currentBrightness,
            useProxy: this.useProxyCheckbox.checked
        };
        localStorage.setItem('zenithStreamSettings', JSON.stringify(settings));
    }

    addToHistory(url) {
        try {
            let history = JSON.parse(localStorage.getItem('zenithStreamHistory') || '[]');
            // Remove if already exists (to move to top)
            history = history.filter(item => item !== url);
            // Add to front
            history.unshift(url);
            // Keep last 20
            if (history.length > 20) history = history.slice(0, 20);
            localStorage.setItem('zenithStreamHistory', JSON.stringify(history));
        } catch (e) {
            console.warn('Failed to save history:', e);
        }
    }

    clearHistory() {
        if (confirm('Clear watch history?')) {
            localStorage.removeItem('nebulaStreamHistory');
            this.renderRecentGrid();
            this.renderHistory(); // Update modal if open (though likely not)
            this.showToast('History Cleared');
        }
    }

    renderHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('zenithStreamHistory') || '[]');
            this.historyList.innerHTML = '';
            
            if (history.length === 0) {
                this.historyList.innerHTML = '<div class="history-empty">No history yet</div>';
                return;
            }
            
            history.forEach(url => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div class="history-details">
                        <span class="history-url" title="${url}">${url}</span>
                        <span class="history-time">Stream</span>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    this.urlInput.value = url;
                    this.historyModal.classList.remove('active');
                    this.loadVideo();
                });
                
                this.historyList.appendChild(item);
            });
        } catch (e) {
            console.warn('Failed to render history:', e);
            this.historyList.innerHTML = '<div class="history-empty">Error loading history</div>';
        }
    }
    
    bindEvents() {
        // URL Input
        this.loadBtn.addEventListener('click', () => this.loadVideo());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadVideo();
        });
        
        // Save proxy setting on change
        this.useProxyCheckbox.addEventListener('change', () => this.saveSettings());

        if (this.backBtn) this.backBtn.addEventListener('click', () => this.showUrlSection());
        if (this.mobileBackBtn) this.mobileBackBtn.addEventListener('click', () => this.showUrlSection());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.retryBtn.addEventListener('click', () => this.loadVideo());
        
        if (this.bigPlayBtn) {
            this.bigPlayBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent toggling via container click
                this.togglePlay();
            });
        }
        
        // History Modal
        this.historyBtn.addEventListener('click', () => {
            this.renderHistory();
            this.historyModal.classList.add('active');
        });
        
        this.closeHistory.addEventListener('click', () => {
            this.historyModal.classList.remove('active');
        });

        // Close history when clicking outside
        this.historyModal.addEventListener('click', (e) => {
            if (e.target === this.historyModal) {
                this.historyModal.classList.remove('active');
            }
        });
        
        // Play Controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.skipBackBtn.addEventListener('click', () => this.skip(-10));
        this.skipForwardBtn.addEventListener('click', () => this.skip(10));
        
        // Volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));

        // Brightness
        this.brightnessBtn.addEventListener('click', () => this.setBrightness(1));
        this.brightnessSlider.addEventListener('input', (e) => this.setBrightness(e.target.value));
        
        // Progress Bar
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        this.progressContainer.addEventListener('mousemove', (e) => this.updateTooltip(e));
        
        // Add drag support for progress bar
        let isDragging = false;
        this.progressContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.seek(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.seek(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Fullscreen & PiP
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.pipBtn.addEventListener('click', () => this.togglePiP());
        this.screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        this.theaterBtn.addEventListener('click', () => this.toggleTheater());
        this.lockBtn.addEventListener('click', () => this.toggleLock());
        
        // Time Input - click time display to show input
        this.timeDisplay.addEventListener('click', () => this.showTimeInput());
        this.timeGoBtn.addEventListener('click', () => this.jumpToInputTime());
        this.timeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.jumpToInputTime();
        });
        this.timeInput.addEventListener('blur', () => {
            // Hide input after a short delay (allows clicking Go button)
            setTimeout(() => this.hideTimeInput(), 200);
        });
        
        // Speed Menu
        this.speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.speedMenu.classList.toggle('active');
        });
        
        document.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setPlaybackSpeed(speed);
            });
        });
        
        // Custom speed input
        const customSpeedInput = document.getElementById('customSpeedInput');
        const customSpeedBtn = document.getElementById('customSpeedBtn');
        
        if (customSpeedBtn && customSpeedInput) {
            customSpeedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(customSpeedInput.value);
                if (speed >= 0.1 && speed <= 100) {
                    this.setPlaybackSpeed(speed);
                    customSpeedInput.value = '';
                }
            });
            
            customSpeedInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    const speed = parseFloat(customSpeedInput.value);
                    if (speed >= 0.1 && speed <= 100) {
                        this.setPlaybackSpeed(speed);
                        customSpeedInput.value = '';
                    }
                }
            });
            
            customSpeedInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Close speed menu when clicking outside
        document.addEventListener('click', () => {
            this.speedMenu.classList.remove('active');
        });
        
        // Shortcuts Modal
        this.closeShortcuts.addEventListener('click', () => {
            this.shortcutsModal.classList.remove('active');
        });
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Controls visibility
        this.playerContainer.addEventListener('mousemove', () => this.showControls());
        this.playerContainer.addEventListener('mouseleave', () => this.hideControls());
        
        // Click to toggle controls (Mobile/Desktop standard)
        this.playerContainer.addEventListener('click', (e) => {
            // Ignore clicks on interactive elements
            if (e.target.closest('.controls') || 
                e.target.closest('.top-bar') || 
                e.target.closest('.back-btn') || 
                e.target.closest('.back-btn-overlay') ||
                e.target.closest('.big-play-btn')) {
                return;
            }
            
            if (this.playerContainer.classList.contains('show-controls')) {
                this.playerContainer.classList.remove('show-controls');
            } else {
                this.showControls();
            }
        });
        
        // Double-click to fullscreen
        this.video.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    }
    
    setupVideoEvents() {
        // Loading states
        this.video.addEventListener('loadstart', () => {
            this.loadStartTime = Date.now();
            this.maxWatchedPosition = 0; // Reset watched position
            this.bufferRanges = [];
            this.showLoading();
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            // Clear load timeout
            if (this.loadTimeout) {
                clearTimeout(this.loadTimeout);
                this.loadTimeout = null;
            }
            
            this.durationEl.textContent = this.formatTime(this.video.duration);
            this.hideLoading();
            // Start buffer management once we have metadata
            this.startBufferManagement();
            // Initialize speed status
            this.updateSpeedStatus();
            
            // Auto play on load
            this.video.play().catch(e => console.log('Autoplay blocked by browser, user interaction required.'));
            
            console.log(`Video loaded: ${this.formatTime(this.video.duration)} duration`);
        });
        
        this.video.addEventListener('canplay', () => {
            this.hideLoading();
        });
        
        this.video.addEventListener('canplaythrough', () => {
            this.hideLoading();
        });
        
        this.video.addEventListener('waiting', () => {
            this.showLoading();
        });
        
        this.video.addEventListener('playing', () => {
            this.hideLoading();
            this.isPlaying = true;
            this.playerContainer.classList.add('playing');
            this.showControls(); // Trigger auto-hide
        });
        
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            // Continue buffering even when paused - browser handles this
            // but we update the UI to show buffer progress
            this.updateBuffer();
        });
        
        this.video.addEventListener('ended', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
        });
        
        // Time update
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
            // Track max watched position for history buffer
            if (this.video.currentTime > this.maxWatchedPosition) {
                this.maxWatchedPosition = this.video.currentTime;
            }
        });
        
        // Buffer progress - fires when browser downloads more data
        this.video.addEventListener('progress', () => this.updateBuffer());
        
        // Also update buffer on seeking
        this.video.addEventListener('seeked', () => {
            this.updateBuffer();
        });
        
        // Error handling
        this.video.addEventListener('error', (e) => this.handleError(e));
        
        // Volume change
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
    }
    
    loadVideo() {
        let url = this.urlInput.value.trim();
        if (!url) {
            this.urlInput.focus();
            return;
        }

        // Save to history
        this.addToHistory(url);
        
        // Check if proxy should be used
        const useProxy = this.useProxyCheckbox && this.useProxyCheckbox.checked;
        
        if (useProxy) {
            // Show proxy indicator
            this.proxyStat.classList.remove('hidden');
            
            // Use local proxy server
            // If running on a web server (http/https), use relative path
            if (window.location.protocol.startsWith('http')) {
                 url = `/proxy?url=${encodeURIComponent(url)}`;
            } else {
                 // Fallback for file:// protocol
                 url = `http://localhost:4000/proxy?url=${encodeURIComponent(url)}`;
            }
            console.log('🔄 Using local proxy server for URL');
        } else {
            this.proxyStat.classList.add('hidden');
        }
        
        this.currentUrl = url;
        this.originalUrl = this.urlInput.value.trim(); // Store original for display
        this.hideError();
        this.showPlayerSection();
        this.showLoading();
        
        // Update Title
        if (this.videoTitle) {
            // Try to extract a clean name from URL
            try {
                const urlObj = new URL(url);
                const pathname = urlObj.pathname;
                const filename = pathname.split('/').pop();
                if (filename) {
                    this.videoTitle.textContent = decodeURIComponent(filename);
                } else {
                    this.videoTitle.textContent = 'Streaming Video';
                }
            } catch (e) {
                this.videoTitle.textContent = 'Streaming Video';
            }
        }
        
        // Reset network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.loadStartTime = Date.now();
        
        // Reset CORS retry flags
        this.triedWithoutCors = false;
        this.triedWithCors = false;
        this.rangeRequestChecked = false;

        // Resolve social media URLs
        const resolvedUrl = this.resolveSocialUrl(url);
        if (resolvedUrl !== url) {
            console.log(`🔗 Resolved social media URL: ${resolvedUrl}`);
            url = resolvedUrl;
        }
        
        // Check if HLS stream
        if (url.includes('.m3u8')) {
            this.loadHLS(url);
        } else if (url.includes('.mpd')) {
            this.loadDASH(url);
        } else {
            // Direct video URL - try loading with best settings for streaming
            this.loadDirectVideo(url);
        }
        
        // Update URL params with the ORIGINAL URL (not proxied)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('url', encodeURIComponent(this.originalUrl));
        window.history.replaceState({}, '', newUrl);
    }

    resolveSocialUrl(url) {
        // YouTube detection
        const ytMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (ytMatch) {
            const videoId = ytMatch[1];
            this.showToast('YouTube detected - using proxy for bypass');
            return url; // In a real app, you might use an API here, but for now we proxy
        }

        // Instagram detection
        if (url.includes('instagram.com/p/') || url.includes('instagram.com/reels/')) {
            this.showToast('Instagram detected - using proxy');
            return url;
        }

        // TeraBox detection
        if (url.includes('terabox.com') || url.includes('nephobox.com')) {
            this.showToast('TeraBox detected - proxying content');
            return url;
        }

        return url;
    }
    
    async loadDirectVideo(url) {
        // Reset video element for fresh load
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        
        // Configure for streaming
        this.video.preload = 'auto';
        
        // Check if it's a Google URL (they have specific requirements)
        const isGoogleUrl = url.includes('googleusercontent.com') || 
                           url.includes('googlevideo.com') ||
                           url.includes('google.com');
        
        if (isGoogleUrl) {
            console.log('🔗 Detected Google video URL - may expire after a few hours');
            // Google URLs work better without crossorigin attribute
            this.video.removeAttribute('crossorigin');
        }
        
        // Check if server supports Range requests (for seeking)
        if (!this.rangeRequestChecked) {
            this.checkRangeRequestSupport(url);
        }
        
        // Set the source and load
        this.video.src = url;
        this.video.load();
        
        // Add timeout for stuck loading
        this.loadTimeout = setTimeout(() => {
            if (this.video.readyState < 2) { // HAVE_CURRENT_DATA
                console.warn('Video loading is taking too long...');
                // Try without any special attributes
                this.video.removeAttribute('crossorigin');
                this.video.load();
            }
        }, 10000); // 10 second timeout
    }
    
    async checkRangeRequestSupport(url) {
        this.rangeRequestChecked = true;
        
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors'
            });
            
            const acceptRanges = response.headers.get('Accept-Ranges');
            const contentLength = response.headers.get('Content-Length');
            
            // Relaxed check: Assume support unless explicitly 'none', or if header is missing (common)
            this.supportsRangeRequests = !acceptRanges || acceptRanges === 'bytes';
            
            if (this.supportsRangeRequests) {
                console.log(`✅ Server supports Range requests (byte-seeking enabled)`);
                if (contentLength) {
                    const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(1);
                    console.log(`📦 File size: ${sizeMB} MB`);
                }
            } else {
                console.warn(`⚠️ Server doesn't support Range requests - seeking may require re-download`);
                this.showRangeWarning();
            }
        } catch (error) {
            console.warn('Could not check Range request support:', error.message);
            // Assume it works - browser will handle it
            this.supportsRangeRequests = true;
        }
    }
    
    showRangeWarning() {
        // Show a subtle warning that seeking might not work well
        const warning = document.createElement('div');
        warning.className = 'range-warning';
        warning.innerHTML = `
            <span>⚠️ This video may not support seeking to unbuffered positions</span>
        `;
        warning.style.cssText = `
            position: absolute;
            top: 70px;
            right: 20px;
            padding: 10px 16px;
            background: rgba(255, 165, 0, 0.9);
            color: #000;
            border-radius: 8px;
            font-size: 0.85rem;
            z-index: 20;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4s forwards;
        `;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.remove();
        }, 5000);
    }
    
    loadHLS(url) {
        // Check if native HLS is supported (Safari)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.load();
        } else if (typeof Hls !== 'undefined') {
            // Use hls.js for other browsers
            const hls = new Hls({
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 60 * 1000 * 1000, // 60MB
                maxBufferHole: 0.5,
            });
            hls.loadSource(url);
            hls.attachMedia(this.video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.hideLoading();
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    this.showError('HLS stream error: ' + data.type);
                }
            });
        } else {
            this.showError('HLS playback not supported. Please use Safari or add hls.js library.');
        }
    }
    
    loadDASH(url) {
        if (typeof dashjs !== 'undefined') {
            const player = dashjs.MediaPlayer().create();
            player.initialize(this.video, url, false);
            player.updateSettings({
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true,
                        bufferTimeAtTopQuality: 30,
                        bufferTimeAtTopQualityLongForm: 60,
                    }
                }
            });
        } else {
            this.showError('DASH playback requires dash.js library.');
        }
    }
    
    setupMobileGestures() {
        // Touch gestures for volume (right) and brightness (left)
        this.lastTapTime = 0;
        this.lastTapX = 0;
        this.initialPinchDistance = null;

        this.playerContainer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.controls') || 
                e.target.closest('.shortcuts-modal') || 
                e.target.closest('.big-play-btn')) return;

            // Handle Pinch (2 fingers)
            if (e.touches.length === 2) {
                if (this.isLocked) return;
                this.initialPinchDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                return;
            }

            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            this.touchStartTime = Date.now();
            this.touchStartVol = this.video.volume;
            this.touchStartBrit = this.currentBrightness;
            this.activeTouchAction = null;
        }, { passive: true });

        this.playerContainer.addEventListener('touchmove', (e) => {
            if (e.target.closest('.controls')) return;
            if (this.isLocked) return; // Block swipes when locked

            // Handle Pinch Zoom
            if (e.touches.length === 2 && this.initialPinchDistance) {
                const currentDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                
                if (Math.abs(currentDistance - this.initialPinchDistance) > 50) {
                    // Zoom trigger
                    if (currentDistance > this.initialPinchDistance) {
                        this.video.style.objectFit = 'cover';
                        this.showToast('Zoom: Fill');
                    } else {
                        this.video.style.objectFit = 'contain';
                        this.showToast('Zoom: Fit');
                    }
                    this.initialPinchDistance = null; // Reset to avoid flickering
                }
                return;
            }

            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = this.touchStartY - touch.clientY; // Up is positive
            
            // Determine action if not yet set
            if (!this.activeTouchAction) {
                if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
                    // Vertical swipe
                    const width = this.playerContainer.clientWidth;
                    if (this.touchStartX < width / 2) {
                        this.activeTouchAction = 'brightness';
                    } else {
                        this.activeTouchAction = 'volume';
                    }
                }
            }

            if (this.activeTouchAction === 'volume') {
                const change = deltaY / 200; // Sensitivity
                let newVol = this.touchStartVol + change;
                newVol = Math.max(0, Math.min(1, newVol));
                this.setVolume(newVol);
                this.updateGestureOverlay('volume', newVol);
            } else if (this.activeTouchAction === 'brightness') {
                const change = deltaY / 200;
                let newBrit = this.touchStartBrit + change;
                newBrit = Math.max(0.5, Math.min(1.5, newBrit)); // Limit range
                this.setBrightness(newBrit);
                // Normalize brightness 0.5-1.5 to 0-1 for display
                const displayVal = Math.max(0, Math.min(1, (newBrit - 0.5))); 
                this.updateGestureOverlay('brightness', displayVal);
            }
        }, { passive: true });

        this.playerContainer.addEventListener('touchend', (e) => {
            this.initialPinchDistance = null;
            this.activeTouchAction = null;
            this.hideGestureOverlay();
            
            if (e.changedTouches.length !== 1) return;
            
            const touch = e.changedTouches[0];
            const currentTime = Date.now();
            const tapLength = currentTime - this.touchStartTime;
            
            // Handle Locked State Tap
            if (this.isLocked) {
                if (tapLength < 250) {
                    this.showLockIndicator();
                }
                return;
            }
            
            // Detect Double Tap
            // Condition: Short tap, recent previous tap, and small distance between taps
            if (tapLength < 250 && (currentTime - this.lastTapTime) < 300) {
                 const width = this.playerContainer.clientWidth;
                 const x = touch.clientX;
                 
                 // Distance check to ensure it's not two different fingers
                 if (Math.abs(x - this.lastTapX) < 50) {
                     e.preventDefault(); // Prevent zoom or other defaults
                     
                     if (x < width * 0.35) {
                         // Left side double tap -> Rewind
                         this.skip(-10);
                         this.showSeekIndicator(-10);
                     } else if (x > width * 0.65) {
                         // Right side double tap -> Forward
                         this.skip(10);
                         this.showSeekIndicator(10);
                     } else {
                         // Center double tap -> Play/Pause
                         this.togglePlay();
                     }
                     
                     this.lastTapTime = 0; // Reset
                     return;
                 }
            }
            
            this.lastTapTime = currentTime;
            this.lastTapX = touch.clientX;
        });
    }

    updateGestureOverlay(type, value) {
        if (!this.gestureOverlay) return;
        
        this.gestureOverlay.classList.add('active');
        this.gestureBarFill.style.width = `${value * 100}%`;
        
        let iconSvg = '';
        let text = '';
        
        if (type === 'volume') {
            text = `${Math.round(value * 100)}%`;
            if (value === 0) {
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gesture-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            } else if (value < 0.5) {
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gesture-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            } else {
                iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gesture-icon"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            }
        } else if (type === 'brightness') {
            text = `${Math.round(value * 100)}%`;
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gesture-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        }
        
        this.gestureIconContainer.innerHTML = iconSvg;
        this.gestureText.textContent = text;
    }
    
    hideGestureOverlay() {
        if (this.gestureOverlay) {
            this.gestureOverlay.classList.remove('active');
        }
    }

    toggleLock() {
        this.isLocked = !this.isLocked;
        this.playerContainer.classList.toggle('locked', this.isLocked);
        
        const unlockIcon = this.lockBtn.querySelector('svg:not(.icon-locked)');
        const lockIcon = this.lockBtn.querySelector('.icon-locked');
        
        if (this.isLocked) {
            unlockIcon.style.display = 'none';
            lockIcon.style.display = 'block';
            this.showToast('Screen Locked');
            // Hide controls immediately
            this.playerContainer.classList.remove('show-controls');
        } else {
            unlockIcon.style.display = 'block';
            lockIcon.style.display = 'none';
            this.showToast('Screen Unlocked');
            this.showControls();
        }
    }
    
    togglePlay() {
        if (this.isLocked) {
            // Briefly show lock icon to indicate locked state
            this.showLockIndicator();
            return;
        }
        if (this.video.paused) {
            this.video.play().catch(e => {
                console.error('Play error:', e);
            });
        } else {
            this.video.pause();
        }
    }
    
    showLockIndicator() {
        this.showToast('Tap 🔒 icon to Unlock');
        // Force show controls briefly so user can find the unlock button
        this.playerContainer.classList.add('show-controls');
        
        // Reset the timeout to hide controls
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.playerContainer.classList.remove('show-controls');
            }
        }, 3000);
    }

    skip(seconds) {
        if (this.isLocked) return;
        const newTime = this.video.currentTime + seconds;
        this.seekToTime(newTime);
        
        // Show seek indicator
        this.showSeekIndicator(seconds);
    }
    
    showSeekIndicator(seconds) {
        // Create indicator if doesn't exist
        let indicator = document.querySelector(`.seek-indicator.${seconds < 0 ? 'left' : 'right'}`);
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = `seek-indicator ${seconds < 0 ? 'left' : 'right'}`;
            this.playerContainer.appendChild(indicator);
        }
        
        // SVG Icons for Seek
        const iconSvg = seconds > 0 
            ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8V4L18 9l-6.5 5v-4C8 10 5 12.9 5 16.5S8 23 11.5 23 18 20.1 18 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="9" y="16" font-size="6" fill="currentColor" font-family="sans-serif">10</text></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8V4L6 9l6.5 5v-4c3.5 0 6.5 2.9 6.5 6.5S16 23 12.5 23 6 20.1 6 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><text x="10" y="16" font-size="6" fill="currentColor" font-family="sans-serif">10</text></svg>';
            
        indicator.innerHTML = `
            <div class="seek-icon">${iconSvg}</div>
            <span class="seek-text">${seconds > 0 ? '+' : ''}${seconds}s</span>
        `;
        
        indicator.classList.remove('active');
        void indicator.offsetWidth; // Force reflow
        indicator.classList.add('active');
    }
    
    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        this.seekToTime(clampedPos * this.video.duration);
    }
    
    seekToTime(targetTime) {
        if (!this.video.duration) return;
        
        // Clamp target time to valid range
        targetTime = Math.max(0, Math.min(targetTime, this.video.duration));

        // Check if target is within buffered range
        const isBuffered = this.isTimeBuffered(targetTime);
        
        if (!isBuffered) {
            // If server explicitly doesn't support Range requests, prevent seeking
            // to avoid video restarting from beginning
            if (this.supportsRangeRequests === false) {
                const warning = 'Seeking requires server support (Range requests).';
                console.warn(warning);
                this.showToast(warning);
                return;
            }

            // Show loading indicator for unbuffered seek
            this.showLoading();
            
            const timeStr = this.formatTime(targetTime);
            console.log(`🎯 Seeking to ${timeStr} - requesting chunk via HTTP Range header`);
            
            // For Google URLs, add a note
            const isGoogleUrl = this.currentUrl.includes('googleusercontent.com');
            if (isGoogleUrl) {
                console.log(`📥 Note: Google URLs support seeking, but may expire soon`);
            }
        }
        
        this.video.currentTime = targetTime;
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'speed-warning'; // Reuse existing warning style
        toast.textContent = message;
        this.playerContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
    
    isTimeBuffered(time) {
        for (let i = 0; i < this.video.buffered.length; i++) {
            if (time >= this.video.buffered.start(i) && time <= this.video.buffered.end(i)) {
                return true;
            }
        }
        return false;
    }
    
    // Seek to a specific percentage (0-100)
    seekToPercent(percent) {
        if (!this.video.duration) return;
        const targetTime = (percent / 100) * this.video.duration;
        this.seekToTime(targetTime);
    }
    
    // Time input methods
    showTimeInput() {
        this.timeDisplay.style.display = 'none';
        this.timeInputWrapper.style.display = 'flex';
        this.timeInput.value = '';
        this.timeInput.placeholder = this.formatTime(this.video.currentTime);
        this.timeInput.focus();
    }
    
    hideTimeInput() {
        this.timeInputWrapper.style.display = 'none';
        this.timeDisplay.style.display = '';
    }
    
    jumpToInputTime() {
        const input = this.timeInput.value.trim();
        if (!input) {
            this.hideTimeInput();
            return;
        }
        
        const seconds = this.parseTimeInput(input);
        if (seconds !== null && seconds >= 0 && seconds <= this.video.duration) {
            this.seekToTime(seconds);
            this.hideTimeInput();
        } else {
            // Invalid input - shake the input
            this.timeInput.style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                this.timeInput.style.animation = '';
            }, 300);
        }
    }
    
    parseTimeInput(input) {
        // Support formats: "1:30", "1:30:00", "90", "1h30m", "90s"
        input = input.toLowerCase().trim();
        
        // Try HH:MM:SS or MM:SS format
        if (input.includes(':')) {
            const parts = input.split(':').map(p => parseInt(p) || 0);
            if (parts.length === 2) {
                // MM:SS
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                // HH:MM:SS
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
        
        // Try human readable format: 1h30m, 90s, 1h, 30m
        let totalSeconds = 0;
        const hourMatch = input.match(/(\d+)\s*h/);
        const minMatch = input.match(/(\d+)\s*m/);
        const secMatch = input.match(/(\d+)\s*s/);
        
        if (hourMatch || minMatch || secMatch) {
            if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
            if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
            if (secMatch) totalSeconds += parseInt(secMatch[1]);
            return totalSeconds;
        }
        
        // Try plain number (seconds)
        const num = parseInt(input);
        if (!isNaN(num)) {
            return num;
        }
        
        return null;
    }
    
    updateTooltip(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        const time = clampedPos * this.video.duration;
        
        this.progressTooltip.textContent = this.formatTime(time);
        this.progressTooltip.style.left = `${clampedPos * 100}%`;
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        
        const progress = (this.video.currentTime / this.video.duration) * 100;
        this.progressPlayed.style.width = `${progress}%`;
        this.progressThumb.style.left = `${progress}%`;
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    
    updateBuffer() {
        if (!this.video.duration || this.video.buffered.length === 0) return;
        
        const duration = this.video.duration;
        const currentTime = this.video.currentTime;
        const now = Date.now();
        
        // Track max watched position for history buffer calculation
        if (currentTime > this.maxWatchedPosition) {
            this.maxWatchedPosition = currentTime;
        }
        
        // Collect all buffer ranges
        this.bufferRanges = [];
        for (let i = 0; i < this.video.buffered.length; i++) {
            this.bufferRanges.push({
                start: this.video.buffered.start(i),
                end: this.video.buffered.end(i)
            });
        }
        
        // Find buffer range containing current time
        let currentBufferEnd = currentTime;
        let currentBufferStart = currentTime;
        for (const range of this.bufferRanges) {
            if (currentTime >= range.start && currentTime <= range.end) {
                currentBufferEnd = range.end;
                currentBufferStart = range.start;
                break;
            }
        }
        
        // Calculate buffer ahead (from current position)
        const bufferAhead = currentBufferEnd - currentTime;
        
        // Calculate history buffer (from start of current buffer range)
        const historyBuffer = currentTime - currentBufferStart;
        
        // Calculate total buffered seconds
        let totalBuffered = 0;
        for (const range of this.bufferRanges) {
            totalBuffered += range.end - range.start;
        }
        
        // Update visual buffer bar - show the continuous buffer range around current position
        const bufferStartPercent = (currentBufferStart / duration) * 100;
        const bufferEndPercent = (currentBufferEnd / duration) * 100;
        
        this.progressBuffer.style.left = `${bufferStartPercent}%`;
        this.progressBuffer.style.width = `${bufferEndPercent - bufferStartPercent}%`;
        
        // Update stats display
        const aheadSeconds = Math.round(bufferAhead);
        this.bufferPercent.textContent = `${aheadSeconds}s ahead`;
        
        // Calculate real-time network speed using rolling average
        this.calculateNetworkSpeed(totalBuffered, now);
    }
    
    calculateNetworkSpeed(totalBuffered, now) {
        // Initialize on first call
        if (this.lastBufferTime === 0) {
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
            return;
        }
        
        // Calculate speed based on buffer change over time
        const timeDelta = (now - this.lastBufferTime) / 1000; // seconds
        const bufferDelta = totalBuffered - this.lastBufferedAmount; // seconds of video
        
        if (timeDelta > 0.3) { // Update every 300ms minimum
            // Estimate bitrate: assume average video bitrate
            // For typical HD video: ~5 Mbps, 4K: ~15 Mbps, SD: ~2 Mbps
            const estimatedBitrate = 5000000; // 5 Mbps default assumption
            
            // bytes downloaded = seconds of video * (bitrate / 8)
            const bytesDownloaded = bufferDelta * (estimatedBitrate / 8);
            const speedBps = bytesDownloaded / timeDelta; // bytes per second
            
            if (bufferDelta > 0.1) {
                // Add to rolling average
                this.networkSpeedSamples.push(speedBps);
                if (this.networkSpeedSamples.length > this.maxSpeedSamples) {
                    this.networkSpeedSamples.shift();
                }
                
                // Calculate average speed
                const avgSpeed = this.networkSpeedSamples.reduce((a, b) => a + b, 0) / this.networkSpeedSamples.length;
                this.displayNetworkSpeed(avgSpeed);
            } else if (timeDelta > 2) {
                // No recent buffering activity
                const isFullyBuffered = totalBuffered >= this.video.duration - 1;
                if (isFullyBuffered) {
                    this.networkSpeed.textContent = 'Complete';
                    this.networkSpeed.style.color = 'var(--accent-primary)';
                } else {
                    this.networkSpeed.textContent = 'Waiting...';
                    this.networkSpeed.style.color = 'var(--text-tertiary)';
                }
            }
            
            // Update tracking
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
        }
    }
    
    displayNetworkSpeed(bytesPerSecond) {
        this.networkSpeed.style.color = ''; // Reset to default color
        
        if (bytesPerSecond >= 1000000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000000).toFixed(1)} MB/s`;
        } else if (bytesPerSecond >= 1000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000).toFixed(0)} KB/s`;
        } else if (bytesPerSecond > 0) {
            this.networkSpeed.textContent = `${Math.round(bytesPerSecond)} B/s`;
        }
    }
    
    // Update speed status when not actively buffering
    updateSpeedStatus() {
        if (!this.video.duration) return;
        
        // Calculate total buffered
        let totalBuffered = 0;
        for (let i = 0; i < this.video.buffered.length; i++) {
            totalBuffered += this.video.buffered.end(i) - this.video.buffered.start(i);
        }
        
        const isFullyBuffered = totalBuffered >= this.video.duration - 1;
        const bufferPercent = Math.round((totalBuffered / this.video.duration) * 100);
        
        // Update based on current state
        if (isFullyBuffered) {
            this.networkSpeed.textContent = 'Complete';
            this.networkSpeed.style.color = 'var(--accent-primary)';
            this.bufferIndicator.classList.remove('active');
        } else if (this.networkSpeedSamples.length === 0) {
            // No speed data yet, show buffer progress
            this.networkSpeed.textContent = `${bufferPercent}% loaded`;
            this.networkSpeed.style.color = '';
        }
    }
    
    // Smart buffer management - continues buffering when paused
    startBufferManagement() {
        // Clear any existing interval
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
        }
        
        // Check buffer status every 500ms
        this.bufferCheckInterval = setInterval(() => {
            this.manageBuffer();
        }, 500);
    }
    
    stopBufferManagement() {
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
            this.bufferCheckInterval = null;
        }
    }
    
    manageBuffer() {
        if (!this.video.duration || !this.video.src) return;
        
        const currentTime = this.video.currentTime;
        const duration = this.video.duration;
        
        // Calculate required history buffer (10% of max watched position)
        const requiredHistoryBuffer = this.maxWatchedPosition * this.historyBufferRatio;
        
        // Find current buffer range
        let bufferAhead = 0;
        let bufferBehind = 0;
        let totalBuffered = 0;
        
        for (let i = 0; i < this.video.buffered.length; i++) {
            const start = this.video.buffered.start(i);
            const end = this.video.buffered.end(i);
            totalBuffered += end - start;
            
            if (currentTime >= start && currentTime <= end) {
                bufferAhead = end - currentTime;
                bufferBehind = currentTime - start;
            }
        }
        
        // Check if still buffering (not fully loaded)
        const isFullyBuffered = totalBuffered >= duration - 0.5;
        const needsMoreBuffer = bufferAhead < this.targetBufferAhead && !isFullyBuffered;
        
        // Show buffer indicator when paused and still buffering
        if (this.video.paused && needsMoreBuffer && !this.loadingOverlay.classList.contains('active')) {
            this.bufferIndicator.classList.add('active');
            this.encourageBuffering();
        } else {
            this.bufferIndicator.classList.remove('active');
        }
        
        // Update UI with buffer health indicator
        this.updateBufferHealth(bufferAhead, bufferBehind, requiredHistoryBuffer);
        
        // Update speed status display
        this.updateSpeedStatus();
    }
    
    encourageBuffering() {
        // Browsers automatically buffer when video is loaded
        // We ensure preload is set to auto for aggressive buffering
        if (this.video.preload !== 'auto') {
            this.video.preload = 'auto';
        }
        
        // Some browsers buffer more when we access buffered property
        // This is a hint to the browser that we care about buffering
        if (this.video.buffered.length > 0) {
            const lastBufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
            // Log buffer status for debugging
            console.debug(`Buffer: ${lastBufferedEnd.toFixed(1)}s / ${this.video.duration.toFixed(1)}s`);
        }
    }
    
    updateBufferHealth(ahead, behind, requiredHistory) {
        // Visual indicator of buffer health
        const bufferStat = document.getElementById('bufferStat');
        
        if (ahead >= 30) {
            bufferStat.classList.remove('warning', 'critical');
            bufferStat.classList.add('healthy');
        } else if (ahead >= 10) {
            bufferStat.classList.remove('healthy', 'critical');
            bufferStat.classList.add('warning');
        } else {
            bufferStat.classList.remove('healthy', 'warning');
            bufferStat.classList.add('critical');
        }
    }
    
    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
            this.video.volume = this.lastVolume || 1;
        } else {
            this.lastVolume = this.video.volume;
            this.video.muted = true;
        }
    }
    
    setVolume(value) {
        this.video.volume = value;
        this.video.muted = value == 0;
        this.updateVolumeUI();
        this.saveSettings();
    }
    
    updateVolumeUI() {
        const volume = this.video.muted ? 0 : this.video.volume;
        const container = this.muteBtn.closest('.volume-container');
        
        this.volumeSlider.value = volume;
        this.volumeFill.style.width = `${volume * 100}%`;
        
        container.classList.remove('low', 'muted');
        if (volume === 0 || this.video.muted) {
            container.classList.add('muted');
        } else if (volume < 0.5) {
            container.classList.add('low');
        }
    }

    setBrightness(value) {
        this.currentBrightness = parseFloat(value);
        this.video.style.filter = `brightness(${this.currentBrightness})`;
        this.updateBrightnessUI();
        this.saveSettings();
    }

    updateBrightnessUI() {
        this.brightnessSlider.value = this.currentBrightness;
        // Calculate percentage for fill (0.5 to 1.5 map to 0% to 100%)
        const percent = (this.currentBrightness - 0.5) * 100;
        this.brightnessFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    }
    
    setPlaybackSpeed(speed) {
        try {
            this.video.playbackRate = speed;
            this.speedValue.textContent = `${speed}x`;
            
            document.querySelectorAll('.speed-option').forEach(option => {
                option.classList.toggle('active', parseFloat(option.dataset.speed) === speed);
            });
            
            this.speedMenu.classList.remove('active');
        } catch (error) {
            // Browser doesn't support this playback rate
            console.warn(`Playback rate ${speed}x not supported:`, error.message);
            this.showSpeedWarning(speed);
        }
    }
    
    showSpeedWarning(speed) {
        // Show temporary warning
        const warning = document.createElement('div');
        warning.className = 'speed-warning';
        warning.innerHTML = `⚠️ ${speed}x not supported. Browser limit: 0.0625x - 16x`;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.classList.add('fade-out');
            setTimeout(() => warning.remove(), 300);
        }, 2500);
    }
    
    async toggleFullscreen() {
        try {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                // Enter Fullscreen
                if (this.playerContainer.requestFullscreen) {
                    await this.playerContainer.requestFullscreen();
                } else if (this.playerContainer.webkitRequestFullscreen) {
                    await this.playerContainer.webkitRequestFullscreen();
                }
                
                // Attempt to lock orientation to landscape
                if (screen.orientation && screen.orientation.lock) {
                    try {
                        await screen.orientation.lock('landscape');
                    } catch (e) {
                        console.log('Orientation lock failed (not supported or permitted):', e);
                    }
                }
            } else {
                // Exit Fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
                
                // Unlock orientation
                if (screen.orientation && screen.orientation.unlock) {
                    try {
                        screen.orientation.unlock();
                    } catch (e) {
                        console.log('Orientation unlock failed:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }
    
    onFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.playerContainer.classList.toggle('fullscreen', this.isFullscreen);
    }
    
    async togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await this.video.requestPictureInPicture();
            }
        } catch (e) {
            console.error('PiP error:', e);
        }
    }
    
    showControls() {
        clearTimeout(this.controlsTimeout);
        clearTimeout(this.cursorTimeout);
        
        this.playerContainer.classList.add('show-controls');
        this.playerContainer.classList.remove('hide-cursor');
        
        if (this.isPlaying) {
            this.controlsTimeout = setTimeout(() => {
                this.playerContainer.classList.remove('show-controls');
            }, 1000);
            
            if (this.isFullscreen) {
                this.cursorTimeout = setTimeout(() => {
                    this.playerContainer.classList.add('hide-cursor');
                }, 1000);
            }
        }
    }
    
    hideControls() {
        if (this.isPlaying) {
            this.playerContainer.classList.remove('show-controls');
        }
    }
    
    handleKeyboard(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        switch (key) {
            case ' ':
            case 'k':
                e.preventDefault();
                if (this.playerSection.classList.contains('active')) {
                    this.togglePlay();
                }
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'p':
                e.preventDefault();
                this.togglePiP();
                break;
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'arrowright':
            case 'l':
                e.preventDefault();
                this.skip(10);
                break;
            case 'arrowup':
                e.preventDefault();
                this.setVolume(Math.min(1, this.video.volume + 0.1));
                break;
            case 'arrowdown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume - 0.1));
                break;
            case '?':
                e.preventDefault();
                this.shortcutsModal.classList.toggle('active');
                break;
            case 'escape':
                this.shortcutsModal.classList.remove('active');
                break;
            default:
                // Number keys for seeking (0-9 = 0%-90%)
                if (key >= '0' && key <= '9') {
                    e.preventDefault();
                    const percent = parseInt(key) * 10;
                    this.seekToPercent(percent);
                }
        }
    }
    
    showLoading() {
        this.loadingOverlay.classList.add('active');
    }
    
    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }
    
    showError(message = 'Unable to load video') {
        this.hideLoading();
        this.errorText.textContent = message;
        this.errorOverlay.classList.add('active');
    }
    
    hideError() {
        this.errorOverlay.classList.remove('active');
    }
    
    handleError(e) {
        const error = this.video.error;
        let message = 'Unable to load video';
        
        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Video playback aborted';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    message = 'Network error - check your connection or the URL may have expired';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    message = 'Video format not supported by browser';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    // Try without crossorigin attribute if it was set
                    if (this.video.hasAttribute('crossorigin') && !this.triedWithoutCors) {
                        this.triedWithoutCors = true;
                        console.log('Retrying without CORS...');
                        this.video.removeAttribute('crossorigin');
                        this.video.load();
                        return;
                    }
                    // Try with crossorigin if it wasn't set
                    if (!this.video.hasAttribute('crossorigin') && !this.triedWithCors) {
                        this.triedWithCors = true;
                        console.log('Retrying with CORS anonymous...');
                        this.video.setAttribute('crossorigin', 'anonymous');
                        this.video.load();
                        return;
                    }
                    
                    // Check if it's a Google URL for specific message
                    const isGoogleUrl = this.currentUrl.includes('googleusercontent.com') || 
                                       this.currentUrl.includes('googlevideo.com');
                    if (isGoogleUrl) {
                        message = 'Google video URL has expired!\n\nGoogle download links are only valid for a few hours.\nPlease get a fresh download URL.';
                    } else {
                        message = 'Video cannot be played.\n\n• URL may be expired or invalid\n• Server may block external access\n• Format may not be supported';
                    }
                    break;
            }
        }
        
        this.showError(message);
    }
    
    showPlayerSection() {
        this.urlSection.classList.add('hidden');
        this.playerSection.classList.add('active');
    }
    
    renderRecentGrid() {
        try {
            const history = JSON.parse(localStorage.getItem('zenithStreamHistory') || '[]');
            this.recentGrid.innerHTML = '';
            
            if (history.length === 0) {
                this.recentSection.classList.add('hidden');
                return;
            }
            
            this.recentSection.classList.remove('hidden');
            // Show top 6
            const recent = history.slice(0, 6);
            
            recent.forEach(url => {
                const card = document.createElement('div');
                card.className = 'recent-card';
                card.innerHTML = `
                    <div class="recent-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                             <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                             <circle cx="12" cy="12" r="10" />
                        </svg>
                    </div>
                    <span class="recent-card-url" title="${url}">${url}</span>
                    <span class="recent-card-time">Resume Playback</span>
                `;
                
                card.addEventListener('click', () => {
                    this.urlInput.value = url;
                    this.loadVideo();
                });
                
                this.recentGrid.appendChild(card);
            });
        } catch (e) {
            console.warn('Failed to render recent grid:', e);
        }
    }

    takeScreenshot() {
        if (!this.video) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            link.download = `zenith-snap-${timestamp}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            this.showToast('Screenshot saved 📸');
        } catch (e) {
            console.error('Screenshot failed:', e);
            this.showToast('Screenshot failed (CORS restriction)');
        }
    }

    toggleTheater() {
        this.playerContainer.classList.toggle('theater');
        this.playerSection.classList.toggle('theater-mode');
        this.showToast(this.playerContainer.classList.contains('theater') ? 'Theater Mode On' : 'Default View');
    }

    showUrlSection() {
        this.urlSection.classList.remove('hidden');
        this.playerSection.classList.remove('active');
        this.renderRecentGrid();
        
        // Stop buffer management
        this.stopBufferManagement();
        
        // Reset video
        this.video.pause();
        this.video.src = '';
        this.video.load();
        
        // Reset buffer tracking
        this.maxWatchedPosition = 0;
        this.bufferRanges = [];
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        
        // Reset UI
        this.hideLoading();
        this.hideError();
        this.progressPlayed.style.width = '0%';
        this.progressBuffer.style.width = '0%';
        this.progressBuffer.style.left = '0%';
        this.progressThumb.style.left = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
        this.bufferPercent.textContent = '0%';
        this.networkSpeed.textContent = '—';
        
        // Remove buffer health classes
        const bufferStat = document.getElementById('bufferStat');
        bufferStat.classList.remove('healthy', 'warning', 'critical');
        
        // Hide buffer indicator
        this.bufferIndicator.classList.remove('active');
        
        // Clear URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('url');
        window.history.replaceState({}, '', newUrl);
        
        this.urlInput.focus();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.streamFlow = new StreamFlowPlayer();
});

// Service Worker for offline support (optional enhancement)
if ('serviceWorker' in navigator) {
    // Uncomment to enable service worker
    // navigator.serviceWorker.register('/sw.js');
}

