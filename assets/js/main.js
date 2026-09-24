/* Studio Marjorie Pires: interações da página (sem dependências). */
(() => {
  const WHATSAPP = 'https://wa.me/5549998092836';
  const MAP_EMBED = 'https://www.google.com/maps?q=Studio%20Marjorie%20Pires%2C%20R.%20Gen.%20Nepomuceno%20Costa%2C%20435%20-%20Centro%2C%20Lages%20-%20SC%2C%2088502-130&output=embed';
  const CONSENT_KEY = 'smp-consent-v1';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* Cabeçalho: fundo ao rolar */
  const header = $('[data-header]');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 16);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* WhatsApp flutuante: aparece sempre que o botão da abertura não está na tela
     (depois de rolar, ou já na chegada em celulares baixos e deitados) e some no fim
     do rodapé, para não cobrir os links de privacidade */
  const waFloat = $('[data-wa-float]');
  if (waFloat) {
    const watched = [$('.hero__actions'), $('.footer__bottom')].filter(Boolean);
    if (watched.length && 'IntersectionObserver' in window) {
      const onScreen = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => onScreen.set(entry.target, entry.isIntersecting));
        waFloat.classList.toggle('is-visible', ![...onScreen.values()].some(Boolean));
      });
      watched.forEach((el) => observer.observe(el));
    } else {
      waFloat.classList.add('is-visible');
    }
  }

  /* Menu do celular */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const behindMenu = [$('main'), $('footer'), waFloat].filter(Boolean);
  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    behindMenu.forEach((el) => { el.inert = open; });
    if (open) $('a', menu)?.focus({ preventScroll: true });
  };
  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 761px)').addEventListener('change', (mq) => { if (mq.matches) setMenu(false); });

  /* Notas que se empilham: cada uma ganha o ✓ quando pousa */
  const why = $('[data-why]');
  if (why) {
    const title = $('.why__title', why);
    const notes = $$('[data-note]', why);
    let stickyTops = [];
    const measure = () => {
      why.style.setProperty('--why-title-h', `${title.offsetHeight}px`);
      stickyTops = notes.map((note) => {
        const style = getComputedStyle(note);
        return style.position === 'sticky' ? parseFloat(style.top) : null;
      });
    };
    let queued = false;
    const update = () => {
      queued = false;
      notes.forEach((note, i) => {
        const top = note.getBoundingClientRect().top;
        const landed = stickyTops[i] === null ? top < innerHeight * 0.7 : top <= stickyTops[i] + 2;
        note.classList.toggle('is-stuck', landed);
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    measure();
    update();
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); queue(); }).observe(title);
    addEventListener('resize', () => { measure(); queue(); });
    addEventListener('scroll', queue, { passive: true });
  }

  /* Ficha de agendamento → WhatsApp com a mensagem pronta */
  const form = $('[data-ficha]');
  if (form) {
    const nameInput = $('#f-nome', form);
    const nameField = nameInput.closest('.field');
    const nameError = $('#f-nome-erro', form);
    const status = $('[data-ficha-status]', form);
    const minor = $('[data-menor]', form);
    const minorHint = $('[data-menor-hint]', form);

    minor?.addEventListener('change', () => { minorHint.hidden = !minor.checked; });

    const setNameError = (show) => {
      nameField.classList.toggle('is-invalid', show);
      nameError.hidden = !show;
      if (show) nameInput.setAttribute('aria-invalid', 'true');
      else nameInput.removeAttribute('aria-invalid');
    };
    nameInput.addEventListener('input', () => { if (nameInput.value.trim()) setNameError(false); });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const value = (key) => String(data.get(key) || '').trim();
      const name = value('nome');
      if (!name) {
        setNameError(true);
        nameInput.focus();
        return;
      }
      setNameError(false);

      const lines = [
        'Oi, Marjorie! Vim pelo site e quero agendar um horário.',
        '',
        `*Nome:* ${name}`,
        `*Quero fazer:* ${value('servico')}`,
      ];
      if (value('detalhe')) lines.push(`*Local ou detalhe:* ${value('detalhe')}`);
      lines.push(`*Melhor dia:* ${value('dia')}`, `*Turno:* ${value('turno')}`);
      if (value('menor')) lines.push('*É para menor de idade*');
      if (value('mensagem')) lines.push('', value('mensagem'));

      const url = `${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
      const win = window.open(url, '_blank');
      if (win) {
        win.opener = null;
        status.textContent = 'Abrimos o WhatsApp com a sua mensagem. É só tocar em enviar.';
      } else {
        window.location.href = url;
      }
    });
  }

  /* Cookies (LGPD) e mapa sob consentimento */
  const banner = $('[data-consent]');
  const map = $('[data-map]');
  const facade = map ? $('[data-map-facade]', map) : null;
  const readConsent = () => { try { return localStorage.getItem(CONSENT_KEY); } catch { return null; } };
  const writeConsent = (value) => { try { localStorage.setItem(CONSENT_KEY, value); } catch { /* navegação privada */ } };

  const updateFloatOffset = () => {
    const covering = banner && !banner.hidden && innerWidth < 720;
    document.documentElement.style.setProperty('--consent-offset', covering ? `-${banner.offsetHeight + 12}px` : '0px');
  };
  const showBanner = (show) => {
    if (!banner) return;
    banner.hidden = !show;
    updateFloatOffset();
  };
  const loadMap = () => {
    if (!map || map.dataset.loaded) return;
    map.dataset.loaded = 'true';
    const frame = document.createElement('iframe');
    frame.src = MAP_EMBED;
    frame.title = 'Mapa do Studio Marjorie Pires: R. Gen. Nepomuceno Costa, 435, Centro, Lages/SC';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.allowFullscreen = true;
    map.replaceChildren(frame);
  };
  const unloadMap = () => {
    if (!map || !map.dataset.loaded || !facade) return;
    delete map.dataset.loaded;
    map.replaceChildren(facade);
  };

  // O aviso aparece depois da primeira rolagem (ou de alguns segundos), para não cobrir a abertura.
  // Nenhum cookie é criado antes da escolha: o mapa só carrega com permissão.
  const consent = readConsent();
  if (consent === null) {
    let timer = 0;
    const reveal = () => {
      removeEventListener('scroll', onFirstScroll);
      clearTimeout(timer);
      if (readConsent() === null) showBanner(true);
    };
    const onFirstScroll = () => { if (window.scrollY > 80) reveal(); };
    addEventListener('scroll', onFirstScroll, { passive: true });
    timer = setTimeout(reveal, 8000);
  } else if (consent === 'maps') {
    loadMap();
  }

  banner?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-consent-choice]');
    if (!button) return;
    const choice = button.dataset.consentChoice;
    writeConsent(choice);
    showBanner(false);
    if (choice === 'maps') loadMap();
    else unloadMap();
  });
  $$('[data-consent-open]').forEach((button) => button.addEventListener('click', () => {
    showBanner(true);
    $('button', banner)?.focus();
  }));
  $('[data-map-load]')?.addEventListener('click', () => {
    writeConsent('maps');
    showBanner(false);
    loadMap();
  });
  addEventListener('resize', updateFloatOffset);

  /* Depoimentos: cada cartão sai da borda da tela (os da esquerda pela esquerda, os da direita
     pela direita) e chega ao lugar conforme a pessoa desce a página */
  const reviewSection = $('.reviews');
  const reviews = $$('.review');
  if (reviewSection && reviews.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reviewSection.classList.add('reviews--enter');
    let queued = false;
    const measure = () => {
      reviews.forEach((item, i) => {
        item.style.setProperty('--enter', '1');
        const card = $('.review__card', item).getBoundingClientRect();
        const fromLeft = i % 2 === 0;
        // metade do cartão ainda fora da tela no começo
        const distance = fromLeft ? -(card.left + card.width * 0.5) : innerWidth - card.right + card.width * 0.5;
        item.style.setProperty('--from', `${Math.round(distance)}px`);
      });
      update();
    };
    const update = () => {
      queued = false;
      const vh = innerHeight;
      reviews.forEach((item) => {
        const top = item.getBoundingClientRect().top;
        const raw = Math.min(1, Math.max(0, (vh * 0.98 - top) / (vh * 0.55)));
        const eased = 1 - (1 - raw) ** 3;
        item.style.setProperty('--enter', eased.toFixed(3));
      });
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    measure();
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
  }

  /* Letreiros: um toque pausa ou retoma o movimento */
  $$('.marquee').forEach((band) => band.addEventListener('click', () => band.classList.toggle('is-paused')));

  /* Ano no rodapé */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
