/* Wild Bowls self-order kiosk – clickable prototype (v2).
   Journey: Splash → Dine in / Take away → Wild Club → Menu (+ My Offers, Scan) → Item → Customise
            → My Orders (tips, upsell, promo, coupons, loyalty) → Payment → Thank you → Receipt */

const $stage = document.getElementById('stage');
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
for (const s of SCAN_ITEMS) byId[s.id] = { ...s, type: 'drink', cat: [], desc: s.sub, scanned: true };

const fmt = (n) => 'CHF ' + n.toFixed(2);
const pts = (n) => Math.round(n).toLocaleString('de-CH').replace(/’/g, "'");
const ic = (name, cls = '') => `<span class="ms ${cls}">${name}</span>`;
/* related-suggestion summary: "Wild Combo: treat & drink" when both, otherwise "+ item" */
const suggestionText = (mm) => {
  const side = MENU_SIDES.find((x) => x.id === mm.side)?.name, drink = MENU_DRINKS.find((x) => x.id === mm.drink)?.name;
  return (side && drink ? `Wild Combo: ${side} & ${drink}` : `+ ${side || drink}`) + (mm.coffee ? ' + coffee' : '');
};
const isCustom = (it) => CUSTOM_TYPES.includes(it.type);              // opens the customise stepper
const isBowl = (it) => ['acai', 'hearty'].includes(it.type) || !!it.bowl;   // coupon scope
const baseOf = (it, id) => it.bases?.opts.find((b) => b.id === id);
const extrasFor = (it) => EXTRAS.filter((e) => e.for.includes(it.type));
const imgTag = (name, filter, alt = '') => `<img src="${IMG(name)}" alt="${alt}" ${filter ? `style="filter:${filter}"` : ''}>`;
/* member avatar: photo when there is one, otherwise the initial */
const avatarIn = (m) => (m.photo ? `<img src="${IMG(m.photo)}" alt="${m.name}">` : m.name[0]);
const thumb = (it) => it.img ? imgTag(it.img, it.filter, it.name)
  : `<span class="ph" style="--c:${it.color || '#E2E8DF'}">${ic(it.icon || 'local_drink', 'fill')}</span>`;

const bundleGroups = (it) => (it.groups || []).map((g) => ({ ...g, opts: g.opts === 'menuSides' ? MENU_SIDES : g.opts === 'menuDrinks' ? MENU_DRINKS : g.opts }));
const optThumb = (o) => o.img ? imgTag(o.img, o.filter) : `<span class="ms">${o.icon}</span>`;

const fresh = () => ({
  screen: 'splash', orderType: null, member: null, cart: [], cat: 'popular',
  modal: null, cz: null, pay: null, orderNo: null, receipt: null, returnTo: null, lang: 'EN',
  tip: null, promo: null, coupon: null, loyalty: null, claimed: ['c-treat'], mayLikeOpen: true, scan: null,
});
let S = fresh();
let prev = { screen: null, modal: null, count: 0 };
let uid = 1;

/* ---------------- pricing ---------------- */
function lineKey(l) { return JSON.stringify([l.itemId, l.mods, l.reward || 0]); }
function unitPrice(item, mods) {
  if (!mods) return item.price;
  let p = item.price;
  p += baseOf(item, mods.base)?.price || 0;
  for (const [id, q] of Object.entries(mods.extras || {})) p += (EXTRAS.find((e) => e.id === id)?.price || 0) * q;
  if (mods.menu) {   // related suggestions: treat + drink together = Wild Combo price; a single pick = its own menu price
    const { side, drink } = mods.menu;
    if (side && drink) p += MENU_PRICE + (MENU_SIDES.find((s) => s.id === side)?.price || 0) + (MENU_DRINKS.find((d) => d.id === drink)?.price || 0);
    else p += byId[side || drink]?.price || 0;
    if (mods.menu.coffee) p += MENU_COFFEE;
  }
  if (mods.picks) {
    for (const g of bundleGroups(item)) p += g.opts.find((o) => o.id === mods.picks[g.key])?.price || 0;
    if (mods.coffee) p += MENU_COFFEE;
  }
  return p;
}
function modsText(item, mods) {
  if (!mods) return '';
  const out = [];
  const base = baseOf(item, mods.base); if (base) out.push(base.name);
  for (const [id, q] of Object.entries(mods.extras || {})) if (q) out.push(`${q > 1 ? q + '× ' : '+ '}${EXTRAS.find((e) => e.id === id).name}`);
  for (const r of mods.removed || []) out.push('No ' + r.toLowerCase());
  if (mods.menu) out.push(suggestionText(mods.menu));
  if (mods.picks) {
    out.push(...bundleGroups(item).map((g) => g.opts.find((o) => o.id === mods.picks[g.key]).name));
    if (item.included) out.push(item.included);
    if (mods.coffee) out.push('+ Coffee');
  }
  return out.join(' · ');
}
const paidLines = () => S.cart.filter((l) => !l.reward);
const cartCount = () => S.cart.reduce((a, l) => a + l.qty, 0);
const itemsTotal = () => paidLines().reduce((a, l) => a + l.unit * l.qty, 0);
const rewardValue = () => S.cart.reduce((a, l) => a + (l.reward ? byId[l.itemId].price * l.qty : 0), 0);
function couponDisc() {
  const c = COUPONS.find((x) => x.id === S.coupon); if (!c) return 0;
  if (c.chf) return paidLines().some((l) => isBowl(byId[l.itemId])) ? c.chf : 0;
  const scope = paidLines().filter((l) => (c.scope === 'bowl' ? isBowl(byId[l.itemId]) : byId[l.itemId].type === 'drink'));
  return scope.reduce((a, l) => a + l.unit * l.qty, 0) * c.pct / 100;
}
const promoDisc = () => { const p = PROMO_CODES[S.promo]; if (!p) return 0; return p.chf ? Math.min(p.chf, itemsTotal()) : itemsTotal() * p.pct / 100; };
const loyaltyDisc = () => { const d = LOYALTY_DISCOUNTS.find((x) => x.id === S.loyalty); if (!d) return 0; return d.chf ? Math.min(d.chf, itemsTotal()) : itemsTotal() * d.pct / 100; };
const discounted = () => Math.max(0, itemsTotal() - couponDisc() - promoDisc() - loyaltyDisc());
function tipAmount() {
  if (!S.tip) return 0;
  return S.tip.pct ? Math.round(discounted() * S.tip.pct) / 100 : S.tip.chf;
}
const total = () => discounted() + tipAmount();
const earnPoints = () => Math.round(discounted() * POINTS_PER_CHF);
const pointsUsed = () => S.cart.reduce((a, l) => a + (l.reward || 0) * l.qty, 0) + (LOYALTY_DISCOUNTS.find((x) => x.id === S.loyalty)?.cost || 0);
const avail = () => (S.member ? S.member.points - pointsUsed() : 0);
function tierOf(p) { let t = 0; TIERS.forEach((x, i) => { if (p >= x.at) t = i; }); return t; }

function addToCart(itemId, mods = null, qty = 1, reward = 0, silent = false) {
  const item = byId[itemId];
  const line = { uid: uid++, itemId, mods, qty, unit: unitPrice(item, mods), reward };
  const ex = S.cart.find((l) => lineKey(l) === lineKey(line));
  if (ex) ex.qty += qty; else S.cart.push(line);
  if (!silent) toast(item, reward ? 'Reward added to your order' : `${qty > 1 ? qty + '× ' : ''}${item.name} added`);
}

