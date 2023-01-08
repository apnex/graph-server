#!/usr/bin/env node
import k8s from '@kubernetes/client-node';
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// https://learnk8s.io/real-time-dashboard
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
/*function listFn() {
	k8sApi.listNamespacedPod('default');
}*/

const listFn = () => k8sApi.listNamespacedPod('default');
const informer = k8s.makeInformer(kc, '/api/v1/namespaces/default/pods', listFn);

informer.on('add', (obj) => {
	console.log(`Added: ${obj.metadata.name}`);
});
informer.on('update', (obj) => {
	console.log(`Updated: ${obj.metadata.name}` + ' STATUS: ' + obj.status.phase);
	console.log(JSON.stringify(obj.status, null, "\t"));
});
informer.on('delete', (obj) => {
	console.log(`Deleted: ${obj.metadata.name}`);
	console.log(JSON.stringify(obj.status, null, "\t"));
});
informer.on('error', (err) => {
	console.error(err);

	// Restart informer after 5sec
	setTimeout(() => {
		informer.start();
	}, 5000);
});

informer.start();

// container states
/*
	"containerStatuses": [
		{
			"name": "node",
			"state": {
				"waiting": {
					"reason": "ContainerCreating"
				}
			}

	"containerStatuses": [
		{
			"name": "node",
			"state": {
				"running": {
					"startedAt": "2022-12-30T21:04:15Z"
				}
			}

	"containerStatuses": [
		{
			"name": "node",
			"state": {
				"terminated": {
					"exitCode": 0,
					"reason": "Completed",
					"startedAt": "2022-12-30T21:07:13Z",
					"finishedAt": "2022-12-30T21:08:22Z",
*/
