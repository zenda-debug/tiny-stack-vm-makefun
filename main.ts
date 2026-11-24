import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
function run(p,input){
 const st=[],cs=[],mem=[];
 let pc=0,ip=0,steps=0,code=0,on=1,out='';
 const tr=c=>{code=c;on=0};
 const need=n=>st.length>=n||(tr(2),0);
 const push=v=>{if(st.length>=256)tr(3);else st.push(v|0)};
 const imm=(n,s)=>{
  if(pc+n>p.length)return tr(9);
  let v=0;for(let i=0;i<n;i++)v|=p[pc+i]<<8*i;pc+=n;
  return s?v<<32-8*n>>32-8*n:v
 };
 const B=(f,z)=>{
  if(st.length<2)return tr(2);
  const b=st.pop(),a=st.pop();
  z&&!b?tr(4):push(f(a,b))
 };
 const A=[(a,b)=>a+b,(a,b)=>a-b,Math.imul,(a,b)=>a/b,(a,b)=>a%b,(a,b)=>(a>>>0)/(b>>>0),(a,b)=>(a>>>0)%(b>>>0),a=>-a,(a,b)=>a&b,(a,b)=>a|b,(a,b)=>a^b,a=>~a,(a,b)=>a<<b,(a,b)=>a>>b,(a,b)=>a>>>b,null,(a,b)=>a===b,(a,b)=>a<b,(a,b)=>(a>>>0)<(b>>>0)];
 while(on){
  if(steps++>=1e6){tr(10);break}
  if(pc>>>0>=p.length){tr(9);break}
  let op=p[pc++],v;
  if(op===1||op===2||op>47&&op<52){
   v=imm(op===1?1:op===2?4:2,op!==51);
   if(v===undefined)break;
  }
  switch(op){
   case 0:on=0;break;
   case 1:case 2:push(v);break;
   case 3:need(1)&&st.pop();break;
   case 4:if(need(1))push(st[st.length-1]);break;
   case 5:if(need(2)){let b=st.pop(),a=st.pop();push(b);push(a)}break;
   case 6:if(need(2))push(st[st.length-2]);break;
   case 7:if(need(3)){let c=st.pop(),b=st.pop(),a=st.pop();push(b);push(c);push(a)}break;
   case 48:pc+=v;break;
   case 49:case 50:if(need(1)){let c=st.pop();if((op===49)===(c===0))pc+=v}break;
   case 51:if(cs.length<64){cs.push(pc);pc=v}else tr(7);break;
   case 52:if(cs.length)pc=cs.pop();else tr(8);break;
   case 64:if(need(1)){let a=st.pop();if(a>>>0>255)tr(6);else push(mem[a]||0)}break;
   case 65:if(need(2)){let a=st.pop(),x=st.pop();if(a>>>0>255)tr(6);else mem[a]=x}break;
   case 80:case 81:if(need(1)){let v=st.pop();v=op===80?''+v:String.fromCharCode(v&255);if(out.length+v.length>65536)tr(11);else out+=v}break;
   case 82:push(ip<input.length?input[ip++]:-1);break;
   case 83:if(need(1)){code=st.pop()&255;on=0}break;
   default:{
    const f=A[op-16];
    if(!f)tr(5);
    else if(op===23||op===27){if(need(1))push(f(st.pop()))}
    else B(f,op>=19&&op<=22);
   }
  }
 }
 return[Buffer.from(out,'latin1'),code]
}
for(const id of readdirSync(I).sort()){
 const d=I+'/'+id,o=O+'/'+id;
 mkdirSync(o,{recursive:true});
 const[x,c]=run(readFileSync(d+'/program.bin'),readFileSync(d+'/input.bin'));
 writeFileSync(o+'/stdout.bin',x);
 writeFileSync(o+'/exit.txt',''+c)
}