/* ---------------- micro-interactions ---------------- */
let toastT;
function toast(item, text, icon = 'check_circle') {
  clearTimeout(toastT);
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `${item && item.img ? imgTag(item.img, item.filter) : ''}${ic(icon, 'fill')}<span>${text}</span>`;
  $stage.appendChild(el);
  toastT = setTimeout(() => el.remove(), 2600);
}
/* image flies from the tapped card into the cart bar */
function flyFrom(srcEl) {
  const img = srcEl?.closest('.pp, .card, .like, .sheet, .rw')?.querySelector('img');
  const bag = $stage.querySelector('.pp-bar .bag') || $stage.querySelector('.cartbar .bag, .ord-head .bag');
  if (!img || !bag) return;
  const st = $stage.getBoundingClientRect(), k = st.width / 1080;
  const a = img.getBoundingClientRect(), b = bag.getBoundingClientRect();
  const c = img.cloneNode(); c.className = 'flyer';
  Object.assign(c.style, { left: (a.left - st.left) / k + 'px', top: (a.top - st.top) / k + 'px', width: a.width / k + 'px', height: a.height / k + 'px' });
  $stage.appendChild(c);
  const dx = (b.left + b.width / 2 - a.left - a.width / 2) / k, dy = (b.top + b.height / 2 - a.top - a.height / 2) / k;
  c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * .5}px, ${dy * .5 - 160}px) scale(.55)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: .2 }], { duration: 700, easing: 'cubic-bezier(.5,0,.4,1)' }).onfinish = () => c.remove();
}
function countUp(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const to = +el.dataset.count, t0 = performance.now(), dur = 900;
    const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = pts(to * e) + (el.dataset.suffix || ''); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function stagger(root) {
  root.querySelectorAll('.stagger').forEach((g) => [...g.children].forEach((c, i) => { c.style.setProperty('--i', i); c.classList.add('rise'); }));
}

/* ---------------- navigation ---------------- */
function go(screen, extra = {}) { Object.assign(S, { screen, modal: null }, extra); render(true); }
function modal(m) { S.modal = m; render(); }
function closeModal() { S.modal = null; render(); }
function reset() { clearInterval(doneTimer); clearInterval(payTimer); S = fresh(); render(true); }

/* ---------------- shared pieces ---------------- */
function header({ back = null, showChip = true } = {}) {
  /* user button: member photo when signed in (opens the profile), otherwise a person icon (goes to sign-in) */
  const user = S.member
    ? `<button class="icon-btn user-btn member" aria-label="${S.member.name}'s Wild Club profile" onclick="A.modal({type:'profile'})"><span class="av">${avatarIn(S.member)}</span></button>`
    : `<button class="icon-btn user-btn" aria-label="Sign in to Wild Club" onclick="A.signinFrom()">${ic('person')}</button>`;
  return `<header class="header">
    <div class="left">
      ${back ? `<button class="icon-btn" aria-label="Back" onclick="${back}">${ic('arrow_back')}</button>` : ''}
      <button class="icon-btn" aria-label="Start over" onclick="A.modal({type:'restart'})">${ic('restart_alt')}</button>
    </div>
    <div class="brand"><img src="assets/wb-logo.svg" alt="Wild Bowls"></div>
    <div class="right">
      <button class="icon-btn" aria-label="Allergens" onclick="A.modal({type:'allergen'})">${ic('description')}</button>
      ${showChip ? user : ''}
    </div>
  </header>`;
}
const langBtn = () => `<button class="icon-btn lang-btn" aria-label="Language: ${S.lang}" onclick="event.stopPropagation();A.modal({type:'lang'})"><span class="flag">${FLAGS[S.lang]}</span><b>${S.lang}</b></button>`;
const a11yBtn = () => `<button class="icon-btn ${$stage.classList.contains('contrast') ? 'on' : ''}" aria-label="Accessibility: high contrast" aria-pressed="${$stage.classList.contains('contrast')}" onclick="event.stopPropagation();A.contrast()">${ic('contrast')}</button>`;
const tools = () => langBtn() + a11yBtn();

function tagHtml(t) {
  const map = { Vegan: ['eco', 'veg'], 'Vegan base': ['eco', 'veg'], 'Plant-based': ['eco', 'veg'], Seasonal: ['park', 'hot'], Protein: ['fitness_center', ''], 'Organic açaí': ['verified', ''], Homemade: ['favorite', ''] };
  const [i, c] = map[t] || ['label', ''];
  return `<span class="tag ${c}">${ic(i)}${t}</span>`;
}

/* animated success tick */
const tick = (size = 180) => `<svg class="tick" width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path d="M29 52 l14 14 l29 -31"/></svg>`;

/* multicolour 2D illustrations (dine in / take away) in the Wild Bowls palette */
const ART_DINE = `<svg viewBox="0 0 240 240" class="art2d" aria-hidden="true">
  <ellipse cx="120" cy="214" rx="100" ry="10" fill="#382C38" opacity=".14"/>
  <g class="a-cup"><rect x="64" y="20" width="8" height="54" rx="4" fill="#8FA48A" transform="rotate(14 68 48)"/>
  <path d="M38 72 h54 l-7 96 h-40 z" fill="#C2577A"/><path d="M40 98 h50 l-1.6 22 h-46.8 z" fill="#382C38"/>
  <circle cx="65" cy="109" r="5" fill="#F6F4EF"/>
  <rect x="33" y="62" width="64" height="14" rx="7" fill="#F6F4EF"/><path d="M80 84 l-4 76" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/></g>
  <rect x="16" y="166" width="208" height="38" rx="16" fill="#382C38"/><rect x="16" y="166" width="208" height="14" rx="7" fill="#4E3D4E"/>
  <rect x="30" y="158" width="180" height="14" rx="5" fill="#F6F4EF"/><path d="M30 165 h180" stroke="#D6D5CE" stroke-width="2" stroke-dasharray="6 6"/>
  <g class="a-bowl">
  <path d="M90 112 h124 q0 52 -62 52 q-62 0 -62 -52 z" fill="#FFFFFF"/><path d="M93 128 h118 q-3 10 -8 16 h-102 q-5 -6 -8 -16 z" fill="#E2E8DF"/>
  <ellipse cx="152" cy="112" rx="62" ry="13" fill="#5B2A4E"/>
  <g fill="#F3E3A6" stroke="#E2CC80" stroke-width="1.5"><circle cx="112" cy="110" r="7"/><circle cx="124" cy="104" r="7"/><circle cx="122" cy="116" r="7"/></g>
  <g fill="#C99A5B"><rect x="168" y="102" width="7" height="5" rx="2"/><rect x="178" y="108" width="6" height="5" rx="2"/><rect x="170" y="112" width="7" height="5" rx="2"/><rect x="186" y="104" width="6" height="4" rx="2"/><rect x="160" y="108" width="6" height="5" rx="2"/></g>
  <g fill="#2E3A6B"><circle cx="142" cy="106" r="5"/><circle cx="150" cy="114" r="5"/><circle cx="140" cy="117" r="4.5"/><circle cx="153" cy="102" r="4.5"/></g>
  <path d="M150 96 q8 -16 22 -14 q-4 14 -22 14 z" fill="#6E8468"/><path d="M150 96 q-12 -12 -22 -6 q8 10 22 6 z" fill="#8FA48A"/></g>
</svg>`;
const ART_TAKE = `<svg viewBox="0 0 240 240" class="art2d" aria-hidden="true">
  <ellipse cx="120" cy="214" rx="100" ry="10" fill="#382C38" opacity=".14"/>
  <g class="a-leaves"><path d="M84 92 q-10 -40 14 -58 q10 30 -14 58 z" fill="#6E8468"/><path d="M100 92 q8 -44 36 -52 q-4 34 -36 52 z" fill="#8FA48A"/>
  <path d="M116 94 q22 -30 44 -24 q-14 26 -44 24 z" fill="#6E8468"/></g>
  <path d="M46 84 h122 l8 124 h-138 z" fill="#D9C4A0"/><path d="M168 84 l28 14 l2 104 l-22 6 z" fill="#C2AB84"/>
  <path d="M46 84 h122 v16 l-10 -6 -10 6 -10 -6 -10 6 -10 -6 -10 6 -10 -6 -10 6 -10 -6 -10 6 -10 -6 -12 6 z" fill="#E6D6B8"/>
  <circle cx="107" cy="150" r="30" fill="#382C38"/>
  <path d="M90 146 h34 q0 18 -17 18 q-17 0 -17 -18 z" fill="#F6F4EF"/><path d="M108 144 q4 -10 12 -10 q-2 8 -12 10 z" fill="#F6F4EF"/><path d="M106 144 q-6 -8 -12 -4 q4 6 12 4 z" fill="#F6F4EF"/>
  <g class="a-cup2"><path d="M160 122 h54 l-6 86 h-42 z" fill="#5B2A4E"/><rect x="165" y="150" width="44" height="14" fill="#382C38"/>
  <text x="187" y="160.5" text-anchor="middle" font-size="8" font-weight="700" font-family="Barlow Condensed, Arial" fill="#F6F4EF" letter-spacing=".5">WILD BOWLS</text>
  <path d="M156 114 q31 -14 62 0 v10 h-62 z" fill="#F6F4EF" opacity=".92"/><circle cx="172" cy="112" r="4" fill="#2E3A6B"/><circle cx="182" cy="110" r="4" fill="#2E3A6B"/><rect x="190" y="108" width="7" height="5" rx="2" fill="#C99A5B"/></g>
</svg>`;

/* ---------------- screens ---------------- */
const screens = {};

screens.splash = () => `
<section class="screen splash" onclick="A.go('ordertype')">
  <div class="hero"><video src="assets/video/wild-bowls-splash.mp4" poster="assets/img/splash-video-poster.jpg" autoplay muted loop playsinline aria-label="Açaí, bowls, coffee and matcha in the making"></video></div><div class="shade"></div>
  <div class="top"><img src="assets/wb-logo.svg" alt="Wild Bowls"></div>
  <div class="content stagger">
    <p class="eyebrow">Let's bowl!</p>
    <h1 class="h-xl" style="margin-top:20px">Bowls, Smoothies<br><span class="yellow">&amp; Brunch.</span></h1>
    <button class="btn btn-primary btn-block tap">${ic('touch_app', 'fill')} Tap to order</button>
  </div>
  <div class="powered"><span class="pw">Powered by <b>ORDERMONKEY</b></span><div class="pw-tools">${langBtn()}${a11yBtn()}</div></div>
</section>`;

screens.ordertype = () => `
<section class="screen order-type">
  ${header({ back: "A.go('splash')", showChip: false })}
  <div class="body-wrap">
    <div class="stagger">
    <h1 class="h-lg">Where will you<br><span class="yellow">enjoy</span> your bowl?</h1></div>
    <div class="choices stagger">
      <button class="choice" onclick="A.setType('dine', this)">
        <div class="bubble">${ART_DINE}</div>
        <div class="h-md">Dine in</div><div class="small">Grab a table, we'll call your number</div>
      </button>
      <button class="choice" onclick="A.setType('take', this)">
        <div class="bubble">${ART_TAKE}</div>
        <div class="h-md">Take away</div><div class="small">Packed to go, still fresh</div>
      </button>
    </div>
    <div class="loyal-teaser rise" style="--i:4">
      ${ic('stars', 'fill')}
      <div style="flex:1"><div class="h-xs">Wild Club members earn points on every order</div>
      <div class="small" style="margin-top:8px">Sign in on the next step with the Wild Bowls app.</div></div>
    </div>
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center">
      <span class="small">Prices in CHF, incl. VAT</span><div style="display:flex;gap:16px">${tools()}</div>
    </div>
  </div>
</section>`;

screens.loyalty = () => {
  const m = S.member;
  return `
<section class="screen loyalty">
  <button class="skip-top" onclick="A.afterLoyalty()">Continue without the app ${ic('chevron_right')}</button>
  <div class="inner">
    <div class="club-mark rise"><img class="club-logo" src="assets/wb-logo.svg" alt="Wild Bowls"></div>
    ${m ? `
      <h1 class="h-lg rise" style="--i:1">Hi ${m.name}, you have<br><span class="yellow"><span data-count="${avail()}">${pts(avail())}</span> points</span></h1>
      <p class="lead rise" style="--i:2">You're signed in. Redeem rewards in My Offers or when you review your order.</p>` : `
      <h1 class="h-lg rise" style="--i:1">Sign in &amp; <span class="yellow">earn</span></h1>
      <div class="signin-cards stagger">
        <button class="signin-card" onclick="A.modal({type:'signin',tab:'qr'})">
          <div class="art">${ic('qr_code_scanner')}<i class="beam"></i></div><div class="lbl">Scan QR code</div>
        </button>
        <button class="signin-card" onclick="A.modal({type:'signin',tab:'code',code:''})">
          <div class="art"><span class="code">1234</span></div><div class="lbl">Use short code</div>
        </button>
      </div>`}
    <div class="rewards-strip">
      <div class="h-sm">Rewards, your way!</div>
      <div class="tiers stagger">${REWARDS.map((r) => {
        const it = byId[r.item];
        const reach = m && avail() >= r.pts;
        return `<div class="tier ${r.hero ? 'hero' : ''}" style="${m && !reach ? 'opacity:.45' : ''}">
          <div class="p">${ic('stars', 'fill')}${r.pts}</div>${imgTag(it.img, it.filter)}<div class="n">${r.label}</div></div>`;
      }).join('')}</div>
    </div>
    <div class="foot">
      <button class="btn btn-primary btn-block" onclick="A.afterLoyalty()">${m ? 'Start ordering' : 'Skip and continue'} ${ic('arrow_forward')}</button>
      <div style="width:100%;display:flex;justify-content:space-between">
        <button class="icon-btn" aria-label="Back" onclick="A.go('ordertype')">${ic('arrow_back')}</button>
        <div style="display:flex;gap:16px">${tools()}</div>
      </div>
    </div>
  </div>
</section>`;
};

/* ---- My Offers (inside the menu layout) ---- */
function offersHtml() {
  const m = S.member;
  if (!m) return `
    <div class="offers-lock rise">
      <div class="lock-ico">${ic('lock', 'fill')}</div>
      <h1 class="h-md" style="margin-top:36px">Your offers live here</h1>
      <p class="lead" style="margin-top:16px">Sign in with the Wild Bowls app to see your points, rewards and personal vouchers.</p>
      <button class="btn btn-primary" style="margin-top:44px" onclick="A.signinFrom('menu')">${ic('qr_code_scanner')} Sign in to Wild Club</button>
      <div class="tiers" style="margin-top:64px;grid-template-columns:repeat(3,1fr)">${REWARDS.slice(0, 3).map((r) => { const it = byId[r.item]; return `<div class="tier"><div class="p">${ic('stars', 'fill')}${r.pts}</div>${imgTag(it.img, it.filter)}<div class="n">${r.label}</div></div>`; }).join('')}</div>
    </div>`;
  const tI = tierOf(m.points), cur = TIERS[tI], next = TIERS[tI + 1];
  const toNext = next ? next.at - m.points : 0;
  const span = next ? next.at - cur.at : 1, done = next ? (m.points - cur.at) / span : 1;
  const nodes = 7, youAt = Math.max(1, Math.min(nodes - 2, Math.round(done * (nodes - 1))));
  const path = Array.from({ length: nodes }, (_, i) => {
    if (i === 0) return `<div class="nd done lbl"><span>${ic('check')}</span><em>${cur.name}</em></div>`;
    if (i === nodes - 1) return `<div class="nd gift lbl"><span>${ic('redeem', 'fill')}</span><em>${next ? next.name : 'Max'}</em></div>`;
    if (i === youAt) return `<div class="nd you"><b class="you-tag">You</b><span>${pts(m.points)}</span></div>`;
    if (i < youAt) return `<div class="nd done"><span>${ic(i === 2 ? 'star' : 'check', 'fill')}</span></div>`;
    return `<div class="nd todo"><span>+${pts(Math.round(toNext / (nodes - 1 - youAt)))}</span></div>`;
  }).join('');
  const rewardCard = (r) => {
    const it = byId[r.item], inCart = S.cart.find((l) => l.reward === r.pts), can = avail() >= r.pts;
    return `<div class="rw ${inCart ? 'on' : ''} ${!can && !inCart ? 'dim' : ''}">
      <div class="rw-pts"><b>${r.pts}</b><small>PTS</small></div>
      <div class="rw-body"><div class="rw-im">${imgTag(it.img, it.filter)}</div>
        <div><div class="h-xs">Free ${r.label.toLowerCase()}</div>
        <div class="small">${inCart ? 'Added to your order' : can ? 'Ready to redeem' : `${pts(r.pts - avail())} pts to go`}</div>
        ${inCart ? `<button class="mini on" onclick="A.redeem(${r.pts})">${ic('check')} Added · remove</button>` : `<button class="mini" ${can ? '' : 'disabled'} onclick="A.redeem(${r.pts}, this)">Redeem</button>`}</div></div>
    </div>`;
  };
  const fresca = S.cart.some((l) => l.itemId === 'agua-fresca');
  return `
  <div class="offers">
    <div class="member-card rise">
      <div class="mc-bg">${pts(m.points)}</div>
      <div class="mc-top"><span class="av big">${avatarIn(m)}</span><div><div class="mc-name">${m.name} Meier</div><div class="mc-lvl">${cur.name} · Level ${tI + 1}</div></div>
        <div class="mc-flame">${ic('eco', 'fill')}</div></div>
      <div class="mc-bot"><span class="mc-pts"><span data-count="${m.points}" data-suffix=" PT">${pts(m.points)} PT</span></span><img src="assets/wb-mark-cream.svg" alt=""></div>
    </div>
    <div class="tier-path rise" style="--i:1">
      <div class="tp-head"><span class="h-xs">${next ? `${pts(toNext)} points to ${next.name}` : 'Top tier reached'}</span><span class="pill-y">Next perk: free smoothie / month</span></div>
      <div class="tp-nodes">${path}</div>
    </div>
    <div class="duo rise" style="--i:2">
      <div class="streak"><span class="pill-r">Visit streak</span>
        <div class="st-row"><b class="big-n">3</b><div><div class="h-xs">weeks in a row</div><div class="small">Week 5 = 2× points</div></div></div>
        <div class="st-dots"><i class="on">${ic('check')}</i><i class="on">${ic('check')}</i><i class="on">${ic('check')}</i><i>4</i><i class="x2">2×</i></div></div>
      <div class="challenge"><div class="ch-top"><span class="pill-w">Today's challenge</span><span class="burst-s">+100<small>pts</small></span></div>
        <div class="h-sm" style="margin-top:18px">Try our Strawberry Agua Fresca</div>
        <div class="ch-bar"><i style="width:${fresca ? 100 : 6}%"></i></div>
        <div class="ch-cnt">${fresca ? '1 / 1' : '0 / 1'}</div></div>
    </div>
    <div class="sec-head rise" style="--i:3"><h2 class="h-sm">Rewards you can use</h2><span class="pill-y">${pts(avail())} pts available</span></div>
    <div class="hscroll stagger">${REWARDS.map(rewardCard).join('')}</div>
    <div class="sec-title rise" style="--i:5">Vouchers</div>
    <div class="hscroll stagger">${COUPONS.map((c) => { const cl = S.claimed.includes(c.id); return `
      <div class="voucher ${cl ? 'on' : ''}"><div class="v-side">${ic('confirmation_number')}<span>Coupon</span></div>
        <div class="v-body"><div class="h-xs">${c.title} · ${c.sub.toLowerCase()}</div>
          <div class="v-meta"><div><small>Code</small><b>${c.code}</b><small>Expires ${c.exp}</small></div>
          <button class="mini ${cl ? 'ghost' : ''}" onclick="A.claim('${c.id}')">${cl ? 'Unclaim' : 'Claim now'}</button></div></div></div>`; }).join('')}</div>
  </div>`;
}

screens.menu = () => {
  const isOffers = S.cat === 'offers';
  const cat = CATEGORIES.find((c) => c.id === S.cat);
  const items = isOffers ? [] : ITEMS.filter((i) => i.cat.includes(S.cat));
  const qtyOf = (id) => S.cart.filter((l) => l.itemId === id && !l.reward).reduce((a, l) => a + l.qty, 0);
  const promo = S.cat === 'popular' ? `
    <button class="promo rise" onclick="A.openItem('harvest-poke')">
      ${imgTag('harvest-poke', null, 'Harvest Poké')}<i class="glow"></i>
      <div class="t">
        <span class="ltd">${ic('park')} Autumn menu · from 11 am</span>
        <div class="ttl">Harvest<br><em>Poké</em></div>
        <p class="d">Roasted Hokkaido pumpkin, pomegranate, edamame, miso-tahini.</p>
        <div class="row"><span class="price">${fmt(24.9)}</span><span class="go">Try it ${ic('arrow_forward')}</span></div>
      </div>
    </button>` : '';
  const railBtn = (c) => `<button class="${c.id === S.cat ? 'on' : ''} ${c.id === 'special' ? 'special' : ''}" onclick="A.cat('${c.id}')">
        <span class="ico">${ic(c.icon, c.id === S.cat ? 'fill' : '')}</span><span class="l">${c.label}</span></button>`;
  return `
<section class="screen menu">
  ${header({ back: "A.go('loyalty')" })}
  <div class="menu-wrap">
    <nav class="rail">
      ${CATEGORIES.map(railBtn).join('')}
      <button class="${isOffers ? 'on' : ''} offers-btn" onclick="A.cat('offers')"><span class="ico">${ic('redeem', isOffers ? 'fill' : '')}${S.member ? '<i class="dot"></i>' : ''}</span><span class="l">My Offers</span></button>
      <button class="scan-btn" onclick="A.openScan('menu')"><span class="ico">${ic('barcode_scanner')}</span><span class="l">Scan item</span></button>
    </nav>
    <div class="catalog" data-cat="${S.cat}">
      ${isOffers ? offersHtml() : `
      <div class="head rise"><h1 class="h-md">${cat.title}</h1><p class="small" style="font-size:24px">${cat.sub}</p></div>
      ${promo}
      <div class="grid stagger">${items.map((it) => {
        const q = qtyOf(it.id);
        const badgeCls = it.badge === 'Seasonal' ? 'ltd' : it.badge === 'Your way' || it.badge === 'Combo' ? 'yellow' : '';
        return `<button class="card" onclick="A.openItem('${it.id}')">
          <div class="im">${thumb(it)}</div>
          ${q ? `<span class="qtyb">${q}</span>` : ''}
          ${it.badge ? `<span class="badge ${badgeCls}">${it.badge}</span>` : ''}
          <div class="info"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div>
            <div class="row"><span class="price">${fmt(it.price)}</span>
            <span class="plus" role="button" aria-label="Add ${it.name}" onclick="event.stopPropagation();A.quickAdd('${it.id}', this)">${ic('add')}</span></div></div>
        </button>`;
      }).join('')}</div>`}
    </div>
  </div>
  ${cartCount() ? cartbar() : ''}
</section>`;
};
function cartbar() {
  const th = S.cart.slice(-3).reverse().map((l) => `<span class="cb-th">${thumb(byId[l.itemId])}</span>`).join('');
  return `<div class="cartbar">
    <div class="bag">${ic('shopping_bag', 'fill')}<b class="${cartCount() !== prev.count ? 'pop' : ''}">${cartCount()}</b></div>
    <div class="cb-ths">${th}</div>
    <div class="sum"><div class="price">${fmt(discounted())}</div><div class="small">${cartCount()} items · ${S.orderType === 'take' ? 'Take away' : 'Dine in'}</div></div>
    <button class="btn" onclick="A.modal({type:'popular'})">Checkout ${ic('arrow_forward')}</button>
  </div>`;
}

/* ---- customise stepper ---- */
const coffeeRow = (on, act) => `<button class="coffee-row ${on ? 'on' : ''}" onclick="${act}">
    <span class="oi">${ic('coffee', 'fill')}</span>
    <div style="flex:1"><div class="nm">Add a coffee</div><div class="small">Any coffee, matcha or chai from the bar</div></div>
    <span class="pr">+ ${fmt(MENU_COFFEE)}</span><span class="tick">${ic(on ? 'check' : 'add')}</span></button>`;
function czSteps() { const it = byId[S.cz.itemId]; return [...(it.bases ? ['base'] : []), 'extras', ...(it.ing?.length ? ['remove'] : []), 'combo', 'review']; }   // combo = Wild Combo upsell, offered once every modifier is chosen
function czMods() {
  const c = S.cz;
  const extras = Object.fromEntries(Object.entries(c.extras).filter(([, q]) => q > 0));
  return { base: c.base, extras, removed: [...c.removed], menu: c.side || c.drink ? { side: c.side || null, drink: c.drink || null, coffee: !!c.coffee } : null };
}
screens.custom = () => {
  const c = S.cz, it = byId[c.itemId], steps = czSteps(), st = steps[c.step];
  const price = unitPrice(it, czMods()) * c.qty;
  const acai = it.type === 'acai', what = it.type === 'toast' ? 'toast' : 'bowl';
  const titles = { base: [it.bases?.title, it.bases?.sub], extras: [acai ? 'Add toppings' : 'Add extras', 'Pile it on. Tap + to add, up to 3 of each.'],
    remove: ['Anything to leave out?', 'Tap an ingredient to remove it.'], meal: ['Make it a Wild Combo?', `Add a drink and an energy-ball snack for ${fmt(MENU_PRICE)}.`],
    side: ['Choose your sweet treat', 'Included in your combo.'], drink: ['Choose your drink', 'Included in your combo. Swiss kombucha for CHF 1 more.'], combo: ['Related suggestions with this item', ''],
    review: ['Looking good!', `Check your ${what} before adding it to your order.`] };
  let body = '';
  if (st === 'base') body = `<div class="remove-hero rise">${imgTag(it.img, it.filter, it.name)}</div><div class="opt-grid ${it.bases.opts.length === 3 ? 'three' : ''} stagger">${it.bases.opts.map((b) => `
      <button class="opt ${c.base === b.id ? 'on' : ''}" onclick="A.cz({base:'${b.id}'})"><span class="on-mark">${ic('check')}</span>
        <span class="oi">${ic(b.icon)}</span><span class="nm">${b.name}</span><span class="sb">${b.sub}</span><span class="pr">${b.price ? '+ ' + fmt(b.price) : 'Included'}</span></button>`).join('')}</div>`;
  if (st === 'extras') body = `<div class="extra-list stagger">${extrasFor(it).map((e) => {
      const q = c.extras[e.id] || 0;
      return `<div class="extra-row ${q ? 'on' : ''}"><span class="oi">${ic(e.icon)}</span>
        <div style="flex:1"><div class="nm">${e.name}</div><div class="small" style="color:var(--yellow)">+ ${fmt(e.price)}</div></div>
        <div class="qty sm"><button onclick="A.extra('${e.id}',-1)" ${q ? '' : 'style="opacity:.3"'}>${ic('remove')}</button><b>${q}</b><button onclick="A.extra('${e.id}',1)">${ic('add')}</button></div></div>`;
    }).join('')}</div>`;
  if (st === 'remove') body = `<div class="remove-hero rise">${imgTag(it.img, it.filter, it.name)}</div><div class="chips stagger">${(it.ing || []).map((g) => {
      const off = c.removed.includes(g);
      return `<button class="chip ${off ? 'off' : ''}" onclick="A.toggleIng('${g.replace(/'/g, "\\'")}')">${ic(off ? 'block' : 'check_circle', off ? '' : 'fill')}${g}</button>`;
    }).join('')}</div>`;
  if (st === 'meal') body = `<div class="deal-pair stagger">
      <button class="deal ${!c.menu ? 'on' : ''}" onclick="A.cz({menu:false})">
        <span class="h-sm">Just the ${what}</span><span class="small">Perfect if you're not that hungry.</span>
        <div class="pics">${imgTag(it.img, it.filter)}</div></button>
      <button class="deal meal ${c.menu ? 'on' : ''}" onclick="A.cz({menu:true})">
        <span class="eyebrow" style="color:#fff">Best value</span><span class="h-sm" style="color:#fff">Wild Combo</span>
        <span class="body" style="color:#fff">+ drink + energy balls · <b>${fmt(MENU_PRICE)}</b></span>
        <div class="pics">${imgTag(it.img, it.filter)}${imgTag('agua-fresca')}${imgTag('cacao-coco')}</div></button></div>`;
  const pick = (list, key) => `<div class="opt-grid three stagger">${list.map((o) => `
      <button class="opt ${c[key] === o.id ? 'on' : ''}" onclick="A.cz({${key}:'${o.id}'})"><span class="on-mark">${ic('check')}</span>
        ${o.img ? `<span class="oimg">${imgTag(o.img, o.filter)}</span>` : `<span class="oimg" style="display:grid;place-items:center"><span class="ms" style="font-size:96px;color:var(--yellow)">${o.icon}</span></span>`}
        <span class="nm" style="font-size:26px">${o.name}</span><span class="pr">${o.price ? '+ ' + fmt(o.price) : 'Included'}</span></button>`).join('')}</div>`;
  if (st === 'side') body = pick(MENU_SIDES, 'side');
  if (st === 'drink') body = pick(MENU_DRINKS, 'drink') + coffeeRow(c.coffee, 'A.cz({coffee:!S.cz.coffee})');
  if (st === 'combo') {
    /* Wild Combo upsell step */
    const comboPick = (list, key, title) => `<div class="cb-h">${title}</div><div class="cb-opts">${list.map((o) => `
        <button class="cb-opt ${c[key] === o.id ? 'on' : ''}" onclick="A.cz({${key}: S.cz.${key} === '${o.id}' ? null : '${o.id}'})">
          <span class="cb-im">${imgTag(o.img, o.filter)}</span><span class="cb-nm">${o.name}</span>
          <span class="on-mark">${ic('check')}</span></button>`).join('')}</div>`;
    const combo = `<section class="combo-plain rise">${comboPick(MENU_SIDES, 'side', 'Sweet treat')}${comboPick(MENU_DRINKS, 'drink', 'Drink')}</section>`;
    body = combo;
  }
  if (st === 'review') {
    const m = czMods();
    const row = (icon, k, v, step) => `<div class="r">${ic(icon)}<div><div class="k">${k}</div><div class="v">${v}</div></div>
      <button class="link ed" style="font-size:22px" onclick="A.czGo(${steps.indexOf(step)})">Edit</button></div>`;
    const ex = Object.entries(m.extras).map(([id, q]) => `${q}× ${EXTRAS.find((e) => e.id === id).name}`).join(', ') || (acai ? 'No extra toppings' : 'No extras');
    body = `<div class="remove-hero rise" style="height:440px">${imgTag(it.img, it.filter, it.name)}</div><div class="review-list stagger">
      ${it.bases ? row(it.bases.opts[0].icon, it.bases.title.replace(/^(Pick|Choose) your (.)/, (_, v, c) => c.toUpperCase()), baseOf(it, m.base).name, 'base') : ''}
      ${row('add_circle', acai ? 'Toppings' : 'Extras', ex, 'extras')}
      ${it.ing?.length ? row('do_not_disturb_on', 'Removed', m.removed.length ? m.removed.join(', ') : 'Nothing, the full recipe', 'remove') : ''}
      ${row('local_drink', 'Related items', m.menu ? suggestionText(m.menu) : 'None added', 'combo')}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:36px">
      <span class="h-xs">Quantity</span>
      <div class="qty"><button onclick="A.cz({qty:Math.max(1,S.cz.qty-1)})">${ic('remove')}</button><b>${c.qty}</b><button onclick="A.cz({qty:S.cz.qty+1})">${ic('add')}</button></div>
    </div>`;
  }
  const last = c.step === steps.length - 1;
  return `
