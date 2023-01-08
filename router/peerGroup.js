//https://ably.com/blog/web-app-websockets-nodejs
import WebSocket, { WebSocketServer } from 'ws';
import EventEmitter from 'events';

// main class
class PeerGroup extends EventEmitter {
	constructor(spec = {}) {
		super();
		console.log('INIT new { PeerGroup }');
		console.log(JSON.stringify(spec, null, "\t"));
		this.peers = new Map(); // move to external Peer class?
		this.peerList = {};
	}
	startServer(spec) {
		this.serverSpec = Object.assign({
			port: 8080,
			host: '0.0.0.0'
		}, spec);
		console.log('Starting PeerGroup Server...');
		console.log(JSON.stringify(this.serverSpec, null, "\t"));
		this.server = new WebSocketServer(this.serverSpec);
		this.server.on('error', (error) => {
			console.log('Some WebSocketServer error');
			console.log(error);
		});
		this.server.on('connection', (ws) => {
			// log conn setup
			let socket = ws._socket;
			let socketId = '<' + socket.localAddress + ':' + socket.localPort + '-' + socket.remoteAddress + ':' + socket.remotePort;
			console.log('INBOUND connectSocket KEY: ' + socketId);

			// configure socket
			this.configSocket(ws);
			this.socketReady(ws);
		});
	}
	send(message) {
		this.peers.forEach((metadata, peer) => {
			peer.send(message);
		});
	}
	create(spec) {
		console.log('[ peerGroup ] creating new peer [' + spec.url + ']');
		let ws = new WebSocket(spec.url);
		this.configSocket(ws);
		ws.on('open', () => {
			this.socketReady(ws);
		});
	}
	socketReady(ws) {
		if(ws.readyState == 1) {
			console.log('IN: WebSocket readyState[' + ws.readyState + '] successfully connected');
			let key = ws._socket.remoteAddress + ':' + ws._socket.remotePort;
			let peer = this.createPeer(ws, key);
		}
	}
	configSocket(ws) {
		ws.on('message', (message) => {
			let peer = this.peers.get(ws);
			this.emit('message', peer, message);
		});
		ws.on('close', (code) => {
			console.log('WebSocket [xx] terminated');
			this.deletePeer(ws);
		});
		ws.on('error', (error) => {
			console.log('Silly connection errors');
			this.deletePeer(ws);
		});
	}
	createPeer(ws, key) {
		let socket = ws._socket;
		let peer = {
			key,
			socket: {
				local: {
					localAddress    : socket.localAddress,
					localPort	: socket.localPort,
					remoteAddress   : socket.remoteAddress,
					remotePort	: socket.remotePort
				}
			}
		};
		this.emit('createPeer', peer, ws);
		this.peers.set(ws, peer);
		this.peerList[key] = ws;
		return peer;
	}
	deletePeer(ws) {
		if(typeof(this.peers.get(ws)) != 'undefined') {
			let peer = this.peers.get(ws);
			if(typeof(this.peerList[peer.key]) != 'undefined') {
				delete this.peerList[peer.key];
			}
			this.emit('deletePeer', peer, ws);
			this.peers.delete(ws);
		}
	}
}

// export
export default PeerGroup;
