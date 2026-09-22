/* Exact intersections of the center-line families declared in the teaching map.
   Zone law: h*u+k*v+l*w=0; a zone axis is the reduced cross product of two planes.
   Reference: https://dictionary.iucr.org/Zone_axis */
(() => {
  'use strict';
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  const reduce=v=>{const g=v.reduce((a,b)=>gcd(a,Math.abs(b)),0);return g?v.map(n=>n/g||0):null;};
  const canonical=v=>v.find(n=>n!==0)<0?v.map(n=>-n||0):v;
  const label=v=>'['+v.join(v.some(n=>n<0||n>9)?' ':'')+']';
  const planeLabel=v=>'('+v.join(' ')+')';
  function planes(legend){
    const unique=new Map();
    for(const entry of legend){
      const numbers=entry.label.replace(/[{}]/g,'').split('').map(Number);
      for(const p of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
        for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1]){
          const hkl=canonical(p.map((i,j)=>numbers[i]*[a,b,c][j]));
          const normal=canonical(reduce(hkl));
          unique.set(normal.join(','),{normal,hkl,family:entry.label});
        }
      }
    }
    return [...unique.values()];
  }
  function surface(indices,faces){
    const len=Math.hypot(...indices),unit=indices.map(n=>n/len);
    let distance=Infinity,faceIndex=-1;
    faces.forEach((f,i)=>{
      const denominator=dot(f.normal,unit);
      if(denominator<=1e-10)return;
      const t=dot(f.normal,f.vertices[0])/denominator;
      if(t<distance){distance=t;faceIndex=i;}
    });
    return {unit,position:unit.map(n=>n*distance),faceIndex,face:faces[faceIndex]};
  }
  function build(legend,faces){
    const lines=planes(legend),axes=new Map();
    for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
      const axis=reduce(cross(lines[i].normal,lines[j].normal));
      if(!axis)continue;
      for(const sign of [1,-1]){const indices=axis.map(n=>sign*n||0);axes.set(indices.join(','),indices);}
    }
    return [...axes.values()].map(indices=>({id:indices.join(','),indices,label:label(indices),
      planes:lines.filter(p=>dot(p.normal,indices)===0),...surface(indices,faces)}))
      .sort((a,b)=>b.planes.length-a.planes.length||Math.hypot(...a.indices)-Math.hypot(...b.indices)||a.id.localeCompare(b.id));
  }
  function create({data,rotate,project,onSelect,onAlign,onMagnify,schedule}){
    const $=id=>document.getElementById(id),cache={};
    let catalogue=[],screen=[],pins=[],selected=null,hovered=null,edition='teaching';
    function status(p){
      if(p && typeof window.dispatchEvent==='function') window.dispatchEvent(new CustomEvent('kikuchi-target',{detail:p.indices.slice()}));
      $('pole-selection').textContent=p?`菊池极 ${p.label} · ${p.planes.length} 条中心线相交`:'点击线条交点，在球面保留晶向坐标。';
      $('pole-equations').textContent=p?`相交晶面 ${p.planes.slice(0,2).map(x=>planeLabel(x.hkl)).join('、')}；均满足 hu + kv + lw = 0。`:'';
      $('pole-selected-align').disabled=!p;$('pole-selected-zoom').disabled=!p;
      $('pole-pins').replaceChildren(...pins.map(item=>{
        const b=document.createElement('button');b.type='button';b.textContent=item.label;
        b.setAttribute('aria-label','选择菊池极 '+item.label);
        b.addEventListener('click',()=>{selected=item;status(item);schedule();});return b;
      }));
    }
    function nearest(point){
      let best=null,distance=12;
      for(const item of screen){const d=Math.hypot(item.xy[0]-point[0],item.xy[1]-point[1]);if(d<distance){distance=d;best=item.pole;}}
      return best;
    }
    function pin(indices){
      const reduced=reduce(indices),p=reduced&&catalogue.find(x=>x.id===reduced.join(','));
      if(!p){$('pole-selection').textContent='此晶向不是当前简明图线族的交点；仍可用“转到晶向”观察该方向。';return false;}
      selected=p;if(!pins.some(x=>x.id===p.id))pins.push(p);
      status(p);schedule();return true;
    }
    $('pole-show-labels').addEventListener('change',schedule);
    $('pole-mark-input').addEventListener('click',()=>{
      try{pin(window.KikuchiDirection.parse($('direction-input').value).input);}
      catch(error){$('pole-selection').textContent=error.message;}
    });
    $('pole-clear-pins').addEventListener('click',()=>{pins=[];selected=null;status(null);schedule();});
    $('pole-selected-align').addEventListener('click',()=>{if(selected)onAlign(selected.indices);});
    $('pole-selected-zoom').addEventListener('click',()=>{if(selected)onMagnify(selected);});
    return {
      serialize(){return pins.map(p=>p.id).join(';');},
      restore(value){
        if(!value)return;
        for(const part of value.split(';').slice(0,100)){
          try{pin(window.KikuchiDirection.parse(part).input);}catch{}
        }
      },
      update(model,nextEdition){
        edition=nextEdition;catalogue=cache[model]||(cache[model]=build(data.legends[model],data.faces));
        pins=[];selected=null;hovered=null;screen=[];status(null);
        $('pole-catalog-note').textContent=edition==='teaching'?'坐标由当前简明图的中心线交点计算。标注自动避让，点击可保留多个坐标。':'坐标层对应简明版线族，仅覆盖原图的部分交点；其他原图交点不自动索引。';
      },
      hover(point){const next=point?nearest(point):null;if(next?.id!==hovered?.id){hovered=next;schedule();}},
      select(point){
        const p=nearest(point);
        if(!p){$('pole-selection').textContent='未命中已计算的交点；请放大后点击线条交点。';return false;}
        selected=p;if(!pins.some(x=>x.id===p.id))pins.push(p);
        status(p);onSelect(p);schedule();return true;
      },
      draw(ctx,width,height){
        screen=catalogue.filter(p=>rotate(p.position)[2]>0 && rotate(p.face.normal)[2]>1e-5)
          .map(pole=>({pole,xy:project(rotate(pole.position))}))
          .filter(({xy})=>xy[0]>12&&xy[0]<width-12&&xy[1]>65&&xy[1]<height-65);
        const pinned=new Set(pins.map(p=>p.id));
        const ordered=screen.slice().sort((a,b)=>{
          const score=p=>p.id===selected?.id?3:p.id===hovered?.id?2:pinned.has(p.id)?1:0;
          return score(b.pole)-score(a.pole);
        });
        const occupied=[];ctx.save();ctx.font='600 12px ui-monospace,Consolas,monospace';ctx.textBaseline='middle';
        for(const {pole,xy:[x,y]} of ordered){
          const important=pinned.has(pole.id)||pole.id===hovered?.id;
          if(!$('pole-show-labels').checked&&!important)continue;
          ctx.beginPath();ctx.arc(x,y,important?4:2,0,Math.PI*2);ctx.fillStyle=important?'#c63329':'#176d7890';ctx.fill();
          const text=pole.label,w=ctx.measureText(text).width+10,h=20;
          let box=null;
          for(const [dx,dy] of [[8,-24],[8,7],[-w-8,-24],[-w-8,7],[8,-46],[-w-8,-46]]){
            const b=[x+dx,y+dy,w,h];
            if(b[0]<2||b[1]<50||b[0]+w>width-2||b[1]+h>height-50)continue;
            if(!occupied.some(a=>b[0]<a[0]+a[2]+3&&b[0]+w+3>a[0]&&b[1]<a[1]+a[3]+3&&b[1]+h+3>a[1])){box=b;break;}
          }
          if(!box)continue;
          // Keep unselected labels legible without filling the entire map with text.
          if(!important&&occupied.length>=32)continue;
          occupied.push(box);
          ctx.fillStyle=important?'#fff3eaff':'#ffffffee';ctx.fillRect(...box);
          ctx.strokeStyle=important?'#c63329':'#176d78';ctx.lineWidth=important?1.2:.6;ctx.strokeRect(...box);
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(box[0]+(box[0]>x?0:w),box[1]+h/2);ctx.stroke();
          ctx.fillStyle=important?'#a52620':'#155e67';ctx.fillText(text,box[0]+5,box[1]+h/2);
        }
        ctx.restore();
      }
    };
  }
  const api={planes,surface,build,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiPoleCatalog=api;
})();

