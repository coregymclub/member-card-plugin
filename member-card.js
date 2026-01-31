/**
 * Member Card Plugin
 * Återanvändbar medlemskortskomponent för Core Gym admin-appar
 *
 * Användning:
 *   MemberCard.open(memberId, { mode: 'sheet' })  // Bottom sheet
 *   MemberCard.open(memberId, { mode: 'modal' })  // Modal
 *   MemberCard.search({ mode: 'sheet' })          // Öppna med sökning
 */

const MemberCard = {
  currentMember: null,
  currentData: null,
  container: null,
  overlay: null,
  mode: 'sheet',
  onClose: null,

  // Förenklade access-grupper
  ACCESS_GROUPS: [
    { key: 'vegastaden', name: 'Alla klubbar', icon: '🏆' },
    { key: 'tungelsta', name: 'Tungelsta + VH', icon: '🏋️' },
    { key: 'ungdom', name: 'Ungdom', icon: '👶' },
    { key: 'egym', name: 'EGYM', icon: '⚡' }
  ],

  // Gym-namn för historik etc
  GYM_NAMES: {
    vegastaden: 'Vegastaden',
    tungelsta: 'Tungelsta',
    vasterhaninge: 'Västerhaninge',
    egym: 'EGYM'
  },

  /**
   * Öppna medlemskort
   */
  async open(memberId, options = {}) {
    this.mode = options.mode || 'sheet';
    this.onClose = options.onClose || null;

    this.createContainer();
    this.showLoading();
    this.show();

    try {
      const data = await MemberCardAPI.getFullMemberCard(memberId);
      this.currentData = data;
      this.render(data);
    } catch (error) {
      console.error('MemberCard error:', error);
      this.showError(error.message);
    }
  },

  /**
   * Öppna med sökning
   */
  search(options = {}) {
    this.mode = options.mode || 'sheet';
    this.onClose = options.onClose || null;

    this.createContainer();
    this.renderSearch();
    this.show();
  },

  /**
   * Stäng medlemskortet
   */
  close() {
    if (this.overlay) {
      this.overlay.classList.remove('mc-visible');
    }
    if (this.container) {
      this.container.classList.remove('mc-visible');
    }

    setTimeout(() => {
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      if (this.onClose) {
        this.onClose();
      }
    }, 300);
  },

  /**
   * Skapa container
   */
  createContainer() {
    // Ta bort eventuell befintlig
    if (this.container) this.container.remove();
    if (this.overlay) this.overlay.remove();

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'mc-overlay';
    this.overlay.addEventListener('click', () => this.close());
    document.body.appendChild(this.overlay);

    // Container
    this.container = document.createElement('div');
    this.container.className = this.mode === 'modal' ? 'mc-modal' : 'mc-sheet';
    document.body.appendChild(this.container);
  },

  /**
   * Visa container
   */
  show() {
    requestAnimationFrame(() => {
      this.overlay?.classList.add('mc-visible');
      this.container?.classList.add('mc-visible');
    });
  },

  /**
   * Visa laddning
   */
  showLoading() {
    this.container.innerHTML = `
      ${this.mode === 'sheet' ? '<div class="mc-handle"></div>' : ''}
      <div class="mc-loading">
        <div class="mc-spinner"></div>
        <div style="margin-top:16px">Laddar...</div>
      </div>
    `;
  },

  /**
   * Visa fel
   */
  showError(message) {
    this.container.innerHTML = `
      ${this.mode === 'sheet' ? '<div class="mc-handle"></div>' : ''}
      <div class="mc-loading">
        <div style="font-size:48px;margin-bottom:16px">&#9888;</div>
        <div style="color:#ef4444">${message}</div>
        <button onclick="MemberCard.close()" style="margin-top:16px;padding:10px 20px;background:#333;border:none;border-radius:8px;color:#fff;cursor:pointer">Stäng</button>
      </div>
    `;
  },

  /**
   * Rendera sökning
   */
  renderSearch() {
    this.container.innerHTML = `
      ${this.mode === 'sheet' ? '<div class="mc-handle"></div>' : ''}
      <div class="mc-header">
        <div class="mc-header-left">
          <button class="mc-close-btn" onclick="MemberCard.close()">&#10005;</button>
          <span class="mc-header-title">Sök medlem</span>
        </div>
      </div>
      <div class="mc-search">
        <input type="text" class="mc-search-input" placeholder="Sök på namn, telefon eller email..." id="mcSearchInput" autocomplete="off">
        <div class="mc-search-results" id="mcSearchResults"></div>
      </div>
    `;

    const input = document.getElementById('mcSearchInput');
    let timeout;

    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const query = e.target.value.trim();

      if (query.length < 2) {
        document.getElementById('mcSearchResults').innerHTML = '';
        return;
      }

      timeout = setTimeout(async () => {
        try {
          const results = await MemberCardAPI.searchMembers(query);
          this.renderSearchResults(results.slice(0, 10));
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 300);
    });

    input.focus();
  },

  /**
   * Rendera sökresultat
   */
  renderSearchResults(members) {
    const container = document.getElementById('mcSearchResults');

    if (members.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Inga träffar</div>';
      return;
    }

    container.innerHTML = members.map(m => `
      <div class="mc-search-item" onclick="MemberCard.open(${m.id}, { mode: '${this.mode}' })">
        <div class="mc-search-avatar">&#128100;</div>
        <div class="mc-search-info">
          <div class="mc-search-name">${this.escapeHtml(m.name || `${m.firstname || ''} ${m.lastname || ''}`.trim())}</div>
          <div class="mc-search-status">ID: ${m.id}</div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Rendera medlemskort
   */
  render(data) {
    const m = data.member;
    const age = data.age;
    const access = data.access;
    const memberships = data.memberships;

    this.container.innerHTML = `
      ${this.mode === 'sheet' ? '<div class="mc-handle"></div>' : ''}

      <div class="mc-header">
        <div class="mc-header-left">
          <button class="mc-close-btn" onclick="MemberCard.close()">&#10005;</button>
          <span class="mc-header-title">Medlemskort</span>
        </div>
        <div class="mc-header-actions">
          <button class="mc-icon-btn" onclick="MemberCard.refresh()" title="Uppdatera">&#8635;</button>
          <button class="mc-icon-btn" onclick="MemberCard.search({ mode: '${this.mode}' })" title="Sök">&#128269;</button>
        </div>
      </div>

      <div class="mc-content">
        <!-- Profil -->
        <div class="mc-profile">
          <div class="mc-avatar">
            ${m.imageKey ? `<img src="https://coregymclub.zoezi.se/api/utils/file/download?key=${m.imageKey}" alt="">` : '&#128100;'}
          </div>
          <div class="mc-profile-info">
            <div class="mc-name">${this.escapeHtml(m.name)}</div>
            <div class="mc-id">Medlem #${m.id} ${m.cardNumber ? `• Kort: ${m.cardNumber}` : ''}</div>
            <div class="mc-badges">
              ${age.isMinor ? '<span class="mc-badge mc-badge-minor">&#128276; Under 18</span>' : ''}
              ${age.isAdult ? '<span class="mc-badge mc-badge-adult">&#9989; Vuxen</span>' : ''}
              ${memberships.active.length > 0 ? '<span class="mc-badge mc-badge-active">Aktivt medlemskap</span>' : '<span class="mc-badge mc-badge-inactive">Inget aktivt</span>'}
              ${m.archived ? '<span class="mc-badge mc-badge-archived">Arkiverad</span>' : ''}
            </div>
          </div>
        </div>

        <!-- Dörraccess -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Dörraccess</span>
          </div>
          <div class="mc-section-content">
            ${this.renderAccess(access.canOpen)}
          </div>
        </div>

        <!-- Kontakt -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Kontaktuppgifter</span>
          </div>
          <div class="mc-section-content">
            <div class="mc-info-grid">
              <div class="mc-info-row">
                <span class="mc-info-label">Telefon</span>
                <span class="mc-info-value">${m.phone ? `<a href="tel:${m.phone}">${m.phone}</a>` : '-'}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Email</span>
                <span class="mc-info-value">${m.email ? `<a href="mailto:${m.email}">${this.escapeHtml(m.email)}</a>` : '-'}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Adress</span>
                <span class="mc-info-value">${m.address ? this.escapeHtml(m.address) : '-'}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Ålder</span>
                <span class="mc-info-value">${age.years !== null ? `${age.years} år` : '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Medlemskap -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Medlemskap</span>
            <span class="mc-section-badge">${memberships.active.length} aktiva</span>
          </div>
          <div class="mc-section-content">
            ${this.renderMemberships(memberships)}
          </div>
        </div>

        <!-- Systeminfo -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Systeminfo</span>
          </div>
          <div class="mc-section-content">
            <div class="mc-info-grid">
              <div class="mc-info-row">
                <span class="mc-info-label">Skapad</span>
                <span class="mc-info-value">${m.created ? this.formatDate(m.created) : '-'}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Upptecknad av</span>
                <span class="mc-info-value mc-editable">
                  ${m.signedUpBy || '-'}
                  <button class="mc-edit-btn" onclick="MemberCard.editSignedUpBy()">&#9998;</button>
                </span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Hemklubb</span>
                <span class="mc-info-value">${this.GYM_NAMES[Object.keys(this.GYM_NAMES)[m.homesite - 1]] || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Journal -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Journal</span>
            <span class="mc-section-badge">${data.journal.length}</span>
          </div>
          <div class="mc-section-content">
            ${this.renderJournal(data.journal)}
          </div>
        </div>

        <!-- Check-in prefs -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Check-in preferenser</span>
          </div>
          <div class="mc-section-content">
            ${this.renderPrefs(data.prefs)}
          </div>
        </div>

        <!-- Besökshistorik -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Senaste besök</span>
            <span class="mc-section-badge">${data.history.length}</span>
          </div>
          <div class="mc-section-content">
            ${this.renderHistory(data.history.slice(0, 5))}
          </div>
        </div>
      </div>

      <div class="mc-action-bar">
        <button class="mc-action-btn" onclick="MemberCard.call()">
          &#128222; Ring
        </button>
        <button class="mc-action-btn" onclick="MemberCard.email()">
          &#9993; Mejla
        </button>
        <button class="mc-action-btn mc-primary" onclick="MemberCard.openDoor()">
          &#128274; Öppna
        </button>
      </div>
    `;
  },

  /**
   * Rendera access (förenklad - visar bara vad de HAR)
   */
  renderAccess(canOpen) {
    const parts = [];

    if (canOpen.vegastaden) {
      parts.push('Alla klubbar');
    } else if (canOpen.tungelsta || canOpen.vasterhaninge) {
      parts.push('Tungelsta + VH');
    } else if (canOpen.ungdom) {
      parts.push('Ungdom');
    }

    if (canOpen.egym) {
      parts.push('EGYM');
    }

    if (parts.length === 0) {
      return '<div class="mc-no-access">Ingen dörraccess</div>';
    }

    return `<div class="mc-access-text">✓ ${parts.join(' + ')}</div>`;
  },

  /**
   * Rendera medlemskap
   */
  renderMemberships(memberships) {
    if (memberships.active.length === 0 && memberships.expired.length === 0) {
      return '<div class="mc-journal-empty">Inga medlemskap</div>';
    }

    let html = '<div class="mc-card-list">';

    // Aktiva
    for (const card of memberships.active) {
      html += `
        <div class="mc-membership-card">
          <div class="mc-membership-header">
            <span class="mc-membership-name">${this.escapeHtml(card.name)}</span>
            <span class="mc-membership-status mc-membership-active">${card.isAutogiro ? 'Autogiro' : 'Aktivt'}</span>
          </div>
          <div class="mc-membership-details">
            ${card.validUntil ? `Giltigt t.o.m. ${card.validUntil}` : 'Löpande'}
            ${card.price ? ` • ${card.price} kr` : ''}
          </div>
          ${card.discount ? `<div class="mc-membership-discount">&#127873; ${card.discount.name} (-${card.discount.amount})</div>` : ''}
          <div class="mc-membership-actions">
            <button class="mc-small-btn" onclick="MemberCard.sendReceipt(${card.id})">&#129534; Skicka kvitto</button>
          </div>
        </div>
      `;
    }

    // Utgångna (kollapsade)
    if (memberships.expired.length > 0) {
      html += `
        <div class="mc-membership-card" style="opacity:0.6">
          <div class="mc-membership-header">
            <span class="mc-membership-name">Tidigare medlemskap (${memberships.expired.length})</span>
            <span class="mc-membership-status mc-membership-expired">Utgångna</span>
          </div>
          <div class="mc-membership-details">
            ${memberships.expired.map(c => c.name).join(', ')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
  },

  /**
   * Rendera journal
   */
  renderJournal(entries) {
    let html = '<div class="mc-journal-list">';

    if (entries.length === 0) {
      html += '<div class="mc-journal-empty">Inga anteckningar</div>';
    } else {
      for (const entry of entries.slice(0, 5)) {
        html += `
          <div class="mc-journal-entry">
            <div class="mc-journal-text">${this.escapeHtml(entry.text || entry.entry)}</div>
            <div class="mc-journal-meta">${entry.staffName || 'Okänd'} • ${this.formatDate(entry.createdAt || entry.date)}</div>
          </div>
        `;
      }
    }

    html += '</div>';
    html += `
      <div class="mc-journal-add">
        <textarea class="mc-journal-input" id="mcJournalInput" placeholder="Lägg till anteckning..." rows="2"></textarea>
        <button class="mc-small-btn" style="margin-top:8px" onclick="MemberCard.addJournal()">Spara</button>
      </div>
    `;

    return html;
  },

  /**
   * Rendera prefs
   */
  renderPrefs(prefs) {
    const p = prefs || {};
    return `
      <div class="mc-prefs-grid">
        <div class="mc-pref-row">
          <span class="mc-pref-label">Visa på skärm vid check-in</span>
          <div class="mc-toggle ${p.showOnScreen !== false ? 'mc-on' : ''}" onclick="MemberCard.togglePref('showOnScreen')"></div>
        </div>
        <div class="mc-pref-row">
          <span class="mc-pref-label">Spela ljud</span>
          <div class="mc-toggle ${p.playSound !== false ? 'mc-on' : ''}" onclick="MemberCard.togglePref('playSound')"></div>
        </div>
        <div class="mc-pref-row">
          <span class="mc-pref-label">Geolocation check-in</span>
          <div class="mc-toggle ${p.geoCheckin ? 'mc-on' : ''}" onclick="MemberCard.togglePref('geoCheckin')"></div>
        </div>
      </div>
    `;
  },

  /**
   * Rendera besökshistorik
   */
  renderHistory(visits) {
    if (visits.length === 0) {
      return '<div class="mc-journal-empty">Inga registrerade besök</div>';
    }

    return `
      <div class="mc-history-list">
        ${visits.map(v => `
          <div class="mc-history-item">
            <span class="mc-history-gym">${this.GYM_NAMES[v.gym] || v.gym || 'Okänt'}</span>
            <span class="mc-history-date">${this.formatDate(v.checkinTime || v.date)}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  /**
   * Uppdatera data
   */
  async refresh() {
    if (!this.currentData) return;

    this.showLoading();
    try {
      await MemberCardAPI.refreshFromZoezi(this.currentData.member.id);
      const data = await MemberCardAPI.getFullMemberCard(this.currentData.member.id);
      this.currentData = data;
      this.render(data);
      this.showToast('Uppdaterat!', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
      this.render(this.currentData);
    }
  },

  /**
   * Skicka kvitto
   */
  async sendReceipt(cardId) {
    if (!this.currentData) return;

    try {
      await MemberCardAPI.sendReceipt(this.currentData.member.id, cardId);
      this.showToast('Kvitto skickat!', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },

  /**
   * Lägg till journal
   */
  async addJournal() {
    const input = document.getElementById('mcJournalInput');
    const text = input?.value?.trim();
    if (!text || !this.currentData) return;

    try {
      // Hämta inloggad användare (om tillgängligt)
      const staffName = localStorage.getItem('cgc_admin_user')
        ? JSON.parse(localStorage.getItem('cgc_admin_user')).name
        : 'Okänd';

      await MemberCardAPI.addJournalEntry(this.currentData.member.id, text, staffName);
      input.value = '';
      this.showToast('Sparat!', 'success');

      // Uppdatera visningen
      const data = await MemberCardAPI.getFullMemberCard(this.currentData.member.id);
      this.currentData = data;
      this.render(data);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },

  /**
   * Toggle pref
   */
  async togglePref(key) {
    if (!this.currentData) return;

    const prefs = this.currentData.prefs || {};
    prefs[key] = !prefs[key];

    try {
      await MemberCardAPI.updatePrefs(this.currentData.member.id, prefs);
      this.currentData.prefs = prefs;
      this.render(this.currentData);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  },

  /**
   * Ring medlem
   */
  call() {
    if (this.currentData?.member?.phone) {
      window.location.href = `tel:${this.currentData.member.phone}`;
    }
  },

  /**
   * Mejla medlem
   */
  email() {
    if (this.currentData?.member?.email) {
      window.location.href = `mailto:${this.currentData.member.email}`;
    }
  },

  /**
   * Öppna dörr (placeholder - behöver integreras med dörrssystem)
   */
  openDoor() {
    this.showToast('Dörröppning inte implementerad här', 'error');
  },

  /**
   * Redigera upptecknad av
   */
  editSignedUpBy() {
    const current = this.currentData?.member?.signedUpBy || '';
    const newValue = prompt('Upptecknad av:', current);
    if (newValue !== null && newValue !== current) {
      // TODO: Implementera API-anrop
      this.showToast('Sparar... (ej implementerat)', 'success');
    }
  },

  /**
   * Visa toast
   */
  showToast(message, type = 'success') {
    const existing = document.querySelector('.mc-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `mc-toast mc-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('mc-visible'));

    setTimeout(() => {
      toast.classList.remove('mc-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },

  /**
   * Formatera datum
   */
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemberCard;
} else if (typeof window !== 'undefined') {
  window.MemberCard = MemberCard;
}
