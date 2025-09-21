document.addEventListener('DOMContentLoaded', () => {
    const jsmediatags = window.jsmediatags;
    const colorThief = new ColorThief();

    const API_BASE_URL = '/api'; 
    const searchForm = document.getElementById('search-form');
    const searchKeywordInput = document.getElementById('search-keyword');
    const resultsTbody = document.getElementById('results-tbody');
    const resultsTable = document.querySelector('.results-table');
    const loader = document.getElementById('loader');
    const messageArea = document.getElementById('message-area');
    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');
    const playerBar = document.getElementById('player-bar');
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const fpPlayPauseBtn = document.getElementById('fp-play-pause-btn');
    const fpPlayPauseIcon = document.getElementById('fp-play-pause-icon');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const fullscreenPlayer = document.getElementById('fullscreen-player');
    const fpCloseBtn = document.getElementById('fp-close-btn');
    const fpCurrentTime = document.getElementById('fp-current-time');
    const fpTotalTime = document.getElementById('fp-total-time');
    const fpProgressBar = document.getElementById('fp-progress-bar');
    const fpProgressFill = document.getElementById('fp-progress-fill');
    const fpLyricsContainer = document.getElementById('fp-lyrics-container');
    const fpDownloadBtn = document.getElementById('fp-download-btn');
    const fpOnlineControls = document.getElementById('fp-online-controls');
    const fpFavoriteBtn = document.getElementById('fp-favorite-btn');
    const fpExternalLinkBtn = document.getElementById('fp-external-link-btn');
    const navDiscover = document.getElementById('nav-discover');
    const navFavorites = document.getElementById('nav-favorites');
    const navLocal = document.getElementById('nav-local');
    const navSettings = document.getElementById('nav-settings');
    const mainContentArea = document.getElementById('main-content-area');
    const favoritesView = document.getElementById('favorites-view');
    const favoritesTbody = document.getElementById('favorites-tbody');
    const localSongsView = document.getElementById('local-songs-view');
    const settingsView = document.getElementById('settings-view');
    const playlistOverlay = document.getElementById('playlist-overlay');
    const playlistPanel = document.getElementById('playlist-panel');
    const playlistCloseBtn = document.getElementById('playlist-close-btn');
    const playlistList = document.getElementById('playlist-list');
    const togglePlaylistBtn = document.getElementById('toggle-playlist-btn');
    const fpTogglePlaylistBtn = document.getElementById('fp-toggle-playlist-btn');
    const prevBtns = document.querySelectorAll('.side-btn[aria-label="Previous"]');
    const nextBtns = document.querySelectorAll('.side-btn[aria-label="Next"]');
    const importSongsBtn = document.getElementById('import-songs-btn');
    const songImporter = document.getElementById('song-importer');
    const localSongsTbody = document.getElementById('local-songs-tbody');
    const fpMainPanel = document.querySelector('.fp-main-panel'); 
    const fpProgressContainer = document.querySelector('.fp-progress-container'); 
    const fpPlaybackControls = document.querySelector('.fp-playback-controls'); 
    const fpSongInfo = document.querySelector('.fp-song-info'); 
    const fpInteractiveControls = document.getElementById('fp-interactive-controls'); 
    const importFavoritesBtn = document.getElementById('import-favorites-btn');
    const exportFavoritesBtn = document.getElementById('export-favorites-btn');
    const favoritesImporter = document.getElementById('favorites-importer');



    let currentPage = 1;
    let currentPlayingSongData = null;
    let parsedLyrics = [];
    let currentLyricIndex = -1;
    let canSearch = true;
    let canSwitchSong = true;
    let lyricLoadTimer = null;
    let currentAlbumArtUrl = null;
    let userScrollingLyrics = false;
    let lyricScrollTimeout = null;
    let isNativePlayerMode = false;

    const playIconPath = "M8 5v14l11-7z";
    const pauseIconPath = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";
    const musicIconPlaceholder = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'%23cccccc\' d=\'M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6Z\'/%3E%3C/svg%3E")';

    const dbHelper = {
        db: null,
        init() {
            return new Promise((resolve, reject) => {
                // 数据库版本从 3 升级到 4
                const request = indexedDB.open('Open Music New 2', 4);
                request.onerror = event => reject("数据库打开报错");
                request.onsuccess = event => {
                    this.db = event.target.result;
                    resolve();
                };
                request.onupgradeneeded = event => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('playlist')) {
                        db.createObjectStore('playlist', { keyPath: 'id', autoIncrement: true });
                    }
                    if (!db.objectStoreNames.contains('local_songs')) {
                        db.createObjectStore('local_songs', { keyPath: 'id', autoIncrement: true });
                    }
                    if (!db.objectStoreNames.contains('favorites')) {
                        db.createObjectStore('favorites', { keyPath: 'id', autoIncrement: true });
                    }
                    // 新增：创建专辑封面缓存对象存储
                    if (!db.objectStoreNames.contains('album_art_cache')) {
                        db.createObjectStore('album_art_cache', { keyPath: 'id' });
                    }
                };
            });
        },
        // 新增：获取专辑封面缓存的方法
        getAlbumArt(id) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['album_art_cache'], 'readonly');
                const store = transaction.objectStore('album_art_cache');
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result ? request.result.image : null);
                request.onerror = (e) => reject('获取专辑封面缓存失败: ' + e.target.error);
            });
        },
        // 新增：添加专辑封面到缓存的方法
        addAlbumArt(id, blob) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['album_art_cache'], 'readwrite');
                const store = transaction.objectStore('album_art_cache');
                const request = store.put({ id: id, image: blob });
                request.onsuccess = resolve;
                request.onerror = (e) => reject('缓存专辑封面失败: ' + e.target.error);
            });
        },
        addSongToPlaylist(song) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['playlist'], 'readwrite');
                const store = transaction.objectStore('playlist');
                const request = store.add(song);
                request.onsuccess = resolve;
                request.onerror = () => reject('添加歌曲到播放列表失败');
            });
        },
        getPlaylistSongs() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['playlist'], 'readonly');
                const store = transaction.objectStore('playlist');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject('获取播放列表失败');
            });
        },
        deleteSongFromPlaylist(id) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['playlist'], 'readwrite');
                const store = transaction.objectStore('playlist');
                const request = store.delete(id);
                request.onsuccess = resolve;
                request.onerror = () => reject('从播放列表删除歌曲失败');
            });
        },
        addLocalSong(song) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['local_songs'], 'readwrite');
                const store = transaction.objectStore('local_songs');
                const request = store.add(song);
                request.onsuccess = resolve;
                request.onerror = (e) => reject('添加本地歌曲失败: ' + e.target.error);
            });
        },
        getLocalSongs() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['local_songs'], 'readonly');
                const store = transaction.objectStore('local_songs');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject('获取本地歌曲列表失败');
            });
        },
        deleteLocalSong(id) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['local_songs'], 'readwrite');
                const store = transaction.objectStore('local_songs');
                const request = store.delete(id);
                request.onsuccess = resolve;
                request.onerror = () => reject('删除本地歌曲失败');
            });
        },
        async isSongFavorite(songData) {
            const songs = await this.getFavoriteSongs();
            return songs.find(s => s.trackId === songData.trackId && s.source === songData.source);
        },
        addSongToFavorites(song) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['favorites'], 'readwrite');
                const store = transaction.objectStore('favorites');
                const request = store.add(song);
                request.onsuccess = resolve;
                request.onerror = () => reject('添加收藏失败');
            });
        },
        getFavoriteSongs() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['favorites'], 'readonly');
                const store = transaction.objectStore('favorites');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject('获取收藏列表失败');
            });
        },
        deleteSongFromFavorites(dbId) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['favorites'], 'readwrite');
                const store = transaction.objectStore('favorites');
                const request = store.delete(dbId);
                request.onsuccess = resolve;
                request.onerror = () => reject('删除失败');
            });
        }
    };

    function setupCustomControls() {
        document.querySelectorAll('.custom-select').forEach(setupCustomSelect);
        setupCustomNumberInput(document.getElementById('page-length'));
    }

    function setupCustomSelect(container) {
        const selectId = container.dataset.selectId;
        const nativeSelect = document.getElementById(selectId);
        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        const selectedDisplay = document.createElement('span');
        selectedDisplay.textContent = nativeSelect.options[nativeSelect.selectedIndex].textContent;
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';
        trigger.appendChild(selectedDisplay);
        container.appendChild(trigger);
        container.appendChild(optionsContainer);

        Array.from(nativeSelect.options).forEach((option) => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-option';
            customOption.textContent = option.textContent;
            customOption.dataset.value = option.value;
            if (option.selected) customOption.classList.add('selected');

            customOption.addEventListener('click', () => {
                nativeSelect.value = option.value;
                selectedDisplay.textContent = option.textContent;
                container.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                customOption.classList.add('selected');
                container.classList.remove('open');
                nativeSelect.dispatchEvent(new Event('change'));
            });
            optionsContainer.appendChild(customOption);
        });
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select').forEach(sel => {
                if (sel !== container) sel.classList.remove('open');
            });
            container.classList.toggle('open');
        });
        
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(sel => sel.classList.remove('open'));
        });
    }

    function setupCustomNumberInput(nativeInput) {
        const container = nativeInput.parentElement;
        const display = document.createElement('div');
        display.className = 'custom-number-input-display';
        const minusBtn = document.createElement('button');
        minusBtn.textContent = '−';
        const valueSpan = document.createElement('span');
        valueSpan.textContent = nativeInput.value;
        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        display.appendChild(minusBtn);
        display.appendChild(valueSpan);
        display.appendChild(plusBtn);
        container.appendChild(display);
        const step = parseInt(nativeInput.step) || 1;

        minusBtn.addEventListener('click', () => {
            let val = parseInt(nativeInput.value);
            let min = parseInt(nativeInput.min);
            if (val > min) {
                nativeSelect.value = Math.max(min, val - step);
                valueSpan.textContent = nativeSelect.value;
            }
        });
        plusBtn.addEventListener('click', () => {
            let val = parseInt(nativeInput.value);
            let max = parseInt(nativeInput.max);
            if (val < max) {
                nativeSelect.value = Math.min(max, val + step);
                valueSpan.textContent = nativeSelect.value;
            }
        });
    }

    function switchView(view) {
        mainContentArea.style.display = view === 'discover' ? 'block' : 'none';
        favoritesView.style.display = view === 'favorites' ? 'block' : 'none';
        localSongsView.style.display = view === 'local' ? 'block' : 'none';
        settingsView.style.display = view === 'settings' ? 'block' : 'none';
        
        navDiscover.classList.toggle('active', view === 'discover');
        navFavorites.classList.toggle('active', view === 'favorites');
        navLocal.classList.toggle('active', view === 'local');
        navSettings.classList.toggle('active', view === 'settings');

        if (view === 'favorites') {
            renderFavoritesList();
        }
        if (view === 'local') {
            renderLocalSongsList();
        }
    }
    
    function updatePlayerUI(songData, picUrl = null) {
        const title = songData.name || '未知歌曲';
        const artist = songData.artist || '未知歌手';
        document.getElementById('player-bar-title').textContent = title;
        document.getElementById('player-bar-artist').textContent = artist;
        document.getElementById('fp-title').textContent = title;
        document.getElementById('fp-artist').textContent = artist;

        if (currentAlbumArtUrl && currentAlbumArtUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentAlbumArtUrl);
        }
        currentAlbumArtUrl = picUrl;

        const imageUrl = picUrl ? `url(${picUrl})` : musicIconPlaceholder;
        document.getElementById('player-bar-album-art').style.backgroundImage = imageUrl;
        document.getElementById('fp-album-art').style.backgroundImage = imageUrl;

        if (picUrl) {
            const tempImg = new Image();
            tempImg.crossOrigin = 'Anonymous';
            tempImg.onload = () => {
                try {
                    const palette = colorThief.getPalette(tempImg, 5);
                    if (palette && palette.length >= 4) {
                        activateDynamicBackground(palette);
                    }
                } catch(e) {
                    console.error("Color-thief error:", e);
                }
            };
            tempImg.src = picUrl;
        }
    }
    
    function resetDynamicBackground() {
        fullscreenPlayer.classList.remove('dynamic-bg-active');
        playlistPanel.classList.remove('dark-theme');
        fullscreenPlayer.style.cssText = '';
    }

    function activateDynamicBackground(palette) {
        const colors = palette.map(rgb => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        const primaryColor = colors[0];
        const [r, g, b] = palette[0];
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        let textColor, secondaryTextColor, shadowColor;

        if (brightness > 128) {
            textColor = '#000000';
            secondaryTextColor = 'rgba(0, 0, 0, 0.7)';
            shadowColor = 'rgba(0, 0, 0, 0.2)';
            playlistPanel.classList.remove('dark-theme');
        } else {
            textColor = '#ffffff';
            secondaryTextColor = 'rgba(255, 255, 255, 0.8)';
            shadowColor = 'rgba(0, 0, 0, 0.5)';
            playlistPanel.classList.add('dark-theme');
        }

        fullscreenPlayer.style.setProperty('--fp-bg-color', primaryColor);
        fullscreenPlayer.style.setProperty('--fp-blob-color-1', colors[1]);
        fullscreenPlayer.style.setProperty('--fp-blob-color-2', colors[2]);
        fullscreenPlayer.style.setProperty('--fp-blob-color-3', colors[3]);
        fullscreenPlayer.style.setProperty('--fp-blob-color-4', colors[0]);
        fullscreenPlayer.style.setProperty('--fp-text-color', textColor);
        fullscreenPlayer.style.setProperty('--fp-secondary-text-color', secondaryTextColor);
        fullscreenPlayer.style.setProperty('--fp-shadow-color', shadowColor);

        fullscreenPlayer.classList.add('dynamic-bg-active');
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateProgress() {
        if (isNaN(audioPlayer.duration)) return;
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        const currentTime = formatTime(audioPlayer.currentTime);
        const totalTime = formatTime(audioPlayer.duration);
        
        progressFill.style.width = `${percentage}%`;
        currentTimeDisplay.textContent = currentTime;
        totalTimeDisplay.textContent = totalTime;

        fpProgressFill.style.width = `${percentage}%`;
        fpCurrentTime.textContent = currentTime;
        fpTotalTime.textContent = totalTime;

        updateLyricHighlight();
    }

    function parseLRC(lrc) {
        if (!lrc) return [];
        const lines = lrc.split('\n');
        const result = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3].padEnd(3, '0')) / 1000;
                const text = line.replace(timeRegex, '').trim();
                if (text) result.push({ time, text });
            }
        }
        return result;
    }

    function displayLyrics(lyrics) {
        fpLyricsContainer.innerHTML = '';
        if (lyrics.length === 0) {
            fpLyricsContainer.innerHTML = '<p class="lyric-line active-lyric">暂无歌词</p>';
            fullscreenPlayer.classList.remove('lyrics-visible');
            return;
        }
        lyrics.forEach((line, index) => {
            const p = document.createElement('p');
            p.className = 'lyric-line';
            p.textContent = line.text;
            p.dataset.index = index;
            p.addEventListener('click', (e) => {
                const clickedIndex = parseInt(e.currentTarget.dataset.index);
                if (!isNaN(clickedIndex) && parsedLyrics[clickedIndex]) {
                    audioPlayer.currentTime = parsedLyrics[clickedIndex].time;
                    userScrollingLyrics = false;
                    updateLyricHighlight();
                }
            });
            fpLyricsContainer.appendChild(p);
        });
        fullscreenPlayer.classList.add('lyrics-visible');
    }

    function updateLyricHighlight() {
        if (userScrollingLyrics || parsedLyrics.length === 0) return;

        let newIndex = parsedLyrics.findIndex(line => line.time > audioPlayer.currentTime) - 1;
        if (newIndex < 0 && audioPlayer.currentTime > parsedLyrics[0]?.time) newIndex = parsedLyrics.length - 1;
        if (newIndex < 0 || newIndex === currentLyricIndex) return;

        const lines = fpLyricsContainer.children;
        if (currentLyricIndex >= 0 && lines[currentLyricIndex]) {
            lines[currentLyricIndex].classList.remove('active-lyric');
        }
        if (lines[newIndex]) {
            lines[newIndex].classList.add('active-lyric');
            lines[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        currentLyricIndex = newIndex;
    }

    async function performSearch() {
        if (!canSearch) return;
        canSearch = false;
        setTimeout(() => { canSearch = true; }, 5000);

        const keyword = searchKeywordInput.value.trim();
        if (!keyword) return;
        const source = document.getElementById('music-source').value;
        const count = document.getElementById('page-length').value;
        resultsTbody.innerHTML = '';
        messageArea.style.display = 'none';
        resultsTable.style.display = 'none';
        loader.style.display = 'block';
        paginationControls.style.display = 'none';
        switchView('discover');
        const url = `${API_BASE_URL}?types=search&source=${source}&name=${encodeURIComponent(keyword)}&count=${count}&pages=${currentPage}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('网络请求失败');
            const data = await response.json();
            if (data.length > 0) {
                displayResults(data);
                updatePagination(data.length, count);
                resultsTable.style.display = 'table';
            } else {
                messageArea.innerHTML = '<h2>未找到相关结果</h2><p>请尝试其他关键词或更换音乐源。</p>';
                messageArea.style.display = 'flex';
                if (currentPage > 1) updatePagination(0, count);
            }
        } catch (error) {
            console.error('搜索失败:', error);
            messageArea.innerHTML = '<h2>搜索请求失败</h2><p>可能是服务器出错，<a href="https://music.gdstudio.xyz">点击查看解决方案</a>。</p>';
            messageArea.style.display = 'flex';
        } finally {
            loader.style.display = 'none';
        }
    }

    async function displayResults(songs) {
        resultsTbody.innerHTML = '';
        const favoriteSongs = await dbHelper.getFavoriteSongs();

        songs.forEach(song => {
            const tr = document.createElement('tr');
            const artistName = Array.isArray(song.artist) ? song.artist.join(' / ') : (song.artist || '未知歌手');
            const songData = {
                trackId: song.id, picId: song.pic_id, lyricId: song.lyric_id,
                source: song.source, name: song.name, artist: artistName, album: song.album || '未知专辑'
            };
            const isFavorite = favoriteSongs.some(fs => fs.trackId === songData.trackId && fs.source === songData.source);
            const uniqueSongId = `${songData.source}-${songData.trackId}`;

            tr.innerHTML = `
                <td><div class="play-icon-cell"><svg viewBox="0 0 24 24"><path d="${playIconPath}"></path></svg></div></td>
                <td><div class="truncate-text">${song.name || '未知歌曲'}</div></td>
                <td><div class="truncate-text">${artistName}</div></td>
                <td><div class="truncate-text">${song.album || '未知专辑'}</div></td>
                <td>
                    <div class="actions-container">
                        <button class="icon-button favorite-btn ${isFavorite ? 'favorited' : ''}" aria-label="Favorite" data-song-id="${uniqueSongId}">
                            <svg viewBox="0 0 24 24"><path class="unfavorited-path" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"></path><path class="favorited-path" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                        </button>
                    </div>
                </td>
            `;

            tr.addEventListener('click', (e) => {
                if (!e.target.closest('.actions-container')) {
                    playSong(songData, true, false);
                }
            });

            tr.querySelector('.favorite-btn').addEventListener('click', (e) => {
                e.stopPropagation(); 
                toggleFavorite(songData);
            });

            resultsTbody.appendChild(tr);
        });
    }

    
    function updatePagination(resultsCount, perPage) {
        paginationControls.style.display = 'flex';
        pageInfo.textContent = `第 ${currentPage} 页`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = resultsCount < perPage;
    }

    function updateMediaSession(songData) {
        if (!('mediaSession' in navigator)) return;
        
        if (!songData || !songData.name) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = 'none';
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: songData.name,
            artist: songData.artist,
            album: songData.album,
            artwork: [{ src: songData.picUrl || '', sizes: '500x500' }]
        });
    }

    async function fetchAndDisplayLyrics(songData) {
        fpLyricsContainer.innerHTML = '<p class="lyric-line active-lyric">正在加载歌词...</p>';
        try {
            const lyricRes = await fetch(`${API_BASE_URL}?types=lyric&source=${songData.source}&id=${songData.lyricId}`);
            if (lyricRes.ok) {
                const lyricData = await lyricRes.json();
                if (lyricData && lyricData.lyric) {
                    parsedLyrics = parseLRC(lyricData.lyric);
                    displayLyrics(parsedLyrics);
                    return;
                }
            }
            throw new Error('Failed to fetch lyrics');
        } catch (error) {
            console.error(`Lyric fetch failed.`);
            displayLyrics([]);
        }
    }

    // 重构：获取并显示专辑封面，优先使用IDB缓存
    async function fetchAndDisplayAlbumArt(songData) {
        const cacheKey = `${songData.artist}|${songData.album}`;
        
        try {
            // 1. 尝试从IDB获取缓存
            const cachedImageBlob = await dbHelper.getAlbumArt(cacheKey);
            if (cachedImageBlob) {
                console.log('从IDB缓存加载专辑封面。');
                const objectUrl = URL.createObjectURL(cachedImageBlob);
                currentPlayingSongData.picUrl = objectUrl;
                updatePlayerUI(currentPlayingSongData, objectUrl);
                updateMediaSession(currentPlayingSongData);
                return; // 缓存命中，结束函数
            }

            // 2. 如果缓存未命中，则从网络获取
            console.log('从网络加载并缓存专辑封面。');
            const picRes = await fetch(`${API_BASE_URL}?types=pic&source=${songData.source}&id=${songData.picId}&size=500`);
            const picData = await picRes.json();

            if (picData.url) {
                const imageResponse = await fetch(picData.url);
                if (!imageResponse.ok) throw new Error('下载图片数据失败');
                
                const imageBlob = await imageResponse.blob();
                
                // 3. 将获取到的图片存入IDB缓存
                await dbHelper.addAlbumArt(cacheKey, imageBlob);

                const objectUrl = URL.createObjectURL(imageBlob);
                currentPlayingSongData.picUrl = objectUrl;
                updatePlayerUI(currentPlayingSongData, objectUrl);
                updateMediaSession(currentPlayingSongData);
            }
        } catch (error) {
            console.error('获取或缓存专辑封面失败:', error);
            // 即使失败，也确保UI不会显示旧的图片
            updatePlayerUI(currentPlayingSongData, null);
            updateMediaSession(currentPlayingSongData);
        }
    }

    async function playSong(songData, shouldAutoPlay = true, isQualityChange = false) {
        fullscreenPlayer.classList.remove('local-mode');
        if (!canSwitchSong) return;
        canSwitchSong = false;
        setTimeout(() => { canSwitchSong = true; }, 5000);

        clearTimeout(lyricLoadTimer);
        
        if (!isQualityChange) {
            resetDynamicBackground();
            currentPlayingSongData = songData;
            updatePlayerUI(songData, null); // 初始时重置图片
            updateFavoriteStatus(songData);
            fpLyricsContainer.innerHTML = '<p class="lyric-line active-lyric">准备加载歌词...</p>';
            audioPlayer.src = '';
            parsedLyrics = [];
            currentLyricIndex = -1;
            updateMediaSession(null);
        }
        
        fpOnlineControls.style.display = 'flex';

        try {
            const quality = document.getElementById('quality-select').value;
            const urlRes = await fetch(`${API_BASE_URL}?types=url&source=${songData.source}&id=${songData.trackId}&br=${quality}`);
            const urlData = await urlRes.json();

            if (urlData.url) {
                const proxiedUrl = `/play?url=${encodeURIComponent(urlData.url)}`;
    console.log('正在通过代理播放在线歌曲:', proxiedUrl);
                    audioPlayer.src = proxiedUrl; 

                if (shouldAutoPlay) audioPlayer.play();
                
                if (!isQualityChange) {
                    lyricLoadTimer = setTimeout(() => fetchAndDisplayLyrics(songData), 5000);
                    // 修改：移除计时器，立即调用封面加载逻辑
                    fetchAndDisplayAlbumArt(songData);
                    dbHelper.addSongToPlaylist(songData).catch(err => console.error(err));
                }
            } else {
                throw new Error('无法获取音频资源');
            }
        } catch (error) {
            console.error('播放失败:', error);
            const errorMsg = "资源加载失败，请尝试更换音质或音乐源。";
            updatePlayerUI({ name: "播放失败", artist: errorMsg });
            displayLyrics([]);
            updateMediaSession(null);
        }
    }

    async function renderLocalSongsList() {
        const songs = await dbHelper.getLocalSongs();
        localSongsTbody.innerHTML = '';
        if (songs.length === 0) {
        localSongsTbody.innerHTML = '<tr class="no-songs-row"><td colspan="5" style="text-align:center;padding: 40px;">还没有本地歌曲，快去导入吧！</td></tr>';
            return;
        }
        songs.forEach(song => {
            const tr = document.createElement('tr');
tr.innerHTML = `
    <td><div class="play-icon-cell"><svg viewBox="0 0 24 24"><path d="${playIconPath}"></path></svg></div></td>
    <td><div class="truncate-text">${song.name}</div></td>
    <td><div class="truncate-text">${song.artist}</div></td>
    <td><div class="truncate-text">${song.album}</div></td>

    <td><button class="action-button delete-local-btn" data-id="${song.id}">删除</button></td>
`;

            tr.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-local-btn')) {
                    playLocalSong(song);
                }
            });
            tr.querySelector('.delete-local-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                const songId = parseInt(e.target.dataset.id);
                await dbHelper.deleteLocalSong(songId);
                renderLocalSongsList();
            });
            localSongsTbody.appendChild(tr);
        });
    }

    async function playLocalSong(songData) {
        resetDynamicBackground();
        fullscreenPlayer.classList.add('local-mode');
        currentPlayingSongData = { ...songData, isLocal: true };
        
        fpOnlineControls.style.display = 'none';

        const picUrl = songData.picture ? URL.createObjectURL(new Blob([songData.picture.data], {type: songData.picture.format})) : null;
        const audioUrl = URL.createObjectURL(songData.file);
        
        console.log('正在播放本地歌曲 (Blob URL):', audioUrl);

        updatePlayerUI({ name: songData.name, artist: songData.artist }, picUrl);
        updateFavoriteStatus(songData);
        
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        
        parsedLyrics = parseLRC(songData.lyrics || '');
        displayLyrics(parsedLyrics);
        currentLyricIndex = -1;

        updateMediaSession({
            name: songData.name,
            artist: songData.artist,
            album: songData.album,
            picUrl: picUrl
        });
    }

    function importSongs() {
        songImporter.click();
    }

    songImporter.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        loader.style.display = 'block';

        for (const file of files) {
            try {
                await new Promise((resolve, reject) => {
                    jsmediatags.read(file, {
                        onSuccess: async (tag) => {
                            const tags = tag.tags;
                            const songData = {
                                file: file,
                                name: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                                artist: tags.artist || '未知歌手',
                                album: tags.album || '未知专辑',
                                picture: tags.picture,
                                lyrics: tags.lyrics ? tags.lyrics.lyrics : null
                            };
                            await dbHelper.addLocalSong(songData);
                            resolve();
                        },
                        onError: (error) => {
                            console.warn('解析失败:', file.name, error);
                            dbHelper.addLocalSong({
                                file: file,
                                name: file.name.replace(/\.[^/.]+$/, ""),
                                artist: '未知歌手',
                                album: '未知专辑'
                            }).then(resolve).catch(reject);
                        }
                    });
                });
            } catch (e) {
                console.error("处理文件时出错:", file.name, e);
            }
        }
        
        loader.style.display = 'none';
        renderLocalSongsList();
        songImporter.value = '';
    });

    async function downloadSong(songData) {
        try {
            const quality = document.getElementById('quality-select').value;
            const response = await fetch(`${API_BASE_URL}?types=url&source=${songData.source}&id=${songData.trackId}&br=${quality}`);
            const data = await response.json();
            if (data.url) {
                const a = document.createElement('a');
                a.href = data.url;
                const fileExtension = data.url.split('.').pop().split('?')[0] || 'mp3';
                a.download = `${songData.artist} - ${songData.name}.${fileExtension}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else { alert('无法获取下载链接！请尝试更换音质。'); }
        } catch (error) { console.error('下载失败:', error); alert('下载请求失败，请稍后再试。'); }
    }
    
    async function renderPlaylist() {
        const songs = await dbHelper.getPlaylistSongs();
        playlistList.innerHTML = '';

        // 辅助函数，用于生成统一的缓存键，确保与图片缓存逻辑一致
        const normalize = str => {
            if (!str) return '未知';
            if (Array.isArray(str)) str = str.join(' / ');
            return str.trim().toLowerCase();
        };

        songs.reverse().forEach(song => {
            const item = document.createElement('li');
            item.className = 'playlist-item';
            item.innerHTML = `
                <div class="album-art">
                    <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4V7h4V3h-6Z"></path></svg>
                </div>
                <div class="details">
                    <div class="title">${song.name}</div>
                    <div class="artist">${song.artist}</div>
                </div>
                <button class="delete-btn" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
            `;

            const albumArtDiv = item.querySelector('.album-art');
            const artist = normalize(song.artist);
            const album = normalize(song.album);
            const cacheKey = `${artist}|${album}`;

            dbHelper.getAlbumArt(cacheKey).then(imageBlob => {
                if (imageBlob) {
                    const imageUrl = URL.createObjectURL(imageBlob);
                    albumArtDiv.innerHTML = ''; 
                    albumArtDiv.style.backgroundImage = `url(${imageUrl})`;
                }
            }).catch(err => console.error('在播放列表加载封面失败:', err));
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-btn')) {
                    if (song.isLocal) {
                        playLocalSong(song);
                    } else {
                        playSong(song, true, false);
                    }
                    playlistOverlay.classList.remove('visible');
                }
            });
            item.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await dbHelper.deleteSongFromPlaylist(song.id);
                renderPlaylist();
            });
            playlistList.appendChild(item);
        });
    }


    async function renderFavoritesList() {
        const songs = await dbHelper.getFavoriteSongs();
        favoritesTbody.innerHTML = '';
        if (songs.length === 0) {
            favoritesTbody.innerHTML = '<tr class="no-songs-row"><td colspan="5" style="text-align:center;padding: 40px;">还没有收藏的歌曲。</td></tr>';
            return;
        }
        songs.forEach(song => {
            const tr = document.createElement('tr');
tr.innerHTML = `
    <td><div class="play-icon-cell"><svg viewBox="0 0 24 24"><path d="${playIconPath}"></path></svg></div></td>
    <td><div class="truncate-text">${song.name}</div></td>
    <td><div class="truncate-text">${song.artist}</div></td>
    <td><div class="truncate-text">${song.album}</div></td>

    <td>
        <div class="actions-container">
            <button class="action-button unfavorite-btn">删除</button>
        </div>
    </td>
`;

            tr.addEventListener('click', (e) => {
                if (!e.target.closest('.actions-container')) {
                    playSong(song, true, false);
                }
            });
            tr.querySelector('.unfavorite-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await toggleFavorite(song, null);
                tr.remove();
            });
            favoritesTbody.appendChild(tr);
        });
    }

