(function(){
"use strict";
var DEFAULT_CATS=[['Food',400],['Transport',120],['School',150],['Fun',100],['Health',60],['Bills',0],['Other',100]];
var APP_VERSION='0.4';
var LS='life-app-state-v1', LSTAB='life-app-tab', LSUI='lifebrained-ui';
var MIGRATED=false;
var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var ICONS={
  today:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>',
  tasks:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>',
  money:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-2.5"/></svg>',
  calendar:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>'
};
var TABS=[['today','Today'],['tasks','To do'],['money','Money'],['calendar','Calendar']];
var SORTS=[['due','Due date'],['cat','Category'],['proj','Project'],['az','A to Z'],['dur','Duration'],['manual','Manual']];
var LOGSORTS=[['new','Newest first'],['old','Oldest first'],['fast','Fastest first'],['slow','Slowest first']];
var MSUBS=[['overview','Overview'],['accounts','Accounts'],['plans','Plans']];
var REPEATS=[['','No'],['day','Daily'],['week','Weekly'],['month','Monthly'],['wdays','On weekdays I pick']];
var DUEF=[['overdue','Overdue'],['today','Today'],['week','Next 7 days'],['later','Later'],['none','No due date']];
var DURF=[['lt15','Under 15 min'],['15-30','15–30 min'],['30-60','30–60 min'],['60-120','1–2 hours'],['gt120','Over 2 hours']];
var WINU=[['day','Days'],['week','Weeks'],['month','Months'],['date','Until a date']];

/* ---------- helpers ---------- */
function $(s){return document.querySelector(s)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pad(n){return String(n).padStart(2,'0')}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parse(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function todayStr(){return ymd(new Date())}
function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return ymd(d)}
function diffDays(a,b){return Math.round((parse(a)-parse(b))/864e5)}
function daysIn(y,m){return new Date(y,m,0).getDate()} /* m is 1-based */
function addMonthsDs(ds,n,dom){var p=ds.split('-').map(Number),y=p[0],m=p[1]-1+n;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+'-'+pad(m+1)+'-'+pad(Math.min(dom||p[2],daysIn(y,m+1)))}
function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3)}
function r2(n){return Math.round(n*100)/100}
function money(n){n=r2(n);var neg=n<0,a=Math.abs(n);return (neg?'-':'')+'$'+a.toLocaleString('en-US',{minimumFractionDigits:Math.round(a*100)%100?2:0,maximumFractionDigits:2})}
function monthKey(s){return (s||todayStr()).slice(0,7)}
function nextMonthKey(ym){var p=ym.split('-').map(Number),d=new Date(p[0],p[1],1);return d.getFullYear()+'-'+pad(d.getMonth()+1)}
function billDate(b,ym){var p=ym.split('-').map(Number);return ym+'-'+pad(Math.min(b.day,daysIn(p[0],p[1])))}
function fmtTime(t){if(!t)return 'All day';var p=t.split(':').map(Number);if(p[0]>=24)return 'Midnight';var h=p[0]%12||12;return h+':'+pad(p[1])+' '+(p[0]<12?'AM':'PM')}
function short(ds){return parse(ds).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function dateY(ds){var d=parse(ds);return d.getFullYear()===new Date().getFullYear()?short(ds):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
function monthLabel(ds){return parse(ds).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
function monthName(ym){return parse(ym+'-01').toLocaleDateString('en-US',{month:'long'})}
function rel(ds){
  var d=diffDays(ds,todayStr());
  if(d===0)return 'Today'; if(d===1)return 'Tomorrow'; if(d===-1)return 'Yesterday';
  if(d<0)return -d+' days overdue';
  if(d<7)return parse(ds).toLocaleDateString('en-US',{weekday:'long'});
  return dateY(ds);
}
function relInline(ds){var r=rel(ds);return r==='Today'||r==='Tomorrow'?r.toLowerCase():r}
function relPast(ds){var d=diffDays(todayStr(),ds);if(d===0)return 'today';if(d===1)return 'yesterday';return dateY(ds)}
function nameSort(a,b){return a.name.localeCompare(b.name)}
function byId(arr,id){if(!id||!arr)return null;for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return null}
function opt(v,label,sel){return '<option value="'+esc(v)+'"'+(String(v)===String(sel==null?'':sel)?' selected':'')+'>'+esc(label)+'</option>'}
function ord(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
function listJoin(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1]}

/* ---------- state ---------- */
function defaultCats(){return DEFAULT_CATS.map(function(c){return {id:'c-'+c[0].toLowerCase(),name:c[0],budget:c[1]}})}
function defSettings(){return {dayStart:'08:00',dayEnd:'22:00',breakEvery:50,breakLen:10,defaultTask:60,defaultAcct:'a-main',planWin:{unit:'month',n:1,date:''}}}
function empty(){return {examples:false,tasks:[],txns:[],bills:[],events:[],times:[],routines:[],incomes:[],categories:defaultCats(),projects:[],accounts:[{id:'a-main',name:'Main account',start:0,startAt:0}],planned:[],debts:[],goals:[],dayHours:{},settings:defSettings()}}
function sampleRoutines(){
  return [
    {id:'exr1',title:'Statistics class',days:[1,3],start:'10:00',end:'11:15',from:'',skips:{}},
    {id:'exr2',title:'Work',days:[2,4],start:'12:00',end:'15:30',from:'',skips:{}}
  ];
}
function sampleTimes(){
  var t=todayStr();
  return [
    {id:'ex1',key:'do laundry',name:'Do laundry',ms:48*60000+12000,date:addDays(t,-12)},
    {id:'ex2',key:'do laundry',name:'Do laundry',ms:52*60000+40000,date:addDays(t,-5)},
    {id:'ex3',key:'do laundry',name:'Do laundry',ms:45*60000+5000,date:addDays(t,-1)}
  ];
}
var ARR=['tasks','txns','bills','events','times','routines','incomes','projects','planned','debts','goals'];
function normalize(s){
  var e=empty();
  s=s&&typeof s==='object'?s:{};
  e.examples=!!s.examples;
  ARR.forEach(function(k){if(Array.isArray(s[k]))e[k]=s[k]});
  if(!Array.isArray(s.times)&&e.examples)e.times=sampleTimes();
  if(!Array.isArray(s.routines)&&e.examples)e.routines=sampleRoutines();
  if(s.settings&&typeof s.settings==='object'){for(var sk in s.settings){if(s.settings[sk]!=null)e.settings[sk]=s.settings[sk]}}
  if(!e.settings.planWin||typeof e.settings.planWin!=='object')e.settings.planWin={unit:'month',n:1,date:''};
  e.dayHours=s.dayHours&&typeof s.dayHours==='object'?s.dayHours:{};
  /* categories are one shared list for to dos and money; 0.1 had fixed names plus a budgets map */
  if(Array.isArray(s.categories))e.categories=s.categories;
  else{
    var old=s.budgets&&typeof s.budgets==='object'?s.budgets:null;
    e.categories=defaultCats();
    if(old)e.categories.forEach(function(c){if(old[c.name]!=null)c.budget=Number(old[c.name])||0});
    e.txns.forEach(function(t){
      if(t.cat&&t.cat!=='Income'&&!e.categories.some(function(c){return c.name===t.cat}))e.categories.push({id:'c-'+uid(),name:t.cat,budget:old&&old[t.cat]?Number(old[t.cat])||0:0});
    });
    if(Array.isArray(s.tasks)||Array.isArray(s.txns))MIGRATED=true;
  }
  function catIdByName(n){var c=e.categories.find(function(x){return x.name===n});return c?c.id:null}
  if(Array.isArray(s.accounts)&&s.accounts.length)e.accounts=s.accounts;
  if(!byId(e.accounts,e.settings.defaultAcct))e.settings.defaultAcct=e.accounts[0].id;
  var da=e.settings.defaultAcct;
  e.txns.forEach(function(t){
    if(t.cat!==undefined&&t.catId===undefined){t.catId=t.type==='in'?null:catIdByName(t.cat);delete t.cat;MIGRATED=true}
    if(t.catId===undefined)t.catId=null;
    if(!t.acct){t.acct=da;MIGRATED=true}
  });
  e.tasks.forEach(function(t,i){
    if(typeof t.order!=='number'){t.order=i+1;MIGRATED=true}
    if(t.done&&!t.doneAt){t.doneAt=t.due&&t.due<=todayStr()?t.due:todayStr();MIGRATED=true}
  });
  /* a subtask whose supertask is gone becomes a normal to do */
  e.tasks.forEach(function(t){if(t.parentId&&!byId(e.tasks,t.parentId))delete t.parentId});
  e.routines.forEach(function(r){if(!r.skips||typeof r.skips!=='object')r.skips={};if(!Array.isArray(r.days))r.days=[]});
  /* 0.3: expected income splits across accounts, and "days of the month" replaces once/twice a month */
  e.incomes.forEach(function(i){
    if(!i.received||typeof i.received!=='object')i.received={};
    if(!i.from)i.from=todayStr();
    if(!Array.isArray(i.splits)){i.splits=[{acct:byId(e.accounts,i.acct)?i.acct:da,amount:Number(i.amount)||0}];MIGRATED=true}
    if(i.freq==='monthly'||i.freq==='semimonthly'){i.mdays=[i.day].concat(i.freq==='semimonthly'&&i.day2?[i.day2]:[]).filter(Boolean);i.freq='mdays';MIGRATED=true}
    if(i.freq==='mdays'&&!Array.isArray(i.mdays))i.mdays=[1];
  });
  e.events.forEach(function(ev){
    if(ev.allDay===undefined)ev.allDay=!ev.time;
    if(!ev.allDay&&!ev.end)ev.end=toHM(Math.min(toMin(ev.time)+60,1439));
    if(ev.endDate&&ev.endDate<=ev.date)delete ev.endDate;
  });
  var billsCat=catIdByName('Bills');
  e.bills.forEach(function(b){
    if(!b.paid||typeof b.paid!=='object')b.paid={};
    if(!b.from){b.from=monthKey();MIGRATED=true}
    if(b.catId===undefined)b.catId=billsCat;
    for(var ym in b.paid){var tx=byId(e.txns,b.paid[ym]);if(tx&&!tx.billId)tx.billId=b.id}
  });
  e.goals.forEach(function(g){if(!Array.isArray(g.contribs))g.contribs=[]});
  return e;
}
function sample(){
  var t=todayStr(),now=new Date(),y=now.getFullYear(),m=now.getMonth(),ym=monthKey();
  function dm(n){return ymd(new Date(y,m,Math.min(n,now.getDate())))}
  var s=empty();
  s.examples=true;
  s.categories.push({id:'c-chores',name:'Chores',budget:0});
  s.accounts=[{id:'a-main',name:'Checking',start:1200,startAt:0},{id:'a-sav',name:'Savings',start:850,startAt:0}];
  s.projects=[{id:'p-sem',name:'Spring semester',parentId:null},{id:'p-stat',name:'Statistics',parentId:'p-sem'},{id:'p-apt',name:'Apartment',parentId:null}];
  s.tasks=[
    {id:uid(),title:'Email advisor about spring classes',due:t,catId:'c-school',projId:'p-sem',order:1},
    {id:uid(),title:'Do laundry',due:t,catId:'c-chores',repeat:{unit:'week',n:1},order:2},
    {id:uid(),title:'Renew parking permit',due:addDays(t,1),catId:'c-transport',order:3},
    {id:'t-move',title:'Get ready for move-in',due:addDays(t,3),projId:'p-apt',catId:'c-chores',order:4},
    {id:uid(),title:'Pack the kitchen',due:'',parentId:'t-move',est:45,order:5},
    {id:uid(),title:'Book movers',due:'',parentId:'t-move',est:20,order:6},
    {id:uid(),title:'Statistics problem set',due:addDays(t,2),catId:'c-school',projId:'p-stat',est:90,order:7},
    {id:uid(),title:'Return library books',due:addDays(t,4),order:8},
    {id:uid(),title:'Look into renter’s insurance',due:'',projId:'p-apt',order:9},
    {id:uid(),title:'Buy printer paper',due:addDays(t,-2),done:true,doneAt:addDays(t,-1),catId:'c-school',order:10}
  ];
  var rent=uid(),phone1=uid(),bRent=uid(),bPhone=uid();
  s.txns=[
    {id:rent,date:dm(1),amount:900,type:'out',catId:'c-bills',acct:'a-main',billId:bRent,note:'Rent (bill)'},
    {id:uid(),date:dm(1),amount:1450,type:'in',catId:null,acct:'a-main',note:'Paycheck'},
    {id:uid(),date:dm(2),amount:100,type:'xfer',catId:null,acct:'a-main',toAcct:'a-sav',note:'To savings'},
    {id:uid(),date:dm(3),amount:62.18,type:'out',catId:'c-food',acct:'a-main',note:'Groceries'},
    {id:uid(),date:dm(5),amount:38.4,type:'out',catId:'c-transport',acct:'a-main',note:'Gas'},
    {id:uid(),date:dm(6),amount:54,type:'out',catId:'c-school',acct:'a-main',projId:'p-stat',note:'Textbook'},
    {id:uid(),date:dm(8),amount:5.75,type:'out',catId:'c-food',acct:'a-main',note:'Coffee'},
    {id:uid(),date:dm(9),amount:24,type:'out',catId:'c-fun',acct:'a-main',note:'Movie night'},
    {id:phone1,date:addMonthsDs(dm(1),-1,15),amount:47.2,type:'out',catId:'c-bills',acct:'a-main',billId:bPhone,note:'Phone (bill)'}
  ];
  var paid={};paid[ym]=rent;
  var phonePaid={};phonePaid[addMonthsDs(ym+'-01',-1).slice(0,7)]=phone1;
  s.bills=[
    {id:bRent,name:'Rent',amount:900,day:1,paid:paid,from:ym,catId:'c-bills',acct:'a-main'},
    {id:bPhone,name:'Phone',amount:45,day:15,paid:phonePaid,from:ym,catId:'c-bills',acct:'a-main'},
    {id:uid(),name:'Internet',amount:60,day:18,paid:{},from:ym,catId:'c-bills',acct:'a-main'},
    {id:uid(),name:'Car insurance',amount:110,day:28,paid:{},from:ym,catId:'c-bills',acct:'a-main'}
  ];
  s.events=[
    {id:uid(),title:'Study group',date:t,allDay:false,time:'16:00',end:'17:30'},
    {id:uid(),title:'Dentist cleaning',date:addDays(t,2),allDay:false,time:'09:30',end:'10:30'},
    {id:uid(),title:'Statistics exam',date:addDays(t,6),allDay:true,time:'',end:''},
    {id:uid(),title:'Family visit',date:addDays(t,8),endDate:addDays(t,10),allDay:true,time:'',end:''}
  ];
  s.planned=[
    {id:uid(),name:'Winter boots',amount:120,date:addDays(t,10),catId:'c-other',projId:null},
    {id:uid(),name:'Statistics calculator',amount:85,date:'',catId:'c-school',projId:'p-stat'}
  ];
  s.debts=[{id:uid(),name:'Credit card',base:1450,baseAt:0,apr:24.99,minPay:45,catId:'c-bills'}];
  s.goals=[
    {id:uid(),name:'Emergency fund',target:2000,date:'',mode:'account',acct:'a-sav',contribs:[]},
    {id:uid(),name:'New laptop',target:900,date:addMonthsDs(t,6),mode:'contrib',contribs:[{id:uid(),date:addDays(t,-20),amount:150}]}
  ];
  s.times=sampleTimes();
  s.routines=sampleRoutines();
  return s;
}
var state=null,tab='today',calY,calM,calSel=todayStr(),sheet=null;
var saveTimer=null,undoJSON=null,toastTimer=null;
var PENDING={},SEL=null,KIDS={},drag=null;
(function(){var d=new Date();calY=d.getFullYear();calM=d.getMonth()})();
function loadUI(){try{var u=JSON.parse(localStorage.getItem(LSUI)||'{}');if(u&&typeof u==='object')return u}catch(e){}return {}}
var ui=Object.assign({tf:'open',sort:'due',msub:'overview',logSort:'new',open:{},flt:null},loadUI());
if(!ui.open||typeof ui.open!=='object')ui.open={};
function emptyFlt(){return {due:[],dur:[],cat:[],proj:[],mode:'show'}}
if(!ui.flt||typeof ui.flt!=='object')ui.flt=emptyFlt();
['due','dur','cat','proj'].forEach(function(k){if(!Array.isArray(ui.flt[k]))ui.flt[k]=[]});
function saveUI(){try{localStorage.setItem(LSUI,JSON.stringify(ui))}catch(e){}}

function loadLocal(){try{var r=localStorage.getItem(LS);return r?normalize(JSON.parse(r)):null}catch(e){return null}}
var localSaving=false,localErr=false;
function setStatus(t){var el=$('#status');if(el)el.textContent=t}
function persist(){localSaving=true;updateStatus();clearTimeout(saveTimer);saveTimer=setTimeout(flush,350)}
function flush(){clearTimeout(saveTimer);try{localStorage.setItem(LS,JSON.stringify(state));localErr=false}catch(e){localErr=true}localSaving=false;markDirty();updateStatus()}
function saveLocalOnly(){try{localStorage.setItem(LS,JSON.stringify(state))}catch(e){}}
function commit(){persist();render()}

/* ---------- account & sync (Supabase) ----------
   One row per person holds all their data (lifebrained_state). Each save bumps "rev"; a save only lands if
   nobody else saved first, otherwise you are asked which version to keep and the other goes to cloud backups. */
var LSSYNC='lifebrained-sync',LSSB='lifebrained-supabase';
function loadSyncMeta(){try{var m=JSON.parse(localStorage.getItem(LSSYNC)||'{}');return m&&typeof m==='object'?m:{}}catch(e){return {}}}
var SY={client:null,user:null,phase:'idle',meta:loadSyncMeta(),seq:0,busy:false,again:false,err:'',timer:null,conflict:null,ready:false,afterPush:null};
function saveSyncMeta(){try{localStorage.setItem(LSSYNC,JSON.stringify(SY.meta))}catch(e){}}
function sbConfig(){
  var c=window.LB_CONFIG||{};
  if(c.supabaseUrl&&c.supabaseKey)return {url:c.supabaseUrl,key:c.supabaseKey,fixed:true};
  try{var s=JSON.parse(localStorage.getItem(LSSB)||'null');if(s&&s.url&&s.key)return {url:s.url,key:s.key,fixed:false}}catch(e){}
  return null;
}
function appUrl(){return location.origin+location.pathname}
function ago(ms){var s=Math.round((Date.now()-ms)/1000);if(s<60)return 'just now';var m=Math.round(s/60);if(m<60)return m+' min ago';var h=Math.round(m/60);if(h<24)return h+' h ago';return dateY(ymd(new Date(ms)))}
function updateStatus(){
  var t;
  if(localErr)t='Could not save. Storage may be full or blocked.';
  else if(!SY.user)t=localSaving?'Saving…':'Saved on this device';
  else if(SY.phase==='offline')t='Offline · will sync';
  else if(SY.phase==='error')t='Sync problem · saved here';
  else if(SY.phase==='syncing'||localSaving||SY.meta.dirty)t='Syncing…';
  else t='Synced';
  setStatus(t);
}
function initSync(){
  SY.client=null;SY.user=null;SY.err='';SY.phase='idle';
  var cfg=sbConfig();
  if(!cfg){SY.ready=true;updateStatus();return}
  if(!window.supabase||!window.supabase.createClient){SY.err='The account library did not load. Check your connection and reopen the app.';SY.ready=true;updateStatus();return}
  try{SY.client=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'lifebrained-auth'}})}
  catch(e){SY.client=null;SY.err='That Supabase address or key does not look right.';SY.ready=true;updateStatus();return}
  SY.client.auth.onAuthStateChange(function(ev,session){
    var u=session&&session.user||null,was=SY.user&&SY.user.id;
    SY.user=u;
    if(ev==='PASSWORD_RECOVERY')setTimeout(function(){openSheet('newpass')},0);
    if(u&&u.id!==was)setTimeout(onSignedIn,0);
    if(!u){SY.phase='idle';SY.ready=true}
    updateStatus();refreshSettings();
  });
}
function refreshSettings(){if(sheet&&(sheet.kind==='organize'))renderSheet()}
function meaningful(s){return !s.examples&&(s.tasks.length+s.txns.length+s.events.length+s.bills.length+s.incomes.length+s.planned.length+s.routines.length+s.times.length)>0}
function onSignedIn(){
  if(!SY.user)return;
  var uid=SY.user.id,m=SY.meta;
  if(m.userId&&m.userId!==uid)SY.meta={userId:uid,rev:0,dirty:false,foreign:true};   /* this device holds someone else's data */
  else if(!m.userId)SY.meta={userId:uid,rev:0,dirty:true,first:true};                 /* first sign-in on this device */
  saveSyncMeta();pull();
}
function syncDone(){SY.busy=false;if(SY.again){SY.again=false;if(SY.meta.dirty)push();else pull()}}
function syncFail(e){
  SY.busy=false;
  var msg=(e&&(e.message||e.error_description))||'';
  SY.phase=(!navigator.onLine||/fetch|network|load failed/i.test(msg))?'offline':'error';
  SY.err=SY.phase==='error'?(/relation|does not exist|schema cache|lifebrained_/i.test(msg)?'The Lifebrained tables are missing in Supabase. Run supabase-setup.sql (see the README).':(msg||'Something went wrong while syncing.')):'';
  SY.ready=true;updateStatus();refreshSettings();
  if(SY.afterPush){var f=SY.afterPush;SY.afterPush=null;f(false)}
  maybeAskSoon();
}
function synced(){
  SY.phase='synced';SY.err='';SY.meta.lastSync=Date.now();saveSyncMeta();SY.ready=true;updateStatus();refreshSettings();
  dailySnapshot();
  if(SY.afterPush&&!SY.meta.dirty){var f=SY.afterPush;SY.afterPush=null;f(true)}
  maybeAskSoon();
}
function maybeAskSoon(){if(!asked&&!SY.conflict)setTimeout(maybeAsk,300)}
function pull(){
  if(!SY.client||!SY.user)return;
  if(SY.busy){SY.again=true;return}
  SY.busy=true;SY.phase='syncing';updateStatus();
  SY.client.from('lifebrained_state').select('data,rev,updated_at').eq('user_id',SY.user.id).maybeSingle().then(function(r){
    if(r.error){syncFail(r.error);return}
    var row=r.data,m=SY.meta;SY.busy=false;
    if(m.foreign){
      if(row){applyRemote(row);syncDone();return}
      state=empty();saveLocalOnly();render();m.foreign=false;m.rev=0;m.dirty=true;saveSyncMeta();push();return;
    }
    if(!row){m.rev=0;m.dirty=true;saveSyncMeta();push();return}
    if(row.rev===m.rev){if(m.dirty)push();else{synced();syncDone()}return}
    if(!m.dirty||(m.first&&!meaningful(state))){applyRemote(row);syncDone();return}
    showConflict(row);
  },function(e){syncFail(e)});
}
function schedulePush(){clearTimeout(SY.timer);SY.timer=setTimeout(push,1500)}
function markDirty(){if(!SY.meta.userId)return;SY.meta.dirty=true;SY.seq++;saveSyncMeta();if(SY.user)schedulePush()}
function push(){
  if(!SY.client||!SY.user)return;
  clearTimeout(SY.timer);
  if(SY.conflict)return;
  if(SY.busy){SY.again=true;return}
  SY.busy=true;SY.phase='syncing';updateStatus();
  var m=SY.meta,seq=SY.seq,data=JSON.parse(JSON.stringify(state)),tbl=SY.client.from('lifebrained_state'),q;
  if(!m.rev)q=tbl.insert({user_id:SY.user.id,data:data,rev:1}).select('rev');
  else q=tbl.update({data:data,rev:m.rev+1,updated_at:new Date().toISOString()}).eq('user_id',SY.user.id).eq('rev',m.rev).select('rev');
  q.then(function(r){
    if(r.error){if(r.error.code==='23505'){SY.busy=false;pull();return}syncFail(r.error);return}
    if(!r.data||!r.data.length){SY.busy=false;pull();return}   /* someone else saved first */
    m.rev=r.data[0].rev;m.dirty=SY.seq!==seq;m.first=false;saveSyncMeta();
    synced();syncDone();
    if(m.dirty)schedulePush();
  },function(e){syncFail(e)});
}
function applyRemote(row){
  MIGRATED=false;state=normalize(JSON.parse(JSON.stringify(row.data)));
  var m=SY.meta;m.rev=row.rev;m.dirty=false;m.first=false;m.foreign=false;saveSyncMeta();
  saveLocalOnly();render();
  if(MIGRATED){MIGRATED=false;markDirty()}
  synced();
}
function showConflict(row){
  SY.conflict=row;SY.busy=false;
  var first=SY.meta.first,when=row.updated_at?new Date(row.updated_at):null;
  var wt=when&&!isNaN(when)?when.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
  $('#modal').className='modal inc';
  $('#modal').innerHTML='<p class="mk">'+(first?'Connect this device':'Sync conflict')+'</p><h3 id="m-title">'+(first?'This device and your account both have data':'Changes on two devices')+'</h3>'+
    '<p class="sub">'+(first?'Your account already has data'+(wt?', last saved '+esc(wt):'')+'. Choose which to keep. ':'Your account was changed on another device'+(wt?' at '+esc(wt):'')+', and this device has changes that have not synced. Choose which to keep. ')+'The other version is saved as a cloud backup, so nothing is lost.</p>'+
    '<div class="btns"><button class="btn ghost" data-act="syncKeepLocal">Keep this device’s</button><button class="btn" data-act="syncUseRemote">Use the account’s</button></div>';
  $('#mscrim').hidden=false;$('#modal').hidden=false;
}
function resolveConflict(keepLocal){
  var row=SY.conflict;if(!row)return;
  SY.conflict=null;
  cloudBackup(keepLocal?row.data:JSON.parse(JSON.stringify(state)),keepLocal?'Account version, replaced by a device':'Device version, replaced by the account');
  if(keepLocal){SY.meta.rev=row.rev;SY.meta.dirty=true;SY.meta.first=false;saveSyncMeta();push()}
  else applyRemote(row);
  if(askQ.length)showAsk();else hideAsk();
  maybeAskSoon();
}
function cloudBackup(data,note){
  if(!SY.client||!SY.user)return Promise.resolve({error:{message:'Not signed in'}});
  return SY.client.from('lifebrained_backups').insert({user_id:SY.user.id,data:data,note:note}).then(function(r){return r},function(e){return {error:e}});
}
function dailySnapshot(){
  var day=todayStr();if(SY.meta.snapDay===day||!SY.user||SY.snapping)return;
  SY.snapping=true;
  cloudBackup(JSON.parse(JSON.stringify(state)),'Daily backup').then(function(r){
    SY.snapping=false;if(r.error)return;
    SY.meta.snapDay=day;saveSyncMeta();
    return SY.client.from('lifebrained_backups').select('id').eq('user_id',SY.user.id).order('created_at',{ascending:false}).range(40,500).then(function(o){
      if(o&&o.data&&o.data.length)return SY.client.from('lifebrained_backups').delete().in('id',o.data.map(function(x){return x.id}));
    });
  }).then(null,function(){SY.snapping=false});
}
function authMsg(e){
  var m=(e&&e.message)||'';
  if(/invalid login credentials/i.test(m))return 'That email and password do not match an account.';
  if(/email not confirmed/i.test(m))return 'Confirm your email first: tap the link in the email from Supabase, then sign in here.';
  if(/already registered|already exists/i.test(m))return 'That email already has an account. Sign in instead.';
  if(/password/i.test(m)&&/least|short|weak/i.test(m))return 'Choose a longer password (at least 6 characters).';
  if(/rate limit|too many/i.test(m))return 'Too many tries. Wait a few minutes and try again.';
  if(/fetch|network|load failed/i.test(m)||!navigator.onLine)return 'Could not reach the server. Check your connection.';
  return m||'Something went wrong. Try again.';
}
function doSignOut(){
  if(!SY.client)return;
  function go(ok){
    if(ok===false&&SY.meta.dirty){showToast('Not signed out: some changes have not synced yet. Try again when you are online.',false);return}
    SY.client.auth.signOut({scope:'local'}).then(function(){showToast('Signed out. Your data stays on this device.',false)},function(){});
  }
  if(SY.meta.dirty){SY.afterPush=go;push()}else go(true);
}
document.addEventListener('visibilitychange',function(){if(!SY.user)return;if(document.hidden){if(SY.meta.dirty)push()}else if(!SY.busy){if(SY.meta.dirty)push();else pull()}});
window.addEventListener('online',function(){if(SY.user){if(SY.meta.dirty)push();else pull()}});
setInterval(function(){if(SY.user&&!document.hidden&&!SY.busy&&!SY.conflict){if(SY.meta.dirty)push();else pull()}},120000);

/* ---------- categories, projects, accounts ---------- */
function catOf(id){return byId(state.categories,id)}
function catName(id){var c=catOf(id);return c?c.name:''}
function catsSorted(){return state.categories.slice().sort(nameSort)}
function projOf(id){return byId(state.projects,id)}
function projPath(id){var out=[],p=projOf(id),g=0;while(p&&g++<20){out.unshift(p.name);p=projOf(p.parentId)}return out.join(' › ')}
function projDesc(id){var out=[id],i=0;while(i<out.length){var cur=out[i++];state.projects.forEach(function(p){if(p.parentId===cur&&out.indexOf(p.id)<0)out.push(p.id)})}return out}
function projSorted(){
  var res=[],seen={};
  function walk(pid,depth){
    state.projects.filter(function(p){return (p.parentId||null)===pid&&!seen[p.id]}).sort(nameSort).forEach(function(p){seen[p.id]=1;res.push({p:p,depth:depth});if(depth<8)walk(p.id,depth+1)});
  }
  walk(null,0);
  state.projects.forEach(function(p){if(!seen[p.id]){seen[p.id]=1;res.push({p:p,depth:0});walk(p.id,1)}});
  return res;
}
function acctOf(id){return byId(state.accounts,id)}
function acctName(id){var a=acctOf(id);return a?a.name:'Deleted account'}
function defAcct(){var a=acctOf(state.settings.defaultAcct)||state.accounts[0];return a?a.id:null}
function counts(t,a){return (t.ts||0)>=(a.startAt||0)}
function balance(a){
  var b=a.start||0;
  state.txns.forEach(function(t){
    if(!counts(t,a))return;
    if(t.type==='in'&&t.acct===a.id)b+=t.amount;
    else if(t.type==='out'&&t.acct===a.id)b-=t.amount;
    else if(t.type==='xfer'){if(t.acct===a.id)b-=t.amount;if(t.toAcct===a.id)b+=t.amount}
  });
  return r2(b);
}
function totalBalance(){return r2(state.accounts.reduce(function(s,a){return s+balance(a)},0))}
function catOptions(sel){return opt('','No category',sel||'')+catsSorted().map(function(c){return opt(c.id,c.name,sel)}).join('')}
function projOptions(sel,excl){return opt('','No project',sel||'')+projSorted().filter(function(r){return !excl||excl.indexOf(r.p.id)<0}).map(function(r){return opt(r.p.id,(r.depth?'  '.repeat(r.depth)+'› ':'')+r.p.name,sel)}).join('')}
function acctOptions(sel){return state.accounts.map(function(a){return opt(a.id,a.name,sel||defAcct())}).join('')}
function addTx(o){
  var tx=Object.assign({id:uid(),ts:Date.now(),date:todayStr(),type:'out',amount:0,acct:defAcct(),catId:null,projId:null,note:''},o);
  tx.amount=r2(tx.amount);state.txns.push(tx);return tx;
}

/* ---------- money & bills ---------- */
function monthTx(ym){return state.txns.filter(function(t){return t.date.slice(0,7)===ym})}
function stats(ym){
  var inc=0,out=0,by={};
  monthTx(ym).forEach(function(t){
    if(t.type==='in')inc+=t.amount;
    else if(t.type==='out'){out+=t.amount;var k=t.catId||'';by[k]=(by[k]||0)+t.amount}
  });
  return {income:inc,spent:out,by:by,left:inc-out};
}
function occurrences(){
  var cur=monthKey(),nxt=nextMonthKey(cur),out=[];
  [cur,nxt].forEach(function(ym){state.bills.forEach(function(b){if(!b.paid[ym])out.push({bill:b,ym:ym,date:billDate(b,ym)})})});
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
}
function billsOn(ds){var ym=ds.slice(0,7);return state.bills.filter(function(b){return billDate(b,ym)===ds&&(!b.from||ym>=b.from)}).map(function(b){return {bill:b,ym:ym,date:ds}})}
function billDue(date,paid){
  if(paid)return 'Paid';
  var d=diffDays(date,todayStr());
  if(d<0)return -d+(d===-1?' day late':' days late');
  if(d===0)return 'Due today';
  if(d===1)return 'Due tomorrow';
  return 'Due '+dateY(date);
}
function billTx(b){
  var ids={};for(var k in b.paid)ids[b.paid[k]]=1;
  return state.txns.filter(function(t){return t.type==='out'&&(t.billId===b.id||ids[t.id])});
}
function billStats(b){
  var tx=billTx(b);if(!tx.length)return null;
  var sum=tx.reduce(function(s,t){return s+t.amount},0),last=tx.slice().sort(function(a,c){return a.date<c.date?-1:a.date>c.date?1:0}).pop();
  return {n:tx.length,avg:r2(sum/tx.length),last:last.amount};
}
function payBill(b,ym,amt,acct,date){
  var tx=addTx({date:date||(ym<monthKey()?billDate(b,ym):todayStr()),amount:amt,type:'out',catId:b.catId||null,acct:acctOf(acct)?acct:(acctOf(b.acct)?b.acct:defAcct()),billId:b.id,note:b.name+' (bill)'});
  b.paid[ym]=tx.id;
}
function unpayBill(b,ym){var tid=b.paid[ym];state.txns=state.txns.filter(function(t){return t.id!==tid});delete b.paid[ym]}
function debtBal(d){var b=d.base||0;state.txns.forEach(function(t){if(t.debtId===d.id&&(t.ts||0)>=(d.baseAt||0))b-=t.amount});return Math.max(0,r2(b))}
function totalDebt(){return r2(state.debts.reduce(function(s,d){return s+debtBal(d)},0))}
function payoff(d){
  var bal=debtBal(d),pay=d.minPay||0,r=(d.apr||0)/100/12;
  if(bal<=0)return {paid:true};
  if(!(pay>0))return null;
  if(r>0&&pay<=bal*r+0.005)return {never:true};
  var n=0,interest=0;
  while(bal>0.005&&n<1200){var i=bal*r;interest+=i;bal=bal+i-pay;n++}
  if(n>=1200)return {never:true};
  return {months:n,interest:interest,date:addMonthsDs(todayStr(),n)};
}
function goalHave(g){
  if(g.mode==='account'){var a=acctOf(g.acct);return a?Math.max(0,balance(a)):0}
  return r2((g.contribs||[]).reduce(function(s,c){return s+c.amount},0));
}
function monthsUntil(ds){var d=diffDays(ds,todayStr());return d<=0?0:Math.max(1,Math.ceil(d/30.44))}
/* planning window: unpaid bills and dated planned purchases up to a chosen day */
function winEnd(){
  var w=state.settings.planWin||{},t=todayStr(),n=Math.max(1,parseInt(w.n,10)||1);
  if(w.unit==='date'&&w.date)return w.date<t?t:w.date;
  if(w.unit==='day')return addDays(t,n);
  if(w.unit==='week')return addDays(t,7*n);
  return addMonthsDs(t,n);
}
function billOccTo(end){
  var out=[];
  state.bills.forEach(function(b){
    var ym=b.from||monthKey(),g=0;
    while(ym<=end.slice(0,7)&&g++<120){if(!b.paid[ym]){var d=billDate(b,ym);if(d<=end)out.push({bill:b,ym:ym,date:d})}ym=nextMonthKey(ym)}
  });
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
}
function planWindow(){
  var end=winEnd(),bl=billOccTo(end),pl=state.planned.filter(function(p){return p.date&&p.date<=end});
  var bt=r2(bl.reduce(function(s,o){return s+o.bill.amount},0)),pt=r2(pl.reduce(function(s,p){return s+p.amount},0));
  var undated=r2(state.planned.reduce(function(s,p){return s+(p.date?0:p.amount)},0));
  return {end:end,bills:bl,planned:pl,billsTotal:bt,plannedTotal:pt,total:r2(bt+pt),undated:undated};
}
function plannedAll(){return r2(state.planned.reduce(function(s,p){return s+p.amount},0))}

/* ---------- expected income ---------- */
function monthDay(ym,day){var p=ym.split('-').map(Number);return ym+'-'+pad(Math.min(day,daysIn(p[0],p[1])))}
function incTotal(inc){return r2((inc.splits||[]).reduce(function(s,x){return s+(Number(x.amount)||0)},0))}
function incDates(inc,from,to){
  var out=[];
  if(from>to)return out;
  if(inc.freq==='weekly'||inc.freq==='biweekly'){
    if(inc.freq==='biweekly'&&!inc.anchor)return out;
    var d=from,g=0;
    while(d<=to&&g++<800){
      var ok=inc.freq==='weekly'?parse(d).getDay()===inc.day:((diffDays(d,inc.anchor)%14)+14)%14===0;
      if(ok)out.push(d);
      d=addDays(d,1);
    }
  }else{
    var ym=from.slice(0,7),g2=0,days=inc.mdays||[];
    while(ym<=to.slice(0,7)&&g2++<60){
      days.forEach(function(dd){var x=monthDay(ym,dd);if(x>=from&&x<=to&&out.indexOf(x)<0)out.push(x)});
      ym=nextMonthKey(ym);
    }
    out.sort();
  }
  return out;
}
function incSched(inc){
  if(inc.freq==='weekly')return 'Every '+DN[inc.day];
  if(inc.freq==='biweekly')return 'Every 2 weeks';
  return 'Monthly on the '+listJoin((inc.mdays||[]).slice().sort(function(a,b){return a-b}).map(ord));
}
function incSplitText(inc){
  var sp=(inc.splits||[]).filter(function(x){return x.amount>0});
  if(sp.length<2)return state.accounts.length>1&&sp[0]?'into '+acctName(sp[0].acct):'';
  return sp.map(function(x){return money(x.amount)+' '+acctName(x.acct)}).join(' + ');
}
function pendingIncomes(){
  var t=todayStr(),out=[];
  state.incomes.forEach(function(inc){incDates(inc,inc.from,t).forEach(function(d){if(!inc.received[d])out.push({type:'income',inc:inc,date:d})})});
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.inc.name.localeCompare(b.inc.name)});
}
function expectedThisMonth(){
  var ym=monthKey(),from=ym+'-01',to=monthDay(ym,31),sum=0;
  state.incomes.forEach(function(inc){incDates(inc,from>inc.from?from:inc.from,to).forEach(function(d){if(!inc.received[d])sum+=incTotal(inc)})});
  return sum;
}
function incRow(inc){
  var nx=incDates(inc,todayStr(),addDays(todayStr(),70)).filter(function(d){return !inc.received[d]})[0];
  var parts=[incSched(inc)];if(nx)parts.push('next '+dateY(nx));
  var sp=incSplitText(inc);
  return '<li class="row"><div class="grow"><div class="ttl"><button class="tbtn" data-act="editInc" data-id="'+inc.id+'" aria-label="Edit '+esc(inc.name)+'">'+esc(inc.name)+'</button></div><div class="sub">'+esc(parts.join(' · '))+'</div>'+(sp?'<div class="sub">'+esc(sp)+'</div>':'')+'</div><div class="amt num">'+money(incTotal(inc))+'</div></li>';
}
function renderIncomeBar(){
  var p=pendingIncomes(),el=$('#incbar');
  if(!p.length){el.innerHTML='';return}
  el.innerHTML='<div class="odh">Expected income</div>'+p.map(function(o){
    var when=o.date===todayStr()?'Expected today':'Expected '+dateY(o.date);
    return '<div class="odr"><div class="grow"><b>'+esc(o.inc.name)+'</b> <span class="num">about '+money(incTotal(o.inc))+'</span><div class="sub">'+esc(when)+'. Not counted until you confirm.</div></div>'+
      '<button class="tb sm" data-act="incConfirm" data-id="'+o.inc.id+'" data-date="'+o.date+'" aria-label="Confirm income: '+esc(o.inc.name)+' expected '+esc(short(o.date))+'">Did it arrive?</button></div>';
  }).join('');
}
function showAskIncome(o,idx){
  var when=o.date===todayStr()?'today':'on '+dateY(o.date);
  var sp=(o.inc.splits||[]).filter(function(x){return x.amount>0});if(!sp.length)sp=[{acct:defAcct(),amount:0}];
  var fields=sp.map(function(x,i){return '<label class="field"><span>'+(sp.length>1||state.accounts.length>1?'Received into '+esc(acctName(x.acct)):'Amount you actually received')+'</span><input class="m-sp" data-acct="'+esc(x.acct)+'" id="m-sp'+i+'" type="number" inputmode="decimal" step="0.01" min="0" value="'+x.amount+'"></label>'}).join('');
  $('#modal').className='modal inc';
  $('#modal').innerHTML='<p class="mk">Expected income'+(askTotal>1?' '+idx+' of '+askTotal:'')+'</p><h3 id="m-title">Did you receive '+esc(o.inc.name)+'?</h3>'+
    '<p class="sub">About '+money(incTotal(o.inc))+' was expected '+esc(when)+'. It is not counted as money until you confirm it. Enter what actually arrived.</p>'+fields+
    '<p class="err" id="m-err" role="alert"></p>'+
    '<div class="btns"><button class="btn ghost" data-act="askNo">Not yet</button><button class="btn ghost" data-act="incSkip">Skip this one</button><button class="btn" data-act="incYes">Yes, received</button></div>';
  $('#mscrim').hidden=false;$('#modal').hidden=false;
  setTimeout(function(){var bt=$('#modal .btn');if(bt)bt.focus()},30);
}
function receiveIncome(o,amounts){
  var inc=byId(state.incomes,o.inc.id);if(!inc||inc.received[o.date])return;
  var ids=[];
  amounts.forEach(function(x){if(x.amount>0)ids.push(addTx({date:o.date,amount:x.amount,type:'in',acct:acctOf(x.acct)?x.acct:defAcct(),note:inc.name}).id)});
  inc.received[o.date]=ids;
}

