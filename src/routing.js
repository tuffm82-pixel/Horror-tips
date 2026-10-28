import {SCHOOL_OBSTACLES,segmentIntersectsBox} from './map-collision.js';

// The compass follows safe corners rather than pointing through classroom walls.
export function planRoute(from,to){
 const obstacles=SCHOOL_OBSTACLES.map(b=>({minX:b.minX-.5,maxX:b.maxX+.5,minZ:b.minZ-.5,maxZ:b.maxZ+.5}));
 const contains=(b,p)=>p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ;
 const containing=obstacles.filter(b=>contains(b,from));
 if(containing.length){
  const physical=SCHOOL_OBSTACLES.map(b=>({minX:b.minX-.28,maxX:b.maxX+.28,minZ:b.minZ-.28,maxZ:b.maxZ+.28}));
  const exits=containing.flatMap(b=>[{x:b.minX-.025,z:from.z},{x:b.maxX+.025,z:from.z},{x:from.x,z:b.minZ-.025},{x:from.x,z:b.maxZ+.025}])
   .filter(p=>!obstacles.some(b=>contains(b,p))&&!physical.some(b=>segmentIntersectsBox(from,p,b)))
   .sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z));
  if(exits.length)return [exits[0],...planRoute(exits[0],to)];
 }
 const clear=(a,b)=>!obstacles.some(box=>segmentIntersectsBox(a,b,box));
 const nodes=[{x:from.x,z:from.z},{x:to.x,z:to.z}];
 for(const b of obstacles)for(const x of [b.minX-.025,b.maxX+.025])for(const z of [b.minZ-.025,b.maxZ+.025]){
  const p={x,z};if(!obstacles.some(o=>p.x>=o.minX&&p.x<=o.maxX&&p.z>=o.minZ&&p.z<=o.maxZ))nodes.push(p);
 }
 const distances=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),done=new Set();distances[0]=0;
 for(let step=0;step<nodes.length;step++){
  let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||distances[i]<distances[u]))u=i;
  if(u<0||!Number.isFinite(distances[u]))break;if(u===1)break;done.add(u);
  for(let v=0;v<nodes.length;v++)if(v!==u&&!done.has(v)&&clear(nodes[u],nodes[v])){
   const d=distances[u]+Math.hypot(nodes[u].x-nodes[v].x,nodes[u].z-nodes[v].z);
   if(d<distances[v]){distances[v]=d;previous[v]=u;}
  }
 }
 if(!Number.isFinite(distances[1]))return [{x:to.x,z:to.z}];
 const path=[];for(let at=1;at>0;at=previous[at]){path.unshift(nodes[at]);if(previous[at]<0)break;}return path;
}
export function routeLength(from,path){let length=0,last=from;for(const p of path){length+=Math.hypot(p.x-last.x,p.z-last.z);last=p;}return length;}
export function travelBudget(base,length){return Math.max(20,base||0,Math.ceil(length/5)+6);}
export function distanceToSegment(point,from,to){const dx=to.x-from.x,dz=to.z-from.z,length=dx*dx+dz*dz;const t=length?Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.z-from.z)*dz)/length)):0;return Math.hypot(point.x-from.x-dx*t,point.z-from.z-dz*t);}
