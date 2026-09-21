const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('../pole-picker.js');
test('recognizes positive and negative poles without forcing a distant match',()=>{
  for(const v of [[1,1,2],[1,1,3],[3,3,0],[-1,1,3],[0,0,-1]]){
    const result=P.nearest(v);assert(result.angle<1e-10);
    const divisor=v[0]===3?3:1;assert.deepEqual(result.indices.map(n=>n||0),v.map(n=>n/divisor));
  }
  assert.equal(P.nearest([1,0.08,0.04]),null);
});
test('screen clicks invert the real face mapping across rotated and scaled projections',()=>{
  const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../model-drawings.js'),'utf8'),box);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k);
  for(const face of box.window.KIKUCHI_MODEL.faces){
    const [a,b,c]=face.imagePolygon,e=sub(face.vertices[1],face.vertices[0]),f=sub(face.vertices[2],face.vertices[0]);
    const bx=b[0]-a[0],by=b[1]-a[1],cx=c[0]-a[0],cy=c[1]-a[1],det=bx*cy-by*cx;
    face.u=mul(sub(mul(e,cy),mul(f,by)),1/det);face.v=mul(sub(mul(f,bx),mul(e,cx)),1/det);
    face.origin=sub(sub(face.vertices[0],mul(face.u,a[0])),mul(face.v,a[1]));
    for(const scale of [80,200,700]){
      // Two independent rows of a generic 3D-to-2D affine projection.
      const project=v=>[scale*(.71*v[0]+.23*v[1]+.61*v[2]),scale*(-.4*v[0]+.87*v[1]-.14*v[2])];
      const u=project(face.u),v=project(face.v),o=project(face.origin);
      for(const pixel of [a,b,[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3]]){
        const point=o.map((n,i)=>n+u[i]*pixel[0]+v[i]*pixel[1]);
        const picked=P.hit(point,o,u,v,face);
        assert(Math.hypot(...sub(picked.pixel,pixel))<1e-7);
        const expected=face.origin.map((n,i)=>n+face.u[i]*pixel[0]+face.v[i]*pixel[1]);
        assert(Math.hypot(...sub(picked.position,expected))<1e-10);
      }
    }
  }
  assert.equal(P.hit([0,0],[0,0],[1,1],[2,2],{}),null);
});
test('dialog zoom, texture refresh and candidate navigation preserve the picked location',()=>{
  const els={},transforms=[],ctx=new Proxy({translate:(...p)=>transforms.push(p)},{get:(o,k)=>o[k]||(()=>{})});
  const el=id=>els[id]||(els[id]={handlers:{},addEventListener(k,f){this.handlers[k]=f;},setAttribute(){},getContext:()=>ctx,showModal(){this.open=true;},close(){this.open=false;},width:1000,height:1000});
  const box={window:{KikuchiDirection:require('../direction.js')},document:{getElementById:el}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../pole-picker.js'),'utf8'),box);
  let aligned=null,draws=0;
  const ui=box.window.KikuchiPole.create(v=>aligned=v),pick={pixel:[231,407],candidate:{indices:[1,1,2],angle:.1}};
  ui.open(pick,[750,750],[1,0],()=>draws++,'预览图');
  assert(el('pole-dialog').open);assert.deepEqual(transforms.at(-1),[-231,-407]);
  for(let i=0;i<10;i++)el('pole-more').handlers.click();
  assert.equal(el('pole-zoom-value').textContent,'8×');assert(el('pole-more').disabled);
  ui.refresh('高清细节已载入');assert.equal(el('pole-quality').textContent,'高清细节已载入');assert(draws>1);
  el('pole-align').handlers.click();assert.deepEqual(aligned,[1,1,2]);assert(!el('pole-dialog').open);
  ui.open({...pick,candidate:null},[750,750],[1,0],()=>{},'高清');assert(el('pole-align').hidden);
  el('pole-close').handlers.click();assert(!el('pole-dialog').open);
});
