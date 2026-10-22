/* =========================================================
 * 云峰鲜果 · 入库单识别引擎
 * ---------------------------------------------------------
 * 流程：图片 →（OCR 取文本行）→ 行解析 → SKU 匹配 → 置信度
 *
 * 接入真实 OCR：调用 YF.ocr.configure({ endpoint, headers, token })
 * 后端只需返回 { supplier, no, date, raws: ["商品 规格 数量 单价 金额", ...] }
 * 即可无缝替换内置演示引擎，后续解析与入库逻辑完全复用。
 * ========================================================= */
(function () {
  /* ---------- 商品别名表：识别出的名称 → SKU ---------- */
  const ALIAS = {
    '阳光玫瑰': 'P01', '葡萄': 'P01', '阳光玫瑰葡萄': 'P01',
    '脐橙': 'P02', '赣南脐橙': 'P02', '橙子': 'P02',
    '冰糖心': 'P03', '阿克苏': 'P03', '苹果': 'P03',
    '西瓜': 'P04', '8424': 'P04', '麒麟': 'P04',
    '草莓': 'P05', '红颜': 'P05', '丹东': 'P05',
    '贵妃芒': 'P06', '芒果': 'P06',
    '水蜜桃': 'P07', '桃子': 'P07',
    '香蕉': 'P08', '菲律宾香蕉': 'P08',
    '奇异果': 'P09', '佳沛': 'P09', '猕猴桃': 'P09',
    '车厘子': 'P10', '樱桃': 'P10',
    '蓝莓': 'P11',
    '凤梨': 'P12', '菠萝': 'P12',
    '椰青': 'P13', '椰子': 'P13',
    '香梨': 'P14', '库尔勒': 'P14',
    '哈密瓜': 'P15', '西州蜜': 'P15',
    '柠檬': 'P16',
    '牛油果': 'P17', '鳄梨': 'P17',
    '每日坚果': 'P18', '坚果': 'P18',
    '山核桃': 'P19', '核桃': 'P19',
    'NFC': 'P20', '果汁': 'P20',
    '大礼包': 'P21', '礼包': 'P21',
    '标准版': 'P22', '果篮标准版': 'P22',
    '尊享版': 'P23', '果篮尊享版': 'P23',
    '周配': 'P24', '水果周配': 'P24'
  };

  /* ---------- 供应商 / 单据样本库（演示） ---------- */
  const SAMPLES = [
    {
      supplier: '南京众彩农产品物流配送中心',
      biz: '水果批发 · 每日直配',
      raws: [
        '阳光玫瑰葡萄      500g/盒        50    26.50    1325.00',
        '赣南脐橙          5斤装          80    19.60    1568.00',
        '菲律宾香蕉        约2斤         120     9.20    1104.00',
        '库尔勒香梨        5斤装          60    24.80    1488.00',
        '西州蜜哈密瓜      4-5斤/个       40    21.00     840.00'
      ]
    },
    {
      supplier: '云南宾川果蔬专业合作社',
      biz: '基地直发 · 冷链运输',
      raws: [
        '阳光玫瑰葡萄      500g/盒       200    23.80    4760.00',
        '云南蓝莓          125g×4盒       60    31.00    1860.00',
        '尤力克柠檬        8个装         100    10.80    1080.00',
        '海南贵妃芒        5斤装          50    22.90    1145.00'
      ]
    },
    {
      supplier: '三亚果品直供（海南）',
      biz: '热带水果 · 产地直采',
      raws: [
        '海南贵妃芒        5斤装         150    22.90    3435.00',
        '金钻凤梨          2个装          90    20.00    1800.00',
        '泰国椰青          4个装          80    24.00    1920.00',
        '菲律宾香蕉        约2斤          60     9.20     552.00'
      ]
    },
    {
      supplier: '智利进口水果贸易（上海）',
      biz: '进口水果 · 报关直供',
      raws: [
        '智利车厘子        2斤 JJ级       40    85.00    3400.00',
        '佳沛奇异果        6个装          60    23.90    1434.00',
        '墨西哥牛油果      4个装          50    23.50    1175.00',
        '泰国椰青          4个装          30    24.00     720.00'
      ]
    },
    {
      supplier: '云峰礼盒包装供应商',
      biz: '礼盒果篮 · 定制加工',
      raws: [
        '企业果篮·标准版   10-12人份      60   208.00   12480.00',
        '企业果篮·尊享版   20-25人份      30   418.00   12540.00',
        '阳光鲜果大礼包    8种混装        80   118.00    9440.00',
        '每日坚果30包      25g×30         40    48.00    1920.00'
      ]
    }
  ];

  /* ---------- 行解析：raw 文本 → 结构化 ---------- */
  function parseLine(raw) {
    const tokens = String(raw).trim().split(/\s{2,}|\t+| +(?=\d)/).filter(Boolean);
    if (tokens.length < 3) return null;
    // 末尾三个 token 为 数量 / 单价 / 金额
    const nums = tokens.slice(-3).map(t => parseFloat(String(t).replace(/[^\d.]/g, '')));
    if (nums.some(n => !isFinite(n))) return null;
    const qty = nums[0], price = nums[1], amount = nums[2];
    const head = tokens.slice(0, -3);
    let name = head[0] || '', spec = '';
    if (head.length > 1) {
      spec = head.slice(1).join(' ');
    }
    // 名称里可能粘连规格，如「阳光玫瑰葡萄500g/盒」
    const m = name.match(/^(.*?)([\d.]+\s*(?:g|kg|ml|斤|个|盒|箱|袋|份|人份)[\/×xX]?.*)$/);
    if (m && m[1].length >= 2) { name = m[1]; spec = (m[2] + ' ' + spec).trim(); }
    const calc = +(qty * price).toFixed(2);
    const amountOk = Math.abs(calc - amount) < Math.max(0.05, amount * 0.002);
    return { raw: raw.trim(), name: name.trim(), spec: spec.trim(), qty, price, amount, amountOk };
  }
  function parseLines(raws) {
    return raws.map(parseLine).filter(Boolean);
  }

  /* ---------- SKU 匹配 ---------- */
  function matchSku(name) {
    const ps = YF.PRODUCTS;
    const key = String(name).replace(/[·・\s]/g, '');
    // 1) 精确名称
    let hit = ps.find(p => p.name.replace(/[·・\s]/g, '') === key);
    if (hit) return { sku: hit, score: 0.99 };
    // 2) 别名最长匹配
    let best = null, bestLen = 0;
    Object.keys(ALIAS).forEach(a => {
      if (key.indexOf(a) >= 0 && a.length > bestLen) { bestLen = a.length; best = ALIAS[a]; }
    });
    if (best) {
      const p = ps.find(x => x.id === best);
      if (p) return { sku: p, score: 0.9 };
    }
    // 3) 商品名互相包含
    let inHit = ps.find(p => {
      const n = p.name.replace(/[·・\s]/g, '');
      return n.indexOf(key) >= 0 || (key.length >= 2 && key.indexOf(n) >= 0);
    });
    if (inHit) return { sku: inHit, score: 0.78 };
    return { sku: null, score: 0 };
  }

  /* ---------- 置信度 ---------- */
  function lineConfidence(line, skuScore) {
    let c = 0.52;
    if (line.amountOk) c += 0.16;
    if (line.spec) c += 0.06;
    if (line.qty > 0 && line.qty < 100000) c += 0.04;
    if (skuScore >= 0.95) c += 0.12;
    else if (skuScore >= 0.85) c += 0.08;
    else if (skuScore > 0) c += 0.03;
    else c -= 0.22;
    return +Math.max(0.28, Math.min(0.96, c)).toFixed(2);
  }

  /* ---------- 图片指纹（真实读取像素，用于挑选演示样本） ---------- */
  function fingerprint(dataUrl) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = 16; c.height = 16;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, 16, 16);
          const d = ctx.getImageData(0, 0, 16, 16).data;
          let h = 2166136261, sum = 0;
          for (let i = 0; i < d.length; i += 4) {
            const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
            sum += g;
            h ^= Math.round(g);
            h = (h * 16777619) >>> 0;
          }
          resolve({ hash: h, bright: sum / (d.length / 4), w: img.width, hgt: img.height });
        } catch (e) { resolve({ hash: Date.now() % 99991, bright: 200, w: 0, hgt: 0 }); }
      };
      img.onerror = () => resolve({ hash: Date.now() % 99991, bright: 200, w: 0, hgt: 0 });
      img.src = dataUrl;
    });
  }

  /* ---------- 仿真入库单图片（Canvas 绘制，供演示/体验） ---------- */
  function drawSampleBill(sample, idx) {
    const lines = parseLines(sample.raws);
    const W = 760, rowH = 34, headH = 210, footH = 132;
    const H = headH + lines.length * rowH + footH;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    // 纸张纹理
    g.fillStyle = '#FAFAF7';
    for (let i = 0; i < H; i += 6) g.fillRect(0, i, W, 1);
    // 抬头
    g.fillStyle = '#1F2429';
    g.font = 'bold 26px "Microsoft YaHei", sans-serif';
    g.textAlign = 'center';
    g.fillText('采 购 入 库 单', W / 2, 52);
    g.font = '13px "Microsoft YaHei", sans-serif';
    g.fillStyle = '#8A8F98';
    g.fillText(sample.supplier + ' · ' + sample.biz, W / 2, 76);
    // 单据信息
    g.textAlign = 'left';
    g.fillStyle = '#333';
    g.font = '13px "Microsoft YaHei", sans-serif';
    const no = 'RK' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') +
      String(new Date().getDate()).padStart(2, '0') + String(1000 + (idx || 0) * 37 + Math.floor(Math.random() * 90)).slice(-4);
    const d = new Date();
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    g.fillText('单据编号：' + no, 44, 118);
    g.fillText('收货门店：云峰鲜果 · 建邺万达店', 44, 142);
    g.textAlign = 'right';
    g.fillText('入库日期：' + dateStr, W - 44, 118);
    g.fillText('仓库：主仓 / 常温', W - 44, 142);
    // 表头
    g.fillStyle = '#F2F5F3'; g.fillRect(44, 160, W - 88, 34);
    g.fillStyle = '#555B66'; g.font = 'bold 13px "Microsoft YaHei", sans-serif';
    const cols = [56, 300, 470, 566, 660];
    ['商品名称', '规格', '数量', '单价', '金额'].forEach((t, i) => {
      g.textAlign = i >= 2 ? 'right' : 'left';
      g.fillText(t, cols[i], 182);
    });
    // 明细
    g.font = '14px "Microsoft YaHei", sans-serif';
    lines.forEach((l, i) => {
      const y = headH + i * rowH;
      if (i % 2) { g.fillStyle = '#FCFDFC'; g.fillRect(44, y - 24, W - 88, rowH); }
      g.fillStyle = '#1F2429';
      g.textAlign = 'left'; g.fillText(l.name, 56, y);
      g.fillStyle = '#8A8F98'; g.font = '12px "Microsoft YaHei", sans-serif';
      g.fillText(l.spec, 300, y);
      g.font = '14px "Microsoft YaHei", sans-serif';
      g.fillStyle = '#1F2429';
      g.textAlign = 'right';
      g.fillText(String(l.qty), 470, y);
      g.fillText(l.price.toFixed(2), 566, y);
      g.fillStyle = '#E54545';
      g.fillText(l.amount.toFixed(2), 700, y);
      g.strokeStyle = '#EEE'; g.beginPath();
      g.moveTo(44, y + 10); g.lineTo(W - 44, y + 10); g.stroke();
    });
    // 合计
    const fy = headH + lines.length * rowH;
    const total = lines.reduce((s, l) => s + l.amount, 0);
    const tq = lines.reduce((s, l) => s + l.qty, 0);
    g.fillStyle = '#1F2429'; g.font = 'bold 14px "Microsoft YaHei", sans-serif';
    g.textAlign = 'left'; g.fillText('合计', 56, fy + 8);
    g.textAlign = 'right'; g.fillText(tq + ' 件', 470, fy + 8);
    g.fillStyle = '#E54545'; g.font = 'bold 18px "Microsoft YaHei", sans-serif';
    g.fillText('¥ ' + total.toFixed(2), 700, fy + 10);
    // 签章
    g.fillStyle = '#8A8F98'; g.font = '12px "Microsoft YaHei", sans-serif';
    g.textAlign = 'left';
    g.fillText('送货人：____________    验收人：____________    司机：____________', 44, fy + 56);
    g.fillText('※ 本单据经拍照识别后自动生成入库记录，如有差异请在 24 小时内联系供应商', 44, fy + 82);
    // 印章
    g.save();
    g.translate(W - 110, fy + 60); g.rotate(-0.22);
    g.strokeStyle = 'rgba(229,69,69,.55)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(229,69,69,.55)'; g.font = 'bold 15px "Microsoft YaHei", sans-serif';
    g.textAlign = 'center'; g.fillText('已收货', 0, 6);
    g.restore();
    return { url: c.toDataURL('image/jpeg', 0.82), no: no, date: dateStr, total: total, qty: tq };
  }

  /* ---------- 配置：接真实 OCR ---------- */
  const CFG = { endpoint: '', headers: {}, token: '' };
  function configure(opt) { Object.assign(CFG, opt || {}); }

  /* ---------- 主入口 ---------- */
  async function recognize(dataUrl) {
    let payload;
    if (CFG.endpoint) {
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append('file', blob, 'bill.jpg');
      const res = await fetch(CFG.endpoint, {
        method: 'POST',
        headers: Object.assign({}, CFG.token ? { Authorization: 'Bearer ' + CFG.token } : {}, CFG.headers),
        body: fd
      });
      payload = await res.json();
    } else {
      const fp = await fingerprint(dataUrl);
      const idx = fp.hash % SAMPLES.length;
      const sample = SAMPLES[idx];
      const bill = drawSampleBill(sample, idx);
      payload = {
        supplier: sample.supplier,
        no: bill.no,
        date: bill.date,
        raws: sample.raws,
        _demo: true
      };
    }
    const lines = parseLines(payload.raws || []).map(l => {
      const m = matchSku(l.name);
      return {
        raw: l.raw, name: l.name, spec: l.spec,
        qty: l.qty, price: l.price, amount: l.amount,
        skuId: m.sku ? m.sku.id : '',
        skuName: m.sku ? m.sku.name : '',
        emoji: m.sku ? m.sku.emoji : '📦',
        confidence: lineConfidence(l, m.score),
        checked: true
      };
    });
    const avg = lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0;
    return {
      supplier: payload.supplier || '未知供应商',
      no: payload.no || '',
      date: payload.date || '',
      lines,
      confidence: +avg.toFixed(2),
      demo: !!payload._demo
    };
  }

  function sampleBill(idx) {
    const i = ((idx % SAMPLES.length) + SAMPLES.length) % SAMPLES.length;
    const s = SAMPLES[i];
    const bill = drawSampleBill(s, i);
    return { url: bill.url, no: bill.no, supplier: s.supplier, idx: i };
  }

  YF.ocr = { recognize, configure, parseLines, parseLine, matchSku, drawSampleBill, sampleBill, SAMPLES, ALIAS };
})();
