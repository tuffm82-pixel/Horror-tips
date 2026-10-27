export const places={bathroom:{name:'Bathroom',detail:'A locked door. A borrowed moment.',number:'01'},bottom:{name:'Bottom oval',detail:'Cross the court. Keep your nerve.',number:'02'},top:{name:'Top oval',detail:'The trees might hide you.',number:'03'},blue:{name:'Blue wall',detail:'Back to where it all began.',number:'04'}};
export function ringSuccess(radius){return Math.abs(radius-54)<=13;}
export function balanceStep(position,held,dt){return Math.max(0,Math.min(1,position+(held?.42:-.27)*dt));}
export function nextPlaces(visited){return ['bathroom','bottom','top','blue'].filter(p=>!visited.includes(p)&&p!=='bathroom');}
export const story={
 intro:[['STRANGER','Hey, do you wanna play tips?',4]],
 spin:[['THE SPINNER',"I’m spinning.",3.8],['THE SPINNER','Stop moving.',3.2],['YOU','Cold climbs your ankles. Nobody can move.',3.8],['THE SPINNER',"Okay, you’re in. Count to twenty.",4]],
 transform:[['YOU','Something under his skin moves the wrong way.',4],['YOU','The lights go out. Something much taller stands in his place.',4],['THE HOLLOW','Twenty.',2]],
 bathroom:[['YOU','You slip into the bathroom. The door shuts behind you.',4],['YOU','For a moment, there is only darkness.',3]],
 sonny:[['YOU','Sonny is running towards the bathroom. Something is right behind him.',5],['SONNY','Wait! I made it. You can’t come in here!',4],['RULE 34','Going to the bathroom while being chased counts as being caught by the creature.',7],['YOU','The light dies. A cry cuts short. When it returns, Sonny is gone.',5],['RULE 35','Once done with the bathroom, you get twenty seconds to run.',6]],
 bottom:[['YOU','You crouch behind the basketball court. Two figures move across the far oval.',5],['YOU','They are getting closer. Too fast.',3.5],['YOU','The figures vanish into the dark. Then you hear it running at you.',4]],
 top:[['YOU','You hide near the trees on the top oval.',4],['YOU','Indie’s long blonde hair catches the light. He is running. Then he trips.',5],['YOU','A long hand reaches down. You turn away as Indie disappears into shadow.',5],['YOU','Its head snaps up. It sees you.',3]],
 blue:[['FINN',"It’s okay. You’re new. I was gonna lose sometime.",6],['YOU','Finn brushes his shoulder-length wavy hair aside. He steps out from the blue wall.',5],['FINN','Run.',2],['YOU','He runs straight at the creature. You escape as his footsteps stop.',5]],
 ending:[['THE SPINNER','Good game.',5]]
};
