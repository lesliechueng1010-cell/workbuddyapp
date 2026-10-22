/* =========================================================
 * 云峰鲜果 · 顾客端 App
 * ========================================================= */
(function () {
  const S = YF.store;
  const $ = id => document.getElementById(id);
  const view = $('view'), tabbar = $('tabbar'), modalRoot = $('modalRoot'), toastRoot = $('toastRoot');

  const UI = {
    tab: 'home',
    mode: 'takeaway',
    cat: 'rec',
    kw: '',
    sort: 'sales',
    ordFilter: 'all',
    checkout: null, // {addrId, pickupId, leaderId, couponId, usePoints, invoice}
    payingOrder: null
  };

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg) {
    toastRoot.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toastRoot.innerHTML = ''; }, 1900);
  }
  function sheet(title, bodyHTML, footHTML) {
    modalRoot.innerHTML =
      '<div class="mask" data-act="close-mask">' +
      '<div class="sheet" data-stop="1">' +
      '<div class="sheet-head"><span>' + esc(title) + '</span><button class="x" data-act="close">✕</button></div>' +
      '<div class="sheet-body">' + bodyHTML + '</div>' +
      (footHTML ? '<div class="sheet-foot">' + footHTML + '</div>' : '') +
      '</div></div>';
    modalRoot.querySelector('[data-stop]').addEventListener('click', e => e.stopPropagation());
  }
  function closeSheet() { modalRoot.innerHTML = ''; }
  function confirmBox(title, msg, okText, onOk) {
    modalRoot.innerHTML =
      '<div class="mask" data-act="close-mask"><div class="sheet" data-stop="1" style="max-height:none">' +
      '<div class="sheet-body" style="text-align:center;padding:26px 20px 10px">' +
      '<div style="font-size:34px">' + (title.emoji || '❓') + '</div>' +
      '<div style="font-size:16px;font-weight:700;margin-top:8px">' + esc(title.text || title) + '</div>' +
      '<div style="font-size:13px;color:#8A8F98;margin-top:6px;line-height:1.6">' + msg + '</div>' +
      '</div><div class="sheet-foot" style="display:flex;gap:10px">' +
      '<button class="btn gray" data-act="close" style="flex:1">取消</button>' +
      '<button class="btn" id="cfmOk" style="flex:1">' + esc(okText) + '</button>' +
      '</div></div></div>';
    modalRoot.querySelector('[data-stop]').addEventListener('click', e => e.stopPropagation());
    $('cfmOk').onclick = () => { closeSheet(); onOk && onOk(); };
  }
  const st = () => S.get();
  const prod = id => st().products.find(p => p.id === id);

  /* ---------- 价格显示 ---------- */
  function priceLine(p, mode) {
    if (mode === 'takeaway') {
      return '<span class="now"><small>¥</small>' + p.retail.toFixed(2) + '</span>' +
        '<span class="old">¥' + (p.retail * 1.18).toFixed(2) + '</span>';
    }
    if (mode === 'group') {
      return '<span class="now"><small>¥</small>' + p.group.toFixed(2) + '</span>' +
        '<span class="old">¥' + p.retail.toFixed(2) + '</span>';
    }
    const b0 = p.bulk[0];
    const more = p.bulk.length > 1 ? '<span class="chip" style="margin-left:4px">≥' + p.bulk[1].min + '件 ' + p.bulk[1].price + '</span>' : '';
    return '<span class="now"><small>¥</small>' + b0.price.toFixed(2) + '</span>' +
      '<span class="old">¥' + p.retail.toFixed(2) + '</span>' + more;
  }

  function prodCard(p, mode) {
    const qty = (S.cart(mode).find(i => i.id === p.id) || {}).qty || 0;
    const soldOut = p.stock <= 0 || !p.on;
    return '<div class="prod" data-act="pd" data-id="' + p.id + '">' +
      '<div class="thumb">' + p.emoji +
      (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') +
      (soldOut ? '<span class="off">已售罄</span>' : '') +
      '</div>' +
      '<div class="body">' +
      '<div class="nm">' + esc(p.name) + '</div>' +
      '<div class="sp">' + esc(p.spec) + ' · ' + esc(p.origin) + '</div>' +
      '<div class="pr">' + priceLine(p, mode) + '</div>' +
      '<div class="meta"><span>已售 ' + p.sales + '</span><span>库存 ' + p.stock + '</span></div>' +
      '</div>' +
      (soldOut ? '' : '<button class="add" data-act="add" data-id="' + p.id + '">+</button>') +
      '</div>';
  }

  /* ---------- 头部 ---------- */
  function head() {
    const m = YF.MODES[UI.mode];
    const u = st().user;
    return '<div class="app-head">' +
      '<div class="title">🍊 云峰鲜果 <span style="font-size:11px;font-weight:400;opacity:.85">10 年老品牌 · 全球鲜果直采</span></div>' +
      '<div class="loc-bar"><span>📍 配送范围：南京市内（2 小时达）</span><span>' + esc(u.name) + ' ▾</span></div>' +
      '<div class="search-box"><span>🔍</span><span>搜索「' + m.short + '」商品，如 车厘子 / 果篮</span></div>' +
      '</div>';
  }

  function modeSwitch() {
    return '<div class="mode-switch">' +
      Object.values(YF.MODES).map(m =>
        '<button data-act="mode" data-mode="' + m.key + '" class="' + (UI.mode === m.key ? 'on' : '') + '">' +
        '<div class="mi">' + m.icon + '</div>' +
        '<div class="mn">' + m.name + '</div>' +
        '<div class="md">' + m.desc + '</div>' +
        '</button>').join('') +
      '</div>';
  }

  function catBar() {
    return '<div class="card pad" style="padding:10px 6px"><div class="cat-grid">' +
      YF.CATEGORIES.map(c =>
        '<button data-act="cat" data-cat="' + c.id + '" class="' + (UI.cat === c.id ? 'on' : '') + '">' +
        '<div class="ci">' + c.icon + '</div>' + c.name + '</button>').join('') +
      '</div></div>';
  }

  function prodList(mode, list) {
    if (!list.length) return '<div class="empty"><div class="ee">🍃</div><p>该分类暂无商品</p></div>';
    return '<div class="prod-grid">' + list.map(p => prodCard(p, mode)).join('') + '</div>';
  }

  function filtered() {
    let list = st().products.filter(p => p.on && p.cats.includes(UI.cat));
    if (UI.kw) list = list.filter(p => p.name.includes(UI.kw) || p.origin.includes(UI.kw));
    if (UI.sort === 'sales') list.sort((a, b) => b.sales - a.sales);
    else if (UI.sort === 'price') list.sort((a, b) => YF.priceOf(a, UI.mode, 1) - YF.priceOf(b, UI.mode, 1));
    else list.sort((a, b) => b.stock - a.stock);
    return list;
  }

  /* ---------- 首页 ---------- */
  function renderHome() {
    const m = YF.MODES[UI.mode];
    let extra = '';
    if (UI.mode === 'group') {
      const g = st().groupMode;
      const leader = YF.GROUP_LEADERS.find(l => l.id === g.leaderId);
      const pickup = YF.PICKUP_POINTS.find(p => p.id === g.pickupId);
      extra =
        '<div class="card pad" style="margin-top:-4px">' +
        '<div class="row" style="padding:0 0 10px"><span style="font-size:24px">' + leader.avatar + '</span>' +
        '<div class="grow"><div class="rt">' + esc(leader.name) + ' · ' + esc(leader.area) + ' <span class="chip">' + leader.members + ' 位团员</span></div>' +
        '<div class="rs">当前开团中，成团后次日 16:00 后可自提</div></div>' +
        '<button class="btn sm ghost" data-act="pick-leader">换团长</button></div>' +
        '<div style="background:#F7F9F8;border-radius:10px;padding:10px;display:flex;gap:8px;align-items:flex-start">' +
        '<span>🏪</span><div style="flex:1"><div style="font-size:13px;font-weight:600">' + esc(pickup.name) + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">' + esc(pickup.addr) + ' · ' + esc(pickup.hours) + '</div></div>' +
        '<button class="btn sm ghost" data-act="pick-pickup">换点</button></div>' +
        '</div>';
    } else if (UI.mode === 'bulk') {
      const c = st().user.company;
      extra =
        '<div class="card pad" style="margin-top:-4px">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:24px">🏢</span>' +
        '<div style="flex:1"><div style="font-size:14px;font-weight:700">' + esc(c.name) + (c.verified ? ' <span class="chip blue">已认证</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">账期 ' + c.creditDays + ' 天 · 授信额度 ' + YF.money(c.creditLimit) + ' · 支持增值税专票</div></div>' +
        '</div>' +
        '<div class="ok" style="margin-top:10px">📈 阶梯批发：采购量越大单价越低，满 1000 元专车免费配送</div>' +
        '</div>';
    }

    const banner = UI.mode === 'takeaway'
      ? '<div class="banner"><div class="bn-emoji">🛵</div><h2>今日鲜采 · 2 小时到家</h2><p>早市 08:00 直采，满 39 元免配送费，坏果包赔</p></div>'
      : UI.mode === 'group'
        ? '<div class="banner green"><div class="bn-emoji">👥</div><h2>社区团购 · 比零售省 15%</h2><p>20 人成团，次日自提点取货，不成团自动全额退</p></div>'
        : '<div class="banner blue"><div class="bn-emoji">🏢</div><h2>企业采购 · 阶梯批发价</h2><p>专属客户经理 · 对公转账 · 30 天账期 · 增值税专票</p></div>';

    return head() + modeSwitch() +
      '<div style="padding:0 12px">' + banner + '</div>' + extra +
      '<div style="padding:0 12px">' + catBar() + '</div>' +
      '<div class="section"><div class="section-head"><h3>' + YF.CATEGORIES.find(c => c.id === UI.cat).name +
      ' <span class="chip orange" style="margin-left:4px">' + m.unitLabel + '</span></h3>' +
      '<span class="more">共 ' + filtered().length + ' 件</span></div>' +
      prodList(UI.mode, filtered()) + '</div>';
  }

  /* ---------- 商城 ---------- */
  function renderMall() {
    const m = YF.MODES[UI.mode];
    return '<div class="app-head orange"><div class="title">🛒 鲜果商城<span style="font-size:11px;font-weight:400;opacity:.85">当前：' + m.name + '（' + m.unitLabel + '）</span></div>' +
      '<div class="search-box"><span>🔍</span><input id="kwInput" placeholder="搜索商品 / 产地" value="' + esc(UI.kw) + '" style="border:none;outline:none;flex:1;background:transparent;color:#333"></div></div>' +
      modeSwitch() +
      '<div style="padding:0 12px">' + catBar() + '</div>' +
      '<div class="section" style="margin-top:8px">' +
      '<div class="section-head"><h3>' + YF.CATEGORIES.find(c => c.id === UI.cat).name + '</h3>' +
      '<div style="display:flex;gap:6px">' +
      ['sales:销量', 'price:价格', 'stock:库存'].map(s => {
        const [k, n] = s.split(':');
        return '<button class="chip ' + (UI.sort === k ? 'orange' : 'gray') + '" data-act="sort" data-sort="' + k + '">' + n + '</button>';
      }).join('') + '</div></div>' +
      prodList(UI.mode, filtered()) + '</div>';
  }

  /* ---------- 订单 ---------- */
  const FILTERS = { all: '全部', unpaid: '待付款', ing: '进行中', done: '已完成', after: '售后' };
  function matchFilter(o) {
    if (UI.ordFilter === 'all') return true;
    if (UI.ordFilter === 'unpaid') return o.status === 'unpaid' || o.status === 'auditing';
    if (UI.ordFilter === 'ing') return ['accepted', 'delivering', 'grouping', 'pickup', 'delivered'].includes(o.status);
    if (UI.ordFilter === 'done') return o.status === 'done';
    if (UI.ordFilter === 'after') return ['refunding', 'refunded', 'canceled'].includes(o.status);
    return true;
  }
  function ordCard(o) {
    const s = YF.STATUS[o.status];
    const m = YF.MODES[o.mode];
    return '<div class="ord" data-act="ord-detail" data-id="' + o.id + '">' +
      '<div class="ord-head">' +
      '<div><span class="chip ' + (o.mode === 'bulk' ? 'blue' : o.mode === 'group' ? '' : 'orange') + '">' + m.icon + ' ' + m.short + '</span> ' +
      '<span class="ord-no">' + esc(o.no) + '</span></div>' +
      '<div class="ord-st" style="color:' + s.color + '">' + s.label + '</div></div>' +
      '<div class="ord-items">' +
      o.items.slice(0, 3).map(i =>
        '<div class="ord-item"><span class="oi-emo">' + i.emoji + '</span>' +
        '<span class="oi-nm">' + esc(i.name) + ' <span style="color:#8A8F98">' + esc(i.spec) + '</span></span>' +
        '<span class="oi-q">×' + i.qty + '</span>' +
        '<span style="font-weight:600">' + YF.money(i.price * i.qty) + '</span></div>').join('') +
      (o.items.length > 3 ? '<div style="font-size:11px;color:#8A8F98;padding-top:4px">还有 ' + (o.items.length - 3) + ' 件商品…</div>' : '') +
      '</div>' +
      '<div class="ord-foot">' +
      '<div style="font-size:11px;color:#8A8F98">' + YF.fmtTime(o.createdAt) + '</div>' +
      '<div><span style="font-size:11px;color:#8A8F98">实付 </span><span class="amt">' + YF.money(o.total) + '</span></div>' +
      '</div>' +
      orderActions(o) +
      '</div>';
  }
  function orderActions(o) {
    let acts = '';
    if (o.status === 'unpaid') {
      acts += '<button class="mini primary" data-act="pay-now" data-id="' + o.id + '">立即付款</button>';
      acts += '<button class="mini" data-act="cancel" data-id="' + o.id + '">取消订单</button>';
    } else if (o.status === 'auditing') {
      acts += '<button class="mini" data-act="cancel" data-id="' + o.id + '">撤回申请</button>';
    } else if (['accepted', 'delivering', 'grouping'].includes(o.status)) {
      acts += '<button class="mini primary" data-act="advance" data-id="' + o.id + '">' +
        (o.status === 'grouping' ? '模拟成团' : '催一下 / 模拟下一步') + '</button>';
      if (o.status === 'accepted' || o.status === 'delivering') {
        acts += '<button class="mini danger" data-act="refund" data-id="' + o.id + '">申请售后</button>';
      }
    } else if (o.status === 'delivered' || o.status === 'pickup') {
      acts += '<button class="mini primary" data-act="advance" data-id="' + o.id + '">确认完成</button>';
      acts += '<button class="mini danger" data-act="refund" data-id="' + o.id + '">申请售后</button>';
    } else if (o.status === 'done') {
      acts += '<button class="mini" data-act="reorder" data-id="' + o.id + '">再来一单</button>';
      acts += '<button class="mini danger" data-act="refund" data-id="' + o.id + '">申请售后</button>';
    }
    if (o.status === 'refunding') acts += '<span class="chip red">售后处理中，商家将在 2 小时内响应</span>';
    if (!acts) return '';
    return '<div class="ord-foot" style="border-top:1px dashed #ECEFF1"><div class="ord-acts" style="width:100%">' + acts + '</div></div>';
  }
  function renderOrders() {
    const list = st().orders.filter(matchFilter);
    return '<div class="app-head"><div class="title">📋 我的订单</div>' +
      '<div class="sub">共 ' + st().orders.length + ' 笔订单 · 售后 2 小时内响应</div></div>' +
      '<div style="display:flex;gap:6px;padding:10px 12px 0;overflow-x:auto">' +
      Object.keys(FILTERS).map(k =>
        '<button class="chip ' + (UI.ordFilter === k ? 'orange' : 'gray') + '" data-act="ordf" data-f="' + k + '" style="padding:6px 12px;font-size:12px">' + FILTERS[k] + '</button>').join('') +
      '</div>' +
      '<div class="section">' + (list.length ? list.map(ordCard).join('') :
        '<div class="empty"><div class="ee">📦</div><p>暂无相关订单</p></div>') + '</div>';
  }

  /* ---------- 我的 ---------- */
  function renderMe() {
    const u = st().user;
    const lv = YF.levelOf(u.totalSpend);
    const nextLv = YF.LEVELS[YF.LEVELS.findIndex(l => l.key === lv.key) + 1];
    const unused = u.coupons.filter(c => !c.used).length;
    const pending = st().orders.filter(o => ['unpaid', 'auditing'].includes(o.status)).length;
    const ing = st().orders.filter(o => ['accepted', 'delivering', 'grouping', 'pickup'].includes(o.status)).length;

    return '<div class="app-head" style="padding-bottom:70px">' +
      '<div class="title">👤 我的</div></div>' +
      '<div style="margin-top:-58px">' +
      '<div class="member-card ' + (lv.key === 'normal' ? '' : lv.key) + '">' +
      '<div class="mc-deco">' + lv.icon + '</div>' +
      '<div class="mc-top"><div class="mc-lv">' + lv.icon + ' ' + lv.name + '</div>' +
      '<div style="font-size:11px;opacity:.85">' + esc(u.phone) + '</div></div>' +
      '<div class="mc-lb">会员卡余额</div>' +
      '<div class="mc-bal"><small>¥</small>' + u.balance.toFixed(2) + '</div>' +
      '<div class="mc-foot"><span>积分 ' + u.points + '</span><span>累计消费 ' + YF.money(u.totalSpend) + '</span>' +
      '<span>全场 ' + (lv.discount * 10).toFixed(1) + ' 折</span></div>' +
      (nextLv ? '<div style="margin-top:12px"><div style="font-size:10px;opacity:.85">再消费 ' + YF.money(nextLv.min - u.totalSpend) + ' 升级 ' + nextLv.name + '</div>' +
        '<div class="gp-bar" style="background:rgba(255,255,255,.25)"><i style="width:' + Math.min(100, u.totalSpend / nextLv.min * 100).toFixed(0) + '%;background:#fff"></i></div></div>' : '') +
      '</div></div>' +

      '<div class="section" style="margin-top:4px"><div class="card"><div class="row" style="padding:14px 12px">' +
      ['待付款:' + pending + ':💰', '进行中:' + ing + ':🚚', '优惠券:' + unused + ':🎟️', '积分:' + u.points + ':⭐'].map(s => {
        const [n, v, ic] = s.split(':');
        return '<div style="flex:1;text-align:center" data-act="ordf-jump" data-f="' + (n === '待付款' ? 'unpaid' : n === '进行中' ? 'ing' : 'all') + '">' +
          '<div style="font-size:20px">' + ic + '</div><div style="font-size:16px;font-weight:800;margin-top:2px">' + v + '</div>' +
          '<div style="font-size:11px;color:#8A8F98">' + n + '</div></div>';
      }).join('') +
      '</div></div></div>' +

      '<div class="section"><div class="card">' +
      rowItem('💳', '在线充值', '充 500 送 80 · 充 1000 送 200', 'open-recharge') +
      rowItem('🎟️', '我的优惠券', unused + ' 张可用', 'coupons') +
      rowItem('📍', '收货地址管理', u.addresses.length + ' 个地址', 'addr') +
      rowItem('🏢', '企业认证', u.company.verified ? '已认证 · 账期 30 天' : '未认证', 'company') +
      rowItem('🧾', '发票管理', '支持增值税专用发票', 'invoice') +
      '</div></div>' +

      '<div class="section"><div class="card">' +
      rowItem('🛍️', '积分商城', u.points + ' 积分可兑好礼', 'points') +
      rowItem('🎧', '联系客服', '09:00-21:00 · 坏果包赔', 'cs') +
      rowItem('📖', '会员权益说明', '等级越高折扣越多', 'levels') +
      '</div></div>' +

      '<div class="section"><button class="btn ghost" data-act="goto-admin">🛠️ 进入商家管理后台</button>' +
      '<div style="text-align:center;margin-top:10px"><button class="chip gray" data-act="reset">重置演示数据</button></div>' +
      '<div style="text-align:center;font-size:10px;color:#A8ADB3;margin-top:14px">云峰水果大卖场 · 南京市建邺区 · 客服 400-025-8888</div></div>';
  }
  function rowItem(icon, title, sub, act) {
    return '<div class="row" data-act="' + act + '"><span style="font-size:18px">' + icon + '</span>' +
      '<div class="grow"><div class="rt">' + title + '</div><div class="rs">' + sub + '</div></div>' +
      '<span class="arrow">›</span></div>';
  }

  /* ---------- 购物车条 ---------- */
  function cartBar() {
    if (!['home', 'mall'].includes(UI.tab)) return '';
    const c = S.cart(UI.mode);
    if (!c.length) return '';
    const calc = S.calcCart(UI.mode, UI.checkout || {});
    return '<div class="cart-bar">' +
      '<div class="cb-icon">🛒<span class="cb-num">' + calc.qtyTotal + '</span></div>' +
      '<div class="cb-info"><div class="cb-price">' + YF.money(calc.total) + '</div>' +
      '<div class="cb-tip">' + calc.deliveryText + '</div></div>' +
      '<button class="cb-btn" data-act="checkout">去结算</button></div>';
  }

  /* ---------- 渲染 ---------- */
  function render() {
    let html = '';
    if (UI.tab === 'home') html = renderHome();
    else if (UI.tab === 'mall') html = renderMall();
    else if (UI.tab === 'orders') html = renderOrders();
    else html = renderMe();
    view.innerHTML = html + cartBar();
    view.scrollTop = view._top && view._top[UI.tab] ? view._top[UI.tab] : 0;

    const cnt = S.cartCount();
    tabbar.innerHTML = [
      ['home', '🏠', '首页'], ['mall', '🛍️', '商城'], ['orders', '📋', '订单'], ['me', '👤', '我的']
    ].map(([k, ic, nm]) =>
      '<button data-act="tab" data-tab="' + k + '" class="' + (UI.tab === k ? 'on' : '') + '">' +
      '<span class="tic">' + ic + '</span>' + nm +
      (k === 'orders' && cnt ? '<span class="badge">' + cnt + '</span>' : '') +
      '</button>').join('');

    const kw = $('kwInput');
    if (kw) {
      kw.addEventListener('input', e => { UI.kw = e.target.value; refreshListOnly(); });
    }
  }
  function refreshListOnly() {
    const grid = view.querySelector('.prod-grid');
    if (grid) grid.outerHTML = prodList(UI.mode, filtered());
  }

  /* ---------- 商品详情 ---------- */
  function openProduct(pid) {
    const p = prod(pid);
    if (!p) return;
    const mode = UI.mode;
    const unit = YF.priceOf(p, mode, 1);
    let tierHTML = '';
    if (mode === 'bulk') {
      tierHTML = '<div class="section-head" style="margin-top:16px"><h3>阶梯批发价</h3><span class="more">量大更优</span></div>' +
        '<table class="tier-table"><tr><th>采购量</th><th>单价</th><th>单件省</th></tr>' +
        p.bulk.map((t, i) => {
          const next = p.bulk[i + 1];
          return '<tr class="' + (i === 0 ? 'hit' : '') + '"><td>' + (next ? t.min + ' ~ ' + (next.min - 1) : '≥ ' + t.min) + ' 件</td>' +
            '<td>¥' + t.price.toFixed(2) + '</td><td>省 ¥' + (p.retail - t.price).toFixed(2) + '</td></tr>';
        }).join('') + '</table>';
    }
    const body =
      '<div class="pd-hero">' + p.emoji + '</div>' +
      '<div style="padding:14px 0 0">' +
      '<div style="display:flex;align-items:flex-end;gap:8px">' +
      '<div class="pd-price"><small>¥</small>' + unit.toFixed(2) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98;text-decoration:line-through">¥' + p.retail.toFixed(2) + '</div>' +
      '<span class="chip orange">' + YF.MODES[mode].unitLabel + '</span></div>' +
      '<div style="font-size:16px;font-weight:700;margin-top:6px">' + esc(p.name) + (p.tag ? ' <span class="chip">' + esc(p.tag) + '</span>' : '') + '</div>' +
      '<div style="font-size:12px;color:#8A8F98;margin-top:4px">规格 ' + esc(p.spec) + ' · 产地 ' + esc(p.origin) + '</div>' +
      '<div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:#8A8F98">' +
      '<span>🌡️ 鲜度 ' + p.fresh + ' 分</span><span>📦 库存 ' + p.stock + '</span><span>🔥 已售 ' + p.sales + '</span></div>' +
      tierHTML +
      '<div style="margin-top:14px;background:#F7F9F8;border-radius:10px;padding:12px;font-size:12px;line-height:1.8;color:#555B66">' +
      '✅ <b>坏果包赔</b>：签收 24 小时内拍照即可赔付<br>' +
      '🚚 ' + YF.MODES[mode].desc + '<br>' +
      '❄️ 全程冷链，产地直发，48 小时内到仓' +
      '</div>' +
      '</div>';
    const foot = '<div style="display:flex;align-items:center;gap:12px">' +
      '<div class="stepper"><button data-act="pd-dec">−</button><span class="n" id="pdQty">1</span><button data-act="pd-inc">+</button></div>' +
      '<button class="btn" style="flex:1" data-act="pd-add" data-id="' + p.id + '">加入购物车</button></div>';
    sheet('商品详情', body, foot);
    modalRoot._pdQty = 1;
  }

  /* ---------- 结算 ---------- */
  function openCheckout() {
    const calc = S.calcCart(UI.mode, UI.checkout);
    if (!calc.lines.length) { toast('购物车是空的'); return; }
    UI.checkout = Object.assign({ addrId: null, pickupId: null, leaderId: null, couponId: null, usePoints: false, invoice: null, remark: '' }, UI.checkout);
    const u = st().user;
    const co = UI.checkout;

    // 优惠券
    const coupons = u.coupons.filter(c => !c.used).map(c => {
      const tpl = YF.COUPON_TEMPLATES.find(t => t.id === c.tpl);
      const usable = (tpl.scope === 'all' || tpl.scope === UI.mode) && (calc.subtotal - calc.levelCut) >= tpl.threshold;
      return { uc: c, tpl, usable };
    });

    let deliverHTML = '';
    if (UI.mode === 'takeaway') {
      const addr = u.addresses.find(a => a.id === co.addrId) || u.addresses.find(a => a.isDefault) || u.addresses[0];
      if (addr) co.addrId = addr.id;
      deliverHTML = '<div class="section-head"><h3>配送信息</h3><button class="chip gray" data-act="pick-addr">切换地址</button></div>' +
        '<div class="pick on"><div class="pg"><div class="pt">📍 ' + esc(addr.name) + ' ' + esc(addr.phone) + ' <span class="chip">' + esc(addr.tag) + '</span></div>' +
        '<div class="ps">' + esc(addr.addr) + '</div></div></div>';
    } else if (UI.mode === 'group') {
      const pickup = YF.PICKUP_POINTS.find(p => p.id === co.pickupId) || YF.PICKUP_POINTS.find(p => p.id === st().groupMode.pickupId);
      const leader = YF.GROUP_LEADERS.find(l => l.id === co.leaderId) || YF.GROUP_LEADERS.find(l => l.id === st().groupMode.leaderId);
      co.pickupId = pickup.id; co.leaderId = leader.id;
      deliverHTML = '<div class="section-head"><h3>自提信息</h3><button class="chip gray" data-act="pick-pickup">切换自提点</button></div>' +
        '<div class="pick on"><span style="font-size:20px">🏪</span><div class="pg"><div class="pt">' + esc(pickup.name) + '</div>' +
        '<div class="ps">' + esc(pickup.addr) + ' · ' + esc(pickup.hours) + ' · ' + pickup.distance + '</div></div></div>' +
        '<div style="margin-top:8px" class="pick on"><span style="font-size:20px">' + leader.avatar + '</span>' +
        '<div class="pg"><div class="pt">' + esc(leader.name) + '（' + esc(leader.area) + '）</div>' +
        '<div class="ps">成团后次日 16:00 可自提，不成团自动全额退款</div></div>' +
        '<button class="chip gray" data-act="pick-leader">换团长</button></div>';
    } else {
      const inv = co.invoice || { need: true, type: '增值税专用发票', title: u.company.name, taxNo: u.company.taxNo };
      co.invoice = inv;
      deliverHTML = '<div class="section-head"><h3>开票与结算</h3></div>' +
        '<div class="pick on"><span style="font-size:20px">🧾</span><div class="pg">' +
        '<div class="pt">' + esc(inv.type) + '</div>' +
        '<div class="ps">' + esc(inv.title) + ' · ' + esc(inv.taxNo) + '</div></div>' +
        '<button class="chip gray" data-act="edit-invoice">修改</button></div>' +
        '<div class="ok" style="margin-top:8px">💼 企业采购走对公结算，账期 ' + u.company.creditDays + ' 天，提交后由商务专员审核</div>';
    }

    const body =
      '<div class="section-head"><h3>商品清单（' + calc.qtyTotal + ' 件）</h3>' +
      '<button class="chip gray" data-act="clear-cart">清空</button></div>' +
      '<div class="card">' + calc.lines.map(l =>
        '<div class="row"><span style="font-size:26px">' + l.p.emoji + '</span>' +
        '<div class="grow"><div class="rt">' + esc(l.p.name) + '</div><div class="rs">' + esc(l.p.spec) + ' · ¥' + l.unit.toFixed(2) + '</div></div>' +
        '<div class="stepper"><button data-act="ci-dec" data-id="' + l.p.id + '">−</button><span class="n">' + l.qty + '</span>' +
        '<button data-act="ci-inc" data-id="' + l.p.id + '">+</button></div>' +
        '<div style="width:66px;text-align:right;font-weight:700">' + YF.money(l.amount) + '</div></div>').join('') +
      '</div>' +

      '<div style="margin-top:14px">' + deliverHTML + '</div>' +

      '<div class="section-head" style="margin-top:16px"><h3>优惠</h3></div>' +
      '<div class="card">' +
      '<div class="row"><span style="font-size:18px">🏷️</span><div class="grow"><div class="rt">优惠券</div>' +
      '<div class="rs">' + (coupons.length ? coupons.length + ' 张可用' : '暂无可用优惠券') + '</div></div>' +
      '<button class="chip ' + (co.couponId ? 'orange' : 'gray') + '" data-act="pick-coupon">' + (co.couponId ? calc.couponName : '选择') + '</button></div>' +
      '<div class="row"><span style="font-size:18px">⭐</span><div class="grow"><div class="rt">积分抵扣</div>' +
      '<div class="rs">可用 ' + u.points + ' 积分，最多抵 ' + YF.money(calc.maxPointCut) + '（100 积分 = 1 元）</div></div>' +
      '<div class="switch ' + (co.usePoints ? 'on' : '') + '" data-act="toggle-points"><i></i></div></div>' +
      '</div>' +

      '<div class="section-head" style="margin-top:16px"><h3>费用明细</h3></div>' +
      '<div class="card pad">' +
      feeRow('商品小计', YF.money(calc.subtotal)) +
      feeRow('会员折扣（' + calc.level.name + ' ' + (calc.level.discount * 10).toFixed(1) + ' 折）', '-' + YF.money(calc.levelCut)) +
      (calc.couponCut ? feeRow('优惠券', '-' + YF.money(calc.couponCut)) : '') +
      (calc.pointsCut ? feeRow('积分抵扣（' + calc.pointsUsed + ' 分）', '-' + YF.money(calc.pointsCut)) : '') +
      feeRow('配送费', calc.deliveryFee ? YF.money(calc.deliveryFee) : '免配送费') +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed #ECEFF1">' +
      '<span style="font-size:13px;font-weight:700">应付金额</span>' +
      '<span style="font-size:20px;font-weight:800;color:#E54545">' + YF.money(calc.total) + '</span></div>' +
      '</div>';

    const foot = '<div style="display:flex;align-items:center;gap:12px">' +
      '<div style="flex:1"><div style="font-size:11px;color:#8A8F98">合计</div>' +
      '<div style="font-size:18px;font-weight:800;color:#E54545">' + YF.money(calc.total) + '</div></div>' +
      '<button class="btn" style="width:150px" data-act="submit-order">' +
      (UI.mode === 'bulk' ? '提交采购单' : '提交订单') + '</button></div>';

    sheet(UI.mode === 'bulk' ? '企业采购单确认' : '确认订单', body, foot);
  }
  function feeRow(k, v) {
    return '<div style="display:flex;justify-content:space-between;font-size:12px;color:#555B66;padding:4px 0">' +
      '<span>' + k + '</span><span>' + v + '</span></div>';
  }

  /* ---------- 支付 ---------- */
  function openPay(oid) {
    const o = st().orders.find(x => x.id === oid);
    if (!o) return;
    const u = st().user;
    const methods = [];
    methods.push({ k: 'balance', icon: '💳', name: '会员卡余额', sub: '余额 ' + YF.money(u.balance), dis: u.balance < o.total });
    methods.push({ k: 'online', icon: '💚', name: '微信支付', sub: '推荐使用，支持零钱与银行卡', dis: false });
    if (o.mode === 'bulk') methods.push({ k: 'credit', icon: '🏦', name: '对公转账（账期 ' + u.company.creditDays + ' 天）', sub: '授信额度 ' + YF.money(u.company.creditLimit), dis: false });

    const body = '<div style="text-align:center;padding:6px 0 14px">' +
      '<div style="font-size:11px;color:#8A8F98">订单 ' + esc(o.no) + '</div>' +
      '<div style="font-size:30px;font-weight:800;color:#E54545;margin-top:6px">' + YF.money(o.total) + '</div>' +
      '<div style="font-size:12px;color:#8A8F98;margin-top:4px">' + YF.MODES[o.mode].name + ' · ' + o.items.length + ' 件商品</div></div>' +
      '<div class="pick-list">' + methods.map(m =>
        '<div class="pick ' + (m.dis ? '' : 'on') + '" data-act="pay" data-id="' + o.id + '" data-method="' + m.k + '" style="' + (m.dis ? 'opacity:.5;border-style:dashed' : '') + '">' +
        '<span style="font-size:20px">' + m.icon + '</span><div class="pg"><div class="pt">' + m.name + '</div>' +
        '<div class="ps">' + m.sub + (m.dis ? ' · 余额不足，请先充值' : '') + '</div></div>' +
        '<div class="radio" style="' + (m.dis ? '' : 'border-color:#21A05C;background:#21A05C;box-shadow:inset 0 0 0 3px #fff') + '"></div></div>').join('') +
      '</div>' +
      (u.balance < o.total ? '<button class="btn ghost" style="margin-top:12px" data-act="go-recharge">先去充值</button>' : '');
    sheet('选择支付方式', body, '');
  }

  /* ---------- 充值 ---------- */
  function openRecharge() {
    const u = st().user;
    const body =
      '<div class="member-card" style="margin:0 0 14px"><div class="mc-lb">当前余额</div>' +
      '<div class="mc-bal"><small>¥</small>' + u.balance.toFixed(2) + '</div>' +
      '<div class="mc-foot"><span>充值即赠积分</span><span>余额可直接结账</span></div></div>' +
      '<div class="section-head"><h3>选择充值金额</h3><span class="more">多充多送</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
      YF.RECHARGE_PLANS.map(p =>
        '<div class="pick" data-act="recharge" data-amount="' + p.amount + '" style="flex-direction:column;align-items:flex-start;gap:2px">' +
        '<div style="font-size:20px;font-weight:800">¥' + p.amount + (p.hot ? ' <span class="chip orange">热门</span>' : '') + '</div>' +
        '<div style="font-size:12px;color:#E54545;font-weight:600">赠 ¥' + p.gift + '</div>' +
        '<div style="font-size:10px;color:#8A8F98">实到 ¥' + (p.amount + p.gift) + '</div></div>').join('') +
      '</div>' +
      '<div style="margin-top:14px" class="ok">💳 演示环境：点击金额即模拟支付成功，余额实时到账并生成对账流水</div>';
    sheet('会员卡在线充值', body, '');
  }

  /* ---------- 订单详情 ---------- */
  function openOrderDetail(oid) {
    const o = st().orders.find(x => x.id === oid);
    if (!o) return;
    const s = YF.STATUS[o.status];
    const m = YF.MODES[o.mode];
    const body =
      '<div style="display:flex;align-items:center;gap:8px;padding:10px;background:' + (o.status === 'refunding' || o.status === 'refunded' ? '#FDECEC' : '#E8F6EE') + ';border-radius:10px">' +
      '<span style="font-size:24px">' + m.icon + '</span>' +
      '<div style="flex:1"><div style="font-size:15px;font-weight:800;color:' + s.color + '">' + s.label + '</div>' +
      '<div style="font-size:11px;color:#8A8F98">' + esc(o.no) + ' · ' + YF.fmtTime(o.createdAt) + '</div></div></div>' +

      (o.group ? '<div class="card pad" style="margin-top:12px">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px"><span>拼团进度</span>' +
        '<span class="countdown">' + o.group.joinedPeople + '/' + o.group.needPeople + ' 人</span></div>' +
        '<div class="gp-bar"><i style="width:' + (o.group.joinedPeople / o.group.needPeople * 100).toFixed(0) + '%"></i></div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:6px">还差 ' + (o.group.needPeople - o.group.joinedPeople) + ' 人成团 · 距结束 ' + Math.max(0, Math.round((o.group.endTime - Date.now()) / 3600e3)) + ' 小时</div>' +
        '</div>' : '') +

      '<div class="section-head" style="margin-top:16px"><h3>商品清单</h3></div>' +
      '<div class="card">' + o.items.map(i =>
        '<div class="row"><span style="font-size:24px">' + i.emoji + '</span>' +
        '<div class="grow"><div class="rt">' + esc(i.name) + '</div><div class="rs">' + esc(i.spec) + ' · ¥' + i.price.toFixed(2) + '</div></div>' +
        '<span style="color:#8A8F98;font-size:12px">×' + i.qty + '</span>' +
        '<span style="font-weight:700">' + YF.money(i.price * i.qty) + '</span></div>').join('') + '</div>' +

      '<div class="card pad" style="margin-top:12px">' +
      feeRow('商品小计', YF.money(o.subtotal)) +
      (o.levelCut ? feeRow('会员折扣', '-' + YF.money(o.levelCut)) : '') +
      (o.couponCut ? feeRow('优惠券', '-' + YF.money(o.couponCut)) : '') +
      (o.pointsCut ? feeRow('积分抵扣', '-' + YF.money(o.pointsCut)) : '') +
      feeRow('配送费', o.deliveryFee ? YF.money(o.deliveryFee) : '免配送费') +
      '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px dashed #ECEFF1;font-weight:800">' +
      '<span>' + (o.status === 'unpaid' ? '应付' : '实付') + '</span><span style="color:#E54545">' + YF.money(o.total) + '</span></div>' +
      (o.payMethod ? '<div style="font-size:11px;color:#8A8F98;margin-top:6px">支付方式：' + S.payName(o.payMethod) + '</div>' : '') +
      '</div>' +

      (o.address ? '<div class="card pad" style="margin-top:12px"><div style="font-size:12px;color:#8A8F98">收货信息</div>' +
        '<div style="margin-top:4px;font-size:13px">📍 ' + esc(o.address.name) + ' ' + esc(o.address.phone) + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">' + esc(o.address.addr) + '</div></div>' : '') +
      (o.pickup ? '<div class="card pad" style="margin-top:12px"><div style="font-size:12px;color:#8A8F98">自提点</div>' +
        '<div style="margin-top:4px;font-size:13px">🏪 ' + esc(o.pickup.name) + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">' + esc(o.pickup.addr) + ' · ' + esc(o.pickup.hours) + '</div></div>' : '') +
      (o.company ? '<div class="card pad" style="margin-top:12px"><div style="font-size:12px;color:#8A8F98">采购主体</div>' +
        '<div style="margin-top:4px;font-size:13px">🏢 ' + esc(o.company.name) + '</div>' +
        '<div style="font-size:11px;color:#8A8F98;margin-top:2px">账期 ' + o.company.creditDays + ' 天' +
        (o.invoice ? ' · ' + esc(o.invoice.type) : '') + '</div></div>' : '') +

      (o.refund ? '<div class="warn" style="margin-top:12px">🔧 售后：' + esc(o.refund.reason) +
        ' · ' + (o.refund.status === 'refunded' ? '已退款 ' + YF.money(o.refund.amount) : '处理中') + '</div>' : '') +

      '<div class="section-head" style="margin-top:16px"><h3>物流进度</h3></div>' +
      '<div class="card pad"><ul class="tl">' + o.timeline.slice().reverse().map((t, i) =>
        '<li class="' + (i === 0 ? 'on' : '') + '"><span class="dot"></span>' +
        '<div><div class="tt">' + esc(t.text) + '</div><div class="ts">' + YF.fmtTime(t.t) + '</div></div></li>').join('') +
      '</ul></div>';

    let foot = '';
    if (o.status === 'unpaid') foot = '<button class="btn" data-act="pay-now" data-id="' + o.id + '">立即付款 ' + YF.money(o.total) + '</button>';
    else if (['accepted', 'delivering', 'grouping'].includes(o.status)) {
      foot = '<div style="display:flex;gap:10px"><button class="btn ghost" style="flex:1" data-act="advance" data-id="' + o.id + '">推进状态</button>' +
        '<button class="btn gray" style="flex:1" data-act="refund" data-id="' + o.id + '">申请售后</button></div>';
    } else if (o.status === 'delivered' || o.status === 'pickup') {
      foot = '<button class="btn" data-act="advance" data-id="' + o.id + '">确认完成</button>';
    }
    sheet('订单详情', body, foot);
  }

  /* ---------- 各类选择弹层 ---------- */
  function openAddr() {
    const u = st().user;
    const body = '<div class="pick-list">' + u.addresses.map(a =>
      '<div class="pick ' + (UI.checkout && UI.checkout.addrId === a.id ? 'on' : '') + '" data-act="set-addr" data-id="' + a.id + '">' +
      '<span style="font-size:18px">📍</span><div class="pg"><div class="pt">' + esc(a.name) + ' ' + esc(a.phone) +
      ' <span class="chip">' + esc(a.tag) + '</span></div><div class="ps">' + esc(a.addr) + '</div></div>' +
      '<div class="radio"></div></div>').join('') + '</div>' +
      '<button class="btn ghost" style="margin-top:12px" data-act="close">+ 新增地址（演示版暂未开放）</button>';
    sheet('选择收货地址', body, '');
  }
  function openPickup() {
    const body = '<div class="pick-list">' + YF.PICKUP_POINTS.map(p =>
      '<div class="pick ' + (st().groupMode.pickupId === p.id ? 'on' : '') + '" data-act="set-pickup" data-id="' + p.id + '">' +
      '<span style="font-size:18px">🏪</span><div class="pg"><div class="pt">' + esc(p.name) + ' <span class="chip">' + p.distance + '</span></div>' +
      '<div class="ps">' + esc(p.addr) + ' · ' + esc(p.hours) + '</div></div><div class="radio"></div></div>').join('') + '</div>';
    sheet('选择自提点', body, '');
  }
  function openLeader() {
    const body = '<div class="pick-list">' + YF.GROUP_LEADERS.map(l =>
      '<div class="pick ' + (st().groupMode.leaderId === l.id ? 'on' : '') + '" data-act="set-leader" data-id="' + l.id + '">' +
      '<span style="font-size:18px">' + l.avatar + '</span><div class="pg"><div class="pt">' + esc(l.name) + ' · ' + esc(l.area) + '</div>' +
      '<div class="ps">' + l.members + ' 位团员 · 好评率 99%</div></div><div class="radio"></div></div>').join('') + '</div>';
    sheet('选择团长', body, '');
  }
  function openCoupons() {
    const calc = S.calcCart(UI.mode, UI.checkout);
    const list = st().user.coupons.filter(c => !c.used).map(c => {
      const tpl = YF.COUPON_TEMPLATES.find(t => t.id === c.tpl);
      const usable = (tpl.scope === 'all' || tpl.scope === UI.mode) && (calc.subtotal - calc.levelCut) >= tpl.threshold;
      return { c, tpl, usable };
    });
    const body = '<div class="pick-list">' +
      list.map(x =>
        '<div class="pick ' + (UI.checkout.couponId === x.c.id ? 'on' : '') + '" data-act="set-coupon" data-id="' + (x.usable ? x.c.id : '') + '" style="' + (x.usable ? '' : 'opacity:.5') + '">' +
        '<span style="font-size:18px">🎟️</span><div class="pg"><div class="pt">' +
        (x.tpl.type === 'cash' ? '¥' + x.tpl.value + ' 无门槛券' : (x.tpl.value * 10).toFixed(1) + ' 折券') + ' · ' + esc(x.tpl.name) + '</div>' +
        '<div class="ps">' + (x.tpl.threshold ? '满 ' + x.tpl.threshold + ' 可用' : '无门槛') + ' · ' +
        ({ takeaway: '外卖', group: '团购', bulk: '企采', all: '全场' })[x.tpl.scope] + '可用 · ' + (x.usable ? '可用' : '不满足条件') + '</div></div>' +
        '<div class="radio"></div></div>').join('') +
      '<div class="pick" data-act="set-coupon" data-id=""><div class="pg"><div class="pt">不使用优惠券</div></div><div class="radio"></div></div>' +
      '</div>';
    sheet('选择优惠券', body, '');
  }
  function openMyCoupons() {
    const list = st().user.coupons.map(c => {
      const tpl = YF.COUPON_TEMPLATES.find(t => t.id === c.tpl);
      return Object.assign({}, tpl, { used: c.used });
    });
    const body = '<div class="pick-list">' + list.map(t =>
      '<div class="pick" style="' + (t.used ? 'opacity:.5' : '') + '">' +
      '<span style="font-size:18px">' + (t.used ? '🧾' : '🎟️') + '</span>' +
      '<div class="pg"><div class="pt">' + (t.type === 'cash' ? '¥' + t.value : (t.value * 10).toFixed(1) + '折') + ' · ' + esc(t.name) + '</div>' +
      '<div class="ps">' + (t.threshold ? '满 ' + t.threshold + ' 元可用' : '无门槛') + ' · 有效期 ' + t.expiry + '</div></div>' +
      '<span class="chip ' + (t.used ? 'gray' : 'orange') + '">' + (t.used ? '已使用' : '可用') + '</span></div>').join('') + '</div>';
    sheet('我的优惠券', body, '');
  }
  function openLevels() {
    const u = st().user, lv = YF.levelOf(u.totalSpend);
    const body = '<div class="card">' + YF.LEVELS.map(l =>
      '<div class="row" style="' + (l.key === lv.key ? 'background:#E8F6EE' : '') + '">' +
      '<span style="font-size:20px">' + l.icon + '</span><div class="grow"><div class="rt">' + l.name +
      (l.key === lv.key ? ' <span class="chip">当前等级</span>' : '') + '</div>' +
      '<div class="rs">累计消费满 ' + YF.money(l.min) + ' · 全场 ' + (l.discount * 10).toFixed(1) + ' 折 · 积分 ' + l.rate + ' 倍</div></div></div>').join('') +
      '</div>' +
      '<div class="ok" style="margin-top:12px">💡 积分规则：消费 1 元 = 1 积分 × 等级倍数；100 积分可在结算时抵扣 1 元（最高抵 20%）</div>';
    sheet('会员权益说明', body, '');
  }
  function openCompany() {
    const c = st().user.company;
    const body =
      '<div class="card pad">' +
      '<div class="field"><label>企业名称</label><input value="' + esc(c.name) + '" readonly></div>' +
      '<div class="field"><label>税号</label><input value="' + esc(c.taxNo) + '" readonly></div>' +
      '<div class="field"><label>账期</label><input value="' + c.creditDays + ' 天" readonly></div>' +
      '<div class="field"><label>授信额度</label><input value="' + YF.money(c.creditLimit) + '" readonly></div>' +
      '</div><div class="ok" style="margin-top:12px">✅ 企业资质已认证：可享阶梯批发价、对公转账、' + c.creditDays + ' 天账期与增值税专用发票</div>';
    sheet('企业认证', body, '');
  }
  function openRefundForm(oid) {
    const reasons = ['商品破损 / 挤压', '果品不新鲜', '缺斤少两', '规格与描述不符', '配送超时', '其他原因'];
    const body = '<div class="pick-list">' + reasons.map(r =>
      '<div class="pick" data-act="do-refund" data-id="' + oid + '" data-reason="' + esc(r) + '">' +
      '<div class="pg"><div class="pt">' + r + '</div><div class="ps">提交后商家 2 小时内响应</div></div><div class="radio"></div></div>').join('') +
      '</div><div class="warn" style="margin-top:12px">📸 请保留开箱照片，坏果包赔承诺 24 小时内有效</div>';
    sheet('申请售后', body, '');
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    const id = el.getAttribute('data-id');

    // 购物车加减按钮阻止冒泡到商品卡片
    if (['add', 'ci-inc', 'ci-dec'].includes(act)) e.stopPropagation();

    switch (act) {
      case 'tab':
        view._top = view._top || {};
        view._top[UI.tab] = view.scrollTop;
        UI.tab = el.getAttribute('data-tab');
        render();
        break;
      case 'mode':
        UI.mode = el.getAttribute('data-mode');
        UI.checkout = null;
        render();
        break;
      case 'cat': UI.cat = el.getAttribute('data-cat'); render(); break;
      case 'sort': UI.sort = el.getAttribute('data-sort'); render(); break;
      case 'ordf': UI.ordFilter = el.getAttribute('data-f'); render(); break;
      case 'ordf-jump':
        UI.tab = 'orders'; UI.ordFilter = el.getAttribute('data-f'); render(); break;

      case 'pd': openProduct(id); break;
      case 'pd-inc':
        modalRoot._pdQty = (modalRoot._pdQty || 1) + 1;
        $('pdQty').textContent = modalRoot._pdQty; break;
      case 'pd-dec':
        modalRoot._pdQty = Math.max(1, (modalRoot._pdQty || 1) - 1);
        $('pdQty').textContent = modalRoot._pdQty; break;
      case 'pd-add':
        S.cartAdd(UI.mode, id, modalRoot._pdQty || 1);
        closeSheet(); toast('已加入购物车'); render(); break;

      case 'add':
        S.cartAdd(UI.mode, id, 1); toast('已加入购物车'); render(); break;
      case 'ci-inc':
        S.cartSet(UI.mode, id, (S.cart(UI.mode).find(i => i.id === id) || { qty: 0 }).qty + 1);
        openCheckout(); render(); break;
      case 'ci-dec':
        S.cartSet(UI.mode, id, (S.cart(UI.mode).find(i => i.id === id) || { qty: 0 }).qty - 1);
        if (!S.cart(UI.mode).length) { closeSheet(); render(); } else { openCheckout(); render(); }
        break;
      case 'clear-cart':
        confirmBox({ text: '清空购物车', emoji: '🧺' }, '确定要清空当前「' + YF.MODES[UI.mode].name + '」购物车吗？', '确定清空', () => {
          st().carts[UI.mode] = []; S.save(); closeSheet(); render();
        });
        break;

      case 'checkout': openCheckout(); break;
      case 'close': closeSheet(); break;
      case 'close-mask': if (e.target === el) closeSheet(); break;

      case 'pick-addr': openAddr(); break;
      case 'set-addr':
        UI.checkout = UI.checkout || {}; UI.checkout.addrId = id; closeSheet(); openCheckout(); break;
      case 'pick-pickup': openPickup(); break;
      case 'set-pickup':
        st().groupMode.pickupId = id;
        if (UI.checkout) UI.checkout.pickupId = id;
        S.save(); closeSheet(); if (UI.checkout) openCheckout(); else render(); break;
      case 'pick-leader': openLeader(); break;
      case 'set-leader':
        st().groupMode.leaderId = id;
        if (UI.checkout) UI.checkout.leaderId = id;
        S.save(); closeSheet(); if (UI.checkout) openCheckout(); else render(); break;
      case 'pick-coupon': openCoupons(); break;
      case 'set-coupon':
        UI.checkout = UI.checkout || {}; UI.checkout.couponId = id || null; closeSheet(); openCheckout(); break;
      case 'toggle-points':
        UI.checkout = UI.checkout || {}; UI.checkout.usePoints = !UI.checkout.usePoints; openCheckout(); break;
      case 'edit-invoice':
        toast('演示版发票信息由企业认证自动带出'); break;

      case 'submit-order': {
        const r = S.placeOrder(UI.mode, UI.checkout);
        if (!r.ok) { toast(r.msg); return; }
        UI.checkout = null;
        closeSheet();
        render();
        if (r.order.mode === 'bulk') {
          confirmBox({ text: '采购单已提交', emoji: '🏢' },
            '单号 ' + r.order.no + '<br>商务专员将在 2 小时内完成审核<br>审核通过后可在订单页付款', '知道了', () => {
              UI.tab = 'orders'; UI.ordFilter = 'unpaid'; render();
            });
        } else {
          openPay(r.order.id);
        }
        break;
      }
      case 'pay': {
        const r = S.payOrder(id, el.getAttribute('data-method'));
        if (!r.ok) { toast(r.msg); return; }
        closeSheet();
        confirmBox({ text: '支付成功', emoji: '✅' },
          '已使用「' + S.payName(r.order.payMethod) + '」支付 ' + YF.money(r.order.total) +
          '<br>订单号 ' + r.order.no, '查看订单', () => {
            UI.tab = 'orders'; UI.ordFilter = 'ing'; render();
          });
        render();
        break;
      }
      case 'pay-now': closeSheet(); openPay(id); break;
      case 'go-recharge': closeSheet(); UI.tab = 'me'; render(); setTimeout(openRecharge, 60); break;
      case 'open-recharge': openRecharge(); break;
      case 'recharge': {
        const amount = +el.getAttribute('data-amount');
        const p = YF.RECHARGE_PLANS.find(x => x.amount === amount);
        if (!p) { toast('充值金额无效'); break; }
        S.recharge(amount, '微信支付');
        closeSheet();
        confirmBox({ text: '充值成功', emoji: '💳' },
          '充值 ¥' + amount + '，赠送 ¥' + p.gift + '<br>会员卡余额已到账，可直接在结账时使用', '好的', null);
        render();
        break;
      }
      case 'cancel':
        confirmBox({ text: '取消订单', emoji: '🤔' }, '取消后库存将释放，优惠券不退回', '确认取消', () => {
          S.cancelOrder(id); render();
        });
        break;
      case 'advance': S.advanceOrder(id); closeSheet(); render(); toast('订单状态已更新'); break;
      case 'refund': openRefundForm(id); break;
      case 'do-refund': {
        const reason = el.getAttribute('data-reason');
        const r = S.applyRefund(id, reason);
        closeSheet();
        toast(r.ok ? '售后申请已提交，商家 2 小时内响应' : r.msg);
        render();
        break;
      }
      case 'reorder': {
        const o = st().orders.find(x => x.id === id);
        o.items.forEach(i => S.cartAdd(o.mode, i.id, i.qty));
        UI.mode = o.mode; UI.tab = 'mall'; render(); toast('已加入购物车');
        break;
      }
      case 'ord-detail': openOrderDetail(id); break;

      case 'coupons': openMyCoupons(); break;
      case 'addr': openAddr(); break;
      case 'company': openCompany(); break;
      case 'levels': openLevels(); break;
      case 'points':
        sheet('积分商城', '<div class="empty"><div class="ee">🎁</div><p>积分商城正在装修中<br>当前可用 ' + st().user.points + ' 积分，结算时可抵扣 ' + YF.money(Math.floor(st().user.points / 100)) + '</p></div>', '');
        break;
      case 'cs':
        sheet('联系客服', '<div class="card pad" style="line-height:2;font-size:13px">' +
          '☎️ 客服热线：400-025-8888<br>🕘 服务时间：09:00 - 21:00<br>' +
          '💬 微信客服：yunfengfruit<br>📍 门店地址：南京市建邺区江东中路万达广场 B1<br>' +
          '🛡️ 坏果包赔：签收 24 小时内拍照即可赔付</div>', '');
        break;
      case 'invoice':
        sheet('发票管理', '<div class="card">' +
          st().orders.filter(o => o.invoice).map(o =>
            '<div class="row"><span style="font-size:18px">🧾</span><div class="grow">' +
            '<div class="rt">' + esc(o.invoice.type) + ' · ' + YF.money(o.total) + '</div>' +
            '<div class="rs">' + esc(o.invoice.title) + ' · ' + esc(o.no) + '</div></div>' +
            '<span class="chip ' + (o.status === 'done' ? '' : 'gray') + '">' + (o.status === 'done' ? '已开具' : '待开具') + '</span></div>').join('') +
          '</div>', '');
        break;
      case 'goto-admin': location.href = 'admin.html'; break;
      case 'reset':
        confirmBox({ text: '重置演示数据', emoji: '♻️' }, '将清空本地购物车与订单改动，恢复初始演示数据', '确认重置', () => {
          S.reset(); render(); toast('已恢复初始数据');
        });
        break;
    }
  });

  /* ---------- 时钟 ---------- */
  function tick() {
    const d = new Date();
    const p = n => (n < 10 ? '0' + n : '' + n);
    $('clock').textContent = d.getHours() + ':' + p(d.getMinutes());
  }
  tick(); setInterval(tick, 30000);

  S.load();
  render();
})();
