import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source='C:/Users/Administrator/.codex/generated_images/01a1c95b-8a24-7ac3-9404-f7f6e73da9db';
const items=[
 {id:'A',title:'当代宋意',sub:'字形气质 · 东方人文',file:'exec-01fc317b-cc54-4798-8faf-cd5ef40fdc72.png',initial:'exec-baf1f423-e066-4c6c-b0a9-51919c8f273d.png'},
 {id:'B',title:'圆融几何',sub:'柔和模块 · 亲和清晰',file:'exec-770ebde3-fccc-4cae-9e7f-1a709d486a38.png',initial:'exec-c3264940-ae36-4f72-a4ee-ea2827d6b594.png'},
 {id:'C',title:'现代共笔',sub:'结构连接 · 简练有序',file:'exec-1d3ff1e8-568c-43ec-95e7-c31aafb23a5f.png'}
];
const imageDir=path.join(dir,'originals');await fs.mkdir(imageDir,{recursive:true});
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#f8f7f3"/>${body}</svg>`);
const font='Microsoft YaHei,Arial,sans-serif';
const comparison=[],qa=[],metrics=[];
let labels='';
for(const [i,e]of items.entries()){
 const input=path.join(source,e.file);await fs.copyFile(input,path.join(imageDir,`${e.id}-selected.png`));
 if(e.initial)await fs.copyFile(path.join(source,e.initial),path.join(imageDir,`${e.id}-initial.png`));
 const {data,info}=await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let xmin=info.width,ymin=info.height,xmax=-1,ymax=-1,ink=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels,r=data[p],g=data[p+1],b=data[p+2];
  if(g-r>10&&g-b>7&&g<190){ink++;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
 }
 const region={left:xmin-3,top:ymin-3,width:xmax-xmin+7,height:ymax-ymin+7};
 const crop=await sharp(input).extract(region).png().toBuffer();
 await fs.writeFile(path.join(dir,`${e.id}-crop.png`),crop);
 const logo=await sharp(crop).resize(485,470,{fit:'inside'}).png().toBuffer();
 const m=await sharp(logo).metadata();
 comparison.push({input:logo,left:Math.round(300+i*600-m.width/2),top:Math.round(365-m.height/2)});
 labels+=`<text x="${300+i*600}" y="75" font-size="29">${e.id} · ${e.title}</text><text x="${300+i*600}" y="665" font-size="20" fill="#77816e">${e.sub}</text>`;
 const big=await sharp(crop).resize(820,760,{fit:'inside'}).png().toBuffer();const bm=await sharp(big).metadata();
 await sharp(svg(1000,1000,'')).composite([{input:big,left:Math.round((1000-bm.width)/2),top:Math.round((1000-bm.height)/2)}]).png().toFile(path.join(dir,`${e.id}-preview.png`));
 for(const [j,s]of [256,128,64,32].entries()){
  const tiny=await sharp(crop).resize(s,s,{fit:'inside'}).png().toBuffer();const tm=await sharp(tiny).metadata();
  await fs.writeFile(path.join(dir,`${e.id}-${s}.png`),tiny);
  qa.push({input:tiny,left:Math.round(220+j*300-tm.width/2),top:Math.round(200+i*300-tm.height/2)});
 }
 metrics.push({id:e.id,title:e.title,source:e.file,initialSource:e.initial??null,sourceWidth:info.width,sourceHeight:info.height,inkBounds:region,relativeInk:ink/((xmax-xmin+1)*(ymax-ymin+1))});
}
await sharp(svg(1800,740,`<path d="M600 38V700M1200 38V700" stroke="#dedfd7"/><g font-family="${font}" text-anchor="middle" fill="#36593e">${labels}</g>`)).composite(comparison).png().toFile(path.join(dir,'three-directions.png'));
const ql=[256,128,64,32].map((s,j)=>`<text x="${220+j*300}" y="38">${s}px</text>`).join('')+items.map((e,i)=>`<text x="55" y="${210+i*300}">${e.id}</text>`).join('');
await sharp(svg(1300,950,`<g font-family="${font}" text-anchor="middle" font-size="20" fill="#53634e">${ql}</g>`)).composite(qa).png().toFile(path.join(dir,'qa-sizes.png'));
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(metrics,null,2));
console.log(JSON.stringify({folder:dir,savedOriginals:5,selectedDirections:3,sizeChecks:12}));
