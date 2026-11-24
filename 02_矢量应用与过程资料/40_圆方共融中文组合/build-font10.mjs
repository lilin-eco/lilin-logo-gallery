import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const base=path.resolve('output/礼林Logo完整档案_2026-11-16/02_矢量应用与过程资料/40_圆方共融中文组合');
const input='C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-54826d67-e170-4f2f-aca2-9dbbc593d880.png';
const specs=JSON.parse(await fs.readFile(path.join(base,'typography-specs.json'),'utf8'));
const outlines=JSON.parse((await fs.readFile(path.join(base,'glyph-outlines.json'),'utf8')).replace(/^\uFEFF/,''));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const svg=(w,h,s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`);
await fs.mkdir(path.join(base,'inputs'),{recursive:true});const source=await fs.readFile(input);await fs.writeFile(path.join(base,'inputs/approved-91.png'),source);
const {data,info}=await sharp(source).removeAlpha().raw().toBuffer({resolveWithObject:true});let x1=info.width,y1=info.height,x2=0,y2=0;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const p=(y*info.width+x)*info.channels,a=[data[p],data[p+1],data[p+2]];if(Math.max(...a)-Math.min(...a)>40){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}}
const crop={left:x1-2,top:y1-2,width:x2-x1+5,height:y2-y1+5};
const icon=await sharp(source).extract(crop).resize(600,680,{fit:'inside'}).png().toBuffer({resolveWithObject:true});await fs.writeFile(path.join(base,'fixed-icon.png'),icon.data);
const iconX=Math.round((1000-icon.info.width)/2),iconY=65,textY=835,records=[];
for(const s of specs){
 const o=outlines.find(o=>o.id===s.id);if(o.glyphs.map(g=>g.text).join('')!=='礼林')throw new Error('Wrong text');
 const b={x:Math.min(...o.glyphs.map(g=>g.bounds.x)),y:Math.min(...o.glyphs.map(g=>g.bounds.y)),right:Math.max(...o.glyphs.map(g=>g.bounds.x+g.bounds.width)),bottom:Math.max(...o.glyphs.map(g=>g.bounds.y+g.bounds.height))};
 const sy=140/(b.bottom-b.y)*s.scaleY,sx=140/(b.bottom-b.y)*s.scaleX;
 const width=(b.right-b.x)*sx+Math.abs(s.skew)*(b.bottom-b.y)*sy;
 const tx=(1000-width)/2-Math.min(0,s.skew*(b.bottom-b.y)*sy),ty=textY;
 const defs='<defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#0640ae"/><stop offset="1" stop-color="#008eb1"/></linearGradient></defs>';
 const paths=o.glyphs.map(g=>`<path d="${g.path}"/>`).join('');
 const word=`<g transform="translate(${tx} ${ty}) matrix(${sx} 0 ${s.skew*sy} ${sy} 0 0) translate(${-b.x} ${-b.y})" fill="${s.color==='gradient'?'url(#ink)':s.color}" stroke="${s.roundStroke?s.color:'none'}" stroke-width="${s.roundStroke}" stroke-linejoin="round" stroke-linecap="round">${paths}</g>`;
 const layout=svg(1000,1080,`${defs}<rect width="1000" height="1080" fill="white"/><image x="${iconX}" y="${iconY}" width="${icon.info.width}" height="${icon.info.height}" xlink:href="data:image/png;base64,${icon.data.toString('base64')}"/>${word}`);
 await fs.writeFile(path.join(base,s.id+'-lockup.svg'),layout);await sharp(layout).png().toFile(path.join(base,s.id+'-lockup.png'));
 await sharp(layout).resize({width:160,height:173}).png().toFile(path.join(base,s.id+'-small.png'));
 records.push({...s,tool:'System.Drawing glyph outlines + SVG typesetting + sharp rasterization',sourceIcon:'inputs/approved-91.png',sourceIconSha256:hash(source),embeddedIconSha256:hash(icon.data),png:s.id+'-lockup.png',svg:s.id+'-lockup.svg',textOutlined:true,iconPosition:{x:iconX,y:iconY,width:icon.info.width,height:icon.info.height},textBounds:{x:tx,y:ty,width,height:(b.bottom-b.y)*sy}});
}
async function board(list,file,cols,cw,ch){const w=cols*cw+32,h=Math.ceil(list.length/cols)*ch+82,layers=[];
 layers.push({input:svg(w,75,'<text x="24" y="32" font-family="Microsoft YaHei" font-size="25" fill="#233c56">礼林 · 中文字体组合</text><text x="24" y="59" font-family="Microsoft YaHei" font-size="14" fill="#708094">91 圆方共融｜图标固定，只比较字形、字重和字距</text>'),left:0,top:0});
 for(let i=0;i<list.length;i++){const s=list[i],x=16+i%cols*cw,y=80+Math.floor(i/cols)*ch;
 layers.push({input:svg(cw-12,ch-12,`<rect width="100%" height="100%" rx="9" fill="white"/><text x="16" y="30" font-family="Microsoft YaHei" font-size="16" fill="#364b63">${s.id} ${s.name}</text>`),left:x,top:y});
 const im=await sharp(path.join(base,s.png)).resize(cw-36,ch-70,{fit:'inside'}).png().toBuffer({resolveWithObject:true});layers.push({input:im.data,left:x+Math.round((cw-12-im.info.width)/2),top:y+40});}
 await sharp({create:{width:w,height:h,channels:3,background:'#f2f5f8'}}).composite(layers).png().toFile(path.join(base,file));}
await board(records,'chinese-10.png',5,340,410);await board(records.slice(0,5),'detail-1.png',3,500,560);await board(records.slice(5),'detail-2.png',3,500,560);
const qa=[];for(let i=0;i<records.length;i++){const r=records[i];qa.push({input:svg(170,200,`<text x="14" y="30" font-size="18" font-family="Microsoft YaHei">${r.id} ${r.name}</text>`),left:0,top:i*190});qa.push({input:await fs.readFile(path.join(base,r.id+'-small.png')),left:200,top:i*190});}
await sharp({create:{width:390,height:1900,channels:3,background:'#fff'}}).composite(qa).png().toFile(path.join(base,'qa-small.png'));
const cards=records.map(r=>`<article id="${r.id}"><h2>${r.id} ${r.name}</h2><a href="${r.png}"><img src="${r.png}" alt="${r.name}：图标下方礼林二字"></a><p>${esc(r.description)}</p><p><a href="${r.png}">PNG大图</a> · <a href="${r.svg}">固定字形SVG</a></p></article>`).join('');
await fs.writeFile(path.join(base,'预览.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>礼林中文组合 · 10种字体</title><style>body{max-width:1240px;margin:auto;padding:28px 20px;color:#233c56;background:#f2f5f8;font:16px/1.7 system-ui,'Microsoft YaHei',sans-serif}a{color:#185d9c}h1{font-size:28px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{padding:18px;background:#fff;border:1px solid #dce3ea;border-radius:10px}h2{font-size:19px}img{width:100%;height:auto}p{font-size:14px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.grid{grid-template-columns:1fr}}</style><a href="../../">返回全部图册</a><h1>礼林 · 中文字体组合</h1><p>重点图标91「圆方共融」，下方统一使用“礼林”两个字。</p><p><a href="chinese-10.png">十款总览</a> · <a href="README.md">字体与比例说明</a></p><div class="grid">${cards}</div></html>`);
await fs.writeFile(path.join(base,'manifest.json'),JSON.stringify({date:'2026-11-24',count:10,sourceIconSha256:hash(source),crop,iconUnchanged:true,iconProcessing:'统一机械裁边与等比缩放，所有组合嵌入同一PNG字节；没有重绘图标。',text:'礼林',generatedByImageModel:false,variants:records},null,2));
console.log(JSON.stringify({count:records.length,board:path.join(base,'chinese-10.png'),icon:icon.info}));
