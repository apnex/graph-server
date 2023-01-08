FROM alpine AS build
LABEL stage=intermediate
WORKDIR "/root"

## build npm and app dependencies
COPY package.json /root/
RUN	apk --no-cache add \
	nodejs \
	npm \
	&& npm install npm@latest --global \
	&& npm install

## copy app to clean image
FROM alpine
WORKDIR "/root"
EXPOSE 8081/tcp
COPY --from=build /root/node_modules /root/node_modules
COPY --from=build /root/package.json /root/package.json
RUN	apk --no-cache add nodejs
COPY /router /root/router
COPY /controller /root/controller
COPY start.sh /root/
COPY main.js /root/
COPY config.json /root/

## entrypoint
ENTRYPOINT ["/root/start.sh"]
