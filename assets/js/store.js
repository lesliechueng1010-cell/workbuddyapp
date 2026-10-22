/* =========================================================
 * 云峰水果大卖场 · 状态与业务逻辑层
 * 全部数据落地 localStorage，刷新不丢
 * ========================================================= */
(function () {
  const KEY = 'yunfeng_fresh_state_v1';

  /* ---------- 订单状态字典 ---------- */
  const STATUS = {
    unpaid: { label: '待付款', color: '#FF7A2F', step: 0 },
    auditing: { label: '待审核', color: '#8A63F2', step: 0 },
    grouping: { label: '待成团', color: '#2E9E5B', step: 1 },
    accepted: { label: '待接单', color: '#3D7EFF', step: 1 },
    delivering: { label: '配送中', color: '#3D7EFF', step: 2 },
    delivered: { label: '已送达', color: '#2E9E5B', step: 3 },
    pickup: { label: '待自提', color: '#2E9E5B', step: 3 },
    done: { label: '已完成', color: '#555B66', step: 4 },
    refunding: { label: '退款中', color: '#E54545', step: 2 },
    refunded: { label: '已退款', color: '#8A8F98', step: 4 },
    canceled: { label: '已取消', color: '#8A8F98', step: 4 }
  };
  YF.STATUS = STATUS;

  /* ---------- 价格计算 ---------- */
  function priceOf(p, mode, qty) {
    qty = qty || 1;
    if (mode === 'takeaway') return p.retail;
    if (mode === 'group') return p.group;
    // 企业采购：阶梯批发价
    let price = p.bulk[0].price;
    for (const t of p.bulk) if (qty >= t.min) price = t.price;
    return price;
  }
  function bulkTierOf(p, qty) {
    let idx = 0;
    p.bulk.forEach((t, i) => { if (qty >= t.min) idx = i; });
    return idx;
  }
  function nextTier(p, qty) {
    for (const t of p.bulk) if (qty < t.min) return t;
    return null;
  }
  YF.priceOf = priceOf;
  YF.bulkTierOf = bulkTierOf;
  YF.nextTier = nextTier;

  /* ---------- 会员等级 ---------- */
  function levelOf(totalSpend) {
    let lv = YF.LEVELS[0];
    for (const l of YF.LEVELS) if (totalSpend >= l.min) lv = l;
    return lv;
  }
  YF.levelOf = levelOf;

  /* ---------- 初始种子数据 ---------- */
  function seedOrders() {
    const H = 3600 * 1000, D = 24 * H;
    const now = Date.now();
    const mk = (o) => Object.assign({
      id: '', no: '', items: [], subtotal: 0, levelCut: 0, couponCut: 0, pointsCut: 0,
      deliveryFee: 0, total: 0, payMethod: 'balance', status: 'done', createdAt: now,
      timeline: [], address: null, pickup: null, company: null, invoice: null,
      refund: null, group: null, groupBuyId: null, remark: ''
    }, o);

    const P = id => YF.PRODUCTS.find(x => x.id === id);
    const item = (id, qty, mode) => {
      const p = P(id);
      return { id: p.id, name: p.name, emoji: p.emoji, spec: p.spec, price: priceOf(p, mode, qty), qty, mode };
    };
    const tl = (t, text) => ({ t, text });

    const orders = [
      mk({
        id: 'O10001', no: 'YF20261022001', mode: 'takeaway', status: 'delivering',
        items: [item('P01', 2, 'takeaway'), item('P05', 1, 'takeaway'), item('P08', 1, 'takeaway')],
        subtotal: 39.9 * 2 + 49.9 + 14.9, levelCut: 6.47, couponCut: 0, pointsCut: 0, deliveryFee: 0,
        total: 138.13, payMethod: 'balance', createdAt: now - 1.2 * H,
        address: YF.DEFAULT_USER.addresses[0],
        timeline: [tl(now - 1.2 * H, '订单提交成功'), tl(now - 1.1 * H, '会员卡余额支付 ¥138.13'), tl(now - 1 * H, '商家已接单，正在分拣'), tl(now - 0.6 * H, '骑手已取件，预计 30 分钟送达')]
      }),
      mk({
        id: 'O10002', no: 'YF20261021007', mode: 'group', status: 'grouping',
        items: [item('P02', 3, 'group'), item('P16', 2, 'group')],
        subtotal: 26.8 * 3 + 13.9 * 2, levelCut: 5.45, couponCut: 0, pointsCut: 0, deliveryFee: 0,
        total: 102.45, payMethod: 'online', createdAt: now - 6 * H,
        pickup: YF.PICKUP_POINTS[0],
        group: { leaderId: 'L1', needPeople: 20, joinedPeople: 14, endTime: now + 14 * H },
        timeline: [tl(now - 6 * H, '订单提交成功'), tl(now - 6 * H, '微信支付 ¥102.45'), tl(now - 5.8 * H, '已加入「张团长」的团，等待成团')]
      }),
      mk({
        id: 'O10003', no: 'YF20261020012', mode: 'bulk', status: 'auditing',
        items: [item('P22', 10, 'bulk'), item('P18', 20, 'bulk')],
        subtotal: 228 * 10 + 48 * 20, levelCut: 162, couponCut: 200, pointsCut: 0, deliveryFee: 0,
        total: 2878, payMethod: 'credit', createdAt: now - 20 * H,
        company: YF.DEFAULT_USER.company,
        invoice: { need: true, type: '增值税专用发票', title: '云峰科技（南京）有限公司', taxNo: '91320100MA1XXXXX2B' },
        timeline: [tl(now - 20 * H, '采购单提交，等待商务审核')]
      }),
      mk({
        id: 'O10004', no: 'YF20261019003', mode: 'takeaway', status: 'done',
        items: [item('P10', 1, 'takeaway'), item('P09', 1, 'takeaway')],
        subtotal: 128 + 39, levelCut: 8.35, couponCut: 0, pointsCut: 5, deliveryFee: 0,
        total: 153.65, payMethod: 'balance', createdAt: now - 2 * D,
        address: YF.DEFAULT_USER.addresses[1],
        timeline: [tl(now - 2 * D, '订单提交成功'), tl(now - 2 * D + 60000, '会员卡余额支付 ¥153.65'), tl(now - 2 * D + 0.5 * H, '商家已接单'), tl(now - 2 * D + 1.5 * H, '骑手已送达'), tl(now - 1.9 * D, '订单完成，获得 231 积分')]
      }),
      mk({
        id: 'O10005', no: 'YF20261018009', mode: 'group', status: 'done',
        items: [item('P14', 4, 'group'), item('P12', 2, 'group')],
        subtotal: 30 * 4 + 24.9 * 2, levelCut: 8.45, couponCut: 15, pointsCut: 0, deliveryFee: 0,
        total: 146.35, payMethod: 'online', createdAt: now - 4 * D,
        pickup: YF.PICKUP_POINTS[1],
        group: { leaderId: 'L2', needPeople: 20, joinedPeople: 20, endTime: now - 4 * D + 10 * H },
        timeline: [tl(now - 4 * D, '订单提交成功'), tl(now - 4 * D + 60000, '微信支付 ¥146.35'), tl(now - 3.9 * D, '拼团成功，20/20 人'), tl(now - 3.2 * D, '到店自提完成'), tl(now - 3 * D, '订单完成，获得 219 积分')]
      }),
      mk({
        id: 'O10006', no: 'YF20261016005', mode: 'takeaway', status: 'refunded',
        items: [item('P04', 1, 'takeaway')],
        subtotal: 26.9, levelCut: 1.35, couponCut: 0, pointsCut: 0, deliveryFee: 5,
        total: 30.55, payMethod: 'balance', createdAt: now - 6 * D,
        address: YF.DEFAULT_USER.addresses[0],
        refund: { reason: '西瓜磕碰破损，影响食用', status: 'refunded', amount: 30.55, at: now - 5.5 * D },
        timeline: [tl(now - 6 * D, '订单提交成功'), tl(now - 6 * D + 60000, '会员卡余额支付 ¥30.55'), tl(now - 5.8 * D, '申请售后：商品破损'), tl(now - 5.5 * D, '退款成功，¥30.55 已退回会员卡')]
      }),
      mk({
        id: 'O10007', no: 'YF20261015002', mode: 'bulk', status: 'done',
        items: [item('P24', 5, 'bulk')],
        subtotal: 700 * 5, levelCut: 175, couponCut: 0, pointsCut: 0, deliveryFee: 0,
        total: 3325, payMethod: 'credit', createdAt: now - 7 * D,
        company: YF.DEFAULT_USER.company,
        invoice: { need: true, type: '增值税专用发票', title: '云峰科技（南京）有限公司', taxNo: '91320100MA1XXXXX2B' },
        timeline: [tl(now - 7 * D, '采购单提交'), tl(now - 6.9 * D, '商务审核通过'), tl(now - 6.5 * D, '分批配送中'), tl(now - 6 * D, '已完成交付，账期 30 天')]
      }),
      mk({
        id: 'O10008', no: 'YF20261023001', mode: 'takeaway', status: 'unpaid',
        items: [item('P21', 1, 'takeaway')],
        subtotal: 168, levelCut: 8.4, couponCut: 0, pointsCut: 0, deliveryFee: 0,
        total: 159.6, payMethod: '', createdAt: now - 0.3 * H,
        address: YF.DEFAULT_USER.addresses[0],
        timeline: [tl(now - 0.3 * H, '订单提交成功，等待付款')]
      })
    ];
    return orders;
  }

  function seedDayStats() {
    const D = 24 * 3600 * 1000;
    const arr = [];
    // 固定基线，保证图表稳定可读
    const base = [18600, 21400, 19800, 24600, 31200, 28900, 22400, 25800, 27600, 30100, 23400, 26800, 29500, 33700];
    for (let i = 13; i >= 0; i--) {
      const ts = Date.now() - i * D;
      arr.push({
        date: YF.fmtDate(ts),
        ts: ts,
        sales: base[13 - i],
        orders: Math.round(base[13 - i] / 168),
        bulk: Math.round(base[13 - i] * 0.42),
        group: Math.round(base[13 - i] * 0.23),
        takeaway: Math.round(base[13 - i] * 0.35),
        refund: Math.round(base[13 - i] * 0.012)
      });
    }
    return arr;
  }

  function seedTransactions() {
    const H = 3600 * 1000, D = 24 * H, now = Date.now();
    return [
      { id: 'T01', ts: now - 0.3 * H, type: 'recharge', amount: 500, channel: '微信支付', orderNo: 'RC20261022001', status: 'success', memo: '会员卡充值 充500送80' },
      { id: 'T02', ts: now - 1 * H, type: 'balance', amount: -138.13, channel: '会员卡', orderNo: 'YF20261022001', status: 'success', memo: '外卖订单消费' },
      { id: 'T03', ts: now - 6 * H, type: 'online', amount: 102.45, channel: '微信支付', orderNo: 'YF20261021007', status: 'success', memo: '团购订单收款' },
      { id: 'T04', ts: now - 2 * D, type: 'balance', amount: -153.65, channel: '会员卡', orderNo: 'YF20261019003', status: 'success', memo: '外卖订单消费' },
      { id: 'T05', ts: now - 5.5 * D, type: 'refund', amount: -30.55, channel: '会员卡', orderNo: 'YF20261016005', status: 'success', memo: '售后退款' },
      { id: 'T06', ts: now - 6 * D, type: 'balance', amount: -30.55, channel: '会员卡', orderNo: 'YF20261016005', status: 'success', memo: '外卖订单消费' },
      { id: 'T07', ts: now - 7 * D, type: 'credit', amount: 3325, channel: '对公转账', orderNo: 'YF20261015002', status: 'success', memo: '企业采购月结' },
      { id: 'T08', ts: now - 4 * D, type: 'online', amount: 146.35, channel: '微信支付', orderNo: 'YF20261018009', status: 'success', memo: '团购订单收款' }
    ];
  }

  /* ---------- 拼团活动种子数据 ---------- */
  function seedGroupBuys() {
    const H = 3600 * 1000;
    const now = Date.now();
    const P = id => YF.PRODUCTS.find(x => x.id === id);
    const member = (u, ts) => ({ name: u.name, avatar: u.avatar, self: false, at: ts, orderId: null });
    const mk = (o) => {
      const p = P(o.pid);
      return Object.assign({
        id: '', pid: '', name: p.name, emoji: p.emoji, spec: p.spec,
        price: p.group, retail: p.retail, need: 3, hours: 12,
        startAt: now - 2 * H, endAt: now + 12 * H,
        members: [], status: 'ing', formedAt: null, closedAt: null, closeReason: ''
      }, o);
    };
    return [
      mk({
        id: 'GB001', pid: 'P01', price: 29.9, need: 5, hours: 12,
        endAt: now + 9 * H,
        members: [member(YF.MOCK_USERS[0], now - 1.6 * H), member(YF.MOCK_USERS[1], now - 1.1 * H), member(YF.MOCK_USERS[2], now - 0.4 * H)]
      }),
      mk({
        id: 'GB002', pid: 'P10', price: 99.0, need: 3, hours: 8,
        endAt: now + 5 * H,
        members: [member(YF.MOCK_USERS[3], now - 0.9 * H), member(YF.MOCK_USERS[4], now - 0.3 * H)]
      }),
      mk({
        id: 'GB003', pid: 'P02', price: 24.8, need: 8, hours: 24,
        endAt: now + 21 * H,
        members: [member(YF.MOCK_USERS[5], now - 2 * H), member(YF.MOCK_USERS[6], now - 1.5 * H),
                  member(YF.MOCK_USERS[7], now - 0.8 * H), member(YF.MOCK_USERS[8], now - 0.2 * H)]
      }),
      mk({
        id: 'GB004', pid: 'P14', price: 25.0, need: 5, hours: 12,
        startAt: now - 30 * H, endAt: now - 4 * H, status: 'success', formedAt: now - 6 * H,
        members: YF.MOCK_USERS.slice(0, 5).map((u, i) => member(u, now - (8 - i) * H))
      })
    ];
  }

  function initialState() {
    return {
      shop: JSON.parse(JSON.stringify(YF.SHOP_INFO)),
      user: JSON.parse(JSON.stringify(YF.DEFAULT_USER)),
      products: JSON.parse(JSON.stringify(YF.PRODUCTS)).map(p => {
        // 进价（成本）：默认按最低批发价的 78% 估算，入库时可被实际采购价覆盖
        p.cost = +(p.bulk[0].price * 0.78).toFixed(2);
        return p;
      }),
      carts: { takeaway: [], group: [], bulk: [] },
      orders: seedOrders(),
      transactions: seedTransactions(),
      dayStats: seedDayStats(),
      groupMode: { leaderId: 'L1', pickupId: 'S1' },
      stockLogs: [
        { ts: Date.now() - 2 * 3600e3, pid: 'P10', delta: -12, type: '订单出库', memo: '车厘子 JJ 级出库 12 份' },
        { ts: Date.now() - 8 * 3600e3, pid: 'P01', delta: 200, type: '采购入库', memo: '云南宾川基地到货' },
        { ts: Date.now() - 26 * 3600e3, pid: 'P05', delta: -30, type: '报损', memo: '草莓运输挤压报损' },
        { ts: Date.now() - 30 * 3600e3, pid: 'P22', delta: 40, type: '采购入库', memo: '企业果篮包装入库' }
      ],
      intakes: [],
      intakeSeq: 1,
      groupBuys: seedGroupBuys(),
      gbSeq: 5,
      seq: 10009
    };
  }

  /* ---------- 持久化 ---------- */
  let state = null;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        state = JSON.parse(raw);
        // 补齐字段（兼容旧版本数据）
        const init = initialState();
        for (const k in init) if (!(k in state)) state[k] = init[k];
        // 补齐商品进价（成本）字段
        state.products.forEach(p => {
          if (p.cost == null) p.cost = +(p.bulk[0].price * 0.78).toFixed(2);
        });
        state.intakes = state.intakes || [];
        // 补齐门店信息（兼容旧版本数据）
        state.shop = Object.assign(JSON.parse(JSON.stringify(YF.SHOP_INFO)), state.shop || {});
        // 补齐拼团活动
        if (!Array.isArray(state.groupBuys)) { state.groupBuys = seedGroupBuys(); state.gbSeq = 5; }
        if (state.gbSeq == null) state.gbSeq = state.groupBuys.length + 1;
        return state;
      }
    } catch (e) { console.warn('读取本地数据失败，使用初始数据', e); }
    state = initialState();
    save();
    return state;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('保存失败', e); }
  }
  function get() { return state || load(); }
  function reset() { state = initialState(); save(); return state; }

  /* ---------- 购物车 ---------- */
  function cart(mode) { return get().carts[mode] || (get().carts[mode] = []); }
  function cartAdd(mode, pid, qty) {
    qty = qty || 1;
    const c = cart(mode);
    const found = c.find(i => i.id === pid);
    if (found) found.qty += qty;
    else {
      const p = get().products.find(x => x.id === pid);
      c.push({ id: pid, qty });
    }
    save();
  }
  function cartSet(mode, pid, qty) {
    const c = cart(mode);
    const idx = c.findIndex(i => i.id === pid);
    if (idx < 0) return;
    if (qty <= 0) c.splice(idx, 1);
    else c[idx].qty = qty;
    save();
  }
  function cartRemove(mode, pid) {
    const c = cart(mode);
    const idx = c.findIndex(i => i.id === pid);
    if (idx >= 0) c.splice(idx, 1);
    save();
  }
  function cartCount(mode) {
    if (mode) return cart(mode).reduce((s, i) => s + i.qty, 0);
    return ['takeaway', 'group', 'bulk'].reduce((s, m) => s + cart(m).reduce((a, i) => a + i.qty, 0), 0);
  }

  /* ---------- 结算试算 ---------- */
  function calcCart(mode, opts) {
    opts = opts || {};
    const st = get();
    const c = cart(mode);
    const lines = c.map(i => {
      const p = st.products.find(x => x.id === i.id);
      if (!p) return null;
      const unit = priceOf(p, mode, i.qty);
      return { p, qty: i.qty, unit, amount: unit * i.qty, tier: mode === 'bulk' ? bulkTierOf(p, i.qty) : -1 };
    }).filter(Boolean);

    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const qtyTotal = lines.reduce((s, l) => s + l.qty, 0);
    const lv = levelOf(st.user.totalSpend);

    // 会员折扣（企业采购不叠加会员折扣）
    const levelCut = mode === 'bulk' ? 0 : +(subtotal * (1 - lv.discount)).toFixed(2);

    // 优惠券
    let couponCut = 0, couponName = '';
    if (opts.couponId) {
      const uc = st.user.coupons.find(u => u.id === opts.couponId && !u.used);
      if (uc) {
        const tpl = YF.COUPON_TEMPLATES.find(t => t.id === uc.tpl);
        if (tpl && (tpl.scope === 'all' || tpl.scope === mode) && subtotal - levelCut >= tpl.threshold) {
          couponCut = tpl.type === 'cash' ? tpl.value : +((subtotal - levelCut) * (1 - tpl.value)).toFixed(2);
          couponName = tpl.name;
        }
      }
    }

    // 积分抵扣：100 积分 = 1 元，最多抵扣应付的 20%
    const afterCut = Math.max(0, subtotal - levelCut - couponCut);
    const maxPointCut = +(afterCut * 0.2).toFixed(2);
    let pointsCut = 0, pointsUsed = 0;
    if (opts.usePoints) {
      const canUse = Math.floor(st.user.points / 100);
      pointsCut = Math.min(canUse, Math.floor(maxPointCut));
      pointsUsed = pointsCut * 100;
    }

    // 配送费
    let deliveryFee = 0, deliveryText = '免配送费';
    if (mode === 'takeaway') {
      if (afterCut >= 39) { deliveryFee = 0; deliveryText = '已满 39 元，免配送费'; }
      else { deliveryFee = 5; deliveryText = '还差 ' + (39 - afterCut).toFixed(2) + ' 元免配送费'; }
    } else if (mode === 'bulk') {
      if (afterCut >= 1000) { deliveryFee = 0; deliveryText = '企业专车配送'; }
      else { deliveryFee = 20; deliveryText = '未满 1000 元，收取专车配送费'; }
    } else {
      deliveryFee = 0; deliveryText = '团长自提点自提';
    }

    const total = +Math.max(0, subtotal - levelCut - couponCut - pointsCut + deliveryFee).toFixed(2);
    return { lines, qtyTotal, subtotal, levelCut, couponCut, couponName, pointsCut, pointsUsed, maxPointCut, deliveryFee, deliveryText, total, level: lv };
  }

  /* ---------- 下单 ---------- */
  function placeOrder(mode, extra) {
    const st = get();
    extra = extra || {};
    const calc = calcCart(mode, { couponId: extra.couponId, usePoints: extra.usePoints });
    if (!calc.lines.length) return { ok: false, msg: '购物车是空的' };

    const st2 = st;
    // 库存校验
    for (const l of calc.lines) {
      if (l.qty > l.p.stock) return { ok: false, msg: '「' + l.p.name + '」库存不足，仅剩 ' + l.p.stock + ' 份' };
    }

    const id = 'O' + st2.seq;
    const no = 'YF' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + String(new Date().getDate()).padStart(2, '0') + String(st2.seq).slice(-3);
    st2.seq += 1;

    const now = Date.now();
    const order = {
      id, no, mode,
      items: calc.lines.map(l => ({ id: l.p.id, name: l.p.name, emoji: l.p.emoji, spec: l.p.spec, price: l.unit, qty: l.qty, mode })),
      subtotal: +calc.subtotal.toFixed(2),
      levelCut: calc.levelCut, couponCut: calc.couponCut, pointsCut: calc.pointsCut,
      deliveryFee: calc.deliveryFee,
      total: calc.total,
      payMethod: '', status: mode === 'bulk' ? 'auditing' : 'unpaid',
      createdAt: now,
      timeline: [{ t: now, text: mode === 'bulk' ? '采购单提交，等待商务审核' : '订单提交成功' }],
      address: extra.address || null,
      pickup: mode === 'group' ? (extra.pickup || null) : null,
      company: mode === 'bulk' ? (st2.user.company || null) : null,
      invoice: extra.invoice || null,
      refund: null,
      group: mode === 'group' ? { leaderId: extra.leaderId || st2.groupMode.leaderId, needPeople: 20, joinedPeople: Math.floor(Math.random() * 12) + 6, endTime: now + 20 * 3600e3 } : null,
      groupBuyId: extra.groupBuyId || null,
      remark: extra.remark || ''
    };

    // 扣库存、加销量
    calc.lines.forEach(l => {
      l.p.stock -= l.qty;
      l.p.sales += l.qty;
    });

    // 核销优惠券
    if (extra.couponId) {
      const uc = st2.user.coupons.find(u => u.id === extra.couponId);
      if (uc) uc.used = true;
    }

    st2.orders.unshift(order);
    st2.carts[mode] = [];
    save();
    return { ok: true, order };
  }

  /* ---------- 支付 ---------- */
  function payOrder(orderId, method) {
    const st = get();
    const o = st.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, msg: '订单不存在' };
    if (o.status !== 'unpaid') return { ok: false, msg: '该订单无需付款' };

    const now = Date.now();
    if (method === 'balance') {
      if (st.user.balance < o.total) return { ok: false, msg: '会员卡余额不足，请充值后支付' };
      st.user.balance = +(st.user.balance - o.total).toFixed(2);
      st.transactions.unshift({ id: 'T' + now, ts: now, type: 'balance', amount: -o.total, channel: '会员卡', orderNo: o.no, status: 'success', memo: '订单消费' });
    } else if (method === 'credit') {
      st.transactions.unshift({ id: 'T' + now, ts: now, type: 'credit', amount: o.total, channel: '对公转账', orderNo: o.no, status: 'pending', memo: '企业账期挂账' });
    } else {
      st.transactions.unshift({ id: 'T' + now, ts: now, type: 'online', amount: o.total, channel: '微信支付', orderNo: o.no, status: 'success', memo: '订单收款' });
    }

    o.payMethod = method;
    o.status = o.mode === 'group' ? 'grouping' : 'accepted';
    o.timeline.push({ t: now, text: payName(method) + ' ¥' + o.total.toFixed(2) });
    if (o.mode === 'group') o.timeline.push({ t: now, text: '已加入团购，等待成团' });
    else o.timeline.push({ t: now, text: '支付成功，等待商家接单' });

    // 拼团订单：付款后自动入团，满员则成团并推进到待自提
    if (o.groupBuyId) {
      const r = gbJoin(o.groupBuyId, { name: st.user.name, avatar: st.user.avatar, self: true, orderId: o.id });
      if (r.ok) {
        const gb = r.gb;
        o.timeline.push({ t: now, text: '已加入拼团（' + gb.members.length + '/' + gb.need + ' 人）' });
        if (r.formed) o.timeline.push({ t: now, text: '拼团成功，等待到店自提' });
        o.group = o.group || {};
        o.group.joinedPeople = gb.members.length;
        o.group.needPeople = gb.need;
        o.group.endTime = gb.endAt;
        o._formed = !!r.formed;
      }
    }

    // 积分扣除（下单时已抵扣）
    if (o.pointsCut > 0) {
      st.user.points -= o.pointsCut * 100;
    }
    save();
    return { ok: true, order: o };
  }
  function payName(m) {
    return { balance: '会员卡余额支付', online: '微信支付', credit: '对公转账（账期）' }[m] || '支付';
  }

  /* ---------- 订单流转 ---------- */
  function advanceOrder(orderId) {
    const st = get();
    const o = st.orders.find(x => x.id === orderId);
    if (!o) return;
    const now = Date.now();
    const map = {
      auditing: ['unpaid', '商务审核通过，待付款'],
      grouping: ['pickup', '拼团成功，请到自提点取货'],
      accepted: ['delivering', '商家已接单，骑手配送中'],
      delivering: [o.mode === 'group' ? 'pickup' : 'delivered', o.mode === 'group' ? '已送达自提点' : '骑手已送达'],
      pickup: ['done', '自提完成，订单完成'],
      delivered: ['done', '订单完成']
    };
    const next = map[o.status];
    if (!next) return;
    o.status = next[0];
    o.timeline.push({ t: now, text: next[1] });
    if (o.status === 'done') {
      const pts = Math.round(o.total * (levelOf(st.user.totalSpend).rate));
      st.user.points += pts;
      st.user.totalSpend = +(st.user.totalSpend + o.total).toFixed(2);
      o.timeline.push({ t: now, text: '订单完成，获得 ' + pts + ' 积分' });
    }
    save();
  }
  function cancelOrder(orderId) {
    const st = get();
    const o = st.orders.find(x => x.id === orderId);
    if (!o) return;
    o.status = 'canceled';
    o.timeline.push({ t: Date.now(), text: '订单已取消' });
    // 退出拼团
    if (o.groupBuyId) {
      const gb = gbOf(o.groupBuyId);
      if (gb) gb.members = gb.members.filter(m => m.orderId !== o.id);
    }
    // 还库存
    o.items.forEach(i => {
      const p = st.products.find(x => x.id === i.id);
      if (p) { p.stock += i.qty; p.sales = Math.max(0, p.sales - i.qty); }
    });
    save();
  }
  function applyRefund(orderId, reason) {
    const st = get();
    const o = st.orders.find(x => x.id === orderId);
    if (!o) return { ok: false, msg: '订单不存在' };
    if (['canceled', 'refunded', 'refunding', 'unpaid'].includes(o.status)) {
      return { ok: false, msg: '当前状态不支持申请售后' };
    }
    o.status = 'refunding';
    o.refund = { reason, status: 'refunding', amount: o.total, at: null };
    o.timeline.push({ t: Date.now(), text: '申请售后：' + reason });
    save();
    return { ok: true };
  }
  function finishRefund(orderId, approve) {
    const st = get();
    const o = st.orders.find(x => x.id === orderId);
    if (!o || o.status !== 'refunding') return;
    const now = Date.now();
    if (approve) {
      o.status = 'refunded';
      o.refund.status = 'refunded';
      o.refund.at = now;
      if (o.payMethod === 'balance') {
        st.user.balance = +(st.user.balance + o.total).toFixed(2);
        st.transactions.unshift({ id: 'T' + now, ts: now, type: 'refund', amount: -o.total, channel: '会员卡', orderNo: o.no, status: 'success', memo: '售后退款' });
      } else {
        st.transactions.unshift({ id: 'T' + now, ts: now, type: 'refund', amount: -o.total, channel: '原路退回', orderNo: o.no, status: 'success', memo: '售后退款' });
      }
      o.timeline.push({ t: now, text: '退款成功，¥' + o.total.toFixed(2) + ' 已退回' });
      // 归还库存
      o.items.forEach(i => {
        const p = st.products.find(x => x.id === i.id);
        if (p) { p.stock += i.qty; p.sales = Math.max(0, p.sales - i.qty); }
      });
    } else {
      o.status = 'accepted';
      o.refund.status = 'rejected';
      o.timeline.push({ t: now, text: '售后申请未通过：商品经核实无损' });
    }
    save();
  }

  /* ---------- 充值 ---------- */
  function recharge(amount, channel) {
    const st = get();
    const plan = YF.RECHARGE_PLANS.find(p => p.amount === amount);
    const gift = plan ? plan.gift : 0;
    const now = Date.now();
    st.user.balance = +(st.user.balance + amount + gift).toFixed(2);
    st.user.totalSpend = +(st.user.totalSpend + amount).toFixed(2);
    st.user.points += Math.round(amount * 0.5);
    st.transactions.unshift({ id: 'T' + now, ts: now, type: 'recharge', amount: amount, channel: channel || '微信支付', orderNo: 'RC' + now, status: 'success', memo: '会员卡充值' + (gift ? ' 送' + gift : '') });
    save();
    return { amount, gift };
  }

  /* ---------- 后台：商品 ---------- */
  function toggleProduct(pid) {
    const p = get().products.find(x => x.id === pid);
    if (p) { p.on = !p.on; save(); }
  }
  function updateProduct(pid, patch) {
    const p = get().products.find(x => x.id === pid);
    if (p) { Object.assign(p, patch); save(); }
  }
  function adjustStock(pid, delta, memo) {
    const st = get();
    const p = st.products.find(x => x.id === pid);
    if (!p) return;
    p.stock = Math.max(0, p.stock + delta);
    st.stockLogs.unshift({ ts: Date.now(), pid, delta, type: delta > 0 ? '盘点入库' : '盘点出库', memo: memo || '手工盘点调整' });
    save();
  }

  /* ---------- 门店信息（两端共用） ---------- */
  function getShop() { return get().shop; }
  function updateShop(patch) {
    const sp = get().shop;
    Object.assign(sp, patch || {});
    // 同步第一个自提点（即门店本身）的名称与地址
    const p0 = YF.PICKUP_POINTS[0];
    if (p0) {
      if (patch && patch.name) p0.name = patch.name;
      if (patch && patch.address) p0.addr = patch.address;
    }
    save();
    return sp;
  }

  /* ---------- 拼团 ---------- */
  function gbList() { return get().groupBuys; }
  function gbOf(id) { return get().groupBuys.find(g => g.id === id); }
  function gbByProduct(pid) { return get().groupBuys.find(g => g.pid === pid && g.status === 'ing'); }

  /** 发起拼团活动 */
  function gbCreate(opt) {
    const st = get();
    const p = st.products.find(x => x.id === opt.pid);
    if (!p) return { ok: false, msg: '商品不存在' };
    const need = Math.max(2, parseInt(opt.need, 10) || 3);
    const hours = Math.max(1, parseFloat(opt.hours) || 12);
    let price = parseFloat(opt.price);
    if (!(price > 0)) price = +(p.group * 0.9).toFixed(2);
    const now = Date.now();
    const gb = {
      id: 'GB' + String(st.gbSeq).padStart(3, '0'),
      pid: p.id, name: p.name, emoji: p.emoji, spec: p.spec,
      price: +price.toFixed(2), retail: p.retail, need, hours,
      startAt: now, endAt: now + hours * 3600e3,
      members: [], status: 'ing', formedAt: null, closedAt: null, closeReason: ''
    };
    st.gbSeq += 1;
    st.groupBuys.unshift(gb);
    save();
    return { ok: true, gb };
  }

  /** 成团：把所有团员订单推进到待自提 */
  function gbFormOrders(gb) {
    const st = get();
    const now = Date.now();
    gb.members.forEach(m => {
      if (!m.orderId) return;
      const o = st.orders.find(x => x.id === m.orderId);
      if (!o || o.status !== 'grouping') return;
      o.status = 'pickup';
      o.timeline.push({ t: now, text: '拼团成功（' + gb.members.length + '/' + gb.need + ' 人），商品已到达自提点，请凭取货码自提' });
    });
  }

  /** 参团：who = {name, avatar, self, orderId} */
  function gbJoin(id, who) {
    const st = get();
    const gb = gbOf(id);
    if (!gb) return { ok: false, msg: '拼团不存在' };
    if (gb.status !== 'ing') return { ok: false, msg: '该团已结束' };
    if (who && who.self && gb.members.some(m => m.self)) return { ok: false, msg: '你已在该团内' };
    gb.members.push(Object.assign({ self: false, at: Date.now(), orderId: null }, who || {}));
    let formed = false;
    if (gb.members.length >= gb.need) {
      gb.status = 'success';
      gb.formedAt = Date.now();
      formed = true;
      gbFormOrders(gb);
    }
    save();
    return { ok: true, gb, formed };
  }

  /** 演示用：模拟 n 位虚拟用户参团 */
  function gbSimulate(id, n) {
    const st = get();
    const gb = gbOf(id);
    if (!gb) return { ok: false, msg: '拼团不存在' };
    if (gb.status !== 'ing') return { ok: false, msg: '该团已结束' };
    n = Math.max(1, parseInt(n, 10) || 1);
    let added = 0;
    const used = gb.members.map(m => m.name);
    for (let i = 0; i < n && gb.status === 'ing'; i++) {
      const u = YF.MOCK_USERS.find(x => used.indexOf(x.name) < 0);
      if (!u) break;
      used.push(u.name);
      gb.members.push({ name: u.name, avatar: u.avatar, self: false, at: Date.now(), orderId: null });
      added++;
      if (gb.members.length >= gb.need) {
        gb.status = 'success';
        gb.formedAt = Date.now();
        gbFormOrders(gb);
      }
    }
    save();
    return { ok: true, gb, added, formed: gb.status === 'success' };
  }

  /** 关闭拼团（超时未成团 / 商家终止）：全额退款到会员卡余额并生成退款流水 */
  function gbClose(id, reason) {
    const st = get();
    const gb = gbOf(id);
    if (!gb) return { ok: false, msg: '拼团不存在' };
    if (gb.status !== 'ing') return { ok: false, msg: '该团已结束，无需处理' };
    const now = Date.now();
    gb.status = 'fail';
    gb.closedAt = now;
    gb.closeReason = reason || '拼团超时未成团';
    const refunded = [];
    gb.members.forEach((m, i) => {
      if (!m.orderId) return;
      const o = st.orders.find(x => x.id === m.orderId);
      if (!o || ['refunded', 'canceled'].indexOf(o.status) >= 0) return;
      st.user.balance = +(st.user.balance + o.total).toFixed(2);
      st.transactions.unshift({
        id: 'T' + now + '_' + i, ts: now, type: 'refund', amount: -o.total,
        channel: '会员卡', orderNo: o.no, status: 'success',
        memo: '拼团失败自动退款：' + gb.closeReason
      });
      o.status = 'refunded';
      o.refund = { reason: gb.closeReason + '，系统自动全额退款', status: 'refunded', amount: o.total, at: now };
      o.timeline.push({ t: now, text: gb.closeReason + '，¥' + o.total.toFixed(2) + ' 已自动退回会员卡余额' });
      refunded.push(o);
    });
    save();
    return { ok: true, gb, refunded };
  }

  /** 强制成团（后台演示用）：补足虚拟人数后成团 */
  function gbForce(id) {
    const gb = gbOf(id);
    if (!gb || gb.status !== 'ing') return { ok: false, msg: '该团已结束' };
    const need = Math.max(0, gb.need - gb.members.length);
    if (need > 0) gbSimulate(id, need);
    const g2 = gbOf(id);
    if (g2 && g2.status === 'ing') {
      g2.status = 'success';
      g2.formedAt = Date.now();
      gbFormOrders(g2);
      save();
    }
    return { ok: true, gb: g2, formed: true };
  }

  /** 超时检查：到期未成团自动关闭并退款，返回本次被关闭的团 */
  function gbTick() {
    const st = get();
    const now = Date.now();
    const expired = st.groupBuys.filter(g => g.status === 'ing' && now > g.endAt);
    const out = [];
    expired.forEach(g => {
      const r = gbClose(g.id, '拼团超时未成团');
      if (r.ok) out.push({ gb: r.gb, orders: r.refunded.length, amount: r.refunded.reduce((s, o) => s + o.total, 0) });
    });
    return out;
  }

  /** 用户参团：生成一笔拼团订单（待付款） */
  function joinGroupBuy(id) {
    const st = get();
    const gb = gbOf(id);
    if (!gb) return { ok: false, msg: '拼团不存在' };
    if (gb.status !== 'ing') return { ok: false, msg: '该团已结束（已成团或已退款）' };
    if (gb.members.some(m => m.self)) return { ok: false, msg: '你已在该团内，请勿重复参团' };
    const p = st.products.find(x => x.id === gb.pid);
    if (!p) return { ok: false, msg: '商品不存在' };
    if (p.stock <= 0) return { ok: false, msg: '该商品已售罄' };

    const id2 = 'O' + st.seq;
    const no = 'YF' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') +
      String(new Date().getDate()).padStart(2, '0') + String(st.seq).slice(-3);
    st.seq += 1;
    const now = Date.now();
    const total = +gb.price.toFixed(2);
    const order = {
      id: id2, no, mode: 'group',
      items: [{ id: p.id, name: p.name, emoji: p.emoji, spec: p.spec, price: gb.price, qty: 1, mode: 'group' }],
      subtotal: total, levelCut: 0, couponCut: 0, pointsCut: 0, deliveryFee: 0, total,
      payMethod: '', status: 'unpaid', createdAt: now,
      timeline: [{ t: now, text: '参团订单创建 · ' + gb.need + ' 人成团价 ¥' + total.toFixed(2) }],
      address: null,
      pickup: YF.PICKUP_POINTS.find(x => x.id === st.groupMode.pickupId) || YF.PICKUP_POINTS[0],
      company: null, invoice: null, refund: null,
      group: { leaderId: st.groupMode.leaderId, needPeople: gb.need, joinedPeople: gb.members.length, endTime: gb.endAt },
      groupBuyId: gb.id,
      remark: ''
    };
    p.stock -= 1;
    p.sales += 1;
    st.orders.unshift(order);
    save();
    return { ok: true, order, gb };
  }

  function gbStats() {
    const all = get().groupBuys;
    return {
      ing: all.filter(g => g.status === 'ing').length,
      success: all.filter(g => g.status === 'success').length,
      fail: all.filter(g => g.status === 'fail').length,
      joined: all.reduce((s, g) => s + g.members.length, 0),
      amount: all.filter(g => g.status === 'success').reduce((s, g) => s + g.members.length * g.price, 0)
    };
  }

  /* ---------- 后台：拍照入库单 ---------- */
  /**
   * 一键入库：把识别后的明细批量写入库存
   * data = { supplier, no, date, thumb, source, lines:[{skuId,name,emoji,spec,qty,price,confidence}] }
   */
  function addIntake(data) {
    const st = get();
    const now = Date.now();
    const lines = (data.lines || []).filter(l => l.skuId && l.qty > 0);
    if (!lines.length) return { ok: false, msg: '没有可入库的明细，请先为每行关联商品' };

    const id = 'IN' + String(st.intakeSeq).padStart(4, '0');
    st.intakeSeq += 1;
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    const totalAmount = +lines.reduce((s, l) => s + l.qty * (l.price || 0), 0).toFixed(2);

    lines.forEach(l => {
      const p = st.products.find(x => x.id === l.skuId);
      if (!p) return;
      p.stock += l.qty;
      if (l.price > 0) p.cost = +l.price.toFixed(2);
      st.stockLogs.unshift({
        ts: now, pid: p.id, delta: +l.qty, type: '拍照入库',
        memo: '入库单 ' + (data.no || id) + ' · ' + (data.supplier || '未知供应商')
      });
    });

    if (totalAmount > 0) {
      st.transactions.unshift({
        id: 'T' + now, ts: now, type: 'purchase', amount: -totalAmount,
        channel: '采购付款', orderNo: data.no || id, status: 'success',
        memo: '入库单采购：' + (data.supplier || '未知供应商')
      });
    }

    const rec = {
      id, no: data.no || id, supplier: data.supplier || '未知供应商',
      date: data.date || YF.fmtDate(now), ts: now,
      source: data.source || 'photo',
      lines: lines.map(l => Object.assign({}, l)),
      totalQty, totalAmount, status: 'done', revertedAt: null
    };
    st.intakes.unshift(rec);
    save();
    return { ok: true, intake: rec };
  }
  /** 撤销入库：反向扣减库存并冲销采购流水 */
  function revertIntake(id) {
    const st = get();
    const rec = st.intakes.find(x => x.id === id);
    if (!rec || rec.status === 'reverted') return { ok: false, msg: '该入库单不可撤销' };
    const now = Date.now();
    rec.lines.forEach(l => {
      const p = st.products.find(x => x.id === l.skuId);
      if (!p) return;
      p.stock = Math.max(0, p.stock - l.qty);
      st.stockLogs.unshift({ ts: now, pid: p.id, delta: -l.qty, type: '入库撤销', memo: '撤销入库单 ' + rec.no });
    });
    if (rec.totalAmount > 0) {
      st.transactions.unshift({
        id: 'T' + now, ts: now, type: 'purchase', amount: rec.totalAmount,
        channel: '采购冲销', orderNo: rec.no, status: 'success', memo: '撤销入库单：' + rec.supplier
      });
    }
    rec.status = 'reverted';
    rec.revertedAt = now;
    save();
    return { ok: true, intake: rec };
  }
  function intakeStats() {
    const st = get();
    const all = st.intakes;
    const done = all.filter(i => i.status === 'done');
    const today = all.filter(i => YF.fmtDate(i.ts) === YF.fmtDate(Date.now()));
    return {
      count: all.length,
      todayCount: today.length,
      todayQty: today.filter(i => i.status === 'done').reduce((s, i) => s + i.totalQty, 0),
      totalAmount: done.reduce((s, i) => s + i.totalAmount, 0),
      lines: done.reduce((s, i) => s + i.lines.length, 0)
    };
  }

  /* ---------- 后台：对账 ---------- */
  function reconcile() {
    const st = get();
    const days = st.dayStats;
    const rows = days.map(d => {
      const dayTx = st.transactions.filter(t => YF.fmtDate(t.ts) === d.date);
      const incomeFlow = dayTx.filter(t => ['recharge', 'online', 'credit'].includes(t.type)).reduce((s, t) => s + t.amount, 0);
      const outFlow = dayTx.filter(t => t.type === 'refund').reduce((s, t) => s + Math.abs(t.amount), 0);
      const balancePay = dayTx.filter(t => t.type === 'balance').reduce((s, t) => s + Math.abs(t.amount), 0);
      // 系统侧：当日销售额 + 当日充值
      const sysSales = d.sales;
      const sysRefund = d.refund;
      const diff = +((incomeFlow + balancePay - outFlow) - (sysSales - sysRefund)).toFixed(2);
      return {
        date: d.date, sales: sysSales, refund: sysRefund,
        incomeFlow: +incomeFlow.toFixed(2), balancePay: +balancePay.toFixed(2), refundFlow: +outFlow.toFixed(2),
        expect: +(sysSales - sysRefund).toFixed(2),
        actual: +(incomeFlow + balancePay - outFlow).toFixed(2),
        diff,
        balanced: Math.abs(diff) < 0.01 || dayTx.length === 0
      };
    });
    return rows;
  }
  function reconSummary() {
    const st = get();
    const recharge = st.transactions.filter(t => t.type === 'recharge').reduce((s, t) => s + t.amount, 0);
    const online = st.transactions.filter(t => t.type === 'online').reduce((s, t) => s + t.amount, 0);
    const credit = st.transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const balance = st.transactions.filter(t => t.type === 'balance').reduce((s, t) => s + Math.abs(t.amount), 0);
    const refund = st.transactions.filter(t => t.type === 'refund').reduce((s, t) => s + Math.abs(t.amount), 0);
    const rows = reconcile();
    const unbalanced = rows.filter(r => !r.balanced).length;
    return { recharge, online, credit, balance, refund, unbalanced, total: recharge + online + credit };
  }

  /* ---------- 统计 ---------- */
  function stats() {
    const st = get();
    const today = st.dayStats[st.dayStats.length - 1];
    const lowStock = st.products.filter(p => p.stock <= 60).sort((a, b) => a.stock - b.stock);
    const pendingOrders = st.orders.filter(o => ['unpaid', 'auditing', 'accepted', 'grouping'].includes(o.status));
    const pendingRefund = st.orders.filter(o => o.status === 'refunding');
    const stockValue = st.products.reduce((s, p) => s + p.stock * p.bulk[0].price, 0);
    return {
      todaySales: today.sales,
      todayOrders: today.orders,
      memberCount: 12864,
      balanceLiability: st.user.balance,
      lowStock, pendingOrders, pendingRefund, stockValue,
      productCount: st.products.length,
      onCount: st.products.filter(p => p.on).length,
      gbIng: st.groupBuys.filter(g => g.status === 'ing').length,
      gbFail: st.groupBuys.filter(g => g.status === 'fail').length
    };
  }

  YF.store = {
    load, save, get, reset,
    cart, cartAdd, cartSet, cartRemove, cartCount, calcCart,
    placeOrder, payOrder, cancelOrder, advanceOrder, applyRefund, finishRefund,
    recharge, toggleProduct, updateProduct, adjustStock,
    getShop, updateShop,
    gbList, gbOf, gbByProduct, gbCreate, gbJoin, gbSimulate, gbClose, gbForce, gbTick,
    joinGroupBuy, gbStats,
    addIntake, revertIntake, intakeStats,
    reconcile, reconSummary, stats, payName
  };
  YF.store.STATUS = STATUS;
})();