<section class="screen custom">
  ${header({ back: 'A.czBack()' })}
  <div class="stepper">
    <div class="thumb">${imgTag(it.img, it.filter)}</div>
    <div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:baseline">
      <span class="h-sm">${it.name}</span><span class="small">Step ${c.step + 1} of ${steps.length}</span></div>
      <div class="steps">${steps.map((_, i) => `<i class="${i < c.step ? 'done' : i === c.step ? 'cur' : ''}"></i>`).join('')}</div></div>
  </div>
  <div class="content step-anim">
    <h1 class="h-md">${titles[st][0]}</h1>${titles[st][1] ? `<p class="small" style="font-size:26px">${titles[st][1]}</p>` : ''}
    ${body}
  </div>
  <div class="footer-bar">
    <div class="tot"><div class="small">${c.qty > 1 ? c.qty + '× · ' : ''}Total</div><div class="price">${fmt(price)}</div></div>
    <button class="btn btn-ghost" onclick="A.czBack()">${ic('arrow_back')} Back</button>
    <button class="btn btn-primary" style="min-width:380px" onclick="A.czNext()">${last ? (c.editUid ? 'Update order' : 'Add to order') : 'Next'} ${ic(last ? 'check' : 'arrow_forward')}</button>
  </div>
</section>`;
};

/* ---- Scan item ---- */
screens.scan = () => {
  const sc = S.scan;
  const list = sc.items.map((x) => { const it = byId[x.id]; return `
    <div class="line rise"><div class="th sm">${thumb(it)}</div>
      <div class="mid"><div class="nm">${it.name}</div><div class="mods">${it.sub}</div></div>
      <div class="rt" style="flex-direction:row;align-items:center;gap:22px"><span class="price">${fmt(it.price * x.qty)}</span>
        <div class="qty sm"><button onclick="A.scanQty('${x.id}',-1)">${ic('remove')}</button><b>${x.qty}</b><button onclick="A.scanQty('${x.id}',1)">${ic('add')}</button></div>
        <button class="icon-btn sm" aria-label="Remove" onclick="A.scanQty('${x.id}',-99)">${ic('close')}</button></div></div>`; }).join('');
  const n = sc.items.reduce((a, x) => a + x.qty, 0);
  return `
