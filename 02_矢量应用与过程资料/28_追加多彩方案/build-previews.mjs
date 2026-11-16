import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source='C:/Users/Administrator/.codex/generated_images/01a1c95b-8a24-7ac3-9404-f7f6e73da9db';
const entries=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const reference=path.resolve('output/logo-colors-2026-11-16/originals/B-exec-779b3b70-c7a9-484f-a658-1bc6f60fdb60.png');
const font='Microsoft YaHei,Arial,sans-serif';
const svg=(w,h,b)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="white"/>${b}</svg>`);
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(path.join(dir,'originals'),{recursive:true});
async function readMark(file){
 const {data,info}=await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const mask=Buffer.alloc(info.width*info.height);
 let xmin=info.width,ymin=info.height,xmax=-1,ymax=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels;const r=data[p],g=data[p+1],b=data[p+2];
  if(Math.max(r,g,b)-Math.min(r,g,b)>30&&Math.min(r,g,b)<225){mask[y*info.width+x]=255;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
 }
 const region={left:xmin,top:ymin,width:xmax-xmin+1,height:ymax-ymin+1};
 const normalized=await sharp(mask,{raw:{width:info.width,height:info.height,channels:1}}).extract(region).resize(512,512,{fit:'fill'}).raw().toBuffer();
 const crop=await sharp(file).extract({left:xmin-3,top:ymin-3,width:region.width+6,height:region.height+6}).png().toBuffer();
 return {crop,normalized,width:info.width,height:info.height};
}
const ref=await readMark(reference);
const panels=[],qa=[],checks=[];let labels='';
const all=[...entries,{id:'B-reference',name:'上轮 B · 对照',reference:true}];
for(const [i,e]of all.entries()){
 const input=e.reference?reference:path.join(source,e.file);
 const mark=e.reference?ref:await readMark(input);
 const cx=325+(i%3)*650,cy=315+Math.floor(i/3)*680;
 const img=await sharp(mark.crop).resize(455,415,{fit:'inside'}).png().toBuffer();const im=await sharp(img).metadata();
 panels.push({input:img,left:Math.round(cx-im.width/2),top:Math.round(cy-im.height/2)});
 labels+=`<text x="${cx}" y="${65+Math.floor(i/3)*680}" font-size="27" fill="#596675">${e.reference?e.name:e.id+' · '+e.name}</text><text x="${cx}" y="${575+Math.floor(i/3)*680}" font-size="36" font-weight="500" fill="#28384b">礼林生态</text><text x="${cx}" y="${613+Math.floor(i/3)*680}" font-size="16" letter-spacing="3" fill="#8a939e">LILIN ECO</text>`;
 if(e.reference)continue;
 const bytes=await fs.readFile(input),dest=path.join(dir,'originals',`${e.id}-${e.file}`);await fs.writeFile(dest,bytes);
 if(digest(bytes)!==digest(await fs.readFile(dest)))throw Error('Original copy mismatch');
 await fs.writeFile(path.join(dir,`${e.id}-crop.png`),mark.crop);
 const big=await sharp(mark.crop).resize(820,760,{fit:'inside'}).png().toBuffer();const bm=await sharp(big).metadata();
 await sharp(svg(1000,1000,'')).composite([{input:big,left:Math.round((1000-bm.width)/2),top:Math.round((1000-bm.height)/2)}]).png().toFile(path.join(dir,`${e.id}-preview.png`));
 for(const [j,s]of [256,128,64,32].entries()){
  const b=await sharp(mark.crop).resize(s,s,{fit:'inside'}).png().toBuffer();const m=await sharp(b).metadata();
  await fs.writeFile(path.join(dir,`${e.id}-${s}.png`),b);
  qa.push({input:b,left:Math.round(220+j*300-m.width/2),top:Math.round(205+i*290-m.height/2)});
 }
 let intersection=0,union=0;
 for(let n=0;n<mark.normalized.length;n++){const a=mark.normalized[n]>127,b=ref.normalized[n]>127;if(a&&b)intersection++;if(a||b)union++;}
 checks.push({id:e.id,name:e.name,source:e.file,sha256:digest(bytes),width:mark.width,height:mark.height,normalizedSilhouetteIoU:intersection/union});
}
const rules='<path d="M650 35V1325M1300 35V1325M35 680H1915" stroke="#e6e8eb"/>';
await sharp(svg(1950,1360,`${rules}<g font-family="${font}" text-anchor="middle">${labels}</g>`)).composite(panels).png().toFile(path.join(dir,'five-new-color-directions.png'));
const ql=[256,128,64,32].map((s,j)=>`<text x="${220+j*300}" y="38">${s}px</text>`).join('')+entries.map((e,i)=>`<text x="50" y="${213+i*290}">${e.id}</text>`).join('');
await sharp(svg(1300,1510,`<g font-family="${font}" font-size="20" text-anchor="middle" fill="#666">${ql}</g>`)).composite(qa).png().toFile(path.join(dir,'qa-sizes.png'));
await fs.writeFile(path.join(dir,'checks.json'),JSON.stringify({comparison:'前景紧致边界归一到512平方的轮廓对照，不是受众识读或记忆测试。',originalCopiesVerified:true,checks},null,2));
console.log(JSON.stringify({folder:dir,newColors:5,referenceColors:1,silhouetteChecks:checks.map(x=>({id:x.id,iou:x.normalizedSilhouetteIoU}))}));
