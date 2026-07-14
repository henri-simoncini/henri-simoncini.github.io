(() => {
  // ============================================
  // Sons de interface (WebAudio)
  // ============================================
  const CLICK_SRC = 'assets/sounds/click.mp3';
  const TYPE_SRC = 'assets/sounds/type.mp3';
  // Posições (em segundos) das batidas de tecla dentro de type.mp3,
  // detectadas por análise de amplitude — cada digitação toca uma delas.
  const TYPE_HITS = [
    0.86, 0.99, 1.65, 1.89, 2.03, 2.16, 2.55, 2.67, 2.9, 3.4, 3.58, 3.72,
    4.1, 4.31, 4.49, 4.6, 4.75, 5.08, 5.24, 5.36, 5.61, 6.73, 7.12, 7.26,
  ];
  const TYPE_SLICE_DURATION = 0.09;

  let audioCtx = null;
  let clickBuffer = null;
  let typeBuffer = null;
  let clickFallback = null;

  function initSounds() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const load = (url) => fetch(url)
        .then((r) => r.arrayBuffer())
        .then((b) => audioCtx.decodeAudioData(b));
      load(CLICK_SRC).then((buf) => { clickBuffer = buf; }).catch(() => { clickFallback = makeFallback(); });
      load(TYPE_SRC).then((buf) => { typeBuffer = buf; }).catch(() => {});
    } catch (e) {
      clickFallback = makeFallback();
    }
  }

  function makeFallback() {
    const a = new Audio(CLICK_SRC);
    a.preload = 'auto';
    a.volume = 0.6;
    return a;
  }

  function playBufferSlice(buffer, offset, duration, volume) {
    if (!buffer || !audioCtx) return false;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(audioCtx.destination);
    if (duration) {
      src.start(0, offset, duration);
    } else {
      src.start(0);
    }
    return true;
  }

  function playClick() {
    if (!playBufferSlice(clickBuffer, 0, null, 0.6) && clickFallback) {
      clickFallback.currentTime = 0;
      clickFallback.play().catch(() => {});
    }
  }

  function playType() {
    const hit = TYPE_HITS[Math.floor(Math.random() * TYPE_HITS.length)];
    playBufferSlice(typeBuffer, Math.max(0, hit - 0.005), TYPE_SLICE_DURATION, 0.55);
  }

  initSounds();

  const CLICKABLE = [
    '.file-label', '.folder-label', '.menu-item', '.tb-btn', '.tag-link',
    '.fv-link', '.hamburger', '.mp-btn', '.vinyl-btn', '.mp-progress',
    '.dd-item', '.swatch', '.toast', '.intro-box', '.g-item', '.lb-btn',
  ].join(',');

  document.addEventListener('click', (e) => {
    if (e.target.closest(CLICKABLE)) playClick();
  });

  // ============================================
  // Elementos base
  // ============================================
  const explorerWindow = document.getElementById('explorer-window');
  const tree = document.getElementById('tree');
  const pathText = document.getElementById('path-text');
  const statusPath = document.getElementById('status-path');
  const statusCount = document.getElementById('status-count');
  const searchBox = document.getElementById('search-box');
  const sidebar = document.getElementById('sidebar');

  const folders = [...tree.querySelectorAll('.folder')];
  const files = [...tree.querySelectorAll('.file')];

  statusCount.textContent = `${folders.length} pastas, ${files.length} arquivos`;

  // ============================================
  // Árvore de pastas
  // ============================================
  folders.forEach((folder) => {
    const label = folder.querySelector(':scope > .folder-label');
    const icon = label.querySelector('.folder-icon use');

    label.addEventListener('click', () => {
      const isOpen = folder.classList.toggle('open');
      icon.setAttribute('href', isOpen ? 'assets/icons.svg#icon-folder-open' : 'assets/icons.svg#icon-folder');
    });
  });

  files.forEach((fileEl) => {
    fileEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openFile(fileEl);

      if (window.matchMedia('(max-width: 768px)').matches) {
        sidebar.classList.remove('drawer-open');
      }
    });
  });

  function setPath(path) {
    pathText.textContent = path;
    statusPath.textContent = path;
  }

  function showView(targetId) {
    document.querySelectorAll('.file-view').forEach((view) => {
      view.classList.toggle('active', view.dataset.file === targetId);
    });
    const active = document.querySelector(`.file-view[data-file="${targetId}"]`);
    if (active) animateTitle(active);
  }

  function openFile(fileEl) {
    files.forEach((f) => f.classList.remove('active'));
    fileEl.classList.add('active');
    showView(fileEl.dataset.target);
    setPath(fileEl.dataset.path || '');
  }

  // ============================================
  // Busca
  // ============================================
  searchBox.addEventListener('keydown', (e) => {
    // Ignora teclas modificadoras/navegação — só soa quando digita de fato
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter' || e.key === ' ') {
      playType();
    }
  });

  searchBox.addEventListener('input', () => {
    const query = searchBox.value.trim().toLowerCase();

    files.forEach((fileEl) => {
      const name = fileEl.querySelector('.file-name').textContent.toLowerCase();
      const matches = query === '' || name.includes(query);
      fileEl.classList.toggle('tree-hidden', !matches);
    });

    folders.forEach((folder) => {
      const visibleChildren = [...folder.querySelectorAll('.file')].some(
        (f) => !f.classList.contains('tree-hidden')
      );
      folder.classList.toggle('tree-hidden', !visibleChildren && query !== '');
      if (query !== '' && visibleChildren) {
        folder.classList.add('open');
        const icon = folder.querySelector(':scope > .folder-label .folder-icon use');
        icon.setAttribute('href', 'assets/icons.svg#icon-folder-open');
      }
    });
  });

  // ============================================
  // Dropdowns do menu
  // ============================================
  const menuPairs = [
    ['menu-edit', 'dropdown-edit'],
    ['menu-view', 'dropdown-view'],
    ['menu-favorites', 'dropdown-favorites'],
    ['menu-tools', 'dropdown-tools'],
  ];

  function closeAllDropdowns() {
    menuPairs.forEach(([itemId, ddId]) => {
      document.getElementById(itemId).classList.remove('open-menu');
      document.getElementById(ddId).classList.remove('open');
    });
  }

  menuPairs.forEach(([itemId, ddId]) => {
    const item = document.getElementById(itemId);
    const dd = document.getElementById(ddId);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) {
        item.classList.add('open-menu');
        dd.classList.add('open');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.menu-dropdown')) closeAllDropdowns();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  // ============================================
  // File — tela de apresentação (typewriter)
  // ============================================
  const INTRO_TEXT_1 = 'Este site foi criado para apresentar os projetos de um jovem técnico em informática, apaixonado por desenvolvimento web, design e tecnologia. Aqui você encontra minha trajetória, minhas habilidades e as coisas que eu mais gosto de construir.';
  const INTRO_TEXT_2 = 'Vamos começar? Clique no botão File na barra superior para iniciar.';
  const TYPE_SPEED_MS = 26;

  const introText1 = document.getElementById('intro-text-1');
  const introText2 = document.getElementById('intro-text-2');
  const introHint = document.getElementById('intro-hint');
  const introBox = document.querySelector('.intro-box');

  let typeToken = 0;

  function typeText(el, text, token, speed = TYPE_SPEED_MS) {
    // Array.from separa por code points — não quebra emojis no meio
    const chars = Array.from(text);
    return new Promise((resolve) => {
      let i = 0;
      el.textContent = '';
      (function step() {
        if (token !== typeToken) return resolve();
        i++;
        el.textContent = chars.slice(0, i).join('');
        if (i % 2 === 0) playType();
        if (i < chars.length) {
          setTimeout(step, speed);
        } else {
          resolve();
        }
      })();
    });
  }

  // Digitação animada do título de cada página aberta
  const TITLE_SPEED_MS = 34;

  function animateTitle(view) {
    const title = view.querySelector('.fv-title');
    if (!title) return;
    if (!title.dataset.fullText) title.dataset.fullText = title.textContent;
    typeText(title, title.dataset.fullText, ++typeToken, TITLE_SPEED_MS);
  }

  async function startIntroTyping() {
    const token = ++typeToken;
    introHint.classList.remove('visible');
    introText1.textContent = '';
    introText2.textContent = '';
    await typeText(introText1, INTRO_TEXT_1, token);
    if (token !== typeToken) return;
    await typeText(introText2, INTRO_TEXT_2, token);
    if (token !== typeToken) return;
    introHint.classList.add('visible');
  }

  // Clique na caixa durante a digitação → completa na hora
  introBox.addEventListener('click', () => {
    if (introText2.textContent !== INTRO_TEXT_2) {
      typeToken++;
      introText1.textContent = INTRO_TEXT_1;
      introText2.textContent = INTRO_TEXT_2;
      introHint.classList.add('visible');
    }
  });

  function enterIntro() {
    explorerWindow.classList.add('intro-mode');
    setPath('C:\\Portfólio\\Apresentação.txt');
    startIntroTyping();
  }

  function leaveIntro() {
    typeToken++;
    explorerWindow.classList.remove('intro-mode');
    const active = tree.querySelector('.file.active');
    setPath(active ? active.dataset.path : 'C:\\Portfólio');
    const activeView = document.querySelector('.file-view.active');
    if (activeView) animateTitle(activeView);
  }

  document.getElementById('menu-file').addEventListener('click', () => {
    closeAllDropdowns();
    if (explorerWindow.classList.contains('intro-mode')) {
      leaveIntro();
    } else {
      enterIntro();
    }
  });

  // Começa no modo intro
  enterIntro();

  // ============================================
  // Cursor pixelado + favicon (seguem a cor principal)
  // ============================================
  const cursorStyle = document.createElement('style');
  document.head.appendChild(cursorStyle);

  const faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/svg+xml';
  document.head.appendChild(faviconLink);

  // Seta estilo Windows clássico, desenhada em pixels
  function pixelArrowSVG(fill, outline) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="M2 1 L2 18 L6 14 L9 21 L12 20 L9 13 L15 13 Z" fill="${fill}" stroke="${outline}" stroke-width="1.6"/></svg>`;
  }

  // Mãozinha clássica do Windows, pixel a pixel
  // ('o' = contorno, '#' = preenchimento, '.' = transparente)
  const HAND_MAP = [
    '.....oo...........',
    '....o##o..........',
    '....o##o..........',
    '....o##o..........',
    '....o##o..........',
    '....o##ooo........',
    '....o##o##ooo.....',
    '....o##o##o##ooo..',
    '....o##o##o##o##o.',
    '.oo.o##o##o##o##o.',
    'o##oo##o##o##o##o.',
    'o###o###########o.',
    '.o##o###########o.',
    '.o##############o.',
    '..o#############o.',
    '..o#############o.',
    '...o############o.',
    '...o############o.',
    '....o###########o.',
    '....ooooooooooooo.',
  ];

  function pixelHandSVG(fill, outline) {
    let rects = '';
    HAND_MAP.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.') { x++; continue; }
        let end = x;
        while (end < row.length && row[end] === c) end++;
        rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${c === 'o' ? outline : fill}"/>`;
        x = end;
      }
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="20" viewBox="0 0 18 20" shape-rendering="crispEdges">${rects}</svg>`;
  }

  // Mesma pasta da barra de título (assets/icons.svg#icon-folder)
  function folderFaviconSVG(accent) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="${accent}" d="M1 3h5l1 1h8v9a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/></svg>`;
  }

  function updateAccentAssets() {
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent').trim();
    const outline = '#05050f';
    const arrow = encodeURIComponent(pixelArrowSVG(accent, outline));
    const hand = encodeURIComponent(pixelHandSVG('#f2f2f2', outline));
    cursorStyle.textContent = `
      * { cursor: url("data:image/svg+xml,${arrow}") 2 1, auto; }
      a, button, .file-label, .folder-label, .menu-item, .tag-link, .fv-link,
      .dd-item, .swatch, .toast, .g-item, .lb-btn, .mp-progress, .mp-volume,
      .intro-box { cursor: url("data:image/svg+xml,${hand}") 6 1, pointer !important; }
      input[type="text"], textarea { cursor: text !important; }
    `;
    faviconLink.href = 'data:image/svg+xml,' + encodeURIComponent(folderFaviconSVG(accent));
  }

  // ============================================
  // Edit — tema e cor principal
  // ============================================
  const ddTheme = document.getElementById('dd-theme');
  const swatches = [...document.querySelectorAll('.swatch')];

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    ddTheme.textContent = theme === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro';
    localStorage.setItem('pf-theme', theme);
    updateAccentAssets();
  }

  function applyAccent(accent) {
    document.documentElement.setAttribute('data-accent', accent);
    swatches.forEach((s) => s.classList.toggle('active', s.dataset.accent === accent));
    localStorage.setItem('pf-accent', accent);
    updateAccentAssets();
  }

  ddTheme.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  swatches.forEach((s) => {
    s.addEventListener('click', () => applyAccent(s.dataset.accent));
  });

  applyTheme(localStorage.getItem('pf-theme') || 'dark');
  applyAccent(localStorage.getItem('pf-accent') || 'ciano');

  // ============================================
  // View — visualizar GitHub
  // ============================================
  document.getElementById('dd-github').addEventListener('click', () => {
    closeAllDropdowns();
    if (explorerWindow.classList.contains('intro-mode')) leaveIntro();
    files.forEach((f) => f.classList.remove('active'));
    showView('github-view');
    setPath('C:\\Portfólio\\GitHub.url');
  });

  // ============================================
  // Tools — habilitar/desabilitar player
  // ============================================
  const ddPlayerToggle = document.getElementById('dd-player-toggle');

  function syncPlayerToggleLabel() {
    const enabled = !document.body.classList.contains('player-disabled');
    ddPlayerToggle.textContent = enabled
      ? '🎵 Desabilitar player de música'
      : '🎵 Habilitar player de música';
  }

  ddPlayerToggle.addEventListener('click', () => {
    if (window.lofiPlayer) {
      window.lofiPlayer.toggleEnabled();
    }
    syncPlayerToggleLabel();
    closeAllDropdowns();
  });

  // Sincroniza o rótulo quando o player carrega o estado salvo
  window.addEventListener('lofi-player-ready', syncPlayerToggleLabel);

  // ============================================
  // Menu hamburger (mobile)
  // ============================================
  document.getElementById('btn-hamburger').addEventListener('click', () => {
    sidebar.classList.toggle('drawer-open');
  });

  // ============================================
  // Modal "Sobre este site"
  // ============================================
  const modalOverlay = document.getElementById('modal-overlay');
  document.getElementById('menu-help').addEventListener('click', () => {
    closeAllDropdowns();
    modalOverlay.classList.add('open');
  });
  document.getElementById('modal-close').addEventListener('click', () => {
    modalOverlay.classList.remove('open');
  });
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modalOverlay.classList.remove('open');
  });

  // ============================================
  // Galeria — tela cheia (lightbox)
  // ============================================
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCaption = document.getElementById('lb-caption');
  const lbCaptionToggle = document.getElementById('lb-caption-toggle');
  const galleryFigures = [...document.querySelectorAll('.gallery .g-item')];
  const galleryData = galleryFigures.map((f) => ({
    src: f.querySelector('img').getAttribute('src'),
    alt: f.querySelector('img').getAttribute('alt') || '',
    caption: (f.querySelector('figcaption') || {}).textContent || '',
  }));
  let lbIndex = 0;

  function lbShow(index, direction = 0) {
    lbIndex = (index + galleryData.length) % galleryData.length;
    const item = galleryData[lbIndex];
    lbImg.src = item.src;
    lbImg.alt = item.alt;
    lbCaption.textContent = item.caption;
    if (direction !== 0) {
      lbImg.classList.remove('lb-anim-next', 'lb-anim-prev');
      void lbImg.offsetWidth; // reinicia a animação
      lbImg.classList.add(direction > 0 ? 'lb-anim-next' : 'lb-anim-prev');
    }
  }

  function lbSetCaptionVisible(visible) {
    lightbox.classList.toggle('show-caption', visible);
    lbCaptionToggle.innerHTML = visible ? '&#9660;' : '&#9650;';
    lbCaptionToggle.title = visible ? 'Esconder legenda' : 'Mostrar legenda';
  }

  function lbOpen(index) {
    lbSetCaptionVisible(false);
    lbShow(index);
    lightbox.classList.add('open');
  }

  function lbClose() {
    lightbox.classList.remove('open');
  }

  galleryFigures.forEach((f, i) => {
    f.addEventListener('click', () => lbOpen(i));
  });

  document.getElementById('lb-close').addEventListener('click', lbClose);
  document.getElementById('lb-next').addEventListener('click', () => lbShow(lbIndex + 1, 1));
  document.getElementById('lb-prev').addEventListener('click', () => lbShow(lbIndex - 1, -1));
  lbCaptionToggle.addEventListener('click', () => {
    lbSetCaptionVisible(!lightbox.classList.contains('show-caption'));
  });

  // Clique no fundo escuro fecha
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lbClose();
  });

  // Teclado: setas navegam, Esc fecha
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowRight') lbShow(lbIndex + 1, 1);
    if (e.key === 'ArrowLeft') lbShow(lbIndex - 1, -1);
  });

  // ============================================
  // Formulário de contato → WhatsApp
  // ============================================
  const contactForm = document.getElementById('contact-form');
  const WHATSAPP_NUMBER = '5522981600830';

  ['cf-name', 'cf-subject', 'cf-message'].forEach((id) => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter') {
        playType();
      }
    });
  });

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cf-name').value.trim();
    const subject = document.getElementById('cf-subject').value.trim();
    const message = document.getElementById('cf-message').value.trim();
    const text = `Olá, Henrique! Eu me chamo ${name} e vim falar a respeito de ${subject}. ${message}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  // ============================================
  // Botões da barra de título
  // ============================================
  document.getElementById('btn-maximize').addEventListener('click', () => {
    explorerWindow.classList.toggle('is-maximized');
  });

  document.getElementById('btn-minimize').addEventListener('click', () => {
    const mainArea = document.querySelector('.main-area');
    const statusBar = document.querySelector('.status-bar');
    const minimized = explorerWindow.classList.toggle('is-minimized');
    mainArea.style.display = minimized ? 'none' : 'flex';
    statusBar.style.display = minimized ? 'none' : 'flex';
  });

  document.getElementById('btn-close').addEventListener('click', () => {
    explorerWindow.classList.remove('is-shake');
    void explorerWindow.offsetWidth;
    explorerWindow.classList.add('is-shake');
  });
})();