<section class="screen scan">
  ${header({ back: 'A.closeScan()' })}
  <button class="scan-stage ${sc.flash ? 'flash' : ''}" onclick="A.scanNext()" aria-label="Simulate a barcode scan"><video class="scan-video-tut" src="assets/video/scan-tutorial.mp4" autoplay muted loop playsinline aria-hidden="true"></video></button>
  <div class="scan-head">
    <div><h1 class="h-sm">Scan items</h1><p class="scan-count">${n} ${n === 1 ? 'item' : 'items'} scanned</p></div>
    <span class="pill-g">${ic('shopping_cart', 'fill')} ${cartCount()} ${cartCount() === 1 ? 'item' : 'items'} in cart</span>
  </div>
  <div class="content" style="padding-top:8px">
    ${n ? list : `<div class="empty rise">${ic('barcode_reader')}<p class="lead">No new item scanned</p><p class="small">Bottled drinks and packaged items have a barcode.</p></div>`}
  </div>
  <div class="footer-bar">
    <button class="btn btn-ghost" style="flex:1" onclick="A.closeScan()">Close</button>
    <button class="btn btn-primary" style="flex:1" ${n ? '' : 'disabled'} onclick="A.scanAdd()">${ic('add_shopping_cart')} Add to cart${n ? ' · ' + fmt(sc.items.reduce((a, x) => a + byId[x.id].price * x.qty, 0)) : ''}</button>
  </div>
</section>`;
};

/* ---- My Orders (cart) ---- */
screens.cart = () => {
  const lines = S.cart.map((l) => {
    const it = byId[l.itemId];
    return `<div class="line ${l.reward ? 'reward' : ''}" data-key="line-${l.uid}">
      <div class="th">${thumb(it)}</div>
      <div class="mid"><div class="nm">${it.name}</div>
        <div class="mods">${l.reward ? `<span class="yellow">${ic('stars', 'fill')} Wild Club reward · ${pts(l.reward)} points</span>` : modsText(it, l.mods) || it.desc}</div>
        <div class="l-acts">${!l.reward && isCustom(it) ? `<button onclick="A.editLine(${l.uid})">${ic('edit')} Edit</button>` : ''}<button onclick="A.removeLine(${l.uid})">${ic('delete')} Remove</button></div></div>
      <div class="rt"><span class="price">${l.reward ? 'Free' : fmt(l.unit * l.qty)}</span>
        ${l.reward ? '' : `<div class="qty sm"><button aria-label="Less" onclick="A.qty(${l.uid},-1)">${ic('remove')}</button><b>${l.qty}</b><button aria-label="More" onclick="A.qty(${l.uid},1)">${ic('add')}</button></div>`}</div>
    </div>`;
  }).join('');
  const base = discounted();
  const tipOpts = [2, 5, 10].map((p) => `<button class="seg ${S.tip?.pct === p ? 'on' : ''}" onclick="A.setTip({pct:${p}})"><b>${p}%</b><small>${fmt(Math.round(base * p) / 100)}</small></button>`).join('')
    + `<button class="seg ${S.tip?.chf != null ? 'on' : ''}" onclick="A.modal({type:'tip',code:''})"><b>${ic('edit')}</b><small>${S.tip?.chf != null ? fmt(S.tip.chf) : 'Custom'}</small></button>`;
  const likes = ['agua-fresca', 'cacao-coco', 'matcha-latte', 'berry-wild', 'avo-toast'].filter((id) => !S.cart.some((l) => l.itemId === id)).slice(0, 4);
  const coupon = COUPONS.find((c) => c.id === S.coupon), promo = PROMO_CODES[S.promo], loy = LOYALTY_DISCOUNTS.find((x) => x.id === S.loyalty);
  const vat = base - base / 1.081;
  return `
<section class="screen cart">
  ${header({ back: "A.go('menu')" })}
  <div class="content">
    <div class="cart-head rise">
      <h1 class="h-lg">Your order</h1>
      <p class="lead">${cartCount()} ${cartCount() === 1 ? 'item' : 'items'} · ${S.orderType === 'take' ? 'Take away' : 'Dine in'}</p>
    </div>

    ${S.cart.length ? `<div class="lines stagger">${lines}</div>` : `<div class="empty">${ic('shopping_bag')}<p class="lead">Your order is empty.</p></div>`}
    <div class="act-row rise">
      <button class="act" onclick="A.go('menu')">${ic('add')} Add more items</button>
      <button class="act" onclick="A.openScan('cart')">${ic('barcode_scanner')} Scan an item</button>
    </div>

    ${likes.length ? `<section class="sec rise">
      <button class="sec-h toggle" onclick="S.mayLikeOpen=!S.mayLikeOpen;A.render()"><span>You may also like</span>${ic(S.mayLikeOpen ? 'expand_less' : 'expand_more')}</button>
      ${S.mayLikeOpen ? `<div class="likes stagger">${likes.map((id) => { const it = byId[id]; return `
        <div class="like"><div class="lk-im">${imgTag(it.img, it.filter)}</div><div class="nm">${it.name}</div>
          <div class="lk-row"><span>${fmt(it.price)}</span><button onclick="A.quickAdd('${id}', this)">${ic('add')} Add</button></div></div>`; }).join('')}</div>` : ''}
    </section>` : ''}

    <section class="sec rise">
      <div class="sec-h"><span>Tip for our crew</span>${S.tip ? `<button class="link-s" onclick="A.setTip(null)">No tip</button>` : ''}</div>
      <p class="small">100% goes to the team.</p>
      <div class="segs">${tipOpts}</div>
    </section>

    <section class="sec rise">
      <div class="sec-h"><span>Savings</span></div>
      <div class="rows">
        <button class="row-btn" onclick="A.modal({type:'coupons', pick: S.coupon})"><span class="ri">${ic('confirmation_number')}</span><span class="rl">Discount coupons</span>
          <span class="rv ${coupon ? 'on' : ''}">${coupon ? coupon.title : 'Choose'}</span>${ic('chevron_right')}</button>
        <button class="row-btn" onclick="A.modal({type:'promo',code:S.promo||''})"><span class="ri">${ic('sell')}</span><span class="rl">Voucher or promo code</span>
          <span class="rv ${promo ? 'on' : ''}">${promo ? S.promo : 'Add'}</span>${ic('chevron_right')}</button>
      </div>
      ${S.member ? `<div class="sub-h"><span>Wild Points</span><small>${pts(avail())} available · pick one</small></div>
        <div class="segs six">${LOYALTY_DISCOUNTS.map((d) => { const on = S.loyalty === d.id; const can = on || avail() >= d.cost; return `
          <button class="seg ${on ? 'on' : ''}" ${can ? '' : 'disabled'} onclick="A.setLoyalty('${d.id}')"><b>${d.label}</b><small>${d.icon ? ic(d.icon) + ' ' : ''}${d.sub}</small><em>${d.cost} pts</em></button>`; }).join('')}</div>`
      : `<div class="guest-loy"><div class="small">Sign in to earn <b class="yellow">${pts(earnPoints())} points</b> and unlock member discounts.</div>
        <button class="btn btn-primary btn-sm" onclick="A.signinFrom('cart')">${ic('qr_code_scanner')} Sign in</button></div>`}
    </section>

    ${S.cart.length ? `<section class="totals rise">
      <div class="r"><span>Sub total</span><span>${fmt(itemsTotal() + rewardValue())}</span></div>
      ${rewardValue() ? `<div class="r g"><span>Free rewards</span><span>− ${fmt(rewardValue())}</span></div>` : ''}
      ${coupon ? `<div class="r g"><span>Coupon <i class="bdg">${coupon.title}</i></span><span>${couponDisc() ? '− ' + fmt(couponDisc()) : 'Add a bowl'}</span></div>` : ''}
      ${promo ? `<div class="r g"><span>Promo discount <i class="bdg">${S.promo}</i></span><span>− ${fmt(promoDisc())}</span></div>` : ''}
      ${loy ? `<div class="r g"><span>Loyalty redemption <i class="bdg">${loy.label} · ${loy.cost} pts</i></span><span>− ${fmt(loyaltyDisc())}</span></div>` : ''}
      ${tipAmount() ? `<div class="r"><span>Tip</span><span>${fmt(tipAmount())}</span></div>` : ''}
      <div class="r t"><span>Total</span><span>${fmt(total())}</span></div>
      <div class="r vat"><span>incl. 8.1% VAT</span><span>${fmt(vat)}</span></div>
      ${S.member ? `<div class="earn-pill">${ic('stars', 'fill')} +${pts(earnPoints())} points with this order</div>` : ''}</section>` : ''}
  </div>
  <div class="footer-bar">
    <button class="btn btn-primary btn-block" ${S.cart.length ? '' : 'disabled'} onclick="A.checkout()">Proceed to payment · ${fmt(total())} ${ic('arrow_forward')}</button>
  </div>
