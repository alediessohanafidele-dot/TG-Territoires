"use strict";
const VERT = "#0F6B4B", INK = "#12241C";
const SCALE = [[0, "#EAF4EF"], [.5, "#9AD0B5"], [1, VERT]];
const GREENS = [VERT, "#34A07A", "#7CC8A3", "#B5DCC8", "#4D6B5E", "#9DB3A9"];
const CFG = {responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"]};
const BASE = {paper_bgcolor: "#fff", plot_bgcolor: "#fff", colorway: GREENS,
  font: {family: "Inter,Segoe UI,system-ui,sans-serif", color: INK, size: 12}, margin: {l: 64, r: 14, t: 10, b: 54}};
const $ = s => document.querySelector(s);
const n0 = x => Math.round(x).toLocaleString("fr-FR");
const n1 = (x, d = 1) => x.toLocaleString("fr-FR", {minimumFractionDigits: d, maximumFractionDigits: d});
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const mm = a => { const lo = Math.min(...a), hi = Math.max(...a); return a.map(v => hi > lo ? (v - lo) / (hi - lo) * 100 : 0); };
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const by = (rows, f) => { const m = new Map(); rows.forEach(r => { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };
const plot = (id, data, layout = {}) => Plotly.react(id, data, {...BASE, ...layout}, CFG);
const W = {e: 35, a: 30, c: 20, i: 15};
let DB, GEO, REGIONS, SEL, ROWS, UNITS, UMAP, PAGE = "profil";

function kpis(id, items) {
  $(id).innerHTML = items.map(([l, v, s]) => `<div class="kpi"><span>${l}</span><b>${v}</b>${s ? `<em>${s}</em>` : ""}</div>`).join("");
}

function scoring() {
  const C = DB.communes, ws = [W.e, W.a, W.c, W.i], t = ws.reduce((a, b) => a + b, 0) || 1;
  C.forEach(c => c.indice = c.comp.reduce((s, v, i) => s + v * ws[i], 0) / t);
  [...C].sort((a, b) => b.indice - a.indice).forEach((c, i) => { c.rang = i + 1; c.classe = i < 10 ? "Priorité 1" : i < 30 ? "Priorité 2" : "Suivi"; });
}

function units(rows) {
  const m = new Map();
  rows.forEach(c => {
    let u = m.get(c.cle_2010);
    if (!u) { u = {cle: c.cle_2010, label: DB.labels[c.cle_2010] || c.cle_2010, region: c.region, pop22: 0, pop10: 0, ag: 0, e: 0, n: 0, ind: 0}; m.set(c.cle_2010, u); }
    u.pop22 += c.pop_2022; u.pop10 += c.pop_2010_est; u.ag += c.agences; u.e += c.taux_elec_est; u.n++; u.ind += c.indice;
  });
  return [...m.values()].map(u => ({...u, elec: u.e / u.n, indice: u.ind / u.n,
    tcam: ((u.pop22 / u.pop10) ** (1 / 12) - 1) * 100, croiss: (u.pop22 / u.pop10 - 1) * 100, ag100k: u.ag / u.pop22 * 1e5}));
}

function carte(el, key, title, fmt) {
  const rows = DB.polys.map(p => ({p, u: UMAP[p.cle]})).filter(r => r.u);
  const z = rows.map(r => r.u[key]), s = [...z].sort((a, b) => a - b);
  const zmax = s[Math.floor(.92 * (s.length - 1))];
  plot(el, [{type: "choroplethmap", geojson: GEO, locations: rows.map(r => r.p.poly), featureidkey: "properties.shapeName",
    z, zmin: s[0], zmax: zmax > s[0] ? zmax : undefined, colorscale: SCALE, marker: {line: {color: "#fff", width: 1}},
    text: rows.map(r => r.u.label), hovertemplate: `<b>%{text}</b><br>${title} : %{z:${fmt}}<extra></extra>`,
    colorbar: {title: {text: title, side: "right"}, thickness: 12, len: .8}}],
    {map: {style: "white-bg", center: {lat: 8.65, lon: 0.98}, zoom: 6.1}, margin: {l: 0, r: 0, t: 0, b: 0}});
}

function vbar(el, labels, vals, name, color = VERT, extra = {}) {
  // diagramme en barres verticales, de la plus grande valeur (à gauche) à la plus petite
  const L = [...labels].reverse(), V = [...vals].reverse(), K = Array.isArray(color) ? [...color].reverse() : color;
  plot(el, [{type: "bar", x: L, y: V, marker: {color: K}, hovertemplate: "<b>%{x}</b><br>%{y:,.1f}<extra></extra>"}],
    {yaxis: {title: name, gridcolor: "#EEF3F0"}, xaxis: {automargin: true, tickangle: -40, categoryorder: "array", categoryarray: L},
     margin: {l: 64, r: 10, t: 10, b: 110}, ...extra});
}

// ------------------------------------------------------------------ pages
function profil() {
  const pop = sum(ROWS, c => c.pop_2022), gl = sum(ROWS.filter(c => c.region === "Grand Lomé"), c => c.pop_2022);
  kpis("#k-profil", [["Population 2022", n0(pop)], ["Communes", ROWS.length], ["Commune médiane", n0(median(ROWS.map(c => c.pop_2022)))],
    ["Part des femmes", n1(sum(ROWS, c => c.femmes_2022) / pop * 100) + " %"], ["Poids du Grand Lomé", n0(gl / pop * 100) + " %"]]);
  carte("m-profil", "pop22", "Population 2022", ",.0f");
  const r = [...by(ROWS, c => c.region)].map(([k, v]) => [k, sum(v, c => c.pop_2022)]).sort((a, b) => a[1] - b[1]);
  vbar("b-profil-region", r.map(x => x[0]), r.map(x => x[1]), "Habitants");
  const ids = [], lab = [], par = [], val = [];
  by(ROWS, c => c.region).forEach((rv, rn) => {
    ids.push(rn); lab.push(rn); par.push(""); val.push(sum(rv, c => c.pop_2022));
    by(rv, c => c.prefecture).forEach((pv, pn) => {
      ids.push(rn + "/" + pn); lab.push(pn); par.push(rn); val.push(sum(pv, c => c.pop_2022));
      pv.forEach(c => { ids.push(rn + "/" + pn + "/" + c.commune); lab.push(c.commune); par.push(rn + "/" + pn); val.push(c.pop_2022); });
    });
  });
  plot("t-profil", [{type: "treemap", ids, labels: lab, parents: par, values: val, branchvalues: "total", maxdepth: 3,
    marker: {colorscale: SCALE, colors: val, line: {color: "#fff"}}, hovertemplate: "<b>%{label}</b><br>%{value:,.0f} hab.<extra></extra>"}],
    {margin: {l: 0, r: 0, t: 0, b: 0}});
  const regs = [...new Set(ROWS.map(c => c.region))];
  plot("s-profil", regs.map((g, i) => { const v = ROWS.filter(c => c.region === g);
    return {type: "scatter", mode: "markers", name: g, x: v.map(c => c.pop_2022), y: v.map(c => c.rapport_masculinite), text: v.map(c => c.commune),
      marker: {color: GREENS[i % 6], size: 9, opacity: .85}, hovertemplate: "<b>%{text}</b><br>%{x:,.0f} hab. · %{y:.1f}<extra></extra>"}; }),
    {xaxis: {type: "log", title: "Population (échelle log)", gridcolor: "#EEF3F0"}, yaxis: {title: "Hommes pour 100 femmes", gridcolor: "#EEF3F0"}, legend: {orientation: "h", y: -.25}});
  profilTop();
}
function profilTop() {
  const n = +$("#n-top").value; $("#v-ntop").textContent = n;
  const t = [...ROWS].sort((a, b) => b.pop_2022 - a.pop_2022).slice(0, n).reverse();
  vbar("b-profil-top", t.map(c => c.commune), t.map(c => c.pop_2022), "Habitants");
}

function evolution() {
  const p22 = sum(UNITS, u => u.pop22), p10 = sum(UNITS, u => u.pop10);
  kpis("#k-evo", [["Population 2010 (estimée)", n0(p10)], ["Population 2022", n0(p22)], ["Croissance 2010-2022", n1((p22 / p10 - 1) * 100) + " %"],
    ["Croissance annuelle moyenne", n1(((p22 / p10) ** (1 / 12) - 1) * 100, 2) + " %"]]);
  const key = document.querySelector("input[name=evo]:checked").value;
  carte("m-evo", key, key === "tcam" ? "TCAM (%)" : "Croissance (%)", ".2f");
  const t = [...UNITS].sort((a, b) => a.tcam - b.tcam).slice(-15);
  vbar("b-evo-top", t.map(u => u.label), t.map(u => u.tcam), "TCAM (%)");
  const g = [...UNITS].sort((a, b) => b.pop22 - a.pop22).slice(0, 20), x = g.map(u => u.label);
  plot("b-evo-cmp", [{type: "bar", name: "2010 (estimée)", x, y: g.map(u => u.pop10), marker: {color: "#A8D5BA"}},
    {type: "bar", name: "2022", x, y: g.map(u => u.pop22), marker: {color: VERT}}],
    {barmode: "group", yaxis: {title: "Habitants", gridcolor: "#EEF3F0"}, legend: {orientation: "h", y: 1.1}, margin: {l: 60, r: 10, t: 10, b: 110}});
}

function table(el, head, rows) {
  $(el).innerHTML = `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r =>
    `<tr>${r.map(v => `<td class="${typeof v === "number" || /^[\d\s,.%]+$/.test(v) ? "n" : ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function electricite() {
  const pop = sum(ROWS, c => c.pop_2022), sans = ROWS.filter(c => c.agences === 0);
  kpis("#k-elec", [["Accès moyen (pondéré)", n1(sum(ROWS, c => c.taux_elec_est * c.pop_2022) / pop) + " %"],
    ["Agences CEET", n0(sum(ROWS, c => c.nb_ceet))], ["Agences TdE", n0(sum(ROWS, c => c.nb_tde))],
    ["Communes sans agence", `${sans.length} / ${ROWS.length}`, n0(sum(sans, c => c.pop_2022) / pop * 100) + " % de la population"]]);
  carte("m-elec", "ag100k", "Agences / 100 000 hab.", ".2f");
  const r = [...by(ROWS, c => c.region)].map(([k, v]) => ({k, e: v[0].taux_elec_region, ceet: sum(v, c => c.nb_ceet), tde: sum(v, c => c.nb_tde)}));
  const s = [...r].sort((a, b) => a.e - b.e);
  vbar("b-elec-reg", s.map(x => x.k), s.map(x => x.e), "Accès (%)", VERT, {margin: {l: 64, r: 10, t: 6, b: 70}});
  plot("b-elec-ag", [{type: "bar", name: "CEET", x: r.map(x => x.k), y: r.map(x => x.ceet), marker: {color: VERT}},
    {type: "bar", name: "TdE", x: r.map(x => x.k), y: r.map(x => x.tde), marker: {color: "#9AD0B5"}}],
    {barmode: "group", legend: {orientation: "h", y: 1.25}, yaxis: {gridcolor: "#EEF3F0"}, margin: {l: 40, r: 10, t: 6, b: 40}});
  table("#tb-elec", ["Région", "Préfecture", "Commune", "Population", "Accès élec. estimé (%)"],
    [...sans].sort((a, b) => b.pop_2022 - a.pop_2022).map(c => [c.region, c.prefecture, c.commune, n0(c.pop_2022), n1(c.taux_elec_est)]));
}

function civil() {
  const N = DB.naissances, I = Object.fromEntries(DB.identite.map(r => [r.indicateur, r]));
  const d = N[N.length - 1].taux_enregistrement_pct - N[0].taux_enregistrement_pct;
  kpis("#k-civil", [[`Naissances enregistrées (${N[N.length - 1].annee})`, n1(N[N.length - 1].taux_enregistrement_pct) + " %", `${d >= 0 ? "+" : ""}${n1(d)} pt depuis ${N[0].annee}`],
    ["CNI produites (2022)", n0(I.CNI.total)], ["Passeports (2022)", n0(I.Passeports.total)],
    ["Part des femmes (CNI)", n0(I.CNI.femmes / I.CNI.total * 100) + " %", `passeports : ${n0(I.Passeports.femmes / I.Passeports.total * 100)} %`]]);
  plot("l-naiss", [{type: "scatter", mode: "lines+markers", x: N.map(r => r.annee), y: N.map(r => r.taux_enregistrement_pct), text: N.map(r => r.source),
    line: {color: VERT, width: 3}, marker: {size: 9}, hovertemplate: "%{x} : %{y} %<br>%{text}<extra></extra>"}],
    {yaxis: {range: [60, 100], title: "Naissances enregistrées (%)", gridcolor: "#EEF3F0"}, xaxis: {title: "Année", dtick: 2}});
  const x = DB.identite.map(r => r.indicateur);
  plot("b-ident", [{type: "bar", name: "Hommes", x, y: DB.identite.map(r => r.hommes), marker: {color: VERT}},
    {type: "bar", name: "Femmes", x, y: DB.identite.map(r => r.femmes), marker: {color: "#9AD0B5"}}],
    {barmode: "group", yaxis: {gridcolor: "#EEF3F0"}, legend: {orientation: "h", y: 1.1}});
  const regs = [...new Set(ROWS.map(c => c.region))];
  plot("s-cni", regs.map(g => { const v = ROWS.filter(c => c.region === g);
    return {type: "scatter", mode: "markers", name: g, x: v.map(c => c.pop_2022), y: v.map(c => c.taux_cni_est), text: v.map(c => c.commune),
      marker: {color: GREENS[REGIONS.indexOf(g) % 6], size: 9, opacity: .85}, hovertemplate: "<b>%{text}</b><br>%{x:,.0f} hab. · %{y:.1f} CNI / 100 hab.<extra></extra>"}; }),
    {xaxis: {type: "log", title: "Population (échelle log)", gridcolor: "#EEF3F0"}, yaxis: {title: "CNI estimées pour 100 habitants", gridcolor: "#EEF3F0"}});
}

function priorites() {
  scoring(); ROWS = DB.communes.filter(c => SEL.has(c.region)); UNITS = units(ROWS); UMAP = Object.fromEntries(UNITS.map(u => [u.cle, u]));
  carte("m-prio", "indice", "Indice de besoin", ".1f");
  const n = +$("#n-prio").value; $("#v-nprio").textContent = n;
  const t = [...ROWS].sort((a, b) => a.rang - b.rang).slice(0, n).reverse();
  vbar("b-prio", t.map(c => c.commune), t.map(c => c.indice), "Indice (0-100)");
  prioTable();
  const p1 = ROWS.filter(c => c.classe === "Priorité 1"), rg = [...by(ROWS, c => c.region)].map(([k, v]) => [k, v[0].taux_elec_region]).sort((a, b) => a[1] - b[1])[0];
  $("#reco").innerHTML = [
    `<b>Cibler en premier les ${p1.length} communes « Priorité 1 »</b> (${n0(sum(p1, c => c.pop_2022))} habitants) : ouverture ou renforcement d'agences CEET/TdE et de guichets d'état civil.`,
    `<b>Déployer des services légers et mobiles</b> (agences mobiles, paiement et recharge numériques, guichets uniques) dans les communes sans agence mais à forte croissance.`,
    rg ? `<b>Accélérer l'électrification</b> de la région au plus faible taux d'accès dans la sélection : <b>${rg[0]}</b> (${n1(rg[1])} %).` : "",
    `<b>Rapprocher l'état civil des populations</b> : l'enregistrement des naissances stagne autour de 78 % depuis 2006 ; réduire aussi l'écart femmes/hommes sur les CNI.`,
    `<b>Suivre ces indicateurs chaque année</b> avec des données communales réelles pour remplacer les estimations utilisées ici.`].filter(Boolean).map(s => `<li>${s}</li>`).join("");
}
let PT = [];
function prioTable() {
  const q = $("#q-prio").value.trim().toLowerCase();
  PT = ROWS.filter(c => !q || (c.commune + " " + c.prefecture + " " + c.region).toLowerCase().includes(q)).sort((a, b) => a.rang - b.rang);
  table("#tb-prio", ["Rang", "Classe", "Région", "Préfecture", "Commune", "Population", "Élec. %", "Agences", "TCAM %", "CNI /100", "Indice"],
    PT.map(c => [c.rang, `<span class="tag ${c.classe === "Priorité 1" ? "p1" : ""}">${c.classe}</span>`, c.region, c.prefecture, c.commune,
      n0(c.pop_2022), n1(c.taux_elec_est), c.agences, n1(c.tcam_pct, 2), n1(c.taux_cni_est), n1(c.indice)]));
}

// ------------------------------------------------------------------ navigation et filtres
const RENDER = {profil, evolution, electricite, "etat-civil": civil, priorites};
function refresh() {
  ROWS = DB.communes.filter(c => SEL.has(c.region)); UNITS = units(ROWS); UMAP = Object.fromEntries(UNITS.map(u => [u.cle, u]));
  if (RENDER[PAGE]) RENDER[PAGE]();
}
function show() {
  PAGE = location.hash.slice(1) || "profil";
  if (!document.getElementById(PAGE)) PAGE = "profil";
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("show", p.id === PAGE));
  document.querySelectorAll("#menu a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + PAGE));
  window.scrollTo(0, 0); refresh();
}
function chips() {
  $("#chips").innerHTML = ["Toutes", ...REGIONS].map(r => `<button class="chip" data-r="${r}">${r}</button>`).join("");
  const paint = () => document.querySelectorAll(".chip").forEach(b => b.classList.toggle("on", b.dataset.r === "Toutes" ? SEL.size === REGIONS.length : SEL.has(b.dataset.r)));
  $("#chips").onclick = e => {
    const r = e.target.dataset && e.target.dataset.r; if (!r) return;
    if (r === "Toutes") SEL = new Set(REGIONS);
    else if (SEL.size === REGIONS.length) SEL = new Set([r]);
    else { SEL.has(r) ? SEL.delete(r) : SEL.add(r); if (!SEL.size) SEL = new Set(REGIONS); }
    paint(); refresh();
  };
  paint();
}
async function init() {
  [DB, GEO] = await Promise.all([fetch("/api/data").then(r => r.json()), fetch("/api/geojson").then(r => r.json())]);
  const C = DB.communes, mx = Math.max(...C.map(c => c.taux_cni_est));
  C.forEach(c => { c.agences = c.nb_ceet + c.nb_tde; c.ppa = c.pop_2022 / (1 + c.agences); });
  const cols = [mm(C.map(c => 100 - c.taux_elec_est)), mm(C.map(c => c.ppa)), mm(C.map(c => c.tcam_pct)), mm(C.map(c => mx - c.taux_cni_est))];
  C.forEach((c, i) => c.comp = cols.map(k => k[i]));
  scoring();
  REGIONS = [...new Set(C.map(c => c.region))].sort(); SEL = new Set(REGIONS);
  chips();
  $("#n-top").oninput = profilTop;
  document.querySelectorAll("input[name=evo]").forEach(r => r.onchange = evolution);
  ["e", "a", "c", "i"].forEach(k => $("#w-" + k).oninput = ev => { W[k] = +ev.target.value; $("#v-" + k).textContent = W[k]; priorites(); });
  $("#n-prio").oninput = priorites; $("#q-prio").oninput = prioTable;
  $("#dl-prio").onclick = () => {
    const h = ["rang", "classe", "region", "prefecture", "commune", "population", "elec_pct", "agences", "tcam_pct", "cni_pour_100", "indice"];
    const csv = [h.join(";"), ...PT.map(c => [c.rang, c.classe, c.region, c.prefecture, c.commune, c.pop_2022, c.taux_elec_est, c.agences, c.tcam_pct, c.taux_cni_est, c.indice.toFixed(2)].join(";"))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], {type: "text/csv"})); a.download = "classement_communes.csv"; a.click();
  };
  window.addEventListener("hashchange", show); show();
}
init();
