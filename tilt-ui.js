/* Browser-only navigation. All angles are a calibrated geometric model. */
(() => {
  'use strict';
  const E=window.KikuchiTilt,D=window.KikuchiDirection,P=window.KikuchiPlanar,C=window.KikuchiPoleCatalog;
  if(!E||!D||!P||!C)return;
  const section=document.createElement('section');section.className='control-block';
  section.innerHTML='<h2>α / β 带轴导航</h2><button id="tilt-open" type="button">打开双倾导航</button><p class="detail">由已知带轴与参考斑点配准，求解指定目标；支持晶面平行电子束。独立于拖动观察视角。</p>';
  document.getElementById('download-block').before(section);
  const dialog=document.createElement('dialog');dialog.id='tilt-dialog';dialog.setAttribute('aria-labelledby','tilt-title');
  dialog.innerHTML=`<div class="pole-header"><h2 id="tilt-title">双倾导航 · Si 几何模型</h2><button id="tilt-close" type="button">关闭导航</button></div>
  <p>电子束固定沿 +Z；α 绕固定 X 轴，β 绕随 α 运动的 Y 轴。显示角度不直接控制电镜。</p>
  <div class="tilt-layout"><div>
  <fieldset><legend>1 当前参考状态</legend>
  <label>已知晶带轴 [uvw]<input id="tilt-zone" value="1 1 0"></label>
  <label>参考反射 (hkl)<input id="tilt-ref" value="2 -2 0"></label>
  <label>000 → 参考斑点的屏幕方位 °<input id="tilt-phi" type="number" value="0" step="0.1"></label>
  <small>屏幕向右为 0°，向上为 +90°；参考反射必须属于当前带轴。</small>
  <div class="tilt-pair"><label>参考 α₀ °<input id="tilt-a0" type="number" value="0" step="0.1"></label><label>参考 β₀ °<input id="tilt-b0" type="number" value="0" step="0.1"></label></div>
  <details><summary>样品杆标定与限位</summary><p>默认限位仅为演示；上机前按样品杆设置。轴方向、屏幕旋转须由实测标定。</p>
  <label>α 正轴在屏幕的方位 °<input id="tilt-azimuth" type="number" value="0" step="0.1"></label><small>绕束向的机台轴配准；向右为 0°。与上方参考斑点方位分别测量。</small>
  <div class="tilt-pair"><label>α 最小 °<input id="tilt-amin" type="number" value="-35"></label><label>α 最大 °<input id="tilt-amax" type="number" value="35"></label><label>β 最小 °<input id="tilt-bmin" type="number" value="-30"></label><label>β 最大 °<input id="tilt-bmax" type="number" value="30"></label></div>
  <label>α 读数方向<select id="tilt-sa"><option value="1">同右手正向</option><option value="-1">反向</option></select></label><label>β 读数方向<select id="tilt-sb"><option value="1">同右手正向</option><option value="-1">反向</option></select></label></details>
  <button id="tilt-init" type="button">建立参考取向</button></fieldset>
  <fieldset><legend>2 指定目标</legend><label>目标条件<select id="tilt-mode"><option value="zone">晶带轴平行电子束</option><option value="plane">晶面平行电子束</option></select></label><label>目标指数<input id="tilt-target" value="1 2 1"></label>
  <small>指定 [112] 与 [121] 不同，不自动替换等价目标。可点击下图的菊池极设置带轴目标。</small>
  <button id="tilt-solve" type="button">计算目标 α / β</button><p id="tilt-result" role="status"></p>
  <button id="tilt-play" type="button" disabled>播放倾转</button> <button id="tilt-stop" type="button">停止</button> <button id="tilt-go" type="button" disabled>到达计算终点</button>
  </fieldset><fieldset><legend>3 手动倾转与路径检查</legend>
  <label>α °<input id="tilt-a" type="number" value="0" step="0.1"><input id="tilt-ar" aria-label="α 滑块" type="range" min="-35" max="35" step="0.01" value="0"></label>
  <label>β °<input id="tilt-b" type="number" value="0" step="0.1"><input id="tilt-br" aria-label="β 滑块" type="range" min="-30" max="30" step="0.01" value="0"></label>
  <button id="tilt-reset" type="button">回到参考 α₀ / β₀</button><p id="tilt-error" role="status"></p></fieldset>
  </div><div class="tilt-map"><label>半视场角<select id="tilt-field"><option value="2">±2° 衍射细节</option><option value="5">±5° 精调</option><option value="35" selected>±35° 导航</option><option value="60">±60° 广角</option></select></label>
  <label><input id="tilt-spots" type="checkbox" checked> 显示 Si 衍射位置</label><canvas id="tilt-canvas" width="800" height="800" aria-label="随双倾角实时更新的菊池中心线、菊池极和 Si 衍射位置"></canvas>
  <p>青色为菊池中心线，红色为目标；紫色为衍射位置。000 固定在图中央。目标晶面模式将该面中心线通过 000。</p>
  <p class="detail">Si 200 kV，a = 0.5431 nm。衍射按金刚石消光及 |h|、|k|、|l| ≤ 8 筛选，以弹性球径向偏离 ≤ 0.15 nm⁻¹ 显示离轴反射；透明度仅表示几何接近程度，不是强度。未模拟带宽、动力学、多重散射和样品遮挡。</p>
  <p class="detail">参考 <a href="https://github.com/din14970/ALPHABETA-TEM-tilting-suite" target="_blank" rel="noopener">ALPHABETA</a> 与 <a href="https://mompiou.github.io/pycotem/stereoproj/" target="_blank" rel="noopener">pycotem</a> 的问题定义；本模块由旋转方程独立实现，未复制其源码。</p>
  </div></div>`;
  document.body.append(dialog);
  const style=document.createElement('style');style.textContent=`#tilt-dialog{width:min(1160px,96vw);max-width:96vw;max-height:94vh;overflow:auto;border:1px solid #aebfc2;border-radius:16px;padding:20px;color:#17383e}#tilt-dialog::backdrop{background:#203b4990}.tilt-layout{display:grid;grid-template-columns:minmax(270px,350px) minmax(0,1fr);gap:24px}#tilt-dialog fieldset{border:1px solid #cad8da;border-radius:8px;margin:12px 0;padding:14px}#tilt-dialog label{display:block;margin:8px 0}#tilt-dialog input:not([type=checkbox]),#tilt-dialog select{display:block;box-sizing:border-box;width:100%;padding:7px;margin-top:4px}#tilt-dialog button{margin-top:8px;padding:9px}.tilt-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tilt-map canvas{width:100%;height:auto;touch-action:manipulation;border:1px solid #ccd8db}#tilt-dialog small{display:block;line-height:1.5;color:#45616a}#tilt-result,#tilt-error{white-space:pre-line;font-weight:600}#tilt-dialog legend{font-weight:700}@media(max-width:760px){.tilt-layout{grid-template-columns:1fr}#tilt-dialog{padding:12px}.tilt-map{order:-1}}`;
  document.head.append(style);
  const $=id=>document.getElementById('tilt-'+id),canvas=$('canvas'),ctx=canvas.getContext('2d');
  const data=window.KIKUCHI_MODEL,planes=C.planes(data.legends.FCC),poles=C.build(data.legends.FCC,data.faces);
  let config=null,base=null,a=0,b=0,goal=null,raf=0,hit=[];
  function stop(){cancelAnimationFrame(raf);raf=0;}
  function clearGoal(){goal=null;$('play').disabled=$('go').disabled=true;}
  function number(id){const raw=$(id).value.trim(),n=Number(raw);if(!raw||!Number.isFinite(n))throw Error('请输入有效角度。');return n;}
  function args(){return {base,target:D.parse($('target').value).reduced,...config,a,b,mode:$('mode').value};}
  function sync(){for(const [key,value]of [['a',a],['b',b]]){$(key).value=value.toFixed(4);$(key+'r').value=value;}}
  function render(){
    if(!base)return;
    const u=E.mm(E.rz(config.azimuth),E.orientation(base,a,b,config.a0,config.b0,config.sa,config.sb)),basis=E.tr(u),lim=Math.tan(number('field')*Math.PI/180);
    const xy=p=>[400+p[0]/lim*340,400-p[1]/lim*340];
    ctx.fillStyle='#fff';ctx.fillRect(0,0,800,800);ctx.strokeStyle='#d4dfe1';ctx.strokeRect(60,60,680,680);
    ctx.save();ctx.beginPath();ctx.rect(60,60,680,680);ctx.clip();
    const line=(segment,color,width=1)=>{if(!segment)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...xy(segment[0]));ctx.lineTo(...xy(segment[1]));ctx.stroke();};
    for(const p of planes)line(P.clipLine(...E.mv(u,p.normal),lim),'#408e9690');
    hit=[];ctx.font='16px sans-serif';
    for(const p of poles){const pt=P.projectPole(p.indices,basis,lim);if(!pt)continue;const [x,y]=xy(pt);hit.push({x,y,indices:p.indices});ctx.fillStyle='#247781';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();if(hit.length<35)ctx.fillText(D.label(p.indices),x+6,y-7);}
    if($('spots').checked){
      const lambda=P.wavelength(200),k=1/lambda;
      for(let h=-8;h<=8;h++)for(let j=-8;j<=8;j++)for(let l=-8;l<=8;l++){
        if(!(h||j||l)||!P.siAllowed([h,j,l]))continue;
        const g=E.mv(u,[h/.5431,j/.5431,l/.5431]),s=Math.abs(Math.hypot(g[0],g[1],k+g[2])-k);
        if(s>.15||k+g[2]<=0)continue;
        const pt=[g[0]/(k+g[2]),g[1]/(k+g[2])];if(pt.some(v=>Math.abs(v)>lim))continue;
        const [x,y]=xy(pt);ctx.globalAlpha=.3+.7*(1-s/.15);ctx.fillStyle='#932198';ctx.beginPath();ctx.arc(x,y,number('field')<=5?5:2.5,0,Math.PI*2);ctx.fill();
      }ctx.globalAlpha=1;
    }
    ctx.fillStyle='#252938';ctx.beginPath();ctx.arc(400,400,5,0,Math.PI*2);ctx.fill();ctx.fillText('000',409,420);
    try{
      const target=D.parse($('target').value).reduced,mode=$('mode').value;
      if(mode==='plane')line(P.clipLine(...E.mv(u,target),lim),'#bd3329',3);
      else {const pt=P.projectPole(target,basis,lim);if(pt){const [x,y]=xy(pt);ctx.strokeStyle='#bd3329';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#bd3329';ctx.fillText('目标 '+D.label(target),x+13,y+20);}}
      $('error').textContent=`当前 α ${a.toFixed(3)}° / β ${b.toFixed(3)}°\n${mode==='zone'?'目标带轴失配':'晶面偏离平行'} ${E.residual(u,target,mode).toFixed(5)}°`;
    }catch(e){$('error').textContent=e.message;}
    ctx.restore();ctx.fillStyle='#25454d';ctx.font='18px sans-serif';ctx.fillText('固定束向 +Z · 屏幕 X 向右 / Y 向上',60,34);
    ctx.fillText(`α ${a.toFixed(3)}°   β ${b.toFixed(3)}°   半视场 ±${number('field')}°`,60,777);
    if(window.KikuchiStageView)window.KikuchiStageView(E.quaternion(u));
  }
  function guard(fn){return ()=>{try{fn();}catch(e){$('error').textContent=e.message;}};}
  function initialize(){
    stop();clearGoal();base=null;
    const c={};for(const key of ['a0','b0','amin','amax','bmin','bmax','sa','sb','azimuth'])c[key]=number(key);
    if(c.amin>=c.amax||c.bmin>=c.bmax||Math.max(...[c.amin,c.amax,c.bmin,c.bmax].map(Math.abs))>180)throw Error('限位应递增并位于 ±180° 内。');
    if(c.a0<c.amin||c.a0>c.amax||c.b0<c.bmin||c.b0>c.bmax)throw Error('参考读数超出限位。');
    const reflection=D.parse($('ref').value);
    if(!P.siAllowed(reflection.input))throw Error('参考斑点不满足 Si 金刚石结构允许反射条件；例如使用 2 -2 0，而非 1 -1 0。');
    const next=E.reference(D.parse($('zone').value).reduced,reflection.reduced,number('phi')-c.azimuth);
    config=c;base=next;a=c.a0;b=c.b0;
    for(const key of ['a','b'])for(const id of [key,key+'r']){$(id).min=c[key+'min'];$(id).max=c[key+'max'];}
    sync();$('result').textContent='参考取向已建立。选择目标后计算。';render();
  }
  $('open').onclick=()=>{dialog.showModal();if(!base)guard(initialize)();else render();};
  $('close').onclick=()=>{stop();dialog.close();};dialog.addEventListener('close',stop);
  $('init').onclick=guard(initialize);
  $('solve').onclick=guard(()=>{stop();clearGoal();if(!base)throw Error('请先建立参考取向。');goal=E.solve(args());$('result').textContent=goal?`目标 α ${goal.a.toFixed(4)}° / β ${goal.b.toFixed(4)}°\n增量 Δα ${(goal.a-a).toFixed(4)}° / Δβ ${(goal.b-b).toFixed(4)}°\n${$('mode').value==='plane'?'已选取较近的可行晶面解；不是唯一解。':'指定目标可达；未替换等价方向。'}\n仅验证轴限位，实际遮挡须人工检查。`:'指定目标在当前限位内不可达。检查目标指数、参考取向或样品杆范围。';$('play').disabled=$('go').disabled=!goal;render();});
  $('go').onclick=guard(()=>{stop();if(goal){a=goal.a;b=goal.b;sync();render();}});
  $('play').onclick=()=>{if(!goal)return;stop();const start=performance.now(),aa=a,bb=b,dest={...goal};const tick=time=>{if(!dialog.open||document.hidden){stop();return;}const t=Math.min(1,(time-start)/2200);a=aa+(dest.a-aa)*t;b=bb+(dest.b-bb)*t;sync();render();if(t<1)raf=requestAnimationFrame(tick);else raf=0;};raf=requestAnimationFrame(tick);};
  $('stop').onclick=stop;$('reset').onclick=guard(()=>{stop();if(!base)throw Error('请先建立参考取向。');a=config.a0;b=config.b0;clearGoal();$('result').textContent='已回到参考读数，请重新计算目标。';sync();render();});
  for(const key of ['a','b'])for(const id of [key,key+'r'])$(id).addEventListener('input',guard(()=>{stop();if(!base)throw Error('请先建立参考取向。');const v=number(id);if(v<config[key+'min']||v>config[key+'max'])throw Error('角度超出当前限位。');if(key==='a')a=v;else b=v;clearGoal();$('result').textContent='手动倾转后请重新计算目标。';sync();render();}));
  for(const id of ['target','mode'])$(id).addEventListener('input',()=>{stop();clearGoal();$('result').textContent='目标已更新，请计算。';render();});
  for(const id of ['zone','ref','phi','a0','b0','amin','amax','bmin','bmax','sa','sb','azimuth'])$(id).addEventListener('input',()=>{stop();clearGoal();base=null;$('result').textContent='参考设置已改变，请重新建立参考取向。';$('error').textContent='图中仍为上次状态，尚未应用新参考。';});
  for(const id of ['field','spots'])$(id).addEventListener('change',guard(render));
  canvas.addEventListener('click',e=>{if(!base)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*800/r.width,y=(e.clientY-r.top)*800/r.height;const p=hit.map(p=>({...p,d:Math.hypot(p.x-x,p.y-y)})).sort((a,b)=>a.d-b.d)[0];if(p&&p.d<20){stop();clearGoal();$('target').value=p.indices.join(' ');$('mode').value='zone';$('result').textContent='已选择菊池极，请计算目标角度。';render();}});
  window.addEventListener('kikuchi-target',e=>{if(!e.detail)return;stop();clearGoal();$('target').value=e.detail.join(' ');$('mode').value='zone';$('result').textContent='已载入球面所选极，请计算。';if(dialog.open)render();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();

