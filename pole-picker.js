/* Invert the same affine projection used to paint the face; no image recognition. */
(() => {
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const candidates=[];
  for(let u=-6;u<=6;u++)for(let v=-6;v<=6;v++)for(let w=-6;w<=6;w++){
    if([u,v,w].reduce((g,n)=>gcd(g,Math.abs(n)),0)!==1)continue;
    const indices=[u,v,w],length=Math.hypot(...indices);
    candidates.push({indices,unit:indices.map(n=>n/length)});
  }
  function nearest(point) {
    const length=Math.hypot(...point),unit=point.map(n=>n/length);
    let best=null;
    for(const c of candidates){const angle=Math.atan2(Math.hypot(...cross(unit,c.unit)),dot(unit,c.unit))*180/Math.PI;if(!best||angle<best.angle)best={indices:c.indices,angle};}
    return best.angle<=1.5?best:null;
  }
  function hit(point,origin,u,v,face){
    const x=point[0]-origin[0],y=point[1]-origin[1],det=u[0]*v[1]-u[1]*v[0];
    if(Math.abs(det)<1e-12)return null;
    const pixel=[(x*v[1]-y*v[0])/det,(u[0]*y-u[1]*x)/det];
    const position=face.origin.map((n,i)=>n+face.u[i]*pixel[0]+face.v[i]*pixel[1]);
    return {pixel,position,candidate:nearest(position)};
  }
  function create(onAlign){
    const $=id=>document.getElementById(id),dialog=$('pole-dialog'),canvas=$('pole-canvas'),ctx=canvas.getContext('2d');
    let selection=null,drawTexture=null,factor=3,orientation=[1,0],size=[1,1];
    function render(){
      if(!selection||!dialog.open)return;
      const angle=-Math.atan2(orientation[1],orientation[0]);
      const c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
      const scale=Math.min(canvas.width/(size[0]*c+size[1]*s),canvas.height/(size[0]*s+size[1]*c))*factor;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle);ctx.scale(scale,scale);ctx.translate(-selection.pixel[0],-selection.pixel[1]);
      drawTexture(ctx);ctx.restore();
      ctx.save();ctx.strokeStyle='#176d78';ctx.lineWidth=2;
      const x=canvas.width/2,y=canvas.height/2;
      ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.moveTo(x-24,y);ctx.lineTo(x-15,y);ctx.moveTo(x+15,y);ctx.lineTo(x+24,y);ctx.moveTo(x,y-24);ctx.lineTo(x,y-15);ctx.moveTo(x,y+15);ctx.lineTo(x,y+24);ctx.stroke();ctx.restore();
      $('pole-zoom-value').textContent=factor+'×';$('pole-less').disabled=factor<=1;$('pole-more').disabled=factor>=8;
    }
    $('pole-close').addEventListener('click',()=>dialog.close());
    $('pole-less').addEventListener('click',()=>{factor=Math.max(1,factor-1);render();});
    $('pole-more').addEventListener('click',()=>{factor=Math.min(8,factor+1);render();});
    $('pole-align').addEventListener('click',()=>{if(selection?.candidate){dialog.close();onAlign(selection.candidate.indices);}});
    return {
      open(pick,textureSize,direction,draw,status){
        selection=pick;size=textureSize;orientation=direction;drawTexture=draw;factor=3;
        const candidate=pick.candidate;
        $('pole-title').textContent=candidate?(pick.exact?'菊池极 ':'附近菊池极候选 ')+window.KikuchiDirection.label(candidate.indices):'点击位置 · 局部放大';
        $('pole-info').textContent=pick.exact?'坐标由相交中心线的晶面指数计算；圆圈中心为选中的交点。':candidate?`与候选晶向相差 ${candidate.angle.toFixed(2)}°。候选由模型几何估算（各指数绝对值 ≤ 6），请结合图纸标注确认。`:'点击处未靠近候选范围内的菊池极（角差阈值 1.5°）；可关闭后点击线条交点。';
        $('pole-align').hidden=!candidate;
        canvas.setAttribute('aria-label',$('pole-title').textContent+'，圆圈中心为选中的位置');
        $('pole-quality').textContent=status;
        if(!dialog.open)dialog.showModal();render();
      },
      refresh(status){$('pole-quality').textContent=status;render();},
      close(){if(dialog.open)dialog.close();selection=null;}
    };
  }
  const api={hit,nearest,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiPole=api;
})();
