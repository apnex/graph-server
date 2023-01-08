#!/usr/bin/env node
import k8s from '@kubernetes/client-node';

class KubeController {
	constructor(ns) {
		this.kc = new k8s.KubeConfig();

		// init controller
		if(process.env.CLUSTER_NS) {
			this.ns = process.env.CLUSTER_NS;
			this.kc.loadFromCluster();
			console.log('CONTROLLER: CLUSTER_NS is set - loadFromCluster');
		} else {
			this.ns = ns || 'default';
			this.kc.loadFromDefault();
			console.log('CONTROLLER: CLUSTER_NS not set - loadFromDefault');
		}
		console.log('INIT new { KUBE-CONTROLLER } for NS[ ' + this.ns + ' ]');

		this.CoreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
	}
	async createPod(name, socket) {
		var podSpec = {
			metadata: {
				name,
				labels: {
					type: 'node'
				}
			},
			spec: {
				containers: [
					{
						image: 'nginx',
						name: 'node'
					}
				]
			}
		};

		// check if pod exists
		let podResult = await this.CoreV1Api.listNamespacedPod(this.ns);
		let result = podResult.body.items.filter((pod) => {
			return pod.metadata.name == name;
		});

		// create if not
		if(result.length == 0) {
			this.CoreV1Api.createNamespacedPod(this.ns, podSpec).then((res) => {
				//console.log(JSON.stringify(res.body, null, "\t"));
			}).catch((error) => {
				console.log(JSON.stringify(error.body, null, "\t"));
			});
		} else {
			console.log('Cannot create POD [ ' + name + ' ] ... it already exists!');
		}
	}
	async deletePod(name, socket) {
		// check if pod exists
		let podResult = await this.CoreV1Api.listNamespacedPod(this.ns);
		let result = podResult.body.items.filter((pod) => {
			return pod.metadata.name == name;
		});

		// delete if exist
		if(result.length > 0) {
			this.CoreV1Api.deleteNamespacedPod(name, this.ns).then((res) => {
				//console.log(JSON.stringify(res.body, null, "\t"));
			}).catch((error) => {
				console.log(JSON.stringify(error.body, null, "\t"));
			});
		} else {
			console.log('Cannot delete POD [ ' + name + ' ] ... it does not exist!');
			socket.send(JSON.stringify({
				cmd: 'inform',
				body: {
					event   : 'delete',
					name    : name,
					status  : 'Terminated'
				}
			}));
		}
	}
	getPods() {
		return this.CoreV1Api.listNamespacedPod(this.ns);
	}
}
export default KubeController;
