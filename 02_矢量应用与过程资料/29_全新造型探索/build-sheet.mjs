import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const dirs=await fs.readdir(path.join(root,'originals'));
const defs=[
 {id:'A',key:'A-',name:'双木相承',sub:'横向交织 · 海军蓝与朱橙'},
 {id:'B',key:'B-',name:'开合之礼',sub:'开放菱形 · 蓝紫与青色'},
 {id:'C',key:'C2-',name:'向光生长',sub:'直立枝干 · 深紫、珊瑚与明黄'},
 {id:'D',key:'D-',name:'共生绽放',sub:'俯视花形 · 玫红、橙色与梅紫'}
];
const bg='#f6f5f2';
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><style>text{font-family:'Microsoft YaHei','Noto Sans CJK SC',sans-serif}</style>${body}</svg>`);
const layers=[]; const qa=[]; const records=[];
for(let i=0;i<defs.length;i++){
 const d=defs[i];const file=dirs.find(f=>f.startsWith(d.key)); const src=path.join(root,'originals',file);
 const {data,info}=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let minX=info.width,minY=info.height,maxX=0,maxY=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels; const r=data[p],g=data[p+1],b=data[p+2];
  if(Math.max(r,g,b)<205 || Math.max(r,g,b)-Math.min(r,g,b)>40){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);}
 }
 const pad=6; const left=Math.max(0,minX-pad),top=Math.max(0,minY-pad);
 const crop={left,top,width:Math.min(info.width-left,maxX-minX+1+pad*2),height:Math.min(info.height-top,maxY-minY+1+pad*2)};
 const mark=await sharp(src).extract(crop).png().toBuffer();
 await fs.writeFile(path.join(root,`${d.id}-symbol.png`),mark);
 const x=40+(i%2)*680,y=150+Math.floor(i/2)*590;
 layers.push({input:svg(640,550,`<rect width="640" height="550" rx="12" fill="white"/><text x="32" y="44" font-size="23" font-weight="600" fill="#262533">${d.id}　${d.name}</text><text x="32" y="75" font-size="15" fill="#78757c">${esc(d.sub)}</text><text x="320" y="465" text-anchor="middle" font-size="29" fill="#292833" letter-spacing="6">礼林生态</text><text x="320" y="494" text-anchor="middle" font-size="12" fill="#77727d" letter-spacing="4">LILIN ECO</text>`),left:x,top:y});
 const rendered=await sharp(mark).resize({width:460,height:300,fit:'inside'}).png().toBuffer({resolveWithObject:true});
 layers.push({input:rendered.data,left:x+Math.round((640-rendered.info.width)/2),top:y+110+Math.round((300-rendered.info.height)/2)});
 qa.push({input:svg(1150,32,`<text x="20" y="25" font-size="19" fill="#252433">${d.id} ${d.name}</text>`),left:0,top:25+i*305});
 let offset=215;
 for(const size of [32,64,128,256]){
  const small=await sharp(mark).resize({width:size,height:size,fit:'contain',background:'#ffffff'}).png().toBuffer();
  await fs.writeFile(path.join(root,`${d.id}-${size}px.png`),small);
  qa.push({input:small,left:offset,top:60+i*305});offset+=size+60;
 }
 records.push({...d,file:`originals/${file}`,sha256:crypto.createHash('sha256').update(await fs.readFile(src)).digest('hex'),crop});
}
const header=svg(1400,120,`<text x="45" y="58" font-size="32" fill="#292833">礼林生态 · 全新造型探索</text><text x="45" y="94" font-size="17" fill="#79757d">从轮廓、结构到配色，重新展开四个方向</text>`);
await sharp({create:{width:1400,height:1360,channels:3,background:bg}}).composite([{input:header,left:0,top:0},...layers]).png().toFile(path.join(root,'four-new-form-directions.png'));
await sharp({create:{width:1150,height:1240,channels:3,background:'#ffffff'}}).composite(qa).png().toFile(path.join(root,'qa-sizes.png'));
await fs.writeFile(path.join(root,'checks.json'),JSON.stringify({review:'四款原图、比较图与32/64/128/256像素预览人工检查',selected:records,excluded:{file:dirs.find(f=>f.startsWith('C-')),reason:'连续条带与右向运动感较强，容易偏向运动品牌，替换为直立枝干方案'}},null,2));
console.log(JSON.stringify({sheet:path.join(root,'four-new-form-directions.png'),qa:path.join(root,'qa-sizes.png'),count:records.length}));