</section>`;
};

/* ---- Payment (modal-style screen, like the OMK flow) ---- */
function qrSvg(seed = 7, n = 29, logo = false) {
  let s = seed; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let r = '';
  const finder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const mid = (x, y) => logo && Math.abs(x - n / 2 + .5) < 4.5 && Math.abs(y - n / 2 + .5) < 4.5;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (finder(x, y) || mid(x, y)) continue; if (rnd() > 0.52) r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }
  const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" rx="1.4"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx=".6"/>`;
  const lg = logo ? `<rect x="${n / 2 - 4}" y="${n / 2 - 4}" width="8" height="8" rx="1.6" fill="#fff"/><image href="assets/wb-mark.svg" x="${n / 2 - 3.5}" y="${n / 2 - 3.5}" width="7" height="7"/>` : '';
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#111">${f(0, 0)}${f(n - 7, 0)}${f(0, n - 7)}${r}${lg}</svg>`;
}
let payTimer;
screens.pay = () => {
  const p = S.pay;
  let inner = '';
  if (p.phase === 'select') inner = `
    <h2 class="h-sm">Please select your payment type</h2>
    <span class="reset-pill">${ic('timer')} Reset in <b id="paycd">${p.left}</b> sec</span>
    <div class="amt-s">${fmt(total())}</div>
    <button class="qr-pay" onclick="A.payTwint()" aria-label="Simulate TWINT payment">${qrSvg(42, 29, true)}</button>
    <p class="body" style="margin-top:22px">Scan the QR code to pay from your mobile device</p>
    <div class="or"><span>or</span></div>
    <button class="pm" onclick="A.payCard()"><span class="oi">${ic('credit_card', 'fill')}</span>
      <div style="flex:1;text-align:left"><div class="h-xs">Pay with card</div><div class="small">Through TWINT, Apple Pay, Google Pay, Visa and Mastercard</div></div>
      <img class="wl" src="assets/worldline.png?v=2" alt="Worldline"></button>
    <button class="btn btn-red btn-block" style="margin-top:40px" onclick="A.cancelPay()">Cancel process</button>`;
  if (p.phase === 'card') inner = `
    <h2 class="h-md">Use your card<br>for the payment</h2>
    <div class="amt-s" style="margin-top:24px">${fmt(total())}</div>
    <button class="card-anim" onclick="A.paid()" aria-label="Simulate card payment"><span class="ring"></span><span class="ring d"></span>
      <span class="cc"><i></i>${ic('contactless')}</span></button>
    <p class="small">Tap, insert or swipe on the terminal below</p>
    <div class="down-arrow">${ic('keyboard_double_arrow_down')}</div>
    <button class="btn btn-red btn-block" onclick="A.cancelPay()">Cancel process</button>`;
  if (p.phase === 'processing') inner = `
    <h2 class="h-md">Processing<br>payment…</h2><div class="spinner"></div><p class="lead" style="margin-top:56px">Please don't remove your card.</p>`;
  if (p.phase === 'success') inner = `
    <h2 class="h-md">Your transaction<br>is successful</h2><div style="margin-top:70px">${tick(260)}</div>
    <p class="lead" style="margin-top:40px">${fmt(total())} paid ${p.method === 'twint' ? 'with TWINT' : 'by card'}</p>`;
  return `<section class="screen pay-screen"><div class="pay-modal ${p.phase}">${inner}</div></section>`;
};

/* ---- Thank you / order placed ---- */
let doneTimer;
screens.done = () => {
  const dine = S.orderType !== 'take';
  const steps = [['Order placed', 'done'], ['Preparing', 'live'], [dine ? 'Ready to collect' : 'Ready for pick-up', '']];
  return `
<section class="screen done"><div class="inner">
  <div class="dn-top rise"><span class="dn-ok">${ic('check')}</span>Payment received · ${dine ? 'Dine in' : 'Take away'}</div>
  <h1 class="dn-title rise" style="--i:1">${S.member ? `Thanks, ${S.member.name}.` : 'Thank you.'}<br><span>Your order is in.</span></h1>

  <div class="dn-number rise" style="--i:2">
    <div class="lbl">Your order number</div>
    <div class="no">${S.orderNo}</div>
    <div class="hint">${ic('campaign', 'fill')}<span>We'll call your number when it's ready. Watch the screen by the counter.</span></div>
  </div>

  <div class="dn-track rise" style="--i:3">${steps.map(([t, st]) => `<div class="tk ${st}"><i></i><span>${t}</span></div>`).join('')}</div>

  ${S.member ? `<div class="dn-points rise" style="--i:4">${ic('stars', 'fill')}<span><b>+<span data-count="${earnPoints()}">${pts(earnPoints())}</span> Wild Points</b> · new balance ${pts(S.member.points)}</span></div>` : ''}

  <div class="dn-receipt rise" style="--i:5">
    <div class="lbl">Receipt</div>
    <div class="opts">
      <button onclick="A.modal({type:'ereceipt'})"><span class="rq">${qrSvg(9, 25, true)}</span><span class="tx"><b>Digital</b><small>Scan with your phone</small></span></button>
      <button onclick="A.printReceipt()"><span class="rp">${ic('print')}</span><span class="tx"><b>Print</b><small>Paper receipt</small></span></button>
    </div>
  </div>

  <div class="dn-foot">
    <button class="btn btn-ghost btn-block" onclick="A.reset()">Start a new order</button>
    <p class="auto" id="cd">Back to start in 90 s</p>
  </div>
</div></section>`;
};

function receiptPaper() {
  const rows = S.cart.map((l) => `<div class="rr"><span>${l.qty}</span><span>${byId[l.itemId].name}</span><span>${l.reward ? '0.00' : (l.unit * l.qty).toFixed(2)}</span></div>`).join('');
  const d = new Date();
  const disc = itemsTotal() + rewardValue() - discounted();
  return `<div class="paper">
    <img src="assets/wb-logo.svg" alt="" style="width:260px;margin:6px auto 16px">
    <div class="pc">WILD BOWLS · Bleicherweg 50<br>8002 Zürich<br>${d.toLocaleDateString('de-CH')} ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} · Kiosk 02 · Order #${S.orderNo}</div>
    <div class="dash"></div><div class="rr hd"><span>Qty</span><span>Item</span><span>CHF</span></div>${rows}<div class="dash"></div>
    <div class="rr"><span></span><span>Sub total</span><span>${(itemsTotal() + rewardValue()).toFixed(2)}</span></div>
    ${disc > 0.001 ? `<div class="rr"><span></span><span>Discounts</span><span>-${disc.toFixed(2)}</span></div>` : ''}
    <div class="rr"><span></span><span>Tip</span><span>${tipAmount().toFixed(2)}</span></div>
    <div class="rr b"><span></span><span>Total</span><span>${total().toFixed(2)}</span></div>
    <div class="rr"><span></span><span>incl. MWST 8.1%</span><span>${(discounted() - discounted() / 1.081).toFixed(2)}</span></div>
    <div class="rr"><span></span><span>${S.pay?.method === 'twint' ? 'TWINT' : 'Card'}</span><span>${total().toFixed(2)}</span></div>
    <div class="dash"></div><div class="pc">Thank you for your visit · Let's bowl!</div>
    <div class="pq">${qrSvg(5, 25)}</div><div class="pc">Scan to track your order</div></div>`;
}
screens.printing = () => `
<section class="screen printing"><div class="inner">
  <img src="assets/wb-mark.svg" alt="" style="width:150px;height:150px">
  <h1 class="h-md" style="margin-top:44px">Your receipt is printing</h1><p class="lead">Please wait…</p>
  <div class="slot"><div class="paper-wrap">${receiptPaper()}</div></div>
  <div class="collect"><span class="h-xs">Collect receipt from here</span>${ic('south')}</div>
</div></section>`;

/* ---------------- modals ---------------- */
const modals = {};
modals.item = () => {
  const it = byId[S.modal.id], custom = isCustom(it), q = S.modal.qty || 1;
  if (it.type === 'bundle') return bundleSheet(it, q);
  return `<div class="overlay bottom" onclick="if(event.target===this)A.closeModal()"><div class="sheet">
    <div class="grab"></div>
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <div class="item-hero">${thumb(it)}${it.badge ? `<span class="badge ${it.badge === 'Seasonal' ? 'ltd' : ''}" style="top:28px;left:28px;right:auto;font-size:22px">${it.badge}</span>` : ''}</div>
    <div class="item-title"><h2 class="h-md">${it.name}</h2><span class="price" style="font-size:52px;color:var(--yellow)">${fmt(it.price * (custom ? 1 : q))}</span></div>
    <p class="lead" style="margin-top:16px;font-size:30px">${it.desc}</p>
    ${it.tags ? `<div class="item-tags">${it.tags.map(tagHtml).join('')}</div>` : ''}
    ${custom ? `
      <div class="actions">
        <button class="btn btn-outline" onclick="A.addAsIs('${it.id}', this)">Add as is</button>
        <button class="btn btn-primary" onclick="A.customise('${it.id}')">${ic('tune')} Customise</button>
      </div>` : `
      <div class="actions" style="grid-template-columns:auto 1fr;align-items:center">
        <div class="qty"><button onclick="A.modal({...S.modal,qty:Math.max(1,${q}-1)})">${ic('remove')}</button><b>${q}</b><button onclick="A.modal({...S.modal,qty:${q}+1})">${ic('add')}</button></div>
        <button class="btn btn-primary" onclick="A.addSimple('${it.id}',${q}, this)">Add to order · ${fmt(it.price * q)}</button>
      </div>`}
    <p class="small" style="margin-top:28px;text-align:center">${ic('info')} Please let our team know about any food allergies before you order.</p>
  </div></div>`;
};

function bundleMods(it) {
  const m = S.modal, picks = {};
  for (const g of bundleGroups(it)) picks[g.key] = m.picks?.[g.key] || g.opts[0].id;
  return { picks, coffee: !!m.coffee };
}
function bundleSheet(it, q) {
  const mods = bundleMods(it), unit = unitPrice(it, mods);
  const grp = (g) => `<div class="b-grp"><div class="b-h">${g.title}</div><div class="b-opts">${g.opts.map((o) => `
      <button class="b-opt ${mods.picks[g.key] === o.id ? 'on' : ''}" onclick="A.pick('${g.key}','${o.id}')">
        <span class="b-th">${optThumb(o)}</span>
        <span class="b-nm">${o.name}</span><span class="b-pr">${o.price ? '+ ' + fmt(o.price) : 'Included'}</span>
        <span class="on-mark">${ic('check')}</span></button>`).join('')}</div></div>`;
  return `<div class="overlay bottom" onclick="if(event.target===this)A.closeModal()"><div class="sheet">
    <div class="grab"></div>
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <div class="item-hero bundle-hero">${thumb(it)}${it.badge ? `<span class="badge ${it.badge === 'Seasonal' ? 'ltd' : 'yellow'}" style="top:28px;left:28px;right:auto;font-size:22px">${it.badge}</span>` : ''}</div>
    <div class="item-title"><h2 class="h-md">${it.name}</h2><span class="price" style="font-size:52px;color:var(--yellow)">${fmt(unit * q)}</span></div>
    <p class="lead" style="margin-top:16px;font-size:30px">${it.desc}</p>
    ${bundleGroups(it).map(grp).join('')}
    ${it.included ? `<div class="b-grp"><div class="b-h">Included</div><div class="b-inc">${ic('check_circle', 'fill')}${it.included}</div></div>` : ''}
    ${it.coffee ? `<div class="b-grp"><div class="b-h">Add a coffee</div>${coffeeRow(mods.coffee, 'A.modal({...S.modal,coffee:!S.modal.coffee})')}</div>` : ''}
    <div class="actions" style="grid-template-columns:auto 1fr;align-items:center">
      <div class="qty"><button onclick="A.modal({...S.modal,qty:Math.max(1,${q}-1)})">${ic('remove')}</button><b>${q}</b><button onclick="A.modal({...S.modal,qty:${q}+1})">${ic('add')}</button></div>
      <button class="btn btn-primary" onclick="A.addBundle('${it.id}',${q}, this)">Add to order · ${fmt(unit * q)}</button>
    </div>
  </div></div>`;
}

