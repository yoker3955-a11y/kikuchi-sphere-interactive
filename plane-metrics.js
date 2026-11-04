/* Cubic-crystal plane metrics, kept separate from the stage-tilt solver. */
(() => {
  'use strict';
  const dot=(a,b)=>a.reduce((sum,value,index)=>sum+value*b[index],0);
  function calculate(first,second,latticeNm){
    if(!Array.isArray(first)||!Array.isArray(second)||first.length!==3||second.length!==3||!first.concat(second).every(Number.isFinite))throw new Error('请输入两个有效的三指数晶面。');
    if(!Number.isFinite(latticeNm)||latticeNm<=0)throw new Error('晶格常数必须为正数。');
    const firstLength=Math.hypot(...first),secondLength=Math.hypot(...second);
    if(!firstLength||!secondLength)throw new Error('(000) 不是有效晶面。');
    const dFirst=latticeNm/firstLength,dSecond=latticeNm/secondLength;
    // Plane normals may be reversed: report the conventional acute interplanar angle.
    const cosine=Math.min(1,Math.max(0,Math.abs(dot(first,second)/(firstLength*secondLength))));
    return {dFirst,dSecond,angleDeg:Math.acos(cosine)*180/Math.PI};
  }
  const cross=(a,b)=>[
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ];
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function reduceDirection(vector){
    const divisor=vector.reduce((value,item)=>gcd(value,Math.abs(item)),0);
    if(!divisor)return null;
    const reduced=vector.map(item=>item/divisor);
    const first=reduced.find(item=>item!==0);
    return first<0?reduced.map(item=>-item):reduced;
  }
  function canonicalNormal(reflection){
    const first=reflection.hkl.find(item=>item!==0)||1;
    if(first>0)return reflection;
    return {...reflection,hkl:reflection.hkl.map(item=>-item),g:reflection.g.map(item=>-item)};
  }
  // d values and the acute angle do not generally identify a unique pair of
  // planes. This enumerates all allowed indexed planes supplied by a phase
  // model and returns the corresponding zone-axis candidates h1×h2.
  function inferZoneAxes(reflections,{dFirst,dSecond,angleDeg,dTolerance=.003,angleTolerance=1}={}){
    if(!Array.isArray(reflections))throw new Error('缺少当前晶相的允许反射。');
    for(const [name,value] of Object.entries({dFirst,dSecond,angleDeg,dTolerance,angleTolerance})){
      const permitsZero=name==='angleDeg'||name.includes('Tolerance');
      if(!Number.isFinite(value)||(permitsZero?value<0:value<=0))throw new Error('请输入有效的 d 值、夹角和误差范围。');
    }
    if(angleDeg>90)throw new Error('此工具使用 0–90° 的晶面锐角。');
    const matches=(d,target)=>Math.abs(d-target)<=dTolerance+1e-12;
    // Keep higher-order planes such as (220): unlike a drawn centre line,
    // their d spacing must never be reduced to the (110) value.
    const uniqueNormals=items=>[...new Map(items.map(item=>{const normal=canonicalNormal(item);return [normal.hkl.join(','),normal];})).values()];
    const first=uniqueNormals(reflections.filter(item=>matches(item.dNm,dFirst)));
    const second=uniqueNormals(reflections.filter(item=>matches(item.dNm,dSecond)));
    const candidates=[],seen=new Set();
    for(const a of first)for(const b of second){
      const na=Math.hypot(...a.g),nb=Math.hypot(...b.g);
      if(!na||!nb)continue;
      const actual=Math.acos(Math.min(1,Math.max(0,Math.abs(dot(a.g,b.g)/(na*nb)))))*180/Math.PI;
      if(Math.abs(actual-angleDeg)>angleTolerance+1e-12)continue;
      const zone=reduceDirection(cross(a.hkl,b.hkl));
      if(!zone)continue; // Parallel planes cannot define a zone axis.
      const key=[a.hkl.join(','),b.hkl.join(','),zone.join(',')].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      candidates.push({first:a,second:b,zone,angleDeg:actual,score:Math.abs(a.dNm-dFirst)+Math.abs(b.dNm-dSecond)+Math.abs(actual-angleDeg)/100});
    }
    return {firstMatches:first.length,secondMatches:second.length,candidates:candidates.sort((a,b)=>a.score-b.score)};
  }
  const api={calculate,inferZoneAxes};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiPlaneMetrics=api;
})();

