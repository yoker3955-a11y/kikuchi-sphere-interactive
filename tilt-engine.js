/* Double tilt geometry, independently implemented from rotation equations.
 * Column vectors; beam +Z; A = Rx(alpha) Ry(beta), beta carried by alpha.
 * Degrees at public boundaries. No microscope control or intensity simulation. */
(() => {
  'use strict';
  const rad=Math.PI/180, dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const unit=v=>{const n=Math.hypot(...v);if(v.length!==3||!v.every(Number.isFinite)||!n)throw Error('方向必须为三个有限数，且不能为零。');return v.map(x=>x/n);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const mv=(m,v)=>m.map(row=>dot(row,v)), tr=m=>m[0].map((_,i)=>m.map(r=>r[i]));
  const mm=(a,b)=>a.map(r=>tr(b).map(c=>dot(r,c)));
  const rx=a=>{const c=Math.cos(a*rad),s=Math.sin(a*rad);return [[1,0,0],[0,c,-s],[0,s,c]];};
  const ry=a=>{const c=Math.cos(a*rad),s=Math.sin(a*rad);return [[c,0,s],[0,1,0],[-s,0,c]];};
  const rz=a=>{const c=Math.cos(a*rad),s=Math.sin(a*rad);return [[c,-s,0],[s,c,0],[0,0,1]];};
  const stage=(a,b,sa=1,sb=1)=>mm(rx(a*sa),ry(b*sb));
  function reference(zone,reflection,angle){
    const z=unit(zone),g=unit(reflection);
    if(Math.abs(dot(z,g))>1e-7)throw Error('参考反射必须属于当前晶带轴：hu+kv+lw 应等于 0。');
    const x=g,y=unit(cross(z,x));
    return mm(rz(angle),[x,y,z]);
  }
  const orientation=(base,a,b,a0,b0,sa=1,sb=1)=>mm(mm(stage(a,b,sa,sb),tr(stage(a0,b0,sa,sb))),base);
  const residual=(u,target,mode='zone')=>{const v=mv(u,unit(target));return mode==='plane'?Math.asin(Math.min(1,Math.abs(v[2])))/rad:Math.atan2(Math.hypot(v[0],v[1]),v[2])/rad;};
  function solve({base,target,a0=0,b0=0,a=a0,b=b0,amin=-35,amax=35,bmin=-30,bmax=30,sa=1,sb=1,mode='zone'}){
    if(![a0,b0,a,b,amin,amax,bmin,bmax,sa,sb].every(Number.isFinite)||amin>amax||bmin>bmax||Math.max(...[amin,amax,bmin,bmax].map(Math.abs))>180||Math.abs(sa)!==1||Math.abs(sb)!==1)throw Error('请检查角度限位和轴方向。');
    const v=mv(mm(tr(stage(a0,b0,sa,sb)),base),unit(target)),candidates=[];
    const add=(aa,bb)=>{if(aa<amin-1e-8||aa>amax+1e-8||bb<bmin-1e-8||bb>bmax+1e-8)return;const err=residual(orientation(base,aa,bb,a0,b0,sa,sb),target,mode);if(err<1e-6)candidates.push({a:aa,b:bb,error:err,cost:Math.hypot(aa-a,bb-b)});};
    if(mode==='zone'){
      const seed=Math.hypot(v[0],v[2])<1e-12?b*sb:Math.atan2(-v[0],v[2])/rad;
      for(const bb of [seed,seed+180]){
        const z=mv(ry(bb),v)[2],aa=Math.atan2(v[1],z)/rad;
        for(let k=-2;k<=2;k++)for(let j=-2;j<=2;j++)add((aa+360*k)/sa,(bb+360*j)/sb);
      }
    }else if(mode==='plane'){
      // Plane parallel to beam: one constraint, choose a nearby feasible point.
      // Search alpha at <=0.1 degree spacing, solve beta analytically at each.
      const r=Math.hypot(v[0],v[2]),phi=Math.atan2(v[0],v[2])/rad;
      const tryA=aa=>{
        const s=Math.sin(aa*sa*rad),c=Math.cos(aa*sa*rad);
        if(Math.abs(c*r)<1e-12){if(Math.abs(s*v[1])<1e-10)add(aa,Math.max(bmin,Math.min(bmax,b)));return;}
        const t=-s*v[1]/(c*r);if(Math.abs(t)>1+1e-10)return;
        const d=Math.acos(Math.max(-1,Math.min(1,t)))/rad;
        for(const bb of [d-phi,-d-phi])for(let j=-2;j<=2;j++)add(aa,(bb+360*j)/sb);
      };
      tryA(Math.max(amin,Math.min(amax,a)));
      const n=Math.max(1,Math.ceil((amax-amin)/.1));for(let i=0;i<=n;i++)tryA(amin+(amax-amin)*i/n);
      // Also solve at beta boundaries; catches feasible intervals narrower than grid.
      for(const bb of [bmin,bmax,b]){const w=mv(ry(bb*sb),v);const aa=Math.atan2(-w[2],w[1])/rad;for(let k=-2;k<=2;k++)add((aa+180*k)/sa,bb);}
    }else throw Error('未知目标模式。');
    candidates.sort((x,y)=>x.cost-y.cost);return candidates[0]||null;
  }
  function quaternion(m){
    const t=m[0][0]+m[1][1]+m[2][2];let q;
    if(t>0){const s=2*Math.sqrt(t+1);q=[(m[2][1]-m[1][2])/s,(m[0][2]-m[2][0])/s,(m[1][0]-m[0][1])/s,s/4];}
    else {let i=0;if(m[1][1]>m[i][i])i=1;if(m[2][2]>m[i][i])i=2;const j=(i+1)%3,k=(i+2)%3,s=2*Math.sqrt(1+m[i][i]-m[j][j]-m[k][k]);q=[0,0,0,0];q[i]=s/4;q[j]=(m[j][i]+m[i][j])/s;q[k]=(m[k][i]+m[i][k])/s;q[3]=(m[k][j]-m[j][k])/s;}
    return q;
  }
  const api={unit,dot,cross,mv,mm,tr,rx,ry,rz,stage,reference,orientation,residual,solve,quaternion};
  if(typeof module!=='undefined')module.exports=api;
  if(typeof window!=='undefined')window.KikuchiTilt=api;
})();

