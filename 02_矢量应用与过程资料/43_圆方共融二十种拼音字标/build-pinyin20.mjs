import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const root=path.resolve('output/礼林Logo完整档案_2026-11-16');
const base=path.join(root,'02_矢量应用与过程资料/43_圆方共融二十种拼音字标');
const input=await fs.readFile(path.join(root,'02_矢量应用与过程资料/42_圆方共融中国红拼音/inputs/approved-91.png'));
const specs=JSON.parse(await fs.readFile(path.join(base,'font-specs.json'),'utf8'));
const outlines=JSON.parse((await fs.readFile(path.join(base,'glyph-outlines.json'),'utf8')).replace(/^\uFEFF/,''));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const svg=(w,h,s)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`);
const region={left:0,top:0,width:1254,height:1160};
const referencePixels=await sharp(input).extract(region).flatten({background:'#fff'}).removeAlpha().raw().toBuffer();
await fs.mkdir(path.join(base,'inputs'),{recursive:true});await fs.writeFile(path.join(base,'inputs/approved-91.png'),input);
function luminance(color){const c=color.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];}
const records=[];
for(const s of specs){
 const o=outlines.find(o=>o.id===s.id);assert.equal(o.text,'LILIN SHENGTAI');
 const a=o.glyphs.map(g=>g.bounds),b={x:Math.min(...a.map(b=>b.x)),y:Math.min(...a.map(b=>b.y)),right:Math.max(...a.map(b=>b.x+b.width)),bottom:Math.max(...a.map(b=>b.y+b.height))};
 const scale=Math.min(s.targetHeight/(b.bottom-b.y),s.maxWidth/(b.right-b.x)),w=(b.right-b.x)*scale,h=(b.bottom-b.y)*scale,x=(1254-w)/2,y=1220;
 const paths=o.glyphs.map((g,i)=>`<path d="${g.path}"${s.secondColor&&i>=5?` fill="${s.secondColor}"`:''}/>`).join('');
 const word=`<g fill="${s.color}" transform="translate(${x} ${y}) scale(${scale}) translate(${-b.x} ${-b.y})">${paths}</g>`;
 const art=svg(1254,1420,`<rect width="100%" height="100%" fill="white"/><image width="1254" height="1254" xlink:href="data:image/png;base64,${input.toString('base64')}"/>${word}`);
 await fs.writeFile(path.join(base,s.id+'-lockup.svg'),art);await sharp(art).png().toFile(path.join(base,s.id+'-lockup.png'));
 await sharp(art).resize({width:220}).png().toFile(path.join(base,s.id+'-small.png'));
 const compare=await sharp(art).extract(region).flatten({background:'#fff'}).removeAlpha().raw().toBuffer();assert(referencePixels.equals(compare),'Changed symbol '+s.id);
 const wordOnly=svg(1000,150,`<rect width="100%" height="100%" fill="white"/><g fill="${s.color}" transform="translate(${(1000-w*.95)/2} ${(150-h*.95)/2}) scale(${scale*.95}) translate(${-b.x} ${-b.y})">${paths}</g>`);
 await sharp(wordOnly).png().toFile(path.join(base,s.id+'-word.png'));
 const contrast=Math.min(...[s.color,s.secondColor].filter(Boolean).map(c=>1.05/(luminance(c)+.05)));
 records.push({...s,canvas:{width:1254,height:1420},textBounds:{x,y,width:w,height:h},png:s.id+'-lockup.png',svg:s.id+'-lockup.svg',word:s.id+'-word.png',iconPixelsUnchanged:true,textOutlined:true,whiteContrast:Number(contrast.toFixed(2))});
}
async function board(list,file,cols,cw,ch){const W=cols*cw+32,H=Math.ceil(list.length/cols)*ch+84,layers=[];
 layers.push({input:svg(W,80,'<text x="22" y="32" font-size="25" font-family="Microsoft YaHei" fill="#304153">礼林生态 · 二十种拼音字标</text><text x="22" y="59" font-size="14" font-family="Microsoft YaHei" fill="#74808c">图标形状与配色固定｜只比较 LILIN SHENGTAI 的字体、颜色与字距</text>'),left:0,top:0});
 for(let i=0;i<list.length;i++){const r=list[i],x=16+i%cols*cw,y=80+Math.floor(i/cols)*ch;
 layers.push({input:svg(cw-12,ch-12,`<rect width="100%" height="100%" rx="9" fill="white"/><text x="16" y="30" font-family="Microsoft YaHei" font-size="17" fill="#3b4b5b">${r.id} ${r.name}</text><text x="16" y="${ch-28}" font-family="Segoe UI" font-size="11" fill="#75808d">${esc(r.family)}${r.bold?' Bold':''}${r.italic?' Italic':''}　${r.color}</text>`),left:x,top:y});
 const im=await sharp(path.join(base,r.png)).resize(cw-35,ch-95,{fit:'inside'}).png().toBuffer({resolveWithObject:true});layers.push({input:im.data,left:x+Math.round((cw-12-im.info.width)/2),top:y+40});}
 await sharp({create:{width:W,height:H,channels:3,background:'#f3f5f8'}}).composite(layers).png().toFile(path.join(base,file));}
await board(records,'pinyin-font-color-20.png',4,440,465);
for(let i=0;i<records.length;i+=4){const list=records.slice(i,i+4),n=Math.floor(i/4)+1;await board(list,`detail-${n}.png`,2,650,650);
 const layers=[];for(let j=0;j<list.length;j++){const r=list[j];layers.push({input:svg(270,270,`<text x="15" y="35" font-family="Microsoft YaHei" font-size="18">${r.id} ${r.name}</text>`),left:0,top:j*280});layers.push({input:await fs.readFile(path.join(base,r.id+'-small.png')),left:280,top:j*280});}
 await sharp({create:{width:530,height:list.length*280,channels:3,background:'#fff'}}).composite(layers).png().toFile(path.join(base,`qa-${n}.png`));}
const comparison=[];for(let i=0;i<records.length;i++){const r=records[i],x=20+(i%2)*760,y=80+Math.floor(i/2)*140;comparison.push({input:svg(740,130,`<rect width="100%" height="100%" rx="8" fill="white"/><text x="16" y="24" font-family="Microsoft YaHei" font-size="16" fill="#546070">${r.id} ${r.name}</text>`),left:x,top:y});comparison.push({input:await sharp(path.join(base,r.word)).resize(700,105).png().toBuffer(),left:x+20,top:y+28});}
comparison.push({input:svg(1550,70,'<text x="24" y="40" font-family="Microsoft YaHei" font-size="26" fill="#304153">LILIN SHENGTAI · 字体与颜色细节</text>'),left:0,top:0});
await sharp({create:{width:1550,height:1490,channels:3,background:'#f3f5f8'}}).composite(comparison).png().toFile(path.join(base,'type-comparison.png'));
const cards=records.map(r=>`<article id="${r.id}"><h2>${r.id} ${r.name}</h2><a href="${r.png}"><img src="${r.png}" alt="${esc(r.name)}的LILIN SHENGTAI拼音组合"></a><p>${esc(r.description)}</p><p>${esc(r.family)}${r.bold?' Bold':''}${r.italic?' Italic':''} · ${r.color}${r.secondColor?' / '+r.secondColor:''}</p><p><a href="${r.png}">PNG大图</a> · <a href="${r.svg}">文字转曲SVG</a></p></article>`).join('');
await fs.writeFile(path.join(base,'预览.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>礼林生态二十种拼音字体与颜色</title><style>body{max-width:1350px;margin:auto;padding:28px 20px;color:#304153;background:#f3f5f8;font:16px/1.7 system-ui,'Microsoft YaHei',sans-serif}a{color:#315e8f}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:#fff;border:1px solid #dce1e8;border-radius:9px;padding:18px}img{width:100%;height:350px;object-fit:contain}h1{font-size:28px}h2{font-size:19px}p{font-size:14px}@media(max-width:850px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.grid{grid-template-columns:1fr}}</style><a href="../../">返回全部图册</a><h1>礼林生态 · 二十种拼音字标</h1><p>图标保持不变，比较下方LILIN SHENGTAI的字体、字重、字距和颜色。</p><p><a href="pinyin-font-color-20.png">完整组合总览</a> · <a href="type-comparison.png">字体放大对照</a> · <a href="README.md">规格与说明</a></p><div class="grid">${cards}</div></html>`);
await fs.writeFile(path.join(base,'manifest.json'),JSON.stringify({date:'2026-11-26',count:20,sourceIcon:'inputs/approved-91.png',sourceIconSha256:hash(input),text:'LILIN SHENGTAI',iconPixelsUnchanged:true,pixelVerifiedRegion:region,imageModelUsed:false,tool:'System.Drawing font outlines + SVG typesetting + sharp export',variants:records},null,2));
console.log(JSON.stringify({count:20,allSymbolsPixelIdentical:true,lowestContrast:Math.min(...records.map(r=>r.whiteContrast)),contrast:records.map(r=>({id:r.id,value:r.whiteContrast}))}));
