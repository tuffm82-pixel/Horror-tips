/** Sight and sound are distinct. An unseen player never refreshes pursuit memory. */
export function perceive(enemy,player,{yaw=0,clear=false,noiseFresh=false}={}){
 const dx=player.x-enemy.x,dz=player.z-enemy.z,distance=Math.hypot(dx,dz);
 const facing=distance<.01?1:(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance;
 const exposed=!player.hidden||Boolean(enemy.seenHiding);
 const visible=exposed&&clear&&distance<18&&(facing>Math.cos(Math.PI*.34)||distance<1.7);
 const heard=exposed&&noiseFresh&&(player.running||player.noisyTask)&&distance<(clear?9:2.5);
 return{visible,heard,distance,target:visible?{x:player.x,z:player.z}:heard?{x:Math.round(player.x/2)*2,z:Math.round(player.z/2)*2}:null};
}
