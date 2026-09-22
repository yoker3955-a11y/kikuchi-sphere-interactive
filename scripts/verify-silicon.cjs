const assert=require('node:assert/strict'),test=require('node:test'),P=require('../planar-export.js'),fixture=require('./planar-fixture.cjs');
test('Si diamond extinction and relativistic 200kV wavelength',()=>{
 assert.ok(Math.abs(P.wavelength(200)-.0025079)<1e-7);
 for(const hkl of [[1,1,1],[2,2,0],[4,0,0],[3,1,1],[-2,2,0]])assert.equal(P.siAllowed(hkl),true);
 for(const hkl of [[2,0,0],[2,2,2],[1,1,0],[1,0,0]])assert.equal(P.siAllowed(hkl),false);
});
test('Si ZOLZ spots preserve indices, metric scale, Friedel pairs and exports',()=>{
 for(const direction of [[1,1,2],[1,1,3],[3,3,0],[0,0,1],[-1,1,2]]){
  const scene=P.make({...fixture(direction,'FCC',2),spots:true});
  assert.ok(scene.metadata.reflections.length>0);
  for(const s of scene.metadata.reflections){
   assert.equal(s.hkl.reduce((a,n,i)=>a+n*direction[i],0),0);
   assert.ok(Math.abs(s.dNm*s.gInvNm-1)<1e-12);
   assert.ok(scene.metadata.reflections.some(t=>t.hkl.every((n,i)=>n===-s.hkl[i])));
   assert.ok(Math.abs(Math.hypot(s.x,s.y)-Math.tan(s.angleDeg*Math.PI/180))<1e-12);
  }
  assert.ok(P.svg(scene).includes('Si diamond'));
  assert.ok(Buffer.from(P.pdf(scene)).includes(Buffer.from('200 kV')));
 }
 const s=P.make({...fixture([0,0,1],'FCC',2),spots:true});
 const p=s.metadata.reflections.find(p=>p.hkl.join(',')==='2,2,0');
 assert.ok(Math.abs(p.dNm-.192014846)<1e-8);
 assert.equal(s.metadata.lines.some(l=>l.family.includes('200')),false);
});
