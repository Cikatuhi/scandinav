const form = document.querySelector('.contact-form');
const success = document.querySelector('.form-success');
if (form && success) {
    form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (window.location.protocol === 'file:') {
      button.innerHTML = 'Заявка сохранена <span>✓</span>';
      success.textContent = 'Демо-режим: подключите backend, чтобы получать заявки в админке.';
      success.classList.add('visible');
      form.reset();
      return;
    }
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('lead request failed');
      button.innerHTML = 'Заявка отправлена <span>✓</span>';
      success.classList.add('visible');
      form.reset();
    } catch {
      success.textContent = 'Не удалось отправить. Позвоните нам или попробуйте ещё раз.';
      success.classList.add('visible');
      button.disabled = false;
    }
  });
}

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
if (menuToggle && nav) {
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuToggle.classList.toggle('open');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.classList.remove('open');
    });
  });
}

const contentKey = 'skandinavSiteData';
const localContent = (() => {
  try { return JSON.parse(localStorage.getItem(contentKey) || 'null'); } catch { return null; }
})();
function applyContent(savedContent) {
if (savedContent) {
  const company = savedContent.company || {};
  const phone = document.querySelector('.contact-direct a[href^="tel"]');
  const hours = document.querySelector('.contact-direct span');
  if (phone && company.phone) { phone.textContent = company.phone; phone.href = `tel:${company.phone.replace(/[^+\d]/g, '')}`; }
  if (hours && company.hours) hours.textContent = company.hours;
  const email = document.querySelector('.footer-links a[href^="mailto"]');
  const telegram = document.querySelector('.footer-links a[href*="t.me"]');
  const whatsapp = document.querySelector('.footer-links a[href*="wa.me"]');
  if (email && company.email) { email.textContent = company.email; email.href = `mailto:${company.email}`; }
  if (telegram && company.telegram) telegram.href = company.telegram;
  if (whatsapp && company.whatsapp) whatsapp.href = company.whatsapp;
  const heroImage = document.querySelector('.hero-image');
  if (heroImage && savedContent.heroImage) {
    heroImage.style.backgroundImage = `linear-gradient(90deg, rgba(28,40,28,.15), transparent 42%), url("${savedContent.heroImage}")`;
  }
  const grid = document.querySelector('.project-grid');
  const cards = [...document.querySelectorAll('.project-card')];
  while (grid && cards.length < (savedContent.projects || []).length) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.innerHTML = '<div class="project-image"><span class="project-tag"></span><span class="project-hover-label">Смотреть проект <b>↗</b></span></div><div class="project-meta"><div><span class="project-index"></span><h3></h3><p></p></div><div><span></span><span></span></div></div>';
    grid.appendChild(card);
    cards.push(card);
  }
  cards.forEach((card, index) => { card.classList.toggle('project-hidden', index >= (savedContent.projects || []).length); });
  (savedContent.projects || []).forEach((project, index) => {
    const card = cards[index];
    if (!card) return;
    const image = card.querySelector('.project-image');
    const title = card.querySelector('h3');
    const description = card.querySelector('p');
    const meta = card.querySelector('.project-meta > div:last-child');
    let tag = card.querySelector('.project-tag');
    if (!tag && image) { tag = document.createElement('span'); tag.className = 'project-tag'; image.prepend(tag); }
    if (tag) { tag.textContent = project.status || ''; tag.hidden = !project.status || project.status === 'Скрыт'; }
    card.classList.toggle('project-hidden', project.status === 'Скрыт');
    if (image && project.image) image.style.backgroundImage = `url("${project.image}")`;
    if (title && project.title) title.textContent = project.title;
    if (description && project.description !== undefined) description.textContent = project.description;
    if (meta) {
      const spans = meta.querySelectorAll('span');
      if (spans[0] && project.location) spans[0].textContent = project.location;
      if (spans[1] && project.details) spans[1].textContent = project.details;
    }
    const galleryCount = (project.gallery || []).length + (project.image ? 1 : 0);
    if (image && galleryCount > 1) {
      const count = document.createElement('span');
      count.className = 'project-gallery-count';
      count.textContent = `${galleryCount} фото`;
      image.appendChild(count);
    }
    if (image && galleryCount) {
      image.dataset.gallery = JSON.stringify([project.image, ...(project.gallery || [])].filter(Boolean));
      image.addEventListener('click', () => openGallery(JSON.parse(image.dataset.gallery)));
    }
  });
}
}
fetch('/api/content', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((content) => applyContent(content || localContent)).catch(() => applyContent(localContent));

function openGallery(images) {
  const overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  overlay.innerHTML = `<button class="gallery-close" aria-label="Закрыть">×</button><img src="${images[0]}" alt="Фотография проекта" /><div class="gallery-count">1 / ${images.length}</div>`;
  let current = 0;
  const picture = overlay.querySelector('img');
  const count = overlay.querySelector('.gallery-count');
  const show = (step) => { current = (current + step + images.length) % images.length; picture.src = images[current]; count.textContent = `${current + 1} / ${images.length}`; };
  overlay.querySelector('.gallery-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  overlay.addEventListener('keydown', (event) => { if (event.key === 'Escape') overlay.remove(); if (event.key === 'ArrowRight') show(1); if (event.key === 'ArrowLeft') show(-1); });
  document.body.appendChild(overlay); overlay.tabIndex = 0; overlay.focus();
}

const revealItems = document.querySelectorAll('.trust-item, .intro-content, .stats, .project-card, .approach-heading, .step, .contact-copy, .contact-form');
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.14 });
revealItems.forEach((item) => { item.classList.add('reveal-item'); revealObserver.observe(item); });

const heroVisual = document.querySelector('.hero-visual');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (heroVisual && !reduceMotion.matches) {
  heroVisual.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
    heroVisual.style.setProperty('--parallax-x', `${x}px`);
    heroVisual.style.setProperty('--parallax-y', `${y}px`);
  });
  heroVisual.addEventListener('pointerleave', () => {
    heroVisual.style.setProperty('--parallax-x', '0px');
    heroVisual.style.setProperty('--parallax-y', '0px');
  });
}
