(() => {
  // ============================================
  // Playlist — edite aqui suas músicas.
  // Coloque os arquivos .mp3 em assets/music/
  // e ajuste título, artista e capa de cada faixa.
  // ============================================
  const PLAYLIST = [
    {
      title: 'could i be your girl',
      artist: 'eevee',
      src: 'assets/music/track-01.mp3',
      cover: 'assets/covers/cover-04.svg',
    },
    {
      title: 'Dontyouknow',
      artist: 'Sebastian Kamae, Aylior',
      src: 'assets/music/track-02.mp3',
      cover: 'assets/covers/cover-03.svg',
    },
    {
      title: 'Take you there',
      artist: 'Huey Daze',
      src: 'assets/music/track-03.mp3',
      cover: 'assets/covers/cover-02.svg',
    },
    {
      title: 'Birds',
      artist: 'wünsche',
      src: 'assets/music/track-04.mp3',
      cover: 'assets/covers/cover-06.svg',
    },
    {
      title: 'Song of the Samurai',
      artist: 'Elijah Nang',
      src: 'assets/music/track-05.mp3',
      cover: 'assets/covers/cover-07.svg',
    },
  ];

  const audio = new Audio();
  audio.preload = 'metadata';

  let current = 0;
  let isPlaying = false;

  const player = document.getElementById('music-player');
  const vinylBtn = document.getElementById('vinyl-btn');
  const vinylIcon = vinylBtn.querySelector('.vinyl-icon');
  const btnPlay = document.getElementById('mp-play');
  const btnPrev = document.getElementById('mp-prev');
  const btnNext = document.getElementById('mp-next');
  const btnMinimize = document.getElementById('mp-minimize');
  const elCover = document.getElementById('mp-cover');
  const elTrack = document.getElementById('mp-track');
  const elArtist = document.getElementById('mp-artist');
  const elCurrent = document.getElementById('mp-current');
  const elDuration = document.getElementById('mp-duration');
  const progress = document.getElementById('mp-progress');
  const progressFill = document.getElementById('mp-progress-fill');
  const volumeSlider = document.getElementById('mp-volume');
  const toast = document.getElementById('toast');
  const toastCover = document.getElementById('toast-cover');
  const toastTrack = document.getElementById('toast-track');

  let toastTimer = null;

  function formatTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function loadTrack(index) {
    current = (index + PLAYLIST.length) % PLAYLIST.length;
    const t = PLAYLIST[current];
    audio.src = t.src;
    elCover.src = t.cover;
    elTrack.textContent = t.title;
    elArtist.textContent = t.artist;
    elCurrent.textContent = '0:00';
    elDuration.textContent = '0:00';
    progressFill.style.width = '0%';
  }

  function play({ notify = false } = {}) {
    return audio.play().then(() => {
      isPlaying = true;
      btnPlay.innerHTML = '&#10074;&#10074;';
      vinylIcon.classList.add('spinning-fast');
      if (notify) showToast();
      return true;
    }).catch((err) => {
      if (err && err.name === 'NotAllowedError') {
        // Autoplay bloqueado — espera o primeiro gesto do usuário
        return false;
      }
      showMissingFile();
      return false;
    });
  }

  function pause() {
    audio.pause();
    isPlaying = false;
    btnPlay.innerHTML = '&#9654;';
    vinylIcon.classList.remove('spinning-fast');
  }

  function showMissingFile() {
    isPlaying = false;
    btnPlay.innerHTML = '&#9654;';
    elArtist.textContent = 'adicione MP3s em assets/music/';
  }

  function showToast() {
    const t = PLAYLIST[current];
    toastCover.src = t.cover;
    toastTrack.textContent = `${t.title} — ${t.artist}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  function changeTrack(index) {
    const wasPlaying = isPlaying;
    loadTrack(index);
    if (wasPlaying) play({ notify: true });
  }

  // ---------- Controles ----------
  btnPlay.addEventListener('click', () => (isPlaying ? pause() : play()));
  btnNext.addEventListener('click', () => changeTrack(current + 1));
  btnPrev.addEventListener('click', () => changeTrack(current - 1));

  // Fim da música → próxima + notificação
  audio.addEventListener('ended', () => {
    loadTrack(current + 1);
    play({ notify: true });
  });

  audio.addEventListener('error', showMissingFile);

  audio.addEventListener('loadedmetadata', () => {
    elDuration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    elCurrent.textContent = formatTime(audio.currentTime);
    if (audio.duration) {
      progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    }
  });

  // Clique na barra de progresso → seek
  progress.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = progress.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  // ---------- Volume ----------
  const savedVolume = parseFloat(localStorage.getItem('pf-volume'));
  const initialVolume = isFinite(savedVolume) ? savedVolume : 0.7;
  audio.volume = initialVolume;
  volumeSlider.value = Math.round(initialVolume * 100);

  volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
    localStorage.setItem('pf-volume', audio.volume);
  });

  // ---------- Minimizar / maximizar ----------
  btnMinimize.addEventListener('click', () => {
    player.classList.add('minimized');
  });

  vinylBtn.addEventListener('click', () => {
    player.classList.toggle('minimized');
  });

  // Clique na notificação → abre o player
  toast.addEventListener('click', () => {
    toast.classList.remove('show');
    clearTimeout(toastTimer);
    player.classList.remove('minimized');
  });

  // ---------- Habilitar/desabilitar (Tools) ----------
  function setEnabled(enabled) {
    document.body.classList.toggle('player-disabled', !enabled);
    localStorage.setItem('pf-player', enabled ? 'on' : 'off');
    if (!enabled) {
      pause();
      player.classList.add('minimized');
      toast.classList.remove('show');
    }
  }

  window.lofiPlayer = {
    isEnabled: () => !document.body.classList.contains('player-disabled'),
    toggleEnabled() {
      const next = !this.isEnabled();
      setEnabled(next);
      if (next) play({ notify: true });
    },
  };

  // ---------- Inicialização + autoplay ----------
  loadTrack(0);

  const startEnabled = localStorage.getItem('pf-player') !== 'off';
  document.body.classList.toggle('player-disabled', !startEnabled);
  window.dispatchEvent(new Event('lofi-player-ready'));

  if (startEnabled) {
    play({ notify: true }).then((started) => {
      if (started) return;
      // Autoplay bloqueado pelo navegador: começa no primeiro clique/tecla
      const startOnGesture = () => {
        if (!window.lofiPlayer.isEnabled() || isPlaying) return;
        play({ notify: true });
      };
      document.addEventListener('pointerdown', startOnGesture, { once: true });
      document.addEventListener('keydown', startOnGesture, { once: true });
    });
  }
})();
