#!/bin/bash
CNAME='apnex/graph-server'
docker rm -f ${CNAME} 2>/dev/null
docker rm -v $(docker ps -qa -f name=${CNAME} -f status=exited) 2>/dev/null
docker rmi -f ${CNAME} 2>/dev/null

docker build --no-cache -t docker.io/${CNAME} -f dockerfile .
docker rmi -f $(docker images -q --filter label=stage=intermediate)
