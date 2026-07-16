(() => {
  // ============================================
  // Presença em tempo real via Lanyard (Discord)
  //
  // Tempo real de verdade: WebSocket do Lanyard com heartbeat e
  // reconexão automática. Se o WebSocket falhar, cai para REST
  // (polling) e continua tentando reconectar o socket.
  //
  // Status manual quando o PC estiver desligado (Lanyard KV):
  // 1. No Discord, mande DM para o bot Lanyard: .apikey
  // 2. Defina a chave "status":
  //    PUT https://api.lanyard.rest/v1/users/SEU_ID/kv/status
  //    header Authorization: SUA_APIKEY, corpo = o texto do status
  // 3. Quando você estiver offline, o site mostra esse texto.
  // ============================================
  const DISCORD_USER_ID = '542359265923301386';
  const REST_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
  const WS_URL = 'wss://api.lanyard.rest/socket';
  const POLL_INTERVAL_MS = 30000;
  const WS_CONNECT_TIMEOUT_MS = 10000;

  // Perfil da Steam para o "Juntar-se à partida"
  const STEAM_URL = 'https://steamcommunity.com/profiles/76561198886933280/';

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

  function setStatus(key, labelOverride) {
    const s = STATUS_MAP[key] || STATUS_MAP.offline;
    statusDot.style.background = s.color;
    statusDot.title = labelOverride || s.label;
    statusText.textContent = labelOverride || s.label;
    statusDot.classList.toggle('pulse', key === 'online');
  }

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
    if (!data) return;

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
    let renderable = 0;

    // Ouvindo Spotify → "Ouvir junto" abre a mesma faixa
    if (data.listening_to_spotify && data.spotify) {
      renderable++;
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
        renderable++;
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

    // Casos especiais de status:
    // 1. Online só pelo celular, sem atividades (Discord mobile não
    //    transmite atividade) → "Online (mobile)"
    // 2. Offline com status manual definido na Lanyard KV → mostra o texto
    let labelOverride = null;
    if (data.discord_status === 'online' && data.active_on_discord_mobile && renderable === 0) {
      labelOverride = 'Online (mobile)';
    }
    if (data.discord_status === 'offline' && data.kv && data.kv.status) {
      labelOverride = String(data.kv.status).slice(0, 60);
    }

    setStatus(data.discord_status, labelOverride);

    window.lanyardPresence.lastUpdate = Date.now();
  }

  // ---------- REST (fallback) ----------
  let pollTimer = null;

  async function pollOnce() {
    try {
      const res = await fetch(REST_URL);
      const json = await res.json();
      if (json.success) render(json.data);
    } catch (e) {
      // API indisponível — mantém o último estado exibido
    }
  }

  function startPolling() {
    if (pollTimer) return;
    window.lanyardPresence.mode = 'rest';
    pollOnce();
    pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // ---------- WebSocket (tempo real) ----------
  let heartbeatTimer = null;
  let reconnectDelay = 3000;

  function connectWS() {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      startPolling();
      return;
    }

    // Se não conectar a tempo, fecha e deixa o onclose cuidar do fallback
    const connectTimeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) ws.close();
    }, WS_CONNECT_TIMEOUT_MS);

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.op === 1) {
        // Hello: inicia heartbeat e assina a presença
        clearTimeout(connectTimeout);
        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
        }, msg.d.heartbeat_interval);
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }));
        window.lanyardPresence.mode = 'ws';
        stopPolling();
        reconnectDelay = 3000;
      } else if (msg.op === 0 && (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE')) {
        render(msg.d);
      }
    };

    ws.onclose = () => {
      clearTimeout(connectTimeout);
      clearInterval(heartbeatTimer);
      // Enquanto o socket estiver fora, o REST segura o tempo "quase real"
      startPolling();
      setTimeout(connectWS, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 60000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };
  }

  // ---------- Inicialização ----------
  // _render fica exposto para depuração (testar estados manualmente)
  window.lanyardPresence = { mode: 'none', lastUpdate: 0, _render: render };

  // Estado padrão até chegar dado real (nunca quebra a página)
  setStatus('online');

  if (DISCORD_USER_ID) {
    connectWS();
  }
})();
