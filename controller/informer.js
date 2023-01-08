#!/usr/bin/env node
import k8s from '@kubernetes/client-node';
// https://learnk8s.io/real-time-dashboard

class Informer {
	constructor(ns) {
		this.cache = {};
		this.socketCache = {};
		this.kc = new k8s.KubeConfig();

		// init informer
		if(process.env.CLUSTER_NS) {
			this.ns = process.env.CLUSTER_NS;
			this.kc.loadFromCluster();
			console.log('INFORMER: CLUSTER_NS is set - loadFromCluster');
		} else {
			this.ns = ns || 'default';
			this.kc.loadFromDefault();
			console.log('INFORMER: CLUSTER_NS not set - loadFromDefault');
		}
		console.log('INIT new { INFORMER } for NS[ ' + this.ns + ' ]');

		const k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
		const listFn = () => k8sApi.listNamespacedPod(this.ns);
		this.informer = k8s.makeInformer(this.kc, '/api/v1/namespaces/' + this.ns + '/pods', listFn);

		this.informer.on('add', (obj) => {
			console.log(`Added: ${obj.metadata.name}` + ' STATUS: ' + obj.status.phase);
			this.cache[obj.metadata.name] = obj.status.phase;

			// loop through socket cache and respond
			Object.values(this.socketCache).forEach((socket) => {
				socket.send(JSON.stringify({
					cmd: 'inform',
					body: {
						event	: 'add',
						name	: obj.metadata.name,
						status	: obj.status.phase
					}
				}));
			});
		});
		this.informer.on('update', (obj) => {
			if(obj.status.phase != this.cache[obj.metadata.name]) {
				console.log(`Updated: ${obj.metadata.name}` + ' STATUS: ' + obj.status.phase);
				this.cache[obj.metadata.name] = obj.status.phase;

				// loop through socket cache and respond
				Object.values(this.socketCache).forEach((socket) => {
					socket.send(JSON.stringify({
						cmd: 'inform',
						body: {
							event	: 'update',
							name	: obj.metadata.name,
							status	: obj.status.phase
						}
					}));
				});
			}
		});
		this.informer.on('delete', (obj) => {
			console.log(`Deleted: ${obj.metadata.name}` + ' STATUS: ' + obj.status.phase);
			delete this.cache[obj.metadata.name];

			// loop through socket cache and respond
			Object.values(this.socketCache).forEach((socket) => {
				socket.send(JSON.stringify({
					cmd: 'inform',
					body: {
						event	: 'delete',
						name	: obj.metadata.name,
						status	: obj.status.phase
					}
				}));
			});
		});
		this.informer.on('error', (err) => {
			console.error('INFORMER ERROR');
			console.error(err);
			setTimeout(() => {
				this.start();
			}, 5000);
		});
	}
	start() {
		this.informer.start();
	}
}
export default Informer;
