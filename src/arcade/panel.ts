import { resumeData, type ResumeSection } from '../data/resume';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSection(section: ResumeSection): string {
  const entries = section.entries
    .map((entry) => {
      const meta = entry.meta ? `<p class="meta">${escapeHtml(entry.meta)}</p>` : '';
      const description = entry.description ? `<p>${escapeHtml(entry.description)}</p>` : '';
      const bullets = entry.bullets?.length
        ? `<ul>${entry.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
        : '';
      const tags = entry.tags?.length
        ? `<ul class="tags">${entry.tags.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
        : '';
      return `<article><h3>${escapeHtml(entry.title)}</h3>${meta}${description}${bullets}${tags}</article>`;
    })
    .join('');

  return `
    <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
    <h2>${escapeHtml(section.title)}</h2>
    <p class="intro">${escapeHtml(section.introduction)}</p>
    ${entries}
  `;
}

/**
 * The station panels are plain DOM on top of the canvas, so the resume text
 * stays selectable, scrollable, and readable by a screen reader.
 */
export function createPanel(host: HTMLElement): {
  open: (sectionId: string) => void;
  close: () => void;
  isOpen: () => boolean;
} {
  const overlay = document.createElement('div');
  overlay.className = 'arcade-panel';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="arcade-panel-inner">
      <button type="button" class="arcade-panel-close" aria-label="Close">CLOSE  [ESC]</button>
      <div class="arcade-panel-body"></div>
    </div>
  `;
  host.appendChild(overlay);

  const body = overlay.querySelector<HTMLElement>('.arcade-panel-body')!;
  const closeButton = overlay.querySelector<HTMLButtonElement>('.arcade-panel-close')!;

  const close = () => {
    overlay.hidden = true;
    document.body.classList.remove('panel-open');
  };

  const open = (sectionId: string) => {
    const section = resumeData.sections.find((s) => s.id === sectionId);
    if (!section) return;
    body.innerHTML = renderSection(section);
    overlay.hidden = false;
    document.body.classList.add('panel-open');
    closeButton.focus();
  };

  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) {
      event.stopPropagation();
      close();
    }
  });

  return { open, close, isOpen: () => !overlay.hidden };
}
