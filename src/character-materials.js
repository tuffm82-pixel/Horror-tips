import * as THREE from 'three';

// Small, deterministic surface maps shared by all avatars. These remain local
// to the game so the downloadable edition uses the same materials offline.
const surfaces=new Map();
const clamp=x=>Math.max(0,Math.min(1,x));
function surface(kind){
  if(surfaces.has(kind))return surfaces.get(kind);
  const size=256,heights=new Float32Array(size*size),color=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
  let seed=7319;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=y*size+x,u=x/size,v=y/size,n=random(),broad=Math.sin(u*31+Math.sin(v*19))*Math.sin(v*23+u*7);
    let height=.5+(n-.5)*.1,tone=.97+(n-.5)*.035,r=.8;
    if(kind==='cloth'){
      const warp=Math.cos(x*Math.PI/2),weft=Math.cos(y*Math.PI/2);
      height=.5+warp*.08+weft*.06+(n-.5)*.025;tone=.97+warp*.008+weft*.006+(n-.5)*.015;r=.9;
    }else if(kind==='skin'){
      height=.5+(n-.5)*.16;tone=.96+broad*.014+(n-.5)*.025;r=.72+(n-.5)*.1;
    }else if(kind==='hair'){
      const strand=Math.sin(u*Math.PI*2*73+Math.sin(v*Math.PI*4)*.45);
      height=.5+strand*.2;tone=.82+strand*.12+broad*.035;r=.66+strand*.09;
    }else if(kind==='creature'){
      const tendon=Math.pow(Math.max(0,Math.cos(u*Math.PI*16+Math.sin(v*Math.PI*6)*1.2)),16);
      const fissure=Math.pow(Math.max(0,Math.cos(u*Math.PI*30+Math.sin(v*Math.PI*18))),28);
      height=.5+tendon*.25-fissure*.14+(n-.5)*.1;tone=.82+broad*.07+tendon*.1-fissure*.09;r=.65+broad*.12;
    }else if(kind==='horn'){
      const ridge=Math.sin(v*Math.PI*64+Math.sin(u*Math.PI*4)*.5);
      height=.5+ridge*.16;tone=.84+ridge*.04+broad*.05;r=.8;
    }else if(kind==='leather'){
      height=.5+(n-.5)*.2;tone=.91+(n-.5)*.055;r=.6+(n-.5)*.12;
    }
    heights[i]=height;const p=i*4,c=Math.round(clamp(tone)*255);
    color.set([c,c,c,255],p);const g=Math.round(clamp(r)*255);roughness.set([g,g,g,255],p);
  }
  const h=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(h(x-1,y)-h(x+1,y))*.65,dy=(h(x,y-1)-h(x,y+1))*.65,len=Math.hypot(dx,dy,1);
    normal.set([Math.round((dx/len*.5+.5)*255),Math.round((dy/len*.5+.5)*255),Math.round((1/len*.5+.5)*255),255],(y*size+x)*4);
  }
  const texture=(bytes,srgb=false)=>{const t=new THREE.DataTexture(bytes,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;};
  const result={map:texture(color,true),normalMap:texture(normal),roughnessMap:texture(roughness)};surfaces.set(kind,result);return result;
}

export function dressMaterials(materials,creature=false){
  const kinds=creature?{skin:'creature',jaw:'creature',horns:'horn',teeth:'horn'}:{skin:'skin',shirt:'cloth',pants:'cloth',hair:'hair',shoes:'leather',sole:'leather'};
  for(const [name,kind]of Object.entries(kinds)){
    const material=materials[name];if(!material)continue;
    const strength=kind==='skin'?.22:kind==='cloth'?.24:.55;
    Object.assign(material,surface(kind));material.normalScale=new THREE.Vector2(strength,strength);
    // The map carries calibrated roughness; avoid multiplying it twice.
    material.roughness=1;
  }
}

// Low frequency color belongs on the anatomy, not the repeating pore texture.
// White-based tints preserve the avatar's chosen skin tone.
export function tintAnatomy(geometry,creature=false){
  if(geometry.getAttribute('color'))return;
  const p=geometry.getAttribute('position'),colors=new Float32Array(p.count*3);
  const gaussian=(x,center,width)=>Math.exp(-(((x-center)/width)**2));
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    let red=1,green=1,blue=1;
    if(creature){
      const recess=(Math.sin(y*29+x*12)+1)*.025;
      red=.96-recess;green=1-recess*.5;blue=.94-recess;
    }else{
      // Coordinates match the final scaled head: cheek planes, nose, lips, ears.
      const front=clamp((z-.055)/.045);
      const cheek=gaussian(Math.abs(x),.065,.028)*gaussian(y,1.68,.035)*front;
      const nose=gaussian(x,0,.023)*gaussian(y,1.691,.025)*front;
      const lip=gaussian(x,0,.031)*gaussian(y,1.651,.006)*front;
      const ear=gaussian(Math.abs(x),.118,.014)*gaussian(y,1.70,.042);
      const warmth=cheek*.08+nose*.04+ear*.07+lip*.21;
      green=1-warmth;blue=1-warmth*.9;
    }
    colors.set([red,green,blue],i*3);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
}
