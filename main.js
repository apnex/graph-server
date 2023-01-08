#!/usr/bin/env node
//import GraphRouter from './router/graphRouter';
import PeerGroup from './router/peerGroup.js';
import CmdHandler from './router/cmdHandler.js';
import KubeController from './controller/kubeController.js';
import Informer from './controller/informer.js';
import { readFileSync } from 'fs';

// check if running in namespace
var CLUSTER_NS;
try {
	CLUSTER_NS = readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace');
	if(CLUSTER_NS) {
		process.env.CLUSTER_NS = CLUSTER_NS;
		console.log('Yes I\'m running inside cluster at: [ ' + CLUSTER_NS + ' ]');
	}
} catch {
	console.log('No I\'m not running inside cluster');
}

// move K8S API controller into dedicated cmdHandler (like in client)
// set namespace
const GRAPH_NS = process.env.GRAPH_NS || CLUSTER_NS || 'default';
console.log('Before Controller');
var k8sApi;
try {
	k8sApi = new KubeController(GRAPH_NS);
} catch {
	console.log('Error Connecting to k8s API..');
}
console.log('After Controller');

// init websocket engine
// get config
const args = process.argv.slice(2);
const config = JSON.parse(readFileSync('./config.json', "utf8"));
const routerName = args[0];
const localConfig = config.filter((router) => {
	return router.name == routerName;
})[0];

// globals
const cmdHandler = new CmdHandler(k8sApi);
//const graphRouter = new GraphRouter(cmdHandler, k8sApi);
const pg1 = new PeerGroup();
const peers = pg1.peers;
const peerList = pg1.peerList;
const nsList = {};
const informerCache = {};
var links = [];

// init
if(typeof(localConfig) != 'undefined') {
	links = localConfig.links;
	// default namespace for now - turn into socket cmdHandler function

	// start server
	console.log('SERVER instance launching with name[ ' + localConfig.name + ' : ' + localConfig.port + ' ]...');
	pg1.startServer({
		port: localConfig.port,
		host: '0.0.0.0'
	});
	pg1.on('message', (peer, msg) => { // update portGroup to return socket for every message
		let socket = peerList[peer.key];
		cmdHandler.cmd(JSON.parse(msg), peer, socket);
	});
	pg1.on('createPeer', (peer, socket) => {
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
	pg1.on('deletePeer', (peer, socket) => {
		console.log('Old peer [' + peer.key + '] deleted!');

		// delete this socket from Informer
		if(informerCache[GRAPH_NS]) {
			console.log('Delete NS [ ' + GRAPH_NS + ' ] from existing INFORMER');
			delete informerCache[GRAPH_NS].socketCache[peer.key];
		}
	});

	// start control loop
	loop(localConfig.name);
}

async function sleep(ms) {
	return new Promise(res => setTimeout(res, ms));
}

async function loop(name) {
	const nodeId = 'blah';

	// begin loop
	while(1) {
		console.log('PEERS');
		let peerValues = Array.from(peers.values());
		console.log(JSON.stringify(peerValues, null, "\t"));
		pg1.send(JSON.stringify({
			cmd: 'log',
			body: 'Hello! Message From LOOP Server [' + name + '] !!'
		}));

		linkUpdate();
		await sleep(4000);
	}
}

function linkUpdate() {
	// loop through configured links
	links.forEach((link) => {
		let key = link.host + ':' + link.port;
		if(!peerList[key]) {
			console.log('Peer [' + key + '] does not exist - connecting');

			pg1.create({
				key,
				url: 'ws://' + key
			});
		}
	});
}
