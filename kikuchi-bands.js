/* Geometric Bragg cones: n.s = +/- sin(thetaB), s=(x,y,1)/sqrt(1+x*x+y*y).
   Boundaries are not dynamical intensity extrema. Coordinates are gnomonic. */
(() => {
  'use strict';
  function clip(poly,L){
    for(const [axis,sign] of [[0,1],[0,-1],[1,1],[1,-1]]){
      const out=[];
      for(let i=0;i<poly.length;i++){
        const a=poly[i],b=poly[(i+1)%poly.length],fa=sign*a[axis]-L,fb=sign*b[axis]-L;
        if(fa<=0)out.push(a);
        if((fa<=0)!==(fb<=0)){const t=fa/(fa-fb);out.push(a.map((v,j)=>v+t*(b[j]-v)));}
      }
      poly=out;
    }
    return poly;
  }
  function geometry(normal,sinTheta,limit,samples=512){
    const len=Math.hypot(...normal),[a,b,c]=normal.map(v=>v/len),rho=Math.hypot(a,b),s=sinTheta;
    // With supported TEM parameters and field <=75 deg this case cannot reach the field.
    if(rho<=s)return {polygons:[],edges:[]};
    const rows=[],span=Math.SQRT2*limit,den=rho*rho-s*s;
    for(let i=0;i<=samples;i++){
      const v=-span+2*span*i/samples;
      rows.push([-1,1].map(sign=>{const u=(-rho*c+sign*s*Math.sqrt(1-s*s+den*v*v))/den;return [(a*u-b*v)/rho,(b*u+a*v)/rho];}));
    }
    const fill=clip([...rows.map(r=>r[0]),...rows.slice().reverse().map(r=>r[1])],limit);
    const polygons=fill.length>=3?[fill]:[],edges=[];
    for(let i=1;i<rows.length;i++){
      for(let j=0;j<2;j++){
        const p=rows[i-1][j],q=rows[i][j];let lo=0,hi=1;
        for(let axis=0;axis<2;axis++){
          const d=q[axis]-p[axis];
          if(Math.abs(d)<1e-14){if(Math.abs(p[axis])>limit)hi=-1;}
          else {const t1=(-limit-p[axis])/d,t2=(limit-p[axis])/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));}
        }
        if(lo<=hi)edges.push([p.map((v,k)=>v+lo*(q[k]-v)),p.map((v,k)=>v+hi*(q[k]-v))]);
      }
    }
    return {polygons,edges};
  }
  const api={geometry,clip};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiBands=api;
})();
