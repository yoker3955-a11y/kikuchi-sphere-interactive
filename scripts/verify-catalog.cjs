const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const C=require('../pole-catalog.js'),D=require('../direction.js');
const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../model-drawings.js'),'utf8'),box);
const data=box.window.KIKUCHI_MODEL,dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
test('every indexed pole lies on the polyhedron and on at least two declared center lines',()=>{
  for(const model of ['FCC','BCC']){
    const poles=C.build(data.legends[model],data.faces),lines=C.planes(data.legends[model]);
    assert(poles.length>100);assert.equal(new Set(poles.map(p=>p.id)).size,poles.length);
    for(const p of poles){
      assert(p.planes.length>=2);
      for(const plane of p.planes)assert.equal(dot(plane.hkl,p.indices),0);
      for(const f of data.faces)assert(dot(f.normal,p.position)<=dot(f.normal,f.vertices[0])+1e-10);
      assert(Math.abs(dot(p.face.normal,p.position)-dot(p.face.normal,p.face.vertices[0]))<1e-10);
      assert(poles.some(q=>q.id===p.indices.map(n=>-n||0).join(',')));
      assert.equal(p.planes.length,lines.filter(l=>dot(l.normal,p.indices)===0).length);
    }
  }
});
test('the four screenshot intersections have the expected exact indices and defining planes',()=>{
  const poles=C.build(data.legends.FCC,data.faces);
  for(const [indices,planes] of [
    [[1,1,4],[[3,1,-1],[1,3,-1]]],
    [[3,1,6],[[1,3,-1],[3,-3,-1]]],
    [[1,3,6],[[3,1,-1],[3,-3,1]]],
    [[3,4,5],[[3,-1,-1],[1,3,-3]]]
  ]){
    const p=poles.find(x=>x.id===indices.join(','));assert(p);
    for(const plane of planes)assert(p.planes.some(l=>l.hkl.join(',')===plane.join(',')));
  }
});
test('pinning, sharing, clearing and invalid inputs preserve valid coordinate data',()=>{
  const els={};const el=id=>els[id]||(els[id]={handlers:{},checked:true,children:[],addEventListener(k,f){this.handlers[k]=f;},replaceChildren(...c){this.children=c;},setAttribute(){}});
  const sandbox={window:{KikuchiDirection:D},document:{getElementById:el,createElement:()=>({setAttribute(){},addEventListener(){}})}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../pole-catalog.js'),'utf8'),sandbox);
  const controller=sandbox.window.KikuchiPoleCatalog.create({data,rotate:v=>v,project:v=>v,onSelect(){},onAlign(){},onMagnify(){},schedule(){}});
  controller.update('FCC','teaching');controller.restore('1,1,4;3,1,6;1,3,6;3,4,5');
  assert.equal(controller.serialize(),'1,1,4;3,1,6;1,3,6;3,4,5');
  el('direction-input').value='2 2 8';el('pole-mark-input').handlers.click();assert.equal(el('pole-pins').children.length,4);
  el('direction-input').value='000';el('pole-mark-input').handlers.click();assert.equal(el('pole-pins').children.length,4);
  el('pole-clear-pins').handlers.click();assert.equal(controller.serialize(),'');
  controller.restore('0,0,0;bad;1,1,4');assert.equal(controller.serialize(),'1,1,4');
  controller.update('BCC','teaching');assert.equal(controller.serialize(),'');
});
