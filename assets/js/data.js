/* =========================================================
 * 云峰水果大卖场 · 基础数据层
 * 演示数据：商品 / 会员 / 优惠券 / 充值套餐 / 门店信息
 * ========================================================= */
window.YF = window.YF || {};

/* ---------- 业务模式 ---------- */
YF.MODES = {
  takeaway: {
    key: 'takeaway',
    name: '外卖到家',
    short: '外卖',
    icon: '🛵',
    desc: '南京市区 2 小时达 · 满 39 元免配送费',
    priceField: 'retail',
    unitLabel: '零售价'
  },
  group: {
    key: 'group',
    name: '社区团购',
    short: '团购',
    icon: '👥',
    desc: '团长开团 · 成团后次日自提 · 比零售省 15%',
    priceField: 'group',
    unitLabel: '团购价'
  },
  bulk: {
    key: 'bulk',
    name: '企业采购',
    short: '企采',
    icon: '🏢',
    desc: '阶梯批发价 · 支持对公转账与增值税专票',
    priceField: 'bulk',
    unitLabel: '批发价'
  }
};

/* ---------- 商品分类 ---------- */
YF.CATEGORIES = [
  { id: 'rec', name: '云峰推荐', icon: '⭐' },
  { id: 'fruit', name: '精选水果', icon: '🍎' },
  { id: 'season', name: '当季水果', icon: '🍊' },
  { id: 'snack', name: '爆款零食', icon: '🥜' },
  { id: 'gift', name: '礼盒果篮', icon: '🎁' }
];

/* ---------- 商品库 ----------
 * retail  零售价（外卖）
 * group   团购价
 * bulk    批发阶梯价 [{min, price}]
 * stock   库存；sales 累计销量；origin 产地；spec 规格
 */
