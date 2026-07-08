'use strict';

// Pure Node.js PDF generation using pdfkit — NO Puppeteer/Chrome needed.
// Works on any shared hosting including cPanel.
// Install: npm install pdfkit

const PDFDocument = require('pdfkit');
const https       = require('https');   // ← FIX: separate https module
const http        = require('http');    // ← FIX: separate http module
const db          = require('../config/db');

const BASE_IMAGE_URL = `https://uat-iideasapi.cssdemo.dev/routes/uploadedFiles/`;
const MM_TO_PT       = 72 / 25.4;   // pdfkit uses points (pt), not px

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — fetch URL → Buffer
// FIX: correctly uses https or http based on URL protocol
// ─────────────────────────────────────────────────────────────────────────────
function fetchAsBuffer(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);

    // ← FIX: pick the correct client based on protocol
    const client = url.startsWith('https://') ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        return fetchAsBuffer(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) {
        console.warn(`[BadgePdfMailer] Image HTTP ${res.statusCode}: ${url}`);
        return resolve(null);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (e) => { console.warn('[BadgePdfMailer] Fetch error:', e.message); resolve(null); });
    });
    req.on('error',   (e) => { console.warn('[BadgePdfMailer] Request error:', e.message); resolve(null); });
    req.on('timeout', ()  => { req.destroy(); resolve(null); });
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
    CR80:  { w: 54,  h: 85.6 },
    CR100: { w: 67,  h: 99   },
    A7:    { w: 74,  h: 105  },
    A6:    { w: 105, h: 148  },
  };
  let d = map[size] || map.CR80;
  if (orientation === 'landscape') d = { w: d.h, h: d.w };
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — hex → rgb string for pdfkit
// ─────────────────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  if (!hex || hex === 'transparent' || hex === 'none') return null;
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — build flat token lookup (handles LABELS WITH SPACES like "First Name")
// ─────────────────────────────────────────────────────────────────────────────
function buildLookup(eventData, userData) {
  const lookup = {
    EVENT_NAME:        eventData.EVENT_NAME        || '',
    EVENT_CATEGORY:    eventData.EVENT_CATEGORY    || '',
    EVENT_TYPE:        eventData.EVENT_TYPE        || '',
    EVENT_VENUE:       eventData.EVENT_VENUE       || '',
    EVENT_DESCRIPTION: eventData.ABOUT_THE_EVENT   || '',
    START_TIME:        eventData.EVENT_START_TIME  || '',
    END_TIME:          eventData.EVENT_END_TIME    || '',
    START_DATE:        eventData.EVENT_START_DATE  || '',
    END_DATE:          eventData.EVENT_END_DATE    || '',
    EVENT_ADDRESS:     [eventData.EVENT_PRIMARY_ADDRESS, eventData.EVENT_COUNTRY, eventData.EVENT_POSTCODE].filter(Boolean).join(', '),
    FULL_DATE:         `${eventData.EVENT_START_DATE || ''} ${eventData.EVENT_START_TIME || ''} to ${eventData.EVENT_END_DATE || ''} ${eventData.EVENT_END_TIME || ''}`,
    FULL_NAME:         userData.FULL_NAME         || userData.PERSON_NAME  || '',
    TICKET_ID:         userData.TICKET_ID         || '',
    COMPANY_NAME:      userData.COMPANY_NAME      || '',
    PERSON_EMAIL:      userData.PERSON_EMAIL      || userData.EMAIL        || '',
    PERSON_CONTACT_NO: userData.PERSON_CONTACT_NO || userData.MOBILE_NO   || '',
    ATTENDEE_QR_CODE:  userData.REGISTRATION_QR_CODE || userData.TICKET_ID || '',
    EMP_ID:            userData.EMP_ID            || '',
    DESIGNATION:       userData.DESIGNATION       || '',
  };

  if (Array.isArray(userData.STANDARD_JSON_DOCUMENT)) {
    userData.STANDARD_JSON_DOCUMENT.forEach(field => {
      const label = field.LABEL, dbCol = field.DATABASE_COLUMN;
      let val = '';
      if (userData[dbCol] !== undefined && userData[dbCol] !== null) val = String(userData[dbCol]);
      else if (userData.json_document?.[dbCol] !== undefined) val = String(userData.json_document[dbCol]);
      lookup[label] = val;
    });
  }

  if (Array.isArray(userData.CUSTOM_JSON_DOCUMENT)) {
    userData.CUSTOM_JSON_DOCUMENT.forEach(field => {
      const label = field.LABEL, dbCol = field.DATABASE_COLUMN;
      let val = '';
      if (userData[dbCol] !== undefined && userData[dbCol] !== null) val = String(userData[dbCol]);
      else if (userData.json_document?.[dbCol] !== undefined) val = String(userData.json_document[dbCol]);
      lookup[label] = val;
    });
  }

  console.log('[BadgePdfMailer] Lookup:', JSON.stringify(lookup));
  return lookup;
}

