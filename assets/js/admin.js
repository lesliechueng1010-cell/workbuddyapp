/* =========================================================
 * 云峰水果大卖场 · 商家管理后台
 * ========================================================= */
(function () {
  const S = YF.store;
  const sideEl = document.getElementById('side');
  const mainEl = document.getElementById('main');
  const titleEl = document.getElementById('pageTitle');
  const subEl = document.getElementById('pageSub');
  const modalEl = document.getElementById('adminModal');
  const toastEl = document.getElementById('adminToast');

  const UI = { page: 'dash', kw: '', cat: 'all', status: 'all', ordStatus: 'all' };

  const NAV = [
    { grp: '经营', items: [
      { k: 'dash', i: '📊', t: '经营概览' },
      { k: 'sales', i: '📈', t: '销售盘点' },
      { k: 'recon', i: '🧮', t: '自动对账' }
    ]},
    { grp: '业务', items: [
      { k: 'orders', i: '📋', t: '订单管理' },
      { k: 'gbuy', i: '🔥', t: '拼团管理' },
      { k: 'bulk', i: '🏢', t: '企业采购审核' },
      { k: 'after', i: '🔧', t: '售后处理' }
    ]},
    { grp: '商品', items: [
      { k: 'intake', i: '📷', t: '智能入库' },
      { k: 'products', i: '🍎', t: '商品管理' },
      { k: 'stock', i: '📦', t: '库存盘点' }
    ]},
    { grp: '客户', items: [
      { k: 'members', i: '👥', t: '会员管理' },
      { k: 'recharge', i: '💳', t: '充值与余额' }
    ]},
    { grp: '设置', items: [
      { k: 'shop', i: '🏪', t: '门店设置' }
    ]}
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg) {
    toastEl.innerHTML = '<div class="admin-toast">' + esc(msg) + '</div>';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastEl.innerHTML = ''; }, 2000);
  }
  function modal(title, bodyHTML, okText, onOk) {
    modalEl.innerHTML =
      '<div class="modal-mask" data-mask="1"><div class="modal-box" data-stop="1">' +
      '<div class="mb-head"><span>' + esc(title) + '</span><button class="x" data-mclose="1">✕</button></div>' +
      '<div class="mb-body">' + bodyHTML + '</div>' +
      '<div class="mb-foot"><button class="mini" data-mclose="1" style="height:34px;padding:0 16px">取消</button>' +
      (okText ? '<button class="mini primary" id="mOk" style="height:34px;padding:0 16px">' + esc(okText) + '</button>' : '') +
      '</div></div></div>';
    modalEl.querySelector('[data-stop]').addEventListener('click', e => e.stopPropagation());
    modalEl.querySelector('[data-mask]').addEventListener('click', e => { if (e.target.hasAttribute('data-mask')) modalEl.innerHTML = ''; });
    modalEl.querySelectorAll('[data-mclose]').forEach(b => b.onclick = () => { modalEl.innerHTML = ''; });
    if (okText) document.getElementById('mOk').onclick = () => onOk && onOk();
  }
  const st = () => S.get();
  const prod = id => st().products.find(p => p.id === id);
  const ord = id => st().orders.find(o => o.id === id);
  const catName = id => (YF.CATEGORIES.find(c => c.id === id) || { name: '-' }).name;
  const statusChip = s => '<span class="chip" style="background:' + YF.STATUS[s].color + '18;color:' + YF.STATUS[s].color + '">' + YF.STATUS[s].label + '</span>';

  /* ---------- 图表 ---------- */
  function barChart(items) {
    const max = Math.max.apply(null, items.map(i => i.v)) || 1;
    return '<div class="bars">' + items.map(i =>
      '<div class="b"><span class="v">' + i.v + '</span>' +
      '<div class="bar" style="height:' + Math.max(3, i.v / max * 130) + 'px" title="' + i.k + ' ' + i.v + '"></div>' +
      '<span class="lb">' + i.k + '</span></div>').join('') + '</div>';
  }
  function lineChart(values, labels, color) {
    const w = 640, h = 200, pad = 30;
    const max = Math.max.apply(null, values) * 1.15 || 1;
    const min = Math.min.apply(null, values) * 0.8;
    const pts = values.map((v, i) => {
      const x = pad + i * (w - pad * 2) / Math.max(1, values.length - 1);
      const y = h - pad - (v - min) / (max - min || 1) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = pts[0][0].toFixed(1) + ',' + (h - pad) + ' ' + line + ' ' + pts[pts.length - 1][0].toFixed(1) + ',' + (h - pad);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:200px">' +
      '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (color || '#21A05C') + '" stop-opacity=".28"/>' +
      '<stop offset="100%" stop-color="' + (color || '#21A05C') + '" stop-opacity="0"/></linearGradient></defs>' +
      '<polygon points="' + area + '" fill="url(#lg)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="' + (color || '#21A05C') + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      pts.map((p, i) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="#fff" stroke="' + (color || '#21A05C') + '" stroke-width="2"/>').join('') +
      labels.map((l, i) => {
        if (values.length > 8 && i % 2) return '';
        return '<text x="' + pts[i][0].toFixed(1) + '" y="' + (h - 8) + '" font-size="10" fill="#8A8F98" text-anchor="middle">' + l + '</text>';
      }).join('') +
      '</svg>';
  }
  function stackedBar(rows) {
    const max = Math.max.apply(null, rows.map(r => r.total)) || 1;
    return '<div style="display:flex;flex-direction:column;gap:8px">' + rows.map(r =>
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<span style="width:44px;font-size:11px;color:#8A8F98">' + r.k + '</span>' +
      '<div style="flex:1;display:flex;height:16px;border-radius:4px;overflow:hidden;background:#F0F2F1">' +
      '<i style="width:' + (r.takeaway / max * 100) + '%;background:#FF7A2F"></i>' +
      '<i style="width:' + (r.group / max * 100) + '%;background:#21A05C"></i>' +
      '<i style="width:' + (r.bulk / max * 100) + '%;background:#3D7EFF"></i>' +
      '</div><span style="width:74px;text-align:right;font-size:11px;font-weight:600">' + YF.money0(r.total) + '</span></div>').join('') + '</div>';
  }

  /* ---------- 概览 ---------- */
  function pageDash() {
    st();
    const s = S.stats();
    const days = st().dayStats;
    const prev = days[days.length - 2].sales;
    const growth = ((s.todaySales - prev) / prev * 100).toFixed(1);
    const modeRows = days.slice(-7).map(d => ({ k: d.date, takeaway: d.takeaway, group: d.group, bulk: d.bulk, total: d.takeaway + d.group + d.bulk }));

    return '<div class="kpi-grid">' +
      kpi('💰', '今日销售额', YF.money0(s.todaySales), '较昨日 ' + (growth >= 0 ? '+' : '') + growth + '%', growth >= 0) +
      kpi('🧾', '今日订单', s.todayOrders + ' 单', '客单价 ' + YF.money(s.todaySales / s.todayOrders), true) +
      kpi('👥', '会员总数', s.memberCount.toLocaleString(), '会员卡沉淀余额 ' + YF.money(s.balanceLiability), true) +
      kpi('📦', '库存货值', YF.money0(s.stockValue), s.lowStock.length + ' 个商品低于安全库存', false) +
      kpi('⏳', '待处理订单', s.pendingOrders.length + ' 笔', '含 ' + s.pendingOrders.filter(o => o.status === 'auditing').length + ' 笔企采待审核', false) +
      kpi('🔧', '待处理售后', s.pendingRefund.length + ' 笔', '48 小时内必须处理完成', false) +
      '</div>' +

      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>快捷操作</h3></div>' +
      '<div class="panel-body" style="display:flex;gap:12px;flex-wrap:wrap">' +
      [['📷', '拍照入库', '上传入库单照片，自动识别后一键入库', 'intake'],
       ['🍎', '商品管理', '上架下架、调整三档价格', 'products'],
       ['📦', '库存盘点', '查看预警与出入库流水', 'stock'],
       ['🧮', '执行对账', '订单与资金流水自动勾稽', 'recon'],
       ['🔥', '拼团管理', '发起拼团、查看成团进度', 'gbuy'],
       ['🏪', '门店设置', '门店名称、地址、公告与配送范围', 'shop']].map(q =>
        '<div data-page="' + q[3] + '" style="flex:1;min-width:170px;border:1.5px solid #ECEFF1;border-radius:12px;padding:14px;cursor:pointer;transition:.18s" ' +
        'onmouseover="this.style.borderColor=\'#21A05C\'" onmouseout="this.style.borderColor=\'#ECEFF1\'">' +
        '<div style="font-size:24px">' + q[0] + '</div>' +
        '<div style="font-size:14px;font-weight:700;margin-top:4px">' + q[1] + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">' + q[2] + '</div></div>').join('') +
      '</div></div>' +

      (s.lowStock.length ? '<div class="warn" style="margin-top:16px">⚠️ 库存预警：' +
        s.lowStock.slice(0, 5).map(p => p.emoji + ' ' + p.name + '（剩 ' + p.stock + '）').join('、') +
        (s.lowStock.length > 5 ? ' 等 ' + s.lowStock.length + ' 个商品' : '') + '，请及时补货</div>' : '') +

      '<div class="grid-2" style="margin-top:16px">' +
      '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>近 14 天销售趋势</h3><span style="font-size:11px;color:#8A8F98">单位：元</span></div>' +
      '<div class="panel-body">' + lineChart(days.map(d => d.sales), days.map(d => d.date)) + '</div></div>' +

      '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>近 7 天业务模式构成</h3></div>' +
      '<div class="panel-body">' + stackedBar(modeRows) +
      '<div class="legend"><span><i style="background:#FF7A2F"></i>外卖到家</span>' +
      '<span><i style="background:#21A05C"></i>社区团购</span>' +
      '<span><i style="background:#3D7EFF"></i>企业采购</span></div></div></div>' +
      '</div>' +

      '<div class="panel"><div class="panel-head"><h3>待办事项</h3><span style="font-size:11px;color:#8A8F98">点击直接处理</span></div>' +
      '<div class="panel-body" style="padding:0">' +
      todo('⏳', '待接单 / 待付款订单', s.pendingOrders.filter(o => o.status === 'accepted' || o.status === 'unpaid').length + ' 笔', 'orders') +
      todo('🏢', '企业采购单待审核', s.pendingOrders.filter(o => o.status === 'auditing').length + ' 笔', 'bulk') +
      todo('🔧', '售后退款待处理', s.pendingRefund.length + ' 笔', 'after') +
      todo('📦', '库存低于安全线', s.lowStock.length + ' 个商品', 'stock') +
      '</div></div>';
  }
  function kpi(icon, label, value, delta, up) {
    return '<div class="kpi"><div class="kl">' + icon + ' ' + label + '</div>' +
      '<div class="kv">' + value + '</div>' +
      '<div class="kd ' + (up ? 'up' : 'down') + '">' + esc(delta) + '</div></div>';
  }
  function todo(icon, text, cnt, page) {
    return '<div class="row" data-page="' + page + '" style="cursor:pointer">' +
      '<span style="font-size:18px">' + icon + '</span>' +
      '<div class="grow"><div class="rt">' + text + '</div></div>' +
      '<span class="chip ' + (cnt === '0' ? 'gray' : 'orange') + '">' + cnt + '</span>' +
      '<span class="arrow">›</span></div>';
  }

  /* ---------- 商品管理 ---------- */
  function pageProducts() {
    let list = st().products.slice();
    if (UI.cat !== 'all') list = list.filter(p => p.cats.includes(UI.cat));
    if (UI.status === 'on') list = list.filter(p => p.on);
    if (UI.status === 'off') list = list.filter(p => !p.on);
    if (UI.kw) list = list.filter(p => p.name.includes(UI.kw) || p.spec.includes(UI.kw));
    if (UI.cat === 'all') list.sort((a, b) => b.sales - a.sales);

    return '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>商品管理（' + list.length + ' / ' + st().products.length + '）</h3>' +
      '<div class="toolbar">' +
      '<input id="pkw" placeholder="搜索商品名 / 规格" value="' + esc(UI.kw) + '">' +
      '<select id="pcat">' + '<option value="all"' + (UI.cat === 'all' ? ' selected' : '') + '>全部分类</option>' +
      YF.CATEGORIES.map(c => '<option value="' + c.id + '"' + (UI.cat === c.id ? ' selected' : '') + '>' + c.name + '</option>').join('') + '</select>' +
      '<select id="pst">' + [['all', '全部状态'], ['on', '已上架'], ['off', '已下架']].map(([v, n]) =>
        '<option value="' + v + '"' + (UI.status === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>' +
      '<button class="mini primary" id="addProd">+ 新增商品</button>' +
      '</div></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto">' +
      '<table class="tbl"><thead><tr>' +
      '<th>商品</th><th>分类</th><th>规格</th><th class="num">零售价</th><th class="num">团购价</th><th class="num">批发价</th>' +
      '<th class="num">进价</th><th class="num">毛利率</th>' +
      '<th class="num">库存</th><th class="num">销量</th><th>上架</th><th>操作</th></tr></thead><tbody>' +
      list.map(p =>
        '<tr><td><span style="font-size:18px">' + p.emoji + '</span> ' + esc(p.name) + '</td>' +
        '<td>' + p.cats.map(catName).join('/') + '</td>' +
        '<td style="color:#8A8F98">' + esc(p.spec) + '</td>' +
        '<td class="num">¥' + p.retail.toFixed(2) + '</td>' +
        '<td class="num">¥' + p.group.toFixed(2) + '</td>' +
        '<td class="num">¥' + p.bulk[0].price.toFixed(2) + (p.bulk.length > 1 ? ' <span class="chip">阶梯</span>' : '') + '</td>' +
        '<td class="num" style="color:#8A8F98">¥' + (p.cost == null ? '-' : p.cost.toFixed(2)) + '</td>' +
        '<td class="num" style="color:' + ((p.retail - p.cost) / p.retail >= 0.35 ? '#21A05C' : '#D9A441') + ';font-weight:600">' +
        (((p.retail - p.cost) / p.retail) * 100).toFixed(0) + '%</td>' +
        '<td class="num" style="color:' + (p.stock <= 60 ? '#E54545;font-weight:700' : '') + '">' + p.stock + '</td>' +
        '<td class="num">' + p.sales + '</td>' +
        '<td><div class="switch ' + (p.on ? 'on' : '') + '" data-toggle="' + p.id + '"><i></i></div></td>' +
        '<td><div class="tbl-act">' +
        '<button class="mini" data-edit="' + p.id + '">改价</button>' +
        '<button class="mini" data-stock="' + p.id + '">调库存</button>' +
        '</div></td></tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="ok" style="margin-top:14px">💡 三种价格分别对应三种业务模式：外卖（零售）、团购（团购价）、企业采购（阶梯批发价）。下架后顾客端不可见。</div>';
  }

  /* ---------- 门店设置（两端共用同一份数据） ---------- */
  function mfRow(label, id, val) {
    return '<div class="mf"><label>' + label + '</label><input id="' + id + '" value="' + esc(val) + '"></div>';
  }
  function mfArea(label, id, val) {
    return '<div class="mf"><label>' + label + '</label>' +
      '<textarea id="' + id + '" style="flex:1;min-height:78px;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--card-2);color:var(--ink);outline:none;resize:vertical">' +
      esc(val) + '</textarea></div>';
  }
  function pageShop() {
    const sp = S.getShop();
    return '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>门店信息</h3>' +
      '<span style="font-size:11px;color:#8A8F98">保存后顾客端首页商家信息卡与门店详情立即同步</span></div>' +
      '<div class="panel-body">' +
      mfRow('门店名称', 'shName', sp.name) +
      mfRow('门店地址', 'shAddr', sp.address) +
      mfRow('联系电话', 'shPhone', sp.phone) +
      mfRow('营业时间', 'shHours', sp.hours) +
      mfArea('门店公告', 'shNotice', sp.notice) +
      mfArea('配送范围说明', 'shDelivery', sp.delivery) +
      '<div style="display:flex;gap:10px;margin-top:4px">' +
      '<button class="mini primary" id="shopSave" style="height:36px;padding:0 20px">保存门店设置</button>' +
      '<button class="mini" id="shopReset" style="height:36px;padding:0 16px">恢复默认</button>' +
      '</div></div></div>' +

      '<div class="panel"><div class="panel-head"><h3>顾客端展示预览</h3>' +
      '<span style="font-size:11px;color:#8A8F98">与 App 首页商家信息卡、门店详情页一致</span></div>' +
      '<div class="panel-body"><div class="card pad">' +
      '<div class="row" style="padding:0"><span style="font-size:30px">' + sp.logo + '</span>' +
      '<div class="grow"><div class="rt">' + esc(sp.name) + '</div>' +
      '<div class="rs">🕘 ' + esc(sp.hours) + ' · ☎️ ' + esc(sp.phone) + '</div>' +
      '<div class="rs">📍 ' + esc(sp.address) + '</div>' +
      '<div class="rs" style="margin-top:4px">📢 ' + esc(sp.notice) + '</div></div></div>' +
      '<div class="ok" style="margin-top:10px">🚚 ' + esc(sp.delivery) + '</div>' +
      '</div></div></div>';
  }

  /* ---------- 拼团管理 ---------- */
  function fmtLeft(ms) {
    if (!(ms > 0)) return '已结束';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    const p = n => (n < 10 ? '0' + n : '' + n);
    return (h > 0 ? h + ':' : '') + p(m) + ':' + p(ss);
  }
  function pageGroupBuy() {
    const gs = S.gbStats();
    const list = S.gbList().slice().sort((a, b) =>
      (a.status === 'ing' ? 0 : 1) - (b.status === 'ing' ? 0 : 1) || b.startAt - a.startAt);
    const gbOrders = st().orders.filter(o => o.groupBuyId);
    const paidAmt = gbOrders.filter(o => o.status !== 'unpaid' && o.status !== 'canceled' && o.status !== 'refunded')
      .reduce((s, o) => s + o.total, 0);
    const refundAmt = gbOrders.filter(o => o.status === 'refunded').reduce((s, o) => s + o.total, 0);
    const p0 = st().products.filter(p => p.on)[0] || st().products[0];

    return '<div class="kpi-grid">' +
      kpi('🔥', '进行中拼团', gs.ing + ' 个', '成团后自动进入待自提流程', true) +
      kpi('🎉', '已成团', gs.success + ' 个', '累计 ' + gs.joined + ' 人次参团', true) +
      kpi('↩️', '未成团已退款', gs.fail + ' 个', '退款金额 ' + YF.money0(refundAmt), false) +
      kpi('💰', '拼团销售额', YF.money0(paidAmt), '共 ' + gbOrders.length + ' 笔拼团订单', true) +
      '</div>' +

      '<div class="panel"><div class="panel-head"><h3>发起拼团</h3>' +
      '<span style="font-size:11px;color:#8A8F98">选择商品并设定拼团价、成团人数与拼团时限</span></div>' +
      '<div class="panel-body">' +
      '<div class="toolbar" style="align-items:flex-end">' +
      '<div><div style="font-size:11px;color:#8A8F98;margin-bottom:4px">选择商品</div>' +
      '<select id="gbPid">' + st().products.filter(p => p.on).map(p =>
        '<option value="' + p.id + '">' + p.emoji + ' ' + esc(p.name) + '（零售 ¥' + p.retail.toFixed(2) + ' / 团购 ¥' + p.group.toFixed(2) + '）</option>').join('') +
      '</select></div>' +
      '<div><div style="font-size:11px;color:#8A8F98;margin-bottom:4px">拼团价</div>' +
      '<input id="gbPrice" type="number" step="0.1" min="0" style="width:110px" value="' + (p0.group * 0.9).toFixed(2) + '"></div>' +
      '<div><div style="font-size:11px;color:#8A8F98;margin-bottom:4px">成团人数</div>' +
      '<input id="gbNeed" type="number" min="2" step="1" style="width:96px" value="3"></div>' +
      '<div><div style="font-size:11px;color:#8A8F98;margin-bottom:4px">时限（小时）</div>' +
      '<input id="gbHours" type="number" min="1" step="1" style="width:96px" value="12"></div>' +
      '<button class="mini primary" id="gbCreate" style="height:32px">+ 发起拼团</button>' +
      '</div>' +
      '<div class="ok" style="margin-top:12px">💡 拼团价建议低于团购价 10%。到期未成团，系统会自动把团员已付金额全额退回会员卡余额并生成退款流水。</div>' +
      '</div></div>' +

      '<div class="panel"><div class="panel-head"><h3>拼团活动（' + list.length + '）</h3>' +
      '<span style="font-size:11px;color:#8A8F98">演示环境可模拟人参团，观察成团与自动退款全过程</span></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>团号</th><th>商品</th><th class="num">拼团价</th><th class="num">零售价</th><th class="num">成团人数</th>' +
      '<th>进度</th><th>剩余时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      list.map(g => {
        const pct = Math.min(100, g.members.length / g.need * 100).toFixed(0);
        return '<tr><td style="font-size:12px">' + esc(g.id) + '</td>' +
          '<td><span style="font-size:16px">' + g.emoji + '</span> ' + esc(g.name) +
          '<div style="font-size:10px;color:#8A8F98">' + esc(g.spec) + '</div></td>' +
          '<td class="num" style="font-weight:700;color:#F87171">¥' + g.price.toFixed(2) + '</td>' +
          '<td class="num" style="color:#8A8F98">¥' + g.retail.toFixed(2) + '</td>' +
          '<td class="num">' + g.need + ' 人</td>' +
          '<td><div style="width:112px"><div style="font-size:11px">' + g.members.length + '/' + g.need + ' 人</div>' +
          '<div class="gp-bar"><i style="width:' + pct + '%"></i></div></div></td>' +
          '<td style="font-size:12px">' + (g.status === 'ing'
            ? '<span class="countdown" data-cd="1" data-end="' + g.endAt + '">' + fmtLeft(g.endAt - Date.now()) + '</span>'
            : '—') + '</td>' +
          '<td>' + (g.status === 'ing' ? '<span class="chip orange">进行中</span>' :
            g.status === 'success' ? '<span class="chip">已成团</span>' : '<span class="chip red">未成团·已退款</span>') + '</td>' +
          '<td><div class="tbl-act">' +
          (g.status === 'ing' ? '<button class="mini" data-gb="sim" data-id="' + g.id + '">模拟人参团</button>' +
            '<button class="mini primary" data-gb="force" data-id="' + g.id + '">强制成团</button>' +
            '<button class="mini danger" data-gb="close" data-id="' + g.id + '">终止并退款</button>' : '') +
          '<button class="mini" data-gb="detail" data-id="' + g.id + '">团员明细</button>' +
          '</div></td></tr>';
      }).join('') + '</tbody></table></div></div>' +

      '<div class="panel"><div class="panel-head"><h3>拼团订单（' + gbOrders.length + ' 笔）</h3>' +
      '<span style="font-size:11px;color:#8A8F98">与普通订单共用订单表，带「🔥 拼团单」标识</span></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto">' +
      (gbOrders.length ? '<table class="tbl"><thead><tr><th>订单号</th><th>团号</th><th>商品</th><th class="num">金额</th>' +
        '<th>支付</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead><tbody>' +
        gbOrders.map(o =>
          '<tr><td style="font-size:12px">' + esc(o.no) + '</td>' +
          '<td><span class="chip purple">' + esc(o.groupBuyId) + '</span></td>' +
          '<td><span style="font-size:15px">' + o.items[0].emoji + '</span> ' + esc(o.items[0].name) + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(o.total) + '</td>' +
          '<td style="font-size:12px;color:#8A8F98">' + (o.payMethod ? S.payName(o.payMethod).replace('（账期）', '') : '—') + '</td>' +
          '<td>' + statusChip(o.status) + '</td>' +
          '<td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(o.createdAt) + '</td>' +
          '<td><button class="mini" data-odetail="' + o.id + '">详情</button></td></tr>').join('') +
        '</tbody></table>' : '<div class="empty"><div class="ee">🔥</div><p>还没有拼团订单</p></div>') +
      '</div></div>';
  }
  function gbDetail(id) {
    const g = S.gbOf(id);
    if (!g) return;
    modal('拼团 ' + g.id + ' · 团员明细',
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">' +
      '<span style="font-size:34px">' + g.emoji + '</span>' +
      '<div><div style="font-weight:700">' + esc(g.name) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98">拼团价 ¥' + g.price.toFixed(2) + ' · ' + g.need + ' 人成团 · ' +
      (g.status === 'ing' ? '剩 ' + fmtLeft(g.endAt - Date.now()) : g.status === 'success' ? '已成团' : '未成团已退款') + '</div></div></div>' +
      '<table class="tbl" style="font-size:12px"><thead><tr><th>团员</th><th>身份</th><th>参团时间</th><th>关联订单</th></tr></thead><tbody>' +
      g.members.map(m => '<tr><td>' + m.avatar + ' ' + esc(m.name) + '</td>' +
        '<td>' + (m.self ? '<span class="chip">本人</span>' : '<span class="chip gray">虚拟用户</span>') + '</td>' +
        '<td style="color:#8A8F98">' + YF.fmtTime(m.at) + '</td>' +
        '<td style="font-size:12px">' + (m.orderId ? (function () {
          const o = ord(m.orderId);
          return o ? esc(o.no) + ' · ' + YF.money(o.total) : m.orderId;
        })() : '—') + '</td></tr>').join('') +
      '</tbody></table>' +
      '<div style="margin-top:12px;font-size:12px;color:#8A8F98">进度 ' + g.members.length + '/' + g.need + ' 人' +
      (g.status === 'fail' ? ' · ' + esc(g.closeReason || '未成团') : '') + '</div>', null, null);
  }

  /* ---------- 订单管理 ---------- */
  const ORD_TABS = { all: '全部', gb: '🔥 拼团', unpaid: '待付款', accepted: '待接单', delivering: '配送中', done: '已完成' };
  function pageOrders() {
    let list = st().orders.slice();
    if (UI.ordStatus === 'gb') list = list.filter(o => !!o.groupBuyId);
    else if (UI.ordStatus !== 'all') list = list.filter(o => o.status === UI.ordStatus);
    list.sort((a, b) => b.createdAt - a.createdAt);
    return '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>订单管理（' + list.length + ' 笔）</h3>' +
      '<div class="toolbar">' + Object.keys(ORD_TABS).map(k =>
        '<button class="mini ' + (UI.ordStatus === k ? 'primary' : '') + '" data-ordtab="' + k + '">' + ORD_TABS[k] + '</button>').join('') +
      '</div></div><div class="panel-body" style="padding:0;overflow-x:auto">' +
      '<table class="tbl"><thead><tr><th>订单号</th><th>模式</th><th>客户</th><th>商品</th><th class="num">金额</th><th>支付</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead><tbody>' +
      list.map(o => {
        const m = YF.MODES[o.mode];
        return '<tr><td style="font-size:12px">' + o.no + '</td>' +
          '<td><span class="chip ' + (o.mode === 'bulk' ? 'blue' : o.mode === 'group' ? '' : 'orange') + '">' + m.icon + ' ' + m.short + '</span>' +
          (o.groupBuyId ? ' <span class="chip purple">🔥 拼团</span>' : '') + '</td>' +
          '<td>' + (o.company ? esc(o.company.name.slice(0, 10)) + '…' : esc(st().user.name)) + '</td>' +
          '<td style="max-width:220px"><span style="font-size:15px">' + o.items[0].emoji + '</span> ' + esc(o.items[0].name) +
          (o.items.length > 1 ? ' 等 ' + o.items.length + ' 件' : '') + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(o.total) + '</td>' +
          '<td style="font-size:12px;color:#8A8F98">' + (o.payMethod ? S.payName(o.payMethod).replace('（账期）', '') : '—') + '</td>' +
          '<td>' + statusChip(o.status) + '</td>' +
          '<td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(o.createdAt) + '</td>' +
          '<td><div class="tbl-act">' +
          (o.status === 'auditing' ? '<button class="mini primary" data-audit="ok" data-id="' + o.id + '">审核通过</button>' +
            '<button class="mini danger" data-audit="no" data-id="' + o.id + '">驳回</button>' : '') +
          (o.status === 'unpaid' ? '<button class="mini" data-markpay="' + o.id + '">标记已付</button>' : '') +
          (o.status === 'accepted' ? '<button class="mini primary" data-next="' + o.id + '">接单发货</button>' : '') +
          (o.status === 'delivering' ? '<button class="mini primary" data-next="' + o.id + '">标记送达</button>' : '') +
          (o.status === 'grouping' ? (o.groupBuyId
            ? '<button class="mini" data-gb="sim" data-id="' + o.groupBuyId + '">模拟人参团</button>' +
              '<button class="mini primary" data-gb="force" data-id="' + o.groupBuyId + '">强制成团</button>'
            : '<button class="mini primary" data-next="' + o.id + '">标记成团</button>') : '') +
          (o.status === 'refunding' ? '<button class="mini primary" data-ref="ok" data-id="' + o.id + '">同意退款</button>' +
            '<button class="mini danger" data-ref="no" data-id="' + o.id + '">驳回</button>' : '') +
          '<button class="mini" data-odetail="' + o.id + '">详情</button>' +
          '</div></td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  /* ---------- 企业采购审核 ---------- */
  function pageBulk() {
    const list = st().orders.filter(o => o.mode === 'bulk').sort((a, b) => b.createdAt - a.createdAt);
    const pending = list.filter(o => o.status === 'auditing');
    const totalAmt = list.filter(o => o.status !== 'canceled').reduce((s, o) => s + o.total, 0);
    return '<div class="kpi-grid">' +
      kpi('⏳', '待审核采购单', pending.length + ' 笔', '需在 2 小时内响应', false) +
      kpi('💼', '企采累计金额', YF.money0(totalAmt), '共 ' + list.length + ' 笔采购单', true) +
      kpi('🏢', '在合作企业', '36 家', '本月新增 4 家', true) +
      kpi('🧾', '待开票金额', YF.money0(list.filter(o => o.invoice && o.status !== 'done').reduce((s, o) => s + o.total, 0)), '增值税专用发票', false) +
      '</div>' +
      '<div class="panel"><div class="panel-head"><h3>采购单列表</h3><span style="font-size:11px;color:#8A8F98">审核通过后进入待付款，可走对公账期</span></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>采购单号</th><th>企业</th><th>采购内容</th><th class="num">数量</th><th class="num">采购金额</th><th>结算方式</th><th>发票</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      list.map(o => {
        const qty = o.items.reduce((s, i) => s + i.qty, 0);
        return '<tr><td style="font-size:12px">' + o.no + '</td>' +
          '<td>' + esc(o.company ? o.company.name : '—') + '</td>' +
          '<td>' + o.items.map(i => i.emoji + esc(i.name)).join('、') + '</td>' +
          '<td class="num">' + qty + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(o.total) + '</td>' +
          '<td>' + (o.payMethod === 'credit' ? '对公账期' : o.payMethod ? S.payName(o.payMethod) : '待定') + '</td>' +
          '<td>' + (o.invoice ? '<span class="chip blue">' + esc(o.invoice.type) + '</span>' : '—') + '</td>' +
          '<td>' + statusChip(o.status) + '</td>' +
          '<td><div class="tbl-act">' +
          (o.status === 'auditing' ? '<button class="mini primary" data-audit="ok" data-id="' + o.id + '">通过</button>' +
            '<button class="mini danger" data-audit="no" data-id="' + o.id + '">驳回</button>' : '') +
          (o.status === 'unpaid' ? '<button class="mini" data-markpay="' + o.id + '">标记已付</button>' : '') +
          (o.status === 'accepted' ? '<button class="mini primary" data-next="' + o.id + '">安排配送</button>' : '') +
          (o.status === 'delivering' ? '<button class="mini primary" data-next="' + o.id + '">确认交付</button>' : '') +
          '<button class="mini" data-odetail="' + o.id + '">详情</button>' +
          '</div></td></tr>';
      }).join('') +
      '</tbody></table></div></div>';
  }

  /* ---------- 售后 ---------- */
  function pageAfter() {
    const list = st().orders.filter(o => o.refund).sort((a, b) => b.createdAt - a.createdAt);
    const pending = list.filter(o => o.status === 'refunding');
    const doneAmt = list.filter(o => o.refund.status === 'refunded').reduce((s, o) => s + o.refund.amount, 0);
    return '<div class="kpi-grid">' +
      kpi('🔧', '待处理售后', pending.length + ' 笔', '承诺 2 小时内响应', false) +
      kpi('💸', '已退款金额', YF.money0(doneAmt), '共 ' + list.filter(o => o.refund.status === 'refunded').length + ' 笔', false) +
      kpi('📉', '售后率', '1.2%', '低于行业均值 2.4%', true) +
      kpi('⭐', '满意度', '98.6%', '坏果包赔履约率 100%', true) +
      '</div>' +
      '<div class="panel"><div class="panel-head"><h3>售后工单</h3></div>' +
      '<div class="panel-body" style="padding:0">' +
      (list.length ? '<table class="tbl"><thead><tr><th>订单号</th><th>客户</th><th>商品</th><th>原因</th><th class="num">退款金额</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
        list.map(o =>
          '<tr><td style="font-size:12px">' + o.no + '</td>' +
          '<td>' + esc(st().user.name) + '</td>' +
          '<td>' + o.items.map(i => i.emoji + esc(i.name)).join('、') + '</td>' +
          '<td>' + esc(o.refund.reason) + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(o.refund.amount) + '</td>' +
          '<td>' + (o.refund.status === 'refunded' ? '<span class="chip">已退款</span>' :
            o.refund.status === 'rejected' ? '<span class="chip gray">已驳回</span>' : '<span class="chip red">处理中</span>') + '</td>' +
          '<td><div class="tbl-act">' +
          (o.status === 'refunding' ? '<button class="mini primary" data-ref="ok" data-id="' + o.id + '">同意退款</button>' +
            '<button class="mini danger" data-ref="no" data-id="' + o.id + '">驳回</button>' : '') +
          '<button class="mini" data-odetail="' + o.id + '">详情</button></div></td></tr>').join('') +
        '</tbody></table>' : '<div class="empty"><div class="ee">🎉</div><p>暂无售后工单</p></div>') +
      '</div></div>';
  }

  /* ---------- 库存盘点 ---------- */
  function pageStock() {
    const list = st().products.slice().sort((a, b) => a.stock - b.stock);
    const low = list.filter(p => p.stock <= 60);
    const logs = st().stockLogs.slice(0, 12);
    return '<div class="kpi-grid">' +
      kpi('📦', 'SKU 总数', list.length + ' 个', '在售 ' + S.stats().onCount + ' 个', true) +
      kpi('⚠️', '低于安全库存', low.length + ' 个', '安全线 60 件', false) +
      kpi('💰', '库存货值', YF.money0(S.stats().stockValue), '按批发成本估算', true) +
      kpi('🔄', '出入库记录', st().stockLogs.length + ' 条', '近 ' + (logs.length ? YF.fmtTime(logs[0].ts) : '—'), true) +
      '</div>' +
      '<div class="panel"><div class="panel-head"><h3>库存盘点表</h3>' +
      '<div class="toolbar"><input id="skw" placeholder="搜索商品" value="' + esc(UI.kw) + '">' +
      '<button class="mini primary" data-intake="pick">📷 拍照入库</button>' +
      '<button class="mini" data-page="intake">入库单历史</button></div></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>商品</th><th>规格</th><th class="num">当前库存</th><th class="num">累计销量</th><th>状态</th><th>周转</th><th>操作</th></tr></thead><tbody>' +
      list.filter(p => !UI.kw || p.name.includes(UI.kw)).map(p => {
        const turn = (p.sales / Math.max(1, p.stock + p.sales) * 100).toFixed(0);
        return '<tr><td><span style="font-size:18px">' + p.emoji + '</span> ' + esc(p.name) + '</td>' +
          '<td style="color:#8A8F98">' + esc(p.spec) + '</td>' +
          '<td class="num" style="font-weight:700;color:' + (p.stock <= 60 ? '#E54545' : '') + '">' + p.stock + '</td>' +
          '<td class="num">' + p.sales + '</td>' +
          '<td>' + (p.stock <= 0 ? '<span class="chip red">缺货</span>' : p.stock <= 60 ? '<span class="chip orange">预警</span>' : '<span class="chip">充足</span>') + '</td>' +
          '<td><div style="width:80px;height:6px;background:#F0F2F1;border-radius:3px;overflow:hidden">' +
          '<i style="display:block;height:100%;width:' + turn + '%;background:#21A05C"></i></div>' +
          '<span style="font-size:10px;color:#8A8F98">' + turn + '%</span></td>' +
          '<td><div class="tbl-act"><button class="mini" data-stock="' + p.id + '">盘点调整</button></div></td></tr>';
      }).join('') +
      '</tbody></table></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>近期出入库流水</h3></div>' +
      '<div class="panel-body" style="padding:0"><table class="tbl"><thead><tr><th>时间</th><th>商品</th><th class="num">变动</th><th>类型</th><th>备注</th></tr></thead><tbody>' +
      logs.map(l => {
        const p = prod(l.pid);
        return '<tr><td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(l.ts) + '</td>' +
          '<td>' + (p ? p.emoji + ' ' + esc(p.name) : l.pid) + '</td>' +
          '<td class="num" style="font-weight:700;color:' + (l.delta > 0 ? '#21A05C' : '#E54545') + '">' +
          (l.delta > 0 ? '+' : '') + l.delta + '</td>' +
          '<td><span class="chip ' + (l.delta > 0 ? '' : 'orange') + '">' + esc(l.type) + '</span></td>' +
          '<td style="color:#8A8F98">' + esc(l.memo) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* ---------- 销售盘点 ---------- */
  function pageSales() {
    const days = st().dayStats;
    const catSales = YF.CATEGORIES.map(c => {
      const ps = st().products.filter(p => p.cats.includes(c.id));
      return { name: c.name, icon: c.icon, sales: ps.reduce((s, p) => s + p.sales * p.retail, 0), qty: ps.reduce((s, p) => s + p.sales, 0) };
    }).sort((a, b) => b.sales - a.sales);
    const maxCat = Math.max.apply(null, catSales.map(c => c.sales));
    const top = st().products.slice().sort((a, b) => b.sales - a.sales).slice(0, 10);
    const totalSales = days.reduce((s, d) => s + d.sales, 0);

    return '<div class="kpi-grid">' +
      kpi('💰', '14 日销售额', YF.money0(totalSales), '日均 ' + YF.money0(totalSales / 14), true) +
      kpi('🧾', '14 日订单', days.reduce((s, d) => s + d.orders, 0) + ' 单', '日均 ' + Math.round(days.reduce((s, d) => s + d.orders, 0) / 14) + ' 单', true) +
      kpi('🛵', '外卖占比', '35%', '零售业务基本盘', true) +
      kpi('🏢', '企采占比', '42%', '毛利稳定，客单价高', true) +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>日销售额趋势</h3></div>' +
      '<div class="panel-body">' + lineChart(days.map(d => d.sales), days.map(d => d.date)) + '</div></div>' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>分类销售额占比</h3></div>' +
      '<div class="panel-body">' + catSales.map(c =>
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
        '<span style="width:76px;font-size:12px">' + c.icon + ' ' + c.name + '</span>' +
        '<div style="flex:1;height:14px;background:#F0F2F1;border-radius:4px;overflow:hidden">' +
        '<i style="display:block;height:100%;width:' + (c.sales / maxCat * 100).toFixed(1) + '%;background:linear-gradient(90deg,#4FCB8B,#21A05C)"></i></div>' +
        '<span style="width:82px;text-align:right;font-size:11px;font-weight:600">' + YF.money0(c.sales) + '</span>' +
        '<span style="width:56px;text-align:right;font-size:10px;color:#8A8F98">' + c.qty + ' 件</span></div>').join('') +
      '</div></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>热销商品 TOP 10</h3></div>' +
      '<div class="panel-body" style="padding:0"><table class="tbl"><thead><tr>' +
      '<th>排名</th><th>商品</th><th>分类</th><th class="num">销量</th><th class="num">销售额</th><th>热度</th></tr></thead><tbody>' +
      top.map((p, i) =>
        '<tr><td style="font-weight:800;color:' + (i < 3 ? '#E54545' : '#8A8F98') + '">' + (i + 1) + '</td>' +
        '<td><span style="font-size:18px">' + p.emoji + '</span> ' + esc(p.name) + '</td>' +
        '<td>' + p.cats.map(catName).join('/') + '</td>' +
        '<td class="num">' + p.sales + '</td>' +
        '<td class="num" style="font-weight:700">' + YF.money0(p.sales * p.retail) + '</td>' +
        '<td><div style="width:100px;height:6px;background:#F0F2F1;border-radius:3px;overflow:hidden">' +
        '<i style="display:block;height:100%;width:' + (p.sales / top[0].sales * 100).toFixed(0) + '%;background:#FF7A2F"></i></div></td></tr>').join('') +
      '</tbody></table></div></div>';
  }

  /* ---------- 自动对账 ---------- */
  function pageRecon() {
    const rows = S.reconcile();
    const sum = S.reconSummary();
    const tx = st().transactions.slice().sort((a, b) => b.ts - a.ts);
    const typeName = { recharge: '会员卡充值', online: '在线收款', balance: '会员卡消费', credit: '对公挂账', refund: '退款支出' };
    const typeColor = { recharge: 'purple', online: '', balance: 'orange', credit: 'blue', refund: 'red' };

    return '<div class="kpi-grid">' +
      kpi('🧮', '对账状态', sum.unbalanced === 0 ? '全部平账' : sum.unbalanced + ' 天异常', '共核对 ' + rows.length + ' 天流水', sum.unbalanced === 0) +
      kpi('💳', '会员卡充值', YF.money0(sum.recharge), '负债类，计入预收', true) +
      kpi('💚', '在线收款', YF.money0(sum.online), '微信支付通道', true) +
      kpi('🏦', '对公挂账', YF.money0(sum.credit), '企业账期应收', true) +
      kpi('🎫', '会员卡核销', YF.money0(sum.balance), '冲减预收负债', false) +
      kpi('↩️', '退款支出', YF.money0(sum.refund), '共 ' + tx.filter(t => t.type === 'refund').length + ' 笔', false) +
      '</div>' +
      (sum.unbalanced === 0 ? '<div class="ok" style="margin-top:16px">✅ 自动对账完成：系统订单金额与支付流水完全一致，无差异记录，可一键生成财务报表。</div>' :
        '<div class="warn" style="margin-top:16px">⚠️ 检测到 ' + sum.unbalanced + ' 天账目差异，请核对下方明细。</div>') +
      '<div class="panel"><div class="panel-head"><h3>每日自动对账表</h3>' +
      '<button class="mini primary" id="runRecon">重新执行对账</button></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>日期</th><th class="num">系统销售额</th><th class="num">系统退款</th><th class="num">应收净额</th>' +
      '<th class="num">流水收款</th><th class="num">会员卡核销</th><th class="num">实收合计</th><th class="num">差异</th><th>状态</th></tr></thead><tbody>' +
      rows.slice().reverse().map(r =>
        '<tr><td>' + r.date + '</td>' +
        '<td class="num">' + YF.money0(r.sales) + '</td>' +
        '<td class="num" style="color:#E54545">-' + YF.money0(r.refund) + '</td>' +
        '<td class="num">' + YF.money0(r.expect) + '</td>' +
        '<td class="num">' + YF.money0(r.incomeFlow) + '</td>' +
        '<td class="num">' + YF.money0(r.balancePay) + '</td>' +
        '<td class="num" style="font-weight:700">' + YF.money0(r.actual) + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (Math.abs(r.diff) < 0.01 ? '#21A05C' : '#E54545') + '">' +
        (Math.abs(r.diff) < 0.01 ? '0.00' : YF.money(r.diff)) + '</td>' +
        '<td>' + (r.balanced ? '<span class="chip">✓ 已平账</span>' : '<span class="chip red">差异待查</span>') + '</td></tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>资金流水明细</h3><span style="font-size:11px;color:#8A8F98">共 ' + tx.length + ' 笔</span></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>时间</th><th>类型</th><th>渠道</th><th>关联单号</th><th class="num">金额</th><th>状态</th><th>说明</th></tr></thead><tbody>' +
      tx.map(t =>
        '<tr><td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(t.ts) + '</td>' +
        '<td><span class="chip ' + typeColor[t.type] + '">' + typeName[t.type] + '</span></td>' +
        '<td>' + esc(t.channel) + '</td>' +
        '<td style="font-size:12px">' + esc(t.orderNo) + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (t.amount < 0 ? '#E54545' : '#21A05C') + '">' +
        (t.amount < 0 ? '-' : '+') + YF.money(Math.abs(t.amount)) + '</td>' +
        '<td>' + (t.status === 'success' ? '<span class="chip">成功</span>' : '<span class="chip orange">挂账中</span>') + '</td>' +
        '<td style="color:#8A8F98">' + esc(t.memo) + '</td></tr>').join('') +
      '</tbody></table></div></div>';
  }

  /* ---------- 会员 / 充值 ---------- */
  const DEMO_MEMBERS = [
    { name: '李小果', phone: '138****6721', lv: 'gold', spend: 8620, points: 2860, bal: 528.6, orders: 42, tag: '企业客户' },
    { name: '张团长', phone: '139****2233', lv: 'diamond', spend: 26800, points: 8420, bal: 1260, orders: 186, tag: '社区团长' },
    { name: '王女士', phone: '150****8899', lv: 'silver', spend: 1860, points: 620, bal: 100, orders: 15, tag: '家庭用户' },
    { name: '南京倍科科技', phone: '025-88***210', lv: 'diamond', spend: 42600, points: 0, bal: 0, orders: 68, tag: '企业采购' },
    { name: '陈先生', phone: '186****4512', lv: 'normal', spend: 320, points: 96, bal: 0, orders: 3, tag: '新客' },
    { name: '刘老师', phone: '137****7766', lv: 'silver', spend: 2480, points: 1180, bal: 300, orders: 27, tag: '学校采购' }
  ];
  function pageMembers() {
    const dist = YF.LEVELS.map(l => ({ l, n: DEMO_MEMBERS.filter(m => m.lv === l.key).length }));
    return '<div class="kpi-grid">' +
      kpi('👥', '会员总数', '12,864', '本月新增 486 人', true) +
      kpi('💎', '高价值会员', '1,204 人', '金卡及以上占比 9.4%', true) +
      kpi('💳', '会员卡沉淀', YF.money0(DEMO_MEMBERS.reduce((s, m) => s + m.bal, 0) * 216), '预收负债，需专项管理', false) +
      kpi('🔁', '复购率', '63.8%', '近 30 天有 2 次以上下单', true) +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>会员等级分布</h3></div><div class="panel-body">' +
      barChart(dist.map(d => ({ k: d.l.name, v: d.n * 320 + 180 }))) +
      '<div class="legend">' + dist.map(d => '<span><i style="background:' + d.l.color + '"></i>' + d.l.name + ' ' + (d.n * 320 + 180).toLocaleString() + ' 人</span>').join('') + '</div>' +
      '</div></div>' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>等级权益配置</h3></div>' +
      '<div class="panel-body" style="padding:0"><table class="tbl"><thead><tr><th>等级</th><th>累计消费门槛</th><th>折扣</th><th>积分倍数</th></tr></thead><tbody>' +
      YF.LEVELS.map(l => '<tr><td>' + l.icon + ' ' + l.name + '</td><td>' + YF.money0(l.min) + '</td>' +
        '<td>' + (l.discount * 10).toFixed(1) + ' 折</td><td>' + l.rate + ' 倍</td></tr>').join('') +
      '</tbody></table></div></div></div>' +
      '<div class="panel"><div class="panel-head"><h3>重点会员</h3></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th>会员</th><th>手机号</th><th>等级</th><th>标签</th><th class="num">累计消费</th><th class="num">积分</th><th class="num">余额</th><th class="num">订单数</th></tr></thead><tbody>' +
      DEMO_MEMBERS.map(m => {
        const l = YF.LEVELS.find(x => x.key === m.lv);
        return '<tr><td>' + esc(m.name) + '</td><td style="color:#8A8F98">' + esc(m.phone) + '</td>' +
          '<td><span class="chip">' + l.icon + ' ' + l.name + '</span></td>' +
          '<td><span class="chip blue">' + esc(m.tag) + '</span></td>' +
          '<td class="num">' + YF.money0(m.spend) + '</td><td class="num">' + m.points + '</td>' +
          '<td class="num">' + YF.money(m.bal) + '</td><td class="num">' + m.orders + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  function pageRecharge() {
    const tx = st().transactions.filter(t => t.type === 'recharge' || t.type === 'balance').sort((a, b) => b.ts - a.ts);
    const totalIn = st().transactions.filter(t => t.type === 'recharge').reduce((s, t) => s + t.amount, 0);
    const totalGift = st().transactions.filter(t => t.type === 'recharge').length * 80;
    return '<div class="kpi-grid">' +
      kpi('💳', '累计充值', YF.money0(totalIn), '共 ' + st().transactions.filter(t => t.type === 'recharge').length + ' 笔', true) +
      kpi('🎁', '赠送金额', YF.money0(totalGift), '营销成本，计入费用', false) +
      kpi('🎫', '余额核销', YF.money0(S.reconSummary().balance), '冲减预收账款', false) +
      kpi('🧾', '预付负债余额', YF.money0(S.stats().balanceLiability), '当前 App 演示账户', false) +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>充值套餐配置</h3></div>' +
      '<div class="panel-body" style="padding:0"><table class="tbl"><thead><tr><th>充值金额</th><th>赠送</th><th>实到</th><th>折扣率</th><th>状态</th></tr></thead><tbody>' +
      YF.RECHARGE_PLANS.map(p => '<tr><td style="font-weight:700">¥' + p.amount + '</td>' +
        '<td style="color:#E54545">¥' + p.gift + '</td><td>¥' + (p.amount + p.gift) + '</td>' +
        '<td>' + (p.amount / (p.amount + p.gift) * 10).toFixed(1) + ' 折</td>' +
        '<td><span class="chip">生效中</span>' + (p.hot ? ' <span class="chip orange">热门</span>' : '') + '</td></tr>').join('') +
      '</tbody></table></div></div>' +
      '<div class="panel" style="margin-top:16px"><div class="panel-head"><h3>会员卡消费核销</h3></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto"><table class="tbl"><thead><tr><th>时间</th><th>类型</th><th>单号</th><th class="num">金额</th></tr></thead><tbody>' +
      tx.slice(0, 10).map(t => '<tr><td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(t.ts) + '</td>' +
        '<td><span class="chip ' + (t.type === 'recharge' ? 'purple' : 'orange') + '">' + (t.type === 'recharge' ? '充值' : '消费') + '</span></td>' +
        '<td style="font-size:12px">' + esc(t.orderNo) + '</td>' +
        '<td class="num" style="font-weight:700;color:' + (t.amount < 0 ? '#E54545' : '#21A05C') + '">' + YF.money(Math.abs(t.amount)) + '</td></tr>').join('') +
      '</tbody></table></div></div></div>';
  }

  /* ---------- 智能入库（拍照识别入库单） ---------- */
  const SCAN = { img: null, res: null, busy: false, source: 'photo', err: '' };
  let SAMPLE_THUMBS = null;
  function buildThumbs() {
    if (SAMPLE_THUMBS) return SAMPLE_THUMBS;
    SAMPLE_THUMBS = [];
    try {
      YF.ocr.SAMPLES.forEach((s, i) => {
        const b = YF.ocr.sampleBill(i);
        SAMPLE_THUMBS.push({ idx: i, url: b.url, supplier: s.supplier });
      });
    } catch (e) { SAMPLE_THUMBS = [{ idx: 0, url: '', supplier: '示例单据' }]; }
    return SAMPLE_THUMBS;
  }
  function confBar(c) {
    const color = c >= 0.85 ? '#21A05C' : c >= 0.6 ? '#D9A441' : '#E54545';
    return '<div class="conf"><span class="cb"><i style="width:' + (c * 100).toFixed(0) + '%;background:' + color + '"></i></span>' +
      '<span class="cn" style="color:' + color + '">' + (c * 100).toFixed(0) + '%</span></div>';
  }

  function pageIntake() {
    const ist = S.intakeStats();
    const head = '<div class="kpi-grid">' +
      kpi('📷', '累计入库单', ist.count + ' 张', '今日 ' + ist.todayCount + ' 张', true) +
      kpi('📦', '今日入库件数', ist.todayQty + ' 件', '拍照识别自动生成', true) +
      kpi('🧾', '识别商品行', ist.lines + ' 行', '平均每张 ' + (ist.count ? Math.round(ist.lines / ist.count) : 0) + ' 行', true) +
      kpi('💰', '入库采购金额', YF.money0(ist.totalAmount), '已同步生成采购付款流水', false) +
      '</div>';

    let body = '';
    if (SCAN.busy) {
      body = '<div class="panel" style="margin-top:16px"><div class="panel-body">' +
        '<div class="scan-anim"><div class="sa-i">📄</div>' +
        '<div style="font-size:15px;font-weight:700;margin-top:10px">正在识别入库单…</div>' +
        '<div style="font-size:12px;color:#8A8F98;margin-top:4px">版面分析 → 表格定位 → 字段抽取 → 商品匹配</div>' +
        '<div class="scan-line"></div></div></div></div>';
    } else if (SCAN.res) {
      body = renderScanResult();
    } else {
      body = renderUploader();
    }

    const history = renderIntakeHistory();
    return head + body + history;
  }

  function renderUploader() {
    const thumbs = buildThumbs();
    return '<div class="grid-2" style="margin-top:16px">' +
      '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>📷 拍照 / 上传入库单</h3></div>' +
      '<div class="panel-body">' +
      '<div class="upload-zone" data-intake="pick">' +
      '<div class="uz-i">📸</div><div class="uz-t">点击拍照，或拖拽 / 选择入库单照片</div>' +
      '<div class="uz-s">支持送货单、采购入库单、批发市场小票（JPG / PNG，建议拍正、光线均匀）</div></div>' +
      '<input type="file" id="billFile" accept="image/*" capture="environment" style="display:none">' +
      '<div style="display:flex;gap:10px;margin-top:12px">' +
      '<button class="mini primary" data-intake="pick" style="flex:1;height:38px">📷 拍照上传</button>' +
      '<button class="mini" data-intake="rescan" style="flex:1;height:38px">🔄 重新识别上一张</button></div>' +
      (SCAN.err ? '<div class="warn" style="margin-top:12px">' + esc(SCAN.err) + '</div>' : '') +
      '</div></div>' +

      '<div class="panel" style="margin-top:0"><div class="panel-head"><h3>识别能力</h3>' +
      '<span class="chip gray">内置演示引擎</span></div>' +
      '<div class="panel-body">' +
      '<div class="step-flow">' +
      '<div class="sf"><div class="sf-n">STEP 1</div><div class="sf-t">版面分析</div><div class="sf-d">定位表头与明细行，过滤抬头、签章、备注</div></div>' +
      '<div class="sf"><div class="sf-n">STEP 2</div><div class="sf-t">字段抽取</div><div class="sf-d">抽取商品名、规格、数量、单价、金额并校验勾稽</div></div>' +
      '<div class="sf"><div class="sf-n">STEP 3</div><div class="sf-t">商品匹配</div><div class="sf-d">按名称与别名库自动关联到系统 SKU，给出置信度</div></div>' +
      '</div>' +
      '<div class="warn" style="margin-top:12px">🔌 当前为内置演示识别引擎（自动解析单据版式）。接真实 OCR 只需执行 ' +
      '<code style="background:#fff;padding:1px 5px;border-radius:4px">YF.ocr.configure({ endpoint: "https://your-ocr-api" })</code>，' +
      '解析、匹配、入库逻辑完全复用。</div>' +
      '</div></div></div>' +

      '<div class="panel"><div class="panel-head"><h3>没有单据？用示例单据体验</h3>' +
      '<span style="font-size:11px;color:#8A8F98">点击任意一张即可走完整识别入库流程</span></div>' +
      '<div class="panel-body"><div class="sample-thumbs">' +
      thumbs.map(t =>
        '<div class="st" data-intake="sample" data-idx="' + t.idx + '">' +
        (t.url ? '<img src="' + t.url + '" alt="示例入库单">' :
          '<div style="height:92px;display:flex;align-items:center;justify-content:center;font-size:30px;background:#F7F9F8">🧾</div>') +
        '<div class="st-n">' + esc(t.supplier) + '</div></div>').join('') +
      '</div></div></div>';
  }

  function renderScanResult() {
    const r = SCAN.res;
    const rows = r.lines;
    const okLines = rows.filter(l => l.checked && l.skuId && l.qty > 0);
    const totalQty = okLines.reduce((s, l) => s + l.qty, 0);
    const totalAmt = okLines.reduce((s, l) => s + l.qty * (l.price || 0), 0);
    const lowConf = rows.filter(l => l.confidence < 0.7).length;
    const unmatched = rows.filter(l => !l.skuId).length;

    return '<div class="panel" style="margin-top:16px"><div class="panel-head">' +
      '<h3>识别结果</h3>' +
      '<div class="toolbar">' +
      '<span class="chip ' + (r.confidence >= 0.85 ? '' : 'orange') + '">整体置信度 ' + (r.confidence * 100).toFixed(0) + '%</span>' +
      (r.demo ? '<span class="chip gray">演示引擎</span>' : '') +
      '<button class="mini" data-intake="rescan">重新识别</button>' +
      '<button class="mini danger" data-intake="cancel">取消</button>' +
      '</div></div>' +
      '<div class="panel-body">' +
      '<div class="grid-2" style="gap:16px">' +
      '<div class="scan-preview"><img src="' + SCAN.img + '" alt="入库单">' +
      '<div class="sp-cap"><span>原始单据</span><span>' + (SCAN.source === 'sample' ? '示例单据' : '拍照上传') + '</span></div></div>' +
      '<div>' +
      '<div class="card pad" style="box-shadow:none;border:1px solid #ECEFF1">' +
      '<div style="font-size:15px;font-weight:800">' + esc(r.supplier) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98;margin-top:6px;line-height:1.9">' +
      '单号：' + esc(r.no) + '<br>日期：' + esc(r.date) + '<br>' +
      '识别行数：' + rows.length + ' 行 · 可入库 ' + okLines.length + ' 行</div>' +
      (unmatched ? '<div class="warn" style="margin-top:10px">⚠️ ' + unmatched + ' 行未匹配到商品，请在下方手动关联后再入库</div>' : '') +
      (lowConf ? '<div class="warn" style="margin-top:8px">⚠️ ' + lowConf + ' 行置信度偏低，请重点核对数量与单价</div>' : '') +
      (unmatched || lowConf ? '' : '<div class="ok" style="margin-top:10px">✅ 全部行已匹配且置信度良好，可直接一键入库</div>') +
      '</div></div></div>' +

      '<div style="margin-top:14px;overflow-x:auto"><table class="tbl"><thead><tr>' +
      '<th style="width:34px"><input type="checkbox" id="chkAll" checked></th>' +
      '<th>识别原文</th><th>关联商品</th><th>规格</th><th class="num">数量</th><th class="num">进价</th>' +
      '<th class="num">金额</th><th>置信度</th><th style="width:52px"></th></tr></thead><tbody>' +
      rows.map((l, i) =>
        '<tr' + (l.checked ? '' : ' style="opacity:.45"') + '>' +
        '<td><input type="checkbox" class="lnChk" data-idx="' + i + '"' + (l.checked ? ' checked' : '') + '></td>' +
        '<td style="max-width:210px;font-size:12px;color:#555B66">' + esc(l.raw || (l.name + ' ' + l.spec)) + '</td>' +
        '<td><select class="ocr-sel lnSku" data-idx="' + i + '">' +
        '<option value="">— 未关联 —</option>' +
        st().products.map(p => '<option value="' + p.id + '"' + (l.skuId === p.id ? ' selected' : '') + '>' +
          p.emoji + ' ' + esc(p.name) + '</option>').join('') +
        '</select>' +
        (l.skuId ? '<div style="font-size:10px;color:#8A8F98;margin-top:2px">当前库存 ' + (prod(l.skuId) || {}).stock + ' 件</div>' :
          '<div style="font-size:10px;color:#E54545;margin-top:2px">需手动关联</div>') +
        '</td>' +
        '<td style="font-size:12px;color:#8A8F98">' + esc(l.spec) + '</td>' +
        '<td class="num"><input class="ocr-line-edit lnQty" data-idx="' + i + '" type="number" min="1" value="' + l.qty + '"></td>' +
        '<td class="num"><input class="ocr-line-edit lnPrice" data-idx="' + i + '" type="number" step="0.01" min="0" value="' + l.price + '"></td>' +
        '<td class="num" style="font-weight:700">' + YF.money(l.qty * (l.price || 0)) + '</td>' +
        '<td>' + confBar(l.confidence) + '</td>' +
        '<td><button class="mini danger" data-intake="delline" data-idx="' + i + '">删</button></td>' +
        '</tr>').join('') +
      '</tbody></table></div>' +

      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;gap:12px;flex-wrap:wrap">' +
      '<div style="font-size:12px;color:#8A8F98">勾选后将写入库存 · 合计 <b style="color:#1F2429">' + okLines.length + '</b> 行 / ' +
      '<b style="color:#1F2429">' + totalQty + '</b> 件' +
      (totalAmt ? ' · 采购金额 <b style="color:#E54545">' + YF.money(totalAmt) + '</b>' : '') + '</div>' +
      '<div style="display:flex;gap:10px">' +
      '<button class="mini" data-intake="cancel" style="height:38px;padding:0 18px">取消</button>' +
      '<button class="mini primary" data-intake="submit" style="height:38px;padding:0 22px">🚀 一键入库（' + totalQty + ' 件）</button>' +
      '</div></div>' +
      '</div></div>';
  }

  function renderIntakeHistory() {
    const list = st().intakes.slice();
    return '<div class="panel"><div class="panel-head"><h3>入库单历史</h3>' +
      '<span style="font-size:11px;color:#8A8F98">共 ' + list.length + ' 张 · 支持一键撤销（自动冲销库存与采购流水）</span></div>' +
      '<div class="panel-body" style="padding:0;overflow-x:auto">' +
      (list.length ? '<table class="tbl"><thead><tr><th>入库单号</th><th>供应商</th><th>入库时间</th><th>来源</th>' +
        '<th class="num">行数</th><th class="num">件数</th><th class="num">采购金额</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
        list.map(it =>
          '<tr><td style="font-size:12px">' + esc(it.no) + '</td>' +
          '<td>' + esc(it.supplier) + '</td>' +
          '<td style="font-size:12px;color:#8A8F98">' + YF.fmtTime(it.ts) + '</td>' +
          '<td><span class="chip ' + (it.source === 'sample' ? 'gray' : 'blue') + '">' +
          (it.source === 'sample' ? '示例单据' : '拍照识别') + '</span></td>' +
          '<td class="num">' + it.lines.length + '</td>' +
          '<td class="num">' + it.totalQty + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(it.totalAmount) + '</td>' +
          '<td>' + (it.status === 'done' ? '<span class="chip">已入库</span>' : '<span class="chip gray">已撤销</span>') + '</td>' +
          '<td><div class="tbl-act">' +
          '<button class="mini" data-intake="detail" data-id="' + it.id + '">明细</button>' +
          (it.status === 'done' ? '<button class="mini danger" data-intake="revert" data-id="' + it.id + '">撤销</button>' : '') +
          '</div></td></tr>').join('') + '</tbody></table>'
        : '<div class="empty"><div class="ee">📷</div><p>还没有入库记录，拍一张入库单试试</p></div>') +
      '</div></div>';
  }

  /* ---------- 智能入库：文件/识别流程 ---------- */
  function shrinkImage(dataUrl) {
    return new Promise(resolve => {
      try {
        const img = new Image();
        img.onload = () => {
          const maxW = 900;
          const scale = Math.min(1, maxW / (img.width || 1));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch (e) { resolve(dataUrl); }
    });
  }
  function startScan(dataUrl, source) {
    SCAN.img = dataUrl; SCAN.busy = true; SCAN.res = null; SCAN.source = source || 'photo'; SCAN.err = '';
    render();
    const done = r => { SCAN.busy = false; SCAN.res = r; render(); };
    const fail = e => { SCAN.busy = false; SCAN.err = '识别失败：' + (e && e.message ? e.message : e); render(); };
    // 模拟云端识别耗时，接真实接口后替换为直接 await
    const p = YF.ocr.recognize(dataUrl);
    if (p && typeof p.then === 'function') {
      setTimeout(() => p.then(done).catch(fail), 850);
    } else { setTimeout(() => done(p), 850); }
  }
  function pickFile() {
    const f = document.getElementById('billFile');
    if (f) f.click();
  }
  function onFilePicked(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { SCAN.err = '请选择图片文件（JPG / PNG）'; render(); return; }
    const fr = new FileReader();
    fr.onload = () => shrinkImage(String(fr.result)).then(url => startScan(url, 'photo'));
    fr.onerror = () => { SCAN.err = '图片读取失败，请重试'; render(); };
    fr.readAsDataURL(file);
  }
  function submitIntake() {
    const r = SCAN.res;
    if (!r) return;
    const lines = r.lines.filter(l => l.checked && l.skuId && l.qty > 0);
    if (!lines.length) { toast('请先勾选并关联商品'); return; }
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    const totalAmt = +lines.reduce((s, l) => s + l.qty * (l.price || 0), 0).toFixed(2);
    modal('确认一键入库',
      '<div style="font-size:13px;line-height:1.9;margin-bottom:12px">' +
      '供应商：<b>' + esc(r.supplier) + '</b><br>单据号：' + esc(r.no) + ' · 日期 ' + esc(r.date) + '<br>' +
      '入库明细：<b>' + lines.length + ' 行 / ' + totalQty + ' 件</b><br>' +
      '采购金额：<b style="color:#E54545">' + YF.money(totalAmt) + '</b></div>' +
      '<table class="tbl" style="font-size:12px"><thead><tr><th>商品</th><th class="num">数量</th><th class="num">进价</th><th class="num">入库后库存</th></tr></thead><tbody>' +
      lines.map(l => {
        const p = prod(l.skuId) || {};
        return '<tr><td>' + (p.emoji || '📦') + ' ' + esc(p.name || l.name) + '</td>' +
          '<td class="num">+' + l.qty + '</td><td class="num">' + YF.money(l.price) + '</td>' +
          '<td class="num" style="font-weight:700">' + ((p.stock || 0) + l.qty) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="ok" style="margin-top:12px">同时将按单据进价更新商品成本，并生成一条采购付款流水供对账使用。</div>',
      '确认入库', () => {
        const res = S.addIntake({
          supplier: r.supplier, no: r.no, date: r.date, source: SCAN.source,
          lines: lines.map(l => ({ skuId: l.skuId, name: (prod(l.skuId) || {}).name || l.name, spec: l.spec, qty: l.qty, price: l.price, confidence: l.confidence }))
        });
        modalEl.innerHTML = '';
        if (!res.ok) { toast(res.msg); return; }
        SCAN.img = null; SCAN.res = null; SCAN.err = '';
        toast('入库成功：' + res.intake.no + ' · ' + res.intake.totalQty + ' 件已写入库存');
        render();
      });
  }
  function intakeDetail(id) {
    const it = st().intakes.find(x => x.id === id);
    if (!it) return;
    modal('入库单 ' + it.no,
      '<div style="font-size:12px;color:#8A8F98;margin-bottom:10px">' + esc(it.supplier) + ' · ' + YF.fmtTime(it.ts) +
      ' · ' + (it.status === 'done' ? '已入库' : '已撤销') + '</div>' +
      '<table class="tbl" style="font-size:12px"><thead><tr><th>商品</th><th class="num">数量</th><th class="num">进价</th><th class="num">金额</th><th>置信度</th></tr></thead><tbody>' +
      it.lines.map(l => {
        const p = prod(l.skuId) || {};
        return '<tr><td>' + (p.emoji || '📦') + ' ' + esc(p.name || l.name) + '</td>' +
          '<td class="num">' + l.qty + '</td><td class="num">' + YF.money(l.price) + '</td>' +
          '<td class="num" style="font-weight:700">' + YF.money(l.qty * (l.price || 0)) + '</td>' +
          '<td>' + confBar(l.confidence || 0.9) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div style="margin-top:12px;display:flex;justify-content:space-between;font-weight:800">' +
      '<span>合计</span><span>' + it.totalQty + ' 件 · ' + YF.money(it.totalAmount) + '</span></div>', null, null);
  }

  /* ---------- 渲染 ---------- */
  const TITLES = {
    dash: ['经营概览', '门店实时经营数据总览'],
    shop: ['门店设置', '门店名称 · 地址 · 电话 · 营业时间 · 公告 · 配送范围'],
    gbuy: ['拼团管理', '发起拼团 · 成团进度 · 超时自动退款'],
    intake: ['智能入库', '拍照识别入库单 · 一键写入库存'],
    sales: ['销售盘点', '销售趋势 · 分类构成 · 热销榜'],
    recon: ['自动对账', '订单金额与资金流水自动勾稽'],
    orders: ['订单管理', '全渠道订单处理'],
    bulk: ['企业采购审核', 'B 端采购单审批与结算'],
    after: ['售后处理', '退款工单与坏果赔付'],
    products: ['商品管理', '上下架 · 三档价格体系'],
    stock: ['库存盘点', '库存预警 · 出入库流水'],
    members: ['会员管理', '等级体系 · 权益配置'],
    recharge: ['充值与余额', '会员卡充值 · 核销 · 预收负债']
  };
  function render() {
    sideEl.innerHTML = '<div class="brand">🍊<span>云峰水果大卖场<small>商家管理后台</small></span></div>' +
      NAV.map(g => '<div class="grp">' + g.grp + '</div>' +
        g.items.map(it => '<button data-page="' + it.k + '" class="' + (UI.page === it.k ? 'on' : '') + '">' +
          '<span>' + it.i + '</span><span>' + it.t + '</span></button>').join('')).join('');

    const html = ({
      dash: pageDash, sales: pageSales, recon: pageRecon, orders: pageOrders,
      bulk: pageBulk, after: pageAfter, intake: pageIntake, products: pageProducts,
      stock: pageStock, members: pageMembers, recharge: pageRecharge,
      shop: pageShop, gbuy: pageGroupBuy
    })[UI.page]();
    mainEl.innerHTML = html;
    titleEl.textContent = TITLES[UI.page][0];
    subEl.textContent = TITLES[UI.page][1];
    bind();
  }
  function bind() {
    const kw = document.getElementById('pkw');
    if (kw) kw.addEventListener('input', e => { UI.kw = e.target.value; render(); const n = document.getElementById('pkw'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } });
    const skw = document.getElementById('skw');
    if (skw) skw.addEventListener('input', e => { UI.kw = e.target.value; render(); const n = document.getElementById('skw'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } });
    const pc = document.getElementById('pcat');
    if (pc) pc.onchange = e => { UI.cat = e.target.value; render(); };
    const ps = document.getElementById('pst');
    if (ps) ps.onchange = e => { UI.status = e.target.value; render(); };
    const rr = document.getElementById('runRecon');
    if (rr) rr.onclick = () => { toast('已重新执行自动对账，全部账目已勾稽'); render(); };
    const ap = document.getElementById('addProd');
    if (ap) ap.onclick = () => toast('演示版暂未开放新增商品');

    /* 门店设置 */
    const ss = document.getElementById('shopSave');
    if (ss) ss.onclick = () => {
      const name = (document.getElementById('shName').value || '').trim();
      const phone = (document.getElementById('shPhone').value || '').trim();
      if (!name) { toast('门店名称不能为空'); return; }
      S.updateShop({
        name, phone,
        address: (document.getElementById('shAddr').value || '').trim(),
        hours: (document.getElementById('shHours').value || '').trim(),
        notice: document.getElementById('shNotice').value,
        delivery: document.getElementById('shDelivery').value
      });
      toast('门店设置已保存，顾客端已同步');
      render();
    };
    const sr2 = document.getElementById('shopReset');
    if (sr2) sr2.onclick = () => {
      S.updateShop(JSON.parse(JSON.stringify(YF.SHOP_INFO)));
      toast('已恢复默认门店信息');
      render();
    };

    /* 拼团管理 */
    const gc = document.getElementById('gbCreate');
    if (gc) gc.onclick = () => {
      const r = S.gbCreate({
        pid: document.getElementById('gbPid').value,
        price: parseFloat(document.getElementById('gbPrice').value),
        need: parseInt(document.getElementById('gbNeed').value, 10),
        hours: parseFloat(document.getElementById('gbHours').value)
      });
      toast(r.ok ? '拼团已发起：' + r.gb.id + '（' + r.gb.need + ' 人团 · ¥' + r.gb.price.toFixed(2) + '）' : r.msg);
      render();
    };
    mainEl.querySelectorAll('[data-gb]').forEach(el => el.onclick = () => {
      const a = el.getAttribute('data-gb');
      const gid = el.getAttribute('data-id');
      if (a === 'sim') {
        const r = S.gbSimulate(gid, 1);
        toast(r.ok ? (r.formed ? '拼团成功！订单已进入待自提' : '已模拟 1 人参团：' + r.gb.members.length + '/' + r.gb.need + ' 人') : r.msg);
        render();
      } else if (a === 'force') {
        const r = S.gbForce(gid);
        toast(r.ok ? '已强制成团' : r.msg);
        render();
      } else if (a === 'close') {
        const g = S.gbOf(gid);
        modal('终止拼团 ' + g.id,
          '<div style="font-size:13px;line-height:1.8">确认终止「' + esc(g.name) + '」的拼团吗？<br>' +
          '已付款的团员订单将全额退款到会员卡余额，并生成退款流水。</div>', '确认终止', () => {
            modalEl.innerHTML = '';
            const r = S.gbClose(gid, '商家主动终止拼团');
            toast(r.ok ? '已终止，' + r.refunded.length + ' 笔订单已退款到会员卡' : r.msg);
            render();
          });
      } else if (a === 'detail') {
        gbDetail(gid);
      }
    });

    // 侧边栏菜单 + 页面内的快捷入口都要能跳页
    [sideEl, mainEl].forEach(root => {
      root.querySelectorAll('[data-page]').forEach(el => el.onclick = () => { UI.page = el.getAttribute('data-page'); render(); });
    });
    mainEl.querySelectorAll('[data-ordtab]').forEach(el => el.onclick = () => { UI.ordStatus = el.getAttribute('data-ordtab'); render(); });
    mainEl.querySelectorAll('[data-toggle]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-toggle');
      S.toggleProduct(id);
      toast((prod(id).on ? '已上架：' : '已下架：') + prod(id).name);
      render();
    });
    mainEl.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => editPrice(el.getAttribute('data-edit')));
    mainEl.querySelectorAll('[data-stock]').forEach(el => el.onclick = () => editStock(el.getAttribute('data-stock')));
    mainEl.querySelectorAll('[data-next]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-next');
      const o = ord(id);
      S.advanceOrder(id);
      toast('订单 ' + o.no + ' 已推进至「' + YF.STATUS[ord(id).status].label + '」');
      render();
    });
    mainEl.querySelectorAll('[data-audit]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-id');
      const ok = el.getAttribute('data-audit') === 'ok';
      const o = ord(id);
      if (ok) {
        S.advanceOrder(id);
        toast('采购单 ' + o.no + ' 审核通过，已通知客户付款');
      } else {
        S.cancelOrder(id);
        toast('采购单 ' + o.no + ' 已驳回');
      }
      render();
    });
    mainEl.querySelectorAll('[data-markpay]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-markpay');
      const o = ord(id);
      const now = Date.now();
      o.payMethod = o.mode === 'bulk' ? 'credit' : 'online';
      o.status = o.mode === 'group' ? 'grouping' : 'accepted';
      o.timeline.push({ t: now, text: '商家标记已收款（' + S.payName(o.payMethod) + '）' });
      st().transactions.unshift({ id: 'T' + now, ts: now, type: o.mode === 'bulk' ? 'credit' : 'online', amount: o.total, channel: o.mode === 'bulk' ? '对公转账' : '线下收款', orderNo: o.no, status: 'success', memo: '后台标记收款' });
      S.save();
      toast('已标记为已付款');
      render();
    });
    mainEl.querySelectorAll('[data-ref]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-id');
      S.finishRefund(id, el.getAttribute('data-ref') === 'ok');
      toast(el.getAttribute('data-ref') === 'ok' ? '退款已处理，金额原路退回' : '售后申请已驳回');
      render();
    });
    mainEl.querySelectorAll('[data-odetail]').forEach(el => el.onclick = () => orderDetail(el.getAttribute('data-odetail')));

    /* 智能入库 */
    const bf = document.getElementById('billFile');
    if (bf) bf.onchange = e => { onFilePicked(e.target.files && e.target.files[0]); if (bf) bf.value = ''; };
    mainEl.querySelectorAll('[data-intake]').forEach(el => {
      const a = el.getAttribute('data-intake');
      const idx = +el.getAttribute('data-idx');
      el.onclick = () => {
        if (a === 'pick') { pickFile(); return; }
        if (a === 'sample') {
          const t = buildThumbs()[idx] || buildThumbs()[0];
          if (t && t.url) startScan(t.url, 'sample');
          else toast('当前环境不支持生成示例单据');
          return;
        }
        if (a === 'rescan') { if (SCAN.img) startScan(SCAN.img, SCAN.source); else toast('请先上传一张入库单'); return; }
        if (a === 'cancel') { SCAN.img = null; SCAN.res = null; SCAN.err = ''; render(); return; }
        if (a === 'delline') { SCAN.res.lines.splice(idx, 1); render(); return; }
        if (a === 'submit') { submitIntake(); return; }
        if (a === 'detail') { intakeDetail(el.getAttribute('data-id')); return; }
        if (a === 'revert') {
          const id = el.getAttribute('data-id');
          const it = st().intakes.find(x => x.id === id);
          modal('撤销入库单', '<div style="font-size:13px;line-height:1.8">确认撤销入库单 <b>' + esc(it.no) + '</b> 吗？<br>' +
            '系统将按原数量反向扣减库存（' + it.totalQty + ' 件），并冲销采购金额 ' + YF.money(it.totalAmount) + '。</div>',
            '确认撤销', () => {
              modalEl.innerHTML = '';
              const r = S.revertIntake(id);
              toast(r.ok ? '已撤销，库存与采购流水已冲销' : r.msg);
              render();
            });
          return;
        }
      };
    });
    // 明细行编辑
    mainEl.querySelectorAll('.lnChk').forEach(el => el.onchange = e => {
      SCAN.res.lines[+el.getAttribute('data-idx')].checked = e.target.checked; render();
    });
    mainEl.querySelectorAll('.lnSku').forEach(el => el.onchange = e => {
      const l = SCAN.res.lines[+el.getAttribute('data-idx')];
      const pid = e.target.value;
      l.skuId = pid;
      const p = prod(pid);
      if (p) { l.skuName = p.name; l.emoji = p.emoji; l.confidence = Math.min(0.99, l.confidence + 0.15); }
      else l.confidence = Math.max(0.3, l.confidence - 0.2);
      render();
    });
    mainEl.querySelectorAll('.lnQty').forEach(el => el.onchange = e => {
      const v = parseInt(e.target.value, 10);
      SCAN.res.lines[+el.getAttribute('data-idx')].qty = isFinite(v) && v > 0 ? v : 1;
      render();
    });
    mainEl.querySelectorAll('.lnPrice').forEach(el => el.onchange = e => {
      const v = parseFloat(e.target.value);
      SCAN.res.lines[+el.getAttribute('data-idx')].price = isFinite(v) && v >= 0 ? v : 0;
      render();
    });
    const chkAll = document.getElementById('chkAll');
    if (chkAll) chkAll.onchange = e => {
      SCAN.res.lines.forEach(l => { l.checked = e.target.checked; });
      render();
    };
  }

  function editPrice(pid) {
    const p = prod(pid);
    modal('调整价格 · ' + p.name,
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">' +
      '<span style="font-size:34px">' + p.emoji + '</span><div><div style="font-weight:700">' + esc(p.name) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98">' + esc(p.spec) + ' · 当前库存 ' + p.stock + '</div></div></div>' +
      '<div class="mf"><label>外卖零售价</label><input id="f1" type="number" step="0.1" value="' + p.retail + '"></div>' +
      '<div class="mf"><label>团购价</label><input id="f2" type="number" step="0.1" value="' + p.group + '"></div>' +
      '<div class="mf"><label>批发起步价</label><input id="f3" type="number" step="0.1" value="' + p.bulk[0].price + '"></div>' +
      '<div style="font-size:11px;color:#8A8F98">提示：团购价通常低于零售价 15%，批发价低于零售价 25% 起，阶梯价会同步按此比例重算。</div>',
      '保存', () => {
        const r = parseFloat(document.getElementById('f1').value);
        const g = parseFloat(document.getElementById('f2').value);
        const b = parseFloat(document.getElementById('f3').value);
        if (!(r > 0 && g > 0 && b > 0)) { toast('价格必须大于 0'); return; }
        const ratio = p.bulk.map(t => +(b * (t.price / p.bulk[0].price)).toFixed(2));
        S.updateProduct(pid, { retail: r, group: g, bulk: p.bulk.map((t, i) => ({ min: t.min, price: ratio[i] })) });
        modalEl.innerHTML = ''; toast('价格已更新'); render();
      });
  }
  function editStock(pid) {
    const p = prod(pid);
    modal('库存盘点 · ' + p.name,
      '<div style="display:flex;gap:10px;align-items:center;margin-bottom:14px">' +
      '<span style="font-size:34px">' + p.emoji + '</span><div><div style="font-weight:700">' + esc(p.name) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98">当前库存 ' + p.stock + ' 件</div></div></div>' +
      '<div class="mf"><label>调整类型</label><select id="s1"><option value="1">采购入库（增加）</option><option value="-1">报损出库（减少）</option></select></div>' +
      '<div class="mf"><label>调整数量</label><input id="s2" type="number" value="50"></div>' +
      '<div class="mf"><label>备注</label><input id="s3" value="门店盘点调整"></div>',
      '提交盘点', () => {
        const sign = +document.getElementById('s1').value;
        const n = parseInt(document.getElementById('s2').value, 10);
        const memo = document.getElementById('s3').value || '门店盘点调整';
        if (!n || n <= 0) { toast('数量必须大于 0'); return; }
        S.adjustStock(pid, sign * n, memo);
        modalEl.innerHTML = ''; toast('库存已调整，当前 ' + prod(pid).stock + ' 件'); render();
      });
  }
  function orderDetail(oid) {
    const o = ord(oid);
    if (!o) return;
    const body = '<div style="font-size:12px;color:#8A8F98;margin-bottom:10px">' + esc(o.no) + ' · ' + YF.fmtTime(o.createdAt) + ' · ' + YF.MODES[o.mode].name + '</div>' +
      '<table class="tbl" style="font-size:12px"><thead><tr><th>商品</th><th>规格</th><th class="num">单价</th><th class="num">数量</th><th class="num">小计</th></tr></thead><tbody>' +
      o.items.map(i => '<tr><td>' + i.emoji + ' ' + esc(i.name) + '</td><td style="color:#8A8F98">' + esc(i.spec) + '</td>' +
        '<td class="num">¥' + i.price.toFixed(2) + '</td><td class="num">' + i.qty + '</td>' +
        '<td class="num" style="font-weight:700">' + YF.money(i.price * i.qty) + '</td></tr>').join('') +
      '</tbody></table>' +
      '<div style="margin-top:12px;font-size:12px;line-height:1.9">' +
      '<div style="display:flex;justify-content:space-between"><span>商品小计</span><span>' + YF.money(o.subtotal) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between"><span>优惠合计</span><span>-' + YF.money(o.levelCut + o.couponCut + o.pointsCut) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between"><span>配送费</span><span>' + YF.money(o.deliveryFee) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-weight:800;font-size:14px;margin-top:6px;padding-top:6px;border-top:1px dashed #ECEFF1">' +
      '<span>实付</span><span style="color:#E54545">' + YF.money(o.total) + '</span></div></div>' +
      '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #ECEFF1">' +
      '<div style="font-size:12px;font-weight:700;margin-bottom:8px">操作日志</div>' +
      o.timeline.slice().reverse().map(t => '<div style="font-size:11px;color:#8A8F98;padding:2px 0">· ' + YF.fmtTime(t.t) + ' ' + esc(t.text) + '</div>').join('') +
      '</div>';
    modal('订单详情 ' + o.no, body, null, null);
  }

  document.getElementById('backApp').onclick = () => { location.href = 'index.html'; };

  S.load();
  const closed0 = S.gbTick();
  render();
  if (closed0.length) {
    setTimeout(() => toast(closed0.length + ' 个拼团超时未成团，已自动退款到会员卡余额'), 400);
  }

  /* 拼团倒计时刷新 + 超时自动退款扫描 */
  let cdN = 0;
  setInterval(() => {
    document.querySelectorAll('[data-cd]').forEach(el => {
      const end = +el.getAttribute('data-end');
      if (isFinite(end)) el.textContent = fmtLeft(end - Date.now());
    });
    cdN++;
    if (cdN % 10 === 0) {
      const c = S.gbTick();
      if (c.length) {
        const amt = c.reduce((s, x) => s + x.amount, 0);
        toast(c.length + ' 个拼团超时未成团，已自动退款 ' + YF.money(amt) + ' 到会员卡');
        render();
      }
    }
  }, 1000);
})();
