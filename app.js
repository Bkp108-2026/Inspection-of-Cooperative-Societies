// ---------- State ----------
let state = { header: {}, a: {}, b: {}, c: {}, e: {}, f: {}, g: {}, godown: {}, photos: {}, h: {}, i: {} };
let openSection = "index";

// ---------- Path helpers ----------
function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}
function ensureArray(path, len) {
  let arr = getPath(state, path);
  if (!Array.isArray(arr)) {
    arr = len ? Array.from({ length: len }, () => ({})) : [];
    setPath(state, path, arr);
  } else if (len && arr.length < len) {
    while (arr.length < len) arr.push({});
  }
  return arr;
}

// ---------- Conditional field visibility (showIf) ----------
function fieldVisible(f) {
  if (!f.showIf) return true;
  const conditions = Array.isArray(f.showIf) ? f.showIf : [f.showIf];
  return conditions.every((c) => {
    if (c.includes !== undefined) {
      const arr = getPath(state, c.key);
      return Array.isArray(arr) && arr.includes(c.includes);
    }
    return getPath(state, c.key) === c.equals;
  });
}

// ---------- Field counting for progress ----------
function collectSimpleFields() {
  const arr = [];
  HEADER_FIELDS.forEach((f) => arr.push(f));
  SCHEMA.forEach((sec) =>
    sec.fields.forEach((f) => {
      if (f.type === "text" || f.type === "number" || f.type === "date" || f.type === "textarea" || f.type === "select") {
        arr.push(f);
      }
    })
  );
  return arr;
}
const ALL_SIMPLE_FIELDS = collectSimpleFields();

function countFilled() {
  let filled = 0;
  ALL_SIMPLE_FIELDS.forEach((f) => {
    if (!fieldVisible(f)) return;
    const v = getPath(state, f.key);
    if (v !== undefined && v !== null && String(v).trim() !== "") filled++;
  });
  return filled;
}
function countTotalVisible() {
  return ALL_SIMPLE_FIELDS.filter(fieldVisible).length;
}

// ---------- Sum helpers for auto-totals & computed percentage ----------
function sumDynamicTableColumn(path, column) {
  const arr = getPath(state, path) || [];
  return arr.reduce((s, r) => s + (parseFloat(r && r[column]) || 0), 0);
}
function sumMatrixColumnExcluding(path, rows, excludeLabel, column) {
  const arr = getPath(state, path) || [];
  let total = 0;
  rows.forEach((label, idx) => {
    if (label === excludeLabel) return;
    total += parseFloat((arr[idx] && arr[idx][column]) || 0) || 0;
  });
  return total;
}
function computeLiquidityPercent(valueEl, detailEl, f) {
  const num = sumDynamicTableColumn(f.numerator.path, f.numerator.column);
  const den = sumMatrixColumnExcluding(f.denominator.path, f.denominator.rows, f.denominator.excludeRow, f.denominator.column);
  const pct = den > 0 ? ((num / den) * 100).toFixed(2) : "0.00";
  valueEl.textContent = pct + "%";
  detailEl.textContent = `(₹${num.toLocaleString("en-IN")} ÷ ₹${den.toLocaleString("en-IN")}) × 100`;
}
function updateLiquidityPercentBox() {
  const valueEl = document.getElementById("liquidityPercentBox");
  const detailEl = document.getElementById("liquidityPercentDetail");
  if (!valueEl || !detailEl) return;
  const sec = SCHEMA.find((s) => s.key === "d");
  const f = sec && sec.fields.find((fl) => fl.type === "computed-percent");
  if (f) computeLiquidityPercent(valueEl, detailEl, f);
}

// ---------- Rendering helpers ----------
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  (children || []).forEach((c) => c && node.appendChild(c));
  return node;
}