function syncFavoriteStatusInUI(songData, isFavorited) {
    const uniqueSongId = `${songData.source}-${songData.trackId}`;
    const buttons = document.querySelectorAll(`.favorite-btn[data-song-id="${uniqueSongId}"]`);
    buttons.forEach(btn => {
        btn.classList.toggle('favorited', isFavorited);
    });
    if (currentPlayingSongData && 
        currentPlayingSongData.trackId === songData.trackId && 
        currentPlayingSongData.source === songData.source) {
        
        fpFavoriteBtn.classList.toggle('favorited', isFavorited);
    }
}


    async function updateFavoriteStatus(songData) {
        if (!songData) {
            fpFavoriteBtn.classList.remove('favorited');
            return;
        }
        const isFav = await dbHelper.isSongFavorite(songData);
        fpFavoriteBtn.classList.toggle('favorited', !!isFav);
    }

async function toggleFavorite(songData) {
    const existingFavorite = await dbHelper.isSongFavorite(songData);
    if (existingFavorite) {
        await dbHelper.deleteSongFromFavorites(existingFavorite.id);
        syncFavoriteStatusInUI(songData, false);
    } else {
        await dbHelper.addSongToFavorites(songData);
        syncFavoriteStatusInUI(songData, true);
    }
    if (favoritesView.style.display === 'block') {
        renderFavoritesList();
    }
}


    function togglePlaylistPanel() {
        if (playlistOverlay.classList.contains('visible')) {
            playlistOverlay.classList.remove('visible');
        } else {
            renderPlaylist();
            playlistOverlay.classList.add('visible');
        }
    }

    function togglePlayPause() {
        if (audioPlayer.src) {
            audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();
        }
    }
    
    async function playNext() {
        const playlist = await dbHelper.getPlaylistSongs();
        if (playlist.length < 1) return;
        playlist.reverse();
        let currentIndex = -1;
        if (currentPlayingSongData && !currentPlayingSongData.isLocal) {
            currentIndex = playlist.findIndex(song => song.trackId === currentPlayingSongData.trackId && song.source === currentPlayingSongData.source);
        }
        const nextIndex = (currentIndex + 1) % playlist.length;
        if (playlist[nextIndex]) {
            playSong(playlist[nextIndex], true, false);
        }
    }

    async function playPrevious() {
        const playlist = await dbHelper.getPlaylistSongs();
        if (playlist.length < 1) return;
        playlist.reverse();
        let currentIndex = 0;
        if (currentPlayingSongData && !currentPlayingSongData.isLocal) {
            currentIndex = playlist.findIndex(song => song.trackId === currentPlayingSongData.trackId && song.source === currentPlayingSongData.source);
        }
        if (currentIndex === -1) currentIndex = 0;
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        if (playlist[prevIndex]) {
            playSong(playlist[prevIndex], true, false);
        }
    }

    function seek(e, progressBarElement) {
        if (!audioPlayer.duration) return;
        const rect = progressBarElement.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = audioPlayer.duration * percentage;
    }

    fpLyricsContainer.addEventListener('scroll', () => {
        userScrollingLyrics = true;
        clearTimeout(lyricScrollTimeout);
        lyricScrollTimeout = setTimeout(() => {
            userScrollingLyrics = false;
        }, 3000);
    });

    searchForm.addEventListener('submit', (e) => { e.preventDefault(); currentPage = 1; performSearch(); });
    prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; performSearch(); } });
    nextPageBtn.addEventListener('click', () => { currentPage++; performSearch(); });
    document.getElementById('quality-select').addEventListener('change', () => { if (currentPlayingSongData && !currentPlayingSongData.isLocal) playSong(currentPlayingSongData, !audioPlayer.paused, true); });
    fpDownloadBtn.addEventListener('click', () => { if(currentPlayingSongData && !currentPlayingSongData.isLocal) downloadSong(currentPlayingSongData); });
    fpFavoriteBtn.addEventListener('click', () => { if(currentPlayingSongData) toggleFavorite(currentPlayingSongData); });
    playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlayPause(); });

