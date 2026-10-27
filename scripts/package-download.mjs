import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';

// Bundle the production game into one HTML file that can be opened directly.
let html=await readFile('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)];
for(const [tag,url] of scripts){
 const js=await readFile(resolve('dist',url.replace(/^\.\//,'')),'utf8');
 html=html.replace(tag,()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
}
for(const [tag,url] of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]){
 const css=await readFile(resolve('dist',url.replace(/^\.\//,'')),'utf8');
 html=html.replace(tag,()=>`<style>${css}</style>`);
}
// A local file cannot use Vite's preload polyfill to fetch relative modules.
html=html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g,'');
const instructions=`HORROR TIPS — DOWNLOAD EDITION\r\n\r\nExtract this ZIP, then double-click Horror Tips.html to play the campaign in Chrome, Edge, or Firefox. No installation or Node.js required.\r\n\r\nWASD: move | Mouse drag or Q/E or Left/Right: turn | Shift: sprint | F: torch | Space: interact | Escape: pause\r\n\r\nThe campaign works offline. Fonts may fall back when offline; the game remains playable. Voices depend on the browser.\r\nMultiplayer needs the separately hosted Node server; enter its wss:// address in the multiplayer lobby.\r\n\r\nSource and server instructions: https://github.com/tuffm82-pixel/Horror-tips\r\n`;
function crc32(data){let c=0xffffffff;for(const n of data){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
// Standard ZIP with DEFLATE, UTF-8 filenames and a central directory.
const entries=[['Horror Tips.html',html],['START HERE.txt',instructions]];
const local=[],central=[];let offset=0;
for(const [name,content] of entries){
 const filename=Buffer.from(name),data=Buffer.from(content),packed=deflateRawSync(data),crc=crc32(data);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
 const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(0x21,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(packed.length,20);record.writeUInt32LE(data.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);
 local.push(header,filename,packed);central.push(record,filename);offset+=header.length+filename.length+packed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,directory,end]);
await mkdir('downloads',{recursive:true});await mkdir('dist/downloads',{recursive:true});
await writeFile('downloads/Horror-Tips.zip',zip);await writeFile('dist/downloads/Horror-Tips.zip',zip);
await mkdir('test-results',{recursive:true});await writeFile('test-results/Horror Tips.html',html);
console.log(`Packaged download: ${zip.length} bytes; standalone HTML: ${Buffer.byteLength(html)} bytes.`);