/* ---------- overdue bills & the on-load questions ---------- */
var asked=false,askQ=[],askTotal=0;
function overdueBills(){
  var t=todayStr(),cur=monthKey(),out=[];
  state.bills.forEach(function(b){
    var ym=b.from||cur,guard=0;
    while(ym<=cur&&guard++<36){
      if(!b.paid[ym]){var d=billDate(b,ym);if(d<t)out.push({bill:b,ym:ym,date:d})}
      ym=nextMonthKey(ym);
    }
  });
  return out.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:a.bill.name.localeCompare(b.bill.name)});
}
function renderOverdue(){
  var od=overdueBills(),el=$('#overdue');
  if(!od.length){el.innerHTML='';return}
  el.innerHTML='<div class="odh">Overdue bills</div>'+od.map(function(o){
    return '<div class="odr"><div class="grow"><b>'+esc(o.bill.name)+'</b> <span class="num">'+money(o.bill.amount)+'</span><div class="sub">Due '+esc(dateY(o.date))+' · '+esc(billDue(o.date,false))+'</div></div>'+
      '<button class="tb sm" data-act="payBill" data-id="'+o.bill.id+'" data-ym="'+o.ym+'" aria-label="Mark paid: '+esc(o.bill.name)+' due '+esc(short(o.date))+'">Mark paid</button></div>';
  }).join('');
}
function maybeAsk(){if(asked||!state||SY.conflict)return;asked=true;askQ=overdueBills().concat(pendingIncomes());askTotal=askQ.length;showAsk()}
function hideAsk(){$('#mscrim').hidden=true;$('#modal').hidden=true;$('#modal').innerHTML=''}
function showAsk(){
  if(!askQ.length){hideAsk();return}
  var o=askQ[0],idx=askTotal-askQ.length+1;
  if(o.type==='income'){showAskIncome(o,idx);return}
  $('#modal').className='modal';
  $('#modal').innerHTML='<p class="mk">Overdue bill'+(askTotal>1?' '+idx+' of '+askTotal:'')+'</p><h3 id="m-title">Have you paid '+esc(o.bill.name)+'?</h3>'+
    '<p class="sub">'+money(o.bill.amount)+' was due '+esc(dateY(o.date))+' ('+esc(billDue(o.date,false))+'). It stays marked unpaid until you say it is paid.</p>'+
    '<div class="two-f"><label class="field"><span>Amount paid</span><input id="m-amt" type="number" inputmode="decimal" step="0.01" min="0" value="'+o.bill.amount+'"></label>'+
    '<label class="field"><span>Paid from</span><select id="m-acct">'+acctOptions(acctOf(o.bill.acct)?o.bill.acct:defAcct())+'</select></label></div>'+
    '<p class="err" id="m-err" role="alert"></p>'+
    '<div class="btns"><button class="btn ghost" data-act="askNo">Not yet</button><button class="btn" data-act="askYes">Yes, paid</button></div>';
  $('#mscrim').hidden=false;$('#modal').hidden=false;
  setTimeout(function(){var bt=$('#modal .btn');if(bt)bt.focus()},30);
}
function skipAsk(){askQ.shift();showAsk()}
function payAsk(){
  var o=askQ[0];if(!o)return;
  var amt=parseFloat($('#m-amt').value);
  if(!(amt>0)){$('#m-err').textContent='Enter the amount you paid, or choose Not yet.';return}
  askQ.shift();
  var b=byId(state.bills,o.bill.id);if(b&&!b.paid[o.ym]){payBill(b,o.ym,amt,$('#m-acct').value,o.date);commit()}
  showAsk();
}

