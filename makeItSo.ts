// REQUIRES VIRTUALBOX EXTENSION PACK


import config from './config';
import dc1 from './sn-kafka-psuedo-config';

import * as virtualbox from 'virtualbox';
import * as Dockerode from 'dockerode';

const vbForHost = {};
const hostnameForHost = {};
const hostnames = config.machines;
const dockerodeForHost = {};

dc1.hosts.forEach(host => {
    const docker = dockerodeForHost[host.label] = host.hostname === 'localhost'
        ? new Dockerode()
        : new Dockerode({
            host: host.hostname,
            port: '4243'
        });

    return new Promise((resolve, reject) => {
        docker.listContainers(function (err, containers) {
            Promise.all(containers.map(function (containerInfo) {
                console.info(`Killing Container [${containerInfo.Image}] on host [${host.hostname}]`);
                return docker.getContainer(containerInfo.Id).stop();
            })).then(resolve).catch(reject);
        });
    }).then(() => {
        host.containers.forEach(container => {
            const deploy = () => {
                console.info(`Got image [${container.image}] on host ${host.label}`);
                docker.createContainer({
                    Image: container.image,
                    AttachStdin: false,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: false,
                    OpenStdin: false,
                    StdinOnce: false,
                    Env: Object.keys(container.environment || {}).map(key => `${key}=${container.environment[key]}`),
                    ...container.dockerConfig
                }).then(function (container) {
                    return container.start();
                }).then(function (c) {
                    console.info(`started container ${container.image}`);
                }).catch(err => console.error(`Error creating docker container on [${host.label}]:`, err));
            };

            if (container.deployDelay) {
                console.info(`Waiting [${container.deployDelay}]ms before deploying ${container.image}`);
                setTimeout(deploy, container.deployDelay);
            } else {
                deploy();
            }
        });
    });
});

process.on('exit', function () {
    // virtualbox.list(function (error, machines) {
    //     if (error) throw error;
    //     console.log(machines);
    //     machines.forEach(machine => virtualbox.poweroff(machine));
    // });
});