const keypad = (act, okLabel = 'Confirm') => `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => `<button onclick="A.${act}('${k}')">${k}</button>`).join('')}
  <button onclick="A.${act}('del')" aria-label="Delete">${ic('backspace')}</button><button onclick="A.${act}('0')">0</button>
  <button onclick="A.${act}('ok')" aria-label="${okLabel}" class="ok">${ic('check')}</button></div>`;

modals.signin = () => {
  const m = S.modal, code = m.code || '';
  const qr = `
    <p class="body muted" style="text-align:center;margin-top:36px">Open the Wild Bowls app, tap <b style="color:var(--cream)">Wild Code</b> and hold the QR code under the scanner.</p>
    <button class="scan-video" onclick="A.signedIn()" aria-label="Simulate QR scan">
      <div class="qr-dummy">${qrSvg(31, 25, true)}</div>
      <video src="assets/video/qr-scan.mp4" autoplay muted loop playsinline></video></button>
    <p class="small" style="text-align:center;margin-top:24px">${ic('info')} Select your rewards in the app before scanning.</p>`;
  const kp = `
    <p class="body muted" style="text-align:center;margin-top:36px">Enter the 4-digit short code shown in your app.</p>
    <div class="code-display ${m.err ? 'err' : ''}">${[0, 1, 2, 3].map((i) => `<i class="${i === code.length ? 'f' : ''} ${code[i] ? 'in' : ''}">${code[i] || ''}</i>`).join('')}</div>
    ${keypad('key')}
    <button class="btn btn-primary btn-block" style="margin-top:28px" ${code.length === 4 ? '' : 'disabled'} onclick="A.key('ok')">Confirm</button>`;
  return `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal">
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <div class="club-mark" style="justify-content:center;margin-bottom:36px"><img class="club-logo" src="assets/wb-logo.svg" alt="Wild Bowls" style="height:48px"></div>
    <div class="tabs is-${m.tab}"><i class="tab-ind"></i><button class="${m.tab === 'qr' ? 'on' : ''}" onclick="A.modal({type:'signin',tab:'qr'})">${ic('qr_code_scanner')} QR code</button>
      <button class="${m.tab === 'code' ? 'on' : ''}" onclick="A.modal({type:'signin',tab:'code',code:''})">${ic('dialpad')} Short code</button></div>
    <div class="tab-body">${m.tab === 'qr' ? qr : kp}</div>
    <div style="text-align:center;margin-top:32px"><button class="link" onclick="A.modal({type:'join'})">I don't have an account</button></div>
  </div></div>`;
};

modals.welcome = () => {
  const m = S.member;
  const unlocked = REWARDS.filter((r) => r.pts <= m.points).length;
  return `<div class="overlay center"><div class="modal welcome">
    <div class="badge-ring">${ic('stars', 'fill')}</div>
    <h2 class="h-lg" style="margin-top:44px">Welcome back,<br><span class="yellow">${m.name}!</span></h2>
    <div class="points-big" data-count="${m.points}">${pts(m.points)}</div><div class="eyebrow" style="margin-top:10px">Wild Points</div>
    <p class="lead" style="margin-top:32px">You've unlocked <b style="color:var(--cream)">${unlocked} rewards</b>. Find them in <b style="color:var(--cream)">My Offers</b>.</p>
    <button class="btn btn-primary btn-block" style="margin-top:48px" onclick="A.afterLoyalty()">${S.returnTo === 'cart' ? 'Back to my order' : 'Start ordering'} ${ic('arrow_forward')}</button>
  </div></div>`;
};

modals.join = () => `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal" style="text-align:center">
  <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
  <p class="eyebrow">New here?</p>
  <h2 class="h-md" style="margin-top:20px">Join the Wild Club</h2>
  <p class="lead" style="margin-top:20px">Scan to get the app. Earn ${POINTS_PER_CHF} points per franc and get free energy balls on your first app order.</p>
  <div class="qr" style="margin:44px auto 0;width:380px;height:380px">${qrSvg(11, 29, true)}</div>
  <button class="btn btn-ghost btn-block" style="margin-top:44px" onclick="A.afterLoyalty()">Continue without signing in</button>
</div></div>`;

/* inline SVG flags (offline-safe, render the same on every OS, unlike emoji flags) */
const FLAGS = {
  EN: `<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 60 30"><clipPath id="fl-uk"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#fl-uk)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>`,
  DE: `<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 5 3"><path d="M0 0h5v3H0z"/><path d="M0 1h5v2H0z" fill="#D00"/><path d="M0 2h5v1H0z" fill="#FFCE00"/></svg>`,
  FR: `<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 3 2"><path d="M0 0h3v2H0z" fill="#CE1126"/><path d="M0 0h2v2H0z" fill="#fff"/><path d="M0 0h1v2H0z" fill="#002654"/></svg>`,
  IT: `<svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 3 2"><path d="M0 0h3v2H0z" fill="#CE2B37"/><path d="M0 0h2v2H0z" fill="#fff"/><path d="M0 0h1v2H0z" fill="#009246"/></svg>`,
};
modals.lang = () => `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal">
  <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
  <h2 class="h-md">Language</h2>
  <div class="langs">${[['EN', 'English'], ['DE', 'Deutsch'], ['FR', 'Français'], ['IT', 'Italiano']].map(([c, n]) => `
    <button class="${S.lang === c ? 'on' : ''}" onclick="S.lang='${c}';A.closeModal()"><span class="flag">${FLAGS[c]}</span>${n} <small>${c}</small></button>`).join('')}</div>
</div></div>`;

modals.allergen = () => `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal" style="text-align:center">
  <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
  <span class="ms" style="font-size:110px;color:var(--yellow)">menu_book</span>
  <h2 class="h-md" style="margin-top:20px">Allergen guide</h2>
  <p class="lead" style="margin-top:16px">Scan for ingredients and allergens, or ask our team. Most of our menu is plant-based, and our Peanut Crumble granola is gluten-free.</p>
  <div class="qr" style="margin:40px auto 0;width:340px;height:340px">${qrSvg(23)}</div>
</div></div>`;

modals.restart = () => `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal" style="text-align:center">
  <div style="width:160px;height:160px;margin:0 auto;border-radius:50%;background:var(--ink-3);display:grid;place-items:center"><span class="ms spin-once" style="font-size:90px;color:var(--yellow)">restart_alt</span></div>
  <h2 class="h-md" style="margin-top:36px">Start over?</h2>
  <p class="lead" style="margin-top:16px">Your order will be cleared.</p>
  <div class="actions"><button class="btn btn-ghost" onclick="A.closeModal()">Keep ordering</button><button class="btn btn-red" onclick="A.reset()">Start over</button></div>
</div></div>`;

modals.idle = () => `<div class="overlay center"><div class="modal" style="text-align:center">
  <span class="ms" style="font-size:120px;color:var(--yellow)">timer</span>
  <h2 class="h-md" style="margin-top:24px">Still there?</h2>
  <p class="lead" style="margin-top:16px">We'll start over in <b id="idlecd" style="color:var(--cream)">20</b> seconds.</p>
  <button class="btn btn-primary btn-block" style="margin-top:40px" onclick="A.closeModal()">I'm still here</button>
</div></div>`;

modals.itemno = () => {
  const m = S.modal, code = m.code || '';
  return `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal">
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <h2 class="h-md" style="text-align:center">Enter item number</h2>
    <p class="small" style="text-align:center;margin-top:10px">The 4-digit number under the barcode · try 1001 – 1005</p>
    <div class="code-display ${m.err ? 'err' : ''}">${[0, 1, 2, 3].map((i) => `<i class="${i === code.length ? 'f' : ''} ${code[i] ? 'in' : ''}">${code[i] || ''}</i>`).join('')}</div>
    ${keypad('itemKey')}
    <button class="btn btn-primary btn-block" style="margin-top:28px" ${code.length === 4 ? '' : 'disabled'} onclick="A.itemKey('ok')">Add item</button>
  </div></div>`;
};

modals.tip = () => {
  const code = S.modal.code || '';
  return `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal">
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <h2 class="h-md" style="text-align:center">Custom tip</h2><p class="small" style="text-align:center;margin-top:10px">Thank you, the crew will love it.</p>
    <div class="amount-display">CHF <b>${code ? (parseInt(code, 10) / 100).toFixed(2) : '0.00'}</b></div>
    ${keypad('tipKey')}
    <button class="btn btn-primary btn-block" style="margin-top:28px" onclick="A.tipKey('ok')">Add tip</button>
  </div></div>`;
};