/* ---------- schedule ---------- */
var PLAN=null;
function toMin(hm){var p=String(hm||'0:0').split(':');return (parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0)}
function toHM(m){m=Math.max(0,Math.round(m));return pad(Math.floor(m/60))+':'+pad(m%60)}
function fmtMinClock(m){m=Math.ceil(m-1e-6);var h=Math.floor(m/60)%24,mm=m%60;return (h%12||12)+':'+pad(mm)+' '+(h<12?'AM':'PM')}
function fmtMins(m){m=Math.round(m);var h=Math.floor(m/60),r=m%60;return h?(r?h+'h '+r+'m':h+'h'):r+'m'}
function nowMinutes(){var d=new Date();return d.getHours()*60+d.getMinutes()+d.getSeconds()/60}
function relMin(m){m=Math.max(1,Math.round(m));if(m<60)return m+' min';var h=Math.floor(m/60),r=m%60;if(h>=48)return Math.round(h/24)+' days';return h+'h'+(r?' '+r+'m':'')}
function hoursFor(ds){var o=state.dayHours[ds],s=state.settings;return {start:(o&&o.start)||s.dayStart,end:(o&&o.end)||s.dayEnd,custom:!!o}}
function evEnd(e){return e.endDate&&e.endDate>e.date?e.endDate:e.date}
function dayItems(ds){
  var out=[],wd=parse(ds).getDay();
  state.events.forEach(function(e){
    if(ds<e.date||ds>evEnd(e))return;
    var it={kind:'event',id:e.id,title:e.title,allDay:!!e.allDay,start:e.allDay?'':e.time,end:e.allDay?'':e.end,skipped:false};
    if(evEnd(e)>e.date){
      var n=diffDays(evEnd(e),e.date)+1,i=diffDays(ds,e.date)+1;
      it.multi={n:n,i:i,endDate:evEnd(e),endTime:e.end};
      it.seg=i===1?'first':i===n?'last':'mid';
      if(!e.allDay){it.start=it.seg==='first'?e.time:'00:00';it.end=it.seg==='last'?e.end:'24:00'}
    }
    out.push(it);
  });
  state.routines.forEach(function(r){if(r.days.indexOf(wd)>=0&&(!r.from||ds>=r.from))out.push({kind:'routine',id:r.id,title:r.title,allDay:false,start:r.start,end:r.end,skipped:!!r.skips[ds]})});
  return out.sort(function(a,b){if(a.allDay!==b.allDay)return a.allDay?-1:1;return a.start<b.start?-1:a.start>b.start?1:a.title.localeCompare(b.title)});
}
function itemTime(it){
  if(it.allDay)return 'All day';
  if(it.seg==='mid')return 'All day<small>continues</small>';
  if(it.seg==='first')return esc(fmtTime(it.start))+'<small>to '+esc(short(it.multi.endDate))+'</small>';
  if(it.seg==='last')return 'Until<small>'+esc(fmtTime(it.end))+'</small>';
  return esc(fmtTime(it.start))+'<small>to '+esc(fmtTime(it.end))+'</small>';
}
function itemRow(it,ds){
  ds=ds||todayStr();
  var act=it.kind==='event'
    ?'<button class="x" data-act="delEvent" data-id="'+it.id+'" aria-label="Delete '+esc(it.title)+'">×</button>'
    :'<button class="tb sm" data-act="skip" data-id="'+it.id+'" data-date="'+ds+'" aria-label="'+(it.skipped?'Unskip ':'Skip ')+esc(it.title)+' on '+esc(short(ds))+'">'+(it.skipped?'Unskip':'Skip')+'</button>';
  var tag=it.kind==='routine'?'<span class="tag rep">Regular</span>':it.multi?'<span class="tag">Day '+it.multi.i+' of '+it.multi.n+'</span>':'';
  return '<li class="row'+(it.skipped?' done':'')+'"><div class="time">'+itemTime(it)+'</div><div class="grow"><div class="ttl">'+esc(it.title)+tag+'</div>'+(it.skipped?'<div class="sub">Skipped</div>':'')+'</div>'+act+'</li>';
}
function routineRow(r){
  return '<li class="row"><div class="grow"><div class="ttl">'+esc(r.title)+'</div><div class="sub">'+r.days.slice().sort().map(function(d){return DN[d]}).join(', ')+' · '+esc(fmtTime(r.start))+' to '+esc(fmtTime(r.end))+'</div></div>'+
    '<button class="x" data-act="delRoutine" data-id="'+r.id+'" aria-label="Delete '+esc(r.title)+'">×</button></li>';
}
function renderNow(){
  if(!state)return;
  var now=new Date(),t=ymd(now),nm=now.getHours()*60+now.getMinutes(),h='';
  dayItems(t).filter(function(i){return !i.allDay&&!i.skipped&&toMin(i.start)<=nm&&nm<toMin(i.end)}).forEach(function(i){
    var until,left;
    if(i.seg==='first'||i.seg==='mid'){until=dateY(i.multi.endDate)+' at '+fmtTime(i.multi.endTime);left=diffDays(i.multi.endDate,t)*1440+toMin(i.multi.endTime)-nm}
    else{until=fmtTime(i.end);left=toMin(i.end)-nm}
    h+='<div class="nb now"><span class="k">Now</span><div class="t"><b>'+esc(i.title)+'</b><div class="sub">Until '+esc(until)+' · '+relMin(left)+' left</div></div></div>';
  });
  var nx=null;
  for(var d=0;d<=14&&!nx;d++){
    var ds=addDays(t,d),cand=dayItems(ds).filter(function(i){return !i.allDay&&!i.skipped&&(!i.seg||i.seg==='first')&&(d>0||toMin(i.start)>nm)});
    if(cand.length)nx={it:cand[0],ds:ds,d:d};
  }
  if(nx){
    var when=nx.d===0?'In '+relMin(toMin(nx.it.start)-nm)+' · '+fmtTime(nx.it.start):rel(nx.ds)+' at '+fmtTime(nx.it.start);
    h+='<div class="nb"><span class="k">Next</span><div class="t"><b>'+esc(nx.it.title)+'</b><div class="sub">'+esc(when)+'</div></div></div>';
  }
  $('#nowbar').innerHTML=h;
}

/* ---------- to dos: supertasks, estimates ---------- */
function computeKids(){KIDS={};state.tasks.forEach(function(t){if(t.parentId){(KIDS[t.parentId]=KIDS[t.parentId]||[]).push(t)}});for(var k in KIDS)KIDS[k].sort(function(a,b){return (a.order||0)-(b.order||0)})}
function kidsOf(t){return state.tasks.filter(function(x){return x.parentId===t.id}).sort(function(a,b){return (a.order||0)-(b.order||0)})}
function isSuper(t){return !!(KIDS[t.id]&&KIDS[t.id].length)}
function parentOf(t){return t.parentId?byId(state.tasks,t.parentId):null}
function effDue(t){if(t.due)return t.due;var p=parentOf(t);return p&&p.due?p.due:''}
function topDue(t){
  if(!isSuper(t))return t.due||'';
  var ds=KIDS[t.id].filter(function(k){return !k.done}).map(effDue).filter(Boolean).sort();
  return ds[0]||t.due||'';
}
function autoEstTitle(title){var o=TS[nkey(title)];return o?o.sum/o.n/60000:state.settings.defaultTask}
function baseEst(t){
  if(isSuper(t))return KIDS[t.id].filter(function(k){return !k.done}).reduce(function(s,k){return s+baseEst(k)},0);
  return t.est>0?t.est:autoEstTitle(t.title);
}
function taskEstMin(t){
  if(isSuper(t))return KIDS[t.id].filter(function(k){return !k.done}).reduce(function(s,k){return s+taskEstMin(k)},0);
  var base=baseEst(t),x=tm(t);
  if(x.status!=='idle'||x.acc>0)return Math.max(5,base-elapsed(t)/60000);
  return base;
}
function byDueOrder(a,b){var x=effDue(a)||'9999',y=effDue(b)||'9999';if(x!==y)return x<y?-1:1;return groupOrder(a)-groupOrder(b)}
function groupOrder(t){var p=parentOf(t);return p?(p.order||0)+((t.order||0)/1e6):(t.order||0)}
function planDay(ds){
  var hrs=hoursFor(ds),start=toMin(hrs.start),end=toMin(hrs.end),st=state.settings;
  var isToday=ds===todayStr(),nm=isToday?nowMinutes():0;
  var items=dayItems(ds).filter(function(i){return !i.allDay&&!i.skipped});
  var busy=items.map(function(i){return [toMin(i.start),toMin(i.end)]});
  var blocks=items.map(function(i){return {type:'event',title:i.title,start:toMin(i.start),end:toMin(i.end),seg:i.seg||''}});
  var evTotal=items.reduce(function(s,i){return s+Math.max(0,Math.min(toMin(i.end),end)-Math.max(toMin(i.start),start))},0);
  /* supertasks are planned through their subtasks */
  var tasks=state.tasks.filter(function(x){var d=effDue(x);return !x.done&&!isSuper(x)&&d&&(isToday?d<=ds:d===ds)}).sort(byDueOrder);
  var every=(st.breakEvery>0&&st.breakLen>0)?st.breakEvery:0,blen=st.breakLen>0?st.breakLen:0;
  var cursor=isToday?Math.max(start,nm):start,since=0,taskTotal=0,breakTotal=0,res={},last=null,guard=0;
  tasks.forEach(function(t){
    var need=taskEstMin(t);taskTotal+=need;
    while(need>1e-6&&guard++<20000){
      var moved=true;
      while(moved){moved=false;for(var i=0;i<busy.length;i++){if(busy[i][0]<=cursor+1e-9&&cursor<busy[i][1]-1e-9){cursor=busy[i][1];moved=true}}}
      var nxt=Infinity;
      busy.forEach(function(b){if(b[0]>cursor+1e-9&&b[0]<nxt)nxt=b[0]});
      var free=nxt-cursor;
      if(every&&since>=every-1e-6){var bl=Math.min(blen,free);blocks.push({type:'break',title:'Break',start:cursor,end:cursor+bl});cursor+=bl;breakTotal+=bl;since=0;continue}
      var chunk=Math.min(every?Math.min(need,every-since):need,free);
      blocks.push({type:'task',title:t.title,start:cursor,end:cursor+chunk,over:cursor+chunk>end+1e-6});
      cursor+=chunk;need-=chunk;since+=chunk;
    }
    res[t.id]={end:cursor,overflow:cursor>end+1e-6};last=res[t.id];
    if(t.parentId){var pr=res[t.parentId]||(res[t.parentId]={end:0,overflow:false});pr.end=Math.max(pr.end,cursor);pr.overflow=pr.overflow||res[t.id].overflow}
  });
  return {start:start,end:end,hrs:hrs,res:res,blocks:blocks,evTotal:evTotal,taskTotal:taskTotal,breakTotal:breakTotal,count:tasks.length,done:last?last.end:null,overflow:last?last.overflow:false};
}
function planCard(){
  var p=PLAN,st=state.settings;
  var h='<section class="blk"><h2>Day plan<button data-act="plan" data-date="'+todayStr()+'">Edit</button></h2><div class="plan">';
  if(p.count)h+='<div class="lbl">Tasks done by</div><div class="val num'+(p.overflow?' warn':'')+'">'+(p.overflow?'Task Overflow':esc(fmtMinClock(p.done)))+'</div>';
  else h+='<div class="lbl">Tasks</div><div class="val">None due today</div>';
  h+='<p>Day runs '+esc(fmtTime(p.hrs.start))+' to '+esc(fmtTime(p.hrs.end))+(p.hrs.custom?' (custom for today)':'')+'</p>';
  h+='<p>Events '+fmtMins(p.evTotal)+' · Tasks '+fmtMins(p.taskTotal)+' · Breaks '+fmtMins(p.breakTotal)+'</p>';
  if(p.overflow)h+='<p class="warn">Not everything fits before '+esc(fmtTime(p.hrs.end))+'.</p>';
  h+='<p>'+(st.breakEvery>0&&st.breakLen>0?st.breakLen+' min break after every '+st.breakEvery+' min of task work':'Breaks are off')+'</p>';
  return h+'</div></section>';
}
function hourLabel(m){var h=Math.floor(m/60)%24;return (h%12||12)+' '+(h<12?'AM':'PM')}
function timelineHTML(p,ds){
  var PPH=80,OFF=12;
  var allDay=dayItems(ds).filter(function(x){return x.allDay&&!x.skipped});
  var head=allDay.length?'<p class="sub alld">All day: '+allDay.map(function(x){return esc(x.title)+(x.multi?' (day '+x.multi.i+' of '+x.multi.n+')':'')}).join(', ')+'</p>':'';
  var blocks=[];
  p.blocks.forEach(function(b){
    var s=b.start,e=b.end;
    if(b.seg){s=Math.max(s,p.start);e=Math.min(e,p.end)}   /* multi-day events: show only the part inside the day's hours */
    if(e>s)blocks.push({type:b.type,title:b.title,start:s,end:e,over:b.over,seg:b.seg||'',col:0,ncols:1});
  });
  if(!blocks.length)return head+'<div class="list"><p class="empty">Nothing scheduled and no tasks due.</p></div>';
  var lo=p.start,hi=p.end;
  blocks.forEach(function(b){lo=Math.min(lo,b.start);hi=Math.max(hi,b.end)});
  lo=Math.max(0,Math.floor(lo/60)*60);hi=Math.min(1440,Math.ceil(hi/60)*60);if(hi<=lo)hi=Math.min(1440,lo+60);
  blocks=blocks.filter(function(b){return b.start<hi});
  blocks.forEach(function(b){b.end=Math.min(b.end,hi)});
  /* tasks and breaks are planned into free time, so only events can overlap each other */
  var evs=blocks.filter(function(b){return b.type==='event'}).sort(function(a,b){return a.start-b.start||a.end-b.end}),cur=null,groups=[];
  evs.forEach(function(b){
    if(!cur||b.start>=cur.end){cur={end:0,items:[],cols:[]};groups.push(cur)}
    cur.end=Math.max(cur.end,b.end);
    var c=0;while(cur.cols[c]!==undefined&&cur.cols[c]>b.start)c++;
    cur.cols[c]=b.end;b.col=c;cur.items.push(b);
  });
  groups.forEach(function(g){g.items.forEach(function(b){b.ncols=g.cols.length})});
  function y(m){return Math.round((OFF+(m-lo)/60*PPH)*10)/10}
  var H=(hi-lo)/60*PPH+OFF*2,h='<div class="tl" style="height:'+H+'px">',m;
  for(m=lo;m<=hi;m+=60)h+='<div class="hr" style="top:'+y(m)+'px">'+hourLabel(m)+'</div>';
  h+='<div class="tla">';
  for(m=lo;m<=hi;m+=30)h+='<div class="gl'+(m%60?' half':'')+'" style="top:'+y(m)+'px"></div>';
  if(p.start>lo)h+='<div class="off" style="top:'+y(lo)+'px;height:'+(y(p.start)-y(lo))+'px"></div>';
  if(p.end<hi)h+='<div class="off" style="top:'+y(p.end)+'px;height:'+(y(hi)-y(p.end))+'px"></div>';
  blocks.sort(function(a,b){return a.start-b.start});
  blocks.forEach(function(b){
    var real=(b.end-b.start)/60*PPH,range=fmtMinClock(b.start)+' – '+fmtMinClock(b.end);
    if(b.seg==='first')range=fmtMinClock(b.start)+' – continues';
    else if(b.seg==='mid')range='All day (continues)';
    else if(b.seg==='last')range='Until '+fmtMinClock(b.end);
    if(b.type==='break'){
      var bh=Math.max(5,real-2);
      h+='<button type="button" class="tbk br" data-act="tlsel" aria-label="'+esc('Break, '+range)+'" style="--h:'+bh+'px;top:'+y(b.start)+'px;height:'+bh+'px"><b>Break · '+fmtMins(b.end-b.start)+'</b><span class="t2">'+esc(range)+'</span></button>';
      return;
    }
    var ht=Math.max(16,real-2),mode=ht>=58?'two':ht>=34?'stack':ht>=22?'one':'tiny';
    var cls=b.type==='event'?'ev':(b.over?'ov':'tk');
    h+='<button type="button" class="tbk '+cls+' '+mode+'" data-act="tlsel" aria-label="'+esc(b.title+', '+range)+'" style="--h:'+ht+'px;top:'+y(b.start)+'px;height:'+ht+'px;left:calc('+(b.col/b.ncols*100)+'% + 1px);width:calc('+(100/b.ncols)+'% - 3px)"><b>'+esc(b.title)+'</b><span class="t1">'+esc(b.seg?range:fmtMinClock(b.start))+'</span><span class="t2">'+esc(range)+'</span></button>';
  });
  h+='</div>';
  var today=ds===todayStr();
  if(today){var nm=nowMinutes();if(nm>=lo&&nm<=hi)h+='<div class="nowline" style="top:'+y(nm)+'px" title="Now"></div>'}
  h+='</div><p class="sub hint2">Tap a block to show all of it.</p>';
  h+='<div class="legend"><span><i class="sw ev"></i>Event</span><span><i class="sw tk"></i>Task</span><span><i class="sw br"></i>Break</span><span><i class="sw ov"></i>Overflow</span>'+(today?'<span><i class="sw nw"></i>Now</span>':'')+'</div>';
  return head+h;
}
function stashPlan(){
  var f=$('#sheet-form');if(!f||!sheet)return;
  sheet.vals={start:f.elements.start.value,end:f.elements.end.value,every:f.elements.every.value,len:f.elements.len.value,def:f.elements.def.value};
}