function renderSimpleField(f) {
  const wrap = el("div", { class: "field" });
  const label = el("label", { text: f.label });
  wrap.appendChild(label);
  const val = getPath(state, f.key);

  if (f.type === "textarea") {
    const ta = el("textarea", { rows: f.rows || 3 });
    ta.value = val || "";
    ta.oninput = () => setPath(state, f.key, ta.value);
    wrap.appendChild(ta);
  } else if (f.type === "select") {
    const sel = el("select");
    sel.appendChild(el("option", { value: "", text: "— নির্বাচন করুন —" }));
    (f.options || []).forEach((o) => {
      const opt = el("option", { value: o, text: o });
      if (val === o) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.onchange = () => {
      setPath(state, f.key, sel.value);
      if (f.rerenderOnChange) { scheduleAutoSave(); render(); }
    };
    wrap.appendChild(sel);
  } else {
    const input = el("input", { type: f.type === "number" ? "number" : f.type === "date" ? "date" : "text" });
    input.value = val || "";
    input.oninput = () => setPath(state, f.key, input.value);
    wrap.appendChild(input);
  }
  return wrap;
}

function renderDynamicTable(f) {
  const wrap = el("div", { class: "field" });
  if (f.sublabel) wrap.appendChild(el("label", { text: f.sublabel }));
  const rows = ensureArray(f.key);

  rows.forEach((row, idx) => {
    const card = el("div", { class: "card-row" });
    card.appendChild(el("div", { class: "row-title", text: `#${idx + 1}` }));
    const removeBtn = el("button", { class: "remove-btn", text: "✕ মুছুন" });
    removeBtn.onclick = () => { rows.splice(idx, 1); render(); };
    card.appendChild(removeBtn);

    f.columns.forEach((col) => {
      const fieldWrap = el("div", { class: "field" });
      fieldWrap.appendChild(el("label", { text: col.label }));
      const input = el("input", { type: "text" });
      input.value = row[col.key] || "";
      input.oninput = () => { row[col.key] = input.value; };
      fieldWrap.appendChild(input);
      card.appendChild(fieldWrap);
    });
    wrap.appendChild(card);
  });

  const addBtn = el("button", { class: "add-btn", text: `+ ${f.addLabel || "যোগ করুন"}` });
  addBtn.onclick = () => { rows.push({}); render(); };
  wrap.appendChild(addBtn);
  return wrap;
}

function matrixColLabel(col) {
  if (col.dynamicLabelKey) {
    const v = getPath(state, col.dynamicLabelKey);
    return v && String(v).trim() !== "" ? v : col.label;
  }
  return col.label;
}

function renderMatrixTable(f) {
  const wrap = el("div", { class: "field" });
  const rows = ensureArray(f.key, f.rows.length);

  f.rows.forEach((rowLabel, idx) => {
    const card = el("div", { class: "card-row" });
    card.appendChild(el("div", { class: "row-title", text: rowLabel }));
    const grid = el("div", { class: "matrix-grid" });
    f.columns.forEach((col) => {
      const fieldWrap = el("div", { class: "field" });
      fieldWrap.appendChild(el("label", { text: matrixColLabel(col) }));
      if (col.type === "select") {
        const sel = el("select");
        sel.appendChild(el("option", { value: "", text: "—" }));
        (col.options || []).forEach((o) => {
          const opt = el("option", { value: o, text: o });
          if ((rows[idx] && rows[idx][col.key]) === o) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.onchange = () => { rows[idx][col.key] = sel.value; scheduleAutoSave(); };
        fieldWrap.appendChild(sel);
      } else {
        const input = el("input", { type: "text" });
        input.value = (rows[idx] && rows[idx][col.key]) || "";
        input.oninput = () => { rows[idx][col.key] = input.value; };
        fieldWrap.appendChild(input);
      }
      grid.appendChild(fieldWrap);
    });
    card.appendChild(grid);
    wrap.appendChild(card);
  });
  return wrap;
}

function renderCashMatrixTable(f) {
  const wrap = el("div", { class: "field" });
  const rows = ensureArray(f.key, f.rows.length);
  const totalIdx = f.rows.indexOf("Total");
  const amountInputs = [];

  function recalcTotal() {
    if (totalIdx === -1) return;
    let total = 0;
    f.rows.forEach((label, i) => {
      if (i === totalIdx) return;
      total += parseFloat((rows[i] && rows[i].amount) || 0) || 0;
    });
    rows[totalIdx] = rows[totalIdx] || {};
    rows[totalIdx].amount = String(total);
    if (amountInputs[totalIdx]) amountInputs[totalIdx].value = String(total);
  }

  f.rows.forEach((rowLabel, idx) => {
    const denomValue = f.denomValues[idx];
    const isTotal = idx === totalIdx;
    rows[idx] = rows[idx] || {};

    const card = el("div", { class: "card-row" });
    card.appendChild(el("div", { class: "row-title", text: rowLabel + (denomValue ? ` (× ${denomValue})` : "") }));
    const grid = el("div", { class: "matrix-grid" });

    const numWrap = el("div", { class: "field" });
    numWrap.appendChild(el("label", { text: "সংখ্যা (Number)" }));
    const numInput = el("input", { type: "text", inputmode: "numeric" });
    numInput.value = rows[idx].number || "";
    numWrap.appendChild(numInput);
    grid.appendChild(numWrap);

    const amtWrap = el("div", { class: "field" });
    amtWrap.appendChild(el("label", { text: "মোট পরিমাণ (Amount)" }));
    const amtInput = el("input", { type: "text", inputmode: "numeric" });
    amtInput.value = rows[idx].amount || "";
    amtWrap.appendChild(amtInput);
    grid.appendChild(amtWrap);
    amountInputs[idx] = amtInput;

    if (isTotal) {
      numInput.disabled = true;
      numInput.placeholder = "—";
      amtInput.disabled = true;
    } else if (denomValue) {
      amtInput.disabled = true;
      numInput.oninput = () => {
        rows[idx].number = numInput.value;
        const n = parseFloat(numInput.value) || 0;
        const amt = numInput.value.trim() === "" ? "" : String(n * denomValue);
        rows[idx].amount = amt;
        amtInput.value = amt;
        recalcTotal();
      };
    } else {
      // Coins row — no fixed denomination, both fields manual
      numInput.oninput = () => { rows[idx].number = numInput.value; };
      amtInput.oninput = () => { rows[idx].amount = amtInput.value; recalcTotal(); };
    }

    card.appendChild(grid);
    wrap.appendChild(card);
  });

  recalcTotal();
  return wrap;
}

function renderMatrixTableTotal(f) {
  const wrap = el("div", { class: "field" });
  const rows = ensureArray(f.key, f.rows.length);
  const totalIdx = f.rows.indexOf(f.totalRowLabel || "Total");
  const autoCols = f.autoColumns || f.columns.map((c) => c.key);
  const colInputs = f.columns.map(() => []);

  function recalcTotal() {
    if (totalIdx === -1) return;
    rows[totalIdx] = rows[totalIdx] || {};
    f.columns.forEach((col, ci) => {
      if (!autoCols.includes(col.key)) return;
      let sum = 0;
      f.rows.forEach((label, ri) => {
        if (ri === totalIdx) return;
        sum += parseFloat((rows[ri] && rows[ri][col.key]) || 0) || 0;
      });
      rows[totalIdx][col.key] = String(sum);
      if (colInputs[ci][totalIdx]) colInputs[ci][totalIdx].value = String(sum);
    });
  }

  f.rows.forEach((rowLabel, idx) => {
    rows[idx] = rows[idx] || {};
    const isTotal = idx === totalIdx;
    const card = el("div", { class: "card-row" });
    card.appendChild(el("div", { class: "row-title", text: rowLabel }));
    const grid = el("div", { class: "matrix-grid" });
    f.columns.forEach((col, ci) => {
      const fieldWrap = el("div", { class: "field" });
      fieldWrap.appendChild(el("label", { text: col.label }));
      const input = el("input", { type: "text", inputmode: "numeric" });
      input.value = (rows[idx] && rows[idx][col.key]) || "";
      colInputs[ci][idx] = input;
      if (isTotal && autoCols.includes(col.key)) {
        input.disabled = true;
      } else {
        input.oninput = () => {
          rows[idx][col.key] = input.value;
          recalcTotal();
          updateLiquidityPercentBox();
        };
      }
      fieldWrap.appendChild(input);
      grid.appendChild(fieldWrap);
    });
    card.appendChild(grid);
    wrap.appendChild(card);
  });

  recalcTotal();
  return wrap;
}

function renderDynamicTableTotal(f) {
  const wrap = el("div", { class: "field" });
  if (f.sublabel) wrap.appendChild(el("label", { text: f.sublabel }));
  const rows = ensureArray(f.key);

  const totalBox = el("div", { class: "total-box" });
  const totalLabelEl = el("span", { class: "total-box-label", text: f.totalLabel || "মোট (Total)" });
  const totalValueEl = el("span", { class: "total-box-value", text: "0" });
  totalBox.appendChild(totalLabelEl);
  totalBox.appendChild(totalValueEl);

  function recalcTotal() {
    let sum = 0;
    rows.forEach((r) => { sum += parseFloat((r && r[f.totalColumn]) || 0) || 0; });
    totalValueEl.textContent = "₹" + sum.toLocaleString("en-IN");
    updateLiquidityPercentBox();
  }

  rows.forEach((row, idx) => {
    const card = el("div", { class: "card-row" });
    card.appendChild(el("div", { class: "row-title", text: `#${idx + 1}` }));
    const removeBtn = el("button", { class: "remove-btn", text: "✕ মুছুন" });
    removeBtn.onclick = () => { rows.splice(idx, 1); render(); };
    card.appendChild(removeBtn);

    f.columns.forEach((col) => {
      const fieldWrap = el("div", { class: "field" });
      fieldWrap.appendChild(el("label", { text: col.label }));
      const input = el("input", { type: "text" });
      input.value = row[col.key] || "";
      input.oninput = () => {
        row[col.key] = input.value;
        if (col.key === f.totalColumn) recalcTotal();
      };
      fieldWrap.appendChild(input);
      card.appendChild(fieldWrap);
    });
    wrap.appendChild(card);
  });

  const addBtn = el("button", { class: "add-btn", text: `+ ${f.addLabel || "যোগ করুন"}` });
  addBtn.onclick = () => { rows.push({}); render(); };
  wrap.appendChild(addBtn);
  wrap.appendChild(totalBox);

  recalcTotal();
  return wrap;
}

function renderComputedPercent(f) {
  const wrap = el("div", { class: "field computed-box" });
  wrap.appendChild(el("label", { text: f.label }));
  const valueEl = el("div", { class: "computed-value", id: "liquidityPercentBox" });
  const detailEl = el("div", { class: "computed-detail", id: "liquidityPercentDetail" });
  wrap.appendChild(valueEl);
  wrap.appendChild(detailEl);
  computeLiquidityPercent(valueEl, detailEl, f);
  return wrap;
}

// ---------- Linked field: read-only echo of a value from another section ----------
function renderLinkedField(f) {
  const wrap = el("div", { class: "field" });
  wrap.appendChild(el("label", { text: `${f.label} (A সেকশন থেকে)` }));
  const value = getPath(state, f.sourceKey);
  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
  const box = el("div", {
    class: "linked-field-box",
    text: hasValue ? String(value) : "— A সেকশনে গিয়ে পূরণ করুন —",
  });
  wrap.appendChild(box);
  return wrap;
}

// ---------- Housing red-flag rule engine ----------
const RED_FLAG_RULES = [
  { label: "Ineligible Member", check: () => getPath(state, "housing.mem.eligibilityVerified") === "না (No)" },
  { label: "Multiple allotment", check: () => getPath(state, "housing.allot.multipleUnit") === "হ্যাঁ (Yes)" },
  { label: "Transfer without approval", check: () => getPath(state, "housing.transfer.anyTransfer") === "হ্যাঁ (Yes)" && getPath(state, "housing.transfer.societyApproval") === "না (No)" },
  { label: "Letting without permission", check: () => getPath(state, "housing.transfer.anyLetOut") === "হ্যাঁ (Yes)" && getPath(state, "housing.transfer.letOutPermission") === "না (No)" },
  { label: "Unverified project expenditure", check: () => getPath(state, "housing.board.expenditureResolution") === "না (No)" },
  { label: "Outstanding member dues", check: () => getPath(state, "housing.fin.outstandingDues") === "হ্যাঁ (Yes)" },
  { label: "Common facilities not maintained", check: () => ["না (No)", "আংশিক (Partially)"].includes(getPath(state, "housing.common.maintained")) },
  { label: "Audit objection pending", check: () => getPath(state, "housing.audit.objectionsExist") === "হ্যাঁ (Yes)" },
  { label: "Previous inspection non-compliance", check: () => ["না (No)", "আংশিক (Partially)"].includes(getPath(state, "housing.audit.prevObservationsComplied")) },
];

function computeActiveRedFlags() {
  return RED_FLAG_RULES.filter((r) => r.check()).map((r) => r.label);
}

function renderRedFlagSummary() {
  const wrap = el("div", { class: "field redflag-box" });
  const flags = computeActiveRedFlags();
  if (!flags.length) {
    wrap.appendChild(el("div", { class: "redflag-none", text: "✅ কোনো Red Flag সনাক্ত হয়নি" }));
  } else {
    flags.forEach((label) => wrap.appendChild(el("div", { class: "redflag-item", text: "🔴 " + label })));
  }
  return wrap;
}

// ---------- Per-scheme repeated detail block (Government Scheme section) ----------
function schemeKeyFor(schemeName) {
  return schemeName.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60);
}

function schemeDetailFieldsFor(base) {
  return [
    { type: "text", key: `${base}.dept`, label: "প্রকল্পটির সংশ্লিষ্ট দপ্তর/সংস্থা (Department/Organisation concerned with the Scheme)" },
    { type: "select", key: `${base}.boardResolutionApplied`, label: "সমিতি কি Board Resolution-এর মাধ্যমে আবেদন করেছে? (Has the Society applied through a Board Resolution?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
    { type: "select", key: `${base}.govtAidReceived`, label: "সমিতি কি বর্তমানে সরকারি সাহায্য/অনুদান পেয়েছে? (Is the Society currently receiving Government aid?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
    { type: "select", key: `${base}.workStarted`, rerenderOnChange: true, label: "প্রকল্পের কাজ কি শুরু হয়েছে? (Has work started?)", options: ["হ্যাঁ (Yes)", "না (No)"] },
    { type: "number", key: `${base}.workPercentComplete`, label: "আনুমানিক কত শতাংশ কাজ সম্পন্ন হয়েছে? (% work completed)", showIf: { key: `${base}.workStarted`, equals: "হ্যাঁ (Yes)" } },
    { type: "number", key: `${base}.estimatedDaysToComplete`, label: "কাজ শেষ হতে আনুমানিক কত দিন লাগবে? (Estimated days to complete)", showIf: { key: `${base}.workStarted`, equals: "হ্যাঁ (Yes)" } },
  ];
}

function renderSchemeDetailRepeat() {
  const wrap = el("div", {});
  const selected = getPath(state, "h.schemesSelected") || [];
  const otherName = getPath(state, "h.otherSchemeName");
  const allSchemes = [...selected];
  if (otherName && otherName.trim() && !allSchemes.includes(otherName)) allSchemes.push(otherName);

  if (!allSchemes.length) {
    wrap.appendChild(el("div", { class: "empty-note-box", text: "কোনো প্রকল্প এখনও নির্বাচন করা হয়নি — উপরের তালিকা থেকে নির্বাচন করুন" }));
    return wrap;
  }

  allSchemes.forEach((schemeName) => {
    const base = `h.schemeDetails.${schemeKeyFor(schemeName)}`;
    const card = el("div", { class: "scheme-detail-card" });
    card.appendChild(el("div", { class: "scheme-detail-title", text: schemeName }));
    const body = el("div", {});
    renderFieldList(body, schemeDetailFieldsFor(base));
    card.appendChild(body);
    wrap.appendChild(card);
  });

  return wrap;
}

// ---------- Photo capture: compress image client-side, tag with date/time + geolocation ----------
function compressImageFile(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("image load failed"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

function getLocationPromise(timeoutMs) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (!done) { done = true; clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); } },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(null); } },
      { enableHighAccuracy: true, timeout: timeoutMs }
    );
  });
}

function formatPhotoTimestamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateOnly(isoDateStr) {
  if (!isoDateStr) return null;
  const parts = String(isoDateStr).split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function renderPhotoCapture(f) {
  const wrap = el("div", { class: "field" });
  const items = ensureArray(f.key);
  const maxPhotos = f.maxPhotos || 3;
  const categories = f.categories || PHOTO_CATEGORIES;

  if (items.length) {
    const grid = el("div", { class: "photo-grid" });
    items.forEach((item, idx) => {
      const card = el("div", { class: "photo-card" });
      card.appendChild(el("img", { class: "photo-thumb", src: item.dataUrl || "" }));

      const catSel = el("select", { class: "photo-cat-select" });
      categories.forEach((c) => {
        const opt = el("option", { value: c, text: c });
        if (item.category === c) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.onchange = () => { item.category = catSel.value; scheduleAutoSave(); };
      card.appendChild(catSel);

      const meta = el("div", { class: "photo-meta" });
      meta.appendChild(el("div", { text: "🕒 " + (item.timestamp || "") }));
      meta.appendChild(el("div", {
        text: item.lat != null ? `📍 ${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}` : "📍 লোকেশন পাওয়া যায়নি",
      }));
      card.appendChild(meta);

      const removeBtn = el("button", { class: "remove-btn", text: "✕ মুছুন" });
      removeBtn.onclick = () => { items.splice(idx, 1); scheduleAutoSave(); render(); };
      card.appendChild(removeBtn);

      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }

  if (items.length < maxPhotos) {
    const fileInput = el("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none;" });
    const addBtn = el("button", { class: "add-btn", text: `📷 ছবি তুলুন / আপলোড করুন (${items.length}/${maxPhotos})` });
    addBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      addBtn.disabled = true;
      addBtn.textContent = "⏳ প্রসেস হচ্ছে...";
      try {
        const [dataUrl, loc] = await Promise.all([
          compressImageFile(file, 1280, 0.72),
          getLocationPromise(6000),
        ]);
        const now = new Date();
        const timestamp = loc
          ? formatPhotoTimestamp(now)
          : (formatDateOnly(getPath(state, "header.inspectionDate")) || formatPhotoTimestamp(now).split(" ")[0]);
        items.push({
          category: categories[0],
          dataUrl,
          timestamp,
          lat: loc ? loc.lat : null,
          lng: loc ? loc.lng : null,
        });
        scheduleAutoSave();
        render();
      } catch (e) {
        showToast("ছবি প্রসেস করা যায়নি, আবার চেষ্টা করুন");
        addBtn.disabled = false;
        addBtn.textContent = `📷 ছবি তুলুন / আপলোড করুন (${items.length}/${maxPhotos})`;
      }
    };
    wrap.appendChild(fileInput);
    wrap.appendChild(addBtn);
  }

  return wrap;
}

function renderChecklist(f) {
  const wrap = el("div", { class: "field" });
  wrap.appendChild(el("label", { text: f.label }));
  let arr = getPath(state, f.key);
  if (!Array.isArray(arr)) { arr = []; setPath(state, f.key, arr); }

  const box = el("div", { class: "checklist-box" });
  (f.options || []).forEach((opt) => {
    const row = el("label", { class: "checklist-row" });
    const cb = el("input", { type: "checkbox" });
    cb.checked = arr.includes(opt);
    cb.onchange = () => {
      const i = arr.indexOf(opt);
      if (cb.checked && i === -1) arr.push(opt);
      else if (!cb.checked && i !== -1) arr.splice(i, 1);
      scheduleAutoSave();
      render();
    };
    row.appendChild(cb);
    row.appendChild(el("span", { text: opt }));
    box.appendChild(row);
  });
  wrap.appendChild(box);

  if (f.otherKey) {
    const otherWrap = el("div", { class: "field", style: "margin-top:8px;" });
    otherWrap.appendChild(el("label", { text: f.otherLabel || "অন্যান্য (উল্লেখ করুন)" }));
    const inp = el("input", { type: "text" });
    inp.value = getPath(state, f.otherKey) || "";
    inp.oninput = () => setPath(state, f.otherKey, inp.value);
    inp.onblur = () => render();
    otherWrap.appendChild(inp);
    wrap.appendChild(otherWrap);
  }
  return wrap;
}

function renderFieldList(container, fields) {
  fields.forEach((f) => {
    if (!fieldVisible(f)) return;
    if (f.type === "subheading") {
      container.appendChild(el("div", { class: "subheading", text: f.label }));
    } else if (f.type === "dynamic-table") {
      container.appendChild(renderDynamicTable(f));
    } else if (f.type === "dynamic-table-total") {
      container.appendChild(renderDynamicTableTotal(f));
    } else if (f.type === "cash-matrix") {
      container.appendChild(renderCashMatrixTable(f));
    } else if (f.type === "matrix-table") {
      container.appendChild(renderMatrixTable(f));
    } else if (f.type === "matrix-table-total") {
      container.appendChild(renderMatrixTableTotal(f));
    } else if (f.type === "computed-percent") {
      container.appendChild(renderComputedPercent(f));
    } else if (f.type === "photo-capture") {
      container.appendChild(renderPhotoCapture(f));
    } else if (f.type === "checklist") {
      container.appendChild(renderChecklist(f));
    } else if (f.type === "linked-field") {
      container.appendChild(renderLinkedField(f));
    } else if (f.type === "redflag-summary") {
      container.appendChild(renderRedFlagSummary());
    } else if (f.type === "scheme-detail-repeat") {
      container.appendChild(renderSchemeDetailRepeat());
    } else {
      container.appendChild(renderSimpleField(f));
    }
  });
}

// ---------- Main render ----------
function pageFilledCount(page) {
  let total = 0, filled = 0;
  if (!page.fields) return { total, filled };
  page.fields.forEach((f) => {
    if (!fieldVisible(f)) return;
    if (["text", "number", "date", "textarea", "select"].includes(f.type)) {
      total++;
      const v = getPath(state, f.key);
      if (v !== undefined && v !== null && String(v).trim() !== "") filled++;
    }
  });
  return { total, filled };
}

function accentStyle(page) {
  if (!page || !page.color) return "";
  return `--accent-color:${page.color};--accent-soft:${page.colorSoft || page.color};`;
}

const PAGES = [
  { key: "index", title: "সূচীপত্র (Index)", shortLabel: "সূচী" },
  { key: "header", title: "পরিদর্শনের বিবরণ (Inspection Details)", shortLabel: "বিবরণ", color: "#1F4B3F", colorSoft: "#DCEDE4", fields: HEADER_FIELDS },
  ...SCHEMA,
  { key: "forwarding", title: "ফরোয়ার্ডিং লেটার (Forwarding Letter)", shortLabel: "📨", color: "#0F172A", colorSoft: "#E2E5EA" },
  { key: "legal", title: "⚖️ আইনি তথ্যভাণ্ডার (Legal Reference)", shortLabel: "⚖️", color: "#7C2D12", colorSoft: "#F3E1D8" },
];

function renderIndexPage(container) {
  const wrap = el("div", { class: "index-page" });

  wrap.appendChild(el("div", { class: "gov-header-line1", text: "সমবায় দপ্তর, পশ্চিমবঙ্গ সরকার" }));
  wrap.appendChild(el("div", { class: "gov-header-line2", text: "Cooperation Department, Government of West Bengal" }));

  wrap.appendChild(el("div", { class: "index-title serif", text: "সমবায় সমিতি পরিদর্শন প্রোফর্মা" }));
  wrap.appendChild(el("div", { class: "index-subtitle", text: "PACS / COOPERATIVE SOCIETY INSPECTION" }));

  wrap.appendChild(el("div", { class: "index-heading", text: "📑 সূচীপত্র (Index) — যেকোনো অংশে সরাসরি যান" }));

  const grid = el("div", { class: "index-grid" });
  PAGES.filter((p) => p.key !== "index").forEach((p) => {
    const card = el("button", { class: "index-card", style: accentStyle(p) });
    card.appendChild(el("span", { class: "index-card-badge", text: p.shortLabel || "•" }));
    card.appendChild(el("span", { text: p.title }));
    card.onclick = () => { openSection = p.key; render(); window.scrollTo(0, 0); };
    grid.appendChild(card);
  });
  wrap.appendChild(grid);

  const startBtn = el("button", { class: "index-start-btn", text: "শুরু করুন ›" });
  startBtn.onclick = () => { openSection = "header"; render(); window.scrollTo(0, 0); };
  wrap.appendChild(startBtn);

  container.appendChild(wrap);
}

function buildForwardingLetterHTML() {
  const headDesignation = getPath(state, "header.headOfOfficeDesignation") || "________________________";
  const range = getPath(state, "header.range") || "________________________";
  const district = getPath(state, "header.district") || "________________________";
  const societyName = getPath(state, "a.name") || "________________________";
  const regNo = getPath(state, "a.regNoDate") || "________________________";
  const block = getPath(state, "header.block") || "________________________";
  const designation = getPath(state, "header.officerDesignation") || "Inspector of Cooperative Societies";

  return `<div class="letter-body">
    <p>To,<br>
    The ${esc(headDesignation)}<br>
    ${esc(range)} Range<br>
    ${esc(district)}</p>

    <p style="margin-top:22px;">Sub: Forwarding of Inspection Report of the ${esc(societyName)}</p>

    <p style="margin-top:22px;">Sir/Madam,</p>

    <p>With reference to the above-mentioned memo, I have the honour to forward herewith the inspection report of ${esc(societyName)}, registration no. ${esc(regNo)} under the ${esc(block)}.</p>

    <p>The report contains the observations made during the inspection and the relevant documents collected in connection with the matter. The same is submitted for your kind perusal and for taking such action as may be deemed appropriate.</p>

    <p>Enclo.: Inspection Report.</p>

    <p>Thanking you.</p>

    <p style="margin-top:22px;">Yours faithfully,</p>

    <div style="margin-top:60px;">
      <p style="border-top:1px solid #333; display:inline-block; padding-top:4px; margin:0;">
        <strong>${esc(designation)}</strong><br>
        ${esc(block)}
      </p>
    </div>
  </div>`;
}

function updateLetterPreview() {
  const box = document.getElementById("letterPreviewBox");
  if (box) box.innerHTML = buildForwardingLetterHTML();
}

function exportForwardingLetter(type) {
  ensureInspectionId();
  const filenameBase = "Forwarding_Letter_" + (state.header.inspectionId || "unsaved");
  const letterHtml = buildForwardingLetterHTML();

  if (type === "word") {
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.7; }
  p { margin: 6px 0; }
</style></head>
<body>${letterHtml}</body></html>`;
    const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Word ফাইল ডাউনলোড হয়েছে ✓");
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; padding: 40px; margin: 0; font-size: 13px; line-height: 1.7; }
  p { margin: 6px 0; }
  .hint-bar { background: #1F4B3F; color: #fff; padding: 10px 16px; font-size: 12.5px; text-align: center; margin: -40px -40px 24px; }
  @media print { .hint-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="hint-bar">এই পেজটি প্রিন্ট করতে Ctrl+P / ফোনে মেনু (⋮) থেকে Print চাপুন, তারপর "Save as PDF" বেছে নিন</div>
${letterHtml}
</body>
</html>`;

  let printWindow = null;
  try { printWindow = window.open("", "_blank"); } catch (e) { printWindow = null; }

  if (!printWindow) {
    const printArea = document.getElementById("printArea");
    printArea.innerHTML = letterHtml;
    showToast('পপ-আপ ব্লক করা আছে — এই পেজ থেকেই প্রিন্ট খুলছে, "Save as PDF" বেছে নিন');
    setTimeout(() => {
      try { window.print(); } catch (e) { showToast("প্রিন্ট চালু করা যায়নি"); }
    }, 300);
    return;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); } catch (e) {}
    }, 400);
  } catch (e) {
    const printArea = document.getElementById("printArea");
    printArea.innerHTML = letterHtml;
    setTimeout(() => { try { window.print(); } catch (e2) {} }, 300);
  }
}

