const storageKey = 'skandinavSiteData';
const defaults = {
  heroImage: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1500&q=85',
  projects: [
    { title: 'Тихий берег', description: 'Дом для спокойной жизни у воды', location: 'Истринское водохранилище', details: '240 м² · 2024', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', gallery: [] },
    { title: 'Дом в соснах', description: '', location: 'Калужская область', details: '180 м² · 2023', image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=80', gallery: [] },
    { title: 'Северный свет', description: '', location: 'Новорижское ш.', details: '320 м² · 2022', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80', gallery: [] }
  ]
};
const clone = (value) => JSON.parse(JSON.stringify(value));
let data = (() => { try { return JSON.parse(localStorage.getItem(storageKey)) || clone(defaults); } catch { return clone(defaults); } })();
const form = document.querySelector('#content-form');
const projects = document.querySelector('#projects');
const status = document.querySelector('#status');
const loginScreen = document.querySelector('#login-screen');
const adminShell = document.querySelector('.admin-shell');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
function setAuthenticated(value) { loginScreen.hidden = value; adminShell.hidden = !value; }
setAuthenticated(false);
fetch('/api/session', { cache: 'no-store' }).then((response) => response.json()).then((session) => { if (session.authenticated) setAuthenticated(true); }).catch(() => setAuthenticated(true));
loginForm.addEventListener('submit', async (event) => { event.preventDefault(); const response = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: document.querySelector('#admin-password').value }) }); if (response.ok) { loginError.hidden = true; setAuthenticated(true); } else loginError.hidden = false; });
document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); setAuthenticated(false); });

function projectTemplate(project, index) {
  const gallery = (project.gallery || []).join(', ');
  return `<article class="project-editor"><div class="project-number">0${index + 1}</div><div class="project-fields"><div class="editor-title"><strong>Проект ${index + 1}</strong><button class="remove-project" type="button" data-remove="${index}">Удалить</button></div><label>Название<input name="title-${index}" value="${escapeHtml(project.title)}" /></label><label>Описание<input name="description-${index}" value="${escapeHtml(project.description || '')}" /></label><div class="two-col"><label>Локация<input name="location-${index}" value="${escapeHtml(project.location)}" /></label><label>Площадь и год<input name="details-${index}" value="${escapeHtml(project.details)}" /></label></div><label>Главное фото<input name="image-${index}" type="text" value="${escapeHtml(project.image)}" /></label><label>Или загрузите файл<input name="file-${index}" type="file" accept="image/*" /></label><label>Галерея (ссылки через запятую)<textarea name="gallery-${index}" rows="2">${escapeHtml(gallery)}</textarea></label><div class="preview" data-preview="image-${index}"></div></div></article>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char])); }
function render() {
  form.heroImage.value = data.heroImage || '';
  projects.innerHTML = data.projects.map(projectTemplate).join('');
  document.querySelectorAll('[data-preview]').forEach((preview) => {
    const input = form.elements[preview.dataset.preview];
    preview.style.backgroundImage = input && input.value ? `url("${input.value}")` : 'none';
  });
}
fetch('/api/content', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((remote) => { if (remote) data = remote; render(); }).catch(() => render());

form.addEventListener('change', (event) => {
  if (!event.target.files?.[0]) return;
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = async () => {
    const target = event.target.name === 'heroFile' ? form.heroImage : form.elements[event.target.name.replace('file-', 'image-')];
    const response = await fetch('/api/upload', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ data: reader.result, extension: file.name.split('.').pop() }) });
    if (response.ok) {
      const uploaded = await response.json();
      target.value = uploaded.url;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      target.value = reader.result;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
});
form.addEventListener('input', (event) => {
  const preview = document.querySelector(`[data-preview="${event.target.name}"]`);
  if (preview) preview.style.backgroundImage = event.target.value ? `url("${event.target.value}")` : 'none';
});
function collectData() {
  return { heroImage: form.heroImage.value.trim(), projects: data.projects.map((_, index) => ({
    title: form.elements[`title-${index}`].value.trim(), description: form.elements[`description-${index}`].value.trim(), location: form.elements[`location-${index}`].value.trim(), details: form.elements[`details-${index}`].value.trim(), image: form.elements[`image-${index}`].value.trim(), gallery: form.elements[`gallery-${index}`].value.split(',').map((item) => item.trim()).filter(Boolean)
  })) };
}
async function persist(next) {
  localStorage.setItem(storageKey, JSON.stringify(next)); data = next;
  try {
    const response = await fetch('/api/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    if (!response.ok) throw new Error('save failed');
    return true;
  } catch { return false; }
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  persist(collectData()).then((remote) => { status.textContent = remote ? 'Сохранено на сервере' : 'Сохранено в этом браузере'; });
  setTimeout(() => { status.textContent = ''; }, 3000);
});
document.querySelector('#add-project').addEventListener('click', () => { data.projects.push({ title: 'Новый проект', description: '', location: '', details: '', image: '', gallery: [] }); render(); });
projects.addEventListener('click', (event) => { const button = event.target.closest('[data-remove]'); if (!button) return; data.projects.splice(Number(button.dataset.remove), 1); render(); });
document.querySelector('#preview').addEventListener('click', () => { persist(collectData()); window.open('index.html#projects', '_blank'); });
document.querySelector('#reset').addEventListener('click', () => { data = clone(defaults); localStorage.removeItem(storageKey); render(); status.textContent = 'Возвращены исходные данные'; });
