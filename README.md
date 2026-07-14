# Portfólio — Estética de Explorador de Arquivos

Portfólio pessoal estático (HTML/CSS/JS puros, sem build) com visual inspirado em um explorador de arquivos retrô.

## Como visualizar
Basta abrir `index.html` diretamente no navegador — não precisa de servidor nem instalação.

## Como visualizar o conteúdo
Todo o conteúdo textual está em `index.html`, dentro de blocos `<article class="file-view" data-file="...">`.

- **Sobre Mim**: blocos `bio` e `skills`.
- **Projetos**: blocos `projeto1`, `projeto2`, `projeto3`.
- **Experiência & Educação**: blocos `experiencia` e `educacao`.
- **Contato**: bloco `contato`.

## Cores e tipografia
Definidas como variáveis CSS no topo de `css/style.css`:

```css
--color-bg: #080815;
--color-fg: #f2f2f2;
--color-accent: #00eeff;
--color-accent-2: #0f776e;

--font-title: "Jersey 20";
--font-subtitle: "Jersey 10";
--font-alt: "Pixelify Sans";
--font-body: "JetBrains Mono";
```

As fontes são carregadas via Google Fonts no `<head>` do `index.html`.

## Menus da barra superior
- **File** — alterna entre a tela de apresentação (texto digitado estilo Pokémon) e o explorador de arquivos. O site abre na apresentação.
- **Edit** — alternar tema claro/escuro e trocar a cor principal (9 opções: ciano, laranja, vermelho, monocromático, verde, azul, amarelo, roxo, rosa). As escolhas ficam salvas no navegador (localStorage).
- **View** — baixar o currículo em PDF (`assets/curriculo-henrique-simoncini.pdf`) e visualizar os cartões de estatísticas do GitHub dentro do explorador.
- **Favorites** — links para projetos favoritos (Ficha Lunaris e Outlast Fanpage).
- **Tools** — habilitar/desabilitar o player de música (escolha salva no navegador).
- **Help** — modal "Sobre este site".

## Designs
A pasta **Designs** abre uma vitrine com os designs de páginas/posts/logos: linhas intercaladas (imagem à esquerda numa, à direita na outra), cada uma com título, data e descrição. As imagens ficam em `assets/designs/`; ao passar o mouse, screenshots longos "rolam" de cima a baixo dentro da moldura (transição de `object-position`).

## Galeria de fotos
A pasta **Galeria de Fotos** na árvore abre um mosaico com 5 blocos de 4 fotos (uma 9:16 ao lado de uma 16:9 com duas 1:1 embaixo; blocos alternados são espelhados).

**Tela cheia:** clicar em qualquer foto abre o lightbox — imagem com borda na cor principal, botões ◀ ▶ para navegar (com animação de deslize direcional), ✕ para fechar e ▲ no canto inferior direito para mostrar/esconder a legenda sobre a imagem. Também funciona com as setas do teclado e Esc.

## Cursor pixelado
O site usa um cursor de seta pixelado (estilo Windows clássico) na cor principal e a clássica **mãozinha branca do Windows** nos itens clicáveis, desenhada pixel a pixel (mapa `HAND_MAP` em `js/main.js`). A seta e o favicon acompanham a cor principal via `updateAccentAssets`.

## Presença em tempo real (estilo Discord)
O cartão de perfil na página inicial mostra sua foto, status ("Online agora", "Ausente"...), sua **Nota** (status personalizado do Discord) e suas atividades: o que está ouvindo no Spotify, jogando ou programando — tudo em tempo real via [Lanyard](https://github.com/Phineas/lanyard), sem backend próprio.

**Deseja utilizar a API Lanyard?**
1. Entre no servidor Discord do Lanyard: https://discord.gg/lanyard (basta entrar; o bot passa a expor sua presença pela API pública).
2. No Discord: Configurações → Avançado → ative o **Modo desenvolvedor**.
3. Clique com o botão direito no seu nome → **Copiar ID do usuário**.
4. Cole o ID na constante `DISCORD_USER_ID` no topo de `js/presence.js`.

**O que aparece e como:**
- 🟢 **Status** — online/ausente/não perturbe/offline, direto do Discord.
- 💭 **Nota** — defina seu *status personalizado* no Discord (aquele "O que você está fazendo?") e ele aparece no site em até 20 segundos.
- 🎵 **Ouvindo** — conecte o Spotify ao Discord (Configurações → Conexões) e ative "Exibir no perfil". Ao passar o mouse na atividade, o visitante vê **"🎧 Ouvir junto"** e abre a mesma faixa no Spotify.
- 🎮 **Jogando** — o Discord detecta jogos automaticamente (ative "Compartilhar atividade" em Configurações → Privacidade de atividade). No hover, aparece **"🎮 Juntar-se à partida"**, levando ao seu perfil da Steam (URL na constante `STEAM_URL` em `js/presence.js`).
- 💻 **Programando** — instale uma extensão de Discord Rich Presence no VS Code (ex: "Discord Presence") e o site mostra o que você está codando.

Enquanto `DISCORD_USER_ID` estiver vazio, o cartão mostra "Online agora" fixo, sem atividades.

## Música e sons
- **Som de clique**: `assets/sounds/click.mp3`, tocado em qualquer clique de item interativo via WebAudio (baixa latência).
- **Som de digitação**: `assets/sounds/type.mp3`, tocado a cada tecla na barra de pesquisa e no formulário de contato, e também durante as animações de texto (tela de apresentação e títulos das páginas). O arquivo tem várias batidas de teclado; o `js/main.js` sorteia uma batida por vez (posições mapeadas no array `TYPE_HITS`.
- **Títulos animados**: ao abrir qualquer página, o título é "digitado" letra a letra estilo Pokémon, com som.
- **Formulário de contato**: em Contato, o visitante preenche nome, assunto e mensagem; "Enviar via WhatsApp" abre o WhatsApp com a mensagem pronta para o número configurado na constante `WHATSAPP_NUMBER` em `js/main.js`.
- **Player de lofi**: canto inferior direito, com play/pause, anterior/próxima, barra de progresso clicável e **controle de volume**. Abre/fecha pelo **disco de vinil girando** na barra de status. A música começa automaticamente ao abrir o site (ou no primeiro clique, se o navegador bloquear autoplay) com a notificação "Tocando agora" — que também abre o player ao ser clicada.
- **Playlist**: A lista atual (lofi): could i be your girl (eevee), Dontyouknow (Sebastian Kamae, Aylior), Take you there (Huey Daze), Birds (wünsche) e Song of the Samurai (Elijah Nang).
- **Copyright das trilhas**: mesmo faixas lofi têm direitos autorais (dos artistas/labels como Chillhop, Lofi Girl etc.), mas a cena lofi é historicamente tolerante com uso não comercial creditado — o player já exibe título + artista.
- **Favicon dinâmico**: o ícone da aba do navegador é a mesma pasta da barra de título, gerado em SVG na cor principal atual — muda junto com a cor escolhida no menu Edit (função `updateAccentAssets` em `js/main.js`, que também atualiza os cursores).

## Estrutura
```
index.html          estrutura da página + conteúdo (árvore de pastas + painel de arquivos)
css/style.css        cores, tipografia, layout, animações, player, responsividade
js/main.js           navegação da árvore, busca, menu, modal, som de clique
js/player.js         player de música lofi + notificação "Tocando agora"
assets/icons.svg     ícones de pasta/arquivo (sprite SVG)
assets/covers/       capas de álbum em SVG pixel-art
assets/sounds/       som de clique
assets/music/        suas músicas lofi (MP3)
```