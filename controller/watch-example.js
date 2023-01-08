//https://github.com/kubernetes-client/javascript/issues/559
//https://www.baeldung.com/java-kubernetes-watch

const http2 = require("http2");
const k8s = require("@kubernetes/client-node");

function KubernetesPodCache(namespace) {
this.informer = null;
this.namespace = namespace;

const onError = this.onError;
const onAdd = this.onAdd;
const onUpdate = this.onUpdate;
const onDelete = this.onDelete;

const that = this;
const k8sConfig = new k8s.KubeConfig();
k8sConfig.loadFromDefault();

const k8sApi = k8sConfig.makeApiClient(k8s.CoreV1Api);

const listFn = () => { 
    return k8sApi.listNamespacedPod(this.namespace);
};

const watch = new k8s.Watch(k8sConfig, http2Request);
this.informer = new k8s.ListWatch(`/api/v1/namespaces/${this.namespace}/pods`, watch, listFn, false);

this.start(onError, onAdd, onUpdate, onDelete);

setInterval(() => {
    if (this.informer && this.informer.stopped) {
        console.log("Detected Informer stopped - restarting...");
        this.start(onError, onAdd, onUpdate, onDelete);
        console.log("...Informer started.");
    }

}, 30000);

KubernetesPodCache.prototype.start = function (onError, onAdd, onUpdate, onDelete) {
this.informer.start();
this.informer.on("error", onError);
this.informer.on("add", onAdd);
this.informer.on("update", onUpdate);
this.informer.on("delete", onDelete);
}

KubernetesPodCache.prototype.onError = function (error) {
	console.error(error);
}

KubernetesPodCache.prototype.onAdd = function (obj) {
	console.log("add " + obj.metadata.name + ", " + obj.status.phase);
};

KubernetesPodCache.prototype.onUpdate = function (obj) {
	console.log("update " + obj.metadata.name + ", " + obj.status.phase);
};

KubernetesPodCache.prototype.onDelete = function (obj) {
	console.log("delete " + obj.metadata.name + ", " + obj.status.phase);
};

