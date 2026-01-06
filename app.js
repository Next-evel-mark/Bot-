// app.js
let bibleData = [];
let currentBookIndex = 0;
let currentChapterIndex = 0;
let deferredPrompt;

// Elements
const dom = {
    loader: document.getElementById('loader'),
    navView: document.getElementById('nav-view'),
    chapterView: document.getElementById('chapter-view'),
    readerView: document.getElementById('reader-view'),
    searchView: document.getElementById('search-view'),
    bookList: document.getElementById('book-list'),
    chapterList: document.getElementById('chapter-list'),
    scriptureText: document.getElementById('scripture-text'),
    readerTitle: document.getElementById('reader-title'),
    selectedBookTitle: document.getElementById('selected-book-title'),
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    await fetchBible();
    setupEventListeners();
    restoreLastRead();
});

// --- Data Fetching ---
async function fetchBible() {
    try {
        // Looking for the file in the root directory
        const response = await fetch('bible.json');
        if (!response.ok) throw new Error("Offline/File missing");
        bibleData = await response.json();
        dom.loader.classList.add('hidden');
        renderBooks('OT');
        dom.navView.classList.remove('hidden');
    } catch (e) {
        dom.loader.textContent = "Error loading Bible. Please ensure bible.json is present.";
        showToast("You are reading offline");
    }
}

// --- Navigation Logic ---
function renderBooks(testament) {
    dom.bookList.innerHTML = '';
    const startIndex = testament === 'OT' ? 0 : 39;
    const endIndex = testament === 'OT' ? 39 : 66;

    for (let i = startIndex; i < endIndex; i++) {
        if(!bibleData[i]) continue;
        const btn = document.createElement('div');
        btn.className = 'list-item';
        btn.textContent = bibleData[i].name;
        btn.onclick = () => openBook(i);
        dom.bookList.appendChild(btn);
    }
}

function openBook(index) {
    currentBookIndex = index;
    dom.navView.classList.add('hidden');
    dom.chapterView.classList.remove('hidden');
    dom.selectedBookTitle.textContent = bibleData[index].name;
    
    dom.chapterList.innerHTML = '';
    bibleData[index].chapters.forEach((_, i) => {
        const btn = document.createElement('div');
        btn.className = 'list-item';
        btn.textContent = i + 1;
        btn.onclick = () => openChapter(index, i);
        dom.chapterList.appendChild(btn);
    });
}

function openChapter(bookIdx, chapterIdx) {
    currentBookIndex = bookIdx;
    currentChapterIndex = chapterIdx;
    
    // Save position
    localStorage.setItem('ministerMark_last', JSON.stringify({book: bookIdx, chapter: chapterIdx}));

    dom.chapterView.classList.add('hidden');
    dom.searchView.classList.add('hidden');
    dom.readerView.classList.remove('hidden');
    
    const book = bibleData[bookIdx];
    const chapter = book.chapters[chapterIdx];
    
    dom.readerTitle.textContent = `${book.name} ${chapterIdx + 1}`;
    dom.scriptureText.innerHTML = '';

    chapter.forEach((text, verseIdx) => {
        const vNum = verseIdx + 1;
        const span = document.createElement('span');
        span.className = 'verse';
        span.innerHTML = `<sup class="verse-num">${vNum}</sup> ${text}`;
        
        // Handle Highlights
        const highlightKey = `hl_${bookIdx}_${chapterIdx}_${verseIdx}`;
        if(localStorage.getItem(highlightKey)) span.classList.add('highlighted');

        span.onclick = () => toggleHighlight(span, highlightKey);
        dom.scriptureText.appendChild(span);
    });

    window.scrollTo(0,0);
}

// --- Features ---
function toggleHighlight(element, key) {
    element.classList.toggle('highlighted');
    if(element.classList.contains('highlighted')) {
        localStorage.setItem(key, 'true');
    } else {
        localStorage.removeItem(key);
    }
}