YF.PRODUCTS = [
  { id: 'P01', name: '阳光玫瑰葡萄', emoji: '🍇', cats: ['rec', 'fruit'], spec: '500g/盒', origin: '云南宾川', retail: 39.9, group: 32.9, bulk: [{ min: 1, price: 29.9 }, { min: 50, price: 26.5 }, { min: 200, price: 23.8 }], stock: 320, sales: 1862, on: true, tag: '招牌爆款', fresh: 98 },
  { id: 'P02', name: '赣南脐橙', emoji: '🍊', cats: ['rec', 'season'], spec: '5斤装', origin: '江西赣州', retail: 32.8, group: 26.8, bulk: [{ min: 1, price: 24.8 }, { min: 50, price: 21.9 }, { min: 200, price: 19.6 }], stock: 540, sales: 2410, on: true, tag: '当季直采', fresh: 96 },
  { id: 'P03', name: '阿克苏冰糖心苹果', emoji: '🍎', cats: ['fruit'], spec: '5斤装', origin: '新疆阿克苏', retail: 45.0, group: 36.9, bulk: [{ min: 1, price: 33.9 }, { min: 50, price: 30.0 }, { min: 200, price: 27.5 }], stock: 260, sales: 1533, on: true, tag: '', fresh: 97 },
  { id: 'P04', name: '8424麒麟西瓜', emoji: '🍉', cats: ['season'], spec: '8-10斤/个', origin: '宁夏中卫', retail: 26.9, group: 21.9, bulk: [{ min: 1, price: 19.9 }, { min: 50, price: 17.5 }], stock: 180, sales: 980, on: true, tag: '整颗直发', fresh: 95 },
  { id: 'P05', name: '丹东红颜草莓', emoji: '🍓', cats: ['rec', 'fruit'], spec: '300g/盒', origin: '辽宁丹东', retail: 49.9, group: 42.0, bulk: [{ min: 1, price: 38.0 }, { min: 50, price: 34.5 }], stock: 96, sales: 1240, on: true, tag: '限量预售', fresh: 99 },
  { id: 'P06', name: '海南贵妃芒', emoji: '🥭', cats: ['season'], spec: '5斤装', origin: '海南三亚', retail: 35.8, group: 28.8, bulk: [{ min: 1, price: 25.8 }, { min: 50, price: 22.9 }], stock: 210, sales: 875, on: true, tag: '', fresh: 96 },
  { id: 'P07', name: '奉化水蜜桃', emoji: '🍑', cats: ['season'], spec: '6个装', origin: '浙江奉化', retail: 42.0, group: 34.0, bulk: [{ min: 1, price: 31.0 }, { min: 50, price: 28.0 }], stock: 130, sales: 640, on: true, tag: '', fresh: 94 },
  { id: 'P08', name: '菲律宾香蕉', emoji: '🍌', cats: ['fruit'], spec: '约2斤', origin: '菲律宾', retail: 14.9, group: 11.9, bulk: [{ min: 1, price: 10.5 }, { min: 100, price: 9.2 }], stock: 620, sales: 3120, on: true, tag: '', fresh: 92 },
  { id: 'P09', name: '佳沛奇异果', emoji: '🥝', cats: ['fruit'], spec: '6个装', origin: '新西兰', retail: 39.0, group: 32.0, bulk: [{ min: 1, price: 29.0 }, { min: 50, price: 26.0 }, { min: 200, price: 23.9 }], stock: 240, sales: 1120, on: true, tag: '进口', fresh: 97 },
  { id: 'P10', name: '智利车厘子', emoji: '🍒', cats: ['rec', 'fruit'], spec: '2斤 JJ级', origin: '智利', retail: 128.0, group: 108.0, bulk: [{ min: 1, price: 99.0 }, { min: 20, price: 92.0 }, { min: 100, price: 85.0 }], stock: 42, sales: 430, on: true, tag: '高端礼遇', fresh: 99 },
  { id: 'P11', name: '云南蓝莓', emoji: '🫐', cats: ['fruit'], spec: '125g×4盒', origin: '云南蒙自', retail: 45.9, group: 37.9, bulk: [{ min: 1, price: 34.9 }, { min: 50, price: 31.0 }], stock: 150, sales: 760, on: true, tag: '', fresh: 98 },
  { id: 'P12', name: '金钻凤梨', emoji: '🍍', cats: ['season'], spec: '2个装', origin: '海南', retail: 29.9, group: 24.9, bulk: [{ min: 1, price: 22.5 }, { min: 50, price: 20.0 }], stock: 190, sales: 690, on: true, tag: '', fresh: 95 },
  { id: 'P13', name: '泰国椰青', emoji: '🥥', cats: ['fruit'], spec: '4个装', origin: '泰国', retail: 36.0, group: 29.9, bulk: [{ min: 1, price: 27.0 }, { min: 50, price: 24.0 }], stock: 220, sales: 545, on: true, tag: '', fresh: 96 },
  { id: 'P14', name: '库尔勒香梨', emoji: '🍐', cats: ['fruit'], spec: '5斤装', origin: '新疆库尔勒', retail: 38.0, group: 30.0, bulk: [{ min: 1, price: 27.5 }, { min: 50, price: 24.8 }], stock: 300, sales: 880, on: true, tag: '', fresh: 95 },
  { id: 'P15', name: '西州蜜哈密瓜', emoji: '🍈', cats: ['season'], spec: '4-5斤/个', origin: '新疆吐鲁番', retail: 33.0, group: 26.0, bulk: [{ min: 1, price: 23.5 }, { min: 50, price: 21.0 }], stock: 165, sales: 720, on: true, tag: '', fresh: 94 },
  { id: 'P16', name: '尤力克柠檬', emoji: '🍋', cats: ['fruit'], spec: '8个装', origin: '四川安岳', retail: 16.9, group: 13.9, bulk: [{ min: 1, price: 12.5 }, { min: 100, price: 10.8 }], stock: 410, sales: 1420, on: true, tag: '', fresh: 93 },
  { id: 'P17', name: '墨西哥牛油果', emoji: '🥑', cats: ['fruit'], spec: '4个装', origin: '墨西哥', retail: 34.9, group: 28.9, bulk: [{ min: 1, price: 26.0 }, { min: 50, price: 23.5 }], stock: 140, sales: 380, on: true, tag: '', fresh: 96 },
  { id: 'P18', name: '每日坚果30包', emoji: '🥜', cats: ['snack'], spec: '25g×30', origin: '国产', retail: 69.0, group: 59.0, bulk: [{ min: 1, price: 52.0 }, { min: 20, price: 48.0 }], stock: 260, sales: 990, on: true, tag: '办公室常备', fresh: 100 },
  { id: 'P19', name: '临安山核桃', emoji: '🌰', cats: ['snack'], spec: '500g/袋', origin: '浙江临安', retail: 89.0, group: 75.0, bulk: [{ min: 1, price: 68.0 }, { min: 20, price: 62.0 }], stock: 88, sales: 320, on: true, tag: '', fresh: 100 },
  { id: 'P20', name: 'NFC鲜榨果汁', emoji: '🥤', cats: ['snack'], spec: '300ml×12', origin: '国产', retail: 79.0, group: 66.0, bulk: [{ min: 1, price: 58.0 }, { min: 20, price: 53.0 }], stock: 190, sales: 610, on: true, tag: '会议用水', fresh: 100 },
  { id: 'P21', name: '阳光鲜果大礼包', emoji: '🎁', cats: ['gift', 'rec'], spec: '8种水果混装', origin: '全球精选', retail: 168.0, group: 148.0, bulk: [{ min: 1, price: 138.0 }, { min: 20, price: 128.0 }, { min: 100, price: 118.0 }], stock: 60, sales: 450, on: true, tag: '节日送礼', fresh: 97 },
  { id: 'P22', name: '企业果篮 · 标准版', emoji: '🧺', cats: ['gift'], spec: '10-12人份', origin: '全球精选', retail: 298.0, group: 268.0, bulk: [{ min: 1, price: 248.0 }, { min: 10, price: 228.0 }, { min: 50, price: 208.0 }], stock: 35, sales: 210, on: true, tag: '企业专供', fresh: 98 },
  { id: 'P23', name: '企业果篮 · 尊享版', emoji: '🍱', cats: ['gift'], spec: '20-25人份', origin: '全球精选', retail: 598.0, group: 538.0, bulk: [{ min: 1, price: 498.0 }, { min: 10, price: 458.0 }, { min: 50, price: 418.0 }], stock: 18, sales: 96, on: true, tag: '企业专供', fresh: 98 },
  { id: 'P24', name: '办公室水果周配', emoji: '📦', cats: ['gift'], spec: '每周2次×4周', origin: '云峰直供', retail: 880.0, group: 820.0, bulk: [{ min: 1, price: 760.0 }, { min: 10, price: 700.0 }], stock: 24, sales: 138, on: true, tag: '订阅制', fresh: 99 }
];