function renderForwardingPage(container) {
  const wrap = el("div", { class: "index-page" });

  wrap.appendChild(el("div", { class: "index-title serif", text: "ফরোয়ার্ডিং লেটার (Forwarding Letter)" }));
  wrap.appendChild(el("div", { class: "index-subtitle", text: "Inspection Report পাঠানোর কভার লেটার" }));

  const fieldWrap = el("div", { class: "field", style: "text-align:left; margin-top:20px;" });
  fieldWrap.appendChild(el("label", { text: "পদবি (Designation)" }));
  const input = el("input", { type: "text", placeholder: "যেমন: Assistant Registrar of Co-operative Societies" });
  input.value = getPath(state, "header.headOfOfficeDesignation") || "";
  input.oninput = () => {
    setPath(state, "header.headOfOfficeDesignation", input.value);
    scheduleAutoSave();
    updateLetterPreview();
  };
  fieldWrap.appendChild(input);
  wrap.appendChild(fieldWrap);

  const previewBox = el("div", { class: "letter-preview", id: "letterPreviewBox" });
  previewBox.innerHTML = buildForwardingLetterHTML();
  wrap.appendChild(previewBox);

  const btnRow = el("div", { style: "display:flex; gap:10px; margin-top:18px;" });
  const pdfBtn = el("button", { class: "btn btn-secondary", text: "📄 PDF", style: "flex:1;" });
  pdfBtn.onclick = () => exportForwardingLetter("pdf");
  const wordBtn = el("button", { class: "btn btn-primary", text: "📝 Word", style: "flex:1;" });
  wordBtn.onclick = () => exportForwardingLetter("word");
  btnRow.appendChild(pdfBtn);
  btnRow.appendChild(wordBtn);
  wrap.appendChild(btnRow);

  container.appendChild(wrap);
}

// ---------- Legal Reference page ----------
function openLegalDoc(doc) {
  try {
    window.open(doc.file, "_blank");
  } catch (e) {
    showToast("ফাইলটি খোলা যায়নি — হোস্ট করা ভার্সনে চেষ্টা করুন");
  }
}

function downloadLegalDoc(doc) {
  const a = document.createElement("a");
  a.href = doc.file;
  a.download = doc.file.split("/").pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openLegalSummary(doc) {
  document.getElementById("legalSummaryTitle").textContent = doc.shortTitle || doc.title;
  const body = document.getElementById("legalSummaryBody");
  body.innerHTML = "";
  (doc.summary || []).forEach((section) => {
    body.appendChild(el("div", { class: "legal-summary-heading", text: section.heading }));
    (section.points || []).forEach((p) => {
      body.appendChild(el("div", { class: "legal-summary-point", text: "• " + p }));
    });
  });
  document.getElementById("legalSummaryDownloadBtn").onclick = () => downloadLegalDoc(doc);
  document.getElementById("legalSummaryOverlay").classList.add("show");
}

function previewLegalDoc(doc) {
  if (doc.summary) openLegalSummary(doc);
  else openLegalDoc(doc);
}

function renderLegalDocCard(doc, isPriority) {
  const card = el("div", { class: "legal-doc-card" + (isPriority ? " priority" : "") });
  card.appendChild(el("div", { class: "legal-doc-title", text: doc.title }));
  if (doc.description) card.appendChild(el("div", { class: "legal-doc-desc", text: doc.description }));
  const btnRow = el("div", { class: "legal-doc-btns" });
  const previewBtn = el("button", { class: "legal-btn-preview", text: doc.summary ? "📖 সারাংশ দেখুন" : "👁️ Preview" });
  previewBtn.onclick = () => previewLegalDoc(doc);
  const downloadBtn = el("button", { class: "legal-btn-download", text: "⬇️ Download" });
  downloadBtn.onclick = () => downloadLegalDoc(doc);
  btnRow.appendChild(previewBtn);
  btnRow.appendChild(downloadBtn);
  card.appendChild(btnRow);
  return card;
}

function renderLegalSearchResults(container, query) {
  container.innerHTML = "";
  const q = query.trim().toLowerCase();
  const results = [];
  LEGAL_DOCS.forEach((doc) => {
    const docMatch = doc.title.toLowerCase().includes(q) || (doc.shortTitle || "").toLowerCase().includes(q);
    if (docMatch) results.push({ doc, item: null });
    (doc.index || []).forEach((item) => {
      const numStr = String(item.num).toLowerCase();
      if (numStr === q || (q.length >= 2 && (numStr.includes(q) || item.title.toLowerCase().includes(q)))) {
        results.push({ doc, item });
      }
    });
  });

  if (!results.length) {
    container.appendChild(el("div", { class: "legal-empty", text: "কোনো ফলাফল পাওয়া যায়নি — অন্য শব্দ দিয়ে চেষ্টা করুন" }));
    return;
  }

  results.slice(0, 60).forEach(({ doc, item }) => {
    const row = el("div", { class: "legal-result-row" });
    const label = item ? `${doc.indexLabel || "Section"} ${item.num}: ${item.title}` : doc.title;
    row.appendChild(el("div", { class: "legal-result-label", text: label }));
    row.appendChild(el("div", { class: "legal-result-doc", text: doc.shortTitle || doc.title }));
    row.onclick = () => previewLegalDoc(doc);
    container.appendChild(row);
  });
}

function renderLegalPage(container) {
  const wrap = el("div", { class: "index-page" });

  wrap.appendChild(el("div", { class: "index-title serif", text: "⚖️ আইনি তথ্যভাণ্ডার (Legal Reference)" }));
  wrap.appendChild(el("div", { class: "index-subtitle", text: "Acts, Rules ও প্রবিধান — Preview, Download ও Search" }));

  const searchWrap = el("div", { class: "field", style: "text-align:left; margin-top:16px;" });
  const searchInput = el("input", { type: "text", placeholder: "ধারা, নিয়ম নম্বর, বা যেকোনো শব্দ লিখে সার্চ করুন..." });
  searchWrap.appendChild(searchInput);
  wrap.appendChild(searchWrap);

  const resultsBox = el("div", { class: "legal-results", id: "legalResultsBox" });
  resultsBox.style.display = "none";
  wrap.appendChild(resultsBox);

  const defaultBox = el("div", { id: "legalDefaultBox" });

  defaultBox.appendChild(el("div", { class: "index-heading", text: "⭐ গুরুত্বপূর্ণ — নিয়মিত কাজের জন্য (Priority)" }));
  const priorityGrid = el("div", { class: "legal-grid" });
  LEGAL_DOCS.filter((d) => d.category === "priority").forEach((doc) => {
    priorityGrid.appendChild(renderLegalDocCard(doc, true));
  });
  defaultBox.appendChild(priorityGrid);

  defaultBox.appendChild(el("div", { class: "index-heading", text: "📚 অন্যান্য আইন ও প্রবিধান (Reference Only)" }));
  const refGrid = el("div", { class: "legal-grid" });
  LEGAL_DOCS.filter((d) => d.category !== "priority").forEach((doc) => {
    refGrid.appendChild(renderLegalDocCard(doc, false));
  });
  defaultBox.appendChild(refGrid);

  wrap.appendChild(defaultBox);

  searchInput.oninput = () => {
    const q = searchInput.value.trim();
    if (!q) {
      resultsBox.style.display = "none";
      defaultBox.style.display = "block";
    } else {
      resultsBox.style.display = "block";
      defaultBox.style.display = "none";
      renderLegalSearchResults(resultsBox, q);
    }
  };

  container.appendChild(wrap);
}

function render() {
  const container = document.getElementById("sectionsContainer");
  container.innerHTML = "";

  const pageIdx = Math.max(0, PAGES.findIndex((p) => p.key === openSection));
  const page = PAGES[pageIdx];

  if (page.key === "index") {
    renderIndexPage(container);
    updateInspectionIdDisplay();
    const total = countTotalVisible(), filled = countFilled();
    document.getElementById("progressBar").style.width = (total ? (filled / total) * 100 : 0) + "%";
    document.getElementById("progressLabel").textContent = `${filled} / ${total} ফিল্ড পূরণ হয়েছে`;
    return;
  }

  function buildStepBar(activeKey) {
    const stepBar = el("div", { class: "step-bar" });
    PAGES.filter((p) => p.key !== "index").forEach((p) => {
      const { total, filled } = pageFilledCount(p);
      const isActive = p.key === activeKey;
      const pill = el("button", {
        class: "step-pill" + (isActive ? " active" : "") + (total && filled === total ? " done" : ""),
        style: accentStyle(p),
        text: p.shortLabel || p.title,
      });
      pill.onclick = () => { openSection = p.key; render(); window.scrollTo(0, 0); };
      stepBar.appendChild(pill);
    });
    return stepBar;
  }

  if (page.key === "forwarding") {
    container.appendChild(buildStepBar(page.key));
    renderForwardingPage(container);
    updateInspectionIdDisplay();
    const total = countTotalVisible(), filled = countFilled();
    document.getElementById("progressBar").style.width = (total ? (filled / total) * 100 : 0) + "%";
    document.getElementById("progressLabel").textContent = `${filled} / ${total} ফিল্ড পূরণ হয়েছে`;
    return;
  }

  if (page.key === "legal") {
    container.appendChild(buildStepBar(page.key));
    renderLegalPage(container);
    updateInspectionIdDisplay();
    const total = countTotalVisible(), filled = countFilled();
    document.getElementById("progressBar").style.width = (total ? (filled / total) * 100 : 0) + "%";
    document.getElementById("progressLabel").textContent = `${filled} / ${total} ফিল্ড পূরণ হয়েছে`;
    return;
  }

  // ---- Step bar (jump navigation) ----
  const stepBar = el("div", { class: "step-bar" });
  PAGES.filter((p) => p.key !== "index").forEach((p) => {
    const { total, filled } = pageFilledCount(p);
    const isActive = p.key === page.key;
    const pill = el("button", {
      class: "step-pill" + (isActive ? " active" : "") + (total && filled === total ? " done" : ""),
      style: accentStyle(p),
      text: p.shortLabel || p.title,
    });
    pill.onclick = () => { openSection = p.key; render(); window.scrollTo(0, 0); };
    stepBar.appendChild(pill);
  });
  container.appendChild(stepBar);

  // ---- Current page card ----
  const card = el("div", { class: "section-card open", style: accentStyle(page) });
  const head = el("div", { class: "section-head-static" }, [
    el("span", { class: "section-title", text: page.title }),
  ]);
  card.appendChild(head);
  const body = el("div", { class: "section-body", style: "display:block;" });
  renderFieldList(body, page.fields);
  card.appendChild(body);
  container.appendChild(card);

  // ---- Prev / Next navigation ----
  const navBar = el("div", { class: "page-nav" });
  const prevBtn = el("button", { class: "nav-btn", text: "‹ আগের ধাপ" });
  prevBtn.onclick = () => { openSection = PAGES[pageIdx - 1].key; render(); window.scrollTo(0, 0); };
  const navLabel = el("span", { class: "page-nav-label", text: `${pageIdx + 1} / ${PAGES.length}` });
  const nextBtn = el("button", {
    class: "nav-btn nav-btn-primary",
    text: pageIdx >= PAGES.length - 1 ? "সম্পন্ন ✓" : "পরের ধাপ ›",
  });
  if (pageIdx >= PAGES.length - 1) nextBtn.disabled = true;
  nextBtn.onclick = () => { openSection = PAGES[pageIdx + 1].key; render(); window.scrollTo(0, 0); };
  navBar.appendChild(prevBtn);
  navBar.appendChild(navLabel);
  navBar.appendChild(nextBtn);
  container.appendChild(navBar);

  const total = countTotalVisible(), filled = countFilled();
  document.getElementById("progressBar").style.width = (total ? (filled / total) * 100 : 0) + "%";
  document.getElementById("progressLabel").textContent = `${filled} / ${total} ফিল্ড পূরণ হয়েছে`;
  updateInspectionIdDisplay();
}

// ---------- Persistence ----------
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1800);
}

