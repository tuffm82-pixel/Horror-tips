export class Multiplayer {
  constructor({onState=()=>{},onError=()=>{},onStatus=()=>{}}={}) {
    this.onState=onState;this.onError=onError;this.onStatus=onStatus;this.socket=null;this.id=null;this.state=null;
  }
  connect(url) {
    if (this.socket?.readyState===WebSocket.OPEN) return Promise.resolve();
    if (this.connecting) return this.connecting;
    const endpoint=url || `${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`;
    try{const parsed=new URL(endpoint);if(!['ws:','wss:'].includes(parsed.protocol))throw new Error();}
    catch{return Promise.reject(new Error('Enter a full ws:// or wss:// server address, ending in /ws.'));}
    this.onStatus('connecting');
    this.connecting=new Promise((resolve,reject)=>{
      const socket=this.socket=new WebSocket(endpoint);
      const current=()=>this.socket===socket;
      let settled=false;
      const timeout=setTimeout(()=>{if(!settled){settled=true;socket.close();reject(new Error('Connection timed out. Start the multiplayer server or check its address.'));}},8000);
      socket.onopen=()=>{if(!current())return;clearTimeout(timeout);settled=true;this.onStatus('connected');resolve();};
      socket.onmessage=event=>{
        if(!current())return;
        let message;try{message=JSON.parse(event.data);}catch{return;}
        if(message.type==='hello')this.id=message.id;
        if(message.type==='state'){this.state=message.state;this.onState(this.state);}
        if(message.type==='error')this.onError(message.message);
        if(message.type==='left'){this.state=null;this.onState(null);}
      };
      socket.onerror=()=>{clearTimeout(timeout);if(!settled){settled=true;reject(new Error('Cannot connect to multiplayer. Run npm start or use a hosted server.'));}};
      socket.onclose=()=>{clearTimeout(timeout);if(current()){this.socket=null;this.connecting=null;this.state=null;this.id=null;this.onStatus('disconnected');this.onState(null);}if(!settled){settled=true;reject(new Error('Multiplayer connection closed.'));}};
    });
    return this.connecting.catch(error=>{this.connecting=null;throw error;});
  }
  send(message) {if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(message));else this.onError('Connect to the multiplayer server first.');}
  create(name){this.send({type:'create',name});}
  join(code,name){this.send({type:'join',code,name});}
  start(){this.send({type:'start'});}
  move({x,z,yaw=0}){this.send({type:'move',x,z,yaw});}
  leave(){this.send({type:'leave'});}
  disconnect(){this.socket?.close();this.socket=null;this.connecting=null;this.id=null;this.state=null;}
}
