'use strict';

(() => {
  document.documentElement.classList.add('js-enabled');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const header = $('.site-header');
  const navigation = $('#primary-nav');
  const menuToggle = $('.menu-toggle');

  function initializeNavigation() {
    const setMenu = (open, restoreFocus = false) => {
      navigation.classList.toggle('open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (restoreFocus) menuToggle.focus();
    };
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
    $$('#primary-nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navigation.classList.contains('open')) setMenu(false, true);
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) setMenu(false);
    });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenu(false);
    });
    window.matchMedia('(min-width: 1051px)').addEventListener('change', event => {
      if (event.matches) setMenu(false);
    });
  }

  function initializeTheme() {
    const toggle = $('.theme-toggle');
    const applyTheme = theme => {
      document.documentElement.dataset.theme = theme;
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
      $('meta[name="theme-color"]').content = theme === 'dark' ? '#05070D' : '#eef2fa';
    };
    try {
      if (localStorage.getItem('hb-theme') === 'light') applyTheme('light');
    } catch { /* Device preferences are optional when browser storage is unavailable. */ }
    toggle.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      try { localStorage.setItem('hb-theme', theme); } catch { /* Keep the session theme. */ }
    });
  }

  function initializeScroll() {
    const sections = $$('main section[id]');
    const links = $$('#primary-nav a');
    const progress = $('.scroll-progress');
    const backToTop = $('.back-to-top');
    const timeline = $('.timeline');
    const timelineProgress = $('.timeline-track > span');
    let pending = false;
    let currentId = '';
    const update = () => {
      const position = window.scrollY;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${available > 0 ? Math.min(position / available, 1) : 0})`;
      header.classList.toggle('scrolled', position > 25);
      backToTop.classList.toggle('visible', position > 650);
      let activeId = sections[0].id;
      sections.forEach(section => {
        if (section.getBoundingClientRect().top <= window.innerHeight * 0.34) activeId = section.id;
      });
      if (available > 0 && available - position < 5) activeId = 'contact';
      if (activeId !== currentId) {
        links.forEach(link => {
          const active = link.hash === `#${activeId}`;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
        currentId = activeId;
      }
      const bounds = timeline.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (window.innerHeight * 0.72 - bounds.top) / bounds.height));
      timelineProgress.style.transform = `scaleY(${fraction})`;
      pending = false;
    };
    const requestUpdate = () => {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    document.addEventListener('portfolio:filter', requestUpdate);
    update();
  }

  function initializeReveals() {
    if (!('IntersectionObserver' in window) || motionPreference.matches) return;
    const targets = $$('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06 });
    document.body.classList.add('motion-ready');
    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 3) * 45}ms`);
      observer.observe(target);
    });
    motionPreference.addEventListener('change', event => {
      if (event.matches) {
        document.body.classList.remove('motion-ready');
        observer.disconnect();
      }
    });
  }

  function initializeGlass() {
    const resetters = [];
    $$('.glass-card, .glass-button, .glass-nav').forEach(element => {
      let frame = 0;
      const reset = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        element.style.removeProperty('--mouse-x');
        element.style.removeProperty('--mouse-y');
        if (element.hasAttribute('data-tilt')) element.style.removeProperty('transform');
        if (element.classList.contains('magnetic')) element.style.removeProperty('translate');
      };
      element.addEventListener('pointermove', event => {
        if (motionPreference.matches || !finePointer.matches || event.pointerType === 'touch') return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
          element.style.setProperty('--mouse-x', `${x * 100}%`);
          element.style.setProperty('--mouse-y', `${y * 100}%`);
          if (element.hasAttribute('data-tilt')) {
            element.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 6}deg)`;
          }
          if (element.classList.contains('magnetic')) {
            element.style.translate = `${(x - 0.5) * 6}px ${(y - 0.5) * 6}px`;
          }
          frame = 0;
        });
      }, { passive: true });
      element.addEventListener('pointerleave', reset);
      element.addEventListener('pointercancel', reset);
      resetters.push(reset);
    });
    motionPreference.addEventListener('change', () => resetters.forEach(reset => reset()));
    finePointer.addEventListener('change', () => resetters.forEach(reset => reset()));
    const ambient = $('.ambient');
    let glowFrame = 0;
    document.addEventListener('pointermove', event => {
      if (motionPreference.matches || !finePointer.matches || window.scrollY > 900) return;
      if (glowFrame) cancelAnimationFrame(glowFrame);
      glowFrame = requestAnimationFrame(() => {
        ambient.style.setProperty('--glow-x', `${event.clientX}px`);
        ambient.style.setProperty('--glow-y', `${event.clientY + window.scrollY}px`);
        glowFrame = 0;
      });
    }, { passive: true });
  }

  function initializeFilters(buttonSelector, itemSelector, attribute, statusSelector, noun) {
    const buttons = $$(buttonSelector);
    const items = $$(itemSelector);
    buttons.forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset[attribute];
      buttons.forEach(control => {
        const selected = control === button;
        control.classList.toggle('active', selected);
        control.setAttribute('aria-pressed', String(selected));
      });
      let count = 0;
      items.forEach(item => {
        const groups = (item.dataset.groups || item.dataset.category || '').split(' ');
        const visible = filter === 'all' || groups.includes(filter);
        item.hidden = !visible;
        if (visible) { count++; item.classList.add('is-visible'); }
      });
      $(statusSelector).textContent = `${count} ${noun} shown.`;
      document.dispatchEvent(new Event('portfolio:filter'));
    }));
  }

  function initializeCloud() {
    const descriptions = {
      AWS: 'AWS / INFRASTRUCTURE & MONITORING',
      Docker: 'DOCKER / CONSISTENT ENVIRONMENTS',
      GitHub: 'GITHUB / VERSION & RELEASE WORKFLOWS',
      Linux: 'LINUX / SYSTEMS & SHELL SCRIPTING',
      'CI/CD': 'CI/CD / AUTOMATED BUILD & RELEASE'
    };
    $$('.tech-node').forEach(button => button.addEventListener('click', () => {
      $$('.tech-node').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
      $('#tech-detail').textContent = descriptions[button.dataset.tech];
    }));
  }

  function initializeTerminal() {
    const output = $('#terminal-output');
    const text = '$ aws deploy\n$ docker build\n$ pipeline running\n$ infrastructure healthy ✓\n$ keep learning...';
    let timer = 0;
    let index = 0;
    let inView = false;
    let played = false;
    const stop = () => { clearTimeout(timer); timer = 0; };
    const type = () => {
      if (motionPreference.matches || document.hidden || !inView) return;
      output.textContent = text.slice(0, ++index);
      if (index < text.length) timer = window.setTimeout(type, text[index - 1] === '\n' ? 650 : 65);
      else { played = true; stop(); }
    };
    const resume = () => {
      stop();
      if (motionPreference.matches) { output.textContent = text; return; }
      if (inView && !document.hidden && !played) type();
    };
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) stop(); else resume();
    }, { threshold: 0.2 }).observe(output);
    motionPreference.addEventListener('change', resume);
    document.addEventListener('visibilitychange', resume);
  }

  function initializeContact() {
    const form = $('#contact-form');
    const fields = $$('input, textarea', form);
    const status = $('#form-status');
    fields.forEach(field => field.addEventListener('input', () => {
      field.setCustomValidity('');
      status.textContent = '';
    }));
    form.addEventListener('submit', event => {
      event.preventDefault();
      let invalid = false;
      fields.forEach(field => {
        field.setCustomValidity('');
        if (!field.value.trim()) {
          field.setCustomValidity('Please enter a value, not only spaces.');
          invalid = true;
        }
      });
      if ($('#message').value.trim().length < 10) {
        $('#message').setCustomValidity('Please write at least 10 characters.');
        invalid = true;
      }
      if (invalid || !form.checkValidity()) { form.reportValidity(); return; }
      const data = new FormData(form);
      const name = String(data.get('name')).trim();
      const email = String(data.get('email')).trim();
      const subject = String(data.get('subject')).trim();
      const message = String(data.get('message')).trim();
      const body = `${message}\n\nFrom: ${name}\nEmail: ${email}`;
      const uri = `mailto:himan.bhat10@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = uri;
      status.textContent = 'Email draft requested. Nothing has been sent. If your email app did not open, use the email link or copy your message.';
    });
  }

  initializeNavigation();
  initializeTheme();
  initializeReveals();
  initializeGlass();
  initializeFilters('[data-skill-filter]', '.skill-tile', 'skillFilter', '#skills-status', 'skills');
  initializeFilters('[data-project-filter]', '.project-card', 'projectFilter', '#projects-status', 'projects');
  initializeCloud();
  initializeTerminal();
  initializeContact();
  initializeScroll();
})();
