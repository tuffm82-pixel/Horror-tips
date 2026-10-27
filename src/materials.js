import * as THREE from 'three';

// Repeatable hand-built surface maps keep the game self-contained and offline.
export function makeSurfaces() {
  let seed=3477;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function maps(kind,repeatX=1,repeatY=1){
    const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
    const base={brick:'#725c4d',concrete:'#727a75',grass:'#4b5940',roof:'#677474',blue:'#235571',bark:'#7f8474',skin:'#697467',window:'#293a3c'};
    ctx.fillStyle=base[kind]||'#777';ctx.fillRect(0,0,512,512);
    for(let i=0;i<12500;i++){const v=Math.floor(random()*110);ctx.fillStyle=`rgba(${v+40},${v+42},${v+35},${.04+random()*.2})`;const s=.5+random()*3;ctx.fillRect(random()*512,random()*512,s,s);}
    if(kind==='brick'){
      ctx.fillStyle='#8e8775';ctx.fillRect(0,0,512,512);
      for(let row=0;row<10;row++)for(let col=-1;col<5;col++){
        const x=col*128+(row%2)*64,y=row*52;const n=Math.floor(random()*28);
        ctx.fillStyle=`rgb(${101+n},${76+n},${60+n})`;ctx.fillRect(x+3,y+3,122,46);
        ctx.fillStyle='rgba(208,181,147,.12)';ctx.fillRect(x+4,y+4,120,2);
        for(let i=0;i<35;i++){ctx.fillStyle=random()>.5?'rgba(24,29,24,.18)':'rgba(192,159,119,.17)';ctx.fillRect(x+random()*120,y+random()*45,random()*6+1,random()*3+1);}
      }
      for(let i=0;i<24;i++){const x=random()*512;const gr=ctx.createLinearGradient(x,0,x+20,512);gr.addColorStop(0,'rgba(22,34,26,0)');gr.addColorStop(1,'rgba(22,34,26,.23)');ctx.fillStyle=gr;ctx.fillRect(x,0,10+random()*45,512);}
    }
    if(kind==='concrete'||kind==='blue'){
      for(let j=0;j<9;j++){let x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);for(let i=0;i<7;i++){x+=(random()-.5)*80;y+=random()*38;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(23,34,31,.42)';ctx.lineWidth=.5+random()*1.1;ctx.stroke();}
      for(let i=0;i<35;i++){ctx.fillStyle='rgba(23,39,29,.04)';ctx.beginPath();ctx.ellipse(random()*512,random()*512,10+random()*80,5+random()*35,random()*6,0,Math.PI*2);ctx.fill();}
      if(kind==='blue'){ctx.fillStyle='rgba(141,151,136,.5)';for(let i=0;i<70;i++)ctx.fillRect(random()*512,random()*512,1+random()*7,1+random()*12);}
    }
    if(kind==='roof')for(let x=0;x<512;x+=16){const gr=ctx.createLinearGradient(x,0,x+16,0);gr.addColorStop(0,'rgba(0,0,0,.5)');gr.addColorStop(.45,'rgba(235,242,235,.24)');gr.addColorStop(1,'rgba(0,0,0,.3)');ctx.fillStyle=gr;ctx.fillRect(x,0,16,512);}
    if(kind==='bark'||kind==='skin')for(let i=0;i<90;i++){ctx.beginPath();const x=random()*512;ctx.moveTo(x,0);ctx.bezierCurveTo(x-20,150,x+18,300,x+random()*18,512);ctx.strokeStyle=`rgba(13,25,20,${random()*.25})`;ctx.lineWidth=1+random()*6;ctx.stroke();}
    if(kind==='window')for(let i=0;i<140;i++){ctx.fillStyle=`rgba(172,188,172,${random()*.13})`;ctx.fillRect(random()*512,random()*512,.5+random()*2,10+random()*130);}
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeatX,repeatY);map.anisotropy=4;
    const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
    return {map,bumpMap:bump};
  }
  const standard=(kind,color,rx,ry,roughness,bumpScale)=>new THREE.MeshStandardMaterial({...maps(kind,rx,ry),color,roughness,bumpScale});
  const concrete=standard('concrete','#9da5a0',6,5,.68,.065);
  concrete.roughnessMap=concrete.bumpMap;
  return {
    brick:standard('brick','#bba28c',7,2,.94,.09),
    concrete,grass:standard('grass','#849270',32,32,.98,.13),
    blue:standard('blue','#6a9eae',3,1,.78,.035),
    roof:standard('roof','#71827d',4,1,.48,.07),
    bark:standard('bark','#b3b2a0',1,3,.95,.08),
    hide:standard('skin','#718174',2,2,.72,.055),
    windows:[0,1,2,3].map(i=>new THREE.MeshStandardMaterial({...maps('window'),color:i===0?'#374c4c':'#14252a',roughness:.22,metalness:.35,emissive:i===0?'#a27c3f':'#0d181c',emissiveIntensity:i===0?.55:.1})),
  };
}

export function makeFoliageTexture(){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  ctx.strokeStyle='#394332';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(25,450);ctx.bezierCurveTo(150,310,280,180,475,48);ctx.stroke();
  for(let i=0;i<105;i++){
    const t=i/105,x=40+t*420,y=440-t*380;
    const angle=-.7+(i%2?1.2:-1.0),length=35+Math.sin(i*9.1)*14;
    ctx.save();ctx.translate(x+Math.sin(i*4.3)*90,y+Math.sin(i*5.7)*65);ctx.rotate(angle);ctx.fillStyle=['#425b42','#61715a','#314b37','#72806a'][i%4];ctx.beginPath();ctx.ellipse(0,0,length,4.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
