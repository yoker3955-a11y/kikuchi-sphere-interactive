/* Central (gnomonic) projection of the declared cubic center-line families.
   https://dictionary.iucr.org/Gnomonic_projection */
(() => {
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./pole-catalog.js'):window.KikuchiPoleCatalog;
  const D=typeof module!=='undefined'&&module.exports?require('./direction.js'):window.KikuchiDirection;
  const transform=(v,basis)=>[0,1,2].map(i=>v.reduce((s,n,j)=>s+n*basis[j][i],0));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function clipLine(a,b,c,limit){
    const points=[];
    function add(x,y){if(Math.abs(x)<=limit+1e-9&&Math.abs(y)<=limit+1e-9&&!points.some(p=>Math.hypot(x-p[0],y-p[1])<1e-8))points.push([x,y]);}
    if(Math.abs(b)>1e-12)for(const x of [-limit,limit])add(x,(-c-a*x)/b);
    if(Math.abs(a)>1e-12)for(const y of [-limit,limit])add((-c-b*y)/a,y);
    return points.length>=2?points.slice(0,2):null;
  }
  function projectPole(v,basis,limit){
    const r=transform(v,basis);
    if(r[2]<=1e-10)return null;
    const p=[r[0]/r[2],r[1]/r[2]];
    return p.every(n=>Math.abs(n)<=limit+1e-9)?p:null;
  }
  // Relativistic wavelength; nm, V, SI exact h/e/c and CODATA electron mass.
  const wavelength=kv=>6.62607015e-34/Math.sqrt(2*9.1093837139e-31*1.602176634e-19*kv*1000*(1+1.602176634e-19*kv*1000/(2*9.1093837139e-31*299792458**2)))*1e9;
  const siAllowed=([h,k,l])=>{
    const parity=n=>((n%2)+2)%2;
    return parity(h)===parity(k)&&parity(k)===parity(l)&&(parity(h)===1||(h+k+l)%4===0);
  };
  function siliconSpots(direction,basis,limit){
    const a=.5431,lambda=wavelength(200),out=[];
    for(let h=-8;h<=8;h++)for(let k=-8;k<=8;k++)for(let l=-8;l<=8;l++){
      const hkl=[h,k,l],n=Math.hypot(h,k,l);
      if(!n||h*direction[0]+k*direction[1]+l*direction[2]!==0||!siAllowed(hkl))continue;
      const g=n/a,t=transform(hkl,basis),sin=lambda*g;
      if(sin>=1)continue;
      // Flat ZOLZ reciprocal plane approximation: transverse momentum lambda*g,
      // outgoing longitudinal component chosen on the elastic Ewald sphere.
      const z=Math.sqrt(1-sin*sin),x=lambda*t[0]/a/z,y=lambda*t[1]/a/z;
      if(Math.abs(x)>limit||Math.abs(y)>limit)continue;
      out.push({hkl,dNm:a/n,gInvNm:g,angleDeg:Math.asin(sin)*180/Math.PI,x,y});
    }
    return out.sort((a,b)=>a.gInvNm-b.gInvNm);
  }
  function make({model,legend,faces,basis,direction,pins=[],halfAngle=35,labels=true,spots=false}){
    if(!Number.isFinite(halfAngle)||halfAngle<.25||halfAngle>75)throw new Error('半视场角应为 0.25–75°。');
    const indices=D.reduce(direction),label=D.label(indices),r=transform(indices,basis),length=Math.hypot(...r);
    if(r[2]<=0||Math.hypot(r[0],r[1])/length>1e-5)throw new Error('请先转到指定晶向，再生成二维图纸。');
    spots=spots&&model==='FCC';
    if(spots)legend=legend.map(entry=>entry.label.includes('200')?{...entry,label:entry.label.replace('200','400')}:entry);
    const limit=Math.tan(halfAngle*Math.PI/180),left=90,top=170,side=820;
    const xy=p=>[left+side/2+p[0]/limit*side/2,top+side/2-p[1]/limit*side/2];
    const shapes=[],lineRecords=[],poleRecords=[];
    const text=(x,y,value,size=15,color='#25454d',bold=false)=>shapes.push({type:'text',x,y,value,size,color,bold});
    const line=(x1,y1,x2,y2,color='#ddd',width=1,dash='')=>shapes.push({type:'line',x1,y1,x2,y2,color,width,dash});
    shapes.push({type:'rect',x:0,y:0,w:1000,h:1320,fill:'#ffffff'});
    text(90,62,'KIKUCHI CENTER-LINE MAP',27,'#155e67',true);
    text(90,100,(spots?'Si diamond | 200 kV':model)+'  |  Zone axis '+label,25,'#172e38',true);
    text(90,132,`Gnomonic projection  |  Horizontal / vertical half-field: ${halfAngle} deg`,15);
    // Angular ticks describe rotations along the horizontal/vertical center axes.
    const step=halfAngle<=2?.5:halfAngle<=5?1:halfAngle<=20?5:10;
    for(let deg=-Math.floor(halfAngle/step)*step;deg<=halfAngle;deg+=step){
      const t=Math.tan(deg*Math.PI/180),[x,y]=xy([t,t]);
      line(x,top,x,top+side,'#e1e7e7',.7);line(left,y,left+side,y,'#e1e7e7',.7);
      text(x-10,top+side+24,String(deg),12);text(left-40,y+4,String(deg),12);
    }
    for(const plane of C.planes(legend)){
      const abc=transform(plane.normal,basis),segment=clipLine(...abc,limit);
      if(!segment)continue;
      const style=legend.find(l=>l.label===plane.family),a=xy(segment[0]),b=xy(segment[1]);
      line(...a,...b,style.color,1.5,style.dash||'');lineRecords.push({hkl:plane.hkl,family:plane.family,abc,segment});
    }
    const catalogue=C.build(legend,faces),pinned=new Set(pins),occupied=[];
    const priority=p=>p.id===indices.join(',')?2:Number(pinned.has(p.id));
    const ordered=catalogue.slice().sort((a,b)=>priority(b)-priority(a));
    let labelCount=0,visiblePins=0;
    for(const p of ordered){
      const projected=projectPole(p.indices,basis,limit);if(!projected)continue;
      const [x,y]=xy(projected),important=pinned.has(p.id),central=Math.hypot(...projected)<1e-8;
      if(important)visiblePins++;
      poleRecords.push({indices:p.indices,x:projected[0],y:projected[1],pinned:important});
      if(!labels&&!important&&!central)continue;
      shapes.push({type:'circle',x,y,r:important?4:2.3,fill:important?'#bd3329':'#155e67'});
      if(!important&&!central&&labelCount>=55)continue;
      const size=important||central?17:14,w=p.label.length*size*.63+10,h=size+8;
      let box;
      for(const [dx,dy] of [[8,-h-5],[8,6],[-w-8,-h-5],[-w-8,6],[8,26],[-w-8,26]]){
        const b=[x+dx,y+dy,w,h];
        if(b[0]<left+1||b[1]<top+1||b[0]+w>left+side-1||b[1]+h>top+side-1)continue;
        if(!occupied.some(a=>b[0]<a[0]+a[2]+3&&b[0]+w+3>a[0]&&b[1]<a[1]+a[3]+3&&b[1]+h+3>a[1])){box=b;break;}
      }
      if(!box)continue;
      occupied.push(box);labelCount++;
      shapes.push({type:'rect',x:box[0],y:box[1],w,h,fill:'#ffffff'});
      text(box[0]+5,box[1]+h-6,p.label,size,important?'#bd3329':'#183b42',important||central);
    }
    const reflections=spots?siliconSpots(indices,basis,limit):[];
    if(spots){
      const spotBoxes=[];
      for(const spot of [{hkl:[0,0,0],x:0,y:0},...reflections]){
        const [x,y]=xy([spot.x,spot.y]);
        shapes.push({type:'circle',x,y,r:spot.gInvNm?4:5,fill:'#8b238d'});
        const value='('+spot.hkl.join(' ')+')',w=value.length*7;
        if(x+w+10<left+side&&y-14>top&&!spotBoxes.some(b=>Math.abs(b[1]-(y-14))<14&&x+7<b[0]+b[2]&&x+w+7>b[0])){text(x+7,y-7,value,11,'#8b238d');spotBoxes.push([x+7,y-14,w]);}
      }
    }
    line(left,top,left+side,top,'#526d73',1);line(left+side,top,left+side,top+side,'#526d73',1);
    line(left+side,top+side,left,top+side,'#526d73',1);line(left,top+side,left,top,'#526d73',1);
    const [cx,cy]=xy([0,0]);line(cx-7,cy,cx+7,cy,'#111111',1.3);line(cx,cy-7,cx,cy+7,'#111111',1.3);
    text(90,1050,'Plane families',16,'#155e67',true);
    legend.forEach((entry,i)=>{const x=90+(i%4)*210,y=1080+Math.floor(i/4)*30;line(x,y-5,x+30,y-5,entry.color,2,entry.dash||'');text(x+39,y,entry.label,15);});
    const forward=basis.map(v=>v[2]),right=basis.map(v=>v[0]),up=basis.map(v=>v[1]);
    const fmt=v=>v.map(n=>(Math.abs(n)<.0000005?0:n).toFixed(6)).join(', ');
    text(90,1155,`Center [uvw]: ${label}   |   ${lineRecords.length} lines   |   ${poleRecords.length} poles in field`,14);
    text(90,1180,`Screen right (crystal XYZ): ${fmt(right)}`,13);
    text(90,1202,`Screen up (crystal XYZ):    ${fmt(up)}`,13);
    text(90,1234,spots?'Si a=0.5431 nm | 200 kV | wavelength='+wavelength(200).toFixed(7)+' nm':'Geometric center lines only; no band width or intensity simulation.',13);
    text(90,1256,spots?'ZOLZ approximation; |h,k,l|<=8. Equal spot sizes; no intensity / dynamical simulation.':'Families: teaching FCC/BCC map. Ticks: angle from center along each axis (deg).',12);
    text(90,1280,'Kikuchi Sphere project | Original layout: Austin P. Day | CC BY-NC-SA 3.0',11);
    const metadata={reflections,material:spots?'Si':null,voltageKV:spots?200:null,latticeNm:spots?.5431:null,wavelengthNm:spots?wavelength(200):null,model,direction:indices,basis,forward,halfAngle,projection:'gnomonic',scope:'teaching-center-line-families',lines:lineRecords,poles:poleRecords,pinsOutside:pins.filter(id=>!poleRecords.some(p=>p.indices.join(',')===id)),visiblePins};
    return {shapes,metadata,name:`Kikuchi_${spots?'Si200kV':model}_${indices.join('_')}_half${halfAngle}deg`};
  }
  function svg(scene){
    const elements=scene.shapes.map(s=>{
      if(s.type==='text')return `<text x="${s.x}" y="${s.y}" font-size="${s.size}" font-weight="${s.bold?700:400}" fill="${s.color}">${esc(s.value)}</text>`;
      if(s.type==='rect')return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill}"/>`;
      if(s.type==='circle')return `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.fill}"/>`;
      return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.color}" stroke-width="${s.width}"${s.dash?` stroke-dasharray="${s.dash}"`:''}/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="277.2mm" viewBox="0 0 1000 1320" font-family="Arial,Helvetica,sans-serif"><title>${esc(scene.name)}</title><metadata>${esc(JSON.stringify(scene.metadata))}</metadata>${elements.join('')}</svg>`;
  }
  function pdf(scene){
    const rgb=hex=>hex.slice(1).match(/../g).map(v=>(parseInt(v,16)/255).toFixed(4)).join(' ');
    const f=n=>Number(n.toFixed(5)),escape=s=>s.replace(/([\\()])/g,'\\$1');
    // The same scene as the SVG, fitted to A4; text matrices undo the Y flip.
    const commands=['q','0.565 0 0 -0.565 15 794 cm'];
    for(const s of scene.shapes){
      if(s.type==='text')commands.push(`${rgb(s.color)} rg BT /${s.bold?'F2':'F1'} ${s.size} Tf 1 0 0 -1 ${f(s.x)} ${f(s.y)} Tm (${escape(s.value)}) Tj ET`);
      else if(s.type==='rect')commands.push(`${rgb(s.fill)} rg ${f(s.x)} ${f(s.y)} ${f(s.w)} ${f(s.h)} re f`);
      else if(s.type==='line')commands.push(`${rgb(s.color)} RG ${s.width} w [${s.dash}] 0 d ${f(s.x1)} ${f(s.y1)} m ${f(s.x2)} ${f(s.y2)} l S`);
      else {
        const {x,y,r}=s,k=r*.55228475;
        commands.push(`${rgb(s.fill)} rg ${f(x+r)} ${f(y)} m ${f(x+r)} ${f(y+k)} ${f(x+k)} ${f(y+r)} ${f(x)} ${f(y+r)} c ${f(x-k)} ${f(y+r)} ${f(x-r)} ${f(y+k)} ${f(x-r)} ${f(y)} c ${f(x-r)} ${f(y-k)} ${f(x-k)} ${f(y-r)} ${f(x)} ${f(y-r)} c ${f(x+k)} ${f(y-r)} ${f(x+r)} ${f(y-k)} ${f(x+r)} ${f(y)} c f`);
      }
    }
    commands.push('Q');const stream=commands.join('\n');
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let out='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
    const xref=out.length;out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(const offset of offsets.slice(1))out+=String(offset).padStart(10,'0')+' 00000 n \n';
    out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(out);
  }
  function attach(getState){
    const $=id=>document.getElementById(id),dialog=$('planar-dialog');let state=null,scene=null,urls=[];
    function refresh(){
      try{
        scene=make({...state,halfAngle:Number($('planar-angle').value),labels:$('planar-labels').checked,spots:$('planar-spots')?.checked});
        urls.forEach(url=>URL.revokeObjectURL(url));urls=[];
        const link=(bytes,type)=>{const url=URL.createObjectURL(new Blob([bytes],{type}));urls.push(url);return url;};
        const svgUrl=link(svg(scene),'image/svg+xml');$('planar-preview').src=svgUrl;
        $('planar-svg').href=svgUrl;$('planar-svg').download=scene.name+'.svg';
        $('planar-pdf').href=link(pdf(scene),'application/pdf');$('planar-pdf').download=scene.name+'.pdf';
        $('planar-title').textContent=(scene.metadata.material?'Si · 200 kV':state.model)+' '+D.label(scene.metadata.direction)+' 二维菊池线图';
        $('planar-status').textContent=`${scene.metadata.lines.length} 条中心线，视场内 ${scene.metadata.poles.length} 个交点。`+(scene.metadata.pinsOutside.length?` ${scene.metadata.pinsOutside.length} 个已选极在视场外，可增大视场。`:'');
        if($('planar-reflections')){
          const select=$('planar-reflections');select.replaceChildren();
          for(const spot of scene.metadata.reflections){const option=document.createElement('option');option.value=spot.hkl.join(',');option.textContent='('+spot.hkl.join(' ')+')';select.appendChild(option);}
          $('planar-spot-controls').hidden=!scene.metadata.material;
          showSpot();
          if(scene.metadata.material)$('planar-status').textContent+=` ${scene.metadata.reflections.length} 个 Si 允许反射（不含 000）；紫色为衍射斑点。`;
        }
      }catch(error){$('planar-status').textContent=error.message;}
    }
    function showSpot(){
      const spot=scene?.metadata.reflections.find(s=>s.hkl.join(',')===$('planar-reflections').value);
      $('planar-spot-info').textContent=spot?`(${spot.hkl.join(' ')})：d = ${spot.dNm.toFixed(5)} nm；|g| = ${spot.gInvNm.toFixed(4)} nm⁻¹；散射角 ≈ ${spot.angleDeg.toFixed(4)}°。`:'当前视场和指数范围内无允许的非零反射，可增大视场或选择较低指数晶向。';
    }
    $('planar-reflections')?.addEventListener('change',showSpot);
    $('planar-spots')?.addEventListener('change',()=>{if($('planar-spots').checked)$('planar-angle').value='2';refresh();});
    $('planar-open').addEventListener('click',()=>{
      try{state=getState();if(!state.direction)throw new Error('请先输入晶向并点击“转到晶向”，再生成二维图纸。');if($('planar-spots')){$('planar-spots').disabled=state.model!=='FCC';if(state.model!=='FCC')$('planar-spots').checked=false;}refresh();dialog.showModal();$('export-status').textContent='';}
      catch(error){$('export-status').textContent=error.message;}
    });
    $('planar-close').addEventListener('click',()=>dialog.close());
    $('planar-angle').addEventListener('change',refresh);$('planar-labels').addEventListener('change',refresh);
    $('planar-png').addEventListener('click',async()=>{
      const snapshot=scene,button=$('planar-png');button.disabled=true;
      let url;
      try{
        url=URL.createObjectURL(new Blob([svg(snapshot)],{type:'image/svg+xml'}));
        const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
        const canvas=document.createElement('canvas');canvas.width=2480;canvas.height=3274;
        canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error();
        const output=URL.createObjectURL(blob),a=document.createElement('a');a.href=output;a.download=snapshot.name+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(output),30000);
        $('planar-status').textContent='PNG 已生成（2480 × 3274 像素）。';
      }catch{$('planar-status').textContent='PNG 未能生成，请使用 PDF 或 SVG 下载。';}
      finally{if(url)URL.revokeObjectURL(url);button.disabled=false;}
    });
  }
  const api={wavelength,siAllowed,siliconSpots,transform,clipLine,projectPole,make,svg,pdf,attach};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiPlanar=api;
})();