async function saveState() {
  try {
    localStorage.setItem("pacs-inspection-state", JSON.stringify(state));
    showToast("সেভ হয়েছে ✓");
  } catch (err) {
    showToast("সেভ করা যায়নি — ব্রাউজারের স্টোরেজ পূর্ণ বা বন্ধ থাকতে পারে");
  }
}

let autoSaveTimer = null;
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    try { localStorage.setItem("pacs-inspection-state", JSON.stringify(state)); } catch (err) {}
  }, 700);
}
document.getElementById("sectionsContainer").addEventListener("input", scheduleAutoSave);

async function loadState() {
  try {
    const raw = localStorage.getItem("pacs-inspection-state");
    if (raw) {
      const loaded = JSON.parse(raw);
      state = Object.assign(state, loaded);
    }
  } catch (err) {
    // no saved state yet, or storage unavailable — start fresh
  }
  ensureInspectionId();
  render();
}

document.getElementById("saveBtn").onclick = saveState;

function resetAllData() {
  document.getElementById("confirmOverlay").classList.add("show");
}

function doResetAllData() {
  try { localStorage.removeItem("pacs-inspection-state"); } catch (e) {}
  state = { header: {}, a: {}, b: {}, c: {}, e: {}, f: {}, g: {}, godown: {}, photos: {}, h: {}, i: {} };
  ensureInspectionId();
  openSection = "index";
  render();
  document.getElementById("confirmOverlay").classList.remove("show");
  showToast("নতুন পরিদর্শনের জন্য ফর্ম খালি করা হয়েছে");
}

document.getElementById("newInspectionBtn").onclick = resetAllData;
document.getElementById("confirmCancelBtn").onclick = () => document.getElementById("confirmOverlay").classList.remove("show");
document.getElementById("confirmOkBtn").onclick = doResetAllData;

