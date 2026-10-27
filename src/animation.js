// Small normalized-time animation clips for the procedural joint rigs.
// Tracks are joint.axis rotations in radians; body.height is a vertical offset.
const key=(time,pose)=>({time,pose});
export const clips={
  idle:{duration:3.4,loop:true,keys:[key(0,{'neck.y':-.07,'shoulderL.z':.05,'shoulderR.z':-.05}),key(.5,{'neck.y':.07,'body.height':.009,'shoulderL.z':.025,'shoulderR.z':-.025}),key(1,{'neck.y':-.07,'shoulderL.z':.05,'shoulderR.z':-.05})]},
  walk:{duration:1.05,loop:true,keys:[key(0,{'hipL.x':-.48,'hipR.x':.48,'kneeL.x':.12,'kneeR.x':.65,'shoulderL.x':.35,'shoulderR.x':-.35,'elbowL.x':-.25,'elbowR.x':-.45,'body.x':.04}),key(.25,{'kneeL.x':.4,'kneeR.x':.15,'body.height':.025,'elbowL.x':-.3,'elbowR.x':-.3,'body.x':.04}),key(.5,{'hipL.x':.48,'hipR.x':-.48,'kneeL.x':.65,'kneeR.x':.12,'shoulderL.x':-.35,'shoulderR.x':.35,'elbowL.x':-.45,'elbowR.x':-.25,'body.x':.04}),key(.75,{'kneeL.x':.15,'kneeR.x':.4,'body.height':.025,'elbowL.x':-.3,'elbowR.x':-.3,'body.x':.04}),key(1,{'hipL.x':-.48,'hipR.x':.48,'kneeL.x':.12,'kneeR.x':.65,'shoulderL.x':.35,'shoulderR.x':-.35,'elbowL.x':-.25,'elbowR.x':-.45,'body.x':.04})]},
  run:{duration:.6,loop:true,keys:[key(0,{'body.x':.15,'neck.x':-.12,'hipL.x':-.95,'hipR.x':.7,'kneeL.x':.3,'kneeR.x':1.3,'shoulderL.x':.7,'shoulderR.x':-.8,'elbowL.x':-1.2,'elbowR.x':-1.1}),key(.25,{'body.x':.15,'neck.x':-.12,'hipL.x':-.15,'hipR.x':.15,'kneeL.x':1,'kneeR.x':.45,'shoulderL.x':-.1,'shoulderR.x':.1,'elbowL.x':-1.1,'elbowR.x':-1.1,'body.height':.08}),key(.5,{'body.x':.15,'neck.x':-.12,'hipL.x':.7,'hipR.x':-.95,'kneeL.x':1.3,'kneeR.x':.3,'shoulderL.x':-.8,'shoulderR.x':.7,'elbowL.x':-1.1,'elbowR.x':-1.2}),key(.75,{'body.x':.15,'neck.x':-.12,'hipL.x':.15,'hipR.x':-.15,'kneeL.x':.45,'kneeR.x':1,'shoulderL.x':.1,'shoulderR.x':-.1,'elbowL.x':-1.1,'elbowR.x':-1.1,'body.height':.08}),key(1,{'body.x':.15,'neck.x':-.12,'hipL.x':-.95,'hipR.x':.7,'kneeL.x':.3,'kneeR.x':1.3,'shoulderL.x':.7,'shoulderR.x':-.8,'elbowL.x':-1.2,'elbowR.x':-1.1})]},
  point:{duration:1,loop:false,keys:[key(0,{}),key(.4,{'shoulderL.x':-1.5,'shoulderR.x':-1.5,'shoulderL.z':-.05,'shoulderR.z':.05,'elbowL.x':-.1,'elbowR.x':-.1}),key(1,{'shoulderL.x':-1.5,'shoulderR.x':-1.5,'shoulderL.z':-.05,'shoulderR.z':.05,'elbowL.x':-.1,'elbowR.x':-.1})]},
  spin:{duration:1.5,loop:true,keys:[key(0,{'shoulderL.x':-1.5,'shoulderR.x':-1.5,'elbowL.x':-.1,'elbowR.x':-.1,'neck.y':-.12}),key(.5,{'shoulderL.x':-1.45,'shoulderR.x':-1.45,'elbowL.x':-.12,'elbowR.x':-.12,'body.height':.015,'neck.y':.12}),key(1,{'shoulderL.x':-1.5,'shoulderR.x':-1.5,'elbowL.x':-.1,'elbowR.x':-.1,'neck.y':-.12})]},
  recoil:{duration:1.3,loop:false,keys:[key(0,{}),key(.18,{'body.x':-.25,'neck.x':.2,'shoulderL.x':-1,'shoulderR.x':-1.2,'elbowL.x':-.9,'elbowR.x':-.8,'kneeL.x':.3,'kneeR.x':.3,'body.height':-.06}),key(1,{'body.x':-.08,'neck.y':.3,'shoulderL.x':-.4,'shoulderR.x':-.3,'elbowL.x':-.6,'elbowR.x':-.7})]},
  grabbed:{duration:1,loop:true,keys:[key(0,{'body.x':-.2,'neck.z':-.18,'shoulderL.x':-1.7,'shoulderR.x':-1.5,'elbowL.x':-1.1,'elbowR.x':-1.4,'hipL.x':-.4,'hipR.x':.2,'kneeL.x':.8,'kneeR.x':.4}),key(.25,{'body.z':.16,'neck.z':.2,'shoulderL.x':-1.2,'shoulderR.x':-2.1,'elbowL.x':-.5,'elbowR.x':-1.3,'hipL.x':.3,'hipR.x':-.4,'kneeL.x':.3,'kneeR.x':1,'body.height':.06}),key(.5,{'body.x':-.15,'body.z':-.12,'neck.z':-.2,'shoulderL.x':-2,'shoulderR.x':-1.3,'elbowL.x':-1.2,'elbowR.x':-.5,'hipL.x':-.4,'hipR.x':.3,'kneeL.x':1,'kneeR.x':.3}),key(.75,{'body.z':.12,'neck.z':.16,'shoulderL.x':-1.4,'shoulderR.x':-1.9,'elbowL.x':-.6,'elbowR.x':-1.2,'hipL.x':.3,'hipR.x':-.4,'kneeL.x':.3,'kneeR.x':.9,'body.height':.04}),key(1,{'body.x':-.2,'neck.z':-.18,'shoulderL.x':-1.7,'shoulderR.x':-1.5,'elbowL.x':-1.1,'elbowR.x':-1.4,'hipL.x':-.4,'hipR.x':.2,'kneeL.x':.8,'kneeR.x':.4})]},
  fall:{duration:1.1,loop:false,keys:[key(0,{'body.x':.15,'kneeL.x':.4,'kneeR.x':.7}),key(.35,{'body.x':.8,'body.height':-.22,'shoulderL.x':-1.8,'shoulderR.x':-1.8,'elbowL.x':-.2,'elbowR.x':-.3,'hipL.x':-.6,'hipR.x':-.4,'kneeL.x':1.4,'kneeR.x':1.1}),key(1,{'body.x':1.45,'body.height':-.66,'shoulderL.x':-1.7,'shoulderR.x':-1.6,'elbowL.x':-.6,'elbowR.x':-.4,'hipL.x':-.4,'hipR.x':-.3,'kneeL.x':1.1,'kneeR.x':.7,'neck.x':-.6})]},
  stalk:{duration:1.7,loop:true,keys:[key(0,{'body.x':.2,'body.height':-.18,'neck.x':-.2,'neck.z':-.15,'hipL.x':-.4,'hipR.x':.2,'kneeL.x':.5,'kneeR.x':.8,'shoulderL.x':-.15,'shoulderR.x':.2,'elbowL.x':-.3,'elbowR.x':-.2}),key(.5,{'body.x':.2,'body.height':-.13,'neck.x':-.2,'neck.z':.1,'hipL.x':.2,'hipR.x':-.4,'kneeL.x':.8,'kneeR.x':.5,'shoulderL.x':.2,'shoulderR.x':-.15,'elbowL.x':-.2,'elbowR.x':-.3}),key(1,{'body.x':.2,'body.height':-.18,'neck.x':-.2,'neck.z':-.15,'hipL.x':-.4,'hipR.x':.2,'kneeL.x':.5,'kneeR.x':.8,'shoulderL.x':-.15,'shoulderR.x':.2,'elbowL.x':-.3,'elbowR.x':-.2})]},
  lunge:{duration:.9,loop:false,keys:[key(0,{'body.x':-.1,'body.height':-.2,'kneeL.x':.6,'kneeR.x':.6,'elbowL.x':-.7,'elbowR.x':-.7}),key(.3,{'body.x':.55,'body.height':-.4,'neck.x':-.5,'shoulderL.x':-1.4,'shoulderR.x':-1.3,'elbowL.x':-.1,'elbowR.x':-.15,'hipL.x':-.7,'hipR.x':.6,'kneeL.x':.9,'kneeR.x':.3,'jaw.x':.65}),key(1,{'body.x':.35,'body.height':-.24,'neck.x':-.35,'shoulderL.x':-1.6,'shoulderR.x':-1.5,'elbowL.x':-.3,'elbowR.x':-.25,'hipL.x':-.25,'hipR.x':.3,'kneeL.x':.6,'kneeR.x':.5,'jaw.x':.8})]},
};

