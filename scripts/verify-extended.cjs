const test=require('node:test'),assert=require('node:assert/strict'),P=require('../planar-export.js'),fixture=require('./planar-fixture.cjs');
test('extended maps add declared families and retain exact zone geometry for arbitrary signed directions',()=>{
 for(const model of ['FCC','BCC'])for(const direction of [[1,1,2],[-1,1,3],[3,1,6]]){
  const input=fixture(direction,model,60),base=P.make(input),scene=P.make({...input,extended:true});
  assert(scene.metadata.lines.length>base.metadata.lines.length);
  assert.equal(scene.metadata.scope,'extended-mathematical-families');
  for(const line of scene.metadata.lines)for(const [x,y] of line.segment)assert(Math.abs(line.abc[0]*x+line.abc[1]*y+line.abc[2])<1e-9);
  assert(P.svg(scene).includes('not a digitization'));assert(!P.svg(scene).includes('NaN'));
  assert(!Buffer.from(P.pdf(scene)).toString('ascii').includes('/Subtype /Image'));
 }
});
