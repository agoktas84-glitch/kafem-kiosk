/**
 * AROMA / KAFEMi KIOSK — Merkezi Server
 * Railway.app için optimize edildi
 * Tüm kiosklar bu sunucudan menü çeker
 */
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const net     = require('net');
const app     = express();
const PORT    = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── VERİ KLASÖRÜ ──────────────────────────────────────────
const DATA_DIR   = path.join(__dirname, 'data');
const MENU_FILE  = path.join(DATA_DIR, 'menu.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const CFG_FILE   = path.join(DATA_DIR, 'config.json');
const CTR_FILE   = path.join(DATA_DIR, 'counters.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── VARSAYILAN MENÜ ───────────────────────────────────────
const DEFAULT_MENU = [
  {id:1,cat:"Kahve",name:"Espresso",desc:"Yoğun, saf İtalyan usulü",price:45,emoji:"☕",st:"bar",opts:{Boyut:["Tek","Çift"],Sıcaklık:["Sıcak","Serin"]},active:true},
  {id:2,cat:"Kahve",name:"Latte",desc:"Kadifemsi sütlü espresso",price:65,emoji:"🥛",st:"bar",opts:{Boyut:["Küçük","Orta","Büyük"],Süt:["Tam yağlı","Yulaf","Badem"],Sıcaklık:["Sıcak","Soğuk"]},active:true},
  {id:3,cat:"Kahve",name:"Cappuccino",desc:"Eşit espresso, süt ve köpük",price:60,emoji:"☕",st:"bar",opts:{Boyut:["Küçük","Orta"],Süt:["Tam yağlı","Yulaf"]},active:true},
  {id:4,cat:"Kahve",name:"Türk Kahvesi",desc:"Geleneksel cezve usulü",price:50,emoji:"🫖",st:"bar",opts:{Şeker:["Şekersiz","Az","Orta","Çok"]},active:true},
  {id:5,cat:"Soğuk",name:"Iced Latte",desc:"Buzlu espresso ve soğuk süt",price:70,emoji:"🧊",st:"bar",opts:{Boyut:["Orta","Büyük"],Süt:["Tam yağlı","Yulaf","Badem"]},active:true},
  {id:6,cat:"Soğuk",name:"Cold Brew",desc:"18 saat soğuk demleme",price:75,emoji:"🥤",st:"bar",opts:{Servis:["Sade","Sütlü"]},active:true},
  {id:7,cat:"Soğuk",name:"Limonata",desc:"Taze sıkılmış, nane ve buz",price:55,emoji:"🍋",st:"bar",opts:{Çeşit:["Sade","Naneli","Çilekli"]},active:true},
  {id:8,cat:"Mutfak",name:"Kruvasan",desc:"Tereyağlı, çıtır Fransız usulü",price:45,emoji:"🥐",st:"mutfak",opts:{İçerik:["Sade","Çikolatalı","Kayısılı"]},active:true},
  {id:9,cat:"Mutfak",name:"Avokado Toast",desc:"Ekşi maya, avokado, limon",price:95,emoji:"🥑",st:"mutfak",opts:{Ekmek:["Ekşi maya","Tam buğday"],Ek:["Sade","Yumurtalı"]},active:true},
  {id:10,cat:"Mutfak",name:"Waffle",desc:"Şef özel, mevsim meyveleri",price:85,emoji:"🧇",st:"mutfak",opts:{Topping:["Çilek+Krema","Çikolata","Muz+Bal"]},active:true},
  {id:11,cat:"Tatlı",name:"Cheesecake",desc:"New York usulü, orman meyveli",price:75,emoji:"🍰",st:"mutfak",opts:{},active:true},
  {id:12,cat:"Tatlı",name:"Brownie",desc:"Sıcak çikolatalı, kavrulmuş fındıklı",price:55,emoji:"🍫",st:"mutfak",opts:{Servis:["Sade","Dondurmalı"]},active:true},
  {id:13,cat:"Çay",name:"Filiz Çay",desc:"Doğu Karadeniz, demlik",price:30,emoji:"🍵",st:"bar",opts:{Dem:["Açık","Normal","Koyu"]},active:true},
  {id:14,cat:"Çay",name:"Bitki Çayı",desc:"Nane-limon, ıhlamur, adaçayı",price:35,emoji:"🌿",st:"bar",opts:{Çeşit:["Nane-limon","Ihlamur","Adaçayı"]},active:true},
];

const DEFAULT_CFG = {
  bizName:        'KAFEMi',
  bizMsg:         'Afiyet olsun · KAFEMi',
  kdv:            10,
  pin:            '1234',
  pagerMax:       24,
  posMode:        'sim',
  posIp:          '10.10.30.24',
  posPort:        8888,
  printerMutfak:  '10.10.30.122',
  printerIcecek:  '10.10.30.120',
  printerBar:     '10.10.30.123',
  printerTatli:   '10.10.30.121',
  printerPort:    9100,
};

const DEFAULT_CTR = { order: 0, pager: 0, usedPagers: [] };

// ─── VERİ OKUMA/YAZMA ──────────────────────────────────────
function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return def; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getMenu()     { return readJSON(MENU_FILE,  DEFAULT_MENU); }
function getCfg()      { return readJSON(CFG_FILE,   DEFAULT_CFG); }
function getSales()    { return readJSON(SALES_FILE, {}); }
function getCounters() { return readJSON(CTR_FILE,   DEFAULT_CTR); }

function saveMenu(d)     { writeJSON(MENU_FILE,  d); }
function saveCfg(d)      { writeJSON(CFG_FILE,   d); }
function saveSales(d)    { writeJSON(SALES_FILE, d); }
function saveCounters(d) { writeJSON(CTR_FILE,   d); }

// ─── TCP ───────────────────────────────────────────────────
function tcpSend(ip, port, buffer, timeout=5000) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let resp = Buffer.alloc(0);
    const timer = setTimeout(() => { client.destroy(); reject(new Error('Zaman asimi')); }, timeout);
    client.connect(port, ip, () => client.write(buffer));
    client.on('data', d => { resp = Buffer.concat([resp, d]); });
    client.on('end',  () => { clearTimeout(timer); resolve(resp); });
    client.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

// ─── ESC/POS ───────────────────────────────────────────────
const ESC=0x1B, GS=0x1D;
const TR={'ş':'s','Ş':'S','ğ':'g','Ğ':'G','ı':'i','İ':'I','ç':'c','Ç':'C','ö':'o','Ö':'O','ü':'u','Ü':'U'};
function et(s){ return Buffer.from(String(s||'').replace(/[şŞğĞıİçÇöÖüÜ]/g,c=>TR[c]||c)+'\n','latin1'); }
function pd(l,r,w=32){ const sp=Math.max(1,w-String(l).length-String(r).length); return et(l+' '.repeat(sp)+r); }
function ds(c='-',n=32){ return et(c.repeat(n)); }
const B=f=>Buffer.from(f);
const CMD={
  INIT:B([ESC,0x40]),ALC:B([ESC,0x61,0x01]),ALL:B([ESC,0x61,0x00]),
  BON:B([ESC,0x45,0x01]),BOFF:B([ESC,0x45,0x00]),
  S2X:B([GS,0x21,0x11]),SN:B([GS,0x21,0x00]),
  LF:B([0x0A]),CUT:B([GS,0x56,0x41,0x00]),BEEP:B([ESC,0x42,0x05,0x03])
};

function guestReceipt({items,sub,kdv,tot,ds2,ts,on,pgn,pmLbl,cfg}){
  const P=[];
  P.push(CMD.INIT,CMD.ALC,CMD.BON,CMD.S2X,et(cfg.bizName),CMD.SN,CMD.BOFF);
  P.push(et('Specialty Coffee & Kitchen'),et(ds2+'  '+ts));
  P.push(CMD.BON,et('SIPARIS '+on),CMD.BOFF,ds());
  if(pgn){
    P.push(CMD.S2X,CMD.BON,et('CAGRI CIHAZI: '+String(pgn).padStart(2,'0')),CMD.SN,CMD.BOFF);
    P.push(et('Lutfen yan taraftan '+String(pgn).padStart(2,'0')+' numarali'));
    P.push(et('cagri cihazinizi aliniz.'));
    P.push(et('Siparisınız hazır olduğunda'));
    P.push(et('cihaza bildirim gelecektir.'));
    P.push(ds());
  }
  P.push(CMD.ALL,CMD.BON,et('URUN LISTESI'),CMD.BOFF,ds());
  (items||[]).forEach(it=>{
    const q=(it.qty||1)>1?` x${it.qty}`:'';
    P.push(pd(it.name+q,(it.price*(it.qty||1)).toFixed(2)+' TL'));
    if(it.optsStr) P.push(et('  '+it.optsStr));
  });
  P.push(ds(),pd('Ara toplam',Number(sub).toFixed(2)+' TL'));
  P.push(pd('KDV (%'+cfg.kdv+')',Number(kdv).toFixed(2)+' TL'),ds('='));
  P.push(CMD.BON,CMD.S2X,pd('TOPLAM',Number(tot).toFixed(2)+' TL',24),CMD.SN,CMD.BOFF);
  P.push(ds(),pd('Odeme',pmLbl),ds(),CMD.ALC,et(cfg.bizMsg));
  P.push(CMD.LF,CMD.LF,CMD.LF,CMD.CUT);
  return Buffer.concat(P);
}

function stationReceipt({items,on,pgn,ts,name}){
  if(!items||!items.length) return null;
  const P=[];
  P.push(CMD.INIT,CMD.ALC,CMD.BON,CMD.S2X,et('** '+name+' **'),CMD.SN);
  P.push(et('SIPARIS: '+on+'  '+ts));
  if(pgn){ P.push(CMD.S2X,et('CAGRI: '+String(pgn).padStart(2,'0')),CMD.SN); }
  P.push(CMD.BOFF,ds('='),CMD.ALL);
  items.forEach(it=>{
    P.push(CMD.BON,CMD.S2X,et(((it.qty||1)>1?it.qty+'x ':'')+it.name),CMD.SN,CMD.BOFF);
    if(it.optsStr) P.push(et('  -> '+it.optsStr));
  });
  P.push(ds('='),CMD.BEEP,CMD.LF,CMD.LF,CMD.LF,CMD.CUT);
  return Buffer.concat(P);
}

async function printNet(ip,buf,name,port){
  if(!buf||!ip) return;
  try{ await tcpSend(ip,port||9100,buf,5000); console.log('[YAZICI] '+name+' OK'); }
  catch(e){ console.error('[YAZICI] '+name+' HATA: '+e.message); }
}

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════

// Sağlık
app.get('/api/health', (req, res) => {
  res.json({ ok:true, uptime:process.uptime().toFixed(0)+'s', menu: getMenu().length+' ürün' });
});

// ── MENÜ ───────────────────────────────────────────────────
app.get('/api/menu', (req, res) => {
  res.json(getMenu());
});

app.post('/api/menu', (req, res) => {
  const menu = req.body;
  if (!Array.isArray(menu)) return res.status(400).json({ error: 'Geçersiz menü' });
  saveMenu(menu);
  res.json({ ok:true, count: menu.length });
});

app.post('/api/menu/item', (req, res) => {
  const menu = getMenu();
  const item = { ...req.body, id: Date.now(), active: true };
  menu.push(item);
  saveMenu(menu);
  res.json({ ok:true, item });
});

app.put('/api/menu/item/:id', (req, res) => {
  const menu = getMenu();
  const idx  = menu.findIndex(i => i.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Ürün bulunamadı' });
  menu[idx] = { ...menu[idx], ...req.body };
  saveMenu(menu);
  res.json({ ok:true });
});

app.delete('/api/menu/item/:id', (req, res) => {
  let menu = getMenu();
  menu = menu.filter(i => i.id != req.params.id);
  saveMenu(menu);
  res.json({ ok:true });
});

// ── KONFİG ─────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json(getCfg());
});

app.post('/api/config', (req, res) => {
  const cfg = { ...getCfg(), ...req.body };
  saveCfg(cfg);
  res.json({ ok:true });
});

// ── SAYAÇLAR ───────────────────────────────────────────────
app.get('/api/counters', (req, res) => {
  res.json(getCounters());
});

app.post('/api/counters', (req, res) => {
  const ctr = { ...getCounters(), ...req.body };
  saveCounters(ctr);
  res.json({ ok:true, counters: ctr });
});

app.post('/api/counters/reset', (req, res) => {
  saveCounters(DEFAULT_CTR);
  res.json({ ok:true });
});

// ── ÖDEME ──────────────────────────────────────────────────
app.post('/api/payment/process', async (req, res) => {
  const { amount, orderId } = req.body;
  const cfg = getCfg();
  console.log('\n[ODEME] '+orderId+' -> '+amount+' TL / mod: '+cfg.posMode);

  if (cfg.posMode === 'sim') {
    await new Promise(r => setTimeout(r, 2000));
    return res.json({ success:true, transactionId:'SIM-'+Date.now(), message:'Simulasyon onayi' });
  }

  try {
    const amtStr = Math.round(parseFloat(amount)*100).toString().padStart(12,'0');
    const ordStr = (orderId||'').replace(/[^0-9A-Za-z]/g,'').padEnd(16,'0').substring(0,16);
    const cmd    = '6000'+amtStr+ordStr;
    let lrc = 0; for(const c of cmd) lrc ^= c.charCodeAt(0);
    const buf = Buffer.alloc(cmd.length+3);
    buf[0]=0x02; Buffer.from(cmd).copy(buf,1); buf[cmd.length+1]=0x03; buf[cmd.length+2]=lrc;
    const resp = await tcpSend(cfg.posIp, cfg.posPort, buf, 30000);
    const data = resp.slice(1, resp.length-2).toString('ascii');
    const code = data.substring(0,2);
    if(code==='00') return res.json({ success:true, transactionId:data.substring(2,8).trim(), message:'Odeme onaylandi' });
    const errs = {'01':'Kart reddedildi','05':'Onaylanmadi','51':'Yetersiz bakiye','54':'Kart suresi dolmus','55':'Hatali PIN','91':'Banka sistemi kullanilamiyor'};
    return res.json({ success:false, message:errs[code]||'Hata: '+code });
  } catch(e) {
    console.error('[ODEME] HATA:', e.message);
    return res.json({ success:false, message:'POS baglanamadi: '+e.message });
  }
});

// ── FİŞ YAZDIRMA ───────────────────────────────────────────
app.post('/api/print', async (req, res) => {
  const { items, sub, kdv, tot, on, pgn, pmLbl, barI, kitI, icecekI, tatliI } = req.body;
  const cfg = getCfg();
  const now = new Date();
  const ts  = now.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
  const ds2 = now.toLocaleDateString('tr-TR');
  const mp  = arr => (arr||[]).map(it=>({...it,qty:it.qty||1,optsStr:it.opts?Object.values(it.opts).filter(Boolean).join(', '):''}));

  const gBuf = guestReceipt({items:mp(items),sub,kdv,tot,ds2,ts,on,pgn,pmLbl,cfg});
  const mBuf = stationReceipt({items:mp(kitI),   on,pgn,ts,name:'MUTFAK'});
  const bBuf = stationReceipt({items:mp(barI),   on,pgn,ts,name:'BAR'});
  const iBuf = stationReceipt({items:mp(icecekI),on,pgn,ts,name:'ICECEK'});
  const tBuf = stationReceipt({items:mp(tatliI), on,pgn,ts,name:'TATLI'});

  await Promise.allSettled([
    printNet(cfg.printerMutfak, mBuf, 'Mutfak', cfg.printerPort),
    printNet(cfg.printerBar,    bBuf, 'Bar',    cfg.printerPort),
    printNet(cfg.printerIcecek, iBuf, 'Icecek', cfg.printerPort),
    printNet(cfg.printerTatli,  tBuf, 'Tatli',  cfg.printerPort),
    printNet(cfg.printerGuest||cfg.printerMutfak, gBuf, 'Misafir', cfg.printerPort),
  ]);

  // Satış kaydet
  const sales = getSales();
  const key   = now.toISOString().split('T')[0];
  if(!sales[key]) sales[key]={};
  (items||[]).forEach(it=>{
    if(!sales[key][it.id]) sales[key][it.id]={name:it.name,qty:0,revenue:0};
    sales[key][it.id].qty     += (it.qty||1);
    sales[key][it.id].revenue += it.price*(it.qty||1);
  });
  saveSales(sales);
  console.log('[KAYIT] '+on+' kaydedildi');
  res.json({ ok:true });
});

// ── RAPOR ──────────────────────────────────────────────────
app.get('/api/sales',       (req, res) => res.json(getSales()));
app.get('/api/sales/:date', (req, res) => { const s=getSales(); res.json(s[req.params.date]||{}); });
app.delete('/api/sales/:date', (req, res) => { const s=getSales(); delete s[req.params.date]; saveSales(s); res.json({ok:true}); });

// Ana sayfa
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ─── BAŞLAT ────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     KAFEMi KIOSK — Merkezi Sunucu        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  PORT   : ${PORT}                              ║`);
  console.log(`║  MENÜ   : ${getMenu().length} ürün (data/menu.json)     ║`);
  console.log('╚══════════════════════════════════════════╝\n');
});
