class CmdHandler {
	constructor(k8s) {
		console.log('INIT new { CmdHandler }');
		this.k8s = k8s;
	}
	cmd(msg, peer, socket) {
		if(msg.cmd == 'log') {
			console.log('THIS IS A [ LOG ]: ' + msg.body);
		}
		if(msg.cmd == 'get') {
			console.log('THIS IS A [ GET ]: ' + msg.body);
		}
		if(msg.cmd == 'set') {
			console.log('THIS IS A [ set ]...');
			Object.assign(peer[msg.target], msg.body);
			console.log(JSON.stringify(peer, null, "\t"));
		}
		if(msg.cmd == 'createPod') {
			console.log('This is a [ createPod ]...');
			console.log(msg);

			// immediate acknowledge
			socket.send(JSON.stringify({
				cmd: 'log',
				body: '[ createPod ] action ACK by server'
			}));

			// create pod
			this.k8s.createPod(msg.body.name, socket);
		}
		if(msg.cmd == 'deletePod') {
			console.log('This is a [ deletePod ]...');
			console.log(msg);

			// immediate acknowledge
			socket.send(JSON.stringify({
				cmd: 'log',
				body: '[ createPod ] action ACK by server'
			}));

			// delete pod
			this.k8s.deletePod(msg.body.name, socket);
		}
	}
}
export default CmdHandler;
