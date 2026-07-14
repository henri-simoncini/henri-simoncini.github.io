(() => {
  // ============================================
  // Presença em tempo real via Lanyard (Discord)
  //
  // COMO ATIVAR:
  // 1. Entre no servidor Discord do Lanyard: https://discord.gg/lanyard
  //    (é só entrar — o bot passa a monitorar sua presença)
  // 2. No Discord: Configurações → Avançado → ative "Modo desenvolvedor"
  // 3. Clique com o botão direito no seu nome → "Copiar ID do usuário"
  // 4. Cole o ID na constante abaixo:
  // ============================================
  const DISCORD_USER_ID = '542359265923301386'; // ex: '123456789012345678'
  const POLL_INTERVAL_MS = 20000;

  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('profile-status');
  const noteEl = document.getElementById('profile-note');
  const activitiesEl = document.getElementById('profile-activities');

  const STATUS_MAP = {
    online: { label: 'Online agora', color: '#23a55a' },
    idle: { label: 'Ausente', color: '#f0b232' },
    dnd: { label: 'Não perturbe', color: '#f23f43' },
    offline: { label: 'Offline', color: '#80848e' },
  };

  function setStatus(key) {
    const s = STATUS_MAP[key] || STATUS_MAP.offline;
    statusDot.style.background = s.color;
    statusDot.title = s.label;
    statusText.textContent = s.label;
    statusDot.classList.toggle('pulse', key === 'online');
  }

  // Perfil da Steam para o "Juntar-se à partida"
  const STEAM_URL = 'https://steamcommunity.com/profiles/76561198886933280/';

  function activityRow(icon, label, detail, imgUrl, action) {
    const row = document.createElement('div');
    row.className = 'activity-row';

    if (imgUrl) {
      const img = document.createElement('img');
      img.className = 'activity-img';
      img.src = imgUrl;
      img.alt = '';
      row.appendChild(img);
    } else {
      const ic = document.createElement('span');
      ic.className = 'activity-icon';
      ic.textContent = icon;
      row.appendChild(ic);
    }

    const text = document.createElement('div');
    text.className = 'activity-text';

    const l = document.createElement('span');
    l.className = 'activity-label';
    l.textContent = label;
    text.appendChild(l);

    if (detail) {
      const d = document.createElement('span');
      d.className = 'activity-detail';
      d.textContent = detail;
      text.appendChild(d);
    }

    row.appendChild(text);

    // Ação revelada no hover (no toque, o clique vai direto)
    if (action) {
      const a = document.createElement('a');
      a.className = 'activity-action';
      a.href = action.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = action.label;
      row.appendChild(a);
    }

    return row;
  }

  function render(data) {
    setStatus(data.discord_status);

    // Nota (status personalizado do Discord)
    const custom = (data.activities || []).find((a) => a.type === 4);
    if (custom && (custom.state || custom.emoji)) {
      const emoji = custom.emoji && custom.emoji.name && !custom.emoji.id ? `${custom.emoji.name} ` : '';
      noteEl.textContent = `💭 ${emoji}${custom.state || ''}`.trim();
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }

    activitiesEl.innerHTML = '';

    // Ouvindo Spotify → "Ouvir junto" abre a mesma faixa
    if (data.listening_to_spotify && data.spotify) {
      const trackUrl = data.spotify.track_id
        ? `https://open.spotify.com/track/${data.spotify.track_id}`
        : null;
      activitiesEl.appendChild(activityRow(
        '🎵',
        `Ouvindo: ${data.spotify.song}`,
        `${data.spotify.artist}`,
        data.spotify.album_art_url,
        trackUrl ? { href: trackUrl, label: '🎧 Ouvir junto' } : null
      ));
    }

    // Jogando / Programando (type 0 = playing)
    (data.activities || [])
      .filter((a) => a.type === 0)
      .forEach((a) => {
        const isCoding = /visual studio code|vs ?code|intellij|pycharm|neovim|sublime/i.test(a.name);
        const detail = [a.details, a.state].filter(Boolean).join(' · ');
        activitiesEl.appendChild(activityRow(
          isCoding ? '💻' : '🎮',
          isCoding ? 'Programando' : `Jogando: ${a.name}`,
          isCoding ? `${a.name}${detail ? ' · ' + detail : ''}` : detail,
          null,
          isCoding ? null : { href: STEAM_URL, label: '🎮 Juntar-se à partida' }
        ));
      });
  }

  async function poll() {
    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
      const json = await res.json();
      if (json.success) render(json.data);
    } catch (e) {
      // API indisponível — mantém o último estado exibido
    }
  }

  if (DISCORD_USER_ID) {
    poll();
    setInterval(poll, POLL_INTERVAL_MS);
  } else {
    // Sem Discord configurado: mostra status estático
    setStatus('online');
  }
})();
