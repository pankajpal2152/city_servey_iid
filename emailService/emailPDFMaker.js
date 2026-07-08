'use strict';

// ← ADD THIS ONE LINE — reads CHROMIUM_PATH from .env and tells Puppeteer to use it

const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const db = require('../config/db');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://${HOST}:${PORT}`;
const BASE_IMAGE_URL = `https://dev-iideasapi.devxportal.com/routes/uploadedFiles/`;
const MM_TO_PX = 96 / 25.4;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — fetch URL → base64 data-URI (Node-side, zero CORS)
// ─────────────────────────────────────────────────────────────────────────────
function fetchAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve('');
    if (url.startsWith('data:')) return resolve(url);

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return fetchAsBase64(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) {
        console.warn(`[BadgePdfMailer] Image fetch HTTP ${res.statusCode} for: ${url}`);
        return resolve('');
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const b64 = buf.toString('base64');
        const ct = res.headers['content-type'] || '';
        const mime = ct.split(';')[0].trim() ||
          (url.match(/\.png$/i) ? 'image/png' :
            url.match(/\.gif$/i) ? 'image/gif' :
              url.match(/\.webp$/i) ? 'image/webp' :
                url.match(/\.svg$/i) ? 'image/svg+xml' : 'image/jpeg');
        resolve(`data:${mime};base64,${b64}`);
      });
      res.on('error', (e) => { console.warn('[BadgePdfMailer] Image stream error:', e.message); resolve(''); });
    });
    req.on('error', (e) => { console.warn('[BadgePdfMailer] Image request error:', e.message); resolve(''); });
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — safe double-decode JSON
// ─────────────────────────────────────────────────────────────────────────────
function safeParse(value) {
  if (!value || typeof value === 'object') return value || {};
  try {
    const first = JSON.parse(value);
    if (typeof first === 'string') return JSON.parse(first);
    return first;
  } catch { return {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — resolve filename → absolute URL
// ─────────────────────────────────────────────────────────────────────────────
function resolveImgUrl(filename) {
  if (!filename || filename === 'null' || filename === '') return '';
  if (filename.startsWith('http') || filename.startsWith('data:')) return filename;
  return BASE_IMAGE_URL + encodeURIComponent(filename.replace(/^\//, ''));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — badge dimensions in mm
// ─────────────────────────────────────────────────────────────────────────────
function getBadgeDimsMm(size, orientation) {
  const map = {
    CR80: { w: 54, h: 85.6 },
    CR100: { w: 67, h: 99 },
    A7: { w: 74, h: 105 },
    A6: { w: 105, h: 148 },
  };
  let d = map[size] || map.CR80;
  if (orientation === 'landscape') d = { w: d.h, h: d.w };
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — build flat token lookup (handles LABELS WITH SPACES like "First Name")
// ─────────────────────────────────────────────────────────────────────────────
function buildLookup(eventData, userData) {
  const lookup = {
    EVENT_NAME: eventData.EVENT_NAME || '',
    EVENT_CATEGORY: eventData.EVENT_CATEGORY || '',
    EVENT_TYPE: eventData.EVENT_TYPE || '',
    EVENT_VENUE: eventData.EVENT_VENUE || '',
    EVENT_DESCRIPTION: eventData.ABOUT_THE_EVENT || '',
    START_TIME: eventData.EVENT_START_TIME || '',
    END_TIME: eventData.EVENT_END_TIME || '',
    START_DATE: eventData.EVENT_START_DATE || '',
    END_DATE: eventData.EVENT_END_DATE || '',
    EVENT_ADDRESS: [eventData.EVENT_PRIMARY_ADDRESS, eventData.EVENT_COUNTRY, eventData.EVENT_POSTCODE].filter(Boolean).join(', '),
    FULL_DATE: `${eventData.EVENT_START_DATE || ''} ${eventData.EVENT_START_TIME || ''} to ${eventData.EVENT_END_DATE || ''} ${eventData.EVENT_END_TIME || ''}`,
    FULL_NAME: userData.FULL_NAME || userData.PERSON_NAME || '',
    TICKET_ID: userData.TICKET_ID || '',
    COMPANY_NAME: userData.COMPANY_NAME || '',
    PERSON_EMAIL: userData.PERSON_EMAIL || userData.EMAIL || '',
    PERSON_CONTACT_NO: userData.PERSON_CONTACT_NO || userData.MOBILE_NO || '',
    ATTENDEE_QR_CODE: userData.REGISTRATION_QR_CODE || '',
    EMP_ID: userData.EMP_ID || '',
    DESIGNATION: userData.DESIGNATION || '',
  };

  // STANDARD fields: { LABEL: 'Last Name', DATABASE_COLUMN: 'PERSON_NAME' }
  if (Array.isArray(userData.STANDARD_JSON_DOCUMENT)) {
    userData.STANDARD_JSON_DOCUMENT.forEach(field => {
      const label = field.LABEL;
      const dbColumn = field.DATABASE_COLUMN;
      let value = '';
      if (userData[dbColumn] !== undefined && userData[dbColumn] !== null) {
        value = String(userData[dbColumn]);
      } else if (userData.json_document?.[dbColumn] !== undefined) {
        value = String(userData.json_document[dbColumn]);
      }
      lookup[label] = value;
    });
  }

  // CUSTOM fields: { LABEL: 'First Name', DATABASE_COLUMN: 'Column1' }
  if (Array.isArray(userData.CUSTOM_JSON_DOCUMENT)) {
    userData.CUSTOM_JSON_DOCUMENT.forEach(field => {
      const label = field.LABEL;
      const dbColumn = field.DATABASE_COLUMN;
      let value = '';
      if (userData[dbColumn] !== undefined && userData[dbColumn] !== null) {
        value = String(userData[dbColumn]);
      } else if (userData.json_document?.[dbColumn] !== undefined) {
        value = String(userData.json_document[dbColumn]);
      }
      lookup[label] = value;
    });
  }

  console.log('[BadgePdfMailer] Lookup:', JSON.stringify(lookup));
  return lookup;
}

// Replace {{ANY TOKEN}} — [^}]+ matches tokens with spaces
function applyLookup(template, lookup) {
  if (!template) return '';
  return template.replace(/{{([^}]+)}}/g, (match, key) => {
    const val = lookup[key.trim()];
    return val !== undefined ? val : '';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HTML BUILDER
// ─────────────────────────────────────────────────────────────────────────────
async function buildBadgeHtml(designJson, eventData, userData) {
  const size = designJson.BADGE_SIZE || designJson.BATCH_SIZE || 'CR80';
  const orientation = (designJson.ORIENTATION || 'portrait').toLowerCase();
  const dims = getBadgeDimsMm(size, orientation);
  const wPx = dims.w * MM_TO_PX;
  const hPx = dims.h * MM_TO_PX;

  const elements = designJson.ELEMENT_DETAILS || [];
  const front = elements.find(e => e.SIDE === 'front') || elements[0] || {};

  const lookup = buildLookup(eventData, userData);

  // ── Background colors ────────────────────────────────────────────────────
  const marginColor = front.MARGIN_AREA_COLOR || '#ffffff';
  const mainColor = front.MAIN_AREA_COLOR || '#ffffff';

  // ── Background images → base64 ───────────────────────────────────────────
  const marginBgUrl = resolveImgUrl(front.MARGIN_AREA_BACKGROUND);
  const mainBgUrl = resolveImgUrl(front.MAIN_AREA_BACKGROUND);
  console.log('[BadgePdfMailer] Margin BG:', marginBgUrl || '(none)');
  console.log('[BadgePdfMailer] Main BG:  ', mainBgUrl || '(none)');

  const [marginBgData, mainBgData] = await Promise.all([
    fetchAsBase64(marginBgUrl),
    fetchAsBase64(mainBgUrl),
  ]);

  // ── MARGIN_SETTINGS (stored in px, same space as wPx/hPx) ────────────────
  const ms = designJson.MARGIN_SETTINGS || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerTop = Math.max(Number(ms.top) || 0, 0);
  const innerLeft = Math.max(Number(ms.left) || 0, 0);
  const innerRight = Math.max(Number(ms.right) || 0, 0);
  const innerBottom = Math.max(Number(ms.bottom) || 0, 0);
  const innerW = wPx - innerLeft - innerRight;
  const innerH = hPx - innerTop - innerBottom;

  console.log(`[BadgePdfMailer] Canvas ${wPx.toFixed(0)}×${hPx.toFixed(0)}px | Inner: top=${innerTop} left=${innerLeft} ${innerW.toFixed(0)}×${innerH.toFixed(0)}px`);

  // ── Collect fields ────────────────────────────────────────────────────────
  const reservedKeys = new Set([
    'SIDE', 'MAIN_AREA_COLOR', 'MARGIN_AREA_COLOR',
    'STATIC_FIELDS', 'MAIN_AREA_BACKGROUND', 'MARGIN_AREA_BACKGROUND', 'static_fields',
  ]);

  const rawFields = [];
  const collectField = (key, jsonStr) => {
    if (!jsonStr || jsonStr === '0' || jsonStr === 0) return;
    try {
      const s = typeof jsonStr === 'object' ? jsonStr : JSON.parse(jsonStr);
      if (s.x === undefined) return;
      rawFields.push({ key, style: s });
    } catch { /* skip */ }
  };

  if (Array.isArray(front.STATIC_FIELDS)) {
    front.STATIC_FIELDS.forEach(f => collectField('static', f));
  }
  Object.keys(front).forEach(k => {
    if (!reservedKeys.has(k)) collectField(k, front[k]);
  });

  // Pre-fetch logos
  await Promise.all(rawFields.map(async (f) => {
    if (f.style.type === 'image' && f.style.imageFilename) {
      const url = resolveImgUrl(f.style.imageFilename);
      f.resolvedSrc = await fetchAsBase64(url);
      console.log(`[BadgePdfMailer] Logo "${f.style.imageFilename}": ${f.resolvedSrc ? 'OK' : 'FAILED'}`);
    }
  }));

  // cqh → px:  fontSize is stored as % of badge height (container-query height units)
  const cqhToPx = (v) => ((Number(v) || 12) / 100) * hPx;

  // ── Render each element ───────────────────────────────────────────────────
  const elementsHtml = rawFields.map(({ key, style, resolvedSrc }) => {
    const leftPx = (Number(style.x) / 100) * wPx;
    const topPx = (Number(style.y) / 100) * hPx;
    const widthPx = (Number(style.w) / 100) * wPx;
    const heightPx = (Number(style.h) / 100) * hPx;
    const zIndex = (Number(style.zIndex) || 1) + 10;
    const rotation = Number(style.rotation) || 0;

    const pos = `position:absolute;left:${leftPx}px;top:${topPx}px;width:${widthPx}px;height:${heightPx}px;z-index:${zIndex};transform:rotate(${rotation}deg);box-sizing:border-box;`;

    // TEXT
    if (style.type === 'text') {
      const fontSizePx = cqhToPx(style.fontSize);
      const fw = (style.fontStyle || '').toLowerCase().includes('bold') ? 'bold' : 'normal';
      const fsi = (style.fontStyle || '').toLowerCase().includes('italic') ? 'italic' : 'normal';
      const td = (style.fontStyle || '').toLowerCase().includes('underline') ? 'underline' : 'none';
      const ta = style.textAlign || 'left';
      const jc = ta === 'center' ? 'center' : ta === 'right' ? 'flex-end' : 'flex-start';

      // Use content (for static like "VISITORS") — applyLookup replaces {{tokens}} if any
      let text = applyLookup(style.content || '', lookup);
      // If content was a raw placeholder and result is empty, try sampleText as fallback preview
      if (!text.trim()) text = style.sampleText || '';
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const bg = (style.bgColor && style.bgColor !== 'transparent') ? style.bgColor : 'transparent';
      const border = style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || '#000'}` : 'none';

      return `<div style="${pos}background-color:${bg};display:flex;align-items:center;justify-content:${jc};border:${border};border-radius:${style.borderRadius || 0}px;overflow:visible;">
  <span style="font-family:'${style.fontFamily || 'Roboto'}',Arial,sans-serif;font-size:${fontSizePx}px;color:${style.color || '#000'};font-weight:${fw};font-style:${fsi};text-decoration:${td};text-align:${ta};white-space:nowrap;line-height:1.2;">${text}</span>
</div>`;
    }

    // QR
    if (style.type === 'qr') {
      const qrVal = userData.REGISTRATION_QR_CODE;
      const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrVal)}`;
      return `<div style="${pos}display:flex;align-items:center;justify-content:center;overflow:hidden;">
  <img src="${qrSrc}" style="width:100%;height:100%;object-fit:contain;" />
</div>`;
    }

    // IMAGE (logo)
    if (style.type === 'image') {
      if (!resolvedSrc) return '';
      return `<div style="${pos}display:flex;align-items:center;justify-content:center;overflow:hidden;">
  <img src="${resolvedSrc}" style="max-width:100%;max-height:100%;object-fit:contain;" />
</div>`;
    }

    // RECTANGLE
    if (style.type === 'rectangle') {
      const bg = (style.bgColor && style.bgColor !== 'transparent') ? style.bgColor : 'transparent';
      const border = style.borderWidth ? `${style.borderWidth}px solid ${style.borderColor || '#000'}` : 'none';
      return `<div style="${pos}background-color:${bg};border:${border};border-radius:${style.borderRadius || 0}px;"></div>`;
    }

    return '';
  }).join('\n');

  // ── Build CSS for the outer badge background ──────────────────────────────
  // The outer badge shows the margin background IMAGE (e.g. the blue gradient banner).
  // The inner white area sits on top of it.
  // IMPORTANT: if there is a background IMAGE, it takes priority over COLOR for the outer area.
  let outerBgCss = `background-color:${marginColor};`;
  if (marginBgData) {
    // Use the image — it covers the full badge (top blue, bottom blue from the banner)
    outerBgCss += `background-image:url('${marginBgData}');background-size:cover;background-position:center;background-repeat:no-repeat;`;
  }

  let innerBgCss = `background-color:${mainColor};`;
  if (mainBgData) {
    innerBgCss += `background-image:url('${mainBgData}');background-size:cover;background-position:center;background-repeat:no-repeat;`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { margin:0; padding:0; width:${wPx}px; height:${hPx}px; overflow:hidden; background:white; }

    /* Full badge — shows the margin background (blue gradient image) */
    .badge-outer {
      position:relative;
      width:${wPx}px;
      height:${hPx}px;
      ${outerBgCss}
      overflow:hidden;
    }

    /* Inner white content area — sits on top of the outer bg */
    .badge-inner {
      position:absolute;
      top:${innerTop}px;
      left:${innerLeft}px;
      width:${innerW}px;
      height:${innerH}px;
      ${innerBgCss}
      overflow:hidden;
      z-index:2;
    }
  </style>
</head>
<body>
  <div class="badge-outer">
    <div class="badge-inner"></div>
    ${elementsHtml}
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF RENDERER
// ─────────────────────────────────────────────────────────────────────────────
async function renderBadgePdf(html, dimsMm) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: Math.ceil(dimsMm.w * MM_TO_PX),
      height: Math.ceil(dimsMm.h * MM_TO_PX),
      deviceScaleFactor: 3,
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1200));

    return await page.pdf({
      width: `${dimsMm.w}mm`,
      height: `${dimsMm.h}mm`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  } finally {
    if (browser) await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
async function generateBadgePdfBuffer(EVENT_SYS_ID, ORGANIZATION_SYS_ID = '1', eventData, userData) {
  let conn;
  try {
    conn = await db.getConnection();

    const [badgeRows] = await conn.execute(
      'CALL USP_GET_VIEW_EVENT_BADGE_SETUP_LIST(?, ?, ?, ?, @ERRNO, @ERRMSG);',
      ['VIEW_EVENT_BADGE_SETUP_INFO', 'VIEW_ALL', String(EVENT_SYS_ID), String(ORGANIZATION_SYS_ID)]
    );

    const badgeResult = badgeRows[0][0].JSON_VALUE;
    if (badgeResult.status !== 'true' || !badgeResult.response?.length) {
      console.warn(`[BadgePdfMailer] No badge design found | EVENT=${EVENT_SYS_ID}`);
      return null;
    }

    const badgeRecord = badgeResult.response.find(b =>
      (b.json_document?.BADGE_TYPE || '').toLowerCase().includes('common')
    ) || badgeResult.response[0];

    const designJson = safeParse(badgeRecord.json_document);
    const size = designJson.BADGE_SIZE || designJson.BATCH_SIZE || 'CR80';
    const orientation = (designJson.ORIENTATION || 'portrait').toLowerCase();
    const dimsMm = getBadgeDimsMm(size, orientation);

    const html = await buildBadgeHtml(designJson, eventData, userData);
    const pdfBuffer = await renderBadgePdf(html, dimsMm);
    console.log(`[BadgePdfMailer] Done | ${pdfBuffer.length} bytes`);
    return pdfBuffer;

  } catch (err) {
    console.error('[BadgePdfMailer] Error:', err.message, err.stack);
    return null;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { generateBadgePdfBuffer };