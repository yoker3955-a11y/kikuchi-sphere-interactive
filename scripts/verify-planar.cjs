const test=require('node:test'),assert=require('node:assert/strict'),P=require('../planar-export.js'),fixture=require('./planar-fixture.cjs');
test('arbitrary zone axes are centered and all projected lines obey the transformed plane equation',()=>{
  for(const model of ['FCC','BCC'])for(const dir of [[1,1,2],[1,1,3],[3,3,0],[-1,1,3],[0,0,-1],[3,1,6]])for(const angle of [15,35,60]){
    const input=fixture(dir,model,angle),scene=P.make(input),limit=Math.tan(angle*Math.PI/180);
    assert(Math.hypot(...P.projectPole(dir,input.basis,limit))<1e-12);
    for(const line of scene.metadata.lines)for(const [x,y]of line.segment){assert(Math.abs(line.abc[0]*x+line.abc[1]*y+line.abc[2])<1e-9);assert(Math.abs(x)<=limit+1e-9&&Math.abs(y)<=limit+1e-9);}
    for(const pole of scene.metadata.poles){const rotated=P.transform(pole.indices,input.basis);assert(rotated[2]>0);assert(Math.abs(pole.x-rotated[0]/rotated[2])<1e-12);}
    assert(!P.svg(scene).includes('NaN'));assert(!P.svg(scene).includes('Infinity'));
  }
});
test('selected poles, rejected horizons, field limits and vector output remain explicit',()=>{
  const input=fixture(),scene=P.make(input);
  assert.equal(scene.metadata.visiblePins,4);assert.equal(scene.metadata.pinsOutside.length,0);
  assert.equal(P.projectPole([0,1,0],[[1,0,0],[0,1,0],[0,0,1]],1),null);
  assert.equal(P.projectPole([0,0,-1],[[1,0,0],[0,1,0],[0,0,1]],1),null);
  assert.throws(()=>P.make({...input,halfAngle:90}));assert.throws(()=>P.make({...input,direction:[0,0,1]}));
  const svg=P.svg(scene);assert(svg.includes('<metadata>'));assert(svg.includes('gnomonic'));assert(svg.includes('[112]'));
  const pdf=Buffer.from(P.pdf(scene)).toString('ascii');assert(pdf.startsWith('%PDF-1.4'));assert(pdf.includes('/MediaBox [0 0 595.276 841.89]'));
  const xref=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(xref,xref+4),'xref');
  const offsets=pdf.slice(xref).match(/\d{10} 00000 n/g).map(s=>Number(s.slice(0,10)));
  offsets.forEach((offset,i)=>assert(pdf.slice(offset).startsWith(`${i+1} 0 obj`)));
  assert(pdf.includes('([112]) Tj'));assert(!pdf.includes('/Subtype /Image'));
});