/* ---------- 会员等级 ---------- */
YF.LEVELS = [
  { key: 'normal', name: '普通会员', icon: '🥉', min: 0, discount: 1.00, rate: 1.0, color: '#8A8F98' },
  { key: 'silver', name: '银卡会员', icon: '🥈', min: 1000, discount: 0.98, rate: 1.2, color: '#9AA5B1' },
  { key: 'gold', name: '金卡会员', icon: '🥇', min: 5000, discount: 0.95, rate: 1.5, color: '#D9A441' },
  { key: 'diamond', name: '钻石会员', icon: '💎', min: 20000, discount: 0.92, rate: 2.0, color: '#5B8FF9' }
];

/* ---------- 充值套餐 ---------- */
YF.RECHARGE_PLANS = [
  { amount: 100, gift: 10, label: '充100送10' },
  { amount: 300, gift: 40, label: '充300送40' },
  { amount: 500, gift: 80, label: '充500送80', hot: true },
  { amount: 1000, gift: 200, label: '充1000送200', hot: true },
  { amount: 3000, gift: 700, label: '充3000送700' }
];

/* ---------- 优惠券 ---------- */
YF.COUPON_TEMPLATES = [
  { id: 'C1', name: '新人立减', type: 'cash', value: 10, threshold: 39, scope: 'takeaway', expiry: '7天' },
  { id: 'C2', name: '团购专享', type: 'cash', value: 15, threshold: 88, scope: 'group', expiry: '15天' },
  { id: 'C3', name: '企采满减', type: 'cash', value: 200, threshold: 2000, scope: 'bulk', expiry: '30天' },
  { id: 'C4', name: '全场95折', type: 'rate', value: 0.95, threshold: 0, scope: 'all', expiry: '30天' }
];