function searchBible(query) {
    if(query.length < 3) return;
    dom.searchResults.innerHTML = '<p>Searching...</p>';
    const results = [];
    const lowerQ = query.toLowerCase();

    // Simple client-side search (limit to 50 results for performance)
    let count = 0;
    
    outer: for(let b=0; b<bibleData.length; b++) {
        for(let c=0; c<bibleData[b].chapters.length; c++) {
            for(let v=0; v<bibleData[b].chapters[c].length; v++) {
                if(bibleData[b].chapters[c][v].toLowerCase().includes(lowerQ)) {
                    results.push({
                        ref: `${bibleData[b].name} ${c+1}:${v+1}`,
                        text: bibleData[b].chapters[c][v],
                        b, c
                    });
                    count++;
                    if(count >= 50) break outer;
                }
            }
        }
    }

    dom.searchResults.innerHTML = '';
    if(results.length === 0) dom.searchResults.innerHTML = '<p>No matches found.</p>';
    
    results.forEach(res => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.textAlign = 'left';
        div.innerHTML = `<strong>${res.ref}</strong><br>${res.text}`;
        div.onclick = () => openChapter(res.b, res.c);
        dom.searchResults.appendChild(div);
    });
}

// --- Settings & Utils ---
function loadSettings() {
    const theme = localStorage.getItem('theme');
    if(theme === 'dark') document.body.setAttribute('data-theme', 'dark');
    
    const size = localStorage.getItem('fontSize') || '18px';
    dom.scriptureText.style.fontSize = size;
}

function restoreLastRead() {
    const last = JSON.parse(localStorage.getItem('ministerMark_last'));
    if(last && bibleData.length > 0) {
        // Optional: show a "Continue Reading" button, but here we just wait for user interaction
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// --- Event Listeners ---
function setupEventListeners() {
    // Tabs
    document.getElementById('tab-ot').onclick = (e) => {
        document.querySelectorAll('.tab-header button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderBooks('OT');
    };
    document.getElementById('tab-nt').onclick = (e) => {
        document.querySelectorAll('.tab-header button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderBooks('NT');
    };

    // View Navigation
    document.querySelector('.back-btn').onclick = () => {
        dom.chapterView.classList.add('hidden');
        dom.navView.classList.remove('hidden');
    };
    document.querySelector('.back-to-chapters').onclick = () => {
        dom.readerView.classList.add('hidden');
        dom.chapterView.classList.remove('hidden');
    };

    // Reader Nav
    document.getElementById('prev-chap').onclick = () => {
        if(currentChapterIndex > 0) openChapter(currentBookIndex, currentChapterIndex - 1);
    };
    document.getElementById('next-chap').onclick = () => {
        const totalChaps = bibleData[currentBookIndex].chapters.length;
        if(currentChapterIndex < totalChaps - 1) openChapter(currentBookIndex, currentChapterIndex + 1);
    };

    // Search
    document.getElementById('search-toggle').onclick = () => {
        dom.navView.classList.add('hidden');
        dom.chapterView.classList.add('hidden');
        dom.readerView.classList.add('hidden');
        dom.searchView.classList.remove('hidden');
    };
    document.getElementById('close-search').onclick = () => {
        dom.searchView.classList.add('hidden');
        dom.navView.classList.remove('hidden');
    };
    document.getElementById('search-input').addEventListener('keyup', (e) => {
        if(e.key === 'Enter') searchBible(e.target.value);
    });

    // Theme & Font
    document.getElementById('theme-toggle').onclick = () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };
    
    document.getElementById('font-increase').onclick = () => {
        const current = parseInt(window.getComputedStyle(dom.scriptureText).fontSize);
        const newSize = (current + 2) + 'px';
        dom.scriptureText.style.fontSize = newSize;
        localStorage.setItem('fontSize', newSize);
    };
    
    document.getElementById('font-decrease').onclick = () => {
        const current = parseInt(window.getComputedStyle(dom.scriptureText).fontSize);
        const newSize = (current - 2) + 'px';
        dom.scriptureText.style.fontSize = newSize;
        localStorage.setItem('fontSize', newSize);
    };
}

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(() => console.log('Service Worker Registered'));
}

// --- PWA Install Prompt ---
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-btn');
    btn.classList.remove('hidden');
    
    btn.addEventListener('click', () => {
        btn.classList.add('hidden');
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
                console.log('User accepted install');
            }
            deferredPrompt = null;
        });
    });
});
