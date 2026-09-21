/* Integer cubic crystal directions. Shared by both canvas viewers. */
(() => {
  'use strict';
  const gcd = (a,b) => b ? gcd(b,a%b) : a;
  function reduce(values) {
    if (values.length !== 3 || !values.every(Number.isSafeInteger)) throw new Error('请输入三个安全范围内的整数，例如 1 1 2 或 -1 1 3。');
    const divisor=values.reduce((g,v)=>gcd(g,Math.abs(v)),0);
    if (!divisor) throw new Error('[000] 没有方向，请至少输入一个非零指数。');
    return values.map(v=>v/divisor);
  }
  function parse(text) {
    let value=text.trim().replace(/−/g,'-');
    if (value.startsWith('[') && value.endsWith(']')) value=value.slice(1,-1).trim();
    // Only three unsigned single digits have an unambiguous compact form.
    const parts=/^\d{3}$/.test(value) ? value.split('') : value.split(/[\s,，]+/);
    if (parts.length!==3 || !parts.every(p=>/^[+-]?\d+$/.test(p))) throw new Error('请输入三个整数；负数或多位数请用空格分隔，例如 -1 1 3。');
    const input=parts.map(Number);
    return {input, reduced:reduce(input)};
  }
  const label=v=>'['+v.join(v.some(n=>n<0 || n>9)?' ':'')+']';
  function align(values) {
    const v=reduce(values),length=Math.hypot(...v),from=v.map(n=>n/length);
    const s=Math.hypot(from[0],from[1]);
    if (s===0) return from[2]>0 ? [0,0,0,1] : [1,0,0,0];
    const half=Math.atan2(s,from[2])/2,k=Math.sin(half)/s;
    return [from[1]*k,-from[0]*k,0,Math.cos(half)];
  }
  const api={reduce,parse,label,align};
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  if (typeof window!=='undefined') window.KikuchiDirection=api;
})();