// ---------- Inspection ID + JSON backup / import / share ----------
function generateInspectionId() {
  const d = new Date();
  const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PACS-${ymd}-${rand}`;
}

function ensureInspectionId() {
  if (!state.header) state.header = {};
  if (!state.header.inspectionId) state.header.inspectionId = generateInspectionId();
  return state.header.inspectionId;
}

function updateInspectionIdDisplay() {
  const el = document.getElementById("inspectionIdText");
  if (el) el.textContent = "Inspection ID: " + (state.header.inspectionId || "—");
}

function backupFileBaseName() {
  const id = state.header.inspectionId || "unsaved";
  const society = (getPath(state, "a.name") || "").trim();
  const slug = society ? "_" + society.replace(/[^a-zA-Z0-9\u0980-\u09FF]+/g, "_").slice(0, 40) : "";
  return `PACS_Inspection_${id}${slug}`;
}

function exportJsonBackup() {
  ensureInspectionId();
  updateInspectionIdDisplay();
  const filename = backupFileBaseName() + ".json";
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("ব্যাকআপ ফাইল ডাউনলোড হয়েছে ✓");
}

async function shareJsonBackup() {
  ensureInspectionId();
  updateInspectionIdDisplay();
  const filename = backupFileBaseName() + ".json";
  try {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "PACS Inspection Backup", text: `Inspection ID: ${state.header.inspectionId}` });
      showToast("শেয়ার সম্পন্ন ✓");
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // user cancelled the share sheet
  }
  exportJsonBackup();
  showToast("এই ব্রাউজারে সরাসরি Share সমর্থিত নয় — ফাইল ডাউনলোড হয়েছে, ইমেইলে ম্যানুয়ালি অ্যাটাচ করুন");
}

let pendingImportedState = null;
function handleImportFile(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      pendingImportedState = parsed;
      document.getElementById("storageOverlay").classList.remove("show");
      document.getElementById("templateChoiceOverlay").classList.add("show");
    } catch (e) {
      showToast("ফাইলটি পড়া যায়নি — এটি সঠিক ব্যাকআপ ফাইল কিনা যাচাই করুন");
    }
  };
  reader.readAsText(file);
  evt.target.value = "";
}

function loadFull() {
  if (!pendingImportedState) return;
  state = pendingImportedState;
  ensureInspectionId();
  try { localStorage.setItem("pacs-inspection-state", JSON.stringify(state)); } catch (e) {}
  pendingImportedState = null;
  openSection = "index";
  document.getElementById("templateChoiceOverlay").classList.remove("show");
  render();
  showToast("পরিদর্শন ফিরিয়ে আনা হয়েছে ✓");
}

const CARRY_FORWARD_HEADER_KEYS = ["district", "constituency", "range", "subdivision", "block", "officers"];
const CARRY_FORWARD_SECTIONS = ["a", "b", "godown"];
function loadAsTemplate() {
  if (!pendingImportedState) return;
  const src = pendingImportedState;
  const prevId = src.header && src.header.inspectionId;
  const newState = { header: {}, a: {}, b: {}, c: {}, e: {}, f: {}, g: {}, godown: {}, h: {}, i: {} };
  CARRY_FORWARD_HEADER_KEYS.forEach((k) => {
    if (src.header && src.header[k] !== undefined) newState.header[k] = src.header[k];
  });
  CARRY_FORWARD_SECTIONS.forEach((key) => {
    if (src[key] !== undefined) newState[key] = JSON.parse(JSON.stringify(src[key]));
  });
  newState.header.previousInspectionId = prevId || "";
  newState.header.inspectionId = generateInspectionId();
  state = newState;
  try { localStorage.setItem("pacs-inspection-state", JSON.stringify(state)); } catch (e) {}
  pendingImportedState = null;
  openSection = "index";
  document.getElementById("templateChoiceOverlay").classList.remove("show");
  render();
  showToast("নতুন পরিদর্শন তৈরি হয়েছে — সাধারণ তথ্য কপি করা হয়েছে ✓");
}

document.getElementById("storageBtn").onclick = () => {
  updateInspectionIdDisplay();
  document.getElementById("storageOverlay").classList.add("show");
};
document.getElementById("storageCloseBtn").onclick = () => document.getElementById("storageOverlay").classList.remove("show");
document.getElementById("storageCloseBtn2").onclick = () => document.getElementById("storageOverlay").classList.remove("show");
document.getElementById("exportJsonBtn").onclick = exportJsonBackup;
document.getElementById("shareJsonBtn").onclick = shareJsonBackup;
document.getElementById("importJsonBtn").onclick = () => document.getElementById("importFileInput").click();
document.getElementById("importFileInput").onchange = handleImportFile;
document.getElementById("loadFullBtn").onclick = loadFull;
document.getElementById("loadTemplateBtn").onclick = loadAsTemplate;
document.getElementById("copyIdBtn").onclick = async () => {
  ensureInspectionId();
  updateInspectionIdDisplay();
  try {
    await navigator.clipboard.writeText(state.header.inspectionId || "");
    showToast("কপি হয়েছে ✓");
  } catch (e) {
    showToast("কপি করা যায়নি");
  }
};

// ---------- Report HTML builder (used for both PDF-via-print and Word export) ----------
function esc(v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fieldValueOrBlank(key) {
  const v = getPath(state, key);
  return v !== undefined && v !== null && String(v).trim() !== "" ? esc(v) : "________________";
}

const TABLE_STYLE = 'style="width:100%;border-collapse:collapse;margin:6px 0 14px;"';
const TH_STYLE = 'style="border:1px solid #999;padding:4px 6px;font-size:10.5px;text-align:left;background:#f0ede2;"';
const TD_STYLE = 'style="border:1px solid #999;padding:4px 6px;font-size:10.5px;text-align:left;"';

function cellOrNbsp(v) {
  const e = esc(v);
  return e === "" ? "&nbsp;" : e;
}

function buildDynamicTableHTML(f) {
  const rows = getPath(state, f.key) || [];
  if (!rows.length) {
    return `<p class="empty-note">(কোনো তথ্য যোগ করা হয়নি)</p>`;
  }
  let html = `<table ${TABLE_STYLE}><thead><tr>`;
  if (f.autoSerial) html += `<th ${TH_STYLE}>Sl.</th>`;
  f.columns.forEach((c) => (html += `<th ${TH_STYLE}>${esc(c.label)}</th>`));
  html += `</tr></thead><tbody>`;
  rows.forEach((row, idx) => {
    html += `<tr>`;
    if (f.autoSerial) html += `<td ${TD_STYLE}>${idx + 1}</td>`;
    f.columns.forEach((c) => (html += `<td ${TD_STYLE}>${cellOrNbsp(row[c.key])}</td>`));
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function buildMatrixTableHTML(f) {
  const rows = getPath(state, f.key) || [];
  let html = `<table ${TABLE_STYLE}><thead><tr><th ${TH_STYLE}>&nbsp;</th>`;
  f.columns.forEach((c) => (html += `<th ${TH_STYLE}>${esc(matrixColLabel(c))}</th>`));
  html += `</tr></thead><tbody>`;
  f.rows.forEach((rowLabel, idx) => {
    const rowData = rows[idx] || {};
    html += `<tr><td ${TD_STYLE}><strong>${esc(rowLabel)}</strong></td>`;
    f.columns.forEach((c) => (html += `<td ${TD_STYLE}>${cellOrNbsp(rowData[c.key])}</td>`));
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function buildFieldListHTML(fields) {
  let html = "";
  fields.forEach((f) => {
    if (!fieldVisible(f)) return;
    if (f.type === "subheading") {
      html += `<h3>${esc(f.label)}</h3>`;
    } else if (f.type === "dynamic-table" || f.type === "dynamic-table-total") {
      if (f.sublabel) html += `<h3>${esc(f.sublabel)}</h3>`;
      html += buildDynamicTableHTML(f);
      if (f.type === "dynamic-table-total") {
        const sum = sumDynamicTableColumn(f.key, f.totalColumn);
        html += `<p><strong>${esc(f.totalLabel || "মোট (Total)")}:</strong> ₹${sum.toLocaleString("en-IN")}</p>`;
      }
    } else if (f.type === "matrix-table" || f.type === "cash-matrix" || f.type === "matrix-table-total") {
      html += buildMatrixTableHTML(f);
    } else if (f.type === "computed-percent") {
      const num = sumDynamicTableColumn(f.numerator.path, f.numerator.column);
      const den = sumMatrixColumnExcluding(f.denominator.path, f.denominator.rows, f.denominator.excludeRow, f.denominator.column);
      const pct = den > 0 ? ((num / den) * 100).toFixed(2) : "0.00";
      html += `<p><strong>${esc(f.label)}:</strong> ${pct}%</p>`;
    } else if (f.type === "photo-capture") {
      const items = getPath(state, f.key) || [];
      if (!items.length) {
        html += `<p class="empty-note">(কোনো ছবি যোগ করা হয়নি)</p>`;
      } else {
        html += `<div class="photo-report-grid">`;
        items.forEach((item) => {
          const locLine = item.lat != null
            ? `${esc(item.lat.toFixed(5))}, ${esc(item.lng.toFixed(5))}`
            : "লোকেশন পাওয়া যায়নি";
          html += `<div class="photo-report-item">
            <img src="${item.dataUrl}" />
            <p class="photo-report-cat">${esc(item.category)}</p>
            <p class="photo-report-meta">🕒 ${esc(item.timestamp)}</p>
            <p class="photo-report-meta">📍 ${locLine}</p>
          </div>`;
        });
        html += `</div>`;
      }
    } else if (f.type === "textarea" && f.renderAsNumberedList) {
      const raw = getPath(state, f.key);
      const lines = (raw || "").split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) {
        html += `<p><strong>${esc(f.label)}:</strong> ________________</p>`;
      } else {
        html += `<p><strong>${esc(f.label)}:</strong></p><ol class="obs-list">`;
        lines.forEach((line) => { html += `<li>${esc(line)}</li>`; });
        html += `</ol>`;
      }
    } else if (f.type === "checklist") {
      const arr = getPath(state, f.key) || [];
      const otherVal = f.otherKey ? getPath(state, f.otherKey) : null;
      const items = arr.slice();
      if (otherVal && String(otherVal).trim() !== "") items.push(`${f.otherLabel || "অন্যান্য"}: ${otherVal}`);
      html += `<p><strong>${esc(f.label)}:</strong></p>`;
      if (!items.length) {
        html += `<p class="empty-note">(কোনোটি নির্বাচন করা হয়নি)</p>`;
      } else {
        html += `<ol class="obs-list">`;
        items.forEach((it) => { html += `<li>${esc(it)}</li>`; });
        html += `</ol>`;
      }
    } else if (f.type === "linked-field") {
      const value = getPath(state, f.sourceKey);
      const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
      html += `<p><strong>${esc(f.label)}:</strong> ${hasValue ? esc(String(value)) : "________________"}</p>`;
    } else if (f.type === "redflag-summary") {
      const flags = computeActiveRedFlags();
      if (!flags.length) {
        html += `<p>✅ কোনো Red Flag সনাক্ত হয়নি</p>`;
      } else {
        html += `<ol class="obs-list">`;
        flags.forEach((label) => { html += `<li>🔴 ${esc(label)}</li>`; });
        html += `</ol>`;
      }
    } else if (f.type === "scheme-detail-repeat") {
      const selected = getPath(state, "h.schemesSelected") || [];
      const otherName = getPath(state, "h.otherSchemeName");
      const allSchemes = [...selected];
      if (otherName && otherName.trim() && !allSchemes.includes(otherName)) allSchemes.push(otherName);
      if (!allSchemes.length) {
        html += `<p class="empty-note">(কোনো প্রকল্প নির্বাচন করা হয়নি)</p>`;
      } else {
        allSchemes.forEach((schemeName) => {
          const base = `h.schemeDetails.${schemeKeyFor(schemeName)}`;
          html += `<h3>${esc(schemeName)}</h3>`;
          html += buildFieldListHTML(schemeDetailFieldsFor(base));
        });
      }
    } else {
      html += `<p><strong>${esc(f.label)}:</strong> ${fieldValueOrBlank(f.key)}</p>`;
    }
  });
  return html;
}

function buildSignatureBlockHTML() {
  const officerName = getPath(state, "header.officers");
  const designation = getPath(state, "header.officerDesignation");
  const blockName = getPath(state, "header.block");
  const blockLine = blockName && String(blockName).trim() !== ""
    ? esc(blockName)
    : "________________________";
  const designationLine = designation && String(designation).trim() !== ""
    ? esc(designation)
    : "Inspector of Cooperative Societies";
  const primaryNameLine = officerName && String(officerName).trim() !== "" ? `${esc(officerName)}<br>` : "";

  let html = `<div style="margin-top:60px; display:flex; flex-wrap:wrap; justify-content:flex-end; gap:40px;">
    <div style="text-align:right;">
      <p style="margin-bottom:36px;">&nbsp;</p>
      <p style="border-top:1px solid #333; display:inline-block; padding-top:4px; margin:0;">
        ${primaryNameLine}<strong>${designationLine}</strong><br>
        ${blockLine}
      </p>
    </div>`;

  const isJoint = getPath(state, "header.isJointInspection");
  if (isJoint === "হ্যাঁ (Yes)") {
    const additional = getPath(state, "header.additionalOfficers") || [];
    additional.forEach((o) => {
      if (!o || (!o.name && !o.designation && !o.blockCircleHQ)) return;
      const name = o.name ? `${esc(o.name)}<br>` : "";
      const desig = o.designation ? esc(o.designation) : "________________________";
      const blk = o.blockCircleHQ ? esc(o.blockCircleHQ) : "________________________";
      html += `
    <div style="text-align:right;">
      <p style="margin-bottom:36px;">&nbsp;</p>
      <p style="border-top:1px solid #333; display:inline-block; padding-top:4px; margin:0;">
        ${name}<strong>${desig}</strong><br>
        ${blk}
      </p>
    </div>`;
    });
  }

  html += `</div>`;
  return html;
}

function buildReportHTML(sectionKeysFilter) {
  ensureInspectionId();
  const includeHeader = !sectionKeysFilter || sectionKeysFilter.includes("header");

  let html = `<h1>সমবায় সমিতি পরিদর্শন প্রোফর্মা</h1>`;
  html += `<div class="print-sub">PACS / Cooperative Society Inspection</div>`;
  html += `<div class="inspection-id-print">Inspection ID: ${esc(state.header.inspectionId)} &nbsp;|&nbsp; ডেটা ফাইল: ${esc(backupFileBaseName())}.json</div>`;

  if (sectionKeysFilter) {
    html += `<p class="partial-note">⚠️ এটি একটি আংশিক রিপোর্ট — শুধুমাত্র নির্বাচিত অংশ অন্তর্ভুক্ত করা হয়েছে। সম্পূর্ণ ডেটা আপনার ফর্ম ও ব্যাকআপ ফাইলে অক্ষত আছে।</p>`;
  }

  if (includeHeader) {
    html += `<h2>পরিদর্শনের বিবরণ (Inspection Details)</h2>`;
    html += buildFieldListHTML(HEADER_FIELDS);
  }

  SCHEMA.forEach((sec) => {
    if (sectionKeysFilter && !sectionKeysFilter.includes(sec.key)) return;
    html += `<h2>${esc(sec.title)}</h2>`;
    html += buildFieldListHTML(sec.fields);
  });

  html += buildSignatureBlockHTML();

  return html;
}

// ---------- Blank Format: printable paper template, ignoring all entered data ----------
function buildBlankFieldListHTML(fields) {
  let html = "";
  fields.forEach((f) => {
    if (f.type === "subheading") {
      html += `<h3>${esc(f.label)}</h3>`;
      return;
    }
    if (["photo-capture", "computed-percent", "redflag-summary", "linked-field"].includes(f.type)) {
      return;
    }
    if (f.type === "scheme-detail-repeat") {
      html += `<p><strong>প্রকল্পের নাম (Scheme Name):</strong> ________________________________</p>`;
      html += buildBlankFieldListHTML(schemeDetailFieldsFor("blank"));
      return;
    }
    if (f.type === "dynamic-table" || f.type === "dynamic-table-total") {
      if (f.sublabel) html += `<h3>${esc(f.sublabel)}</h3>`;
      html += `<table ${TABLE_STYLE}><thead><tr>`;
      if (f.autoSerial) html += `<th ${TH_STYLE}>Sl.</th>`;
      f.columns.forEach((c) => (html += `<th ${TH_STYLE}>${esc(c.label)}</th>`));
      html += `</tr></thead><tbody>`;
      for (let i = 0; i < 3; i++) {
        html += `<tr>`;
        if (f.autoSerial) html += `<td ${TD_STYLE}>${i + 1}</td>`;
        f.columns.forEach(() => (html += `<td ${TD_STYLE}>&nbsp;</td>`));
        html += `</tr>`;
      }
      html += `</tbody></table>`;
      return;
    }
    if (f.type === "matrix-table" || f.type === "cash-matrix" || f.type === "matrix-table-total") {
      html += `<table ${TABLE_STYLE}><thead><tr><th ${TH_STYLE}>&nbsp;</th>`;
      f.columns.forEach((c) => (html += `<th ${TH_STYLE}>${esc(matrixColLabel(c))}</th>`));
      html += `</tr></thead><tbody>`;
      f.rows.forEach((rowLabel) => {
        html += `<tr><td ${TD_STYLE}><strong>${esc(rowLabel)}</strong></td>`;
        f.columns.forEach(() => (html += `<td ${TD_STYLE}>&nbsp;</td>`));
        html += `</tr>`;
      });
      html += `</tbody></table>`;
      return;
    }
    if (f.type === "checklist") {
      html += `<p><strong>${esc(f.label)}:</strong></p><p>`;
      (f.options || []).forEach((o) => (html += `☐ ${esc(o)} &nbsp;&nbsp; `));
      if (f.otherKey) html += `☐ ${esc(f.otherLabel || "Others")}: ________________`;
      html += `</p>`;
      return;
    }
    if (f.type === "select") {
      html += `<p><strong>${esc(f.label)}:</strong> ${(f.options || []).map((o) => `☐ ${esc(o)}`).join(" &nbsp; ")}</p>`;
      return;
    }
    html += `<p><strong>${esc(f.label)}:</strong> ________________________________</p>`;
  });
  return html;
}

function buildBlankReportHTML(sectionKeysFilter) {
  let html = `<h1>সমবায় সমিতি পরিদর্শন প্রোফর্মা</h1>`;
  html += `<div class="print-sub">PACS / Cooperative Society Inspection — Blank Format</div>`;

  if (sectionKeysFilter) {
    html += `<p class="partial-note">এই ব্ল্যাঙ্ক ফরম্যাটে শুধুমাত্র নির্বাচিত অংশ অন্তর্ভুক্ত করা হয়েছে।</p>`;
  }

  const includeHeader = !sectionKeysFilter || sectionKeysFilter.includes("header");
  if (includeHeader) {
    html += `<h2>পরিদর্শনের বিবরণ (Inspection Details)</h2>`;
    html += buildBlankFieldListHTML(HEADER_FIELDS);
  }

  SCHEMA.forEach((sec) => {
    if (sectionKeysFilter && !sectionKeysFilter.includes(sec.key)) return;
    html += `<h2>${esc(sec.title)}</h2>`;
    html += buildBlankFieldListHTML(sec.fields);
  });

  html += `<div style="margin-top:60px; text-align:right;">
    <p style="margin-bottom:36px;">&nbsp;</p>
    <p style="border-top:1px solid #333; display:inline-block; padding-top:4px; margin:0;">
      Designation: ________________________________<br>
      Block/Circle: ________________________________
    </p>
  </div>`;

  return html;
}

function exportBlankFormat(type, sectionKeysFilter) {
  const filenameBase = "PACS_Blank_Format" + (sectionKeysFilter ? "_Partial" : "");
  const reportHtml = buildBlankReportHTML(sectionKeysFilter);

  if (type === "word") {
    const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
  .print-sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 4px; }
  .partial-note { background: #FBEFD8; color: #7A4E11; border: 1px solid #E8CE9C; border-radius: 4px; padding: 8px 12px; font-size: 11px; text-align: center; margin-bottom: 16px; }
  h2 { font-size: 15px; background: #eef0e8; padding: 6px 8px; margin: 22px 0 10px; border-left: 4px solid #1F4B3F; }
  h3 { font-size: 12.5px; color: #B4791F; margin: 14px 0 6px; }
  p { font-size: 12px; margin: 5px 0; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  th, td { border: 1px solid #999; padding: 4px 6px; font-size: 10.5px; text-align: left; }
  th { background: #f0ede2; }
</style></head>
<body>${reportHtml}</body></html>`;
    const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Blank Word ফাইল ডাউনলোড হয়েছে ✓");
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; padding: 24px; margin: 0; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
  .print-sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 4px; }
  .partial-note { background: #FBEFD8; color: #7A4E11; border: 1px solid #E8CE9C; border-radius: 4px; padding: 8px 12px; font-size: 11px; text-align: center; margin-bottom: 16px; }
  h2 { font-size: 15px; background: #eef0e8; padding: 6px 8px; margin: 22px 0 10px; border-left: 4px solid #1F4B3F; }
  h3 { font-size: 12.5px; color: #B4791F; margin: 14px 0 6px; }
  p { font-size: 12px; margin: 5px 0; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  th, td { border: 1px solid #999; padding: 4px 6px; font-size: 10.5px; text-align: left; }
  th { background: #f0ede2; }
  .hint-bar { background: #1F4B3F; color: #fff; padding: 10px 16px; font-size: 12.5px; text-align: center; margin: -24px -24px 20px; }
  @media print { .hint-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="hint-bar">এই পেজটি প্রিন্ট করতে Ctrl+P / ফোনে মেনু (⋮) থেকে Print চাপুন, তারপর "Save as PDF" বেছে নিন</div>
${reportHtml}
</body>
</html>`;

  let printWindow = null;
  try { printWindow = window.open("", "_blank"); } catch (e) { printWindow = null; }

  if (!printWindow) {
    const printArea = document.getElementById("printArea");
    printArea.innerHTML = reportHtml;
    showToast('পপ-আপ ব্লক করা আছে — এই পেজ থেকেই প্রিন্ট খুলছে');
    setTimeout(() => { try { window.print(); } catch (e) {} }, 300);
    return;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); } catch (e) {}
    }, 400);
  } catch (e) {
    const printArea = document.getElementById("printArea");
    printArea.innerHTML = reportHtml;
    setTimeout(() => { try { window.print(); } catch (e2) {} }, 300);
  }
}

// ---------- PDF export ----------
// Primary path: open the report in a new tab and print from there (most reliable across
// mobile browsers). Fallback path: if popups are blocked (common in some installed-app /
// sandboxed contexts), print the current page instead using the hidden #printArea.
function printCurrentPageFallback(sectionKeysFilter) {
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = buildReportHTML(sectionKeysFilter);
  showToast('পপ-আপ ব্লক করা আছে — এই পেজ থেকেই প্রিন্ট খুলছে, "Save as PDF" বেছে নিন');
  setTimeout(() => {
    try { window.print(); } catch (e) { showToast("প্রিন্ট চালু করা যায়নি — ব্রাউজার আপডেট করে দেখুন"); }
  }, 300);
}

function exportPDF(sectionKeysFilter) {
  ensureInspectionId();
  const filenameBase = backupFileBaseName() + (sectionKeysFilter ? "_Partial" : "");
  const reportHtml = buildReportHTML(sectionKeysFilter);
  const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8">
<title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; padding: 24px; margin: 0; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
  .print-sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 4px; }
  .inspection-id-print { text-align: center; font-size: 10.5px; color: #666; margin-bottom: 18px; font-family: monospace; }
  .partial-note { background: #FBEFD8; color: #7A4E11; border: 1px solid #E8CE9C; border-radius: 4px; padding: 8px 12px; font-size: 11px; text-align: center; margin-bottom: 16px; }
  h2 { font-size: 15px; background: #eef0e8; padding: 6px 8px; margin: 22px 0 10px; border-left: 4px solid #1F4B3F; }
  h3 { font-size: 12.5px; color: #B4791F; margin: 14px 0 6px; }
  p { font-size: 12px; margin: 3px 0; line-height: 1.5; }
  p strong { color: #163831; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  th, td { border: 1px solid #999; padding: 4px 6px; font-size: 10.5px; text-align: left; }
  th { background: #f0ede2; }
  .empty-note { font-size: 11px; color: #888; font-style: italic; }
  .photo-report-grid { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0 16px; }
  .photo-report-item { width: 30%; min-width: 150px; }
  .photo-report-item img { width: 100%; max-width: 260px; border: 1px solid #999; border-radius: 4px; display: block; }
  .photo-report-cat { font-size: 10.5px; font-weight: 700; margin: 5px 0 1px; }
  .photo-report-meta { font-size: 9.5px; color: #555; margin: 1px 0; }
  .obs-list { margin: 4px 0 12px 22px; padding: 0; font-size: 12px; line-height: 1.7; }
  .obs-list li { margin-bottom: 5px; }
  .hint-bar { background: #1F4B3F; color: #fff; padding: 10px 16px; font-size: 12.5px; text-align: center; margin: -24px -24px 20px; }
  @media print { .hint-bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="hint-bar">এই পেজটি প্রিন্ট করতে Ctrl+P / ফোনে মেনু (⋮) থেকে Print চাপুন, তারপর প্রিন্টার হিসেবে "Save as PDF" বেছে নিন</div>
${reportHtml}
</body>
</html>`;

  let printWindow = null;
  try {
    printWindow = window.open("", "_blank");
  } catch (e) {
    printWindow = null;
  }

  if (!printWindow) {
    printCurrentPageFallback(sectionKeysFilter);
    return;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); } catch (e) { printCurrentPageFallback(sectionKeysFilter); }
    }, 400);
  } catch (e) {
    printCurrentPageFallback(sectionKeysFilter);
  }
}

// ---------- Word export (HTML-based .doc — opens directly in Word/Google Docs) ----------
function exportWord(sectionKeysFilter) {
  ensureInspectionId();
  const filenameBase = backupFileBaseName() + (sectionKeysFilter ? "_Partial" : "");
  const bodyHtml = buildReportHTML(sectionKeysFilter);
  const fullHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${esc(filenameBase)}</title>
<style>
  body { font-family: 'Noto Sans Bengali', Arial, sans-serif; color: #1a1a1a; }
  h1 { font-size: 20px; text-align: center; margin-bottom: 2px; }
  .print-sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 4px; }
  .inspection-id-print { text-align: center; font-size: 10.5px; color: #666; margin-bottom: 18px; font-family: monospace; }
  .partial-note { background: #FBEFD8; color: #7A4E11; border: 1px solid #E8CE9C; border-radius: 4px; padding: 8px 12px; font-size: 11px; text-align: center; margin-bottom: 16px; }
  h2 { font-size: 15px; background: #eef0e8; padding: 6px 8px; margin: 22px 0 10px; border-left: 4px solid #1F4B3F; }
  h3 { font-size: 12.5px; color: #B4791F; margin: 14px 0 6px; }
  p { font-size: 12px; margin: 3px 0; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  th, td { border: 1px solid #999; padding: 4px 6px; font-size: 10.5px; text-align: left; }
  th { background: #f0ede2; }
  .empty-note { font-size: 11px; color: #888; font-style: italic; }
  .photo-report-grid { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0 16px; }
  .photo-report-item { width: 30%; min-width: 150px; }
  .photo-report-item img { width: 100%; max-width: 260px; border: 1px solid #999; border-radius: 4px; display: block; }
  .photo-report-cat { font-size: 10.5px; font-weight: 700; margin: 5px 0 1px; }
  .photo-report-meta { font-size: 9.5px; color: #555; margin: 1px 0; }
  .obs-list { margin: 4px 0 12px 22px; padding: 0; font-size: 12px; line-height: 1.7; }
  .obs-list li { margin-bottom: 5px; }
</style></head>
<body>${bodyHtml}</body></html>`;

  const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Word ফাইল ডাউনলোড হয়েছে ✓");
}

// ---------- Print-options flow: full report vs pick specific sections ----------
let pendingExportType = null; // "pdf" | "word"
let isBlankFormatMode = false;

function openPrintChoice(type) {
  isBlankFormatMode = false;
  pendingExportType = type;
  document.getElementById("printChoiceOverlay").classList.add("show");
}

function openBlankFormatPicker() {
  isBlankFormatMode = true;
  renderSectionPicker();
  document.getElementById("sectionPickerOverlay").classList.add("show");
}

function runPendingExport(sectionKeysFilter) {
  if (pendingExportType === "word") exportWord(sectionKeysFilter);
  else exportPDF(sectionKeysFilter);
  pendingExportType = null;
}

function renderSectionPicker() {
  const list = document.getElementById("sectionPickerList");
  list.innerHTML = "";

  const titleEl = document.querySelector("#sectionPickerOverlay .modal-head h2");
  if (titleEl) titleEl.textContent = isBlankFormatMode ? "ব্ল্যাঙ্ক ফরম্যাট — কোন কোন অংশ চান?" : "কোন কোন অংশ চান?";

  const quickRow = el("div", { class: "section-picker-quickrow" });
  const selectAllBtn = el("button", { text: "সব নির্বাচন করুন" });
  const clearBtn = el("button", { text: "কোনোটি না" });
  quickRow.appendChild(selectAllBtn);
  quickRow.appendChild(clearBtn);
  list.appendChild(quickRow);

  const checks = [];
  PAGES.filter((p) => !["index", "forwarding", "legal"].includes(p.key)).forEach((p) => {
    const row = el("label", { class: "section-picker-row" });
    const cb = el("input", { type: "checkbox" });
    cb.value = p.key;
    checks.push(cb);
    row.appendChild(cb);
    row.appendChild(el("span", { text: p.title }));
    list.appendChild(row);
  });

  selectAllBtn.onclick = () => checks.forEach((c) => { c.checked = true; });
  clearBtn.onclick = () => checks.forEach((c) => { c.checked = false; });

  const footer = document.querySelector("#sectionPickerOverlay .modal-foot");
  footer.innerHTML = "";

  function getSelectedKeys() {
    const selectedKeys = checks.filter((c) => c.checked).map((c) => c.value);
    if (!selectedKeys.length) { showToast("অন্তত একটি অংশ বেছে নিন"); return null; }
    return selectedKeys;
  }

  if (isBlankFormatMode) {
    const pdfBtn = el("button", { class: "btn btn-secondary", text: "📄 Blank PDF", style: "width:100%;margin-bottom:8px;" });
    const wordBtn = el("button", { class: "btn btn-primary", text: "📝 Blank Word", style: "width:100%;" });
    pdfBtn.onclick = () => {
      const keys = getSelectedKeys();
      if (!keys) return;
      document.getElementById("sectionPickerOverlay").classList.remove("show");
      exportBlankFormat("pdf", keys);
    };
    wordBtn.onclick = () => {
      const keys = getSelectedKeys();
      if (!keys) return;
      document.getElementById("sectionPickerOverlay").classList.remove("show");
      exportBlankFormat("word", keys);
    };
    footer.appendChild(pdfBtn);
    footer.appendChild(wordBtn);
  } else {
    const downloadBtn = el("button", { class: "btn btn-primary", text: "নির্বাচিত অংশ ডাউনলোড করুন", style: "width:100%;" });
    downloadBtn.onclick = () => {
      const keys = getSelectedKeys();
      if (!keys) return;
      document.getElementById("sectionPickerOverlay").classList.remove("show");
      runPendingExport(keys);
    };
    footer.appendChild(downloadBtn);
  }
}

document.getElementById("indexBtn").onclick = () => { openSection = "index"; render(); window.scrollTo(0, 0); };
document.getElementById("pdfBtn").onclick = () => openPrintChoice("pdf");
document.getElementById("wordBtn").onclick = () => openPrintChoice("word");
document.getElementById("blankFormatBtn").onclick = () => openBlankFormatPicker();
document.getElementById("printFullBtn").onclick = () => {
  document.getElementById("printChoiceOverlay").classList.remove("show");
  runPendingExport(null);
};
document.getElementById("printSelectBtn").onclick = () => {
  document.getElementById("printChoiceOverlay").classList.remove("show");
  isBlankFormatMode = false;
  renderSectionPicker();
  document.getElementById("sectionPickerOverlay").classList.add("show");
};
document.getElementById("sectionPickerCloseBtn").onclick = () => document.getElementById("sectionPickerOverlay").classList.remove("show");
document.getElementById("legalSummaryCloseBtn").onclick = () => document.getElementById("legalSummaryOverlay").classList.remove("show");

loadState();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