/* ---------- 门店信息（顾客端与后台共用同一份数据） ---------- */
YF.SHOP_INFO = {
  logo: '🍊',
  name: '云峰水果大卖场 汉口西路店',
  short: '云峰水果大卖场',
  slogan: '10 年老品牌 · 全球鲜果直采',
  address: '南京市鼓楼区汉口西路 68 号 1F（近上海路）',
  phone: '400-025-8888',
  hours: '08:00 - 22:00',
  notice: '今日凌晨到货：阳光玫瑰、赣南脐橙、丹东草莓均已上架，数量有限先到先得。坏果包赔：签收 24 小时内拍照即可赔付。',
  delivery: '南京市区 2 小时达 · 满 39 元免配送费'
};

/* ---------- 拼团演示用虚拟团员 ---------- */
YF.MOCK_USERS = [
  { name: '王女士', avatar: '🙋‍♀️' }, { name: '陈先生', avatar: '🙋‍♂️' },
  { name: '刘老师', avatar: '👩‍🏫' }, { name: '赵阿姨', avatar: '👵' },
  { name: '孙同学', avatar: '🧑‍🎓' }, { name: '周经理', avatar: '🧑‍💼' },
  { name: '吴女士', avatar: '👩' }, { name: '徐师傅', avatar: '🧑‍🍳' },
  { name: '何小姐', avatar: '👩‍🦰' }, { name: '罗先生', avatar: '🧔' },
  { name: '丁医生', avatar: '👩‍⚕️' }, { name: '冯老师', avatar: '👨‍🏫' }
];

/* ---------- 自提点 ---------- */
YF.PICKUP_POINTS = [
  { id: 'S1', name: '云峰水果大卖场 汉口西路店', addr: '鼓楼区汉口西路 68 号 1F', distance: '0.8km', hours: '09:00-21:00' },
  { id: 'S2', name: '中海环宇城自提点', addr: '鼓楼区清凉门大街环宇城1F', distance: '2.3km', hours: '10:00-20:00' },
  { id: 'S3', name: '雨花客厅自提点', addr: '雨花台区软件大道雨花客厅', distance: '4.1km', hours: '09:30-20:30' },
  { id: 'S4', name: '仙林万达茂自提点', addr: '栖霞区仙林大道万达茂3F', distance: '9.6km', hours: '10:00-21:00' }
];

/* ---------- 团长 ---------- */
YF.GROUP_LEADERS = [
  { id: 'L1', name: '张团长', area: '仁恒江湾城', members: 186, avatar: '🧑‍🌾' },
  { id: 'L2', name: '李团长', area: '中海塞纳丽舍', members: 142, avatar: '👩‍🌾' },
  { id: 'L3', name: '王团长', area: '万科光明城市', members: 98, avatar: '🧑‍💼' }
];

/* ---------- 默认会员 ---------- */
YF.DEFAULT_USER = {
  name: '李小果',
  phone: '138****6721',
  avatar: '🍊',
  level: 'gold',
  points: 2860,
  balance: 528.60,
  totalSpend: 8620.0,
  coupons: [
    { id: 'UC1', tpl: 'C1', used: false },
    { id: 'UC2', tpl: 'C2', used: false },
    { id: 'UC4', tpl: 'C4', used: false }
  ],
  addresses: [
    { id: 'A1', name: '李小果', phone: '138****6721', tag: '家', addr: '建邺区江东中路369号仁恒江湾城 3栋1802', isDefault: true },
    { id: 'A2', name: '李小果', phone: '138****6721', tag: '公司', addr: '鼓楼区中山北路105号中山大厦 A座 22F', isDefault: false }
  ],
  company: { name: '云峰科技（南京）有限公司', taxNo: '91320100MA1XXXXX2B', verified: true, creditDays: 30, creditLimit: 50000 }
};

/* ---------- 时间工具 ---------- */
YF.now = function () { return Date.now(); };
YF.fmtTime = function (ts) {
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
};
YF.fmtDate = function (ts) {
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return p(d.getMonth() + 1) + '/' + p(d.getDate());
};
YF.money = function (n) {
  n = Number(n) || 0;
  return '¥' + n.toFixed(2);
};
YF.money0 = function (n) {
  n = Number(n) || 0;
  return '¥' + (Math.round(n * 100) / 100).toFixed(0);
};