/* ---------- timers & completing ---------- */
function nkey(s){return String(s).trim().toLowerCase().replace(/\s+/g,' ')}
function tm(t){return t.timer||{status:'idle',acc:0,startedAt:null}}
function elapsed(t){var x=tm(t);return (x.acc||0)+(x.status==='running'&&x.startedAt?Math.max(0,Date.now()-x.startedAt):0)}
function fmtClock(ms){var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;return h?h+':'+pad(m)+':'+pad(c):m+':'+pad(c)}
function fmtDur(ms){var s=Math.round(ms/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;if(h)return h+'h '+m+'m';if(m)return m+'m '+pad(c)+'s';return c+'s'}
var TS={};
function computeTS(){TS={};state.times.forEach(function(r){var o=TS[r.key]||(TS[r.key]={n:0,sum:0,name:r.name,last:''});o.n++;o.sum+=r.ms;if(r.date>=o.last){o.last=r.date;o.name=r.name}})}
function repeatLabel(r){
  if(!r)return '';
  var n=r.n||1;
  if(r.unit==='day')return n===1?'Daily':'Every '+n+' days';
  if(r.unit==='week')return n===1?'Weekly':'Every '+n+' weeks';
  if(r.unit==='month')return n===1?'Monthly':'Every '+n+' months';
  if(r.unit==='wdays')return (r.days||[]).map(function(d){return DN[d]}).join(', ');
  return '';
}
function nextDue(t){
  var r=t.repeat,today=todayStr();
  function from(base){
    var n=Math.max(1,r.n||1),g=0,x;
    if(r.unit==='day')return addDays(base,n);
    if(r.unit==='week')return addDays(base,7*n);
    if(r.unit==='month')return addMonthsDs(base,n,r.dom||parse(base).getDate());
    if(!r.days||!r.days.length)return addDays(base,7);
    x=addDays(base,1);while(r.days.indexOf(parse(x).getDay())<0&&g++<8)x=addDays(x,1);
    return x;
  }
  var nx=from(t.due||today);
  return nx<=today?from(today):nx;
}
function completeOne(t){
  var ms=elapsed(t),next=null;
  if(ms>=1000)state.times.push({id:uid(),key:nkey(t.title),name:t.title,ms:ms,date:todayStr()});
  t.timer={status:'idle',acc:0,startedAt:null};t.done=true;t.doneAt=todayStr();
  if(t.repeat&&!t.spawned){
    next={id:uid(),title:t.title,due:nextDue(t),est:t.est,catId:t.catId||null,projId:t.projId||null,repeat:JSON.parse(JSON.stringify(t.repeat)),order:t.order};
    if(t.parentId)next.parentId=t.parentId;
    if(!next.est)delete next.est;
    state.tasks.push(next);t.spawned=next.id;
    /* a repeating supertask brings fresh copies of its subtasks */
    kidsOf(t).forEach(function(k){var c={id:uid(),title:k.title,due:'',catId:k.catId||null,projId:k.projId||null,parentId:next.id,order:k.order};if(k.est)c.est=k.est;state.tasks.push(c)});
  }
  return {ms:ms,next:next};
}
function completeTask(t){
  kidsOf(t).forEach(function(k){if(!k.done)completeOne(k)});
  var r=completeOne(t),p=parentOf(t);
  if(p&&!p.done&&kidsOf(p).every(function(k){return k.done})){completeOne(p);r.parentDone=p}
  return r;
}
function reopenTask(t){
  t.done=false;delete t.doneAt;
  if(t.spawned){
    var n=byId(state.tasks,t.spawned),x=n?tm(n):null;
    if(n&&!n.done&&x.status==='idle'&&!(x.acc>0)){
      var gone={};gone[n.id]=1;state.tasks.forEach(function(k){if(k.parentId===n.id&&!k.done)gone[k.id]=1});
      state.tasks=state.tasks.filter(function(y){return !gone[y.id]});
    }
    delete t.spawned;
  }
  var p=parentOf(t);if(p&&p.done)reopenTask(p);
}
function scheduleDone(t){
  if(PENDING[t.id]){clearTimeout(PENDING[t.id]);delete PENDING[t.id];render();return}
  PENDING[t.id]=setTimeout(function(){
    delete PENDING[t.id];
    var tt=byId(state.tasks,t.id);if(!tt||tt.done){render();return}
    snapUndo();var r=completeTask(tt);commit();
    var msg=r.ms>=1000?'Logged '+fmtDur(r.ms)+' for '+tt.title:'Done: '+tt.title;
    if(r.next)msg+='. Next one due '+relInline(r.next.due);
    if(r.parentDone)msg+='. '+r.parentDone.title+' is complete';
    showToast(msg);
  },1000);
  render();
}
function avgPill(t){var o=TS[nkey(t.title)];return o?'<span class="avg" title="'+o.n+(o.n===1?' run':' runs')+'">avg '+esc(fmtDur(o.sum/o.n))+'</span>':''}
function timerCtl(t){
  if(t.done||PENDING[t.id]||SEL||isSuper(t))return '';
  var x=tm(t),ms=elapsed(t),run=x.status==='running',paused=x.status==='paused',n=esc(t.title);
  return '<div class="tctl"><span class="clock num'+(run?' run':'')+'" data-clock="'+t.id+'" role="timer" aria-label="Elapsed time">'+fmtClock(ms)+'</span>'+
    '<button class="tb" data-act="tstart" data-id="'+t.id+'"'+(run?' disabled':'')+' aria-label="'+(paused?'Resume':'Start')+' timer: '+n+'">'+(paused?'Resume':'Start')+'</button>'+
    '<button class="tb" data-act="tpause" data-id="'+t.id+'"'+(run?'':' disabled')+' aria-label="Pause timer: '+n+'">Pause</button>'+
    '<button class="tb pri" data-act="tdone" data-id="'+t.id+'"'+(run||ms>0?'':' disabled')+' aria-label="Complete and log time: '+n+'">Done</button></div>';
}
var lastPtr=0,lastMin=-1;
document.addEventListener('pointerdown',function(){lastPtr=Date.now()},true);
function tick(){
  if(!state||drag)return;
  var mnow=Math.floor(Date.now()/60000);
  if(lastMin<0)lastMin=mnow;
  else if(mnow!==lastMin){
    var ae=document.activeElement,busy=ae&&ae.closest&&ae.closest('#view')&&/^(SELECT|INPUT|TEXTAREA)$/.test(ae.tagName);
    if(sheet||busy||Object.keys(PENDING).length||document.querySelector('.tbk.sel')){lastMin=mnow;renderNow()}
    else if(Date.now()-lastPtr>2000){lastMin=mnow;render();return}
  }
  document.querySelectorAll('[data-clock]').forEach(function(el){
    var t=byId(state.tasks,el.getAttribute('data-clock'));
    if(t)el.textContent=fmtClock(elapsed(t));
  });
}

/* ---------- filters ---------- */
function fltCount(){var f=ui.flt;return f.due.length+f.dur.length+f.cat.length+f.proj.length}
function dueBucket(d){var t=todayStr();return !d?'none':d<t?'overdue':d===t?'today':diffDays(d,t)<=7?'week':'later'}
function durBucket(m){return m<15?'lt15':m<30?'15-30':m<60?'30-60':m<=120?'60-120':'gt120'}
function rawMatch(t){
  var f=ui.flt;
  if(f.due.length&&f.due.indexOf(dueBucket(isSuper(t)?topDue(t):effDue(t)))<0)return false;
  if(f.dur.length&&f.dur.indexOf(durBucket(baseEst(t)))<0)return false;
  if(f.cat.length&&f.cat.indexOf(catOf(t.catId)?t.catId:'none')<0)return false;
  if(f.proj.length){
    var pid=projOf(t.projId)?t.projId:'none';
    if(!f.proj.some(function(s){return s===pid||(s!=='none'&&pid!=='none'&&projDesc(s).indexOf(pid)>=0)}))return false;
  }
  return true;
}
function matches(t){if(!fltCount())return true;var m=rawMatch(t);return ui.flt.mode==='hide'?!m:m}

/* ---------- view pieces ---------- */
function tagsFor(o,withRepeat){
  var tags=[],c=catOf(o.catId);
  if(c)tags.push('<span class="tag">'+esc(c.name)+'</span>');
  if(o.projId&&projOf(o.projId))tags.push('<span class="tag proj">'+esc(projPath(o.projId))+'</span>');
  if(withRepeat&&o.repeat)tags.push('<span class="tag rep">↻ '+esc(repeatLabel(o.repeat))+'</span>');
  return tags.length?'<div class="tags">'+tags.join('')+'</div>':'';
}
/* one to do; o.flat shows "in <supertask>", o.manual adds a drag handle, o.eta shows the planned finish */
function taskCore(t,o){
  o=o||{};
  var pend=!!PENDING[t.id],sup=isSuper(t),dueD=sup?topDue(t):effDue(t);
  var over=!t.done&&dueD&&dueD<todayStr(),sub=[];
  if(t.done)sub.push('Done '+esc(relPast(t.doneAt||todayStr())));
  else{
    if(dueD)sub.push('<span class="'+(over?'warn':'')+'">'+esc(rel(dueD))+'</span>');
    if(sup){var ks=KIDS[t.id],dn=ks.filter(function(k){return k.done}).length;sub.push(dn+' of '+ks.length+' done · '+esc(fmtMins(taskEstMin(t)))+' left')}
    else sub.push('<button class="lnk in" data-act="setEst" data-id="'+t.id+'" aria-label="Edit time estimate for '+esc(t.title)+'">est '+esc(fmtMins(baseEst(t)))+'</button>');
    if(o.eta&&PLAN){var r=PLAN.res[t.id];if(r)sub.push(r.overflow?'<span class="warn">Task Overflow</span>':'done '+esc(fmtMinClock(r.end)))}
  }
  if(o.flat&&t.parentId){var p=parentOf(t);if(p)sub.push('in '+esc(p.title))}
  var left=SEL&&!t.done
    ?'<button class="selbox" data-act="selTask" data-id="'+t.id+'" aria-pressed="'+!!SEL[t.id]+'" aria-label="Select '+esc(t.title)+'"></button>'
    :'<button class="chk'+(pend?' pend':'')+'" data-act="toggleTask" data-id="'+t.id+'" aria-pressed="'+(!!t.done||pend)+'" aria-label="'+(t.done?'Mark not done: ':pend?'Undo check: ':'Mark done: ')+esc(t.title)+'"></button>';
  var right='';
  if(sup&&!o.flat&&!t.done){var op=ui.open['st:'+t.id]!==false;right+='<button class="x sm fold" data-act="stToggle" data-id="'+t.id+'" aria-expanded="'+op+'" aria-label="'+(op?'Hide':'Show')+' subtasks of '+esc(t.title)+'">'+(op?'▾':'▸')+'</button>'}
  if(o.manual&&!SEL)right+='<button class="grip" aria-label="Drag to reorder '+esc(t.title)+'" title="Drag to reorder"><i></i><i></i><i></i></button>';
  return left+'<div class="grow"><div class="ttl"><button class="tbtn" data-act="editTask" data-id="'+t.id+'" aria-label="'+(SEL?'Select ':'Edit ')+esc(t.title)+'">'+esc(t.title)+'</button>'+(sup?'<span class="stb">Supertask</span>':'')+avgPill(t)+'</div>'+
    '<div class="sub">'+sub.join(' · ')+'</div>'+tagsFor(t,!t.done)+timerCtl(t)+'</div>'+right;
}
function taskRow(t,o){
  o=o||{};
  var cls='row'+(t.done?' done':'')+(PENDING[t.id]?' pending':'')+(SEL&&SEL[t.id]?' picked':'');
  return '<li class="'+cls+'" data-id="'+t.id+'">'+taskCore(t,o)+'</li>';
}
/* a top-level to do, with its subtasks nested underneath */
function taskTree(t,o,kidFilter){
  o=o||{};
  if(!isSuper(t)||t.done)return taskRow(t,o);
  var open=ui.open['st:'+t.id]!==false;
  var ks=KIDS[t.id].filter(function(k){return !k.done&&(!kidFilter||kidFilter(k))});
  var doneN=KIDS[t.id].length-KIDS[t.id].filter(function(k){return !k.done}).length;
  var cls='stli'+(PENDING[t.id]?' pending':'')+(SEL&&SEL[t.id]?' picked':'');
  var h='<li class="'+cls+'" data-id="'+t.id+'"><div class="row">'+taskCore(t,o)+'</div>';
  if(open){
    h+='<ul class="kids"'+(o.manual&&!SEL?' data-dnd="kids"':'')+'>'+ks.map(function(k){return taskRow(k,{eta:o.eta,manual:o.manual})}).join('')+'</ul>';
    h+='<div class="kidfoot">'+(doneN?'<span class="sub">'+doneN+' finished</span>':'<span></span>')+'<button class="lnk" data-act="addSub" data-id="'+t.id+'">+ Add subtask</button></div>';
  }
  return h+'</li>';
}
function billRow(o,withEdit){
  var b=o.bill,paidId=b.paid[o.ym],paid=!!paidId,late=!paid&&o.date<todayStr();
  var tx=paid?byId(state.txns,paidId):null,st=billStats(b);
  var line1='<span class="'+(late?'warn':'')+'">'+esc(paid?'Paid'+(tx?' '+relPast(tx.date):''):billDue(o.date,false))+'</span>'+(state.accounts.length>1?' · '+esc(acctName(tx?tx.acct:(b.acct||defAcct()))):'');
  var line2='Planned '+money(b.amount)+(st?' · avg '+money(st.avg)+(st.n>1?' ('+st.n+')':'')+' · last '+money(st.last):'');
  var name=withEdit?'<button class="tbtn" data-act="editBill" data-id="'+b.id+'" aria-label="Edit '+esc(b.name)+'">'+esc(b.name)+'</button>':esc(b.name);
  return '<li class="row"><div class="paidbox"><button class="chk" data-act="payBill" data-id="'+b.id+'" data-ym="'+o.ym+'" aria-pressed="'+paid+'" aria-label="'+(paid?'Mark unpaid: ':'Mark paid: ')+esc(b.name)+'"></button><span class="cap">Paid</span></div>'+
    '<div class="grow"><div class="ttl">'+name+'</div><div class="sub">'+line1+'</div><div class="sub">'+line2+'</div></div>'+
    '<div class="amt num">'+money(tx?tx.amount:b.amount)+'</div></li>';
}
function budRow(c,spent){
  var limit=c.budget||0,pct=limit>0?Math.min(100,spent/limit*100):0,over=limit>0&&spent>limit;
  var of=limit>0?(over?money(spent-limit)+' over':money(limit-spent)+' left'):'No budget';
  var inner='<div class="top"><span>'+esc(c.name)+'</span><span class="num"><b>'+money(spent)+'</b> <span class="of">'+(limit>0?'of '+money(limit)+' · ':'')+of+'</span></span></div>'+
    (limit>0?'<div class="bar'+(over?' over':'')+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>':'');
  return c.id?'<button class="bud" data-act="editCat" data-id="'+c.id+'" aria-label="Edit '+esc(c.name)+' and its budget">'+inner+'</button>':'<div class="bud">'+inner+'</div>';
}
function txRow(t){
  var inc=t.type==='in',xf=t.type==='xfer',parts=[];
  if(xf)parts.push(acctName(t.acct)+' → '+acctName(t.toAcct));
  else{parts.push(inc?'Income':(catName(t.catId)||'Uncategorized'));if(state.accounts.length>1)parts.push(acctName(t.acct))}
  if(t.projId&&projOf(t.projId))parts.push(projPath(t.projId));
  parts.push(dateY(t.date));
  var title=t.note||(xf?'Transfer':inc?'Income':catName(t.catId)||'Expense');
  return '<li class="row"><div class="grow"><div class="ttl">'+esc(title)+'</div><div class="sub">'+esc(parts.join(' · '))+'</div></div>'+
    '<div class="amt num'+(inc?' in':xf?' xf':'')+'">'+(inc?'+':'')+money(t.amount)+'</div>'+
    '<button class="x" data-act="delTx" data-id="'+t.id+'" aria-label="Delete '+esc(title)+'">×</button></li>';
}
function list(items,emptyMsg,attr){return items.length?'<ul class="list"'+(attr||'')+'>'+items.join('')+'</ul>':'<div class="list"><p class="empty">'+emptyMsg+'</p></div>'}
function kv(k,v,cls){return '<div class="kv'+(cls?' '+cls:'')+'"><dt>'+esc(k)+'</dt><dd class="num">'+v+'</dd></div>'}
function details(key,defOpen,summary,body){
  var open=ui.open[key]===undefined?defOpen:ui.open[key];
  return '<details class="grp" data-key="'+esc(key)+'"'+(open?' open':'')+'><summary>'+summary+'</summary><div class="gbody">'+body+'</div></details>';
}

/* ---------- Today ---------- */
function topLevel(t){return !t.parentId||!parentOf(t)}
function viewToday(){
  var t=todayStr(),open=state.tasks.filter(function(x){return !x.done});
  var leafDue=open.filter(function(x){var d=effDue(x);return !isSuper(x)&&d&&d<=t});
  var tops=open.filter(function(x){if(!topLevel(x))return false;if(isSuper(x))return KIDS[x.id].some(function(k){var d=effDue(k);return !k.done&&d&&d<=t});return x.due&&x.due<=t}).sort(byDueOrder);
  var evs=dayItems(t);
  var occ=occurrences(),soon=occ.filter(function(o){return diffDays(o.date,t)<=7});
  var next=occ[0],st=stats(monthKey());
  var nextVal=next?esc(next.bill.name):'None',nextHint=next?esc(billDue(next.date,false))+' · '+money(next.bill.amount):'All paid';
  var h='<div class="stats">'+
    '<div class="stat"><div class="lbl">To do today</div><div class="val num">'+leafDue.length+'</div><div class="hint">'+(leafDue.length?(leafDue.some(function(x){return effDue(x)<t})?'Some overdue':'On deck'):'Nothing due')+'</div></div>'+
    '<div class="stat"><div class="lbl">Next bill</div><div class="val sm">'+nextVal+'</div><div class="hint">'+nextHint+'</div></div>'+
    '<div class="stat"><div class="lbl">Left this month</div><div class="val num'+(st.left<0?' warn':'')+'">'+money(st.left)+'</div><div class="hint">'+money(st.spent)+' spent</div></div></div>';
  h+=planCard();
  h+='<section class="blk"><h2>Block schedule</h2>'+timelineHTML(PLAN,t)+'</section>';
  h+='<section class="blk"><h2>Events and classes</h2>'+list(evs.map(function(i){return itemRow(i,t)}),'Nothing scheduled today.')+'</section>';
  h+='<section class="blk"><h2>To do</h2>'+list(tops.map(function(x){return taskTree(x,{eta:true},function(k){var d=effDue(k);return d&&d<=t})}),'Nothing due today.')+'</section>';
  if(soon.length)h+='<section class="blk"><h2>Bills this week</h2>'+list(soon.map(function(o){return billRow(o,false)}),'')+'</section>';
  var buds=state.categories.filter(function(c){return c.budget>0}).map(function(c){return {c:c,s:st.by[c.id]||0}})
    .sort(function(a,b){return b.s/b.c.budget-a.s/a.c.budget}).slice(0,3);
  if(buds.length)h+='<section class="blk"><h2>Budgets<button data-act="tab" data-tab="money">See all</button></h2><div class="list">'+buds.map(function(b){return budRow(b.c,b.s)}).join('')+'</div></section>';
  return h;
}

/* ---------- To do: open list & logs ---------- */
function viewTasks(){
  var open=state.tasks.filter(function(x){return !x.done});
  var h='<div class="seg" role="group" aria-label="View"><button data-act="tfilter" data-f="open" aria-pressed="'+(ui.tf!=='logs')+'">Open ('+open.filter(function(x){return !isSuper(x)}).length+')</button><button data-act="tfilter" data-f="logs" aria-pressed="'+(ui.tf==='logs')+'">Logs</button></div>';
  if(ui.tf==='logs')return h+viewLogs();
  var fc=fltCount();
  h+='<div class="sortbar"><label class="vh" for="f-sort">Sort by</label><select id="f-sort" data-change="sort" aria-label="Sort by">'+SORTS.map(function(s){return opt(s[0],'Sort: '+s[1],ui.sort)}).join('')+'</select>'+
    '<button class="tb'+(fc?' on':'')+'" data-act="filter">Filter'+(fc?' ('+fc+')':'')+'</button>'+
    '<button class="tb'+(SEL?' on':'')+'" data-act="selMode">'+(SEL?'Cancel':'Select')+'</button></div>';
  var tops=open.filter(topLevel);
  var shown=tops.filter(function(t){return matches(t)||(isSuper(t)&&KIDS[t.id].some(function(k){return !k.done&&matches(k)}))});
  function kidF(t){return matches(t)?null:function(k){return matches(k)}}
  if(fc)h+='<div class="fltbar"><span>Showing '+shown.length+' of '+tops.length+(ui.flt.mode==='hide'?' (hiding matches)':'')+'</span><button class="lnk" data-act="fclear">Clear filters</button></div>';
  if(!tops.length)return h+'<div class="list"><p class="empty">All clear. Tap + to add a to do.</p></div>';
  if(!shown.length)return h+'<div class="list"><p class="empty">No to dos match these filters.</p></div>';
  var t=todayStr(),s=ui.sort;
  function sect(title,items,manual){
    return '<section class="blk"><h2>'+esc(title)+'</h2><ul class="list"'+(manual&&!SEL?' data-dnd="top"':'')+'>'+items.map(function(x){return taskTree(x,{manual:manual},kidF(x))}).join('')+'</ul></section>';
  }
  function grouped(keyFn,labelFn,order){
    var g={},keys=[];
    shown.slice().sort(byDueOrder).forEach(function(x){var k=keyFn(x);if(!g[k]){g[k]=[];keys.push(k)}g[k].push(x)});
    keys.sort(order);
    return keys.map(function(k){return sect(labelFn(k),g[k])}).join('');
  }
  if(s==='cat')return h+grouped(function(x){return catOf(x.catId)?x.catId:''},function(k){return k?catName(k):'No category'},function(a,b){if(!a)return 1;if(!b)return -1;return catName(a).localeCompare(catName(b))});
  if(s==='proj')return h+grouped(function(x){return projOf(x.projId)?x.projId:''},function(k){return k?projPath(k):'No project'},function(a,b){if(!a)return 1;if(!b)return -1;return projPath(a).localeCompare(projPath(b))});
  if(s==='az')return h+sect('A to Z',shown.slice().sort(function(a,b){return a.title.localeCompare(b.title)}));
  if(s==='dur')return h+sect('Shortest first',shown.slice().sort(function(a,b){return baseEst(a)-baseEst(b)||byDueOrder(a,b)}));
  if(s==='manual')return h+'<p class="sub hint2">Drag the handle to set the order. The day plan works through same-day to dos in this order.</p>'+sect('Your order',shown.slice().sort(function(a,b){return (a.order||0)-(b.order||0)}),true);
  var groups=[['Overdue',function(x){var d=topDue(x);return d&&d<t}],['Today',function(x){return topDue(x)===t}],['Upcoming',function(x){var d=topDue(x);return d&&d>t}],['No date',function(x){return !topDue(x)}]];
  groups.forEach(function(g){var items=shown.filter(g[1]).sort(function(a,b){var x=topDue(a)||'9999',y=topDue(b)||'9999';return x<y?-1:x>y?1:(a.order||0)-(b.order||0)});if(items.length)h+=sect(g[0],items)});
  return h;
}
function doneBucket(ds){
  var d=diffDays(todayStr(),ds);
  if(d<=0)return ['0','Today'];if(d===1)return ['1','Yesterday'];if(d<7)return ['2','Earlier this week'];
  return ['m'+ds.slice(0,7),parse(ds).toLocaleDateString('en-US',{month:'long',year:'numeric'})];
}
function viewLogs(){
  var done=state.tasks.filter(function(x){return x.done}).sort(function(a,b){var x=a.doneAt||'',y=b.doneAt||'';return x<y?1:x>y?-1:0});
  var h='<section class="blk"><h2>Completed to dos'+(done.length?'<button data-act="clearDone">Clear all</button>':'')+'</h2>';
  if(!done.length)h+='<div class="list"><p class="empty">Finished to dos show up here.</p></div>';
  else{
    var groups=[],idx={};
    done.forEach(function(t){var b=doneBucket(t.doneAt||todayStr());if(!idx[b[0]]){idx[b[0]]={label:b[1],key:b[0],items:[]};groups.push(idx[b[0]])}idx[b[0]].items.push(t)});
    groups.forEach(function(g,i){
      h+=details('done:'+g.key,i===0,'<span class="sl">'+esc(g.label)+'</span><span class="sc">'+g.items.length+'</span>','<ul class="list">'+g.items.map(function(t){return taskRow(t,{flat:true})}).join('')+'</ul>');
    });
  }
  h+='</section>';
  h+='<section class="blk"><h2>Completion times</h2>';
  if(!state.times.length)return h+'<div class="list"><p class="empty">Start a timer on a to do, then tap Done to log how long it took.</p></div></section>';
  h+='<div class="sortbar"><label class="vh" for="f-logsort">Sort times</label><select id="f-logsort" data-change="logSort" aria-label="Sort times">'+LOGSORTS.map(function(s){return opt(s[0],'Sort: '+s[1],ui.logSort)}).join('')+'</select></div>';
  var g={},keys=[];
  state.times.forEach(function(r){if(!g[r.key]){g[r.key]=[];keys.push(r.key)}g[r.key].push(r)});
  keys.sort(function(a,b){return TS[a].name.localeCompare(TS[b].name)});
  var cmp={new:function(a,b){return a.date<b.date?1:a.date>b.date?-1:0},old:function(a,b){return a.date<b.date?-1:a.date>b.date?1:0},fast:function(a,b){return a.ms-b.ms},slow:function(a,b){return b.ms-a.ms}}[ui.logSort]||function(){return 0};
  keys.forEach(function(k){
    var s=TS[k],rows=g[k].slice().sort(cmp);
    var sum='<span class="sl">'+esc(s.name)+'<span class="sc">'+s.n+(s.n===1?' run':' runs')+' · avg '+esc(fmtDur(s.sum/s.n))+'</span></span><button class="tb sm" data-act="again" data-key="'+esc(k)+'" aria-label="Add '+esc(s.name)+' as a new to do">Do again</button>';
    var body='<div class="tblwrap"><table class="log"><thead><tr><th>Date</th><th class="r">Time</th><th><span class="vh">Delete</span></th></tr></thead><tbody>'+
      rows.map(function(r){return '<tr><td><button class="tbtn" data-act="editTime" data-id="'+r.id+'" aria-label="Edit entry from '+esc(dateY(r.date))+'">'+esc(dateY(r.date))+'</button></td><td class="r num"><button class="tbtn" data-act="editTime" data-id="'+r.id+'" aria-label="Edit time '+esc(fmtDur(r.ms))+'">'+esc(fmtDur(r.ms))+'</button></td><td><button class="x" data-act="delTime" data-id="'+r.id+'" aria-label="Delete time entry">×</button></td></tr>'}).join('')+
      '</tbody></table></div>';
    h+=details('time:'+k,false,sum,body);
  });
  return h+'</section>';
}

/* ---------- Money ---------- */
function viewMoney(){
  var h='<div class="seg" role="group" aria-label="Money view">'+MSUBS.map(function(x){return '<button data-act="msub" data-s="'+x[0]+'" aria-pressed="'+(ui.msub===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  return h+(ui.msub==='accounts'?moneyAccounts():ui.msub==='plans'?moneyPlans():moneyOverview());
}
function moneyOverview(){
  var ym=monthKey(),st=stats(ym),pw=planWindow(),exp=expectedThisMonth(),tb=totalBalance();
  var pct=st.income>0?Math.min(100,st.spent/st.income*100):(st.spent>0?100:0);
  var h='<div class="sum"><div class="sub">Left in '+esc(monthName(ym))+'</div><div class="big num'+(st.left<0?' warn':'')+'">'+money(st.left)+'</div>'+
    '<div class="bar'+(st.spent>st.income?' over':'')+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
    '<div class="two"><div>Income<b class="num">'+money(st.income)+'</b></div><div>Spent<b class="num">'+money(st.spent)+'</b></div></div>'+
    '<dl class="kvs">'+
      kv('Total across accounts',money(tb))+
      kv('Planned through '+dateY(pw.end),money(pw.total))+
      kv(' Unpaid bills',money(pw.billsTotal),'subkv')+
      kv(' Planned purchases',money(pw.plannedTotal),'subkv')+
      kv('Accounts after planned',money(tb-pw.total),tb-pw.total<0?'warn':'')+
      (pw.undated?kv('Planned with no date',money(pw.undated)):'')+
      (exp>0?kv('Expected income, not yet confirmed',money(exp)):'')+
    '</dl>'+
    '<div class="tctl"><button class="tb" data-act="addKind" data-kind="spend" data-type="in">+ Income</button><button class="tb" data-act="addKind" data-kind="spend" data-type="out">+ Expense</button><button class="tb" data-act="addKind" data-kind="spend" data-type="xfer">Transfer</button></div></div>';
  var cats=catsSorted().filter(function(c){return c.budget>0||st.by[c.id]>0}).map(function(c){return budRow(c,st.by[c.id]||0)});
  if(st.by['']>0)cats.push(budRow({id:'',name:'Uncategorized',budget:0},st.by['']));
  h+='<section class="blk"><h2>Budgets<button data-act="organize">Edit categories</button></h2>'+(cats.length?'<div class="list">'+cats.join('')+'</div>':'<div class="list"><p class="empty">Give a category a monthly budget to track it here.</p></div>')+'</section>';
  var tx=monthTx(ym).sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0}).slice(0,40);
  h+='<section class="blk"><h2>Activity this month</h2>'+list(tx.map(txRow),'Nothing logged this month.')+'</section>';
  return h;
}
function debtRow(d){
  var bal=debtBal(d),po=payoff(d),line;
  if(bal<=0)line='Paid off';
  else if(!po)line='Add a minimum payment to see a payoff estimate.';
  else if(po.never)line='<span class="warn">The minimum payment does not cover the interest, so this balance would never be paid off.</span>';
  else line='Paid off around '+esc(monthLabel(po.date))+' paying '+money(d.minPay)+' a month, with about '+money(Math.round(po.interest))+' in interest.';
  var info=[d.apr?d.apr+'% APR':'No interest rate set'];if(d.minPay)info.push('minimum '+money(d.minPay));
  return '<li class="row"><div class="grow"><div class="ttl"><button class="tbtn" data-act="editDebt" data-id="'+d.id+'" aria-label="Edit '+esc(d.name)+'">'+esc(d.name)+'</button></div><div class="sub">'+esc(info.join(' · '))+'</div><div class="sub">'+line+'</div>'+
    (bal>0?'<div class="tctl"><button class="tb sm" data-act="payDebt" data-id="'+d.id+'">Log payment</button></div>':'')+'</div><div class="amt num">'+money(bal)+'</div></li>';
}
function moneyAccounts(){
  var tb=totalBalance(),td=totalDebt();
  var h='<div class="sum"><div class="sub">Total across accounts</div><div class="big num'+(tb<0?' warn':'')+'">'+money(tb)+'</div>'+
    '<dl class="kvs">'+kv('Total debt',money(td))+kv('Accounts minus debt',money(tb-td),tb-td<0?'warn':'')+'</dl>'+
    '<div class="tctl"><button class="tb" data-act="addKind" data-kind="spend" data-type="xfer">Transfer between accounts</button></div></div>';
  var rows=state.accounts.map(function(a){
    var b=balance(a),isDef=a.id===defAcct();
    return '<li class="row"><div class="grow"><div class="ttl"><button class="tbtn" data-act="editAcct" data-id="'+a.id+'" aria-label="Edit '+esc(a.name)+'">'+esc(a.name)+'</button>'+(isDef?'<span class="tag">Default</span>':'')+'</div></div><div class="amt num'+(b<0?' warnc':'')+'">'+money(b)+'</div></li>';
  });
  h+='<section class="blk"><h2>Accounts<button data-act="addKind" data-kind="acct">Add account</button></h2>'+list(rows,'')+'<p class="sub hint2">Each balance is what you set it to, plus everything logged to that account since.</p></section>';
  h+='<section class="blk"><h2>Debts<button data-act="addKind" data-kind="debt">Add debt</button></h2>'+list(state.debts.map(debtRow),'Track a loan or card balance here. Payments you log lower it and count as spending.')+'</section>';
  return h;
}
function plannedRow(p){
  var late=p.date&&p.date<todayStr(),bits=[];
  bits.push(p.date?'<span class="'+(late?'warn':'')+'">'+esc(late?'Planned for '+dateY(p.date):rel(p.date))+'</span>':'No date');
  return '<li class="row"><div class="grow"><div class="ttl"><button class="tbtn" data-act="editPlanned" data-id="'+p.id+'" aria-label="Edit '+esc(p.name)+'">'+esc(p.name)+'</button></div><div class="sub">'+bits.join(' · ')+'</div>'+tagsFor(p)+
    '<div class="tctl"><button class="tb sm" data-act="spendPlanned" data-id="'+p.id+'">Mark spent</button></div></div><div class="amt num">'+money(p.amount)+'</div></li>';
}
function goalRow(g){
  var have=goalHave(g),pct=g.target>0?Math.min(100,have/g.target*100):0,left=Math.max(0,g.target-have),parts=[];
  parts.push(g.mode==='account'?'Follows '+acctName(g.acct):'Money you set aside');
  if(left<=0)parts.push('Reached');
  else if(g.date){var mu=monthsUntil(g.date);parts.push(mu>0?money(Math.ceil(left/mu))+' a month to reach it by '+dateY(g.date):'Target date has passed, '+money(left)+' to go')}
  else parts.push(money(left)+' to go');
  return '<li class="row goal"><div class="grow"><div class="gtop"><button class="tbtn" data-act="editGoal" data-id="'+g.id+'" aria-label="Edit '+esc(g.name)+'">'+esc(g.name)+'</button><span class="num"><b>'+money(have)+'</b> <span class="of">of '+money(g.target)+'</span></span></div>'+
    '<div class="bar'+(left<=0?' full':'')+'"><i style="width:'+pct.toFixed(1)+'%"></i></div><div class="sub">'+esc(parts.join(' · '))+'</div>'+
    (g.mode!=='account'&&left>0?'<div class="tctl"><button class="tb sm" data-act="goalAdd" data-id="'+g.id+'">Add money</button></div>':'')+'</div></li>';
}
function moneyPlans(){
  var ym=monthKey(),pw=planWindow(),w=state.settings.planWin;
  var h='<div class="sum"><div class="sub">Planned through '+esc(dateY(pw.end))+'</div><div class="big num">'+money(pw.total)+'</div>'+
    '<dl class="kvs">'+kv('Unpaid bills ('+pw.bills.length+')',money(pw.billsTotal))+kv('Planned purchases ('+pw.planned.length+')',money(pw.plannedTotal))+kv('Accounts after planned',money(totalBalance()-pw.total),totalBalance()-pw.total<0?'warn':'')+'</dl>'+
    '<div class="winctl"><span class="sub">Look ahead</span>'+
      (w.unit==='date'?'<input id="f-wind" type="date" aria-label="Plan until" value="'+esc(w.date||winEnd())+'">':'<input id="f-winn" type="number" inputmode="numeric" min="1" max="99" aria-label="How many" value="'+esc(String(w.n||1))+'">')+
      '<select id="f-winu" aria-label="Unit">'+WINU.map(function(x){return opt(x[0],x[1],w.unit)}).join('')+'</select></div></div>';
  var pl=state.planned.slice().sort(function(a,b){var x=a.date||'9999',y=b.date||'9999';return x<y?-1:x>y?1:a.name.localeCompare(b.name)});
  h+='<section class="blk"><h2>Planned purchases · '+money(plannedAll())+'<button data-act="addKind" data-kind="planned">Add</button></h2>'+list(pl.map(plannedRow),'Add something you expect to buy. It does not count as spending until you mark it spent.')+'</section>';
  var bills=state.bills.slice().sort(function(a,b){return a.day-b.day}).map(function(b){return {bill:b,ym:ym,date:billDate(b,ym)}});
  h+='<section class="blk"><h2>Bills · '+esc(monthName(ym))+'<button data-act="addKind" data-kind="bill">Add bill</button></h2>'+list(bills.map(function(o){return billRow(o,true)}),'No bills yet.')+'<p class="sub hint2">Unpaid bills count toward your planned total until you mark them paid.</p></section>';
  h+='<section class="blk"><h2>Expected income<button data-act="addKind" data-kind="income">Add</button></h2>'+list(state.incomes.map(incRow),'Add a paycheck or other regular income. You confirm each one when it arrives.')+'</section>';
  h+='<section class="blk"><h2>Goals<button data-act="addKind" data-kind="goal">Add goal</button></h2>'+list(state.goals.map(goalRow),'Set a savings target. Track it with money you set aside, or by an account’s balance.')+'</section>';
  return h;
}

/* ---------- Calendar ---------- */
function viewCalendar(){
  var first=new Date(calY,calM,1),lead=first.getDay(),dim=daysIn(calY,calM+1),ym=calY+'-'+pad(calM+1),t=todayStr();
  var label=first.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  var h='<div class="calhead"><button data-act="calprev" aria-label="Previous month">‹</button><h3>'+esc(label)+'</h3><button data-act="calnext" aria-label="Next month">›</button></div>';
  h+='<div class="dow">'+['S','M','T','W','T','F','S'].map(function(d){return '<span>'+d+'</span>'}).join('')+'</div><div class="cal">';
  for(var i=0;i<lead;i++)h+='<span></span>';
  for(var d=1;d<=dim;d++){
    var ds=ym+'-'+pad(d),dots='',items=dayItems(ds).filter(function(x){return !x.skipped});
    if(items.some(function(x){return x.kind==='event'}))dots+='<i class="dot e"></i>';
    if(items.some(function(x){return x.kind==='routine'}))dots+='<i class="dot r"></i>';
    if(state.tasks.some(function(x){return !x.done&&!isSuper(x)&&effDue(x)===ds}))dots+='<i class="dot t"></i>';
    if(billsOn(ds).some(function(o){return !o.bill.paid[o.ym]}))dots+='<i class="dot b"></i>';
    h+='<button class="day'+(ds===t?' today':'')+'" data-act="calday" data-date="'+ds+'" aria-pressed="'+(ds===calSel)+'" aria-label="'+esc(parse(ds).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}))+'">'+d+'<span class="dots">'+dots+'</span></button>';
  }
  h+='</div><div class="legend"><span><i class="dot e"></i>Event</span><span><i class="dot r"></i>Regular</span><span><i class="dot t"></i>To do</span><span><i class="dot b"></i>Bill</span></div>';
  var evs=dayItems(calSel);
  var tks=state.tasks.filter(function(x){return !isSuper(x)&&effDue(x)===calSel}).sort(byDueOrder);
  var bl=billsOn(calSel);
  var title=parse(calSel).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  h+='<section class="blk"><h2>'+esc(title)+'<button data-act="add">Add</button></h2>';
  var rows=evs.map(function(i){return itemRow(i,calSel)}).concat(tks.map(function(x){return taskRow(x,{flat:true})}),bl.map(function(o){return billRow(o,false)}));
  var hh=hoursFor(calSel);
  h+=list(rows,'Nothing planned.')+'<p class="sub hint2">Day hours '+esc(fmtTime(hh.start))+' to '+esc(fmtTime(hh.end))+(hh.custom?' (set for this day)':'')+' <button class="lnk" data-act="plan" data-date="'+calSel+'">Edit</button></p></section>';
  if(calSel>=t)h+='<section class="blk"><h2>Block schedule</h2>'+timelineHTML(planDay(calSel),calSel)+'</section>';
  h+='<section class="blk"><h2>Regular schedule<button data-act="addKind" data-kind="routine">Add</button></h2>'+list(state.routines.map(routineRow),'Add things that repeat every week, like work or class.')+'</section>';
  return h;
}

/* ---------- render ---------- */
function renderSelBar(){
  var el=$('#selbar');
  if(!SEL||tab!=='tasks'||ui.tf==='logs'){el.hidden=true;el.innerHTML='';$('.fab').hidden=false;return}
  var n=Object.keys(SEL).length;
  el.innerHTML='<div class="sbin"><div class="sbtop"><b>'+n+' selected</b><button class="lnk" data-act="selAll">Select all shown</button><button class="lnk" data-act="selMode">Cancel</button></div>'+
    '<div class="sbbtns"><button class="tb pri" data-act="bulkEdit"'+(n?'':' disabled')+'>Edit</button><button class="tb" data-act="bulkDone"'+(n?'':' disabled')+'>Mark done</button><button class="tb" data-act="bulkDel"'+(n?'':' disabled')+'>Delete</button></div></div>';
  el.hidden=false;$('.fab').hidden=true;
}
function render(){
  if(!state)return;
  computeTS();computeKids();
  PLAN=planDay(todayStr());
  var t=new Date();
  if(tab==='today'){$('#h-title').textContent=t.toLocaleDateString('en-US',{weekday:'long'});$('#h-sub').textContent=t.toLocaleDateString('en-US',{month:'long',day:'numeric'})}
  else{
    $('#h-title').textContent={tasks:'To do',money:'Money',calendar:'Calendar'}[tab];
    $('#h-sub').textContent=tab==='tasks'?state.tasks.filter(function(x){return !x.done&&!isSuper(x)}).length+' open':tab==='money'?t.toLocaleDateString('en-US',{month:'long',year:'numeric'}):'';
  }
  $('#banner').innerHTML=state.examples?'<div class="note"><span>These are example entries so you can see how it works.</span><button data-act="clearExamples">Clear them</button></div>':'';
  var v={today:viewToday,tasks:viewTasks,money:viewMoney,calendar:viewCalendar}[tab]();
  $('#view').innerHTML=v;
  renderNow();
  renderOverdue();
  renderIncomeBar();
  renderSelBar();
  $('#tabs').innerHTML=TABS.map(function(x){return '<button data-act="tab" data-tab="'+x[0]+'"'+(tab===x[0]?' aria-current="page"':'')+'>'+ICONS[x[0]]+x[1]+'</button>'}).join('');
}

/* ---------- drag to reorder (manual sort) ---------- */
document.addEventListener('pointerdown',function(e){
  var g=e.target.closest&&e.target.closest('.grip');if(!g)return;
  var li=g.closest('li[data-id]'),ul=li&&li.parentElement;if(!ul||!ul.hasAttribute('data-dnd'))return;
  e.preventDefault();
  var items=[].slice.call(ul.children).filter(function(x){return x.matches('li[data-id]')});
  var rects=items.map(function(x){var r=x.getBoundingClientRect();return {top:r.top+window.scrollY,h:r.height}});
  drag={li:li,items:items,rects:rects,idx:items.indexOf(li),to:items.indexOf(li),y0:e.clientY+window.scrollY,cy:e.clientY,pid:e.pointerId};
  li.classList.add('dragging');document.body.classList.add('dragmode');
  try{g.setPointerCapture(e.pointerId)}catch(x){}
  requestAnimationFrame(autoScroll);
});
document.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.pid)return;drag.cy=e.clientY;dragUpdate();e.preventDefault()},{passive:false});
function dragUpdate(){
  var d=drag,dy=d.cy+window.scrollY-d.y0,me=d.rects[d.idx],center=me.top+dy+me.h/2,to=d.idx;
  d.rects.forEach(function(r,i){if(i===d.idx)return;var mid=r.top+r.h/2;if(i<d.idx&&center<mid)to=Math.min(to,i);if(i>d.idx&&center>mid)to=Math.max(to,i)});
  d.to=to;
  d.li.style.transform='translateY('+dy+'px)';
  d.items.forEach(function(x,i){if(i===d.idx)return;var s=0;if(d.idx<to&&i>d.idx&&i<=to)s=-me.h;if(d.idx>to&&i<d.idx&&i>=to)s=me.h;x.style.transform=s?'translateY('+s+'px)':''});
}
function autoScroll(){
  if(!drag)return;
  var y=drag.cy,v=0;
  if(y<90)v=-10;else if(y>window.innerHeight-160)v=10;
  if(v){window.scrollBy(0,v);dragUpdate()}
  requestAnimationFrame(autoScroll);
}
function endDrag(e){
  if(!drag||(e&&e.pointerId!==drag.pid))return;
  var d=drag;drag=null;document.body.classList.remove('dragmode');
  d.items.forEach(function(x){x.style.transform=''});d.li.classList.remove('dragging');
  if(d.to!==d.idx){var ids=d.items.map(function(x){return x.dataset.id}),m=ids.splice(d.idx,1)[0];ids.splice(d.to,0,m);applyOrder(ids);commit()}
}
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);
function applyOrder(ids){
  var ts=ids.map(function(id){return byId(state.tasks,id)}).filter(Boolean);
  var ords=ts.map(function(t){return t.order||0}).sort(function(a,b){return a-b});
  for(var i=1;i<ords.length;i++)if(ords[i]<=ords[i-1])ords[i]=ords[i-1]+0.001;
  ts.forEach(function(t,i){t.order=ords[i]});
}

