export const places={bathroom:{name:'Bathroom',detail:'A locked door. A borrowed moment.',number:'01'},bottom:{name:'Bottom oval',detail:'Cross the court. Keep your nerve.',number:'02'},top:{name:'Top oval',detail:'The trees might hide you.',number:'03'},blue:{name:'Blue wall',detail:'Back to where it all began.',number:'04'},gate:{name:'School gate'},outside:{name:'Beyond the fence'},street:{name:'The empty street'},office:{name:'The office'},canteen:{name:'Canteen supply breaker'}};
export function ringSuccess(radius){return Math.abs(radius-54)<=13;}
export function balanceStep(position,held,dt){return Math.max(0,Math.min(1,position+(held?.42:-.27)*dt));}
export function nextPlaces(visited){return ['bathroom','bottom','top','blue'].filter(p=>!visited.includes(p)&&p!=='bathroom');}
export const story={
 intro:[['STRANGER','Hey, do you wanna play tips?',4]],
 spin:[['THE SPINNER',"I’m spinning.",3.8],['THE SPINNER','Stop moving.',3.2],['YOU','Cold climbs your ankles. The pointing hand slows, passing each player in the circle.',3.8],['THE SPINNER',"You. You’re in. Count to twenty.",4],['THE SELECTED PLAYER','One… two…',3]],
 transform:[['YOU','The selected player bends backwards. The spinner steps away, still human.',4],['YOU','The lights go out. Something much taller stands where the selected player was.',4],['THE HOLLOW','Twenty.',2]],
 bathroom:[['YOU','You slip into the bathroom. The door shuts behind you.',4],['YOU','For a moment, there is only darkness.',3]],
 sonny:[['YOU','Sonny is running towards the bathroom. Something is right behind him.',5],['SONNY','Wait! I made it. You can’t come in here!',4],['RULE 34','Going to the bathroom while being chased counts as being caught by the creature.',7],['YOU','The light dies. A cry cuts short. When it returns, Sonny is gone.',5],['RULE 35','Once done with the bathroom, you get twenty seconds to run.',6]],
 bottom:[['YOU','You crouch behind the basketball court. Two figures move across the far oval.',5],['YOU','They are getting closer. Too fast.',3.5],['YOU','The figures vanish into the dark. Then you hear it running at you.',4]],
 top:[['YOU','You hide near the trees on the top oval.',4],['YOU','Indie’s long blonde hair catches the light. He is running. Then he trips.',5],['YOU','A long hand reaches down. You turn away as Indie disappears into shadow.',5],['YOU','Its head snaps up. It sees you.',3]],
 blue:[['FINN',"It’s okay. You’re new. I was gonna lose sometime.",6],['YOU','Finn brushes his shoulder-length wavy hair aside. He steps out from the blue wall.',5],['FINN','Run.',2],['YOU','He runs straight at the creature. You escape as his footsteps stop.',5]],
 gate:[['YOU','You reach the school gate. The latch is already open.',4],['YOU','Beyond the fence, a streetlight shines over an empty road. Maybe it ends out there.',5]],
 street:[['YOU','The road is empty. Even the wind has stopped.',3],['YOU','Under the next streetlight, a tall shape surges out of the darkness. It is running straight at you.',3.8],['YOU','A metre away, it disappears. No footsteps. No shadow.',2.8],['THE SCHOOL SPEAKER','You are still in.',4]],
 vanish:[['YOU','A footstep sounds directly behind you. You turn. Nothing.',3],['YOU','Inside the school, an emergency light flickers beside the office. There is another rulebook there.',5]],
 office:[['YOU','The office is empty. A chalk handprint marks the last page of an open book.',4],['RULE 91','Crossing the fence does not end the game. Carry the chalk mark past the gate when the last bell rings.',7],['YOU','Beside the book, a piece of chalk sits inside a glass box. Its electric latch begins to hum.',5]],
 blackout:[['YOU','The office light goes out. The glass box locks with a hard click.',4],['YOU','A voice drifts from the closed canteen. It sounds exactly like you.',4],['RULE 94','Never follow your own voice. What answers from the dark has already learned your name.',7],['YOU','The chalk box shares the canteen supply. Its breaker is outside, along the verandah. Leave the shutter closed.',6]],
 canteen:[['YOUR VOICE','I’m still in here. Open the shutter.',4],['YOU','In the dark window, the tall creature runs behind you. Its reflection moves the wrong way.',5],['YOU','You glance back. The walkway is empty. In the glass, it is still running.',5],['YOU','The breaker handle is within reach. Keep your eyes on the switch. Do not answer the voice.',5]],
 restored:[['YOU','You return to the office. The light is steady. The chalk box has clicked open.',4],['RULE 95','Once you take the chalk mark, leave before the last bell stops.',6],['YOU','Your reflection turns its head before you do. Take the chalk. Keep moving.',5]],
 ending:[['YOU','The chalk mark burns cold in your hand. This time, the street stays still.',4],['THE SPINNER','Good game.',5]]
};

export const explorationGoals={
 gate:{target:{x:18,z:74},radius:3,label:'Walk through the open school gate',hint:'Follow the streetlight beyond the fence.',next:'street',start:'gate'},
 office:{target:{x:-18,z:-10},radius:3,label:'Find the emergency light at the office',hint:'Return through the gate. Follow the compass towards the school.',next:'office',start:'outside'},
 power:{target:{x:-9,z:-13},radius:2.5,label:'Restore power at the canteen supply breaker',hint:'Follow the verandah east from the office. The breaker is outside; keep the canteen shutter closed.',next:'canteen',start:'office',seconds:22},
 chalk:{target:{x:-18,z:-10},radius:2.5,label:'Return to the unlocked chalk box',hint:'Head back along the verandah to the office. Ignore the voice behind the shutter.',next:'restored',start:'canteen',seconds:18},
 escape:{target:{x:18,z:74},radius:3,label:'Carry the chalk mark beyond the gate',hint:'Sprint. Keep the gate in sight.',next:'ending',start:'office',seconds:24}
};
// Selected hiding places are reached on foot; each route has its own travel budget.
export const routeWalks={
 bathroom:{target:{x:-20,z:29},radius:3,seconds:22,label:'Bathroom',hint:'Follow the west walkway south. Stop at the bathroom entrance.',next:'bathroom'},
 bottom:{target:{x:41,z:58},radius:3,seconds:26,label:'Bottom oval',hint:'Cross the basketball court and continue beyond the far hoop.',next:'bottom'},
 top:{target:{x:-24,z:-36},radius:3,seconds:24,label:'Top oval',hint:'Go around the west end of the classroom block, then head towards the trees.',next:'top'},
 blue:{target:{x:5,z:8},radius:3,seconds:16,label:'Blue wall',hint:'Return to the courtyard. Go around the end of the blue wall if you approach from the ovals.',next:'blue'}
};
export function navigationHint(pose,target){const dx=target.x-pose.x,dz=target.z-pose.z;const angle=Math.atan2(-dx,-dz)-(pose.yaw??pose.rotation??0);return {distance:Math.hypot(dx,dz),angle:Math.atan2(Math.sin(angle),Math.cos(angle))};}