fpExternalLinkBtn.addEventListener('click', () => {
    if (currentPlayingSongData && currentPlayingSongData.isLocal) {
        alert('本地歌曲不支持此功能。');
        return;
    }
    if (!audioPlayer.src) {
        alert('当前没有正在播放的歌曲。');
        return;
    }

    isNativePlayerMode = !isNativePlayerMode;

    if (isNativePlayerMode) {
        fpInteractiveControls.innerHTML = '';
        
        audioPlayer.controls = true;
        audioPlayer.classList.add('native-visible-player');
        fpInteractiveControls.appendChild(audioPlayer);

        fpExternalLinkBtn.textContent = '恢复';

    } else {
        fpInteractiveControls.innerHTML = '';

        fpInteractiveControls.appendChild(fpProgressContainer);
        fpInteractiveControls.appendChild(fpPlaybackControls);
        
        audioPlayer.controls = false;
        audioPlayer.classList.remove('native-visible-player');
        document.body.appendChild(audioPlayer);
        
        fpExternalLinkBtn.textContent = '外链';
    }
});


    fpPlayPauseBtn.addEventListener('click', togglePlayPause);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateProgress);
    audioPlayer.addEventListener('play', () => {
        playPauseIcon.innerHTML = `<path d="${pauseIconPath}"></path>`;
        fpPlayPauseIcon.innerHTML = `<path d="${pauseIconPath}"></path>`;
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    audioPlayer.addEventListener('pause', () => {
        playPauseIcon.innerHTML = `<path d="${playIconPath}"></path>`;
        fpPlayPauseIcon.innerHTML = `<path d="${playIconPath}"></path>`;
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    audioPlayer.addEventListener('ended', async () => {
        playPauseIcon.innerHTML = `<path d="${playIconPath}"></path>`;
        fpPlayPauseIcon.innerHTML = `<path d="${playIconPath}"></path>`;

        if (currentPlayingSongData && !currentPlayingSongData.isLocal) {
            const playlist = await dbHelper.getPlaylistSongs();
            if (playlist.length > 1) {
                playNext();
            }
        }
    });
    progressBar.addEventListener('click', (e) => seek(e, progressBar));
    fpProgressBar.addEventListener('click', (e) => seek(e, fpProgressBar));
    playerBar.addEventListener('click', (e) => { if (!e.target.closest('.control-buttons, .progress-bar, .player-extras')) fullscreenPlayer.classList.add('visible'); });
    fpCloseBtn.addEventListener('click', () => fullscreenPlayer.classList.remove('visible'));
    navDiscover.addEventListener('click', () => switchView('discover'));
    navFavorites.addEventListener('click', () => switchView('favorites'));
    navLocal.addEventListener('click', () => switchView('local'));
    navSettings.addEventListener('click', () => switchView('settings'));
    importSongsBtn.addEventListener('click', importSongs);
    togglePlaylistBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlaylistPanel(); });
    fpTogglePlaylistBtn.addEventListener('click', togglePlaylistPanel);
    playlistCloseBtn.addEventListener('click', togglePlaylistPanel);
    playlistOverlay.addEventListener('click', (e) => { if (e.target === playlistOverlay) togglePlaylistPanel(); });
    
    prevBtns.forEach(btn => btn.addEventListener('click', playPrevious));
    nextBtns.forEach(btn => btn.addEventListener('click', playNext));

    function setupMediaSessionHandlers() {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.setActionHandler('play', togglePlayPause);
        navigator.mediaSession.setActionHandler('pause', togglePlayPause);
        navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }

/**
 * 导出收藏列表为 JSON 文件
 */
async function exportFavorites() {
    try {
        const songs = await dbHelper.getFavoriteSongs();
        if (songs.length === 0) {
            alert('您的收藏列表是空的，无需导出。');
            return;
        }

        // 移除数据库内部的 id，导出纯净的歌曲数据
        const exportData = songs.map(({ id, ...rest }) => rest);

        const jsonString = JSON.stringify(exportData, null, 2); // 格式化JSON，方便阅读
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0]; // 获取 YYYY-MM-DD
        a.download = `open-music-favorites-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('导出收藏失败:', error);
        alert('导出失败，请查看控制台获取更多信息。');
    }
}

function handleFavoritesImport(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const songsToImport = JSON.parse(e.target.result);
            if (!Array.isArray(songsToImport)) {
                throw new Error('JSON 文件格式不正确，需要是一个数组。');
            }

            const existingFavorites = await dbHelper.getFavoriteSongs();
            let newSongsCount = 0;
            let skippedCount = 0;

            for (const song of songsToImport) {
                if (!song.trackId || !song.source || !song.name) {
                    console.warn('跳过一条不完整的歌曲数据:', song);
                    continue;
                }

                const isDuplicate = existingFavorites.some(
                    fav => fav.trackId === song.trackId && fav.source === song.source
                );

                if (!isDuplicate) {
                    await dbHelper.addSongToFavorites(song);
                    newSongsCount++;
                } else {
                    skippedCount++;
                }
            }
            
            alert(`导入完成！\n成功添加 ${newSongsCount} 首新歌曲。\n跳过 ${skippedCount} 首已存在的歌曲。`);
            renderFavoritesList(); 

        } catch (error) {
            console.error('导入收藏失败:', error);
            alert(`导入失败：${error.message}`);
        } finally {
            favoritesImporter.value = '';
        }
    };
    reader.readAsText(file);
}

exportFavoritesBtn.addEventListener('click', exportFavorites);
importFavoritesBtn.addEventListener('click', () => favoritesImporter.click());
favoritesImporter.addEventListener('change', handleFavoritesImport);

    
    dbHelper.init().then(() => {
        setupCustomControls();
        setupMediaSessionHandlers();
        renderLocalSongsList();
    }).catch(err => console.error(err));
});
