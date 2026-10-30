import {isWalkable} from './world.js';
const width=61,height=101,count=width*height,valid=new Uint8Array(count),fields=new Map();
const point=id=>({x:(id%width)/2-15,z:Math.floor(id/width)/2-42});
for(let id=0;id<count;id++){const p=point(id);valid[id]=isWalkable(p.x,p.z)?1:0;}
function nearest(p){
 const cx=Math.max(0,Math.min(width-1,Math.round((p.x+15)*2))),cz=Math.max(0,Math.min(height-1,Math.round((p.z+42)*2)));
 let best=-1,distance=Infinity;
 for(let z=Math.max(0,cz-4);z<=Math.min(height-1,cz+4);z++)for(let x=Math.max(0,cx-4);x<=Math.min(width-1,cx+4);x++){const id=z*width+x;if(!valid[id])continue;const q=point(id),d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<distance){best=id;distance=d;}}
 return best;
}
function neighbors(id){const result=[],x=id%width,z=Math.floor(id/width);if(x>0)result.push(id-1);if(x<width-1)result.push(id+1);if(z>0)result.push(id-width);if(z<height-1)result.push(id+width);return result;}
function field(goal){
 if(fields.has(goal))return fields.get(goal);
 const distances=new Uint16Array(count);distances.fill(65535);distances[goal]=0;const queue=[goal];
 for(let i=0;i<queue.length;i++){const id=queue[i];for(const next of neighbors(id))if(valid[next]&&distances[next]===65535){distances[next]=distances[id]+1;queue.push(next);}}
 if(fields.size>=12)fields.delete(fields.keys().next().value);fields.set(goal,distances);return distances;
}
function clear(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)*8));for(let i=0;i<=steps;i++){const t=i/steps;if(!isWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;}return true;}
export function nextWaypoint(from,to){
 const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return from;
 const end=isWalkable(to.x,to.z)?to:point(goal);if(clear(from,end))return end;
 const distances=field(goal);if(distances[start]===65535)return from;
 let id=start,result=point(start);
 for(let i=0;i<8&&id!==goal;i++){const next=neighbors(id).find(n=>valid[n]&&distances[n]<distances[id]);if(next===undefined)break;const candidate=point(next);if(!clear(from,candidate))break;result=candidate;id=next;}
 return result;
}
