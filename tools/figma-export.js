/* Figma export helper (dev only).
   Loaded when the kiosk is opened with ?capture=1&export=1. It walks the rendered #stage and writes an
   SVG of the screen (rects, rounded clips, gradients, strokes, photos as embedded images, inline SVGs,
   editable <text> per line, Material Symbols icons as icon-font text) into <textarea id="figma-svg">.
   Figma imports that SVG as editable layers. Not used by the kiosk itself. */
window.figmaExportSVG = async function exportScreen() {
  const stage = document.getElementById('stage');
  const S0 = stage.getBoundingClientRect();
  const W = 1080, H = 1920;
  const defs = [];
  let uid = 0;
  const id = (p) => `${p}${++uid}`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n2 = (v) => Math.round(v * 100) / 100;

  /* ---------- colours ---------- */
  function color(c, keepClear = false) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (!a && !keepClear) return null;
    return { rgb: `rgb(${p[0]},${p[1]},${p[2]})`, a };
  }
  const paintAttr = (k, c) => `${k}="${c.rgb}"${c.a < 1 ? ` ${k}-opacity="${n2(c.a)}"` : ''}`;

  /* ---------- fonts ---------- */
  const FAMILY = (f) => {
    const first = f.split(',')[0].replace(/["']/g, '').trim();
    if (/Barlow Condensed/i.test(first)) return 'Barlow Condensed';
    if (/Material Symbols/i.test(first)) return 'Material Symbols Rounded';
    if (/DM Mono|ui-monospace|Menlo|monospace/i.test(first)) return 'DM Mono';
    return 'Arimo';   // Arial / Helvetica → metric-compatible Arimo in Figma
  };
  const metricCache = new Map();
  const cnv = document.createElement('canvas').getContext('2d');
  function metrics(cs) {
    const key = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (!metricCache.has(key)) {
      cnv.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = cnv.measureText('Hgjy');
      metricCache.set(key, { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent });
    }
    return metricCache.get(key);
  }

  /* ---------- geometry ---------- */
  const rel = (r) => ({ x: r.left - S0.left, y: r.top - S0.top, w: r.width, h: r.height });
  function radii(cs, w, h) {
    const lim = Math.min(w, h) / 2;
    const one = (v) => { const s = v.split(' ')[0]; const n = s.endsWith('%') ? (parseFloat(s) / 100) * Math.min(w, h) : parseFloat(s) || 0; return Math.min(n, lim); };
    return [one(cs.borderTopLeftRadius), one(cs.borderTopRightRadius), one(cs.borderBottomRightRadius), one(cs.borderBottomLeftRadius)];
  }
  function shape(b, rr, extra = '') {
    const [tl, tr, br, bl] = rr;
    if (tl === tr && tr === br && br === bl) return `<rect x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}"${tl ? ` rx="${n2(tl)}"` : ''} ${extra}/>`;
    const { x, y, w, h } = b;
    const d = `M${x + tl},${y}H${x + w - tr}${tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : ''}V${y + h - br}${br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : ''}H${x + bl}${bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : ''}V${y + tl}${tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : ''}Z`;
    return `<path d="${d.replace(/(\d+\.\d{3,})/g, (m) => n2(+m))}" ${extra}/>`;
  }
  const inset = (b, d) => ({ x: b.x + d, y: b.y + d, w: Math.max(0, b.w - 2 * d), h: Math.max(0, b.h - 2 * d) });
  const shrinkR = (rr, d) => rr.map((r) => Math.max(0, r - d));

  /* ---------- gradients ---------- */
  function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; }
  function stops(parts) {
    const st = parts.map((p) => { const c = color(p, true) || (/transparent/.test(p) ? { rgb: 'rgb(0,0,0)', a: 0 } : null); const pm = p.match(/\)\s*([\d.]+)%|\s([\d.]+)%/); return c ? { c, o: pm ? parseFloat(pm[1] || pm[2]) / 100 : null } : null; }).filter(Boolean);
    st.forEach((s, i) => { if (s.o == null) s.o = st.length === 1 ? 0 : i / (st.length - 1); });
    return st.map((s) => `<stop offset="${n2(s.o)}" stop-color="${s.c.rgb}" stop-opacity="${n2(s.c.a)}"/>`).join('');
  }
  function gradientFill(bg, b) {
    const lm = bg.match(/^linear-gradient\((.*)\)$/s);
    if (lm) {
      const parts = splitTop(lm[1]); let ang = 180;
      if (/deg/.test(parts[0])) ang = parseFloat(parts.shift());
      else if (/^to /.test(parts[0])) { const t = parts.shift(); ang = { 'to right': 90, 'to left': 270, 'to top': 0, 'to bottom': 180 }[t] ?? 180; }
      const a = (ang - 90) * Math.PI / 180, cx = 0.5, cy = 0.5, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
      const g = id('lg'); defs.push(`<linearGradient id="${g}" x1="${n2(cx - dx)}" y1="${n2(cy - dy)}" x2="${n2(cx + dx)}" y2="${n2(cy + dy)}">${stops(parts)}</linearGradient>`);
      return `url(#${g})`;
    }
    const rm = bg.match(/^radial-gradient\((.*)\)$/s);
    if (rm) {
      const parts = splitTop(rm[1]); let cx = 0.5, cy = 0.5;
      if (!color(parts[0]) && !/transparent/.test(parts[0])) { const at = parts.shift().match(/at\s+([\d.]+)(%|px)\s+([\d.]+)(%|px)/); if (at) { cx = at[2] === '%' ? at[1] / 100 : at[1] / b.w; cy = at[4] === '%' ? at[3] / 100 : at[3] / b.h; } }
      const g = id('rg'); defs.push(`<radialGradient id="${g}" cx="${n2(cx)}" cy="${n2(cy)}" r="0.75">${stops(parts)}</radialGradient>`);
      return `url(#${g})`;
    }
    return null;
  }

  /* ---------- images ---------- */
  const dataCache = new Map();
  async function dataUri(url) {
    if (dataCache.has(url)) return dataCache.get(url);
    const p = fetch(url).then((r) => r.blob()).then((b) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }));
    dataCache.set(url, p); return p;
  }
  function videoFrame(v) { try { const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; if (!c.width) return null; c.getContext('2d').drawImage(v, 0, 0); return c.toDataURL('image/jpeg', 0.85); } catch (e) { return null; } }

  /* ---------- walk ---------- */
  const out = [];
  const visible = (cs) => cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0;
  const intersects = (b, c) => !c || (b.x < c.x + c.w && b.x + b.w > c.x && b.y < c.y + c.h && b.y + b.h > c.y);

  async function walk(el, clip) {
    const cs = getComputedStyle(el);
    if (!visible(cs)) return;
    const r = el.getBoundingClientRect(), b = rel(r);
    const sized = b.w > 0.5 && b.h > 0.5;
    if (sized && !intersects(b, clip) && cs.overflow === 'visible' && !el.querySelector('.overlay')) return;
    const rr = sized ? radii(cs, b.w, b.h) : [0, 0, 0, 0];
    const op = +cs.opacity;
    const name = (el.getAttribute('aria-label') || el.className && typeof el.className === 'string' && el.className.split(' ')[0] || el.tagName.toLowerCase()).slice(0, 40);
    out.push(`<g id="${esc(id(name.replace(/[^\w-]/g, '_') + '-'))}"${op < 1 ? ` opacity="${n2(op)}"` : ''}>`);

    if (sized) {
      /* outer drop shadows → filter on the background shape */
      const shadows = cs.boxShadow === 'none' ? [] : splitTop(cs.boxShadow);
      let filter = '';
      for (const s of shadows) {
        if (/inset/.test(s)) continue;
        const c = color(s); const nums = (s.replace(/rgba?\([^)]+\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        const [dx = 0, dy = 0, blur = 0, spread = 0] = nums;
        if (c && !dx && !dy && !blur && spread > 0) { out.push(shape(inset(b, -spread / 2), shrinkR(rr, -spread / 2), `fill="none" ${paintAttr('stroke', c)} stroke-width="${n2(spread)}"`)); continue; }
        if (c && blur > 0 && !filter) { const f = id('sh'); defs.push(`<filter id="${f}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${n2(blur / 2)}" flood-color="${c.rgb}" flood-opacity="${n2(c.a)}"/></filter>`); filter = ` filter="url(#${f})"`; }
      }
      /* background colour + gradients / url() layers */
      const bgc = color(cs.backgroundColor);
      if (bgc) out.push(shape(b, rr, `${paintAttr('fill', bgc)}${filter}`)), filter = '';
      if (cs.backgroundImage !== 'none') {
        for (const layer of splitTop(cs.backgroundImage).reverse()) {
          const um = layer.match(/^url\("?(.*?)"?\)$/);
          if (um) {
            const cp = id('bc'); defs.push(`<clipPath id="${cp}">${shape(b, rr)}</clipPath>`);
            out.push(`<g clip-path="url(#${cp})"><image x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" preserveAspectRatio="xMidYMid slice" href="${await dataUri(um[1])}"/></g>`);
          } else { const gf = gradientFill(layer, b); if (gf) out.push(shape(b, rr, `fill="${gf}"${filter}`)), filter = ''; }
        }
      }
      if (filter && (cs.borderTopStyle !== 'none' || shadows.length)) { /* shadow on a transparent box: skip */ }
      /* borders */
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ s, w: parseFloat(cs[`border${s}Width`]) || 0, c: color(cs[`border${s}Color`]), st: cs[`border${s}Style`] }));
      const uniform = sides.every((x) => x.w === sides[0].w && x.st === sides[0].st && x.c && sides[0].c && x.c.rgb === sides[0].c.rgb);
      const ring = !uniform && sides.every((x) => x.w === sides[0].w && x.w > 0 && x.st !== 'none' && x.c) && rr[0] >= Math.min(b.w, b.h) / 2 - 1;
      if (ring) {
        const w = sides[0].w, cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) / 2 - w / 2;
        const base = sides[1].c, odd = sides.find((x) => x.c.rgb !== base.rgb) || sides[0];
        out.push(`<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(R)}" fill="none" ${paintAttr('stroke', base)} stroke-width="${w}"/>`);
        const ang = { Top: -90, Right: 0, Bottom: 90, Left: 180 }[odd.s] * Math.PI / 180, a1 = ang - Math.PI / 4, a2 = ang + Math.PI / 4;
        out.push(`<path d="M${n2(cx + R * Math.cos(a1))},${n2(cy + R * Math.sin(a1))}A${n2(R)},${n2(R)} 0 0 1 ${n2(cx + R * Math.cos(a2))},${n2(cy + R * Math.sin(a2))}" fill="none" ${paintAttr('stroke', odd.c)} stroke-width="${w}"/>`);
      } else if (uniform && sides[0].w > 0 && sides[0].st !== 'none') {
        const w = sides[0].w; out.push(shape(inset(b, w / 2), shrinkR(rr, w / 2), `fill="none" ${paintAttr('stroke', sides[0].c)} stroke-width="${w}"${sides[0].st === 'dashed' ? ' stroke-dasharray="8 6"' : ''}`));
      } else {
        for (const x of sides) {
          if (!x.w || x.st === 'none' || !x.c) continue;
          const L = { Top: [b.x, b.y + x.w / 2, b.x + b.w, b.y + x.w / 2], Bottom: [b.x, b.y + b.h - x.w / 2, b.x + b.w, b.y + b.h - x.w / 2], Left: [b.x + x.w / 2, b.y, b.x + x.w / 2, b.y + b.h], Right: [b.x + b.w - x.w / 2, b.y, b.x + b.w - x.w / 2, b.y + b.h] }[x.s];
          out.push(`<line x1="${n2(L[0])}" y1="${n2(L[1])}" x2="${n2(L[2])}" y2="${n2(L[3])}" ${paintAttr('stroke', x.c)} stroke-width="${x.w}"${x.st === 'dashed' ? ' stroke-dasharray="8 6"' : ''}/>`);
        }
      }
    }

    /* replaced content */
    if (el.tagName === 'IMG' && sized && /\.svg(\?|$)/i.test(el.currentSrc || el.src)) {
      let t = await (await fetch(el.currentSrc || el.src)).text();
      t = t.replace(/<\?xml[^>]*>/, '').replace(/ id="([^"]+)"/g, (m, v) => ` id="${v}-${uid}"`).replace(/url\(#([^)]+)\)/g, (m, v) => `url(#${v}-${uid})`); uid++;
      t = t.replace(/<svg\b([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height|x|y)="[^"]*"/g, '')} x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}">`);
      out.push(t);
    } else if (el.tagName === 'IMG' && sized) {
      const fit = cs.objectFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
      const cp = id('ic'); defs.push(`<clipPath id="${cp}">${shape(b, rr)}</clipPath>`);
      out.push(`<g clip-path="url(#${cp})"><image x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" preserveAspectRatio="${fit}" href="${await dataUri(el.currentSrc || el.src)}"/></g>`);
    } else if (el.tagName === 'VIDEO' && sized) {
      const src = videoFrame(el) || (el.poster ? await dataUri(el.poster) : null);
      if (src) { const fit = cs.objectFit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'; out.push(`<image x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(b.w)}" height="${n2(b.h)}" preserveAspectRatio="${fit}" href="${src}"/>`); }
    } else if (el.tagName.toLowerCase() === 'svg' && sized) {
      const clone = el.cloneNode(true);
      const srcAll = [el, ...el.querySelectorAll('*')], dstAll = [clone, ...clone.querySelectorAll('*')];
      srcAll.forEach((src, i) => {
        const d = dstAll[i]; if (!d || src === el) return;
        const c2 = getComputedStyle(src);
        const fc = color(c2.fill, true), sc2 = color(c2.stroke, true);
        if (c2.fill && c2.fill !== 'none' && fc) { d.setAttribute('fill', fc.rgb); if (fc.a < 1) d.setAttribute('fill-opacity', n2(fc.a)); } else if (c2.fill === 'none') d.setAttribute('fill', 'none');
        if (c2.stroke && c2.stroke !== 'none' && sc2) { d.setAttribute('stroke', sc2.rgb); d.setAttribute('stroke-width', parseFloat(c2.strokeWidth) || 1); if (c2.strokeLinecap !== 'butt') d.setAttribute('stroke-linecap', c2.strokeLinecap); if (c2.strokeLinejoin !== 'miter') d.setAttribute('stroke-linejoin', c2.strokeLinejoin); }
        if (c2.strokeDasharray && c2.strokeDasharray !== 'none' && parseFloat(c2.strokeDashoffset) > 0.5) { d.setAttribute('stroke-dasharray', c2.strokeDasharray); d.setAttribute('stroke-dashoffset', c2.strokeDashoffset); }
        if (+c2.opacity < 1) d.setAttribute('opacity', c2.opacity);
      });
      clone.setAttribute('x', n2(b.x)); clone.setAttribute('y', n2(b.y)); clone.setAttribute('width', n2(b.w)); clone.setAttribute('height', n2(b.h));
      clone.removeAttribute('class'); clone.removeAttribute('style');
      let s = new XMLSerializer().serializeToString(clone).replace(/currentColor/g, (color(cs.color) || { rgb: 'rgb(0,0,0)' }).rgb);
      s = s.replace(/ id="([^"]+)"/g, (m, v) => ` id="${v}-${uid}"`).replace(/url\(#([^)]+)\)/g, (m, v) => `url(#${v}-${uid})`); uid++;
      out.push(s);
    } else if (el.classList.contains('ms')) {
      /* Material Symbols icon: icon-font text, Figma renders the ligature */
      const c = color(cs.color) || { rgb: 'rgb(0,0,0)', a: 1 };
      const fs = parseFloat(cs.fontSize);
      /* marker replaced by the real Material Symbols vector after export */
      out.push(`<!--MS|${el.textContent.trim()}|${el.classList.contains('fill') ? 1 : 0}|${c.rgb}|${n2(c.a)}|${n2(b.x + (b.w - fs) / 2)}|${n2(b.y + (b.h - fs) / 2)}|${n2(fs)}-->`);
    } else {
      /* children: clip if overflow hidden */
      let cg = null, childClip = clip;
      if (sized && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
        cg = id('oc'); defs.push(`<clipPath id="${cg}">${shape(b, rr)}</clipPath>`);
        childClip = clip ? { x: Math.max(b.x, clip.x), y: Math.max(b.y, clip.y), w: Math.min(b.x + b.w, clip.x + clip.w) - Math.max(b.x, clip.x), h: Math.min(b.y + b.h, clip.y + clip.h) - Math.max(b.y, clip.y) } : b;
        out.push(`<g clip-path="url(#${cg})">`);
      }
      for (const ch of el.childNodes) {
        if (ch.nodeType === 1) await walk(ch, childClip);
        else if (ch.nodeType === 3 && ch.textContent.trim()) textNode(ch, cs, childClip);
      }
      if (cg) out.push('</g>');
    }
    out.push('</g>');
  }

  function transformText(s, cs) {
    if (cs.textTransform === 'uppercase') return s.toUpperCase();
    if (cs.textTransform === 'lowercase') return s.toLowerCase();
    if (cs.textTransform === 'capitalize') return s.replace(/\b\w/g, (c) => c.toUpperCase());
    return s;
  }
  function textNode(tn, cs, clip) {
    const c = color(cs.color); if (!c) return;
    const txt = tn.textContent; const range = document.createRange();
    const lines = []; let cur = null;
    for (let i = 0; i < txt.length; i++) {
      range.setStart(tn, i); range.setEnd(tn, i + 1);
      const rects = range.getClientRects(); if (!rects.length) continue;
      const rc = rects[0]; if (!rc.width && /\s/.test(txt[i])) { if (cur) cur.s += ' '; continue; }
      const ws = /\s/.test(txt[i]);
      if (!cur || Math.abs(rc.top - cur.top) > 2) { if (ws) continue; cur = { top: rc.top, bottom: rc.bottom, left: rc.left, right: rc.right, s: '' }; lines.push(cur); }
      cur.s += txt[i]; if (!ws) cur.right = Math.max(cur.right, rc.right); cur.bottom = Math.max(cur.bottom, rc.bottom);
    }
    const m = metrics(cs), fam = FAMILY(cs.fontFamily), fs = parseFloat(cs.fontSize);
    const ls = parseFloat(cs.letterSpacing) || 0;
    const wt = +cs.fontWeight >= 600 ? (fam === 'Barlow Condensed' && +cs.fontWeight < 700 ? 600 : 700) : (fam === 'Barlow Condensed' && +cs.fontWeight === 500 ? 500 : 400);
    for (const L of lines) {
      const s = transformText(L.s.replace(/\s+/g, ' ').trimEnd(), cs); if (!s.trim()) continue;
      const lb = { x: L.left - S0.left, y: L.top - S0.top, w: L.right - L.left, h: L.bottom - L.top };
      if (!intersects(lb, clip)) continue;
      const base = L.top - S0.top + m.asc * (lb.h / (m.asc + m.desc || 1));
      out.push(`<text id="t${fam === 'Barlow Condensed' ? wt : 0}-${++uid}" x="${n2(lb.x)}" y="${n2(base)}" font-family="${fam}" font-weight="${wt}" font-size="${n2(fs)}"${ls ? ` letter-spacing="${n2(ls)}"` : ''}${cs.fontStyle === 'italic' ? ' font-style="italic"' : ''} ${paintAttr('fill', c)}>${esc(s)}</text>`);
    }
  }

  const sc = getComputedStyle(stage);
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" ${paintAttr('fill', color(sc.backgroundColor) || { rgb: 'rgb(246,244,239)', a: 1 })}/>`);
  for (const ch of stage.children) if (!ch.classList.contains('ripple-box') && !ch.classList.contains('toast')) await walk(ch, { x: 0, y: 0, w: W, h: H });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs.join('')}</defs>${out.join('')}</svg>`;
  return svg;
};
if (/[?&]export=1/.test(location.search)) window.figmaExportSVG().then((svg) => {
  const ta = document.createElement('textarea'); ta.id = 'figma-svg'; ta.value = svg; document.body.appendChild(ta);
  document.title = 'EXPORT-DONE ' + svg.length;
});
