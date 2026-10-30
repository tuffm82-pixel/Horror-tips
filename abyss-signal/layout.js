export const ROOM_LAYOUT=Object.freeze([
 {id:'pump',minX:-15,maxX:-3,minZ:-13,maxZ:-3,door:-8},
 {id:'sample',minX:3,maxX:15,minZ:-25,maxZ:-15,door:-20},
 {id:'relay',minX:-15,maxX:-3,minZ:-37,maxZ:-27,door:-32},
 {id:'generator',minX:3,maxX:21,minZ:-54,maxZ:-44,door:-49},
 {id:'crew',minX:-23,maxX:-3,minZ:-66,maxZ:-56,door:-61},
 {id:'archive',minX:3,maxX:25,minZ:-78,maxZ:-68,door:-73},
 {id:'coolant',minX:-23,maxX:-3,minZ:-90,maxZ:-80,door:-85},
 {id:'uplink',minX:3,maxX:21,minZ:-102,maxZ:-92,door:-97},
]);
export const LOCKERS=Object.freeze([[-2.2,-1],[2.2,-14],[-2.2,-26],[2.2,-36],[-2.2,-44],[2.2,-56],[-2.2,-68],[2.2,-80],[-2.2,-92],[2.2,-101]].map(([x,z])=>({x,z})));
export const STATIONS=Object.freeze([
 {id:'pump',position:{x:-11,z:-8},label:'Flood pumps'},
 {id:'generator',position:{x:17,z:-49},label:'Emergency generator'},
 {id:'sample',position:{x:11,z:-20},label:'Laboratory black box'},
 {id:'crew',position:{x:-18,z:-61},label:'Mara’s cabin recorder'},
 {id:'archive',position:{x:20,z:-73},label:'Sealed archive'},
 {id:'relay',position:{x:-11,z:-32},label:'Signal relay'},
 {id:'coolant',position:{x:-18,z:-85},label:'Reactor coolant'},
 {id:'uplink',position:{x:17,z:-97},label:'Surface uplink'},
 {id:'launch',position:{x:0,z:-104},label:'Capsule launch controls'},
 {id:'escape',position:{x:0,z:-104},label:'Enter ascent capsule'},
]);
export const STAGES=Object.freeze([
 {id:'pump',title:'01 / Keep the sea outside',description:'Find the flood pumps. Hold the pressure needle inside the marked band.',puzzle:'pressure'},
 {id:'generator',title:'02 / Wake the lower wing',description:'Enter the generator hall. Match its emergency circuits to restore power.',puzzle:'circuits'},
 {id:'sample',title:'03 / The last recording',description:'Return to the specimen laboratory. Recover the powered black box.'},
 {id:'crew',title:'04 / A voice you can trust',description:'Search Dr. Mara Voss’s cabin in the crew wing. Listen to her final message.'},
 {id:'archive',title:'05 / What came aboard',description:'Open the sealed archive using the four-digit code from Mara’s cabin.',puzzle:'code'},
 {id:'relay',title:'06 / Cut its voice',description:'Return to the old signal room. Retune and disconnect the infected relay.',puzzle:'frequency'},
 {id:'coolant',title:'07 / Under the reactor',description:'Stabilise the coolant pressure before the ascent rail overheats.',puzzle:'pressure'},
 {id:'uplink',title:'08 / Is anyone listening?',description:'Tune the surface uplink. Send the archive and request extraction.',puzzle:'frequency'},
 {id:'launch',title:'09 / Three locks',description:'Match the capsule launch circuits. Then survive while its pressure lock cycles.',puzzle:'circuits'},
 {id:'escape',title:'10 / One empty seat',description:'Stay alive until the capsule is ready, then get inside.'},
]);
export function checkpointSpawn(chapter){
 if(!Number.isInteger(chapter)||chapter<=0)return{x:0,z:4,yaw:0};
 const station=STATIONS[Math.min(chapter-1,STATIONS.length-1)],p=station.position;
 return{x:p.x===0?0:p.x-Math.sign(p.x)*1.2,z:p.z,yaw:p.x<0?-Math.PI/2:p.x>0?Math.PI/2:Math.PI};
}
