import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const dir=path.dirname(fileURLToPath(import.meta.url));
const src='C:/Users/Administrator/.codex/generated_images/01a1c95b-8a24-7ac3-9404-f7f6e73da9db';
const entries=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const reference=path.resolve('output/graphic-symbols-2026-11-16/originals/06-exec-7f7a64f5-b57d-42c0-956e-374ff519cc1c.png');
await fs.mkdir(path.join(dir,'originals'),{recursive:true});
const font='Microsoft YaHei,Arial,sans-serif';
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function foreground(file){
 const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const mask=Buffer.alloc(info.width*info.height);
 let xmin=info.width,ymin=info.height,xmax=-1,ymax=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels;const r=data[p],g=data[p+1],b=data[p+2];
  if(Math.max(r,g,b)-Math.min(r,g,b)>30&&Math.min(r,g,b)<225){mask[y*info.width+x]=255;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
 }
 const tight={left:xmin,top:ymin,width:xmax-xmin+1,height:ymax-ymin+1};
 const normalized=await sharp(mask,{raw:{width:info.width,height:info.height,channels:1}}).extract(tight).resize(512,512,{fit:'fill'}).raw().toBuffer();
 return {tight,normalized,info};
}
const ref=await foreground(reference);
const parts=[],qa=[],checks=[];let labels='';
for(const [i,e]of entries.entries()){
 const file=path.join(src,e.file);const bytes=await fs.readFile(file);
 const dest=path.join(dir,'originals',`${e.id}-${e.file}`);await fs.writeFile(dest,bytes);
 if(hash(await fs.readFile(dest))!==hash(bytes))throw Error('Original copy differs');
 const f=await foreground(file);
 let intersection=0,union=0;
 for(let p=0;p<f.normalized.length;p++){const a=ref.normalized[p]>127,b=f.normalized[p]>127;if(a&&b)intersection++;if(a||b)union++;}
 const crop=await sharp(file).extract({left:f.tight.left-3,top:f.tight.top-3,width:f.tight.width+6,height:f.tight.height+6}).png().toBuffer();
 await fs.writeFile(path.join(dir,`${e.id}-crop.png`),crop);
 const large=await sharp(crop).resize(490,460,{fit:'inside'}).png().toBuffer();const lm=await sharp(large).metadata();
 parts.push({input:large,left:Math.round(300+i*600-lm.width/2),top:Math.round(350-lm.height/2)});
 labels+=`<text x="${300+i*600}" y="70" font-size="28" fill="#526070">${e.id} · ${e.title}</text><text x="${300+i*600}" y="650" font-size="37" font-weight="500" fill="#28384b">礼林生态</text><text x="${300+i*600}" y="690" font-size="17" letter-spacing="3" fill="#87919c">LILIN ECO</text><text x="${300+i*600}" y="760" font-size="18" fill="#87919c">${e.sub}</text>`;
 const single=await sharp(crop).resize(820,760,{fit:'inside'}).png().toBuffer();const sm=await sharp(single).metadata();
 await sharp(svg(1000,1000,'')).composite([{input:single,left:Math.round((1000-sm.width)/2),top:Math.round((1000-sm.height)/2)}]).png().toFile(path.join(dir,`${e.id}-preview.png`));
 for(const [j,s]of [256,128,64,32].entries()){
  const tiny=await sharp(crop).resize(s,s,{fit:'inside'}).png().toBuffer();const tm=await sharp(tiny).metadata();
  await fs.writeFile(path.join(dir,`${e.id}-${s}.png`),tiny);
  qa.push({input:tiny,left:Math.round(215+j*300-tm.width/2),top:Math.round(205+i*300-tm.height/2)});
 }
 checks.push({id:e.id,title:e.title,sha256:hash(bytes),source:e.file,width:f.info.width,height:f.info.height,normalizedSilhouetteIoU:intersection/union,measurement:'与单色参考分别按紧致边界归一到512平方后比较轮廓蒙版；只衡量换色时的形状保留，不代表受众识读测试。'});
}
await sharp(svg(1800,805,`<path d="M600 40V775M1200 40V775" stroke="#e5e8eb"/><g font-family="${font}" text-anchor="middle">${labels}</g>`)).composite(parts).png().toFile(path.join(dir,'three-color-directions.png'));
const ql=[256,128,64,32].map((s,j)=>`<text x="${215+j*300}" y="40">${s}px</text>`).join('')+entries.map((e,i)=>`<text x="50" y="${213+i*300}">${e.id}</text>`).join('');
await sharp(svg(1300,950,`<g font-family="${font}" font-size="20" fill="#666" text-anchor="middle">${ql}</g>`)).composite(qa).png().toFile(path.join(dir,'qa-sizes.png'));
await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify(checks,null,2));
console.log(JSON.stringify({dir,checks:checks.map(x=>({id:x.id,shapeIoU:x.normalizedSilhouetteIoU}))}));
