import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const href=p=>p.split('/').map(encodeURIComponent).join('/');
const skip=new Set(['.git','.github','node_modules']);
let count=0;
async function buildDirectory(dir){
 const entries=(await fs.readdir(dir,{withFileTypes:true})).filter(e=>!skip.has(e.name)&&e.name!=='index.html').sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name,'zh-CN'));
 for(const e of entries)if(e.isDirectory())await buildDirectory(path.join(dir,e.name));
 if(dir===root)return;
 const relative=path.relative(root,dir).split(path.sep).join('/');
 const depth=relative.split('/').length,home='../'.repeat(depth);
 const original=entries.find(e=>e.name==='原图.png');
 const description=entries.find(e=>e.name==='设计说明.md'||e.name==='本组设计说明.md');
 let note='';if(description){const text=await fs.readFile(path.join(dir,description.name),'utf8');note=`<details><summary>设计说明</summary><pre>${esc(text)}</pre></details>`;}
 const rows=await Promise.all(entries.map(async e=>{const st=await fs.stat(path.join(dir,e.name));return `<li><a href="${href(e.name)}${e.isDirectory()?'/':''}">${esc(e.name)}${e.isDirectory()?'/':''}</a><span>${e.isDirectory()?'目录':st.size>1024*1024?(st.size/1024/1024).toFixed(1)+' MB':Math.ceil(st.size/1024)+' KB'}</span></li>`;}));
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(path.basename(dir))} · 礼林Logo档案</title><style>body{max-width:1000px;padding:28px 20px;margin:auto;background:#f8f7f3;color:#25382a;font:15px/1.7 system-ui,'Microsoft YaHei',sans-serif}a{color:#36593e;overflow-wrap:anywhere}h1{font-size:24px;overflow-wrap:anywhere}nav{display:flex;gap:24px}ul{padding:0;list-style:none}li{display:flex;justify-content:space-between;gap:20px;padding:11px 0;border-bottom:1px solid #deded5}li span{font-size:12px;color:#75816f;white-space:nowrap}img{display:block;max-width:100%;max-height:650px;object-fit:contain;margin:28px auto;background:white}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}details{padding:15px;background:white;border:1px solid #deded5;border-radius:8px}summary{cursor:pointer}</style></head><body><nav><a href="${home}">全部方案选择</a><a href="../">上一级目录</a></nav><h1>${esc(path.basename(dir))}</h1>${original?'<a href="'+href(original.name)+'"><img src="'+href(original.name)+'" alt="'+esc(path.basename(dir))+'"></a>':''}${note}<ul>${rows.join('')}</ul></body></html>`;
 await fs.writeFile(path.join(dir,'index.html'),html);count++;
}
await buildDirectory(root);
let gallery=await fs.readFile(path.join(root,'打开预览.html'),'utf8');
gallery=gallery.replace('<title>','<meta name="robots" content="noindex, nofollow"><meta name="description" content="礼林生态Logo设计方案集中预览与比较"><title>');
gallery=gallery.replace('已选编号尽可能保存在当前浏览器；浏览器限制本地存储时，本次打开期间仍可比较。','勾选仅保存在当前浏览器，不会自动同步给其他同事；可把方案编号发给团队讨论。');
await fs.writeFile(path.join(root,'index.html'),gallery);
await fs.writeFile(path.join(root,'.nojekyll'),'');
await fs.writeFile(path.join(root,'robots.txt'),'User-agent: *\nDisallow: /\n');
let links=0;const queue=[root];
while(queue.length){const dir=queue.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const full=path.join(dir,e.name);if(e.isDirectory()){queue.push(full);continue;}if(!e.name.endsWith('.html'))continue;const html=await fs.readFile(full,'utf8');for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^(?:[a-z]+:|#|\/\/)/i.test(m[1]))continue;const local=path.resolve(dir,decodeURIComponent(m[1].split('#')[0].split('?')[0]));assert(local.startsWith(root),`Outside archive: ${local}`);const st=await fs.stat(local);if(st.isDirectory())await fs.access(path.join(local,'index.html'));links++;}}}
console.log(JSON.stringify({directoryIndexes:count,verifiedLocalLinks:links,rootIndex:'index.html'}));