const KB = ['1234567890', 'QWERTZUIOP', 'ASDFGHJKL', 'YXCVBNM'];
modals.promo = () => {
  const m = S.modal, code = m.code || '';
  return `<div class="overlay promo-ov" onclick="if(event.target===this)A.closeModal()">
    <div class="modal promo-modal">
      <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
      <h2 class="h-md" style="text-align:center">Insert promo code</h2>
      <div class="promo-input ${m.err ? 'err' : ''}">${code || '<span class="ph-t">Enter promo code</span>'}<i class="caret"></i></div>
      ${m.err ? `<p class="err-t">${ic('error')} That code isn't valid. Check it and try again.</p>` : ''}
      <button class="btn btn-red btn-block" style="margin-top:28px" ${code ? '' : 'disabled'} onclick="A.verifyPromo()">Verify promo</button>
      ${S.promo ? `<button class="link" style="display:block;margin:22px auto 0" onclick="A.removePromo()">Remove ${S.promo}</button>` : ''}
    </div>
    <div class="kb">${KB.map((row, ri) => `<div class="kr">${[...row].map((k) => `<button onclick="A.promoKey('${k}')">${k}</button>`).join('')}${ri === 3 ? `<button class="wide" onclick="A.promoKey('del')">${ic('backspace')}</button>` : ''}</div>`).join('')}
      <div class="kr"><button class="wide" onclick="A.promoKey('-')">–</button><button class="space" onclick="A.promoKey(' ')">space</button><button class="wide dark" onclick="A.verifyPromo()">${ic('keyboard_return')}</button></div></div>
  </div>`;
};

modals.coupons = () => {
  const pick = S.modal.pick;
  return `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal">
    <h2 class="h-md" style="text-align:center">Available discounts</h2>
    <p class="small" style="text-align:center;margin-top:10px">One coupon per order${S.member ? ' · claimed vouchers from My Offers are marked' : ''}</p>
    <div class="coupon-list stagger">${COUPONS.map((c) => `
      <button class="cpn ${pick === c.id ? 'on' : ''}" onclick="A.modal({...S.modal, pick: S.modal.pick==='${c.id}'?null:'${c.id}'})">
        <span class="ci">${ic('confirmation_number', 'fill')}</span>
        <span style="flex:1;text-align:left"><b>${c.title}</b><small>${c.sub}${S.member && S.claimed.includes(c.id) ? ' · <i class="yellow">Claimed</i>' : ''}</small></span>
        <span class="radio">${pick === c.id ? ic('check') : ''}</span></button>`).join('')}</div>
    <div class="actions"><button class="btn btn-ghost" onclick="A.closeModal()">Close</button><button class="btn btn-red" onclick="A.applyCoupon()">Apply discount</button></div>
  </div></div>`;
};

/* Checkout upsell: full bottom sheet of the most popular items, opened from the cart bar's Checkout */
const POPULAR = ['harvest-poke', 'original-bowl', 'berry-wild', 'avo-toast', 'snickers-protein', 'matcha-latte', 'agua-fresca', 'cacao-coco'];
const POP_TINTS = ['#E2E8DF', '#EFE3EA', '#F3EBDC', '#E3E8EE'];   // sage, açaí blush, oat, mist
modals.popular = () => {
  const inCart = (id) => S.cart.filter((l) => l.itemId === id && !l.reward).reduce((a, l) => a + l.qty, 0);
  const cards = POPULAR.map((id, i) => {
    const it = byId[id], n = inCart(id);
    return `<div class="pp">
      <div class="pp-im" style="--t:${POP_TINTS[i % POP_TINTS.length]}">${imgTag(it.img, it.filter, it.name)}</div>
      <div class="pp-nm">${it.name}</div>
      <div class="pp-pr">${fmt(it.price)}</div>
      ${n ? `<div class="pp-qty"><button aria-label="Remove one ${it.name}" onclick="A.popDec('${id}')">${ic(n > 1 ? 'remove' : 'delete')}</button>
        <b>${n}</b><button aria-label="Add one more ${it.name}" onclick="A.popAdd('${id}', this)">${ic('add')}</button></div>`
        : `<button class="pp-add" onclick="A.popAdd('${id}', this)">${ic('add_shopping_cart')} Add to cart</button>`}
    </div>`;
  }).join('');
  const shown = S.cart.slice(-3).reverse(), more = S.cart.length - shown.length;
  return `<div class="overlay bottom pop-ov" onclick="if(event.target===this)A.closeModal()"><div class="sheet pop-sheet">
    <div class="grab"></div>
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <div class="pp-head"><h2 class="h-md">Most popular items</h2></div>
    <div class="pp-scroll"><div class="pp-grid stagger">${cards}</div></div>
    <div class="pp-bar">
      <div class="bag pp-ths">${shown.map((l) => `<span class="pp-th">${thumb(byId[l.itemId])}</span>`).join('')}${more > 0 ? `<span class="pp-th pp-more">+${more}</span>` : ''}</div>
      <div class="pp-sum"><div class="price">${fmt(discounted())}</div><div class="small">${cartCount()} ${cartCount() === 1 ? 'item' : 'items'} added to cart</div></div>
      <button class="btn btn-primary" onclick="A.go('cart')">Checkout anyway ${ic('chevron_right')}</button>
    </div>
  </div></div>`;
};

/* Loyalty profile pop-up (from the member chip in the header): summary + sign out */
modals.profile = () => {
  const m = S.member; if (!m) return '';
  return `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal profile">
    <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
    <div class="pf-av rise">${avatarIn(m)}</div>
    <h2 class="pf-hi rise" style="--i:1">Welcome back, ${m.name}!</h2>
    <div class="pf-pts rise" style="--i:2">
      <div class="pf-pts-tx"><b>Earning points</b><span>You can use them while ordering, from My Offers in the menu.</span></div>
      <div class="pf-pts-pill">${ic('workspace_premium', 'fill')}<b data-count="${avail()}">${pts(avail())}</b></div>
    </div>
    <div class="actions pf-acts rise" style="--i:3">
      <button class="btn btn-ghost" onclick="A.offers()">${ic('redeem')} My Offers</button>
      <button class="btn btn-red" onclick="A.signOut()">${ic('logout')} Sign out</button>
    </div>
  </div></div>`;
};

modals.ereceipt = () => `<div class="overlay center" onclick="if(event.target===this)A.closeModal()"><div class="modal" style="width:980px">
  <button class="icon-btn close" aria-label="Close" onclick="A.closeModal()">${ic('close')}</button>
  <h2 class="h-md" style="text-align:center">Your digital receipt</h2>
  <p class="small" style="text-align:center;margin-top:10px">Scan with your phone camera to download it and follow your order live.</p>
  <div class="er">
    <div class="qr" style="width:330px;height:330px;margin:0">${qrSvg(9, 25, true)}</div>
    <div class="phone-mock"><div class="pm-notch"></div><div class="pm-url">${ic('lock')} order.wild-bowls.com/${S.orderNo}</div>
      <img src="assets/wb-logo.svg" alt="" style="width:170px;margin:26px auto 4px">
      <div class="pm-t">Thank you!</div><div class="pm-s">for placing the order</div>
      <div class="pm-card"><small>Your order no.</small><b>${S.orderNo}</b><div class="pm-st">${ic('schedule')} Ready in ~ 8–12 min</div></div>
      <div class="pm-btn">${ic('download')} Download receipt</div></div>
  </div>
  <button class="btn btn-primary btn-block" style="margin-top:36px" onclick="A.closeModal()">Done</button>
</div></div>`;

/* ---------------- render ---------------- */
/* Patch the live DOM to match new markup instead of replacing it, so a tap only changes
   what actually changed: no image reloads, no replayed entrance animations, and CSS
   transitions (selection borders, counters) animate between states. */
const KEEP_CLASSES = [];
const transient = (n) => n.nodeType === 1 && (n.classList.contains('ripple') || n.classList.contains('ripple-box'));
const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
function morphChildren(from, to) {
  const news = [...to.childNodes];
  let olds = [...from.childNodes].filter((n) => !transient(n));
  news.forEach((nn, i) => {
    let on = olds[i];
    const k = keyOf(nn);
    if (k && on && keyOf(on) !== k) {   // keyed rows (cart lines) move instead of morphing into a neighbour
      const match = olds.find((o) => keyOf(o) === k);
      if (match) { from.insertBefore(match, on); olds = [...from.childNodes].filter((n) => !transient(n)); on = match; }
    }
    if (!on) from.appendChild(nn);
    else if (on.nodeType !== nn.nodeType || on.nodeName !== nn.nodeName || (on.nodeType === 1 && on.id !== nn.id)) from.replaceChild(nn, on);
    else if (on.nodeType === 3 || on.nodeType === 8) { if (on.nodeValue !== nn.nodeValue) on.nodeValue = nn.nodeValue; }
    else morphEl(on, nn);
  });
  [...from.childNodes].filter((n) => !transient(n)).slice(news.length).forEach((n) => n.remove());
}
function morphEl(a, b) {
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name)) a.removeAttribute(name);
  for (const { name, value } of [...b.attributes]) {
    if (name === 'class') {
      const keep = KEEP_CLASSES.filter((c) => a.classList.contains(c));
      const v = [value, ...keep].join(' ').trim();
      if (a.getAttribute('class') !== v) a.setAttribute('class', v);
    } else if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  }
  if ('value' in a && a.value !== b.value && a.tagName !== 'BUTTON') a.value = b.value;
  if (a.tagName === 'VIDEO') return;   // keep playback position
  morphChildren(a, b);
}

function render(nav = false) {
  const keep = {};
  const sameScreen = !nav && prev.screen === S.screen;
  if (sameScreen) $stage.querySelectorAll('.catalog, .content, .hscroll, .pp-scroll').forEach((el, i) => (keep[i] = [el.scrollTop, el.scrollLeft]));
  const sameModal = sameScreen && S.modal && prev.modal === S.modal.type;
  let html = screens[S.screen]();
  if (S.modal) html += modals[S.modal.type]();
  const oldToast = $stage.querySelector('.toast'), flyers = [...$stage.querySelectorAll('.flyer, .ripple-box')];
  oldToast?.remove(); flyers.forEach((f) => f.remove());
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const hadModal = !!$stage.querySelector('.overlay');
  if (hadModal && !sameModal) $stage.querySelector('.overlay').remove();   // a different modal enters fresh
  if (sameScreen) morphChildren($stage, tpl.content); else { $stage.innerHTML = ''; $stage.appendChild(tpl.content); }
  if (oldToast) $stage.appendChild(oldToast);
  flyers.forEach((f) => $stage.appendChild(f));
  const scr = $stage.querySelector('.screen');
  if (!sameScreen) { stagger(scr); countUp(scr); }
  if (S.modal && !(sameModal && hadModal)) { const ov = $stage.querySelector('.overlay'); stagger(ov); countUp(ov); }
  if (sameScreen) $stage.querySelectorAll('.catalog, .content, .hscroll, .pp-scroll').forEach((el, i) => { if (keep[i]) { el.scrollTop = keep[i][0]; el.scrollLeft = keep[i][1]; } });
  prev = { screen: S.screen, modal: S.modal?.type || null, count: cartCount() };
  if (S.screen === 'done' && nav) startDoneCountdown();
}

function startDoneCountdown() {
  clearInterval(doneTimer);
  let t = 90;
  doneTimer = setInterval(() => {
    t--; const el = document.getElementById('cd');
    if (el) el.textContent = `Back to start in ${t} s`;
    if (t <= 0 || S.screen !== 'done') { clearInterval(doneTimer); if (S.screen === 'done' && t <= 0) reset(); }
  }, 1000);
}

/* idle detection */
let idleT, idleCd;
function bumpIdle() {
  clearTimeout(idleT);
  if (S.modal?.type === 'idle') return;
  idleT = setTimeout(() => {
    if (['splash', 'done', 'pay', 'printing'].includes(S.screen)) return;
    modal({ type: 'idle' });
    let t = 20;
    clearInterval(idleCd);
    idleCd = setInterval(() => {
      t--; const el = document.getElementById('idlecd'); if (el) el.textContent = t;
      if (S.modal?.type !== 'idle') { clearInterval(idleCd); bumpIdle(); return; }
      if (t <= 0) { clearInterval(idleCd); reset(); }
    }, 1000);
  }, 90000);
}
['pointerdown', 'keydown'].forEach((e) => document.addEventListener(e, bumpIdle, true));
/* ripple on every tap.
   Drawn on a stage-level layer (not inside the button), so it
   - starts on pointerdown, at the exact touch point,
   - is clipped to the button's own shape and corner radius,
   - survives the re-render / screen change the tap triggers,
   - stays correct under the stage scale and the button's press-scale. */
const RIPPLE_MS = 550;
const toStage = () => { const st = $stage.getBoundingClientRect(); return { st, k: st.width / 1080 }; };
document.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  const b = e.target.closest('button, [role="button"]');
  if (!b || b.disabled || !$stage.contains(b)) return;
  if (b.classList.contains('card')) return;   // product cards: press-scale only, no ripple (their + button still ripples)
  const r = b.getBoundingClientRect(); if (!r.width || !r.height) return;
  const { st, k } = toStage();
  const cs = getComputedStyle(b);
  const sx = r.width / k / (b.offsetWidth || r.width / k);         // the button's own visual scale (:active press)
  const rad = (v) => (v.endsWith('%') ? v : parseFloat(v) * sx + 'px');
  const w = r.width / k, h = r.height / k;
  const x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
  const d = 2 * Math.hypot(Math.max(x, w - x), Math.max(y, h - y)); // reaches the farthest corner
  const box = document.createElement('div');
  box.className = 'ripple-box';
  Object.assign(box.style, { left: (r.left - st.left) / k + 'px', top: (r.top - st.top) / k + 'px', width: w + 'px', height: h + 'px',
    borderRadius: [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(rad).join(' ') });
  const s = document.createElement('i');
  s.className = 'ripple';
  Object.assign(s.style, { width: d + 'px', height: d + 'px', left: x - d / 2 + 'px', top: y - d / 2 + 'px', color: cs.color });
  box.appendChild(s);
  $stage.appendChild(box);
  setTimeout(() => box.remove(), RIPPLE_MS + 50);
}, true);

/* ---------------- actions ---------------- */
const A = {
  go, modal, closeModal, reset, render,
  contrast() { const on = $stage.classList.toggle('contrast'); render(); toast(null, on ? 'High contrast on' : 'High contrast off', 'contrast'); },
  setType(t, el) { S.orderType = t; el?.classList.add('picked'); setTimeout(() => go(S.member ? 'menu' : 'loyalty'), 380); },
  signinFrom(ret = null) { S.returnTo = ret; go('loyalty'); },
  afterLoyalty() { const r = S.returnTo; S.returnTo = null; if (r === 'menu') S.cat = 'offers'; go(r || 'menu'); },
  signedIn() { S.member = { ...DEMO_MEMBER }; modal({ type: 'welcome' }); },
  offers() { S.cat = 'offers'; go('menu'); },
  signOut() {   // leave the loyalty profile: keep the order, drop member-only benefits
    S.member = null; S.loyalty = null;
    S.cart = S.cart.filter((l) => !l.reward);
    if (S.cat === 'offers') S.cat = 'popular';
    S.modal = null; render();
    toast(null, 'Signed out of Wild Club', 'logout');
  },
  key(k) {
    const m = { ...S.modal, err: false }; let c = m.code || '';
    if (k === 'del') c = c.slice(0, -1);
    else if (k === 'ok') { if (c.length === 4) return A.signedIn(); m.err = true; }
    else if (c.length < 4) c += k;
    m.code = c; modal(m);
  },
  cat(id) { S.cat = id; render(true); },
  openItem(id) { modal({ type: 'item', id, qty: 1 }); },
  quickAdd(id, el) {
    const it = byId[id];
    if (isCustom(it)) return A.addAsIs(id, el);
    if (it.type === 'bundle') return A.openItem(id);
    flyFrom(el); addToCart(id); render();
  },
  addAsIs(id, el) { flyFrom(el); addToCart(id, { base: byId[id].bases?.opts[0].id || null, extras: {}, removed: [], menu: null }); S.modal = null; render(); },
  pick(key, id) { modal({ ...S.modal, picks: { ...S.modal.picks, [key]: id } }); },
  addBundle(id, q, el) { flyFrom(el); addToCart(id, bundleMods(byId[id]), q); S.modal = null; render(); },
  popAdd(id, el) {
    const it = byId[id];
    flyFrom(el);
    addToCart(id, isCustom(it) ? { base: it.bases?.opts[0].id || null, extras: {}, removed: [], menu: null } : null);
    render();
  },
  popDec(id) {   // take one unit off the most recently added (non-reward) line of this item
    const l = [...S.cart].reverse().find((x) => x.itemId === id && !x.reward); if (!l) return;
    if (l.qty > 1) l.qty--; else S.cart = S.cart.filter((x) => x !== l);
    render();
  },
  addSimple(id, q, el) { flyFrom(el); addToCart(id, null, q); S.modal = null; render(); },
  customise(id, opts = {}) {
    S.cz = { itemId: id, step: 0, base: byId[id].bases?.opts[0].id || null, extras: {}, removed: [], side: opts.menu ? MENU_SIDES[0].id : null, drink: opts.menu ? MENU_DRINKS[0].id : null, coffee: false, qty: 1, editUid: null };
    if (opts.step) S.cz.step = czSteps().indexOf(opts.step);
    go('custom');
  },
  cz(patch) { Object.assign(S.cz, patch); render(); },
  czGo(i) { S.cz.step = i; render(true); },
  extra(id, d) { const q = (S.cz.extras[id] || 0) + d; S.cz.extras[id] = Math.max(0, Math.min(3, q)); render(); },
  toggleIng(g) { const r = S.cz.removed; S.cz.removed = r.includes(g) ? r.filter((x) => x !== g) : [...r, g]; render(); },
  czNext() {
    const steps = czSteps();
    if (S.cz.step < steps.length - 1) { S.cz.step++; return render(true); }
    const c = S.cz;
    if (c.editUid) {
      const l = S.cart.find((x) => x.uid === c.editUid);
      Object.assign(l, { mods: czMods(), qty: c.qty, unit: unitPrice(byId[c.itemId], czMods()) });
      S.cz = null; go('cart'); toast(byId[l.itemId], 'Order updated');
    } else { addToCart(c.itemId, czMods(), c.qty); S.cz = null; go('menu'); }
  },
  czBack() { if (S.cz.step > 0) { S.cz.step--; render(true); } else { const back = S.cz.editUid ? 'cart' : 'menu'; S.cz = null; go(back); } },
  qty(u, d) { const l = S.cart.find((x) => x.uid === u); l.qty += d; if (l.qty <= 0) A.removeLine(u); else render(); },
  removeLine(u) {
    const el = $stage.querySelector(`.cart .line[data-key="line-${u}"]`);
    const done = () => { S.cart = S.cart.filter((x) => x.uid !== u); render(); };
    if (el) { el.classList.add('leaving'); setTimeout(done, 260); } else done();
  },
  editLine(u) {
    const l = S.cart.find((x) => x.uid === u), m = l.mods || {};
    S.cz = { itemId: l.itemId, step: 0, base: m.base || byId[l.itemId].bases?.opts[0].id || null, extras: { ...(m.extras || {}) }, removed: [...(m.removed || [])],
      side: m.menu?.side || null, drink: m.menu?.drink || null, coffee: !!m.menu?.coffee, qty: l.qty, editUid: u };
    S.cz.step = czSteps().length - 1; go('custom');
  },
  redeem(p, el) {
    const ex = S.cart.find((l) => l.reward === p);
    if (ex) { S.cart = S.cart.filter((l) => l !== ex); return render(); }
    const r = REWARDS.find((x) => x.pts === p);
    if (avail() < p) return toast(null, 'Not enough points yet', 'info');
    flyFrom(el); addToCart(r.item, null, 1, p); render();
  },
  claim(id) {
    const on = S.claimed.includes(id);
    S.claimed = on ? S.claimed.filter((x) => x !== id) : [...S.claimed, id];
    if (on && S.coupon === id) S.coupon = null;
    render(); toast(null, on ? 'Voucher unclaimed' : 'Voucher claimed · use it at checkout', on ? 'undo' : 'confirmation_number');
  },
  /* cart options */
  setTip(t) { S.tip = t; render(); },
  tipKey(k) {
    let c = S.modal.code || '';
    if (k === 'ok') { S.tip = { chf: (parseInt(c || '0', 10)) / 100 }; S.modal = null; return render(); }
    if (k === 'del') c = c.slice(0, -1); else if (c.length < 5) c = (c + k).replace(/^0+/, '');
    modal({ ...S.modal, code: c });
  },
  setLoyalty(id) { S.loyalty = S.loyalty === id ? null : id; render(); },
  promoKey(k) { let c = S.modal.code || ''; if (k === 'del') c = c.slice(0, -1); else if (c.length < 14) c += k; modal({ ...S.modal, code: c, err: false }); },
  verifyPromo() {
    const c = (S.modal.code || '').trim().toUpperCase();
    if (PROMO_CODES[c]) { S.promo = c; S.modal = null; render(); toast(null, `Promo ${c} applied · ${PROMO_CODES[c].label}`, 'sell'); }
    else modal({ ...S.modal, err: true });
  },
  removePromo() { S.promo = null; S.modal = null; render(); },
  applyCoupon() { S.coupon = S.modal.pick || null; S.modal = null; render(); if (S.coupon) toast(null, 'Coupon applied', 'confirmation_number'); },
  /* scan */
  openScan(from) { S.scan = { from, items: [], n: 0 }; go('scan'); },
  closeScan() { const f = S.scan?.from || 'menu'; S.scan = null; go(f); },
  scanNext() { const it = SCAN_ITEMS[S.scan.n++ % SCAN_ITEMS.length]; A.scanPush(it.id); },
  scanPush(id) {
    const ex = S.scan.items.find((x) => x.id === id);
    if (ex) ex.qty++; else S.scan.items.unshift({ id, qty: 1 });
    S.scan.flash = true; render();
    setTimeout(() => { if (S.scan) { S.scan.flash = false; $stage.querySelector('.scan-stage')?.classList.remove('flash'); } }, 500);
    toast(byId[id], `Scanned · ${byId[id].name}`, 'barcode');
  },
  scanQty(id, d) { const x = S.scan.items.find((i) => i.id === id); x.qty += d; if (x.qty <= 0) S.scan.items = S.scan.items.filter((i) => i !== x); render(); },
  itemKey(k) {
    const m = { ...S.modal, err: false }; let c = m.code || '';
    if (k === 'ok') { const it = SCAN_ITEMS.find((s) => s.code === c); if (it) { S.modal = null; return A.scanPush(it.id); } m.err = true; }
    else if (k === 'del') c = c.slice(0, -1); else if (c.length < 4) c += k;
    m.code = c; modal(m);
  },
  scanAdd() {
    S.scan.items.forEach((x) => addToCart(x.id, null, x.qty, 0, true));
    const n = S.scan.items.reduce((a, x) => a + x.qty, 0), f = S.scan.from;
    S.scan = null; go(f); toast(null, `${n} scanned item${n > 1 ? 's' : ''} added`, 'add_shopping_cart');
  },
  /* checkout & payment */
  checkout() {
    S.pay = { method: null, phase: 'select', left: 90 };
    S.orderNo = S.orderNo || 100 + Math.floor(Math.random() * 900);
    go('pay');
    clearInterval(payTimer);
    payTimer = setInterval(() => {
      if (S.screen !== 'pay' || S.pay.phase !== 'select') return clearInterval(payTimer);
      S.pay.left--; const el = document.getElementById('paycd'); if (el) el.textContent = S.pay.left;
      if (S.pay.left <= 0) { clearInterval(payTimer); A.cancelPay(); toast(null, 'Payment timed out', 'timer_off'); }
    }, 1000);
  },
  cancelPay() { clearInterval(payTimer); S.pay = null; go('cart'); },
  payCard() { S.pay.method = 'card'; S.pay.phase = 'card'; render(true); },
  payTwint() { S.pay.method = 'twint'; A.paid(); },
  paid() {
    S.pay.phase = 'processing'; render(true);
    setTimeout(() => {
      if (S.screen !== 'pay') return;
      S.pay.phase = 'success'; render(true);
      if (S.member) S.member.points += earnPoints() - pointsUsed();
      setTimeout(() => { if (S.screen === 'pay') go('done'); }, 2000);
    }, 1800);
  },
  printReceipt() { clearInterval(doneTimer); go('printing'); setTimeout(() => { if (S.screen === 'printing') go('done'); }, 4500); },
};
window.A = A;

/* ---------------- scaling + deep links ---------------- */
/* ?capture=1 renders the stage at exactly 1080 × 1920 with animations finished (used to export screens to Figma) */
const CAPTURE = /[?&]capture=1/.test(location.search);
if (CAPTURE) document.documentElement.classList.add('capture');
if (CAPTURE && /[?&]export=1/.test(location.search)) setTimeout(() => { const sc = document.createElement('script'); sc.src = 'tools/figma-export.js?v=' + Date.now(); document.body.appendChild(sc); }, 1500);   // dev: SVG export for Figma
function fit() {
  if (CAPTURE) { $stage.style.transform = 'none'; return; }
  const d = document.documentElement;
  const s = Math.min(d.clientWidth / 1080, d.clientHeight / 1920) * 0.98;
  $stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit); new ResizeObserver(fit).observe(document.documentElement); fit();

/* Deep links for reviews, e.g. #screen=custom&item=harvest-poke&step=3&demo=1  or  #screen=menu&modal=item:harvest-poke */
function fromHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.get('screen')) return;
  if (p.get('demo')) {
    S.orderType = p.get('type') || 'dine';
    if (p.get('demo') !== 'guest') S.member = { ...DEMO_MEMBER };
    addToCart('harvest-poke', { base: 'salmon', extras: { eggs: 1 }, removed: ['Pickled onions'], menu: null }, 1, 0, true);
    addToCart('original-bowl', { base: 'm', extras: { pb: 1 }, removed: [], menu: null }, 1, 0, true);
    addToCart('berry-wild', null, 1, 0, true);
    if (p.get('demo') !== 'guest') { addToCart('cappuccino', null, 1, 500, true); S.tip = { pct: 5 }; S.loyalty = 'l10'; S.promo = 'WILD10'; }
  }
  if (p.get('cat')) S.cat = p.get('cat');
  if (p.get('contrast') === '1') $stage.classList.add('contrast');
  const screen = p.get('screen');
  if (screen === 'custom') { A.customise(p.get('item') || 'harvest-poke', { menu: p.get('menu') === '1' }); S.cz.step = +(p.get('step') || 0); }
  if (screen === 'scan') { S.scan = { from: 'menu', items: p.get('scanned') ? [{ id: 'scan-sparkling', qty: 2 }, { id: 'scan-mate', qty: 1 }, { id: 'scan-vivi', qty: 1 }] : [], n: 0 }; }
  if (['pay', 'done', 'printing'].includes(screen)) { S.pay = { method: p.get('method') || 'card', phase: p.get('phase') || 'select', left: 90 }; S.orderNo = 247; }
  S.screen = screen;
  const m = p.get('modal');
  if (m) {
    const [type, arg] = m.split(':');
    if (type === 'item') S.modal = { type, id: arg, qty: 1 };
    else if (type === 'signin') S.modal = { type, tab: arg || 'qr', code: p.get('code') || '' };
    else { if (type === 'welcome') S.member = { ...DEMO_MEMBER }; S.modal = { type, code: p.get('code') || '' }; }
  }
}
fromHash();
render(true);
bumpIdle();
addEventListener('hashchange', () => { if (!location.hash.includes('screen=')) return; S = fresh(); fromHash(); render(true); });
