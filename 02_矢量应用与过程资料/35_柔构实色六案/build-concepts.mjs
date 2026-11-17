import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import crypto from 'node:crypto';
const base=path.dirname(fileURLToPath(import.meta.url));
await fs.mkdir(path.join(base,'originals'),{recursive:true});
const records=[];
const files=(await fs.readdir(path.join(base,'生成记录'))).filter(f=>/^\d{2}\.json$/.test(f)).sort();
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><style>text{font-family:'Microsoft YaHei',sans-serif}</style>${body}</svg>`);
for(const file of files){
 const r=JSON.parse(await fs.readFile(path.join(base,'生成记录',file),'utf8'));
 const src=r.source; if(!src)throw new Error('Missing source: '+r.id);
 const bytes=await fs.readFile(src),h=crypto.createHash('sha256').update(bytes).digest('hex');
 const original=`originals/${r.id}-${path.basename(src)}`;await fs.writeFile(path.join(base,original),bytes);
 const {data,info}=await sharp(src).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let x1=info.width,y1=info.height,x2=0,y2=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const p=(y*info.width+x)*info.channels,v=[data[p],data[p+1],data[p+2]];
  if(Math.max(...v)<205 || Math.max(...v)-Math.min(...v)>40){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}
 }
 if(x1>x2)throw new Error('Empty graphic '+r.id);
 const left=Math.max(0,x1-8),top=Math.max(0,y1-8);
 const crop={left,top,width:Math.min(info.width-left,x2-x1+17),height:Math.min(info.height-top,y2-y1+17)};
 const mark=await sharp(src).extract(crop).png().toBuffer();await fs.writeFile(path.join(base,r.id+'-symbol.png'),mark);
 await sharp(src).resize({width:520,height:520,fit:'inside'}).png().toFile(path.join(base,r.id+'-review.png'));
 for(const size of [32,64,128])await sharp(mark).resize({width:size,height:size,fit:'contain',background:'#ffffff'}).png().toFile(path.join(base,`${r.id}-${size}px.png`));
 records.push({...r,original,sha256:h,width:info.width,height:info.height,crop});
}
const board=async (list,name,cols,cardW,cardH,markW,markH)=>{
 const width=cols*cardW+40,height=Math.ceil(list.length/cols)*cardH+90,layers=[];
 layers.push({input:svg(width,80,`<text x="24" y="38" font-size="26" fill="#53636A">礼林生态 · 柔构实色六案</text><text x="24" y="66" font-size="14" fill="#777582">59–61 柔构相承｜62–64 中央荷花</text>`),left:0,top:0});
 for(let i=0;i<list.length;i++){
  const r=list[i],x=20+(i%cols)*cardW,y=90+Math.floor(i/cols)*cardH;
  layers.push({input:svg(cardW-12,cardH-12,`<rect width="100%" height="100%" rx="9" fill="white"/><text x="20" y="32" font-size="18" fill="#53636A">${r.id}　${r.name}</text><text x="${(cardW-12)/2}" y="${cardH-53}" font-size="21" fill="#58656A" text-anchor="middle" letter-spacing="3">礼林生态</text><text x="${(cardW-12)/2}" y="${cardH-29}" font-size="9" fill="#817987" text-anchor="middle" letter-spacing="3">LILIN ECO</text>`),left:x,top:y});
  const graphic=await sharp(path.join(base,r.id+'-symbol.png')).resize({width:markW,height:markH,fit:'inside'}).png().toBuffer({resolveWithObject:true});
  layers.push({input:graphic.data,left:x+Math.round((cardW-12-graphic.info.width)/2),top:y+48+Math.round((markH-graphic.info.height)/2)});
 }
 await sharp({create:{width,height,channels:3,background:'#f7f5f2'}}).composite(layers).png().toFile(path.join(base,name));
};
for(let i=0;i<records.length;i+=4)await board(records.slice(i,i+4),`detail-${i/4+1}.png`,2,600,450,450,310);
await board(records,'six-directions.png',3,520,420,380,270);
const qa=[];
for(let i=0;i<records.length;i++){
 const r=records[i];qa.push({input:svg(280,34,`<text x="15" y="25" font-size="17" fill="#53636A">${r.id} ${r.name}</text>`),left:0,top:i*160});
 let x=290;for(const size of [32,64,128]){qa.push({input:await fs.readFile(path.join(base,`${r.id}-${size}px.png`)),left:x,top:15+i*160});x+=size+70;}
}
await sharp({create:{width:800,height:Math.max(160,records.length*160),channels:3,background:'#fff'}}).composite(qa).png().toFile(path.join(base,'qa-sizes.png'));
await fs.writeFile(path.join(base,'manifest.json'),JSON.stringify(records,null,2));
console.log(JSON.stringify({count:records.length,boards:Math.ceil(records.length/4)}));
