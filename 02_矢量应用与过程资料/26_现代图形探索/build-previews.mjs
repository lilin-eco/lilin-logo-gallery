import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source='C:/Users/Administrator/.codex/generated_images/01a1c95b-8a24-7ac3-9404-f7f6e73da9db';
const entries=JSON.parse(await fs.readFile(path.join(dir,'generation-records.json'),'utf8')).records;
await fs.mkdir(path.join(dir,'originals'),{recursive:true});
for(const [i,e]of entries.entries()){
 const b=await fs.readFile(path.join(source,e.file));
 const dest=path.join(dir,'originals',`${String(i+1).padStart(2,'0')}-${e.file}`);
 await fs.writeFile(dest,b);
 const copy=await fs.readFile(dest);
 if(!crypto.timingSafeEqual(crypto.createHash('sha256').update(b).digest(),crypto.createHash('sha256').update(copy).digest()))throw Error('Copy mismatch');
}
const picked=[{id:'A',title:'留白莲形',file:entries[5].file},{id:'B',title:'原印莲化',file:entries[4].file}];
const font='Microsoft YaHei,Arial,sans-serif';
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`);
const parts=[],qa=[];let labels='';
for(const [i,e]of picked.entries()){
 const src=path.join(source,e.file);
 const {data,info}=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let xmin=info.width,ymin=info.height,xmax=-1,ymax=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels,r=data[p],g=data[p+1],b=data[p+2];
  if(g-r>10&&g-b>7&&g<190){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
 }
 const crop=await sharp(src).extract({left:xmin-3,top:ymin-3,width:xmax-xmin+7,height:ymax-ymin+7}).png().toBuffer();
 await fs.writeFile(path.join(dir,`${e.id}-symbol-crop.png`),crop);
 const large=await sharp(crop).resize(485,460,{fit:'inside'}).png().toBuffer();const lm=await sharp(large).metadata();
 parts.push({input:large,left:Math.round(350+i*700-lm.width/2),top:Math.round(345-lm.height/2)});
 labels+=`<text x="${350+i*700}" y="68" font-size="25" fill="#666">${e.id} · ${e.title}</text><text x="${350+i*700}" y="668" font-size="44" font-weight="500" fill="#36593e">礼林生态</text><text x="${350+i*700}" y="710" font-size="18" letter-spacing="3" fill="#6e7f6c">LILIN ECO</text>`;
 const largeSolo=await sharp(crop).resize(820,760,{fit:'inside'}).png().toBuffer();const ls=await sharp(largeSolo).metadata();
 await sharp(svg(1000,1000,'')).composite([{input:largeSolo,left:Math.round((1000-ls.width)/2),top:Math.round((1000-ls.height)/2)}]).png().toFile(path.join(dir,`${e.id}-symbol-preview.png`));
 for(const [j,s]of [256,128,64,32].entries()){
  const b=await sharp(crop).resize(s,s,{fit:'inside'}).png().toBuffer();const m=await sharp(b).metadata();
  await fs.writeFile(path.join(dir,`${e.id}-${s}.png`),b);
  qa.push({input:b,left:Math.round(210+j*300-m.width/2),top:Math.round(210+i*320-m.height/2)});
 }
}
await sharp(svg(1400,790,`<path d="M700 40V750" stroke="#e6e6e6"/><g font-family="${font}" text-anchor="middle">${labels}</g>`)).composite(parts).png().toFile(path.join(dir,'two-graphic-directions.png'));
const ql=[256,128,64,32].map((s,j)=>`<text x="${210+j*300}" y="43">${s}px</text>`).join('')+picked.map((e,i)=>`<text x="50" y="${217+i*320}">${e.id}</text>`).join('');
await sharp(svg(1280,720,`<g font-family="${font}" font-size="20" fill="#555" text-anchor="middle">${ql}</g>`)).composite(qa).png().toFile(path.join(dir,'qa-sizes.png'));
console.log(JSON.stringify({dir,originals:entries.length,retained:picked.map(x=>x.id),copyHashMatched:true}));
