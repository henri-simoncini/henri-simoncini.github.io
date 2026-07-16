(() => {
  // ============================================
  // Mural de feedbacks — Supabase (Postgres + Realtime)
  //
  // A chave abaixo é a "publishable/anon key": ela é pública por
  // design. A segurança vem das políticas RLS no banco (só SELECT
  // e INSERT validado; UPDATE/DELETE negados) — ver supabase/feedbacks.sql.
  // ============================================
  const SUPABASE_URL = 'https://frlxljayyflzyniczfcu.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ITlbFeEcRVdjk1pCbmejYw_QhR5X9Cz';

  const NAME_MAX = 40;
  const MESSAGE_MAX = 500;
  const COOLDOWN_MS = 30000;
  const MAX_MESSAGES_SHOWN = 100;

  const chat = document.getElementById('fb-chat');
  const statusEl = document.getElementById('fb-status');
  const form = document.getElementById('fb-form');
  const nameInput = document.getElementById('fb-name');
  const messageInput = document.getElementById('fb-message');
  const countEl = document.getElementById('fb-count');
  const sendBtn = document.getElementById('fb-send');

  if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
    statusEl.textContent = 'Mural indisponível no momento.';
    form.hidden = true;
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const renderedIds = new Set();

  function setStatus(text) {
    statusEl.textContent = text;
    statusEl.hidden = !text;
  }

  function formatTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
      ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Renderização 100% via textContent — nada de innerHTML com
  // conteúdo do usuário (proteção contra XSS por construção)
  function addMessage(row) {
    if (!row || renderedIds.has(row.id)) return;
    renderedIds.add(row.id);

    const msg = document.createElement('div');
    msg.className = 'fb-msg';

    const header = document.createElement('span');
    header.className = 'fb-msg-name';
    header.textContent = String(row.name).slice(0, NAME_MAX);

    const time = document.createElement('span');
    time.className = 'fb-msg-time';
    time.textContent = formatTime(row.created_at);
    header.appendChild(time);

    const text = document.createElement('p');
    text.className = 'fb-msg-text';
    text.textContent = String(row.message).slice(0, MESSAGE_MAX);

    msg.appendChild(header);
    msg.appendChild(text);
    chat.appendChild(msg);

    // Mantém o DOM enxuto em murais longos
    while (chat.querySelectorAll('.fb-msg').length > MAX_MESSAGES_SHOWN) {
      chat.querySelector('.fb-msg').remove();
    }
  }

  function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
  }

  // ---------- Carga inicial ----------
  async function loadMessages() {
    const { data, error } = await client
      .from('feedbacks')
      .select('id,name,message,created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_MESSAGES_SHOWN);

    if (error) {
      setStatus('Não foi possível carregar as mensagens agora. Tente de novo mais tarde.');
      return;
    }

    setStatus(data.length === 0 ? 'Nenhum recado ainda — seja a primeira pessoa a escrever! ✍️' : '');
    data.reverse().forEach(addMessage);
    scrollToBottom();
  }

  // ---------- Tempo real ----------
  client
    .channel('feedbacks-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedbacks' }, (payload) => {
      setStatus('');
      addMessage(payload.new);
      scrollToBottom();
    })
    .subscribe();

  // ---------- Envio ----------
  const countBase = () => `${messageInput.value.length}/${MESSAGE_MAX}`;
  messageInput.addEventListener('input', () => { countEl.textContent = countBase(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim().slice(0, NAME_MAX);
    const message = messageInput.value.trim().slice(0, MESSAGE_MAX);
    if (!name || !message) return;

    // Cooldown por visitante (anti-spam básico no cliente;
    // o banco ainda tem um rate limit global via trigger)
    const lastSent = parseInt(localStorage.getItem('fb-last-sent') || '0', 10);
    const waitMs = COOLDOWN_MS - (Date.now() - lastSent);
    if (waitMs > 0) {
      countEl.textContent = `aguarde ${Math.ceil(waitMs / 1000)}s para enviar de novo`;
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Enviando...';

    const { data, error } = await client
      .from('feedbacks')
      .insert({ name, message })
      .select('id,name,message,created_at')
      .single();

    sendBtn.disabled = false;
    sendBtn.textContent = 'Enviar ➤';

    if (error) {
      countEl.textContent = /Muitas mensagens/.test(error.message)
        ? 'muitas mensagens agora — tente em instantes'
        : 'não foi possível enviar — tente de novo';
      return;
    }

    localStorage.setItem('fb-last-sent', String(Date.now()));
    setStatus('');
    addMessage(data); // o evento realtime duplicado é ignorado pelo Set de ids
    scrollToBottom();
    messageInput.value = '';
    countEl.textContent = countBase();
  });

  loadMessages();
})();
