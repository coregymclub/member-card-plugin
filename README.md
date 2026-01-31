# Member Card Plugin

Återanvändbar medlemskortskomponent för Core Gym admin-appar.

## Installation

Ladda CSS och JS från CDN:

```html
<link rel="stylesheet" href="https://cdn.coregymclub.se/plugins/member-card/member-card.css">
<script src="https://cdn.coregymclub.se/plugins/member-card/member-card-api.js"></script>
<script src="https://cdn.coregymclub.se/plugins/member-card/member-card.js"></script>
```

## Användning

```javascript
// Öppna som bottom sheet
MemberCard.open(12345, { mode: 'sheet' });

// Öppna som modal
MemberCard.open(12345, { mode: 'modal' });

// Öppna med sökning
MemberCard.search({ mode: 'sheet' });

// Med callback vid stängning
MemberCard.open(12345, {
  mode: 'sheet',
  onClose: () => console.log('Stängd!')
});
```

## Krav

- Admin-session cookie (`cgc_admin_session`) för API-autentisering
- Fungerar på alla appar med admin-inloggning

## Funktioner

- **Medlemsinfo**: Namn, kontakt, personnummer, ålder
- **Ålderskontroll**: Visar tydligt om under/över 18
- **Dörraccess**: Vilka gym medlemmen kan öppna
- **Medlemskap**: Aktiva och tidigare, med rabatter
- **Kvittofunktion**: Skicka kvitto per email
- **Journal**: Läs och skriv anteckningar
- **Check-in prefs**: Hantera medlemmens preferenser
- **Besökshistorik**: Senaste besöken
- **Upptecknad av**: Vem som registrerade medlemmen

## API Endpoints

Pluginen använder följande API:er:

- `api.coregym.club/member/:id` - Medlemsdata
- `api.coregym.club/member/:id/access` - Access och medlemskap
- `stats.coregym.club/member/:id/*` - Stats, prefs, historik

## Utveckling

```bash
# Testa lokalt
open test.html
```

## Filer

- `member-card.js` - Huvudkomponent
- `member-card-api.js` - API-hjälpare
- `member-card.css` - Styling
- `test.html` - Testfil
