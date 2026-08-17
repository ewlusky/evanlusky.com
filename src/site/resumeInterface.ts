import type {
  ResumeData,
  ResumeEntry,
  ResumeSection,
  ResumeSectionId,
} from '../data/resume';

export type VirtualDirection = 'up' | 'down' | 'left' | 'right';

export interface GameInputControls {
  focusCanvas(): void;
  interact(): void;
  /** pauseAudio also silences the music; a plain pause keeps it playing. */
  setPaused(isPaused: boolean, pauseAudio?: boolean): void;
  setVirtualDirection(direction: VirtualDirection, isPressed: boolean): void;
}

export interface ResumeInterface {
  openSection(sectionId: ResumeSectionId): void;
  setGameControls(controls: GameInputControls): void;
  setGameStatus(message: string, state?: 'loading' | 'ready' | 'error'): void;
}

interface ResumeInterfaceOptions {
  readonly bridgeMode: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTags(tags: readonly string[] | undefined): string {
  if (!tags?.length) {
    return '';
  }

  return `<ul class="tag-list" aria-label="Technologies and topics">
    ${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}
  </ul>`;
}

function renderEntry(entry: ResumeEntry): string {
  const description = entry.description
    ? `<p>${escapeHtml(entry.description)}</p>`
    : '';
  const bullets = entry.bullets?.length
    ? `<ul class="detail-list">${entry.bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join('')}</ul>`
    : '';

  return `<article class="resume-entry">
    <header>
      <h3>${escapeHtml(entry.title)}</h3>
      ${entry.meta ? `<p class="entry-meta">${escapeHtml(entry.meta)}</p>` : ''}
    </header>
    ${description}
    ${bullets}
    ${renderTags(entry.tags)}
  </article>`;
}

function renderSection(section: ResumeSection): string {
  return `<section class="resume-section reveal" id="${section.id}" aria-labelledby="${section.id}-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">${escapeHtml(section.eyebrow)}</p>
        <h2 id="${section.id}-title">${escapeHtml(section.title)}</h2>
      </div>
      <button class="text-button no-print" type="button" data-open-section="${section.id}">
        Quick view <span aria-hidden="true">↗</span>
      </button>
    </div>
    <p class="section-intro">${escapeHtml(section.introduction)}</p>
    <div class="entry-grid">
      ${section.entries.map(renderEntry).join('')}
    </div>
  </section>`;
}

function renderApp(data: ResumeData, options: ResumeInterfaceOptions): string {
  const bridgeInstructions = options.bridgeMode
    ? 'Move with A/D or the left and right arrow keys. Press E or Enter near a console, or select any destination directly. The complete résumé remains below.'
    : 'Move with WASD or the arrow keys. Press E or Enter near a station, or select any station directly. Space flips, G dances, R plays guitar, the pilot seat is sittable, and the port-side corridor leads somewhere. The complete résumé remains below.';
  const bridgeTouchControls = options.bridgeMode
    ? `<button type="button" data-direction="left" aria-label="Move left">◀</button>
            <button type="button" class="touch-interact" data-interact-game aria-label="Open nearby station">E</button>
            <button type="button" data-direction="right" aria-label="Move right">▶</button>`
    : `<button type="button" data-direction="up" aria-label="Move up">▲</button>
            <button type="button" data-direction="left" aria-label="Move left">◀</button>
            <button type="button" class="touch-interact" data-interact-game aria-label="Open nearby station">E</button>
            <button type="button" data-direction="right" aria-label="Move right">▶</button>
            <button type="button" data-direction="down" aria-label="Move down">▼</button>`;
  const navigation = data.sections
    .map(({ id, label }) => `<a href="#${id}">${escapeHtml(label)}</a>`)
    .join('');
  const externalLinks = data.links
    .map(
      ({ href, label }) =>
        `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`,
    )
    .join('');
  const purposeLabels: Record<ResumeSectionId, string> = {
    about: 'Profile',
    experience: 'Experience',
    skills: 'Skills',
    projects: 'Projects',
    education: 'Education + research',
    contact: 'Contact',
  };
  const stationDirectory = data.sections
    .map(
      ({ id, gameLabel }) => `<button type="button" data-open-section="${id}" data-station="${id}">
        <span>${escapeHtml(purposeLabels[id])}</span>
        <small>${escapeHtml(gameLabel)}</small>
      </button>`,
    )
    .join('');

  return `
    <header class="site-header no-print">
      <a class="brand" href="#top" aria-label="Evan Lusky, back to top">EL<span aria-hidden="true">.</span></a>
      <nav class="primary-nav" aria-label="Résumé sections">${navigation}</nav>
      <a class="header-resume" href="/resume/Evan-Lusky-Resume.pdf" download>Download résumé PDF</a>
    </header>

    <main id="top">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> Nashville, TN / Open to the right work</p>
          <h1 id="hero-title">Systems thinker.<br /><span>Practical builder.</span></h1>
          <p class="hero-role">${escapeHtml(data.role)}</p>
          <p class="hero-intro">${escapeHtml(data.introduction)}</p>
          <div class="hero-actions no-print">
            <a class="button button-primary" href="#interactive">Explore the map</a>
            <a class="button button-secondary" href="#resume-content">Read the résumé</a>
          </div>
        </div>
        <aside class="signal-card" aria-label="Career highlights">
          <p class="signal-label">CURRENT SIGNAL</p>
          <div class="signal-line"><span>7</span><p>years at<br />FortyAU</p></div>
          <div class="signal-line"><span>9</span><p>client<br />engagements</p></div>
          <div class="signal-line"><span>49%</span><p>of flagship web commits<br />in the final quarter</p></div>
          <div class="signal-rule"></div>
          <p class="signal-note">AI enablement · platform seams · reliable delivery</p>
        </aside>
      </section>

      <section class="interactive-section no-print" id="interactive" aria-labelledby="interactive-title">
        <div class="section-heading interactive-heading">
          <div>
            <p class="eyebrow">Interactive résumé</p>
            <h2 id="interactive-title">Walk the archive</h2>
          </div>
          <button class="text-button" id="toggle-game" type="button" aria-controls="game-stage" aria-expanded="true">
            Hide game
          </button>
        </div>
        <p class="section-intro">
          ${bridgeInstructions}
        </p>
        <div class="game-stage" id="game-stage">
          <div class="game-frame">
            <div class="game-hud">
              <p><span class="hud-pip" aria-hidden="true"></span><span id="game-status" role="status" aria-live="polite">Loading interactive map…</span></p>
              <p class="game-key-hint"><kbd>${options.bridgeMode ? 'A/D' : 'WASD'}</kbd> move <kbd>E</kbd> inspect</p>
            </div>
            <div
              id="game-container"
              class="game-container"
              role="application"
              aria-label="${
                options.bridgeMode
                  ? 'Interactive 2.5D résumé command bridge. Use A and D or the left and right arrow keys to move, and E or Enter to inspect nearby stations.'
                  : 'Interactive résumé archive map. Use WASD or arrow keys to move and E or Enter to inspect nearby stations.'
              }"
            ></div>
            <div class="game-corners" aria-hidden="true"></div>
          </div>
          <div class="touch-controls${options.bridgeMode ? ' touch-controls-bridge' : ''}" aria-label="On-screen movement controls">
            ${bridgeTouchControls}
          </div>
          <nav class="station-directory" aria-label="Résumé terminal directory">
            <p>Terminal directory</p>
            <div>${stationDirectory}</div>
          </nav>
        </div>
      </section>

      <div id="resume-content" class="resume-content" tabindex="-1">
        <div class="resume-masthead">
          <div>
            <p class="eyebrow">Conventional résumé</p>
            <h2>${escapeHtml(data.name)}</h2>
            <p>${escapeHtml(data.role)}</p>
          </div>
          <div class="resume-actions no-print">
            <a class="button button-primary" href="/resume/Evan-Lusky-Resume.pdf" download>Download PDF</a>
            <a class="button button-secondary" href="/resume/Evan-Lusky-Resume.docx" download>Download DOCX</a>
            <button class="button button-secondary" id="print-resume" type="button">Print portfolio</button>
          </div>
        </div>
        <address class="contact-strip">
          <span>${escapeHtml(data.location)}</span>
          <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>
          <a href="tel:${escapeHtml(data.phoneHref)}">${escapeHtml(data.phoneDisplay)}</a>
          ${externalLinks}
        </address>
        ${data.sections.map(renderSection).join('')}
      </div>
    </main>

    <footer>
      <p>Built with TypeScript and Phaser. The résumé works without playing the game.</p>
      <a href="#top">Back to top ↑</a>
    </footer>

    <dialog class="resume-dialog" id="resume-dialog" aria-labelledby="dialog-title">
      <div class="dialog-frame">
        <header class="dialog-header">
          <p class="eyebrow" id="dialog-eyebrow"></p>
          <button class="dialog-close" type="button" aria-label="Close résumé panel">×</button>
        </header>
        <div class="dialog-content" id="dialog-content"></div>
      </div>
    </dialog>
  `;
}

function isResumeSectionId(value: string | undefined): value is ResumeSectionId {
  return ['about', 'experience', 'skills', 'projects', 'education', 'contact'].includes(
    value ?? '',
  );
}

export function createResumeInterface(
  container: HTMLElement,
  data: ResumeData,
  options: ResumeInterfaceOptions,
): ResumeInterface {
  container.innerHTML = renderApp(data, options);

  const dialog = container.querySelector<HTMLDialogElement>('#resume-dialog');
  const dialogContent = container.querySelector<HTMLElement>('#dialog-content');
  const dialogEyebrow = container.querySelector<HTMLElement>('#dialog-eyebrow');
  const closeButton = container.querySelector<HTMLButtonElement>('.dialog-close');
  const gameStatus = container.querySelector<HTMLElement>('#game-status');
  const gameStage = container.querySelector<HTMLElement>('#game-stage');
  const gameToggle = container.querySelector<HTMLButtonElement>('#toggle-game');
  const resumeContent = container.querySelector<HTMLElement>('#resume-content');
  let controls: GameInputControls | undefined;

  if (
    !dialog ||
    !dialogContent ||
    !dialogEyebrow ||
    !closeButton ||
    !gameStatus ||
    !gameStage ||
    !gameToggle ||
    !resumeContent
  ) {
    throw new Error('The résumé interface could not find its required elements.');
  }

  const openSection = (sectionId: ResumeSectionId): void => {
    const section = data.sections.find(({ id }) => id === sectionId);
    if (!section) {
      return;
    }

    dialogEyebrow.textContent = section.eyebrow;
    dialogContent.innerHTML = `
      <h2 id="dialog-title">${escapeHtml(section.title)}</h2>
      <p class="dialog-intro">${escapeHtml(section.introduction)}</p>
      <div class="dialog-entries">${section.entries.map(renderEntry).join('')}</div>
    `;

    if (!dialog.open) {
      dialog.showModal();
    }
    controls?.setPaused(true);
    closeButton.focus();
  };

  container.querySelectorAll<HTMLElement>('[data-open-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.dataset.openSection;
      if (isResumeSectionId(sectionId)) {
        openSection(sectionId);
      }
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    if (!gameStage.hidden) {
      controls?.setPaused(false);
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });

  gameToggle.addEventListener('click', () => {
    const shouldShow = gameStage.hidden;
    gameStage.hidden = !shouldShow;
    gameToggle.textContent = shouldShow ? 'Hide game' : 'Show game';
    gameToggle.setAttribute('aria-expanded', String(shouldShow));

    if (shouldShow) {
      controls?.setPaused(false);
      controls?.focusCanvas();
    } else {
      controls?.setPaused(true, true);
      resumeContent.focus();
    }
  });

  container.querySelector<HTMLButtonElement>('#print-resume')?.addEventListener('click', () => {
    window.print();
  });

  container.querySelector<HTMLElement>('[data-interact-game]')?.addEventListener('click', () => {
    controls?.interact();
  });

  container.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach((button) => {
    const direction = button.dataset.direction as VirtualDirection;
    const start = (event: PointerEvent): void => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      controls?.setVirtualDirection(direction, true);
    };
    const stop = (): void => controls?.setVirtualDirection(direction, false);

    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('lostpointercapture', stop);
  });

  return {
    openSection,
    setGameControls(nextControls) {
      controls = nextControls;
      if (gameStage.hidden) {
        controls.setPaused(true, true);
      }
    },
    setGameStatus(message, state = 'loading') {
      gameStatus.textContent = message;
      gameStatus.dataset.state = state;
    },
  };
}
