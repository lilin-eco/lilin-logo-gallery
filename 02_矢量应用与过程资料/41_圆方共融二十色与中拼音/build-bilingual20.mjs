import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const base=path.resolve('output/礼林Logo完整档案_2026-11-16/02_矢量应用与过程资料/41_圆方共融二十色与中拼音');
const specs=JSON.parse(await fs.readFile(path.join(base,'design-specs.json'),'utf8'));
const outlines=JSON.parse((await fs.readFile(path.join(base,'glyph-outlines.json'),'utf8')).replace(/^\uFEFF/,''));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const svg=(w,h,body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
await fs.mkdir(path.join(base,'originals'),{recursive:true});await fs.mkdir(path.join(base,'inputs'),{recursive:true});await fs.copyFile(specs[0].reference,path.join(base,'inputs/approved-91.png'));
function word(id,x,y,height,maxWidth,color,align='center'){
 const o=outlines.find(o=>o.id===id);if(!o)throw new Error('Missing outlines '+id);
 const a=o.glyphs.map(g=>g.bounds),b={x:Math.min(...a.map(b=>b.x)),y:Math.min(...a.map(b=>b.y)),right:Math.max(...a.map(b=>b.x+b.width)),bottom:Math.max(...a.map(b=>b.y+b.height))};
 const factor=Math.min(height/(b.bottom-b.y),maxWidth/(b.right-b.x)),width=(b.right-b.x)*factor,h=(b.bottom-b.y)*factor,tx=align==='left'?x:x-width/2;
 return {svg:`<g fill="${color}" transform="translate(${tx} ${y}) scale(${factor}) translate(${-b.x} ${-b.y})">${o.glyphs.map(g=>`<path d="${g.path}"/>`).join('')}</g>`,bounds:{x:tx,y,width,height:h},text:o.text};
}
const records=[];
for(const s of specs){
 const file=path.join(base,'生成记录',s.id+'.json');try{await fs.access(file)}catch{continue};const r=JSON.parse(await fs.readFile(file,'utf8'));
 const bytes=await fs.readFile(r.source),original='originals/'+r.id+'-'+path.basename(r.source);await fs.writeFile(path.join(base,original),bytes);
 const {data,info}=await sharp(bytes).flatten({background:'#fff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});let x1=info.width,y1=info.height,x2=0,y2=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const p=(y*info.width+x)*info.channels,a=[data[p],data[p+1],data[p+2]];if(Math.min(...a)<230&&Math.max(...a)-Math.min(...a)>8||Math.max(...a)<210){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}}
 const crop={left:Math.max(0,x1-6),top:Math.max(0,y1-6),width:Math.min(info.width-(x1-6),x2-x1+13),height:Math.min(info.height-(y1-6),y2-y1+13)};
 const mark=await sharp(bytes).extract(crop).png().toBuffer();await fs.writeFile(path.join(base,r.id+'-symbol.png'),mark);
 const horizontal=s.layout==='horizontal',W=horizontal?1400:1100,H=horizontal?900:1120;
 const icon=await sharp(mark).resize(horizontal?470:520,horizontal?540:600,{fit:'inside'}).png().toBuffer({resolveWithObject:true});
 const ix=horizontal?80:Math.round((W-icon.info.width)/2),iy=horizontal?Math.round((H-icon.info.height)/2):55;
 let cn,latin;const ink=({'C06':'#292D30','C07':'#244B3B','C14':'#1F3D36','C16':'#523C2C','C19':'#195C4D','C20':'#2F3943'})[s.id]??s.palette[0],latinInk=ink;
 if(horizontal){cn=word(s.id+'-cn',650,330,s.chinese.length===4?95:130,620,ink,'left');latin=word(s.id+'-pinyin',650,cn.bounds.y+cn.bounds.height+55,38,620,latinInk,'left');}
 else if(s.layout==='roman-first'){latin=word(s.id+'-pinyin',W/2,750,94,740,latinInk);cn=word(s.id+'-cn',W/2,905,72,680,ink);}
 else{cn=word(s.id+'-cn',W/2,760,s.chinese.length===4?112:136,740,ink);latin=word(s.id+'-pinyin',W/2,945,36,750,latinInk);}
 if(s.chinese!==cn.text||s.pinyin!==latin.text)throw new Error('Text mismatch');
 for(const b of [cn.bounds,latin.bounds])if(b.x<0||b.x+b.width>W||b.y+b.height>H)throw new Error('Clipped text '+s.id);
 const art=svg(W,H,`<rect width="${W}" height="${H}" fill="white"/><image x="${ix}" y="${iy}" width="${icon.info.width}" height="${icon.info.height}" xlink:href="data:image/png;base64,${icon.data.toString('base64')}"/>${cn.svg}${latin.svg}`);
 await fs.writeFile(path.join(base,r.id+'-lockup.svg'),art);await sharp(art).png().toFile(path.join(base,r.id+'-lockup.png'));
 await sharp(art).resize(220,200,{fit:'inside'}).png().toFile(path.join(base,r.id+'-small.png'));
 const names={vertical:'中文主标／拼音副标',horizontal:'横向中拼音组合','roman-first':'拼音主标／中文副标'};
 records.push({...r,original,sha256:hash(bytes),width:info.width,height:info.height,crop,png:r.id+'-lockup.png',svg:r.id+'-lockup.svg',wordInk:ink,shape:`${r.name}配色；${r.chinese}／${r.pinyin}，${names[r.layout]}。`,textOutlined:true,cnBounds:cn.bounds,pinyinBounds:latin.bounds});
}
async function board(list,file,cols,cw,ch){const W=cols*cw+32,H=Math.ceil(list.length/cols)*ch+88,layers=[];
 layers.push({input:svg(W,80,'<text x="22" y="32" font-family="Microsoft YaHei" font-size="25" fill="#2f3e40">礼林 · 二十色与中拼音组合</text><text x="22" y="60" font-family="Microsoft YaHei" font-size="14" fill="#6f7c77">91 圆方共融｜C01–C20｜纯色、多色与品牌排版</text>'),left:0,top:0});
 for(let i=0;i<list.length;i++){const r=list[i],x=16+i%cols*cw,y=82+Math.floor(i/cols)*ch;
 layers.push({input:svg(cw-12,ch-12,`<rect width="100%" height="100%" rx="8" fill="white"/><text x="16" y="30" font-size="17" font-family="Microsoft YaHei" fill="#344341">${r.id} ${r.name}</text>${r.palette.map((c,j)=>`<circle cx="${20+j*21}" cy="${ch-30}" r="6" fill="${c}"/>`).join('')}`),left:x,top:y});
 const im=await sharp(path.join(base,r.png)).resize(cw-35,ch-105,{fit:'inside'}).png().toBuffer({resolveWithObject:true});layers.push({input:im.data,left:x+Math.round((cw-12-im.info.width)/2),top:y+45+Math.round((ch-105-im.info.height)/2)});}
 await sharp({create:{width:W,height:H,channels:3,background:'#f3f4f0'}}).composite(layers).png().toFile(path.join(base,file));}
if(records.length){await board(records,'colors-bilingual-20.png',4,440,450);for(let i=0;i<records.length;i+=4){const list=records.slice(i,i+4);await board(list,`detail-${Math.floor(i/4)+1}.png`,2,650,600);
 const layers=[];for(let j=0;j<list.length;j++){const r=list[j];layers.push({input:svg(260,220,`<text x="15" y="35" font-size="18" font-family="Microsoft YaHei">${r.id} ${r.name}</text>`),left:0,top:j*230});layers.push({input:await fs.readFile(path.join(base,r.id+'-small.png')),left:280,top:j*230});}
 await sharp({create:{width:530,height:list.length*230,channels:3,background:'#fff'}}).composite(layers).png().toFile(path.join(base,`qa-${Math.floor(i/4)+1}.png`));}}
const cards=records.map(r=>`<article id="${r.id}"><h2>${r.id} ${r.name}</h2><a href="${r.png}"><img src="${r.png}" alt="${esc(r.shape)}"></a><p>${esc(r.chinese)} ／ ${esc(r.pinyin)}</p><p>${r.palette.map(c=>`<span style="background:${c};display:inline-block;width:14px;height:14px;border-radius:50%"></span> ${c}`).join('　')}</p><p><a href="${r.png}">PNG大图</a> · <a href="${r.svg}">文字转曲SVG</a> · <a href="${r.original}">配色生成原图</a></p></article>`).join('');
await fs.writeFile(path.join(base,'预览.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>礼林二十色与中拼音</title><style>body{max-width:1360px;margin:auto;padding:28px 20px;color:#2e4039;background:#f3f4f0;font:16px/1.7 system-ui,'Microsoft YaHei',sans-serif}a{color:#32694f}h1{font-size:28px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{padding:18px;background:#fff;border:1px solid #dde2db;border-radius:10px}h2{font-size:19px}img{width:100%;height:350px;object-fit:contain}p{font-size:13px;overflow-wrap:anywhere}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.grid{grid-template-columns:1fr}}</style><a href="../../">返回全部图册</a><h1>礼林 · 二十色与中拼音组合</h1><p>重点图标91的20套配色与品牌排版。</p><p><a href="colors-bilingual-20.png">二十款总览</a> · <a href="README.md">配色与字体说明</a></p><div class="grid">${cards}</div></html>`);
await fs.writeFile(path.join(base,'manifest.json'),JSON.stringify(records,null,2));console.log(JSON.stringify({count:records.length,overview:path.join(base,'colors-bilingual-20.png')}));
