/* Presentation-only helpers. Authentication and task APIs stay in each app. */
(() => {
  const shapes = {
    layers: '<path d="m12 3 10 5-10 5L2 8zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
    'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>'
  };
  document.querySelectorAll('[data-sf-icon]').forEach(el => {
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[el.dataset.sfIcon] || shapes.layers}</svg>`;
  });
  document.querySelectorAll('[data-sf-demo]').forEach(button => {
    button.addEventListener('click', () => {
      const form = button.closest('.sf-login').querySelector('form');
      form.querySelector('[autocomplete="username"]').value = button.dataset.sfDemo;
      form.querySelector('[autocomplete="current-password"]').value = button.dataset.sfPassword;
      const error = form.querySelector('[role="alert"]');
      if (error) {
        if (error.dataset.sfErrorMode === 'hidden') error.hidden = true;
        else error.classList.add('hidden');
      }
      form.querySelector('[type="submit"]').focus();
    });
  });
  document.querySelectorAll('[data-sf-toggle-password]').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      button.setAttribute('aria-pressed', String(visible));
    });
  });
})();
