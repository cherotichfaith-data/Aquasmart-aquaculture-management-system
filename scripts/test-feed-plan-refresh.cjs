const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=process.cwd();
const ts=require(root+'/node_modules/typescript');
const modelContext={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/features/analytics/feed-model.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,modelContext);
let states=[],refs=[],effects=[],cursor=0,refCursor=0,refreshes=0,interval,cleared=false;
const events={}; const doc={visibilityState:'visible',addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]};
const win={setInterval:(f,ms)=>{assert.equal(ms,30000);interval=f;return 1},clearInterval:()=>cleared=true,addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]};
const router={refresh:()=>refreshes++};
const react={useState:init=>{let i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v]},useRef:init=>{let i=refCursor++;return refs[i]??(refs[i]={current:init})},useEffect:f=>effects.push(f)};
const context={exports:{},document:doc,window:win,require:n=>n==='react'?react:n==='next/navigation'?{useRouter:()=>router}:n.includes('feed-model')?modelContext.exports:n==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}: {}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/app/analytics/inputs/feed-planning/planner.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const original={system_id:1,batch_id:2,cage_name:'1A',batch_name:'B',stock_no:1000,stock_date:'2026-10-26',abw_g:50,sampled_on:'2026-10-20'};
const props={farmId:'farm',start:'2026-11-01',end:'2026-11-30',asOf:'2026-10-26',today:'2026-10-26',sources:[original],saved:null,canSave:true};
function render(p){cursor=0;refCursor=0;effects=[];context.exports.default(p)}
render(props);effects[0]();const cleanup=effects[1]();interval();assert.equal(refreshes,1);doc.visibilityState='hidden';interval();assert.equal(refreshes,1);doc.visibilityState='visible';events.focus();assert.equal(refreshes,2);cleanup();assert.ok(cleared);assert.equal(events.focus,undefined);
states[2]=true;
const newer={...props,sources:[{...original,abw_g:70,sampled_on:'2026-10-26'}]};render(newer);effects[0]();assert.equal(states[0][0].abw,'70');assert.equal(states[2],false);assert.ok(modelContext.exports.calculateFeed(1000,70,props.start,props.end).feed_kg!==modelContext.exports.calculateFeed(1000,50,props.start,props.end).feed_kg);
states[1]=true;states[0][0].abw='75';render({...newer,sources:[{...original,abw_g:80}]});effects[0]();assert.equal(states[0][0].abw,'75');assert.match(states[4],/unsaved edits/);
const saved={rows:[{...original,result:modelContext.exports.calculateFeed(1000,50,props.start,props.end)}],starts_on:props.start,ends_on:props.end,source_as_of:props.asOf};render({...newer,saved});effects[0]();assert.equal(effects[1](),undefined);assert.equal(states[0][0].abw,'75');
console.log('PASS: new sampling updates draft ABW and feed; resets confirmation; protects edits and saved plans; refreshes visible tabs and cleans listeners.');

