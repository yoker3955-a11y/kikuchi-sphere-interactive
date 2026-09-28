const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../tilt-engine.js');
const near=(x,y,t=1e-7)=>assert(Math.abs(x-y)<t,`${x} != ${y}`);
test('reference maps the known zone to beam and known reflection to screen angle',()=>{
 const u=E.reference([1,1,0],[2,-2,0],37),z=E.mv(u,E.unit([1,1,0])),g=E.mv(u,E.unit([2,-2,0]));
 near(z[2],1);near(z[0],0);near(Math.atan2(g[1],g[0])*180/Math.PI,37);
 assert.throws(()=>E.reference([1,1,0],[1,1,1],0));
});
test('specific 112 differs from 121 and bounds are enforced',()=>{
 const base=E.reference([1,1,0],[2,-2,0],0);
 near(E.residual(base,[1,1,2]),54.735610317245346);near(E.residual(base,[1,2,1]),30);
 assert.equal(E.solve({base,target:[1,1,2]}),null);
 assert.equal(E.solve({base,target:[1,2,1]}),null); // abs(alpha)+abs(beta) would be 42.5298 deg
});
test('nonzero initial angles and reversed axes roundtrip to a known reachable orientation',()=>{
 for(const sa of [-1,1])for(const sb of [-1,1])for(const [at,bt]of [[12,-17],[-9,21],[0,0],[15,15]]){
  const base=E.reference([1,1,0],[2,-2,0],23),a0=8,b0=-5;
  const u=E.orientation(base,at,bt,a0,b0,sa,sb),target=E.mv(E.tr(u),[0,0,1]);
  const s=E.solve({base,target,a0,b0,sa,sb});assert(s);near(s.a,at);near(s.b,bt);
 }
});
test('plane solution actually puts plane normal perpendicular to beam',()=>{
 const base=E.reference([1,1,0],[2,-2,0],15);
 for(const target of [[2,-2,0],[0,0,4]]){
  const s=E.solve({base,target,mode:'plane',amin:-70,amax:70,bmin:-70,bmax:70});assert(s);
  near(E.residual(E.orientation(base,s.a,s.b,0,0),target,'plane'),0);
 }
});
test('quaternion output reconstructs orientation including 180 degree branches',()=>{
 for(const u of [E.rx(180),E.ry(180),E.rz(180),E.stage(23,-41),E.reference([1,1,0],[2,-2,0],0)]){
  const q=E.quaternion(u);near(Math.hypot(...q),1);
  for(const v of [[1,0,0],[0,1,0],[0,0,1]]){
   const t=E.cross(q,v).map(x=>2*x),c=E.cross(q,t),r=v.map((x,i)=>x+q[3]*t[i]+c[i]);
   r.forEach((x,i)=>near(x,E.mv(u,v)[i]));
  }
 }
});
test('singular target and invalid inputs',()=>{
 const base=[[1,0,0],[0,1,0],[0,0,1]];
 assert.equal(E.solve({base,target:[0,1,0],amin:-100,amax:100}),null);
 assert.throws(()=>E.solve({base,target:[0,0,0]}));
 assert.throws(()=>E.solve({base,target:[0,0,1],amin:50,amax:20}));
});

test('combined limit uses absolute readings, all sign quadrants, and includes boundary',()=>{
 for(const a of [-20,20])for(const b of [-10,10])assert(E.withinLimits(a,b));
 assert(!E.withinLimits(20,-11));assert(!E.withinLimits(-16,-16));assert(E.withinLimits(30,0));
 assert(!E.withinLimits(12,3,{amin:-10,amax:10,bmin:-30,bmax:30}));
 const base=E.reference([1,1,0],[2,-2,0],0),a0=10,b0=10;
 const target=E.mv(E.tr(E.orientation(base,20,15,a0,b0)),[0,0,1]);
 assert.equal(E.solve({base,target,a0,b0}),null); // delta sum=15, absolute sum=35
 assert.throws(()=>E.solve({base,target:[1,1,0],a0:20,b0:15}));
});
test('synchronous linear paths remain inside convex combined limit; sequential move may fail',()=>{
 const start=[20,10],end=[10,20];assert(!E.withinLimits(start[0],end[1]));
 for(let i=0;i<=100;i++){const t=i/100;assert(E.withinLimits(start[0]+t*(end[0]-start[0]),start[1]+t*(end[1]-start[1])));}
});

test('optional combined limit restores single-axis solutions without bypassing axis bounds',()=>{
 const base=E.reference([1,1,0],[2,-2,0],0);
 assert.equal(E.solve({base,target:[1,2,1]}),null);
 const s=E.solve({base,target:[1,2,1],combined:false});assert(s);assert(Math.abs(s.a)+Math.abs(s.b)>30);
 assert(E.withinLimits(20,20,{combined:false}));assert(!E.withinLimits(20,31,{combined:false}));
 assert.equal(E.solve({base,target:[1,2,1],combined:false,amin:-10,amax:10}),null);
 assert(E.solve({base,target:[1,1,0],a0:20,b0:20,combined:false}));
});
