/**
 * Member Card API Helper
 * Hanterar all datahämtning för medlemskortet
 */

const MemberCardAPI = {
  // API endpoints
  MEMBERS_API: 'https://api.coregym.club',
  STATS_API: 'https://stats.coregym.club',
  PUSH_API: 'https://push.coregym.club',

  /**
   * Beräkna ålder från personnummer eller födelsedatum
   */
  calculateAge(personalCodeNumber, birthDate) {
    let birthYear, birthMonth, birthDay;

    if (personalCodeNumber && personalCodeNumber.length >= 8) {
      // Format: YYYYMMDDXXXX eller YYMMDDXXXX
      const pnr = personalCodeNumber.replace('-', '');
      if (pnr.length >= 12) {
        birthYear = parseInt(pnr.substring(0, 4));
        birthMonth = parseInt(pnr.substring(4, 6));
        birthDay = parseInt(pnr.substring(6, 8));
      } else if (pnr.length >= 10) {
        const yy = parseInt(pnr.substring(0, 2));
        // Dynamisk gräns: om yy > nuvarande år + 1, anta 1900-tal
        const currentYearShort = new Date().getFullYear() % 100;
        birthYear = yy > currentYearShort + 1 ? 1900 + yy : 2000 + yy;
        birthMonth = parseInt(pnr.substring(2, 4));
        birthDay = parseInt(pnr.substring(4, 6));
      }
    } else if (birthDate) {
      const d = new Date(birthDate);
      birthYear = d.getFullYear();
      birthMonth = d.getMonth() + 1;
      birthDay = d.getDate();
    }

    if (!birthYear) return null;

    const today = new Date();
    let age = today.getFullYear() - birthYear;
    const monthDiff = today.getMonth() + 1 - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }

    return age;
  },

  /**
   * Hämta grundläggande medlemsinfo
   */
  async getMember(memberId) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Kunde inte hämta medlem');
    return res.json();
  },

  /**
   * Hämta access-data (dörrar, medlemskap, etc)
   */
  async getAccess(memberId) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/access`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta statistik (besök, etc)
   * OBS: Ingen credentials - stats API är publikt och stödjer inte credentials med wildcard CORS
   */
  async getStats(memberId) {
    const res = await fetch(`${this.STATS_API}/member/${memberId}/stats`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta onboarding-status
   */
  async getOnboarding(memberId) {
    const res = await fetch(`${this.STATS_API}/member/${memberId}/onboarding`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta preferenser
   */
  async getPrefs(memberId) {
    const res = await fetch(`${this.STATS_API}/member/${memberId}/prefs`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta besökshistorik
   */
  async getHistory(memberId) {
    const res = await fetch(`${this.STATS_API}/member/${memberId}/history`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta journal/anteckningar
   */
  async getJournal(memberId) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/journal`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta push-subscription status från push-servicen
   */
  async getPushStatus(memberId) {
    const res = await fetch(`${this.PUSH_API}/member/${memberId}/subscription`);
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Hämta all data för medlemskortet
   */
  async getFullMemberCard(memberId) {
    // Hämta allt parallellt
    const [member, access, stats, onboarding, prefs, history, journal, pushStatus] = await Promise.all([
      this.getMember(memberId),
      this.getAccess(memberId).catch(() => null),
      this.getStats(memberId).catch(() => null),
      this.getOnboarding(memberId).catch(() => null),
      this.getPrefs(memberId).catch(() => null),
      this.getHistory(memberId).catch(() => null),
      this.getJournal(memberId).catch(() => null),
      this.getPushStatus(memberId).catch(() => null)
    ]);

    // Beräkna ålder (Zoezi använder 'birthday' fältet)
    const age = this.calculateAge(member.personalCodeNumber, member.birthday);
    const isMinor = age !== null && age < 18;
    const missingPersonalNumber = !member.personalCodeNumber;

    // Filtrera giltiga medlemskap
    const today = new Date().toISOString().split('T')[0];
    const trainingcards = access?.trainingcards || [];
    const activeCards = trainingcards.filter(tc => {
      if (!tc.validUntil) return true;
      return tc.validUntil >= today;
    });
    const expiredCards = trainingcards.filter(tc => {
      if (!tc.validUntil) return false;
      return tc.validUntil < today;
    });

    // Sammanställ canOpen
    const canOpen = access?.canOpen || {};
    const accessibleGyms = Object.entries(canOpen)
      .filter(([_, hasAccess]) => hasAccess)
      .map(([gym]) => gym);

    return {
      member: {
        id: member.id,
        name: member.name || `${member.firstname || ''} ${member.lastname || ''}`.trim(),
        firstName: member.firstname,
        lastName: member.lastname,
        email: member.email || member.mail,
        phone: member.phone || member.mobile,
        personalNumber: member.personalCodeNumber,
        address: member.address,
        zipcode: member.zipcode,
        cardNumber: member.cardNumber,
        imageKey: member.imagekey || member.image,
        created: member.created,
        homesite: member.homesite_id,
        archived: member.archived,
        signedUpBy: member.signedUpBy || member.createdBy
      },
      age: {
        years: age,
        birthday: member.birthday || null,
        isMinor: isMinor,
        isAdult: age !== null && age >= 18,
        missingPersonalNumber: missingPersonalNumber
      },
      memberships: {
        active: activeCards.map(tc => ({
          id: tc.id,
          name: tc.cardtype_name,
          cardtypeId: tc.cardtype_id,
          validFrom: tc.validFrom,
          validUntil: tc.validUntil,
          isAutogiro: !tc.validUntil,
          price: tc.price,
          payMethod: tc.payMethod,
          discount: tc.discount ? {
            name: tc.discount.name,
            amount: tc.discount.fixed || `${tc.discount.percent}%`
          } : null
        })),
        expired: expiredCards.map(tc => ({
          id: tc.id,
          name: tc.cardtype_name,
          validFrom: tc.validFrom,
          validUntil: tc.validUntil
        }))
      },
      access: {
        canOpen: canOpen,
        accessibleGyms: accessibleGyms,
        door: access?.door || {},
        booking: access?.booking || {}
      },
      stats: stats,
      onboarding: onboarding,
      prefs: prefs,
      history: history?.history || history?.visits || history || [],
      journal: journal?.entries || journal || [],
      push: pushStatus
    };
  },

  /**
   * Uppdatera journal
   */
  async addJournalEntry(memberId, entry, staffName) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/journal`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry, staffName })
    });
    if (!res.ok) throw new Error('Kunde inte spara anteckning');
    return res.json();
  },

  /**
   * Uppdatera access
   */
  async updateAccess(memberId, accessData, staffName, reason) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/access`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        door: accessData,
        updatedBy: staffName,
        reason: reason
      })
    });
    if (!res.ok) throw new Error('Kunde inte uppdatera access');
    return res.json();
  },

  /**
   * Uppdatera prefs
   */
  async updatePrefs(memberId, prefs) {
    const res = await fetch(`${this.STATS_API}/member/${memberId}/prefs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    });
    if (!res.ok) throw new Error('Kunde inte uppdatera preferenser');
    return res.json();
  },

  /**
   * Hämta kvittohistorik
   */
  async getReceipts(memberId, months = 12) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/receipts?months=${months}`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  },

  /**
   * Skicka kvitto (hämtar PDF från Zoezi, skickar via Resend)
   */
  async sendReceipt(memberId, trainingcardId, options = {}) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/receipt/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainingcardId,
        fromDate: options.fromDate,
        toDate: options.toDate,
        email: options.email
      })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Kunde inte skicka kvitto');
    }
    return res.json();
  },

  /**
   * Hämta kvitto-PDF URL
   */
  getReceiptDownloadUrl(memberId, trainingcardId, fromDate, toDate) {
    let url = `${this.MEMBERS_API}/member/${memberId}/receipt/${trainingcardId}/download`;
    if (fromDate) url += `?fromDate=${fromDate}&toDate=${toDate || new Date().toISOString().split('T')[0]}`;
    return url;
  },

  /**
   * Refresha från Zoezi
   */
  async refreshFromZoezi(memberId) {
    const res = await fetch(`${this.MEMBERS_API}/member/${memberId}/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Kunde inte uppdatera från Zoezi');
    return res.json();
  },

  /**
   * Sök medlemmar
   */
  async searchMembers(query) {
    const res = await fetch(`${this.MEMBERS_API}/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Sökning misslyckades');
    const data = await res.json();
    return data.results || data.members || data;
  }
};

// Export för olika miljöer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MemberCardAPI;
} else if (typeof window !== 'undefined') {
  window.MemberCardAPI = MemberCardAPI;
}
