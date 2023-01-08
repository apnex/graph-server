import PeerGroup from './peerGroup.js';
import CmdHandler from './cmdHandler.js';

class GraphRouter {
	constructor(handler = new CmdHandler()) {
		this.pg = new PeerGroup();
		this.handler = handler;
		this.peers = this.pg.peers;
		this.peerList = this.pg.peerList;
		this.init();
	}
	init() {
		// start server
		console.log('SERVER instance launching with name[ ' + this.config.name + ' : ' + this.config.port + ' ]...');
		this.pg.startServer({
			port: this.config.port,
			host: '0.0.0.0'
		});

		this.pg.on('message', (peer, msg) => { // update portGroup to return socket for every message
			let socket = peerList[peer.key];
			this.handler.cmd(JSON.parse(msg), peer, socket);
		});

		this.pg.on('createPeer', (peer, socket) => {
			console.log('New peer [' + peer.key + '] created!');

			// create entry
			socket.send(JSON.stringify({
				cmd: 'set',
				target: 'socket',
				body: {
					remote: peer.socket.local
				}
			}));

			// add this socket to Informer
			// track namespaces - temp - rework and move to kubeController to track for multiple clients and different namespaces
			if(!informerCache[GRAPH_NS]) {
				console.log('Create new INFORMER for NS [ ' + GRAPH_NS + ' ]');
				informerCache[GRAPH_NS] = new Informer(GRAPH_NS);
				informerCache[GRAPH_NS].start();
			}
			informerCache[GRAPH_NS].socketCache[peer.key] = socket;
		});

		this.pg.on('deletePeer', (peer, socket) => {
			console.log('Old peer [' + peer.key + '] deleted!');
			// delete this socket from Informer
			if(informerCache[GRAPH_NS]) {
				console.log('Delete NS [ ' + GRAPH_NS + ' ] from existing INFORMER');
				delete informerCache[GRAPH_NS].socketCache[peer.key];
			}
		});

		// start control loop
		this.loop(this.config.name);
	}
	async sleep(ms) {
		return new Promise(res => setTimeout(res, ms));
	}
	async loop(name) {
		let counter = 0;
		while(1) {
			console.log('PEERS');
			let peerValues = Array.from(this.peers.values());
			console.log(JSON.stringify(peerValues, null, "\t"));
			this.pg.send(JSON.stringify({
				cmd: 'log',
				body: 'Hello! Message From LOOP Router [' + name + '] !!'
			}));

			this.linkUpdate();
			await this.sleep(5000);
		}
	}
	linkUpdate() {
		this.links.forEach((link) => {
			let key = link.host + ':' + link.port;
			if(!this.peerList[key]) {
				console.log('Peer [' + key + '] does not exist - connecting');
				this.pg.create({
					key,
					url: 'ws://' + key
				});
			}
		});
	}
}
export default GraphRouter;
