/* Browser-only navigation. All angles are a calibrated geometric model. */
(() => {
  'use strict';
  const E=window.KikuchiTilt,D=window.KikuchiDirection,P=window.KikuchiPlanar,C=window.KikuchiPoleCatalog,M=window.KikuchiPlaneMetrics,T=window.KikuchiTiltMaterials;
  if(!E||!D||!P||!C||!M||!T)return;
  const section=document.createElement('section');section.className='control-block';
  section.innerHTML='<h2>α / β 带轴导航</h2><button id="tilt-open" type="button">打开双倾导航</button><p class="detail">由已知带轴与参考斑点配准，求解指定目标；支持晶面平行电子束。独立于拖动观察视角。</p>';
  document.getElementById('download-block').before(section);
  const dialog=document.createElement('dialog');dialog.id='tilt-dialog';dialog.setAttribute('aria-labelledby','tilt-title');
  dialog.innerHTML=`<div class="pole-header"><h2 id="tilt-title">双倾导航 · 多材料几何模型</h2><button id="tilt-close" type="button">关闭导航</button></div>
  <p>电子束固定沿 +Z；α 绕固定 X 轴，β 绕随 α 运动的 Y 轴。显示角度不直接控制电镜；加速电压与相机长度用于衍射几何标尺。</p>
  <div class="tilt-layout"><div>
  <fieldset><legend>材料 / 衍射标尺</legend><label>材料与晶相<select id="tilt-material"></select></label><div class="tilt-pair"><label>晶格常数 a / nm<input id="tilt-lattice-a" type="number" min="0.1" max="2" step="0.00001" value="0.5431"></label><label>晶格常数 c / nm<input id="tilt-lattice-c" type="number" min="0.1" max="3" step="0.00001" value="0.5431"></label></div><div class="tilt-pair"><label>加速电压 / kV<input id="tilt-kv" type="number" min="40" max="1000" step="1" value="200"></label><label>有效相机长度 / mm<input id="tilt-camera" type="number" min="10" max="5000" step="1" value="1000"></label></div><p id="tilt-material-note" class="detail"></p><small>当前内置库覆盖常见 FCC、BCC、金刚石和 HCP 元素相；可编辑晶格常数。相机长度须以本机衍射标尺校准。</small></fieldset>
  <fieldset><legend>1 当前参考状态</legend>
  <label>已知晶带轴 [uvw]<input id="tilt-zone" value="1 1 0"></label>
  <label>参考反射 (hkl)<input id="tilt-ref" value="2 -2 0"></label>
  <label>000 → 参考斑点的屏幕方位 °<input id="tilt-phi" type="number" value="0" step="0.1"></label>
  <small>屏幕向右为 0°，向上为 +90°；参考反射必须属于当前带轴。</small>
  <div class="tilt-pair"><label>参考 α₀ °<input id="tilt-a0" type="number" value="0" step="0.1"></label><label>参考 β₀ °<input id="tilt-b0" type="number" value="0" step="0.1"></label></div>
  <details><summary>样品杆标定与限位</summary><label><input id="tilt-combined" type="checkbox" checked> 启用组合限位：|α| + |β| ≤ 30°</label><p>勾选时按机台绝对读数判断（含等号）；取消勾选时仅检查单轴限位。同时满足下方单轴范围；单轴默认值仍需核对。轴方向、屏幕旋转须由实测标定。</p>
  <label>α 正轴在屏幕的方位 °<input id="tilt-azimuth" type="number" value="0" step="0.1"></label><small>绕束向的机台轴配准；向右为 0°。与上方参考斑点方位分别测量。</small>
  <div class="tilt-pair"><label>α 最小 °<input id="tilt-amin" type="number" value="-35"></label><label>α 最大 °<input id="tilt-amax" type="number" value="35"></label><label>β 最小 °<input id="tilt-bmin" type="number" value="-30"></label><label>β 最大 °<input id="tilt-bmax" type="number" value="30"></label></div>
  <label>α 读数方向<select id="tilt-sa"><option value="1">同右手正向</option><option value="-1">反向</option></select></label><label>β 读数方向<select id="tilt-sb"><option value="1">同右手正向</option><option value="-1">反向</option></select></label></details>
  <button id="tilt-init" type="button">建立参考取向</button></fieldset>
  <fieldset><legend>2 指定目标</legend><label>目标条件<select id="tilt-mode"><option value="zone">晶带轴平行电子束</option><option value="plane">晶面平行电子束</option></select></label><label>目标指数<input id="tilt-target" value="1 2 1"></label>
  <label><input id="tilt-equivalents" type="checkbox"> 同时计算对称等价晶带轴</label><small id="tilt-equivalents-help">仅适用于当前内置立方相：如 [112]、[121] 属于同一晶向族，但所需倾角不同。HCP 相不会套用立方对称操作。</small>
  <button id="tilt-solve" type="button">计算目标 α / β</button><p id="tilt-result" role="status"></p>
  <div id="tilt-equivalent-results" hidden></div><button id="tilt-play" type="button" disabled>播放倾转</button> <button id="tilt-stop" type="button">停止</button> <button id="tilt-go" type="button" disabled>到达计算终点</button>
  </fieldset><fieldset><legend>3 手动倾转与路径检查</legend>
  <label>α °<input id="tilt-a" type="number" value="0" step="0.1"><input id="tilt-ar" aria-label="α 滑块" type="range" min="-35" max="35" step="0.01" value="0"></label>
  <label>β °<input id="tilt-b" type="number" value="0" step="0.1"><input id="tilt-br" aria-label="β 滑块" type="range" min="-30" max="30" step="0.01" value="0"></label>
  <button id="tilt-reset" type="button">回到参考 α₀ / β₀</button><p id="tilt-error" role="status"></p></fieldset>
  </div><div class="tilt-map"><label>半视场角<select id="tilt-field"><option value="2">±2° 衍射细节</option><option value="5">±5° 精调</option><option value="35" selected>±35° 导航</option><option value="60">±60° 广角</option></select></label>
  <label><input id="tilt-spots" type="checkbox" checked> 显示材料衍射位置</label><label><input id="tilt-spot-labels" type="checkbox" checked> 标注衍射斑点 (hkl)</label><label>查询当前衍射斑点<select id="tilt-spot-select"><option value="">选择斑点</option></select></label><p id="tilt-spot-info" role="status">可点击紫色斑点查看晶面指数。</p><fieldset class="tilt-plane-query"><legend>从当前衍射斑点任选两晶面</legend><label>晶面 A<select id="tilt-plane-first"></select></label><label>晶面 B<select id="tilt-plane-second"></select></label><p id="tilt-plane-result" role="status">选择两项后显示 d 值与晶面夹角。</p><small>仅列出当前视场内、符合所选晶相结构因子的反射。相机长度用于估算屏幕半径；夹角取晶面法向的 0–90° 锐角。</small></fieldset><canvas id="tilt-canvas" width="800" height="800" aria-label="随双倾角实时更新的菊池中心线、菊池极和材料衍射位置"></canvas>
  <p>青色为当前材料允许反射的几何中心线，红色为目标；紫色为衍射位置及对应 (hkl) 指数；可点击或从列表查询。密集时切换到 ±2° 或 ±5° 查看。000 固定在图中央。目标晶面模式将该面中心线通过 000。</p>
  <p class="detail">反射按所选材料/晶相的理想结构因子及 |h|、|k|、|l| ≤ 6 筛选，以弹性球径向偏离 ≤ 0.15 nm⁻¹ 显示离轴反射；透明度仅表示几何接近程度，不是强度。未模拟带宽、动力学、多重散射和样品遮挡。</p>
  <p class="detail">参考 <a href="https://github.com/din14970/ALPHABETA-TEM-tilting-suite" target="_blank" rel="noopener">ALPHABETA</a> 与 <a href="https://mompiou.github.io/pycotem/stereoproj/" target="_blank" rel="noopener">pycotem</a> 的问题定义；本模块由旋转方程独立实现，未复制其源码。</p>
  </div></div>`;
  dialog.querySelector('.tilt-layout').before(dialog.querySelector('#tilt-equivalent-results'));
  document.body.append(dialog);
  const style=document.createElement('style');style.textContent=`#tilt-dialog{width:min(1480px,99vw);max-width:99vw;height:96vh;max-height:96vh;box-sizing:border-box;overflow:auto;border:1px solid #aebfc2;border-radius:16px;padding:12px 16px;color:#17383e}#tilt-dialog::backdrop{background:#203b4990}.tilt-layout{display:grid;grid-template-columns:minmax(340px,430px) minmax(0,1fr);gap:16px;align-items:start}#tilt-dialog fieldset{border:1px solid #cad8da;border-radius:8px;margin:8px 0;padding:10px}#tilt-dialog label{display:block;margin:5px 0}#tilt-dialog input:not([type=checkbox]),#tilt-dialog select{display:block;box-sizing:border-box;width:100%;padding:5px;margin-top:3px}#tilt-dialog button{margin-top:5px;padding:7px}.tilt-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tilt-map{min-width:0}.tilt-map canvas{display:block;width:min(100%,58vh);height:auto;touch-action:manipulation;border:1px solid #ccd8db;margin:4px auto}.tilt-map>p{margin:8px 0}#tilt-dialog small{display:block;line-height:1.4;color:#45616a}#tilt-result,#tilt-error,#tilt-plane-result{white-space:pre-line;font-weight:600;margin:7px 0}#tilt-dialog legend{font-weight:700}#tilt-equivalent-results{overflow:auto;max-height:320px;margin:8px 0}#tilt-equivalent-results table{border-collapse:collapse;font-size:13px;white-space:nowrap}#tilt-equivalent-results th,#tilt-equivalent-results td{padding:6px;border:1px solid #cad8da;text-align:right}#tilt-equivalent-results th{background:#edf5f6}#tilt-equivalent-results caption{text-align:left;white-space:normal;font-weight:600;padding:6px 0}@media(max-width:760px){.tilt-layout{grid-template-columns:1fr}#tilt-dialog{padding:10px}.tilt-map{order:-1}.tilt-map canvas{width:min(100%,52vh)}}`;
  document.head.append(style);
  const $=id=>document.getElementById('tilt-'+id),canvas=$('canvas'),ctx=canvas.getContext('2d');
  const data=window.KIKUCHI_MODEL,planes=C.planes(data.legends.FCC),poles=C.build(data.legends.FCC,data.faces);
  let config=null,base=null,a=0,b=0,goal=null,raf=0,hit=[],spotHit=[],selectedSpot='',material=null;
  function selectedMaterial(){return T.create($('material').value,{a:Number($('lattice-a').value),c:Number($('lattice-c').value)});}
  function targetVector(text,mode){const indices=D.parse(text).reduced;return {indices,vector:mode==='plane'?material.g(indices):material.zone(indices)};}
  function applyMaterial(){
    const phase=T.byId($('material').value);$('lattice-a').value=phase.a;$('lattice-c').value=phase.c||phase.a;
    $('lattice-c').disabled=phase.system==='cubic';$('zone').value=phase.zone.join(' ');$('ref').value=phase.reflection.join(' ');material=selectedMaterial();
    $('material-note').textContent=`${phase.label} · ${phase.system==='cubic'?'立方':'六方'}晶系 · ${phase.rule==='diamond'?'金刚石结构消光':phase.rule.toUpperCase()+' 结构允许反射'}。`;
    $('equivalents').disabled=phase.system!=='cubic';if(phase.system!=='cubic')$('equivalents').checked=false;$('equivalents-help').textContent=phase.system==='cubic'?'适用于当前立方相：如 [112]、[121] 属于同一晶向族，但所需倾角不同。':'当前 HCP 相不使用立方对称等价晶向；为避免错误结果，该选项已关闭。';
    base=null;clearGoal();$('result').textContent='材料已更新，请建立参考取向。';
  }
  function populateMaterials(){for(const phase of T.phases)$('material').append(new Option(phase.label,phase.id));$('material').value='si';applyMaterial();}
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function clearGoal(){goal=null;$('equivalent-results').replaceChildren();$('equivalent-results').hidden=true;$('play').disabled=$('go').disabled=true;}
  function number(id){const raw=$(id).value.trim(),n=Number(raw);if(!raw||!Number.isFinite(n))throw Error('请输入有效角度。');return n;}
  function args(){return {base,target:targetVector($('target').value,$('mode').value).vector,...config,a,b,mode:$('mode').value};}
  function sync(){for(const [key,value,other]of [['a',a,b],['b',b,a]]){const remaining=config.combined?Math.max(0,30-Math.abs(other)):Infinity;for(const id of [key,key+'r']){$(id).min=Math.max(config[key+'min'],-remaining);$(id).max=Math.min(config[key+'max'],remaining);}$(key).value=value.toFixed(4);$(key+'r').value=value;}}
  function render(){
    const cubicEquivalents=material.system==='cubic'&&$('mode').value==='zone';$('equivalents').disabled=!cubicEquivalents;if(!cubicEquivalents)$('equivalents').checked=false;
    if(!base)return;
    const u=E.mm(E.rz(config.azimuth),E.orientation(base,a,b,config.a0,config.b0,config.sa,config.sb)),basis=E.tr(u),lim=Math.tan(number('field')*Math.PI/180);
    const xy=p=>[400+p[0]/lim*340,400-p[1]/lim*340];
    ctx.fillStyle='#fff';ctx.fillRect(0,0,800,800);ctx.strokeStyle='#d4dfe1';ctx.strokeRect(60,60,680,680);
    ctx.save();ctx.beginPath();ctx.rect(60,60,680,680);ctx.clip();
    const line=(segment,color,width=1)=>{if(!segment)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...xy(segment[0]));ctx.lineTo(...xy(segment[1]));ctx.stroke();};
    for(const reflection of material.reflections(2).slice(0,36))line(P.clipLine(...E.mv(u,reflection.g),lim),'#408e9690');
    hit=[];ctx.font='16px sans-serif';
    spotHit=[];
    if($('spots').checked){
      const lambda=P.wavelength(number('kv')),k=1/lambda,camera=number('camera');
      for(const reflection of material.reflections(6)){
        const g=E.mv(u,reflection.g),s=Math.abs(Math.hypot(g[0],g[1],k+g[2])-k);
        if(s>.15||k+g[2]<=0)continue;
        const pt=[g[0]/(k+g[2]),g[1]/(k+g[2])];if(pt.some(v=>Math.abs(v)>lim))continue;
        const [x,y]=xy(pt),screenMm=camera*Math.hypot(...pt);spotHit.push({x,y,hkl:reflection.hkl,id:reflection.hkl.join(','),dNm:reflection.dNm,gCrystal:reflection.g,screenMm});ctx.globalAlpha=.3+.7*(1-s/.15);ctx.fillStyle='#932198';ctx.beginPath();ctx.arc(x,y,number('field')<=5?5:2.5,0,Math.PI*2);ctx.fill();
      }ctx.globalAlpha=1;
      const occupied=[{x:395,y:390,w:48,h:36}];ctx.font='14px sans-serif';
      for(const p of spotHit.slice().sort((a,b)=>Number(b.id===selectedSpot)-Number(a.id===selectedSpot))){
        const selected=p.id===selectedSpot;
        if(selected){ctx.strokeStyle='#932198';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.stroke();}
        if(!$('spot-labels').checked&&!selected)continue;
        const value='('+p.hkl.join(' ')+')',w=ctx.measureText(value).width+6,h=20;
        const offsets=[[9,-23],[9,8],[-w-9,-23],[-w-9,8],[9,-44],[-w-9,29],[9,29],[-w-9,-44]];
        const candidates=offsets.map(([dx,dy])=>({x:Math.max(62,Math.min(738-w,p.x+dx)),y:Math.max(62,Math.min(738-h,p.y+dy)),w,h}));
        const score=b=>occupied.reduce((n,a)=>n+Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)),0);
        candidates.sort((a,b)=>score(a)-score(b));const box=candidates[0];occupied.push(box);
        ctx.strokeStyle='#b567b8';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(Math.max(box.x,Math.min(box.x+w,p.x)),Math.max(box.y,Math.min(box.y+h,p.y)));ctx.stroke();
        ctx.fillStyle='#fffffff0';ctx.fillRect(box.x,box.y,w,h);ctx.fillStyle=selected?'#65066a':'#932198';ctx.fillText(value,box.x+3,box.y+15);
      }
    }
    const select=$('spot-select'),ids=spotHit.map(p=>p.id).join(';');
    if(select.dataset.ids!==ids){select.replaceChildren(new Option('选择斑点',''),...spotHit.map(p=>new Option('('+p.hkl.join(' ')+')',p.id)));select.dataset.ids=ids;}
    const selected=spotHit.find(p=>p.id===selectedSpot);if(!selected)selectedSpot='';select.value=selectedSpot;
    updatePlaneChoices();
    $('spot-info').textContent=selected?`所选反射 (${selected.hkl.join(' ')})：d = ${selected.dNm.toFixed(5)} nm；屏幕半径 ≈ ${selected.screenMm.toFixed(2)} mm（按有效相机长度）。`:`当前显示 ${spotHit.length} 个非零允许反射；点击紫色斑点或从列表查询 (hkl)。`;

    ctx.fillStyle='#252938';ctx.beginPath();ctx.arc(400,400,5,0,Math.PI*2);ctx.fill();ctx.fillText('000',409,420);
    try{
      const target=targetVector($('target').value,$('mode').value),mode=$('mode').value;
      if(mode==='plane')line(P.clipLine(...E.mv(u,target.vector),lim),'#bd3329',3);
      else {const pt=P.projectPole(target.vector,basis,lim);if(pt){const [x,y]=xy(pt);ctx.strokeStyle='#bd3329';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#bd3329';ctx.fillText('目标 '+D.label(target.indices),x+13,y+20);}}
      $('error').textContent=`当前 α ${a.toFixed(3)}° / β ${b.toFixed(3)}°\n${config.combined?`组合占用 ${(Math.abs(a)+Math.abs(b)).toFixed(3)}° / 30°`:'组合限位未启用，仅检查单轴范围'}\n${mode==='zone'?'目标带轴失配':'晶面偏离平行'} ${E.residual(u,target.vector,mode).toFixed(5)}°`;
    }catch(e){$('error').textContent=e.message;}
    ctx.restore();ctx.fillStyle='#25454d';ctx.font='18px sans-serif';ctx.fillText('固定束向 +Z · 屏幕 X 向右 / Y 向上',60,34);
    ctx.fillText(`α ${a.toFixed(3)}°   β ${b.toFixed(3)}°   半视场 ±${number('field')}°`,60,777);
    if(window.KikuchiStageView)window.KikuchiStageView(E.quaternion(u));
  }
  function guard(fn){return ()=>{try{fn();}catch(e){$('error').textContent=e.message;}};}
  function showPlanePair(){
    const first=spotHit.find(p=>p.id===$('plane-first').value),second=spotHit.find(p=>p.id===$('plane-second').value);
    if(!first||!second){$('plane-result').textContent='当前视场内至少需要两个允许反射。可增大半视场或调整倾转。';return;}
    const cosine=Math.min(1,Math.max(0,Math.abs(E.dot(first.gCrystal,second.gCrystal)/(Math.hypot(...first.gCrystal)*Math.hypot(...second.gCrystal)))));
    $('plane-result').textContent=`晶面 A (${first.hkl.join(' ')})：d = ${first.dNm.toFixed(5)} nm\n晶面 B (${second.hkl.join(' ')})：d = ${second.dNm.toFixed(5)} nm\n两晶面夹角 φ = ${(Math.acos(cosine)*180/Math.PI).toFixed(4)}°（锐角）`;
  }
  function updatePlaneChoices(){
    const firstSelect=$('plane-first'),secondSelect=$('plane-second'),ids=spotHit.map(p=>p.id).join(';');
    if(firstSelect.dataset.ids===ids){showPlanePair();return;}
    const previousFirst=firstSelect.value,previousSecond=secondSelect.value,options=spotHit.map(p=>new Option('('+p.hkl.join(' ')+')',p.id));
    firstSelect.replaceChildren(...options.map(option=>option.cloneNode(true)));secondSelect.replaceChildren(...options);
    const fallbackFirst=selectedSpot||spotHit[0]?.id||'',fallbackSecond=spotHit.find(p=>p.id!==fallbackFirst)?.id||fallbackFirst;
    firstSelect.value=spotHit.some(p=>p.id===previousFirst)?previousFirst:fallbackFirst;
    secondSelect.value=spotHit.some(p=>p.id===previousSecond)?previousSecond:fallbackSecond;
    firstSelect.dataset.ids=secondSelect.dataset.ids=ids;showPlanePair();
  }
  function initialize(){
    stop();clearGoal();base=null;
    material=selectedMaterial();
    const c={combined:$('combined').checked};for(const key of ['a0','b0','amin','amax','bmin','bmax','sa','sb','azimuth'])c[key]=number(key);
    if(c.amin>=c.amax||c.bmin>=c.bmax||Math.max(...[c.amin,c.amax,c.bmin,c.bmax].map(Math.abs))>180)throw Error('限位应递增并位于 ±180° 内。');
    if(!E.withinLimits(c.a0,c.b0,c))throw Error(c.combined?'参考读数超出限位：必须同时满足单轴范围及 |α₀| + |β₀| ≤ 30°。':'参考读数超出单轴限位。');
    const reflection=D.parse($('ref').value);
    if(!material.allowed(reflection.input))throw Error('参考反射不满足当前材料/晶相的允许反射条件。请检查 (hkl) 或切换相结构。');
    const next=E.reference(material.zone(D.parse($('zone').value).reduced),material.g(reflection.reduced),number('phi')-c.azimuth);
    config=c;base=next;a=c.a0;b=c.b0;
    for(const key of ['a','b'])for(const id of [key,key+'r']){$(id).min=c[key+'min'];$(id).max=c[key+'max'];}
    sync();$('result').textContent='参考取向已建立。选择目标后计算。';render();
  }
  $('open').onclick=()=>{dialog.showModal();if(!base)guard(initialize)();else render();};
  $('close').onclick=()=>{stop();dialog.close();};dialog.addEventListener('close',stop);
  populateMaterials();
  $('init').onclick=guard(initialize);
  function showEquivalents(){
    if(material.system!=='cubic'||$('mode').value!=='zone')return;
    const options={...args(),mode:'zone'},rawTarget=D.parse($('target').value).reduced;
    const rows=E.cubicEquivalents(rawTarget).map(indices=>{const target=material.zone(indices),solution=E.solve({...options,target}),geometric=solution||E.solve({...options,target,amin:-180,amax:180,bmin:-180,bmax:180,combined:false});return {indices,solution,geometric};}),host=$('equivalent-results');host.replaceChildren();host.hidden=false;
    const table=document.createElement('table'),caption=table.createCaption();
    caption.textContent=`共 ${rows.length} 个等价方向，${rows.filter(r=>r.solution).length} 个在当前限位内可达。Δ 相对本次计算起点 α=${a.toFixed(3)}°、β=${b.toFixed(3)}°；超限行仅列几何解，不可采用。每个方向列一个较近解。`;
    const head=table.createTHead().insertRow();for(const text of ['带轴 [uvw]','α / °','β / °','Δα / °','Δβ / °','|α|+|β| / °','状态','操作']){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);}
    const body=table.createTBody();
    rows.sort((x,y)=>Number(!!y.solution)-Number(!!x.solution)||(x.geometric?.cost??Infinity)-(y.geometric?.cost??Infinity));
    for(const row of rows){
      const tr=body.insertRow(),s=row.geometric,fmt=x=>Math.abs(x)<.00005?'0.0000':x.toFixed(4);
      for(const text of [D.label(row.indices),s?fmt(s.a):'—',s?fmt(s.b):'—',s?fmt(s.a-a):'—',s?fmt(s.b-b):'—',s?fmt(Math.abs(s.a)+Math.abs(s.b)):'—',row.solution?'可达':s?'超限（几何解）':'无解'])tr.insertCell().textContent=text;
      const button=document.createElement('button');button.type='button';button.textContent='采用 '+D.label(row.indices);button.disabled=!row.solution;button.onclick=guard(()=>{$('target').value=row.indices.join(' ');calculate();});tr.insertCell().append(button);
    }
    host.append(table);
  }
  function calculate(){stop();clearGoal();if(!base)throw Error('请先建立参考取向。');goal=E.solve(args());$('result').textContent=goal?`目标 α ${goal.a.toFixed(4)}° / β ${goal.b.toFixed(4)}°\n增量 Δα ${(goal.a-a).toFixed(4)}° / Δβ ${(goal.b-b).toFixed(4)}°\n${$('mode').value==='plane'?'已选取较近的可行晶面解；不是唯一解。':'指定目标可达；未替换等价方向。'}\n${config.combined?'已检查单轴及 |α| + |β| ≤ 30°':'组合限位未启用，仅检查单轴范围'}；动画采用同步直线路径。实际机台路径仍须核对。`:(config.combined?'当前约束下未找到可行解（单轴范围及 |α| + |β| ≤ 30°）。请检查目标与参考取向。':'当前单轴范围内未找到可行解。组合限位未启用。');$('play').disabled=$('go').disabled=!goal;render();if($('equivalents').checked&&$('mode').value==='zone')showEquivalents();}
  $('solve').onclick=guard(calculate);
  $('go').onclick=guard(()=>{stop();if(goal){if(!E.withinLimits(goal.a,goal.b,config))throw Error('目标超出已启用的限位。');a=goal.a;b=goal.b;sync();render();}});
  $('play').onclick=()=>{if(!goal)return;stop();const start=performance.now(),aa=a,bb=b,dest={...goal};const tick=time=>{if(!dialog.open||document.hidden){stop();return;}const t=Math.min(1,(time-start)/2200);const nextA=aa+(dest.a-aa)*t,nextB=bb+(dest.b-bb)*t;if(!E.withinLimits(nextA,nextB,config)){stop();$('error').textContent='路径超出已启用的限位，已停止。';return;}a=nextA;b=nextB;sync();render();if(t<1)raf=requestAnimationFrame(tick);else raf=0;};raf=requestAnimationFrame(tick);};
  $('stop').onclick=stop;$('reset').onclick=guard(()=>{stop();if(!base)throw Error('请先建立参考取向。');a=config.a0;b=config.b0;clearGoal();$('result').textContent='已回到参考读数，请重新计算目标。';sync();render();});
  for(const key of ['a','b'])for(const id of [key,key+'r'])$(id).addEventListener('input',guard(()=>{stop();if(!base)throw Error('请先建立参考取向。');const v=number(id);if(!E.withinLimits(key==='a'?v:a,key==='b'?v:b,config)){sync();throw Error(config.combined?'角度超出限位：|α| + |β| 不得超过 30°，且须满足单轴范围。':'角度超出单轴限位。');}if(key==='a')a=v;else b=v;clearGoal();$('result').textContent='手动倾转后请重新计算目标。';sync();render();}));
  for(const id of ['equivalents','target','mode'])$(id).addEventListener('input',()=>{stop();clearGoal();$('result').textContent='目标已更新，请计算。';render();});
  for(const id of ['combined','zone','ref','phi','a0','b0','amin','amax','bmin','bmax','sa','sb','azimuth','lattice-a','lattice-c'])$(id).addEventListener('input',()=>{stop();clearGoal();base=null;$('result').textContent='参考设置已改变，请重新建立参考取向。';$('error').textContent='图中仍为上次状态，尚未应用新参考。';});
  $('material').addEventListener('change',applyMaterial);for(const id of ['kv','camera'])$(id).addEventListener('input',()=>{if(base)render();});
  $('spot-select').addEventListener('change',()=>{selectedSpot=$('spot-select').value;render();});
  for(const id of ['plane-first','plane-second'])$(id).addEventListener('change',showPlanePair);
  for(const id of ['field','spots','spot-labels'])$(id).addEventListener('change',guard(render));
  canvas.addEventListener('click',e=>{if(!base)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*800/r.width,y=(e.clientY-r.top)*800/r.height;const nearest=spotHit.map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(nearest&&nearest.d<12){selectedSpot=nearest.id;render();return;}const p=hit.map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(p&&p.d<20){stop();clearGoal();$('target').value=p.indices.join(' ');$('mode').value='zone';$('result').textContent='已选择菊池极，请计算目标角度。';render();}});
  window.addEventListener('kikuchi-target',e=>{if(!e.detail)return;stop();clearGoal();$('target').value=e.detail.join(' ');$('mode').value='zone';$('result').textContent='已载入球面所选极，请计算。';if(dialog.open)render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();

