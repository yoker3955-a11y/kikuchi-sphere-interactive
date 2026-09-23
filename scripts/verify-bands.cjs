const test=require('node:test'),assert=require('node:assert/strict'),P=require('../planar-export.js'),B=require('../kikuchi-bands.js'),fixture=require('./planar-fixture.cjs');
test('projected band edges satisfy Bragg cone and polygons stay in field',()=>{
 for(const dir of [[1,1,2],[-1,1,3],[0,0,1]])for(const angle of [2,35,60]){
  const input=fixture(dir,'FCC',angle),scene=P.make({...input,bands:true,extended:true});
  assert(scene.metadata.bands.length>0);
  for(const b of scene.metadata.bands){assert(P.siAllowed(b.hkl));const normal=P.transform(b.hkl,input.basis),len=Math.hypot(...normal),s=P.wavelength(200)/(2*b.dNm),L=Math.tan(angle*Math.PI/180),g=B.geometry(normal,s,L);
   for(const e of g.edges)for(const p of e){const value=Math.abs((normal[0]*p[0]+normal[1]*p[1]+normal[2])/len/Math.hypot(...p,1));assert(Math.abs(value-s)<2e-6);}
   for(const poly of g.polygons)for(const p of poly)assert(p.every(v=>Math.abs(v)<=L+1e-9));
  }
  assert(P.svg(scene).includes('<polygon'));assert(!P.svg(scene).includes('NaN'));assert(!Buffer.from(P.pdf(scene)).toString('ascii').includes('/Subtype /Image'));
 }
});
test('Si 220 width follows Bragg law and decreases with voltage',()=>{
 const f=kv=>P.make({...fixture([1,1,0]),bands:true,kv}).metadata.bands.find(b=>b.hkl.join(',')==='2,-2,0');
 const a=f(200),b=f(300);assert(a);assert(Math.abs(a.widthDeg-2*Math.asin(P.wavelength(200)*Math.sqrt(8)/(2*.5431))*180/Math.PI)<1e-10);assert(b.widthDeg<a.widthDeg);
 assert.throws(()=>P.make({...fixture(),bands:true,aNm:0}));assert.throws(()=>P.make({...fixture(),bands:true,kv:0}));
});
