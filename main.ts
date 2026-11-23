import {mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
import{join}from'node:path';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
function run(p,input){
 const st=[],cs=[],mem=new Int32Array(256),parts=[];
 let pc=0,ip=0,steps=0,code=0,on=true,nout=0;
 const tr=c=>{code=c;on=false};
 const need=n=>{if(st.length<n){tr(2);return false}return true};
 const push=v=>{if(st.length>=256){tr(3);return}st.push(v|0)};
 const imm=(n,s)=>{
  if(pc+n>p.length){tr(9);return}
  let v=0;for(let i=0;i<n;i++)v|=p[pc+i]<<(8*i);pc+=n;
  return s?n===1?v<<24>>24:n===2?v<<16>>16:v|0:v;
 };
 const B=f=>{if(need(2)){const b=st.pop(),a=st.pop(),c=code,v=f(a,b);if(c===code)push(v)}};
 const E=b=>{nout+=b.length;if(nout>65536){tr(11);return}parts.push(b)};
 while(on){
  if(steps++>=1000000){tr(10);break}
  if(pc<0||pc>=p.length){tr(9);break}
  let op=p[pc++],v;
  if(op===1||op===2||op>=48&&op<52){
   v=imm(op===1?1:op===2?4:2,op!==51);
   if(v===undefined)break;
  }
  switch(op){
   case 0:on=false;break;
   case 1:case 2:push(v);break;
   case 3:if(need(1))st.pop();break;
   case 4:if(need(1))push(st[st.length-1]);break;
   case 5:if(need(2)){let b=st.pop(),a=st.pop();push(b);push(a)}break;
   case 6:if(need(2))push(st[st.length-2]);break;
   case 7:if(need(3)){let c=st.pop(),b=st.pop(),a=st.pop();push(b);push(c);push(a)}break;
   case 16:B((a,b)=>a+b|0);break;
   case 17:B((a,b)=>a-b|0);break;
   case 18:B((a,b)=>Math.imul(a,b));break;
   case 19:B((a,b)=>b?a===-2147483648&&b===-1?a:a/b|0:(tr(4),0));break;
   case 20:B((a,b)=>b===0?(tr(4),0):b===-1?0:(a%b)|0);break;
   case 21:B((a,b)=>b===0?(tr(4),0):(a>>>0)/(b>>>0)|0);break;
   case 22:B((a,b)=>b===0?(tr(4),0):(a>>>0)%(b>>>0)|0);break;
   case 23:if(need(1))push(-st.pop());break;
   case 24:B((a,b)=>a&b);break;
   case 25:B((a,b)=>a|b);break;
   case 26:B((a,b)=>a^b);break;
   case 27:if(need(1))push(~st.pop());break;
   case 28:B((a,b)=>a<<(b&31));break;
   case 29:B((a,b)=>a>>(b&31));break;
   case 30:B((a,b)=>a>>>(b&31));break;
   case 32:B((a,b)=>a===b|0);break;
   case 33:B((a,b)=>a<b|0);break;
   case 34:B((a,b)=>(a>>>0)<(b>>>0)|0);break;
   case 48:pc+=v;break;
   case 49:case 50:if(need(1)){let c=st.pop();if((op===49)===(c===0))pc+=v}break;
   case 51:if(cs.length<64){cs.push(pc);pc=v}else tr(7);break;
   case 52:if(cs.length)pc=cs.pop();else tr(8);break;
   case 64:if(need(1)){let a=st.pop();if(a<0||a>255)tr(6);else push(mem[a])}break;
   case 65:if(need(2)){let a=st.pop(),x=st.pop();if(a<0||a>255)tr(6);else mem[a]=x}break;
   case 80:if(need(1))E(Buffer.from(String(st.pop())));break;
   case 81:if(need(1))E(Buffer.from([st.pop()&255]));break;
   case 82:push(ip<input.length?input[ip++]:-1);break;
   case 83:if(need(1)){code=st.pop()&255;on=false}break;
   default:tr(5);break;
  }
 }
 return [Buffer.concat(parts),code];
}
for(const id of readdirSync(I).sort()){
 const dir=join(I,id);
 const [out,code]=run(readFileSync(join(dir,'program.bin')),readFileSync(join(dir,'input.bin')));
 const od=join(O,id);mkdirSync(od,{recursive:true});
 writeFileSync(join(od,'stdout.bin'),out);
 writeFileSync(join(od,'exit.txt'),`${code}\n`);
}
