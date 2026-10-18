'use strict';
const $ = (id) => document.getElementById(id);
const STOCKS = {INFY:'Infosys Limited',TCS:'Tata Consultancy Services Limited',ICICIBANK:'ICICI Bank Limited',HDFCBANK:'HDFC Bank Limited',RELIANCE:'Reliance Industries Limited',SBIN:'State Bank of India','M&M':'Mahindra & Mahindra Limited',NTPC:'NTPC Limited'};
const FACTOR_NAMES=['Daily prices','Recent news','Financial ratios','Cited filings','Historical financials','Management/thesis context'];
const NUMERIC=['revenueGrowth','epsGrowth','roe','debtEquity','pe','historicalYears'];
const FIELDS=[...NUMERIC,'fcfPositive','reportPeriod','source1','source2','managementNotes'];
let current=null;
let savedStatus = null;
let status={keysConfigured:{market:false,news:false,ai:false}};
let activeSymbol='DEMO';
function setText(id,text){ $(id).textContent=text; }
function money(n){ return Number.isFinite(Number(n))?'₹'+Number(n).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2}):'—'; }
function fmtDay(d){if(!d)return 'Unknown';const dt=new Date(d.length===10?d+'T00:00:00Z':d);return isNaN(dt)?d:dt.toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'});}
function safeLink(u){try{const x=new URL(u);return x.protocol==='https:'?x.href:null}catch{return null}}
function getFinancials(){
  const d={};for(const id of NUMERIC){const v=$(id).value.trim();d[id]=v?Number(v):null;}
  const f=$('fcfPositive').value;d.fcfPositive=f===''?null:f==='true';
  d.reportPeriod=$('reportPeriod').value.slice(0,80);
  d.sourceUrls=[$('source1').value.trim(),$('source2').value.trim()].filter(Boolean);
  d.managementNotes=$('managementNotes').value.trim().slice(0,1800);
  return d;
}
function setFinancials(d={}){
  for(const id of NUMERIC){$(id).value=d[id]??'';}
  $('fcfPositive').value=d.fcfPositive===true?'true':d.fcfPositive===false?'false':'';
  $('reportPeriod').value=d.reportPeriod||'';
  $('source1').value=(d.sourceUrls||[])[0]||'';
  $('source2').value=(d.sourceUrls||[])[1]||'';
  $('managementNotes').value=d.managementNotes||'';
}
function storageKey(s){return 'northstar-research-v1-'+s}
function persist(){localStorage.setItem(storageKey(activeSymbol),JSON.stringify(getFinancials()));setText('savedStatus','Saved to this browser · not cloud');renderReadiness();}
function restore(s){try{setFinancials(JSON.parse(localStorage.getItem(storageKey(s)))||{})}catch{setFinancials({})}setText('savedStatus','Local browser only');}
function isHTTPS(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username}catch{return false}}
function quality(prices, articles, f){
  const present=['revenueGrowth','epsGrowth','roe','debtEquity','pe','fcfPositive'].filter(k=>f[k]!==null&&f[k]!==undefined&&f[k]!=='').length;
  const sourceCount=(f.sourceUrls||[]).filter(isHTTPS).length;
  const items={
    'Daily prices':prices.length>=50?15:prices.length?7:0,
    'Recent news':articles.length>=3?10:articles.length?5:0,
    'Financial ratios':Math.round(present/6*30),
    'Cited filings':sourceCount>=2?25:sourceCount===1?12:0,
    'Historical financials':f.historicalYears>=3?10:0,
    'Management/thesis context':f.managementNotes?10:0
  };
  const score=Object.values(items).reduce((a,b)=>a+b,0);
  return {score,items,researchReady:score>=75&&sourceCount>=2&&prices.length>0};
}
function renderChart(prices){
 const chart=$('priceChart');if(!prices.length){chart.style.display='none';$('chartFallback').style.display='grid';setText('fromDate','—');setText('toDate','—');return;}
 chart.style.display='block';$('chartFallback').style.display='none';
 const vals=prices.map(x=>Number(x.close)).filter(Number.isFinite);if(!vals.length)return;
 let min=Math.min(...vals),max=Math.max(...vals);const pad=(max-min||1)*.16;min-=pad;max+=pad;
 const W=700,H=250,xLeft=8,xRight=692,yTop=14,yBottom=235;
 const points=prices.map((p,i)=>{const x=xLeft+i/(Math.max(1,prices.length-1))*(xRight-xLeft);const y=yBottom-(Number(p.close)-min)/(max-min)*(yBottom-yTop);return [x,y]});
 const d=points.map((v,i)=>(i===0?'M':'L')+v[0].toFixed(2)+' '+v[1].toFixed(2)).join(' ');
 $('linePath').setAttribute('d',d);
 $('fillPath').setAttribute('d',d+` L ${points.at(-1)[0]} ${yBottom} L ${xLeft} ${yBottom} Z`);
 $('gridPath').setAttribute('d','M 0 65 H 700 M 0 132 H 700 M 0 200 H 700');
 setText('fromDate',fmtDay(prices[0].date));setText('toDate',fmtDay(prices.at(-1).date));
}
function renderNews(articles){
 const list=$('newsList');list.replaceChildren();
 if(!articles.length){const p=document.createElement('p');p.className='section-explain';p.textContent='No news retrieved. Configure GNews in your .env, or check provider quota. Free headlines are delayed by 12 hours.';list.append(p);return;}
 for(const a of articles){
  const wrap=document.createElement('div');wrap.className='news-item';
  const link=safeLink(a.url);const title=document.createElement(link?'a':'div');
  title.textContent=a.title||'Untitled story';if(link){title.href=link;title.rel='noopener noreferrer';title.target='_blank';}wrap.append(title);
  const p=document.createElement('p');p.textContent=(a.description||'').slice(0,240);wrap.append(p);
  const meta=document.createElement('small');meta.textContent=(a.source||'Unknown')+' · '+fmtDay(a.publishedAt);wrap.append(meta);list.append(wrap);
 }
}
function metricFlags(f){
 const out=[];
 if(f.pe!==null&&f.pe<=0)out.push('Non-positive P/E: examine earnings and one-time items before valuing the business.');
 if(f.pe!==null&&f.pe>=35)out.push('Elevated P/E: requires credible sustainable growth to support the valuation.');
 if(f.epsGrowth!==null&&f.epsGrowth<0)out.push('EPS decline: investigate whether weakness is cyclical or structural.');
 if(f.revenueGrowth!==null&&f.revenueGrowth<0)out.push('Revenue decline: investigate business demand and competitive positioning.');
 if(f.roe!==null&&f.roe<10)out.push('ROE below 10%: investigate capital efficiency and balance-sheet structure.');
 if(f.debtEquity!==null&&f.debtEquity>1.5)out.push('High leverage: validate sector-specific meaning, maturity profile and refinancing.');
 if(f.fcfPositive===false)out.push('Negative free cash flow: distinguish expansion spending from core weakness.');
 if(!out.length)out.push('No simple red flags identified. This does not mean the stock is safe or undervalued.');
 return out;
}
function renderReadiness(){
 if(!current)return;
 const prices=current.market.prices||[],articles=current.news.articles||[],f=getFinancials();
 const qa=quality(prices,articles,f);setText('researchScore',qa.score+' / 100');setText('bigScore',qa.score+'%');
 $('ring').style.background=`conic-gradient(#65dec3 0deg ${qa.score*3.6}deg,#273949 ${qa.score*3.6}deg 360deg)`;
 const good=qa.researchReady&&!current.simulation;
 setText('verdict',current.simulation?'Demonstration only':good?'Initial research possible':'Important inputs missing');
 setText('assessment',current.simulation?'Simulation':good?'Thesis review possible':'Insufficient evidence');
 setText('assessmentSub',current.simulation?'Fictional example only':good?'Not a stock rating or buy signal':'Add real financial evidence');
 const cover=$('coverageItems');cover.replaceChildren();
 for(const name of FACTOR_NAMES){const el=document.createElement('div');el.className='coverage-row';
   const l=document.createElement('span'),r=document.createElement('strong');l.textContent=name;r.textContent=qa.items[name]+' / '+({'Daily prices':15,'Recent news':10,'Financial ratios':30,'Cited filings':25,'Historical financials':10,'Management/thesis context':10}[name]);el.append(l,r);cover.append(el);}
 const wrap=$('flags');wrap.replaceChildren();for(const flag of metricFlags(f)){const el=document.createElement('div');el.className='flag';el.textContent=flag;wrap.append(el);}
 $('generateAI').disabled=current.simulation||!status.keysConfigured.ai||!good;
 $('generateAI').title=current.simulation?'Simulated data cannot go to AI':!status.keysConfigured.ai?'Add GEMINI_API_KEY to .env':!good?'Provide market data and enough verified company evidence':'';
}
function renderMarket(){
 if(!current)return;const {company,market,news,simulation}=current;
 setText('crumb',company);setText('chartCompany',company);$('demoBanner').style.display='block';
 $('demoBanner').className='notice'+(simulation?'':' real');
 $('demoBanner').textContent=simulation?'SIMULATED DEMO — Every price and headline is fictional. These are NOT real financial data.':
  'REAL COMPANY MODE — Market prices and headlines come only from the configured providers. Financial ratios are manually entered and NOT independently verified by this app.';
 const ps=market.prices||[],a=news.articles||[];const first=ps[0],last=ps.at(-1);
 setText('lastPrice',last?money(last.close):'—');setText('priceDate',last?'Close · '+fmtDay(last.date):market.error||'No price feed');
 const change=first&&last?(last.close/first.close-1)*100:null;
 setText('priceChange',change===null?'—':(change>=0?'+':'')+change.toFixed(2)+'%');
 $('priceChange').style.color=change===null?'':change>=0?'#65dec3':'#ed9a9c';
 setText('marketBadge',simulation?'SIMULATED':market.ok?'EODHD · EOD':'Not connected');
 setText('newsBadge',simulation?'SIMULATED':news.ok?'GNews · 12h delayed':'Not connected');
 setText('sourceLabel',market.source||market.error||'Missing market key');
 renderChart(ps);renderNews(a);renderReadiness();
 $('aiOutput').textContent='AI analysis not yet generated. Add verified company sources, then run the analyst. Existing assessments never update automatically.';
}
async function getJson(url){const response=await fetch(url,{cache:'no-store'});return await response.json();}
async function load(symbol){
 activeSymbol=symbol;setText('crumb','Loading…');$('refresh').disabled=true;
 setText('priceDate','Fetching research sources…');$('aiOutput').textContent='Waiting for data.';restore(symbol);
 try{
  if(symbol==='DEMO')current=await getJson('/api/demo');
  else{
   const [market,news]=await Promise.all([getJson('/api/market?symbol='+encodeURIComponent(symbol)),getJson('/api/news?symbol='+encodeURIComponent(symbol))]);
   current={symbol,company:STOCKS[symbol],market,news,simulation:false};
  }
  renderMarket();
 }catch(e){current={symbol,company:STOCKS[symbol]||'Fictional demo',simulation:symbol==='DEMO',market:{prices:[],error:e.message},news:{articles:[],error:e.message}};renderMarket();}
 finally{$('refresh').disabled=false;}
}
async function runAI(){if(!current||current.simulation)return;
 const btn=$('generateAI');btn.disabled=true;btn.textContent='Generating analysis…';
 $('aiOutput').textContent='Checking evidence and requesting analysis. No brokerage actions will be taken.';
 try{
 const r=await fetch('/api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
  symbol:current.symbol,company:current.company,simulation:false,
  market:{prices:current.market.prices||[]},articles:current.news.articles||[],financials:getFinancials()
 })});
 const data=await r.json();
 $('aiOutput').textContent=data.ok?data.text+'\n\n—\n'+data.disclosure:(data.error||'No research returned.');
 }catch(e){$('aiOutput').textContent='Unable to contact the research service: '+e.message;}
 finally{btn.textContent='✧ Generate research thesis';renderReadiness();}
}
function buildWatchlist(){const el=$('watchlist');for(const [symbol,name] of Object.entries(STOCKS).slice(0,6)){
 const a=document.createElement('a');a.className='watch-item';a.href='#overview';a.textContent=symbol;
 const s=document.createElement('small');s.textContent='→';a.append(s);a.addEventListener('click',()=>{$('ticker').value=symbol;load(symbol)});el.append(a);
}}
async function init(){buildWatchlist();
 try{status=await getJson('/api/status');}catch{status={keysConfigured:{market:false,news:false,ai:false}};}
 $('ticker').addEventListener('change',e=>load(e.target.value));
 $('refresh').addEventListener('click',()=>load($('ticker').value));
 $('saveFinancials').addEventListener('click',persist);
 $('clearFinancials').addEventListener('click',()=>{if(!confirm('Clear financial inputs for this company on this browser?'))return;localStorage.removeItem(storageKey(activeSymbol));setFinancials({});setText('savedStatus','Cleared');renderReadiness();});
 for(const id of FIELDS){$(id).addEventListener('input',renderReadiness);$(id).addEventListener('change',renderReadiness);}
 $('generateAI').addEventListener('click',runAI);
 await load('DEMO');
}
init();
