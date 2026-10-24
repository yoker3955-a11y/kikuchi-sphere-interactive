/* Material/phase metrics for the double-tilt navigator. Units: nm and nm^-1. */
(() => {
  'use strict';
  const phases=[
    {id:'si',label:'Si · diamond',system:'cubic',rule:'diamond',a:.5431,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'ge',label:'Ge · diamond',system:'cubic',rule:'diamond',a:.5658,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'c-diamond',label:'C · diamond',system:'cubic',rule:'diamond',a:.3567,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'al',label:'Al · FCC',system:'cubic',rule:'fcc',a:.40495,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'cu',label:'Cu · FCC',system:'cubic',rule:'fcc',a:.36149,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'ni',label:'Ni · FCC',system:'cubic',rule:'fcc',a:.3524,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'ag',label:'Ag · FCC',system:'cubic',rule:'fcc',a:.40853,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'au',label:'Au · FCC',system:'cubic',rule:'fcc',a:.40786,zone:[1,1,0],reflection:[2,-2,0]},
    {id:'fe-alpha',label:'Fe α · BCC',system:'cubic',rule:'bcc',a:.28665,zone:[0,0,1],reflection:[1,1,0]},
    {id:'w',label:'W · BCC',system:'cubic',rule:'bcc',a:.31652,zone:[0,0,1],reflection:[1,1,0]},
    {id:'mo',label:'Mo · BCC',system:'cubic',rule:'bcc',a:.31472,zone:[0,0,1],reflection:[1,1,0]},
    {id:'ti-alpha',label:'Ti α · HCP',system:'hexagonal',rule:'hcp',a:.2951,c:.4683,zone:[0,0,1],reflection:[1,0,0]},
    {id:'mg',label:'Mg · HCP',system:'hexagonal',rule:'hcp',a:.3209,c:.5211,zone:[0,0,1],reflection:[1,0,0]},
    {id:'zn',label:'Zn · HCP',system:'hexagonal',rule:'hcp',a:.2665,c:.4947,zone:[0,0,1],reflection:[1,0,0]}
  ];
  const byId=id=>phases.find(p=>p.id===id)||phases[0];
  const parity=n=>((n%2)+2)%2;
  function allowed(rule,[h,k,l]){
    if(!(h||k||l))return false;
    if(rule==='fcc'||rule==='diamond'){
      if(!(parity(h)===parity(k)&&parity(k)===parity(l)))return false;
      return rule==='fcc'||parity(h)===1||(h+k+l)%4===0;
    }
    if(rule==='bcc')return (h+k+l)%2===0;
    if(rule==='hcp'){
      const phase=2*Math.PI*(2*h/3+k/3+l/2);
      return Math.hypot(1+Math.cos(phase),Math.sin(phase))>1e-8;
    }
    return true;
  }
  function create(id,{a,c}={}){
    const phase=byId(id),cell={...phase,a:Number.isFinite(a)?a:phase.a,c:Number.isFinite(c)?c:(phase.c||phase.a)};
    if(cell.a<=0||cell.c<=0)throw Error('晶格常数必须为正数。');
    const cubic=cell.system==='cubic';
    const g=hkl=>cubic?[hkl[0]/cell.a,hkl[1]/cell.a,hkl[2]/cell.a]:[hkl[0]/cell.a,(-hkl[0]+2*hkl[1])/(Math.sqrt(3)*cell.a),hkl[2]/cell.c];
    const zone=uvw=>cubic?[uvw[0]*cell.a,uvw[1]*cell.a,uvw[2]*cell.a]:[cell.a*(uvw[0]+uvw[1]/2),cell.a*Math.sqrt(3)*uvw[1]/2,cell.c*uvw[2]];
    const d=hkl=>1/Math.hypot(...g(hkl));
    function reflections(limit=4){
      const out=[];
      for(let h=-limit;h<=limit;h++)for(let k=-limit;k<=limit;k++)for(let l=-limit;l<=limit;l++){
        const hkl=[h,k,l];if(!allowed(cell.rule,hkl))continue;out.push({hkl,g:g(hkl),dNm:d(hkl)});
      }
      return out.sort((x,y)=>x.dNm-y.dNm).reverse();
    }
    return {...cell,g,zone,d,allowed:hkl=>allowed(cell.rule,hkl),reflections};
  }
  const api={phases,byId,create,allowed};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.KikuchiTiltMaterials=api;
})();
