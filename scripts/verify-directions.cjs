const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),D=require('../direction.js');
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function rotate(q,v){const t=cross(q,v).map(n=>2*n),c=cross(q,t);return v.map((n,i)=>n+q[3]*t[i]+c[i]);}
test('input formats, proportional indices, signs and invalid values',()=>{
  for(const s of ['112','[112]','1 1 2','1,1,2','1，1，2'])assert.deepEqual(D.parse(s).reduced,[1,1,2]);
  assert.deepEqual(D.parse('330').reduced,[1,1,0]);
  assert.deepEqual(D.parse('[-2 2 6]').reduced,[-1,1,3]);
  assert.deepEqual(D.parse('−1 1 3').reduced,[-1,1,3]);
  for(const s of ['000','','1133','-113','1 2','1 2 3 4','1.2 1 3','NaN 1 2','1e2 1 3','[112','9007199254740992 1 2'])assert.throws(()=>D.parse(s));
});
test('all small integer directions, poles and extreme ratios align with positive screen Z',()=>{
  const cases=[[1,1,1123456789],[1,1,-1123456789]];
  for(let u=-6;u<=6;u++)for(let v=-6;v<=6;v++)for(let w=-6;w<=6;w++)if(u||v||w)cases.push([u,v,w]);
  for(const v of cases){const out=rotate(D.align(v),v.map(n=>n/Math.hypot(...v)));assert(Math.hypot(out[0],out[1],out[2]-1)<1e-12,String(v));}
  assert.deepEqual(D.align([3,3,0]),D.align([1,1,0]));
});
function harness(file,query=''){
  const els=new Map(),context=new Proxy({},{get:()=>()=>{}});
  class Element{
    constructor(){this.handlers={};this.dataset={};this.value='';}
    addEventListener(k,f){this.handlers[k]=f;}setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}
    replaceChildren(){}append(){}getContext(){return context;}getBoundingClientRect(){return {width:800,height:700};}
  }
  const el=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};
  const buttons=['001','110','111','112','330','113'].map(view=>Object.assign(new Element(),{dataset:{view}}));
  const document={getElementById:el,querySelectorAll:s=>s==='[data-view]'?buttons:[],createElement:()=>new Element(),createElementNS:()=>new Element(),createTextNode:()=>({}),addEventListener(){}};
  const sandbox={document,URL,URLSearchParams,location:new URL('https://example.test/'+file.replace('viewer','index').replace('.js','.html')+query),console,
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},ResizeObserver:class{observe(){}},Image:class{set src(v){this.onload();}},
    window:{addEventListener(){},devicePixelRatio:1,drawKikuchiPreview(){},KikuchiTextureSlot:class{clear(){}async load(){return {};}}}};
  vm.createContext(sandbox);
  for(const name of ['model-drawings.js','model-lite.js','direction.js','pole-catalog.js','planar-export.js',file]){
    let s=fs.readFileSync(path.join(root,name),'utf8');
    if(name===file)s=s.replace(/\}\)\(\);\s*$/,'window.probe={get q(){return q},get active(){return activeDirection},setView,currentViewUrl,rotate};})();');
    vm.runInContext(s,sandbox);
  }
  return {el,buttons,probe:sandbox.window.probe};
}
for(const file of ['viewer-lite.js','viewer-drawings.js'])test(file+' integrates form, orientation, URL, reset and keyboard',()=>{
  const h=harness(file);
  for(const v of [[1,1,2],[1,1,3],[3,3,0],[-1,1,3],[0,0,-1]]){
    h.el('direction-input').value=v.join(' ');h.el('direction-form').handlers.submit({preventDefault(){}});
    const out=h.probe.rotate(v.map(n=>n/Math.hypot(...v)));
    assert(Math.hypot(out[0],out[1],out[2]-1)<1e-12);
    const url=h.probe.currentViewUrl(),restored=harness(file,url.search);
    assert.equal(restored.el('direction-status').textContent,h.el('direction-status').textContent);
    assert.deepEqual(Array.from(restored.probe.q),Array.from(h.probe.q));
  }
  h.probe.setView([3,3,0]);assert.match(h.el('direction-status').textContent,/同向/);
  const before=Array.from(h.probe.q);
  h.el('direction-input').value='000';h.el('direction-form').handlers.submit({preventDefault(){}});
  assert.equal(h.el('direction-input')['aria-invalid'],'true');assert.deepEqual(Array.from(h.probe.q),before);
  h.probe.setView([1,1,2]);h.el('viewer').handlers.keydown({key:'ArrowLeft',preventDefault(){}});
  assert.equal(h.probe.active,null);assert.equal(h.probe.currentViewUrl().searchParams.has('uvw'),false);
  h.probe.setView([1,1,3]);h.el('reset').handlers.click();assert.equal(h.probe.active,null);
  assert.match(harness(file,'?uvw=000').el('direction-error').textContent,/无效/);
});
