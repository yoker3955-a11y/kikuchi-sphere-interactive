const vm=require('node:vm'),fs=require('node:fs'),D=require('../direction.js'),P=require('../planar-export.js');
const box={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../model-drawings.js'),'utf8'),box);
const data=box.window.KIKUCHI_MODEL;
function fixture(direction=[1,1,2],model='FCC',halfAngle=35){
  const q=D.align(direction),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const rotate=v=>{const t=cross(q,v).map(n=>2*n),c=cross(q,t);return v.map((n,i)=>n+q[3]*t[i]+c[i]);};
  return {model,legend:data.legends[model],faces:data.faces,basis:[[1,0,0],[0,1,0],[0,0,1]].map(rotate),direction,halfAngle,pins:['1,1,4','3,1,6','1,3,6','3,4,5']};
}
module.exports=fixture;
if(require.main===module){const direction=process.argv[2]?process.argv[2].split(',').map(Number):[1,1,2];const scene=P.make(fixture(direction,process.argv[3]||'FCC'));process.stdout.write(process.argv.includes('--svg')?P.svg(scene):P.pdf(scene));}