function applyLookup(template, lookup) {
  if (!template) return '';
  return template.replace(/{{([^}]+)}}/g, (match, key) => {
    const val = lookup[key.trim()];
    return val !== undefined ? val : '';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Generate PDF Buffer using pdfkit
// ─────────────────────────────────────────────────────────────────────────────
async function buildBadgePdf(designJson, eventData, userData) {
  const size        = designJson.BADGE_SIZE || designJson.BATCH_SIZE || 'CR80';
  const orientation = (designJson.ORIENTATION || 'portrait').toLowerCase();
  const dims        = getBadgeDimsMm(size, orientation);

  const wPt = dims.w * MM_TO_PT;
  const hPt = dims.h * MM_TO_PT;

  const elements = designJson.ELEMENT_DETAILS || [];
  const front    = elements.find(e => e.SIDE === 'front') || elements[0] || {};
  const lookup   = buildLookup(eventData, userData);

  const marginColor = front.MARGIN_AREA_COLOR || '#ffffff';
  const mainColor   = front.MAIN_AREA_COLOR   || '#ffffff';

  // MARGIN_SETTINGS px → pt  (px * 72/96)
  const pxToPt      = (px) => (Number(px) || 0) * (72 / 96);
  const ms          = designJson.MARGIN_SETTINGS || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerTopPt  = Math.max(pxToPt(ms.top),    0);
  const innerLeftPt = Math.max(pxToPt(ms.left),   0);
  const innerRightPt= Math.max(pxToPt(ms.right),  0);
  const innerBotPt  = Math.max(pxToPt(ms.bottom), 0);
  const innerWPt    = wPt - innerLeftPt - innerRightPt;
  const innerHPt    = hPt - innerTopPt  - innerBotPt;

  console.log(`[BadgePdfMailer] Badge ${wPt.toFixed(1)}×${hPt.toFixed(1)}pt | Inner: top=${innerTopPt.toFixed(1)} ${innerWPt.toFixed(1)}×${innerHPt.toFixed(1)}pt`);

  // Fetch background images
  const marginBgUrl  = resolveImgUrl(front.MARGIN_AREA_BACKGROUND);
  const mainBgUrl    = resolveImgUrl(front.MAIN_AREA_BACKGROUND);
  const [marginBgBuf, mainBgBuf] = await Promise.all([
    fetchAsBuffer(marginBgUrl),
    fetchAsBuffer(mainBgUrl),
  ]);

  // Collect all fields
  const reservedKeys = new Set([
    'SIDE','MAIN_AREA_COLOR','MARGIN_AREA_COLOR',
    'STATIC_FIELDS','MAIN_AREA_BACKGROUND','MARGIN_AREA_BACKGROUND','static_fields',
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

  // Fetch logos and QR as buffers
  await Promise.all(rawFields.map(async (f) => {
    if (f.style.type === 'image' && f.style.imageFilename) {
      const url = resolveImgUrl(f.style.imageFilename);
      f.imgBuffer = await fetchAsBuffer(url);
      console.log(`[BadgePdfMailer] Logo "${f.style.imageFilename}": ${f.imgBuffer ? 'OK' : 'FAILED'}`);
    }
    if (f.style.type === 'qr') {
      const qrVal = userData.REGISTRATION_QR_CODE || userData.TICKET_ID || 'N/A';
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrVal)}`;
      f.imgBuffer = await fetchAsBuffer(qrUrl);
      console.log(`[BadgePdfMailer] QR: ${f.imgBuffer ? 'OK' : 'FAILED'}`);
    }
  }));

  // cqh → pt: (cqhVal/100) * hPt
  const cqhToPt = (v) => ((Number(v) || 12) / 100) * hPt;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [wPt, hPt], margin: 0, info: { Title: 'Event Badge' } });
    const buffers = [];
    doc.on('data',  chunk => buffers.push(chunk));
    doc.on('end',   () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // 1. Outer background
    const marginRgb = hexToRgb(marginColor);
    if (marginRgb) {
      doc.rect(0, 0, wPt, hPt).fill([marginRgb[0], marginRgb[1], marginRgb[2]]);
    }
    if (marginBgBuf) {
      try { doc.image(marginBgBuf, 0, 0, { width: wPt, height: hPt }); }
      catch (e) { console.warn('[BadgePdfMailer] Margin BG error:', e.message); }
    }

    // 2. Inner white area
    const mainRgb = hexToRgb(mainColor);
    if (mainRgb) {
      doc.rect(innerLeftPt, innerTopPt, innerWPt, innerHPt).fill([mainRgb[0], mainRgb[1], mainRgb[2]]);
    }
    if (mainBgBuf) {
      try { doc.image(mainBgBuf, innerLeftPt, innerTopPt, { width: innerWPt, height: innerHPt }); }
      catch (e) { console.warn('[BadgePdfMailer] Main BG error:', e.message); }
    }

    // 3. Elements sorted by zIndex
    const sorted = [...rawFields].sort((a, b) => (Number(a.style.zIndex) || 1) - (Number(b.style.zIndex) || 1));

    for (const { key, style, imgBuffer } of sorted) {
      const xPt = (Number(style.x) / 100) * wPt;
      const yPt = (Number(style.y) / 100) * hPt;
      const wEl = (Number(style.w) / 100) * wPt;
      const hEl = (Number(style.h) / 100) * hPt;

      // TEXT
      if (style.type === 'text') {
        let text = applyLookup(style.content || '', lookup);
        if (!text.trim()) text = style.sampleText || '';
        if (!text.trim()) continue;

        const fontSizePt = cqhToPt(style.fontSize);
        const isBold     = (style.fontStyle || '').toLowerCase().includes('bold');
        const color      = style.color || '#000000';
        const align      = style.textAlign || 'left';

        // Text background
        if (style.bgColor && style.bgColor !== 'transparent') {
          const bgRgb = hexToRgb(style.bgColor);
          if (bgRgb) doc.rect(xPt, yPt, wEl, hEl).fill([bgRgb[0], bgRgb[1], bgRgb[2]]);
        }

        // Vertical center: offset by half element height minus half font size
        const textY = yPt + (hEl / 2) - (fontSizePt * 0.6);

        doc.save();
        try {
          doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
             .fontSize(fontSizePt)
             .fillColor(color)
             .text(text, xPt, textY, {
               width:     wEl,
               align:     align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
               lineBreak: false,
             });
        } catch (e) {
          console.warn(`[BadgePdfMailer] Text error "${text}":`, e.message);
        }
        doc.restore();
        continue;
      }

      // IMAGE or QR
      if ((style.type === 'image' || style.type === 'qr') && imgBuffer) {
        try {
          doc.image(imgBuffer, xPt, yPt, { fit: [wEl, hEl], align: 'center', valign: 'center' });
        } catch (e) {
          console.warn(`[BadgePdfMailer] Image error (${style.type}):`, e.message);
        }
        continue;
      }

      // RECTANGLE
      if (style.type === 'rectangle') {
        const bgRgb = hexToRgb(style.bgColor);
        if (bgRgb) doc.rect(xPt, yPt, wEl, hEl).fill([bgRgb[0], bgRgb[1], bgRgb[2]]);
        if (style.borderWidth && Number(style.borderWidth) > 0) {
          const bRgb = hexToRgb(style.borderColor || '#000000');
          if (bRgb) {
            doc.rect(xPt, yPt, wEl, hEl)
               .lineWidth(Number(style.borderWidth))
               .stroke([bRgb[0], bRgb[1], bRgb[2]]);
          }
        }
        continue;
      }
    }

    doc.end();
  });
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

    // ── FIX: detailed logging so we can see exactly what SP returns ──────
    console.log(`[BadgePdfMailer] Badge SP status: ${badgeResult.status} | count: ${badgeResult.response?.length || 0} | EVENT=${EVENT_SYS_ID} ORG=${ORGANIZATION_SYS_ID}`);

    if (badgeResult.status !== 'true' || !badgeResult.response?.length) {
      console.warn(`[BadgePdfMailer] No badge design found | EVENT=${EVENT_SYS_ID}`);
      return null;
    }

    // Prefer "Common Attendee Badge", fall back to first
    const badgeRecord = badgeResult.response.find(b =>
      (b.json_document?.BADGE_TYPE || '').toLowerCase().includes('common')
    ) || badgeResult.response[0];

    const designJson = safeParse(badgeRecord.json_document);
    console.log(`[BadgePdfMailer] Using badge: ${designJson.BADGE_TYPE || designJson.TEMPLATE_NAME}`);

    const pdfBuffer = await buildBadgePdf(designJson, eventData, userData);
    console.log(`[BadgePdfMailer] ✅ Done | ${pdfBuffer.length} bytes`);
    return pdfBuffer;

  } catch (err) {
    console.error('[BadgePdfMailer] ❌ Error:', err.message, err.stack);
    return null;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { generateBadgePdfBuffer };