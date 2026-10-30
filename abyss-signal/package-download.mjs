import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';
const root='dist/abyss-signal';
let html=await readFile(`${root}/index.html`,'utf8');
for(const [tag,url] of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]){
 const js=await readFile(resolve(root,url),'utf8');html=html.replace(tag,()=>`<script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
}
for(const [tag,url] of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]){const css=await readFile(resolve(root,url),'utf8');html=html.replace(tag,()=>`<style>${css}</style>`);}
html=html.replace(/<link\b[^>]*rel="(?:modulepreload|icon)"[^>]*>/g,'');
const instructions='ABYSS SIGNAL — DOWNLOAD EDITION\r\n\r\nExtract this ZIP and open ABYSS SIGNAL.html in a desktop browser. No install needed.\r\nFor iPad use the hosted Safari link: https://tuffm82-pixel.github.io/Horror-tips/abyss-signal/\r\n\r\nWASD move / drag to look / E use / Shift run / H hide / Escape pause.\r\nTouch: left joystick, right swipe, USE, RUN, HIDE.\r\nComplete ten operations across eight rooms. Repair circuits, steady pressure, tune frequencies and open the archive. The capsule takes 45 seconds to prepare. Checkpoints save on this device.\r\nGraphics and sound effects are included; the downloaded game works offline. Spoken dialogue uses your device voices where available. Tap REPLAY RADIO to repeat a line.\r\n';
function crc32(data){let c=0xffffffff;for(const n of data){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
const entries=[['ABYSS SIGNAL.html',html],['START HERE.txt',instructions]],local=[],central=[];let offset=0;
for(const [name,content] of entries){const filename=Buffer.from(name),data=Buffer.from(content),packed=deflateRawSync(data),crc=crc32(data),header=Buffer.alloc(30),record=Buffer.alloc(46);
 header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
 record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(0x21,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(packed.length,20);record.writeUInt32LE(data.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);local.push(header,filename,packed);central.push(record,filename);offset+=header.length+filename.length+packed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
await mkdir(`${root}/downloads`,{recursive:true});await writeFile(`${root}/downloads/ABYSS-SIGNAL.zip`,Buffer.concat([...local,directory,end]));await mkdir('test-results',{recursive:true});await writeFile('test-results/ABYSS SIGNAL.html',html);console.log(`ABYSS SIGNAL: standalone HTML ${Buffer.byteLength(html)} bytes; offline ZIP packaged.`);

