// Renders the Wallet card artwork (chapter strips + wordmark) into out.json; then copy into api/_lib/tpr-images.js.
// Fonts: npm pack @fontsource/source-serif-4@5.1.1 @fontsource/montserrat@5.1.1 and set F to the unpacked folder.
const { chromium } = require('playwright'); const fs = require('fs');
const F='/tmp/claude-0/-home-claude/5c22198b-82f2-5d42-b0c5-c6d0d81aadd1/scratchpad/fonts';
const ff=(p)=>'data:font/woff2;base64,'+fs.readFileSync(p).toString('base64');
const css='@font-face{font-family:SS;font-weight:400;src:url('+ff(F+'/fontsource-source-serif-4-5.1.1/package/files/source-serif-4-latin-400-normal.woff2')+')}'+
 '@font-face{font-family:SS;font-weight:600;src:url('+ff(F+'/fontsource-source-serif-4-5.1.1/package/files/source-serif-4-latin-600-normal.woff2')+')}'+
 '@font-face{font-family:MS;font-weight:600;src:url('+ff(F+'/fontsource-montserrat-5.1.1/package/files/montserrat-latin-600-normal.woff2')+')}'+
 '*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent}';
const CH=[['CHAPTER 1','Foundation','0–9 sessions'],['CHAPTER 2','Control','10–19 sessions'],['CHAPTER 3','Strength','20–29 sessions'],['CHAPTER 4','Confidence','30–39 sessions'],['CHAPTER 5','Refinement','40–49 sessions'],['CHAPTER 6','Resilience','50–59 sessions'],['CHAPTER 7','Lifestyle','60–69 sessions'],['TPR','Inner Circle','70+ sessions']];
function strip(c){ return `<style>${css}
.s{width:375px;height:123px;background:#3A2617;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#F6EDE3}
.l{position:absolute;left:24px;right:24px;height:1px;background:#E8A0A8;opacity:.85}.t{top:5px}.b{bottom:5px}
.k{font:600 10.5px MS;letter-spacing:2.6px;color:#EFA3AC;margin-bottom:2px}
.w{font:600 40px/1.02 SS;letter-spacing:-.2px}
.n{font:400 18.5px/1.2 SS;margin-top:3px;color:#EFE4D8}</style>
<div class="s"><div class="l t"></div><div class="k">${c[0]}</div><div class="w">${c[1]}</div><div class="n">${c[2]}</div><div class="l b"></div></div>`; }
const logo=`<style>${css}.g{width:160px;height:50px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;color:#F6EDE3}
.a{font:400 14px/1 SS;letter-spacing:.7px;white-space:nowrap}.c{font:400 12.5px/1 SS;margin-top:4px;margin-left:1px;color:#EFE4D8}</style>
<div class="g"><div class="a">THE PILATES ROOM</div><div class="c">by Chloe</div></div>`;
(async()=>{ const b=await chromium.launch(); const out={};
 for (const sc of [1,2,3]) { const p=await b.newPage({viewport:{width:400,height:200},deviceScaleFactor:sc});
  for (let i=0;i<CH.length;i++){ await p.setContent(strip(CH[i])); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(150);
    const buf=await p.locator('.s').screenshot({omitBackground:false}); out[i+':strip'+(sc>1?'@'+sc+'x':'')+'.png']=buf.toString('base64'); if(sc===2) fs.writeFileSync('strip'+i+'.png',buf); }
  await p.setContent(logo); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(150);
  const lb=await p.locator('.g').screenshot({omitBackground:true}); out['logo'+(sc>1?'@'+sc+'x':'')+'.png']=lb.toString('base64'); if(sc===3) fs.writeFileSync('logo3.png',lb);
  await p.close(); }
 fs.writeFileSync('out.json',JSON.stringify(out)); await b.close(); })();