export function sampleClip(name,normalizedTime){
  const clip=clips[name]||clips.idle;const raw=Number.isFinite(normalizedTime)?normalizedTime:0;
  const t=clip.loop?((raw%1)+1)%1:Math.max(0,Math.min(1,raw));
  let a=clip.keys[0],b=clip.keys.at(-1);for(let i=1;i<clip.keys.length;i++)if(t<=clip.keys[i].time){a=clip.keys[i-1];b=clip.keys[i];break;}
  let mix=b.time===a.time?0:(t-a.time)/(b.time-a.time);mix=mix*mix*(3-2*mix);
  const pose={};const tracks=new Set(clip.keys.flatMap(k=>Object.keys(k.pose)));
  for(const track of tracks)pose[track]=(a.pose[track]||0)+((b.pose[track]||0)-(a.pose[track]||0))*mix;
  return pose;
}

export function bindRig(root){
  const joints={};root.traverse?.(o=>{if(o.name?.startsWith('rig:'))joints[o.name.slice(4)]=o;});
  const rest={};for(const[name,joint]of Object.entries(joints))rest[name]={x:joint.position.x,y:joint.position.y,z:joint.position.z};
  return {joints,rest};
}

export function applyClip(rig,name,timeSeconds,weight=1){
  if(!rig?.joints)return;const clip=clips[name]||clips.idle,pose=sampleClip(name,timeSeconds/clip.duration);
  for(const[jointName,joint]of Object.entries(rig.joints)){
    for(const axis of ['x','y','z'])joint.rotation[axis]=(pose[`${jointName}.${axis}`]||0)*weight;
    if(rig.rest?.[jointName])joint.position.y=rig.rest[jointName].y+(pose[`${jointName}.height`]||0)*weight;
  }
}
