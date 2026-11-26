/* Hearth Ledger charts — small hand-built SVG charts, no libraries.
   donutChart(parts) takes [{label, value, color}] and returns an SVG
   donut plus a legend. monthBars(rows) takes [{label, income, spent}]
   and returns a grouped bar chart. */

function donutChart(parts, size) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 70, cx = 90, cy = 90, circ = 2 * Math.PI * r;
  let offset = 0;
  const rings = parts.map((p) => {
    const frac = p.value / total;
    const len = Math.max(frac * circ - 2, 0);
    const ring = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' +
      p.color + '" stroke-width="30" stroke-dasharray="' + len.toFixed(1) + ' ' +
      (circ - len).toFixed(1) + '" stroke-dashoffset="' + (-offset).toFixed(1) + '" />';
    offset += frac * circ;
    return ring;
  }).join("");
  const legend = parts.map((p) =>
    '<li><span><span class="dot" style="background:' + p.color + '"></span>' + p.label +
    '</span><span class="amt">' + money(p.value) + ' · ' +
    Math.round((p.value / total) * 100) + '%</span></li>').join("");
  return '<div class="donut-wrap">' +
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 180 180" role="img" aria-label="Spending by category">' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#eee7d6" stroke-width="30" />' +
    rings +
    '<text x="90" y="86" text-anchor="middle" font-size="15" font-weight="700" fill="#22312a">' +
    money(total) + '</text>' +
    '<text x="90" y="104" text-anchor="middle" font-size="11" fill="#5a6a61">spent</text>' +
    '</svg><ul class="legend">' + legend + '</ul></div>';
}

function monthBars(rows) {
  const max = Math.max.apply(null, rows.map((r) => Math.max(r.income, r.spent)).concat([1]));
  const cols = rows.map((r) => {
    const inH = Math.max(Math.round((r.income / max) * 140), 2);
    const outH = Math.max(Math.round((r.spent / max) * 140), 2);
    return '<div class="col"><div class="pair">' +
      '<div class="b in" style="height:' + inH + 'px" title="Income ' + money(r.income) + '"></div>' +
      '<div class="b out" style="height:' + outH + 'px" title="Spent ' + money(r.spent) + '"></div>' +
      '</div><div class="m">' + r.label + '</div></div>';
  }).join("");
  return '<div class="chart-bars" role="img" aria-label="Income and spending by month">' + cols + '</div>' +
    '<div class="chart-key"><span><span class="key-swatch" style="background:#2f6b4f"></span>Income</span>' +
    '<span><span class="key-swatch" style="background:#c05f33"></span>Spent</span></div>';
}
