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
              ${this.renderProfileBadges(m, age, memberships)}
            </div>
          </div>
        </div>

        <!-- Inpassering -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Inpassering</span>
          </div>
          <div class="mc-section-content">
            <div class="mc-info-grid">
              <div class="mc-info-row">
                <span class="mc-info-label">Behörighet</span>
                <span class="mc-info-value">${this.renderAccessText(access.canOpen)}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">Kort-access</span>
                <span class="mc-info-value">${m.cardNumber ? `<span style="color:#22c55e">✓ ${m.cardNumber}</span>` : '<span style="color:#888">Inget kort</span>'}</span>
              </div>
              <div class="mc-info-row">
                <span class="mc-info-label">App-access</span>
                <span class="mc-info-value">${data.push?.hasSubscription ? '<span style="color:#22c55e">✓ Installerad</span>' : '<span style="color:#888">Ej aktiverad</span>'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistik (samma som visas på kiosk) -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Statistik</span>
          </div>
          <div class="mc-section-content">
            ${this.renderStats(data.stats)}
          </div>
        </div>

        <!-- Senaste inpasseringar -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Senaste inpasseringar</span>
          </div>
          <div class="mc-section-content">
            ${this.renderHistory(data.history.slice(0, 10))}
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
                <span class="mc-info-value">
                  ${age.years !== null ? `${age.years} år` : '-'}
                  ${age.birthday ? `<span class="mc-info-sub">(${age.birthday})</span>` : ''}
                  ${age.missingPersonalNumber ? '<span class="mc-badge mc-badge-warning">Saknar personnummer</span>' : ''}
                </span>
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

        <!-- Push-notis -->
        <div class="mc-section">
          <div class="mc-section-header">
            <span class="mc-section-title">Push-notis</span>
            ${data.push?.hasSubscription
              ? `<span class="mc-section-badge mc-badge-success">&#128276; Aktiv</span>`
              : `<span class="mc-section-badge mc-badge-muted">Ej aktiverad</span>`
            }
          </div>
          <div class="mc-section-content">
            ${this.renderPushSection(data.push)}
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
   * Rendera profil-badges (AG, pris, hemmaklubb, etc)
   */
  renderProfileBadges(member, age, memberships) {
    const badges = [];

    // Under 18 varning
    if (age.isMinor) {
      badges.push('<span class="mc-badge mc-badge-minor">-18</span>');
    }

    // Arkiverad
    if (member.archived) {
      badges.push('<span class="mc-badge mc-badge-archived">Arkiverad</span>');
      return badges.join('');
    }

    // Hemmaklubb
    const homeClub = this.SITE_NAMES[member.homesite];
    if (homeClub) {
      const shortName = homeClub.substring(0, 4).toUpperCase();
      badges.push(`<span class="mc-badge mc-badge-club">${shortName}</span>`);
    }

    // Aktivt medlemskap - visa AG + pris
    if (memberships.active.length > 0) {
      const card = memberships.active[0]; // Första aktiva kortet

      // Autogiro badge
      if (card.isAutogiro) {
        badges.push('<span class="mc-badge mc-badge-ag">AG</span>');
      }

      // Pris badge
      if (card.price) {
        badges.push(`<span class="mc-badge mc-badge-price">${Math.round(card.price)} kr</span>`);
      }

      // Rabatt
      if (card.discount) {
        badges.push(`<span class="mc-badge mc-badge-discount">${card.discount.name}</span>`);
      }
    } else {
      badges.push('<span class="mc-badge mc-badge-inactive">Inaktiv</span>');
    }

    return badges.join('');
  },

  /**
   * Rendera access-text (förenklad - visar bara vad de HAR)
   */
  renderAccessText(canOpen) {
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
      return '<span style="color:#ef4444">Ingen</span>';
    }

    return `<span style="color:#22c55e">${parts.join(' + ')}</span>`;
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
            <button class="mc-small-btn" onclick="MemberCard.showReceiptDialog(${card.id})">&#129534; Skicka kvitto</button>
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
   * Rendera push-sektion
   */
  renderPushSection(pushData) {
    const hasSubscription = pushData?.hasSubscription;
    const deviceCount = pushData?.deviceCount || 0;

    if (!hasSubscription) {
      return `
        <div class="mc-push-disabled">
          <p style="color:#888;margin:0">Medlemmen har inte aktiverat push-notiser i appen.</p>
        </div>
      `;
    }

    return `
      <div class="mc-push-form">
        <div class="mc-push-status">
          <span style="color:#22c55e">&#10003; ${deviceCount} enhet${deviceCount > 1 ? 'er' : ''} registrerad${deviceCount > 1 ? 'e' : ''}</span>
        </div>

        <div class="mc-form-group">
          <label class="mc-form-label">Titel</label>
          <input type="text" class="mc-form-input" id="mcPushTitle" value="Core Gym 💪" placeholder="Titel">
        </div>

        <div class="mc-form-group">
          <label class="mc-form-label">Meddelande</label>
          <textarea class="mc-form-textarea" id="mcPushBody" rows="2" placeholder="Skriv ditt meddelande..."></textarea>
        </div>

        <div class="mc-push-timing">
          <label class="mc-radio-label">
            <input type="radio" name="mcPushTiming" value="now" checked onchange="MemberCard.togglePushTiming()">
            <span>Skicka direkt</span>
          </label>
          <label class="mc-radio-label">
            <input type="radio" name="mcPushTiming" value="scheduled" onchange="MemberCard.togglePushTiming()">
            <span>Schemalägg</span>
          </label>
        </div>

        <div class="mc-push-schedule" id="mcPushSchedule" style="display:none">
          <input type="datetime-local" class="mc-form-input" id="mcPushScheduleTime">
        </div>

        <button class="mc-btn mc-btn-primary mc-push-send-btn" onclick="MemberCard.sendPush()">
          &#128276; Skicka push
        </button>
      </div>
    `;
  },

  /**
   * Toggle push timing (direkt/schemalägg)
   */
  togglePushTiming() {
    const scheduled = document.querySelector('input[name="mcPushTiming"][value="scheduled"]')?.checked;
    const scheduleEl = document.getElementById('mcPushSchedule');
    if (scheduleEl) {
      scheduleEl.style.display = scheduled ? 'block' : 'none';

      // Sätt default tid till 1 timme framåt
      if (scheduled) {
        const timeInput = document.getElementById('mcPushScheduleTime');
        if (timeInput && !timeInput.value) {
          const now = new Date();
          now.setHours(now.getHours() + 1);
          now.setMinutes(0);
          timeInput.value = now.toISOString().slice(0, 16);
        }
      }
    }
  },

  /**
   * Skicka push-notis
   */
  async sendPush() {
    if (!this.currentData) return;

    const memberId = this.currentData.member.id;
    const title = document.getElementById('mcPushTitle')?.value?.trim();
    const body = document.getElementById('mcPushBody')?.value?.trim();
    const isScheduled = document.querySelector('input[name="mcPushTiming"][value="scheduled"]')?.checked;
    const scheduleTime = document.getElementById('mcPushScheduleTime')?.value;

    if (!body) {
      this.showToast('Skriv ett meddelande', 'error');
      return;
    }

    try {
      const PUSH_API = 'https://coregym-push-api.gustav-brydner.workers.dev';

      if (isScheduled && scheduleTime) {
        // Schemalägg (om API stödjer det)
        const res = await fetch(`${PUSH_API}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            title: title || 'Core Gym 💪',
            body,
            scheduledFor: new Date(scheduleTime).toISOString()
          })
        });

        if (!res.ok) {
          // Fallback: skicka direkt om schedule inte stöds
          throw new Error('Schemaläggning stöds inte ännu');
        }

        const data = await res.json();
        this.showToast(`Schemalagd till ${new Date(scheduleTime).toLocaleString('sv-SE')}`, 'success');
      } else {
        // Skicka direkt
        const res = await fetch(`${PUSH_API}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: memberId,
            title: title || 'Core Gym 💪',
            body
          })
        });

        const data = await res.json();

        if (data.sent > 0 || data.success) {
          this.showToast('Push skickad!', 'success');
          // Rensa formuläret
          const bodyInput = document.getElementById('mcPushBody');
          if (bodyInput) bodyInput.value = '';
        } else {
          this.showToast(data.error || 'Kunde inte skicka', 'error');
        }
      }
    } catch (error) {
      console.error('Push error:', error);
      this.showToast(error.message || 'Något gick fel', 'error');
    }
  },

  /**
   * Rendera statistik (samma som kiosk visar)
   */
  renderStats(stats) {
    if (!stats) {
      return '<div class="mc-journal-empty">Ingen statistik</div>';
    }

    return `
      <div class="mc-stats-grid">
        <div class="mc-stat-item">
          <div class="mc-stat-value">${stats.total || stats.totalVisits || 0}</div>
          <div class="mc-stat-label">Totalt</div>
        </div>
        <div class="mc-stat-item">
          <div class="mc-stat-value">${stats.thisMonth || stats.monthVisits || 0}</div>
          <div class="mc-stat-label">Denna månad</div>
        </div>
        <div class="mc-stat-item">
          <div class="mc-stat-value">${stats.thisYear || 0}</div>
          <div class="mc-stat-label">I år</div>
        </div>
        <div class="mc-stat-item">
          <div class="mc-stat-value">${stats.streak || stats.weekAvg || '-'}</div>
          <div class="mc-stat-label">Streak</div>
        </div>
      </div>
    `;
  },

  // Site ID till gym-namn mappning
  SITE_NAMES: {
    1: 'Vegastaden',
    2: 'Tungelsta',
    3: 'Västerhaninge',
    4: 'EGYM'
  },

  // SVG ikoner för sources (inline SVG för bättre kontroll)
  SOURCE_ICONS: {
    'mobile-shake': { icon: 'mobile', color: '#22c55e', title: 'Shake check-in (mobil)' },
    'mobile-twofinger': { icon: 'mobile', color: '#22c55e', title: 'Two-finger tap (mobil)' },
    'mobile-location': { icon: 'location', color: '#3b82f6', title: 'Geolocation (mobil)' },
    'mobile': { icon: 'mobile', color: '#22c55e', title: 'Mobil check-in' },
    'mobile-focus': { icon: 'mobile', color: '#22c55e', title: 'Mobil träningspass' },
    'kiosk': { icon: 'screen', color: '#a855f7', title: 'Skärm (kiosk)' },
    'kiosk-api': { icon: 'screen', color: '#a855f7', title: 'Skärm (kiosk API)' },
    'kiosk-card': { icon: 'card', color: '#f59e0b', title: 'Kort på kiosk' },
    'kiosk-phone': { icon: 'mobile', color: '#22c55e', title: 'Telefon på kiosk' },
    'card': { icon: 'card', color: '#f59e0b', title: 'Kort' },
    'door': { icon: 'door', color: '#ef4444', title: 'Dörr (utan skärm)' },
    'door_entry': { icon: 'door', color: '#ef4444', title: 'Dörr-entry' },
    'ninja': { icon: 'door', color: '#ef4444', title: 'Dörr-entry (ninja)' },
    'screen': { icon: 'screen', color: '#a855f7', title: 'Skärm check-in' },
    'staff': { icon: 'user', color: '#6b7280', title: 'Personal check-in' },
    'backfill': { icon: 'download', color: '#6b7280', title: 'Backfill (importerad)' },
    'unknown': { icon: 'question', color: '#6b7280', title: 'Okänd källa' }
  },

  // SVG paths för ikoner
  SVG_PATHS: {
    mobile: 'M7 2a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2H7zm5 18a1 1 0 100-2 1 1 0 000 2z',
    screen: 'M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm6 12h4v2h-4v-2z',
    card: 'M4 4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 4h16v2H4V8zm0 4h8v4H4v-4z',
    door: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm11 8a1 1 0 100-2 1 1 0 000 2z',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z',
    location: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
    download: 'M12 2v12m0 0l-4-4m4 4l4-4M4 18h16',
    question: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 14a1 1 0 110 2 1 1 0 010-2zm1-3v1h-2v-2a2 2 0 114 0h-2z'
  },

  /**
   * Generera SVG ikon
   */
  renderSvgIcon(iconName, color, size = 18) {
    const path = this.SVG_PATHS[iconName] || this.SVG_PATHS.question;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" style="flex-shrink:0"><path d="${path}"/></svg>`;
  },

  /**
   * Hämta ikon HTML för source
   */
  getSourceIconHtml(source) {
    const s = (source || 'unknown').toLowerCase();
    const info = this.SOURCE_ICONS[s] || this.SOURCE_ICONS['unknown'];
    return {
      html: this.renderSvgIcon(info.icon, info.color, 18),
      title: info.title
    };
  },

  /**
   * Rendera besökshistorik
   */
  renderHistory(visits) {
    if (!visits || visits.length === 0) {
      return '<div class="mc-journal-empty">Inga registrerade besök</div>';
    }

    // Filtrera bort duplikat och backfill (samma timestamp inom 5 sekunder)
    const seen = new Set();
    const filtered = visits.filter(v => {
      const timestamp = new Date(v.checkinTime || v.date).getTime();
      // Runda av till 5 sekunder för att hitta duplikat
      const roundedTime = Math.floor(timestamp / 5000);
      const key = `${v.site || v.gym}-${roundedTime}`;

      // Hoppa över backfill om vi redan har en riktig entry
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return `
      <div class="mc-history-list">
        ${filtered.map(v => {
          // Hantera både site (nummer) och gym (sträng)
          const gymName = v.site
            ? (this.SITE_NAMES[v.site] || v.siteName || `Gym ${v.site}`)
            : (this.GYM_NAMES[v.gym] || v.gym || 'Okänt');

          // Source-ikon (SVG)
          const sourceInfo = this.getSourceIconHtml(v.source);

          return `
            <div class="mc-history-item">
              <span class="mc-history-source" title="${sourceInfo.title}">${sourceInfo.html}</span>
              <span class="mc-history-gym">${gymName}</span>
              <span class="mc-history-date">${this.formatDate(v.checkinTime || v.date)}</span>
              ${v.duration ? `<span class="mc-history-duration">${v.duration} min</span>` : ''}
            </div>
          `;
        }).join('')}
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
   * Visa dialog för att välja kvittoperiod
   */
  showReceiptDialog(cardId) {
    if (!this.currentData) return;

    const today = new Date();
    const yearStart = `${today.getFullYear()}-01-01`;
    const todayStr = today.toISOString().split('T')[0];
    const lastYearStart = `${today.getFullYear() - 1}-01-01`;
    const lastYearEnd = `${today.getFullYear() - 1}-12-31`;

    // Skapa dialog
    const dialog = document.createElement('div');
    dialog.className = 'mc-receipt-dialog';
    dialog.innerHTML = `
      <div class="mc-receipt-dialog-content">
        <div class="mc-receipt-dialog-header">
          <h3>Skicka kvitto</h3>
          <button class="mc-receipt-dialog-close" onclick="this.closest('.mc-receipt-dialog').remove()">&times;</button>
        </div>
        <div class="mc-receipt-dialog-body">
          <p>Välj period för kvittot:</p>
          <div class="mc-receipt-options">
            <button class="mc-receipt-option mc-receipt-option-selected" data-from="${yearStart}" data-to="${todayStr}">
              <strong>Årskvitto ${today.getFullYear()}</strong>
              <span>${yearStart} - ${todayStr}</span>
            </button>
            <button class="mc-receipt-option" data-from="${lastYearStart}" data-to="${lastYearEnd}">
              <strong>Hela ${today.getFullYear() - 1}</strong>
              <span>${lastYearStart} - ${lastYearEnd}</span>
            </button>
            <button class="mc-receipt-option" data-custom="true">
              <strong>Anpassad period</strong>
              <span>Välj datum</span>
            </button>
          </div>
          <div class="mc-receipt-custom-dates" style="display:none">
            <label>Från: <input type="date" id="mcReceiptFrom" value="${yearStart}"></label>
            <label>Till: <input type="date" id="mcReceiptTo" value="${todayStr}"></label>
          </div>
        </div>
        <div class="mc-receipt-dialog-footer">
          <button class="mc-btn mc-btn-secondary" onclick="this.closest('.mc-receipt-dialog').remove()">Avbryt</button>
          <button class="mc-btn mc-btn-primary" id="mcSendReceiptBtn">Skicka kvitto</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Hantera val av period
    let selectedFrom = yearStart;
    let selectedTo = todayStr;

    dialog.querySelectorAll('.mc-receipt-option').forEach(btn => {
      btn.addEventListener('click', () => {
        dialog.querySelectorAll('.mc-receipt-option').forEach(b => b.classList.remove('mc-receipt-option-selected'));
        btn.classList.add('mc-receipt-option-selected');

        if (btn.dataset.custom) {
          dialog.querySelector('.mc-receipt-custom-dates').style.display = 'flex';
          selectedFrom = dialog.querySelector('#mcReceiptFrom').value;
          selectedTo = dialog.querySelector('#mcReceiptTo').value;
        } else {
          dialog.querySelector('.mc-receipt-custom-dates').style.display = 'none';
          selectedFrom = btn.dataset.from;
          selectedTo = btn.dataset.to;
        }
      });
    });

    // Uppdatera custom dates
    dialog.querySelector('#mcReceiptFrom')?.addEventListener('change', (e) => {
      selectedFrom = e.target.value;
    });
    dialog.querySelector('#mcReceiptTo')?.addEventListener('change', (e) => {
      selectedTo = e.target.value;
    });

    // Skicka kvitto
    dialog.querySelector('#mcSendReceiptBtn').addEventListener('click', async () => {
      dialog.remove();
      await this.sendReceipt(cardId, selectedFrom, selectedTo);
    });
  },

  /**
   * Skicka kvitto
   */
  async sendReceipt(cardId, fromDate, toDate) {
    if (!this.currentData) return;

    try {
      await MemberCardAPI.sendReceipt(this.currentData.member.id, cardId, { fromDate, toDate });
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
