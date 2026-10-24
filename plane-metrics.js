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
  const api={calculate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiPlaneMetrics=api;
})();