/* ---------- sheet ---------- */
var KINDS=[['task','To do'],['spend','Money'],['planned','Planned'],['bill','Bill'],['event','Event'],['routine','Regular']];
var NOCHIPS={plan:1,est:1,income:1,organize:1,cat:1,proj:1,acct:1,debt:1,debtpay:1,goal:1,goaladd:1,time:1,filter:1,bulk:1,billpay:1,sbcfg:1,signin:1,newpass:1,cloudbk:1};
function field(label,inner){return '<label class="field"><span>'+label+'</span>'+inner+'</label>'}
function openSheet(kind,opts){
  sheet=Object.assign({kind:kind,type:'out',date:todayStr(),days:[],mdays:[],scope:'day'},opts||{});
  renderSheet();$('#scrim').hidden=false;$('#sheet').hidden=false;$('#sheet').scrollTop=0;
  setTimeout(function(){var f=$('#sheet-form input:not([type=checkbox]),#sheet-form select');if(f&&matchMedia('(hover:hover)').matches)f.focus()},30);
}
function closeSheet(){
  if(sheet&&sheet.back){var b=sheet.back;openSheet(b);return}
  sheet=null;$('#scrim').hidden=true;$('#sheet').hidden=true;$('#sheet').innerHTML='';
}
function closeAllSheets(){if(sheet)sheet.back=null;closeSheet()}
function moneyInput(name,val,ph,neg){return '<input id="f-'+name+'" name="'+name+'" type="number" inputmode="decimal" step="0.01"'+(neg?'':' min="0"')+' value="'+(val==null||val===''?'':esc(String(val)))+'" placeholder="'+esc(ph||'0.00')+'">'}
function dateField(label,name,val){return '<div class="field"><span class="fl"><label for="f-'+name+'">'+label+'</label><button type="button" class="lnk in" data-act="clearDate" data-for="f-'+name+'">No date</button></span><input id="f-'+name+'" name="'+name+'" type="date" value="'+esc(val||'')+'"></div>'}
function chipsGroup(act,group,items,selected){return '<div class="chips">'+items.map(function(x){return '<button type="button" class="chip" data-act="'+act+'" data-g="'+group+'" data-v="'+esc(x[0])+'" aria-pressed="'+(selected.indexOf(x[0])>=0)+'">'+esc(x[1])+'</button>'}).join('')+'</div>'}
function pastNames(){
  var seen={},out=[];
  function add(n){var k=nkey(n);if(k&&!seen[k]){seen[k]=1;out.push(n)}}
  Object.keys(TS).forEach(function(k){add(TS[k].name)});
  state.tasks.filter(function(t){return t.done}).forEach(function(t){add(t.title)});
  return out.sort(function(a,b){return a.localeCompare(b)});
}
function lastTaskNamed(name){var k=nkey(name);return state.tasks.filter(function(x){return nkey(x.title)===k}).sort(function(a,b){return (a.doneAt||'')<(b.doneAt||'')?-1:1}).pop()||null}
function organizeHTML(){
  var h='<h3>Settings</h3>'+accountHTML();
  var cr=catsSorted().map(function(c){
    var n=state.tasks.filter(function(t){return !t.done&&t.catId===c.id}).length;
    return '<li class="row"><div class="grow"><div class="ttl">'+esc(c.name)+'</div><div class="sub">'+(c.budget>0?money(c.budget)+' a month':'No budget')+' · '+n+' open to do'+(n===1?'':'s')+'</div></div><button class="tb sm" data-act="editCat" data-id="'+c.id+'" data-back="organize" aria-label="Edit '+esc(c.name)+'">Edit</button></li>';
  });
  h+='<div class="oblk"><h4>Categories<button class="lnk" data-act="newCat">Add</button></h4><p class="sub">One list for both to dos and money.</p>'+list(cr,'No categories yet.')+'</div>';
  var pr=projSorted().map(function(r){
    var ids=projDesc(r.p.id),n=state.tasks.filter(function(t){return !t.done&&ids.indexOf(t.projId)>=0}).length;
    var spent=r2(state.txns.reduce(function(s,t){return s+(t.type==='out'&&ids.indexOf(t.projId)>=0?t.amount:0)},0));
    var planned=r2(state.planned.reduce(function(s,p){return s+(ids.indexOf(p.projId)>=0?p.amount:0)},0));
    return '<li class="row" style="padding-left:'+(14+r.depth*18)+'px"><div class="grow"><div class="ttl">'+(r.depth?'<span class="sub">› </span>':'')+esc(r.p.name)+'</div><div class="sub">'+n+' open to do'+(n===1?'':'s')+' · '+money(spent)+' spent'+(planned?' · '+money(planned)+' planned':'')+'</div></div>'+
      '<div class="rbtns"><button class="tb sm" data-act="editProj" data-id="'+r.p.id+'" data-back="organize" aria-label="Edit '+esc(r.p.name)+'">Edit</button><button class="tb sm" data-act="newProj" data-parent="'+r.p.id+'" aria-label="Add a sub-project under '+esc(r.p.name)+'">+ Sub</button></div></li>';
  });
  h+='<div class="oblk"><h4>Projects<button class="lnk" data-act="newProj">Add</button></h4><p class="sub">Group to dos and expenses. Counts include sub-projects.</p>'+list(pr,'No projects yet.')+'</div>';
  var le=state.settings.lastExport;
  h+='<div class="oblk"><h4>Backup file</h4><p class="sub">Your data is stored only on this device. Save a backup file now and then and keep it somewhere safe, such as Files, iCloud Drive or Google Drive.</p>'+
    '<p class="sub bkl">'+(le?'Last backup saved '+esc(relPast(le)):'No backup saved yet')+'</p>'+
    '<div class="tctl"><button type="button" class="tb" data-act="exportData">Save backup</button><button type="button" class="tb" data-act="importData">Restore from backup</button></div>'+
    '<input type="file" id="f-import" accept=".json,application/json" hidden><p class="err" id="bk-err" role="alert"></p></div>';
  return h+'<div class="btns"><button type="button" class="btn" data-act="closeAll">Done</button></div><p class="sub ver">Lifebrained '+APP_VERSION+'</p>';
}
function accountHTML(){
  var cfg=sbConfig(),h='<div class="oblk"><h4>Account</h4>';
  if(!cfg)return h+'<p class="sub">Sign in to keep your data in an online account. It syncs between your devices and is kept even if this phone loses it. This needs a free Supabase project; the README has the steps.</p><div class="tctl"><button type="button" class="tb pri" data-act="sbSetup">Set up accounts</button></div></div>';
  if(!SY.client)return h+'<p class="err">'+esc(SY.err||'Accounts could not start.')+'</p>'+(cfg.fixed?'':'<div class="tctl"><button type="button" class="tb" data-act="sbSetup">Check Supabase settings</button></div>')+'</div>';
  if(!SY.user)return h+'<p class="sub">Sign in to sync this device with your account. Each person signs in with their own email, and their data stays private to them.</p><div class="tctl"><button type="button" class="tb pri" data-act="signIn">Sign in</button><button type="button" class="tb" data-act="signUp">Create account</button></div>'+(cfg.fixed?'':'<p class="sub"><button type="button" class="lnk in" data-act="sbSetup">Change Supabase project</button></p>')+'</div>';
  var st=SY.phase==='synced'?'Synced '+ago(SY.meta.lastSync||Date.now()):SY.phase==='offline'?'Offline. Changes are saved on this device and sync when you are back online.':SY.phase==='error'?SY.err:'Syncing…';
  return h+'<p class="sub">Signed in as <b>'+esc(SY.user.email||'')+'</b></p><p class="sub'+(SY.phase==='error'?' warn':'')+'">'+esc(st)+'</p><p class="sub">A copy is also saved to your account once a day. The last 40 copies are kept.</p>'+
    '<div class="tctl"><button type="button" class="tb" data-act="syncNow">Sync now</button><button type="button" class="tb" data-act="cloudList">Cloud backups</button><button type="button" class="tb" data-act="signOut">Sign out</button></div></div>';
}
function cloudHTML(){
  var L=sheet.list,body;
  if(!L)body='<p class="sub">Loading…</p>';
  else if(L.error)body='<p class="err">'+esc(L.error)+'</p>';
  else body=list(L.items.map(function(x){var d=new Date(x.created_at);return '<li class="row"><div class="grow"><div class="ttl">'+esc(d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}))+'</div><div class="sub">'+esc(x.note||'Backup')+'</div></div><button type="button" class="tb sm" data-act="cloudRestore" data-id="'+esc(String(x.id))+'">Restore</button></li>'}),'No cloud backups yet. One is saved the first time you sync each day.');
  return '<h3>Cloud backups</h3><p class="sub help">Restoring replaces what is on this device and in your account. You can undo it right after.</p>'+body+'<div class="btns"><button type="button" class="btn ghost" data-act="closeSheet">Back</button></div>';
}
function loadCloudList(){
  if(!SY.client||!SY.user){sheet.list={error:'Sign in first.'};renderSheet();return}
  SY.client.from('lifebrained_backups').select('id,created_at,note').eq('user_id',SY.user.id).order('created_at',{ascending:false}).limit(40).then(function(r){
    if(!sheet||sheet.kind!=='cloudbk')return;
    sheet.list=r.error?{error:authMsg(r.error)}:{items:r.data||[]};renderSheet();
  },function(e){if(sheet&&sheet.kind==='cloudbk'){sheet.list={error:authMsg(e)};renderSheet()}});
}
function restoreHTML(){
  var p=sheet.pending,d=p.data,when=p.exportedAt?new Date(p.exportedAt):null;
  var n=function(k){return Array.isArray(d[k])?d[k].length:0};
  return '<h3>Restore this backup?</h3>'+
    '<p class="sub help">'+(when&&!isNaN(when)?'Saved '+esc(when.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}))+' at '+esc(when.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})):'Backup file')+(p.version?' from Lifebrained '+esc(p.version):'')+'</p>'+
    '<dl class="kvs">'+kv('To dos',n('tasks'))+kv('Money entries',n('txns'))+kv('Events',n('events'))+kv('Bills',n('bills'))+kv('Time log entries',n('times'))+'</dl>'+
    '<p class="sub help warnbox">This replaces everything currently on this device with what is in the backup. You can undo it right after.</p>'+
    '<div class="btns"><button type="button" class="btn ghost" data-act="closeSheet">Cancel</button><button type="button" class="btn" data-act="restoreYes">Replace my data</button></div>';
}
function exportData(){
  var day=todayStr(),name='lifebrained-backup-'+day+'.json';
  var text=JSON.stringify({app:'Lifebrained',version:APP_VERSION,exportedAt:new Date().toISOString(),data:state});
  function done(msg){state.settings.lastExport=day;persist();if(sheet&&sheet.kind==='organize')renderSheet();showToast(msg,false)}
  function download(){
    try{
      var url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(function(){URL.revokeObjectURL(url)},10000);
      done('Backup saved as '+name);
    }catch(e){var el=$('#bk-err');if(el)el.textContent='The backup could not be saved on this device.'}
  }
  var file=null;try{file=new File([text],name,{type:'application/json'})}catch(e){}
  if(file&&navigator.canShare&&navigator.share){
    var ok=false;try{ok=navigator.canShare({files:[file]})}catch(e){}
    if(ok){
      navigator.share({files:[file],title:'Lifebrained backup'}).then(function(){done('Backup saved')},function(err){if(!err||err.name!=='AbortError')download()});
      return;
    }
  }
  download();
}
function readBackup(file){
  var el=$('#bk-err');if(el)el.textContent='';
  var r=new FileReader();
  r.onload=function(){
    var obj=null;try{obj=JSON.parse(r.result)}catch(e){}
    var data=obj&&typeof obj==='object'?(obj.data&&typeof obj.data==='object'?obj.data:obj):null;
    if(!data||!(Array.isArray(data.tasks)||Array.isArray(data.txns))){if(el)el.textContent='That file is not a Lifebrained backup. Pick a file whose name starts with lifebrained-backup.';return}
    openSheet('restore',{pending:{data:data,exportedAt:obj.exportedAt||null,version:obj.version||''},back:'organize'});
  };
  r.onerror=function(){if(el)el.textContent='That file could not be read. Try saving it to Files first, then pick it again.'};
  r.readAsText(file);
}
function restoreBackup(){
  var p=sheet&&sheet.pending;if(!p)return;
  snapUndo();
  MIGRATED=false;state=normalize(JSON.parse(JSON.stringify(p.data)));MIGRATED=false;
  closeAllSheets();commit();showToast('Backup restored',true);
  asked=false;setTimeout(maybeAsk,400);
}
function renderSheet(){
  var k=sheet.kind,h='<div class="in">',extra='',submit='Save';
  if(k==='organize'){$('#sheet').innerHTML=h+organizeHTML()+'</div>';return}
  if(k==='restore'){$('#sheet').innerHTML=h+restoreHTML()+'</div>';return}
  if(k==='cloudbk'){$('#sheet').innerHTML=h+cloudHTML()+'</div>';return}
  var editing=!!sheet.id;
  var titles={task:editing?'Edit to do':(sheet.pre&&sheet.pre.parentId&&!sheet.pre.title?'New subtask':sheet.pre?'Do again':'New to do'),spend:sheet.plannedId?'Record planned expense':sheet.type==='in'?'New income':sheet.type==='xfer'?'Transfer':'New expense',bill:editing?'Edit bill':'New monthly bill',event:'New event',routine:'New regular event',plan:'Day plan',est:'Time estimate',income:editing?'Edit expected income':'Recurring income',
    cat:editing?'Edit category':'New category',proj:editing?'Edit project':'New project',acct:editing?'Edit account':'New account',planned:editing?'Edit planned purchase':'New planned purchase',debt:editing?'Edit debt':'New debt',debtpay:'Log a payment',goal:editing?'Edit goal':'New goal',goaladd:'Add money to goal',time:'Edit time entry',filter:'Filter to dos',bulk:'Edit selected to dos',billpay:'Mark bill paid',sbcfg:'Set up accounts',signin:sheet.mode==='up'?'Create account':'Sign in',newpass:'Set a new password'};
  h+='<h3>'+titles[k]+'</h3>';
  if(!NOCHIPS[k]&&!editing&&!sheet.pre&&!sheet.plannedId){
    h+='<div class="chips" role="group" aria-label="What to add">'+KINDS.map(function(x){return '<button type="button" class="chip" data-act="kind" data-kind="'+x[0]+'" aria-pressed="'+(k===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  }
  h+='<form id="sheet-form" novalidate>';
  if(k==='task'){
    var et=editing?byId(state.tasks,sheet.id):null,pre=sheet.pre||{},src=et||pre,rp=src.repeat||null;
    var dueVal=et?(et.due||''):(pre.due!==undefined?pre.due:(tab==='calendar'?sheet.date:''));
    var names=pastNames();
    if(!editing&&!pre.title&&names.length){
      h+=field('Start from a finished to do (optional)','<select id="f-copy" name="copy">'+opt('','Pick one to repeat it','')+names.map(function(n){return opt(n,n,'')}).join('')+'</select>');
    }
    h+=field('What needs doing','<input id="f-title" name="title" autocomplete="off" required value="'+esc(src.title||'')+'" list="dl-past">')+'<datalist id="dl-past">'+names.map(function(n){return '<option value="'+esc(n)+'"></option>'}).join('')+'</datalist>';
    h+='<div class="two-f">'+dateField('Due date','due',dueVal)+field('Estimate (min)','<input id="f-est" name="est" type="number" inputmode="numeric" min="1" value="'+(src.est||'')+'" placeholder="'+esc(String(Math.round(src.title?autoEstTitle(src.title):state.settings.defaultTask)))+'">')+'</div>';
    h+='<div class="two-f">'+field('Category','<select id="f-cat" name="cat">'+catOptions(src.catId)+'</select>')+field('Project','<select id="f-proj" name="proj">'+projOptions(src.projId)+'</select>')+'</div>';
    var hasKids=et&&state.tasks.some(function(x){return x.parentId===et.id});
    if(hasKids)h+='<p class="sub help">This is a supertask. Its length is the total of its subtasks, and it is done when they all are.</p>';
    else{
      var cands=state.tasks.filter(function(x){return !x.done&&!x.parentId&&(!et||x.id!==et.id)}).sort(function(a,b){return a.title.localeCompare(b.title)});
      h+=field('Part of supertask','<select id="f-parent" name="parent">'+opt('','None',src.parentId||'')+cands.map(function(x){return opt(x.id,x.title,src.parentId||'')}).join('')+'</select>');
    }
    h+='<div class="two-f">'+field('Repeats','<select id="f-rep" name="rep">'+REPEATS.map(function(x){return opt(x[0],x[1],rp?rp.unit:'')}).join('')+'</select>')+
      '<div id="g-repn"'+(rp&&rp.unit!=='wdays'?'':' hidden')+'>'+field('Every how many','<input id="f-repn" name="repn" type="number" inputmode="numeric" min="1" max="99" value="'+(rp&&rp.n||1)+'">')+'</div></div>';
    h+='<div id="g-repd" class="field"'+(rp&&rp.unit==='wdays'?'':' hidden')+'><span>On</span><div class="chips">'+DN.map(function(n,i){return '<button type="button" class="chip" data-act="wday" data-d="'+i+'" aria-pressed="'+(sheet.days.indexOf(i)>=0)+'">'+n+'</button>'}).join('')+'</div></div>';
    h+='<p class="sub help">A subtask with no due date uses its supertask’s. A repeating to do needs a due date; completing it adds the next one.</p>';
    if(et&&et.done){
      h+='<label class="chkrow"><input type="checkbox" id="f-done" name="done" checked> Done</label>'+field('Completed on','<input id="f-doneat" name="doneat" type="date" value="'+esc(et.doneAt||todayStr())+'">');
    }
    if(et){
      extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
      if(!et.parentId&&!et.done)h+='<p class="help"><button type="button" class="lnk" data-act="addSub" data-id="'+et.id+'">+ Add a subtask to this</button></p>';
    }
  }else if(k==='spend'){
    var pl=sheet.plannedId?byId(state.planned,sheet.plannedId):null,ty=sheet.type;
    if(!pl)h+='<div class="seg" role="group" aria-label="Type"><button type="button" data-act="stype" data-type="out" aria-pressed="'+(ty==='out')+'">Expense</button><button type="button" data-act="stype" data-type="in" aria-pressed="'+(ty==='in')+'">Income</button><button type="button" data-act="stype" data-type="xfer" aria-pressed="'+(ty==='xfer')+'">Transfer</button></div>';
    h+='<div class="two-f">'+field('Amount',moneyInput('amount',pl?pl.amount:''))+field('Date','<input id="f-date" name="date" type="date" value="'+todayStr()+'">')+'</div>';
    if(ty==='xfer'){
      var accs=state.accounts,second=accs.length>1?(accs[0].id===defAcct()?accs[1].id:accs[0].id):defAcct();
      h+='<div class="two-f">'+field('From','<select id="f-acct" name="acct">'+acctOptions(defAcct())+'</select>')+field('To','<select id="f-to" name="to">'+acctOptions(second)+'</select>')+'</div>';
      if(accs.length<2)h+='<p class="sub help">Add a second account on Money › Accounts to move money between them.</p>';
    }else{
      if(ty==='out')h+='<div class="two-f">'+field('Category','<select id="f-cat" name="cat">'+catOptions(pl?pl.catId:'')+'</select>')+field('Project','<select id="f-proj" name="proj">'+projOptions(pl?pl.projId:'')+'</select>')+'</div>';
      h+=field(ty==='in'?'Into account':'Paid from','<select id="f-acct" name="acct">'+acctOptions(defAcct())+'</select>');
      if(ty==='in')h+=field('Project (optional)','<select id="f-proj" name="proj">'+projOptions('')+'</select>');
    }
    h+=field('Note (optional)','<input id="f-note" name="note" autocomplete="off" value="'+esc(pl?pl.name:'')+'" placeholder="'+(ty==='in'?'Paycheck':ty==='xfer'?'To savings':'Groceries')+'">');
  }else if(k==='planned'){
    var pp=editing?byId(state.planned,sheet.id):{};
    h+=field('What is it','<input id="f-name" name="name" autocomplete="off" required value="'+esc(pp.name||'')+'" placeholder="Winter boots">');
    h+='<div class="two-f">'+field('Expected cost',moneyInput('amount',pp.amount))+dateField('When (optional)','date',pp.date)+'</div>';
    h+='<div class="two-f">'+field('Category','<select id="f-cat" name="cat">'+catOptions(pp.catId)+'</select>')+field('Project','<select id="f-proj" name="proj">'+projOptions(pp.projId)+'</select>')+'</div>';
    h+='<p class="sub help">Planned purchases are not counted as spending. Use Mark spent when you buy it.</p>';
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='bill'){
    var bb=editing?byId(state.bills,sheet.id):null,bc=state.categories.find(function(c){return c.name==='Bills'});
    h+=field('Bill name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(bb?bb.name:'')+'">')+'<div class="two-f">'+field('Planned amount',moneyInput('amount',bb?bb.amount:''))+field('Due day of month','<input id="f-day" name="day" type="number" inputmode="numeric" min="1" max="31" placeholder="1–31" value="'+(bb?bb.day:'')+'">')+'</div>';
    h+='<div class="two-f">'+field('Category','<select id="f-cat" name="cat">'+catOptions(bb?bb.catId:(bc?bc.id:''))+'</select>')+field('Paid from','<select id="f-acct" name="acct">'+acctOptions(bb&&acctOf(bb.acct)?bb.acct:defAcct())+'</select>')+'</div>';
    if(bb){var bs=billStats(bb);h+='<p class="sub help">'+(bs?'Paid '+bs.n+' time'+(bs.n===1?'':'s')+' · average '+money(bs.avg)+' · last '+money(bs.last)+'. Changing the planned amount does not change past payments.':'No payments recorded yet.')+'</p>';extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>'}
    else h+='<label class="chkrow"><input type="checkbox" id="f-paid" name="paid"> Already paid for this month (no expense is logged)</label>';
  }else if(k==='billpay'){
    var bp=byId(state.bills,sheet.id),bst=billStats(bp),bdate=billDate(bp,sheet.ym);
    h+='<p class="sub help">'+esc(bp.name)+' for '+esc(monthName(sheet.ym))+' · planned '+money(bp.amount)+(bst?' · average '+money(bst.avg):'')+'</p>';
    h+='<div class="two-f">'+field('Amount paid',moneyInput('amount',bp.amount))+field('Date paid','<input id="f-date" name="date" type="date" value="'+(sheet.ym<monthKey()?bdate:todayStr())+'">')+'</div>';
    h+=field('Paid from','<select id="f-acct" name="acct">'+acctOptions(acctOf(bp.acct)?bp.acct:defAcct())+'</select>');
    submit='Mark paid';
  }else if(k==='event'){
    h+=field('Title','<input id="f-title" name="title" autocomplete="off" required>');
    h+='<div class="two-f">'+field('Starts on','<input id="f-date" name="date" type="date" value="'+sheet.date+'">')+'<div id="g-enddate" hidden>'+field('Ends on','<input id="f-enddate" name="enddate" type="date" value="'+addDays(sheet.date,1)+'">')+'</div></div>';
    h+='<label class="chkrow"><input type="checkbox" id="f-multi" name="multi"> Lasts more than one day</label>';
    h+='<label class="chkrow"><input type="checkbox" id="f-allday" name="allday"> All day</label><div class="two-f" id="tfields">'+field('Start time','<input id="f-time" name="time" type="time" value="09:00">')+field('End time','<input id="f-end" name="end" type="time" value="10:00">')+'</div>';
  }else if(k==='routine'){
    h+=field('Name','<input id="f-title" name="title" autocomplete="off" placeholder="Work, Biology class" required>');
    h+='<div class="field"><span>Repeats every</span><div class="chips" id="wdays">'+DN.map(function(n,i){return '<button type="button" class="chip" data-act="wday" data-d="'+i+'" aria-pressed="'+(sheet.days.indexOf(i)>=0)+'">'+n+'</button>'}).join('')+'</div></div>';
    h+='<div class="two-f">'+field('Starts','<input id="f-time" name="time" type="time" value="09:00">')+field('Ends','<input id="f-end" name="end" type="time" value="10:00">')+'</div>';
    h+='<p class="sub help">Starts from today. You can skip any single day from the Today or Calendar tab.</p>';
  }else if(k==='income'){
    var ic=editing?byId(state.incomes,sheet.id):{freq:'biweekly',splits:[]},fq=ic.freq;
    h+=field('Name','<input id="f-name" name="name" autocomplete="off" placeholder="Paycheck" required value="'+esc(ic.name||'')+'">');
    h+=field('Repeats','<select id="f-freq" name="freq">'+opt('biweekly','Every 2 weeks',fq)+opt('weekly','Every week',fq)+opt('mdays','On days of the month',fq)+'</select>');
    h+='<div id="g-anchor"'+(fq==='biweekly'?'':' hidden')+'>'+field('A recent or upcoming payday','<input id="f-anchor" name="anchor" type="date" value="'+esc(ic.anchor||todayStr())+'">')+'</div>';
    h+='<div id="g-wk"'+(fq==='weekly'?'':' hidden')+'>'+field('Payday','<select id="f-wk" name="wk">'+DN.map(function(n,i){return opt(String(i),n,String(ic.day!=null&&fq==='weekly'?ic.day:new Date().getDay()))}).join('')+'</select>')+'</div>';
    h+='<div id="g-mdays" class="field"'+(fq==='mdays'?'':' hidden')+'><span>Paid on these days each month</span><div class="mgrid">'+Array.from({length:31},function(_,i){var d=i+1;return '<button type="button" class="mday" data-act="mday" data-d="'+d+'" aria-pressed="'+(sheet.mdays.indexOf(d)>=0)+'">'+d+'</button>'}).join('')+'</div><p class="sub">In shorter months, days past the end land on the last day.</p></div>';
    h+='<div class="field"><span>Estimated amount'+(state.accounts.length>1?' into each account':'')+'</span><div class="splits">'+state.accounts.map(function(a){var s=(ic.splits||[]).find(function(x){return x.acct===a.id});return '<label class="split"><span>'+esc(a.name)+'</span><input name="sp_'+esc(a.id)+'" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="'+(s&&s.amount?s.amount:'')+'"></label>'}).join('')+'</div></div>';
    h+='<p class="sub help">This is only an estimate. When a payday arrives you are asked to confirm what you received, and only then is it counted as money.</p>';
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='plan'){
    var st=state.settings,hh=hoursFor(sheet.date),isDay=sheet.scope==='day';
    var vs=sheet.vals||{start:isDay?hh.start:st.dayStart,end:isDay?hh.end:st.dayEnd,every:st.breakEvery,len:st.breakLen,def:st.defaultTask};
    var dlabel=sheet.date===todayStr()?'today':short(sheet.date);
    h+='<div class="chips" role="group" aria-label="Apply hours to"><button type="button" class="chip" data-act="scope" data-scope="day" aria-pressed="'+isDay+'">Just '+esc(dlabel)+'</button><button type="button" class="chip" data-act="scope" data-scope="all" aria-pressed="'+!isDay+'">Every day</button></div>';
    h+='<div class="two-f">'+field('Day starts','<input id="f-start" name="start" type="time" value="'+esc(vs.start)+'">')+field('Day ends','<input id="f-end" name="end" type="time" value="'+esc(vs.end)+'">')+'</div>';
    h+='<div class="two-f">'+field('Break every (min of work)','<input id="f-every" name="every" type="number" inputmode="numeric" min="0" value="'+esc(vs.every)+'">')+field('Break length (min)','<input id="f-len" name="len" type="number" inputmode="numeric" min="0" value="'+esc(vs.len)+'">')+'</div>';
    h+=field('Default task length (min)','<input id="f-def" name="def" type="number" inputmode="numeric" min="5" value="'+esc(vs.def)+'">');
    h+='<p class="sub help">Set a break to 0 for none. Task length is used when a task has no estimate and no timed history. Break settings always apply to every day.</p>';
    if(isDay&&hh.custom)extra='<button type="button" class="btn ghost" data-act="resetDay">Use default hours</button>';
  }else if(k==='est'){
    var ets=byId(state.tasks,sheet.id);
    h+=field('Minutes for '+esc(ets?ets.title:'this task'),'<input id="f-est" name="est" type="number" inputmode="numeric" min="1" value="'+(ets&&ets.est?ets.est:'')+'" placeholder="'+esc(String(Math.round(ets?autoEstTitle(ets.title):state.settings.defaultTask)))+'">');
    h+='<p class="sub help">Leave blank to use your average for this task, or '+esc(fmtMins(state.settings.defaultTask))+' if there is no history.</p>';
  }else if(k==='cat'){
    var c=editing?catOf(sheet.id):{};
    h+=field('Name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(c.name||'')+'" placeholder="Groceries, Chores">');
    h+=field('Monthly budget (optional)',moneyInput('budget',c.budget||'','No budget'));
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='proj'){
    var pj=editing?projOf(sheet.id):{parentId:sheet.parent||null};
    h+=field('Name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(pj.name||'')+'" placeholder="Spring semester">');
    h+=field('Inside project','<select id="f-parent" name="parent">'+opt('','None (top level)',pj.parentId||'')+projSorted().filter(function(r){return !editing||projDesc(sheet.id).indexOf(r.p.id)<0}).map(function(r){return opt(r.p.id,projPath(r.p.id),pj.parentId)}).join('')+'</select>');
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='acct'){
    var ac=editing?acctOf(sheet.id):{};
    h+=field('Name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(ac.name||'')+'" placeholder="Checking, Savings, Cash">');
    h+=field('Current balance',moneyInput('bal',editing?balance(ac):'','0.00',true));
    h+='<label class="chkrow"><input type="checkbox" id="f-isdef" name="isdef"'+(editing&&ac.id===defAcct()?' checked':'')+'> Use as the default account</label>';
    h+='<p class="sub help">Use a negative balance for a credit card you owe on. Changing the balance resets it from now on; entries logged earlier are not counted again.</p>';
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='debt'){
    var db=editing?byId(state.debts,sheet.id):{};
    h+=field('Name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(db.name||'')+'" placeholder="Student loan">');
    h+='<div class="two-f">'+field('Balance owed now',moneyInput('bal',editing?debtBal(db):''))+field('Interest rate (APR %)','<input id="f-apr" name="apr" type="number" inputmode="decimal" step="0.01" min="0" value="'+(db.apr!=null?esc(String(db.apr)):'')+'" placeholder="0">')+'</div>';
    h+='<div class="two-f">'+field('Minimum payment',moneyInput('min',db.minPay||''))+field('Payments count as','<select id="f-cat" name="cat">'+catOptions(db.catId)+'</select>')+'</div>';
    h+='<p class="sub help">Logged payments lower the balance. Update the balance from your statement now and then to include interest.</p>';
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='debtpay'){
    var dp=byId(state.debts,sheet.id);
    h+='<p class="sub help">'+esc(dp.name)+' · '+money(debtBal(dp))+' owed</p>';
    h+='<div class="two-f">'+field('Amount',moneyInput('amount',dp.minPay||''))+field('Date','<input id="f-date" name="date" type="date" value="'+todayStr()+'">')+'</div>';
    h+=field('Paid from','<select id="f-acct" name="acct">'+acctOptions(defAcct())+'</select>');
  }else if(k==='goal'){
    var gl=editing?byId(state.goals,sheet.id):{mode:'contrib'};
    h+=field('Goal','<input id="f-name" name="name" autocomplete="off" required value="'+esc(gl.name||'')+'" placeholder="Emergency fund">');
    h+='<div class="two-f">'+field('Target amount',moneyInput('target',gl.target||''))+dateField('By (optional)','date',gl.date)+'</div>';
    h+=field('Track progress by','<select id="f-gmode" name="mode">'+opt('contrib','Money I add to it',gl.mode)+opt('account','An account’s balance',gl.mode)+'</select>');
    h+='<div id="g-gacct"'+(gl.mode==='account'?'':' hidden')+'>'+field('Account','<select id="f-gacct" name="gacct">'+acctOptions(gl.acct)+'</select>')+'</div>';
    if(editing&&gl.mode!=='account'&&gl.contribs.length){
      h+='<div class="field"><span>Money added</span><ul class="list">'+gl.contribs.slice().sort(function(a,b){return a.date<b.date?1:-1}).map(function(c){return '<li class="row"><div class="grow">'+esc(dateY(c.date))+'</div><div class="amt num">'+money(c.amount)+'</div><button type="button" class="x" data-act="delContrib" data-id="'+c.id+'" aria-label="Remove '+money(c.amount)+' from '+esc(dateY(c.date))+'">×</button></li>'}).join('')+'</ul></div>';
    }
    h+='<p class="sub help">Money you add to a goal is a record of what you set aside. It does not move money between accounts.</p>';
    if(editing)extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='goaladd'){
    var ga=byId(state.goals,sheet.id);
    h+='<p class="sub help">'+esc(ga.name)+' · '+money(goalHave(ga))+' of '+money(ga.target)+'</p>';
    h+='<div class="two-f">'+field('Amount','<input id="f-amount" name="amount" type="number" inputmode="decimal" step="0.01" placeholder="0.00">')+field('Date','<input id="f-date" name="date" type="date" value="'+todayStr()+'">')+'</div>';
    h+='<p class="sub help">Use a negative amount if you took money back out.</p>';
  }else if(k==='time'){
    var tr=byId(state.times,sheet.id),secs=Math.round(tr.ms/1000);
    h+=field('To do name','<input id="f-name" name="name" autocomplete="off" required value="'+esc(tr.name)+'">');
    h+=field('Date','<input id="f-date" name="date" type="date" value="'+esc(tr.date)+'">');
    h+='<div class="three-f">'+field('Hours','<input id="f-h" name="hh" type="number" inputmode="numeric" min="0" value="'+Math.floor(secs/3600)+'">')+field('Minutes','<input id="f-m" name="mm" type="number" inputmode="numeric" min="0" max="59" value="'+Math.floor(secs%3600/60)+'">')+field('Seconds','<input id="f-s" name="ss" type="number" inputmode="numeric" min="0" max="59" value="'+secs%60+'">')+'</div>';
    h+='<p class="sub help">Renaming moves this entry to the table for the new name.</p>';
    extra='<button type="button" class="btn ghost" data-act="sheetDel">Delete</button>';
  }else if(k==='filter'){
    var f=sheet.f;
    h+='<div class="seg" role="group" aria-label="Filter mode"><button type="button" data-act="fmode" data-m="show" aria-pressed="'+(f.mode==='show')+'">Show only these</button><button type="button" data-act="fmode" data-m="hide" aria-pressed="'+(f.mode==='hide')+'">Hide these</button></div>';
    h+='<div class="field"><span>Due date</span>'+chipsGroup('fchip','due',DUEF,f.due)+'</div>';
    h+='<div class="field"><span>Duration</span>'+chipsGroup('fchip','dur',DURF,f.dur)+'</div>';
    h+='<div class="field"><span>Category</span>'+chipsGroup('fchip','cat',[['none','No category']].concat(catsSorted().map(function(c){return [c.id,c.name]})),f.cat)+'</div>';
    h+='<div class="field"><span>Project</span>'+chipsGroup('fchip','proj',[['none','No project']].concat(projSorted().map(function(r){return [r.p.id,projPath(r.p.id)]})),f.proj)+'</div>';
    h+='<p class="sub help">Within a group, any choice matches. Across groups, all must match. Picking a project includes its sub-projects.</p>';
    extra='<button type="button" class="btn ghost" data-act="fclearSheet">Clear</button>';submit='Apply';
  }else if(k==='sbcfg'){
    var cf=sbConfig()||{};
    h+='<p class="sub help">In your Supabase project, open Project Settings › API Keys (or API). Copy the Project URL and the publishable (anon) key. Never use the secret or service_role key here.</p>';
    h+=field('Project URL','<input id="f-sburl" name="sburl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://abcd1234.supabase.co" value="'+esc(cf.url||'')+'">');
    h+=field('Publishable (anon) key','<input id="f-sbkey" name="sbkey" autocomplete="off" autocapitalize="off" spellcheck="false" value="'+esc(cf.key||'')+'">');
    h+='<p class="sub help">Run supabase-setup.sql in the project once before signing in. The README walks through it.</p>';
    if(cf.url)extra='<button type="button" class="btn ghost" data-act="sbForget">Remove</button>';
  }else if(k==='signin'){
    var up=sheet.mode==='up';
    if(sheet.note)h+='<p class="sub help okbox">'+esc(sheet.note)+'</p>';
    h+=field('Email','<input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="'+esc(sheet.email||'')+'">');
    h+=field('Password','<input id="f-pw" name="pw" type="password" autocomplete="'+(up?'new-password':'current-password')+'">');
    if(up)h+=field('Password again','<input id="f-pw2" name="pw2" type="password" autocomplete="new-password">');
    h+='<p class="help">'+(up?'<button type="button" class="lnk in" data-act="signIn">I already have an account</button>':'<button type="button" class="lnk in" data-act="signUp">Create an account</button> · <button type="button" class="lnk in" data-act="forgotPw">Forgot password?</button>')+'</p>';
    h+='<p class="sub help">'+(up?'If this device already has data, it is uploaded to your new account.':'If this device and your account both have data, you choose which to keep.')+'</p>';
    submit=up?'Create account':'Sign in';
  }else if(k==='newpass'){
    h+=field('New password','<input id="f-pw" name="pw" type="password" autocomplete="new-password">')+field('New password again','<input id="f-pw2" name="pw2" type="password" autocomplete="new-password">');
    h+='<p class="sub help">After saving, sign in with the new password in the Lifebrained app on your home screen.</p>';
  }else if(k==='bulk'){
    var n=Object.keys(SEL||{}).length;
    h+='<p class="sub help">Changes apply to '+n+' to do'+(n===1?'':'s')+'. Anything left on “Leave as is” stays the same.</p>';
    h+=field('Category','<select id="f-bcat" name="bcat">'+opt('keep','Leave as is','keep')+opt('','No category','keep')+catsSorted().map(function(c){return opt(c.id,c.name,'keep')}).join('')+'</select>');
    h+=field('Project','<select id="f-bproj" name="bproj">'+opt('keep','Leave as is','keep')+opt('','No project','keep')+projSorted().map(function(r){return opt(r.p.id,projPath(r.p.id),'keep')}).join('')+'</select>');
    h+='<div class="two-f">'+field('Due date','<select id="f-bdue" name="bdue">'+opt('keep','Leave as is','keep')+opt('none','No due date','keep')+opt('set','Set a date','keep')+'</select>')+'<div id="g-bdate" hidden>'+field('Date','<input id="f-bdate" name="bdate" type="date" value="'+todayStr()+'">')+'</div></div>';
    submit='Apply';
  }
  h+='<p class="err" id="f-err" role="alert"></p><div class="btns"><button type="button" class="btn ghost" data-act="closeSheet">Cancel</button>'+extra+'<button class="btn" type="submit">'+submit+'</button></div></form></div>';
  $('#sheet').innerHTML=h;
}
function num(v){var n=parseFloat(v);return isFinite(n)?n:NaN}
function submitSheet(f){
  function v(n){return f.elements[n]?f.elements[n].value.trim():''}
  function err(m){$('#f-err').textContent=m}
  var k=sheet.kind,editing=!!sheet.id,toast='',undoable=false;
  if(k==='task'){
    var title=v('title'),due=v('due');
    if(!title)return err('Add a title for the to do.');
    var rep=null,ru=v('rep');
    if(ru){
      var rn=parseInt(v('repn'),10)||1;
      if(rn<1||rn>99)return err('Repeat every 1 to 99.');
      if(!due)return err('Pick a due date for the first one so the repeats know where to start.');
      rep={unit:ru,n:rn};
      if(ru==='wdays'){if(!sheet.days.length)return err('Pick at least one weekday.');rep.days=sheet.days.slice().sort();rep.n=1}
      if(ru==='month')rep.dom=parse(due).getDate();
    }
    var est=parseInt(v('est'),10),t=editing?byId(state.tasks,sheet.id):null,par=f.elements.parent?v('parent')||null:(t?t.parentId||null:null);
    if(editing&&t){
      t.title=title;t.due=due;t.catId=v('cat')||null;t.projId=v('proj')||null;
      if(par)t.parentId=par;else delete t.parentId;
      if(est>0)t.est=est;else delete t.est;
      if(rep)t.repeat=rep;else delete t.repeat;
      if(t.done){
        if(f.elements.done&&!f.elements.done.checked)reopenTask(t);
        else if(v('doneat'))t.doneAt=v('doneat');
      }
    }else{
      var nt={id:uid(),title:title,due:due,catId:v('cat')||null,projId:v('proj')||null,order:state.tasks.reduce(function(m,x){return Math.max(m,x.order||0)},0)+1};
      if(par)nt.parentId=par;
      if(est>0)nt.est=est;if(rep)nt.repeat=rep;
      state.tasks.push(nt);
      if(par){var pp2=byId(state.tasks,par);if(pp2&&pp2.done)reopenTask(pp2);ui.open['st:'+par]=true;saveUI()}
    }
  }else if(k==='spend'){
    var a=num(v('amount')),ty=sheet.type;
    if(!(a>0))return err('Enter an amount above zero.');
    if(ty==='xfer'){
      if(v('acct')===v('to'))return err('Pick two different accounts.');
      addTx({type:'xfer',date:v('date')||todayStr(),amount:a,acct:v('acct'),toAcct:v('to'),note:v('note')});
    }else{
      addTx({type:ty,date:v('date')||todayStr(),amount:a,acct:v('acct')||defAcct(),catId:ty==='out'?v('cat')||null:null,projId:v('proj')||null,note:v('note')});
      if(sheet.plannedId){state.planned=state.planned.filter(function(p){return p.id!==sheet.plannedId});toast='Recorded as spent'}
    }
    tab='money';if(ui.msub==='plans'&&!sheet.plannedId)ui.msub='overview';
  }else if(k==='planned'){
    var pa=num(v('amount'));
    if(!v('name'))return err('Name the purchase.');
    if(!(pa>0))return err('Enter the expected cost.');
    var po={name:v('name'),amount:r2(pa),date:v('date'),catId:v('cat')||null,projId:v('proj')||null};
    if(editing)Object.assign(byId(state.planned,sheet.id),po);else state.planned.push(Object.assign({id:uid()},po));
    if(!editing){tab='money';ui.msub='plans'}
  }else if(k==='bill'){
    var ba=num(v('amount')),day=parseInt(v('day'),10);
    if(!v('name'))return err('Give the bill a name.');
    if(!(ba>0))return err('Enter the planned amount.');
    if(!(day>=1&&day<=31))return err('Due day must be between 1 and 31.');
    if(editing){var be=byId(state.bills,sheet.id);be.name=v('name');be.amount=r2(ba);be.day=day;be.catId=v('cat')||null;be.acct=v('acct')||defAcct()}
    else{
      var bpd={};
      if(f.elements.paid&&f.elements.paid.checked)bpd[monthKey()]='manual';
      state.bills.push({id:uid(),name:v('name'),amount:r2(ba),day:day,from:monthKey(),paid:bpd,catId:v('cat')||null,acct:v('acct')||defAcct()});
    }
  }else if(k==='billpay'){
    var bpb=byId(state.bills,sheet.id),bam=num(v('amount'));
    if(!(bam>0))return err('Enter the amount you paid.');
    if(bpb&&!bpb.paid[sheet.ym]){payBill(bpb,sheet.ym,bam,v('acct'),v('date'));toast=bpb.name+' marked paid: '+money(bam)}
  }else if(k==='event'){
    if(!v('title'))return err('Add a title for the event.');
    if(!v('date'))return err('Pick a start date.');
    var allDay=f.elements.allday.checked,multi=f.elements.multi.checked,ed=multi?v('enddate'):'';
    if(multi){
      if(!ed)return err('Pick the day it ends.');
      if(ed<v('date'))return err('The end date must be on or after the start date.');
      if(ed===v('date'))ed='';
    }
    if(!allDay){
      if(!v('time')||!v('end'))return err('Set a start and end time, or choose all day.');
      if(!ed&&toMin(v('end'))<=toMin(v('time')))return err('The end time must be after the start time.');
    }
    var ev={id:uid(),title:v('title'),date:v('date'),allDay:allDay,time:allDay?'':v('time'),end:allDay?'':v('end')};
    if(ed)ev.endDate=ed;
    state.events.push(ev);
    if(tab==='calendar'){var p=v('date').split('-').map(Number);calY=p[0];calM=p[1]-1;calSel=v('date')}
  }else if(k==='routine'){
    if(!v('title'))return err('Give it a name.');
    if(!sheet.days.length)return err('Pick at least one day.');
    if(!v('time')||!v('end'))return err('Set a start and end time.');
    if(toMin(v('end'))<=toMin(v('time')))return err('The end time must be after the start time.');
    state.routines.push({id:uid(),title:v('title'),days:sheet.days.slice().sort(),start:v('time'),end:v('end'),from:todayStr(),skips:{}});
  }else if(k==='income'){
    var fq=v('freq'),splits=[];
    state.accounts.forEach(function(ac2){var amt=num(v('sp_'+ac2.id));if(amt>0)splits.push({acct:ac2.id,amount:r2(amt)})});
    if(!v('name'))return err('Give this income a name.');
    if(!splits.length)return err('Enter the estimated amount for at least one account.');
    var ni=editing?byId(state.incomes,sheet.id):{id:uid(),from:todayStr(),received:{}};
    ni.name=v('name');ni.freq=fq;ni.splits=splits;
    delete ni.anchor;delete ni.mdays;delete ni.day;delete ni.day2;delete ni.amount;delete ni.acct;
    if(fq==='biweekly'){if(!v('anchor'))return err('Pick a recent or upcoming payday.');ni.anchor=v('anchor')}
    else if(fq==='weekly'){ni.day=parseInt(v('wk'),10)}
    else{if(!sheet.mdays.length)return err('Pick at least one day of the month.');ni.mdays=sheet.mdays.slice().sort(function(a2,b2){return a2-b2})}
    if(!editing)state.incomes.push(ni);
    tab='money';ui.msub='plans';
  }else if(k==='plan'){
    var ps=v('start'),pe=v('end'),pev=parseInt(v('every'),10),pbl=parseInt(v('len'),10),pdf=parseInt(v('def'),10);
    if(!ps||!pe)return err('Set when the day starts and ends.');
    if(toMin(pe)<=toMin(ps))return err('The day must end after it starts.');
    if(!(pev>=0))pev=0;
    if(!(pbl>=0))pbl=0;
    if(pev>0&&pev<5)return err('Breaks can come every 5 minutes or more, or set 0 for none.');
    if(!(pdf>=5))return err('Default task length must be at least 5 minutes.');
    var ss=state.settings;
    ss.breakEvery=pev;ss.breakLen=pbl;ss.defaultTask=pdf;
    if(sheet.scope==='all'){ss.dayStart=ps;ss.dayEnd=pe}
    else if(ps===ss.dayStart&&pe===ss.dayEnd){delete state.dayHours[sheet.date]}
    else{state.dayHours[sheet.date]={start:ps,end:pe}}
  }else if(k==='est'){
    var tt=byId(state.tasks,sheet.id);
    if(tt){
      var en=parseInt(v('est'),10);
      if(v('est')==='')delete tt.est;
      else if(en>=1)tt.est=en;
      else return err('Enter minutes, or leave it blank for the automatic estimate.');
    }
  }else if(k==='cat'){
    var cn=v('name'),cb=v('budget')===''?0:num(v('budget'));
    if(!cn)return err('Name the category.');
    if(state.categories.some(function(c){return c.id!==sheet.id&&c.name.toLowerCase()===cn.toLowerCase()}))return err('You already have a category with that name.');
    if(!(cb>=0))return err('Enter a budget of 0 or more, or leave it blank.');
    if(editing){var ce=catOf(sheet.id);ce.name=cn;ce.budget=r2(cb)}else state.categories.push({id:'c-'+uid(),name:cn,budget:r2(cb)});
  }else if(k==='proj'){
    var pn=v('name');
    if(!pn)return err('Name the project.');
    var parp=v('parent')||null;
    if(editing){var pe2=projOf(sheet.id);pe2.name=pn;pe2.parentId=parp}else state.projects.push({id:'p-'+uid(),name:pn,parentId:parp});
  }else if(k==='acct'){
    var an=v('name'),ab=v('bal')===''?0:num(v('bal'));
    if(!an)return err('Name the account.');
    if(!isFinite(ab))return err('Enter the balance as a number.');
    if(editing){
      var ae=acctOf(sheet.id);ae.name=an;
      if(Math.abs(ab-balance(ae))>=0.005){ae.start=r2(ab);ae.startAt=Date.now()}
      if(f.elements.isdef.checked)state.settings.defaultAcct=ae.id;
      else if(state.settings.defaultAcct===ae.id&&state.accounts.length>1)state.settings.defaultAcct=state.accounts.find(function(x){return x.id!==ae.id}).id;
    }else{
      var na={id:'a-'+uid(),name:an,start:r2(ab),startAt:Date.now()};
      state.accounts.push(na);
      if(f.elements.isdef.checked)state.settings.defaultAcct=na.id;
    }
  }else if(k==='debt'){
    var dn=v('name'),dbal=num(v('bal')),apr=v('apr')===''?0:num(v('apr')),mn=v('min')===''?0:num(v('min'));
    if(!dn)return err('Name the debt.');
    if(!(dbal>=0))return err('Enter the balance you owe now.');
    if(!(apr>=0)||apr>100)return err('Enter an interest rate between 0 and 100.');
    if(!(mn>=0))return err('Enter a minimum payment of 0 or more.');
    if(editing){
      var de=byId(state.debts,sheet.id);
      de.name=dn;de.apr=r2(apr);de.minPay=r2(mn);de.catId=v('cat')||null;
      if(Math.abs(dbal-debtBal(de))>=0.005){de.base=r2(dbal);de.baseAt=Date.now()}
    }else state.debts.push({id:uid(),name:dn,base:r2(dbal),baseAt:Date.now(),apr:r2(apr),minPay:r2(mn),catId:v('cat')||null});
  }else if(k==='debtpay'){
    var dpp=byId(state.debts,sheet.id),pam=num(v('amount'));
    if(!(pam>0))return err('Enter the payment amount.');
    addTx({type:'out',date:v('date')||todayStr(),amount:pam,acct:v('acct')||defAcct(),catId:dpp.catId||null,debtId:dpp.id,note:dpp.name+' payment'});
    toast='Payment logged. '+dpp.name+' is now '+money(debtBal(dpp));
  }else if(k==='goal'){
    var gn=v('name'),gt=num(v('target')),gm=v('mode');
    if(!gn)return err('Name the goal.');
    if(!(gt>0))return err('Enter a target above zero.');
    if(gm==='account'&&!acctOf(v('gacct')))return err('Pick the account to follow.');
    var go={name:gn,target:r2(gt),date:v('date'),mode:gm,acct:gm==='account'?v('gacct'):null};
    if(editing)Object.assign(byId(state.goals,sheet.id),go);else state.goals.push(Object.assign({id:uid(),contribs:[]},go));
  }else if(k==='goaladd'){
    var gam=num(v('amount'));
    if(!isFinite(gam)||gam===0)return err('Enter an amount.');
    byId(state.goals,sheet.id).contribs.push({id:uid(),date:v('date')||todayStr(),amount:r2(gam)});
  }else if(k==='time'){
    var tn=v('name'),secs2=(parseInt(v('hh'),10)||0)*3600+(parseInt(v('mm'),10)||0)*60+(parseInt(v('ss'),10)||0);
    if(!tn)return err('Enter the to do name.');
    if(!(secs2>0))return err('Enter a time longer than zero.');
    var te=byId(state.times,sheet.id);
    te.name=tn;te.key=nkey(tn);te.date=v('date')||te.date;te.ms=secs2*1000;
  }else if(k==='sbcfg'){
    var su=v('sburl').replace(/\/+$/,''),sk=v('sbkey');
    if(!/^https:\/\/[^\s/]+/.test(su))return err('Enter the Project URL, starting with https://');
    if(sk.length<20)return err('Paste the whole publishable (anon) key.');
    if(/^sb_secret_/.test(sk))return err('That is a secret key. Use the publishable (anon) key instead.');
    try{var jp=sk.split('.');if(jp.length===3&&/service_role/.test(atob(jp[1].replace(/-/g,'+').replace(/_/g,'/'))))return err('That is the service_role key. Use the anon key instead.')}catch(x){}
    try{localStorage.setItem(LSSB,JSON.stringify({url:su,key:sk}))}catch(x){return err('This device could not save the settings.')}
    initSync();closeSheet();showToast('Accounts set up. Sign in or create an account next.',false);return;
  }else if(k==='signin'){
    var em=v('email'),pw=f.elements.pw.value,up=sheet.mode==='up';
    if(!SY.client)return err('Set up accounts first.');
    if(!/^\S+@\S+\.\S+$/.test(em))return err('Enter your email address.');
    if(pw.length<6)return err('Use a password of at least 6 characters.');
    if(up&&pw!==f.elements.pw2.value)return err('The two passwords do not match.');
    var sbtn=f.querySelector('button[type=submit]');sbtn.disabled=true;err('');
    (up?SY.client.auth.signUp({email:em,password:pw,options:{emailRedirectTo:appUrl()}}):SY.client.auth.signInWithPassword({email:em,password:pw})).then(function(r){
      sbtn.disabled=false;
      if(r.error){err(authMsg(r.error));return}
      if(up&&!(r.data&&r.data.session)){sheet.mode='in';sheet.email=em;sheet.note='Account created. Check your email and tap the confirmation link, then sign in here.';renderSheet();return}
      closeAllSheets();showToast(up?'Account created. You are signed in.':'Signed in',false);
    },function(e){sbtn.disabled=false;err(authMsg(e))});
    return;
  }else if(k==='newpass'){
    var np=f.elements.pw.value;
    if(np.length<6)return err('Use a password of at least 6 characters.');
    if(np!==f.elements.pw2.value)return err('The two passwords do not match.');
    if(!SY.client)return err('Accounts are not set up on this device.');
    SY.client.auth.updateUser({password:np}).then(function(r){if(r.error){err(authMsg(r.error));return}closeAllSheets();showToast('Password changed',false)},function(e){err(authMsg(e))});
    return;
  }else if(k==='filter'){
    ui.flt=JSON.parse(JSON.stringify(sheet.f));saveUI();closeSheet();render();return;
  }else if(k==='bulk'){
    var ids=Object.keys(SEL||{}),bcat=v('bcat'),bproj=v('bproj'),bdue=v('bdue');
    if(bdue==='set'&&!v('bdate'))return err('Pick the new due date.');
    snapUndo();var kept=0;
    ids.forEach(function(id){var t2=byId(state.tasks,id);if(!t2)return;
      if(bcat!=='keep')t2.catId=bcat||null;
      if(bproj!=='keep')t2.projId=bproj||null;
      if(bdue==='none'){if(t2.repeat){kept++;return}t2.due=''}else if(bdue==='set')t2.due=v('bdate');
    });
    toast='Updated '+ids.length+' to do'+(ids.length===1?'':'s')+(kept?'. '+kept+' repeating one'+(kept===1?' keeps its':'s keep their')+' due date':'');undoable=true;SEL=null;
  }
  closeSheet();commit();
  if(toast)showToast(toast,undoable);
}
function deleteFromSheet(){
  var k=sheet.kind,id=sheet.id,msg='Deleted';
  if(k==='task'){
    var kids=state.tasks.filter(function(x){return x.parentId===id});
    snapUndo();state.tasks=state.tasks.filter(function(x){return x.id!==id&&x.parentId!==id});
    msg='To do deleted'+(kids.length?' with its '+kids.length+' subtask'+(kids.length===1?'':'s'):'');
  }
  else if(k==='planned'){snapUndo();state.planned=state.planned.filter(function(x){return x.id!==id});msg='Planned purchase deleted'}
  else if(k==='time'){snapUndo();state.times=state.times.filter(function(x){return x.id!==id});msg='Time entry deleted'}
  else if(k==='bill'){snapUndo();state.bills=state.bills.filter(function(x){return x.id!==id});msg='Bill deleted. Its past payments stay in your activity'}
  else if(k==='income'){snapUndo();state.incomes=state.incomes.filter(function(x){return x.id!==id});msg='Expected income deleted'}
  else if(k==='cat'){
    snapUndo();
    state.categories=state.categories.filter(function(x){return x.id!==id});
    [state.tasks,state.txns,state.planned,state.bills,state.debts].forEach(function(arr){arr.forEach(function(o){if(o.catId===id)o.catId=null})});
    msg='Category deleted. Its items are now uncategorized';
  }else if(k==='proj'){
    var pr=projOf(id),up=pr?pr.parentId||null:null;snapUndo();
    state.projects.forEach(function(p){if(p.parentId===id)p.parentId=up});
    state.projects=state.projects.filter(function(x){return x.id!==id});
    [state.tasks,state.txns,state.planned].forEach(function(arr){arr.forEach(function(o){if(o.projId===id)o.projId=up})});
    msg='Project deleted. Its items moved up a level';
  }else if(k==='acct'){
    if(state.accounts.length<2){$('#f-err').textContent='You need at least one account. Rename this one instead.';return}
    if(state.txns.some(function(t){return t.acct===id||t.toAcct===id})){$('#f-err').textContent='This account has entries. Rename it, or delete its entries first.';return}
    snapUndo();
    state.accounts=state.accounts.filter(function(x){return x.id!==id});
    if(state.settings.defaultAcct===id)state.settings.defaultAcct=state.accounts[0].id;
    state.goals.forEach(function(g){if(g.acct===id){g.acct=null;g.mode='contrib'}});
    state.bills.forEach(function(o){if(o.acct===id)o.acct=null});
    state.incomes.forEach(function(o){o.splits=(o.splits||[]).filter(function(s){return s.acct!==id})});
    msg='Account deleted';
  }else if(k==='debt'){snapUndo();state.debts=state.debts.filter(function(x){return x.id!==id});msg='Debt deleted. Its logged payments stay in your activity'}
  else if(k==='goal'){snapUndo();state.goals=state.goals.filter(function(x){return x.id!==id});msg='Goal deleted'}
  closeSheet();commit();showToast(msg,true);
}

/* ---------- toast / undo ---------- */
function snapUndo(){undoJSON=JSON.stringify(state)}
function showToast(msg,undo){
  var el=$('#toast');el.innerHTML='<span>'+esc(msg)+'</span>'+(undo===false?'':'<button data-act="undo">Undo</button>');el.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.hidden=true},5000);
}
function shownTaskIds(){return [].slice.call(document.querySelectorAll('#view li[data-id]')).map(function(li){return li.dataset.id}).filter(function(id){var t=byId(state.tasks,id);return t&&!t.done})}

/* ---------- events ---------- */
document.addEventListener('click',function(e){
  if(drag)return;
  var b=e.target.closest('[data-act]');
  if(!b||b.dataset.act!=='tlsel')document.querySelectorAll('.tbk.sel').forEach(function(x){x.classList.remove('sel')});
  if(!b)return;
  if(b.closest('summary'))e.preventDefault();
  var a=b.dataset.act,id=b.dataset.id,d=b.dataset;
  if(a==='tab'){tab=d.tab;SEL=null;try{localStorage.setItem(LSTAB,tab)}catch(x){}render();window.scrollTo(0,0);return}
  if(a==='add'){openSheet(tab==='money'?'spend':tab==='calendar'?'event':'task',{date:tab==='calendar'?calSel:todayStr()});return}
  if(a==='addKind'){openSheet(d.kind,{type:d.type||'out',mdays:[]});return}
  if(a==='closeSheet'){closeSheet();return}
  if(a==='closeAll'){closeAllSheets();return}
  if(a==='kind'){sheet.kind=d.kind;sheet.type='out';sheet.mdays=sheet.mdays||[];renderSheet();return}
  if(a==='stype'){sheet.type=d.type;renderSheet();return}
  if(a==='organize'){openSheet('organize');return}
  if(a==='editCat'){openSheet('cat',{id:id,back:d.back||null});return}
  if(a==='newCat'){openSheet('cat',{back:'organize'});return}
  if(a==='editProj'){openSheet('proj',{id:id,back:d.back||null});return}
  if(a==='newProj'){openSheet('proj',{parent:d.parent||null,back:'organize'});return}
  if(a==='editAcct'){openSheet('acct',{id:id});return}
  if(a==='editDebt'){openSheet('debt',{id:id});return}
  if(a==='payDebt'){openSheet('debtpay',{id:id});return}
  if(a==='editGoal'){openSheet('goal',{id:id});return}
  if(a==='goalAdd'){openSheet('goaladd',{id:id});return}
  if(a==='editPlanned'){openSheet('planned',{id:id});return}
  if(a==='spendPlanned'){openSheet('spend',{type:'out',plannedId:id});return}
  if(a==='editBill'){openSheet('bill',{id:id});return}
  if(a==='editInc'){var inc0=byId(state.incomes,id);if(inc0)openSheet('income',{id:id,mdays:(inc0.mdays||[]).slice()});return}
  if(a==='editTime'){openSheet('time',{id:id});return}
  if(a==='editTask'){
    if(SEL){var st0=byId(state.tasks,id);if(st0&&!st0.done){if(SEL[id])delete SEL[id];else SEL[id]=1;render()}return}
    var et=byId(state.tasks,id);if(et)openSheet('task',{id:id,days:(et.repeat&&et.repeat.days||[]).slice()});return;
  }
  if(a==='addSub'){var par=byId(state.tasks,id);openSheet('task',{pre:{parentId:id,catId:par?par.catId:null,projId:par?par.projId:null}});return}
  if(a==='stToggle'){ui.open['st:'+id]=ui.open['st:'+id]===false;saveUI();render();return}
  if(a==='again'){
    var key=d.key,s=TS[key],prev=lastTaskNamed(s?s.name:'')||{};
    openSheet('task',{pre:{title:s?s.name:prev.title||'',catId:prev.catId||null,projId:prev.projId||null,est:prev.est,due:todayStr()}});return;
  }
  if(a==='clearDate'){var inp=document.getElementById(d.for);if(inp){inp.value='';inp.dispatchEvent(new Event('change',{bubbles:true}))}return}
  if(a==='sheetDel'){deleteFromSheet();return}
  if(a==='exportData'){exportData();return}
  if(a==='sbSetup'){openSheet('sbcfg',{back:'organize'});return}
  if(a==='sbForget'){try{localStorage.removeItem(LSSB)}catch(x){}if(SY.client&&SY.user)SY.client.auth.signOut({scope:'local'});initSync();closeSheet();return}
  if(a==='signIn'||a==='signUp'){var em0=$('#f-email');var keep={mode:a==='signUp'?'up':'in',email:em0?em0.value:'',back:'organize'};if(sheet&&sheet.kind==='signin'){sheet.mode=keep.mode;sheet.email=keep.email;sheet.note='';renderSheet()}else openSheet('signin',keep);return}
  if(a==='forgotPw'){
    var fe=$('#f-email'),fem=fe?fe.value.trim():'';
    if(!/^\S+@\S+\.\S+$/.test(fem)){$('#f-err').textContent='Enter your email address first.';return}
    SY.client.auth.resetPasswordForEmail(fem,{redirectTo:appUrl()}).then(function(r){if(r.error){$('#f-err').textContent=authMsg(r.error);return}sheet.email=fem;sheet.note='Check your email for a reset link. It opens in Safari, where you can set a new password. Then sign in here.';renderSheet()},function(e){$('#f-err').textContent=authMsg(e)});
    return;
  }
  if(a==='signOut'){doSignOut();return}
  if(a==='syncNow'){if(SY.meta.dirty)push();else pull();return}
  if(a==='cloudList'){openSheet('cloudbk',{back:'organize'});loadCloudList();return}
  if(a==='cloudRestore'){
    b.disabled=true;
    SY.client.from('lifebrained_backups').select('data,created_at').eq('id',id).eq('user_id',SY.user.id).single().then(function(r){
      b.disabled=false;
      if(r.error||!r.data){showToast('That backup could not be loaded.',false);return}
      openSheet('restore',{pending:{data:r.data.data,exportedAt:r.data.created_at,version:'your account'},back:'organize'});
    },function(){b.disabled=false;showToast('That backup could not be loaded.',false)});
    return;
  }
  if(a==='syncKeepLocal'){resolveConflict(true);return}
  if(a==='syncUseRemote'){resolveConflict(false);return}
  if(a==='importData'){var fi=$('#f-import');if(fi){fi.value='';fi.click()}return}
  if(a==='restoreYes'){restoreBackup();return}
  if(a==='delContrib'){var g=byId(state.goals,sheet&&sheet.id);if(g){g.contribs=g.contribs.filter(function(c){return c.id!==id});persist();render();renderSheet()}return}
  if(a==='msub'){ui.msub=d.s;saveUI();render();return}
  if(a==='tlsel'){var was=b.classList.contains('sel');document.querySelectorAll('.tbk.sel').forEach(function(x){x.classList.remove('sel')});if(!was)b.classList.add('sel');return}
  if(a==='filter'){openSheet('filter',{f:JSON.parse(JSON.stringify(ui.flt))});return}
  if(a==='fchip'){var arr=sheet.f[d.g],ix=arr.indexOf(d.v);if(ix>=0)arr.splice(ix,1);else arr.push(d.v);b.setAttribute('aria-pressed',String(ix<0));return}
  if(a==='fmode'){sheet.f.mode=d.m;renderSheet();return}
  if(a==='fclearSheet'){sheet.f=emptyFlt();renderSheet();return}
  if(a==='fclear'){ui.flt=emptyFlt();saveUI();render();return}
  if(a==='selMode'){SEL=SEL?null:{};render();return}
  if(a==='selTask'){if(SEL){if(SEL[id])delete SEL[id];else SEL[id]=1;render()}return}
  if(a==='selAll'){if(SEL){shownTaskIds().forEach(function(x){SEL[x]=1});render()}return}
  if(a==='bulkEdit'){if(SEL&&Object.keys(SEL).length)openSheet('bulk');return}
  if(a==='bulkDone'){
    if(!SEL)return;var ids=Object.keys(SEL);if(!ids.length)return;snapUndo();
    ids.forEach(function(x){var t0=byId(state.tasks,x);if(t0&&!t0.done)completeTask(t0)});
    SEL=null;commit();showToast('Marked '+ids.length+' done');return;
  }
  if(a==='bulkDel'){
    if(!SEL)return;var dids=Object.keys(SEL);if(!dids.length)return;snapUndo();
    var gone={};dids.forEach(function(x){gone[x]=1});
    state.tasks=state.tasks.filter(function(x){return !gone[x.id]&&!gone[x.parentId]});
    SEL=null;commit();showToast('Deleted '+dids.length+' to do'+(dids.length===1?'':'s'));return;
  }
  if(a==='mday'){var md=parseInt(d.d,10),mx=sheet.mdays.indexOf(md);if(mx>=0)sheet.mdays.splice(mx,1);else sheet.mdays.push(md);b.setAttribute('aria-pressed',String(mx<0));return}
  if(a==='askYes'){payAsk();return}
  if(a==='incYes'){
    var io=askQ[0];if(!io)return;
    var amts=[].slice.call(document.querySelectorAll('#modal .m-sp')).map(function(x){return {acct:x.dataset.acct,amount:r2(parseFloat(x.value)||0)}});
    if(!amts.some(function(x){return x.amount>0})){$('#m-err').textContent='Enter the amount you received, or choose Skip this one.';return}
    askQ.shift();receiveIncome(io,amts);commit();showAsk();return;
  }
  if(a==='incSkip'){
    var is=askQ.shift();
    if(is){var sinc=byId(state.incomes,is.inc.id);if(sinc&&!sinc.received[is.date])sinc.received[is.date]='skipped'}
    commit();showAsk();return;
  }
  if(a==='incConfirm'){
    var ci=byId(state.incomes,id);
    if(ci&&!ci.received[d.date]){askQ=[{type:'income',inc:ci,date:d.date}];askTotal=1;showAsk()}
    return;
  }
  if(a==='askNo'){skipAsk();return}
  if(a==='plan'){openSheet('plan',{date:d.date||todayStr()});return}
  if(a==='setEst'){openSheet('est',{id:id});return}
  if(a==='scope'){
    stashPlan();sheet.scope=d.scope;
    var src=d.scope==='day'?hoursFor(sheet.date):{start:state.settings.dayStart,end:state.settings.dayEnd};
    sheet.vals.start=src.start;sheet.vals.end=src.end;renderSheet();return;
  }
  if(a==='resetDay'){delete state.dayHours[sheet.date];closeSheet();commit();return}
  if(a==='wday'){var wi=parseInt(d.d,10),wx=sheet.days.indexOf(wi);if(wx>=0)sheet.days.splice(wx,1);else sheet.days.push(wi);b.setAttribute('aria-pressed',String(wx<0));return}
  if(a==='skip'){var rt=byId(state.routines,id);if(rt){if(rt.skips[d.date])delete rt.skips[d.date];else rt.skips[d.date]=true;commit()}return}
  if(a==='delRoutine'){snapUndo();state.routines=state.routines.filter(function(x){return x.id!==id});commit();showToast('Regular event deleted');return}
  if(a==='tfilter'){ui.tf=d.f;SEL=null;saveUI();render();return}
  if(a==='calprev'){calM--;if(calM<0){calM=11;calY--}render();return}
  if(a==='calnext'){calM++;if(calM>11){calM=0;calY++}render();return}
  if(a==='calday'){calSel=d.date;render();return}
  if(a==='undo'){if(undoJSON){state=normalize(JSON.parse(undoJSON));undoJSON=null;$('#toast').hidden=true;commit()}return}
  if(a==='clearExamples'){var fresh=empty();fresh.settings=state.settings;fresh.settings.defaultAcct='a-main';fresh.dayHours=state.dayHours;state=fresh;commit();return}
  if(a==='toggleTask'){
    var t=byId(state.tasks,id);if(!t)return;
    if(t.done){reopenTask(t);commit();return}
    scheduleDone(t);return;
  }
  if(a==='tstart'||a==='tpause'||a==='tdone'){
    var tk=byId(state.tasks,id);if(!tk)return;
    var cur=tm(tk),now=Date.now();
    if(a==='tstart'){if(cur.status==='running')return;tk.timer={status:'running',acc:cur.acc||0,startedAt:now};commit();return}
    if(a==='tpause'){if(cur.status!=='running')return;tk.timer={status:'paused',acc:(cur.acc||0)+(now-cur.startedAt),startedAt:null};commit();return}
    if(cur.status==='running'){tk.timer={status:'paused',acc:(cur.acc||0)+(now-cur.startedAt),startedAt:null};persist()}
    scheduleDone(tk);return;
  }
  if(a==='delTime'){snapUndo();state.times=state.times.filter(function(x){return x.id!==id});commit();showToast('Time entry deleted');return}
  if(a==='payBill'){
    var pb=byId(state.bills,id);if(!pb)return;
    if(pb.paid[d.ym]){snapUndo();unpayBill(pb,d.ym);commit();showToast(pb.name+' marked unpaid');return}
    openSheet('billpay',{id:id,ym:d.ym});return;
  }
  if(a==='clearDone'){snapUndo();state.tasks=state.tasks.filter(function(x){return !x.done});commit();showToast('Cleared finished to dos');return}
  if(a==='delEvent'){snapUndo();state.events=state.events.filter(function(x){return x.id!==id});commit();showToast('Event deleted');return}
  if(a==='delTx'){snapUndo();state.txns=state.txns.filter(function(x){return x.id!==id});
    state.bills.forEach(function(bl){for(var k in bl.paid){if(bl.paid[k]===id)delete bl.paid[k]}});
    state.incomes.forEach(function(ic){for(var k in ic.received){var rv=ic.received[k];
      if(rv===id)delete ic.received[k];
      else if(Array.isArray(rv)&&rv.indexOf(id)>=0){rv=rv.filter(function(z){return z!==id});if(rv.length)ic.received[k]=rv;else delete ic.received[k]}}});
    commit();showToast('Entry deleted');return}
});
document.addEventListener('submit',function(e){if(e.target.id==='sheet-form'){e.preventDefault();submitSheet(e.target)}});
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  if(SY.conflict)return;
  if(!$('#modal').hidden){skipAsk();return}
  if(sheet){closeSheet();return}
  if(SEL){SEL=null;render()}
});
document.addEventListener('toggle',function(e){var el=e.target;if(el&&el.tagName==='DETAILS'&&el.dataset.key){ui.open[el.dataset.key]=el.open;saveUI()}},true);
document.addEventListener('change',function(e){
  var tg=e.target,id=tg.id;
  if(id==='f-import'){if(tg.files&&tg.files[0])readBackup(tg.files[0]);return}
  if(tg.dataset&&tg.dataset.change==='sort'){ui.sort=tg.value;saveUI();render();return}
  if(tg.dataset&&tg.dataset.change==='logSort'){ui.logSort=tg.value;saveUI();render();return}
  if(id==='f-winu'||id==='f-winn'||id==='f-wind'){
    var w=state.settings.planWin;
    if(id==='f-winu'){w.unit=tg.value;if(w.unit==='date'&&!w.date)w.date=addMonthsDs(todayStr(),1)}
    if(id==='f-winn'){var nn=parseInt(tg.value,10);w.n=nn>=1?Math.min(nn,99):1}
    if(id==='f-wind'&&tg.value)w.date=tg.value;
    commit();return;
  }
  if(id==='f-copy'&&tg.value){
    var lt=lastTaskNamed(tg.value)||{},f=$('#sheet-form');
    f.elements.title.value=tg.value;
    if(lt.catId&&catOf(lt.catId))f.elements.cat.value=lt.catId;
    if(lt.projId&&projOf(lt.projId))f.elements.proj.value=lt.projId;
    f.elements.est.value=lt.est||'';
    if(!f.elements.due.value)f.elements.due.value=todayStr();
    return;
  }
  if(id==='f-allday'){var tf=$('#tfields');if(tf)tf.hidden=tg.checked}
  if(id==='f-multi'){var ge=$('#g-enddate');if(ge)ge.hidden=!tg.checked}
  if(id==='f-rep'){$('#g-repn').hidden=!tg.value||tg.value==='wdays';$('#g-repd').hidden=tg.value!=='wdays'}
  if(id==='f-gmode'){$('#g-gacct').hidden=tg.value!=='account'}
  if(id==='f-bdue'){$('#g-bdate').hidden=tg.value!=='set'}
  if(id==='f-freq'){
    var fq=tg.value;
    $('#g-anchor').hidden=fq!=='biweekly';
    $('#g-wk').hidden=fq!=='weekly';
    $('#g-mdays').hidden=fq!=='mdays';
  }
});

/* ---------- boot ---------- */
function boot(){
  try{var t=localStorage.getItem(LSTAB);if(t&&{today:1,tasks:1,money:1,calendar:1}[t])tab=t}catch(e){}
  if(ui.tf==='done')ui.tf='logs';
  state=loadLocal()||sample();
  render();updateStatus();
  if(MIGRATED){MIGRATED=false;persist()}
  initSync();
  /* signed-in devices ask about bills and income once the first sync settles (or after 5 seconds) */
  if(SY.client&&SY.meta.userId)setTimeout(function(){if(!asked)maybeAsk()},5000);
  else setTimeout(maybeAsk,300);
}
boot();
setInterval(tick,1000);
})();
