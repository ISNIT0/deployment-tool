
import config from './config';
import dc1 from './sn-kafka-psuedo-config';
import * as Dockerode from 'dockerode';
import * as express from 'express';

const app = express();

const dockerodeForHost = {};

function execForContainer(container, command: string[]) {
    return new Promise((resolve, reject) => {
        container.exec({ Cmd: command, AttachStdin: true, AttachStdout: true })
            .then(function (exec) {
                exec.start({ hijack: true, stdin: true }, function (err, stream) {
                    const parts = [];
                    stream.on('data', (part) => {
                        parts.push(part);
                    });

                    stream.on('end', () => {
                        resolve(Buffer.concat(parts).toString().trim());
                    });

                    stream.on('error', reject);
                });
            });
    });
}

function getContainerInfo(container) {
    return Promise.all([
        execForContainer(container, [`top`, `-b`, `-n`, `1`]),
        execForContainer(container, [`ls`]),
    ]).then(([
        top,
        ls
    ]) => {
        return {
            top,
            ls
        }
    });
}

function getHostInfo(host) {
    return new Promise((resolve, reject) => {
        resolve({
            HostInfo: 1
        });
    });
}

app.get('/info', (req, res) => {
    Promise.all(dc1.hosts.map(host => {
        return new Promise((resolve, reject) => {
            const docker = dockerodeForHost[host.label] = host.hostname === 'localhost'
                ? new Dockerode()
                : new Dockerode({
                    host: host.hostname,
                    port: '4243'
                });

            const containersPromise = new Promise((resolve, reject) => {
                docker.listContainers((err, containers) => {
                    const dContainers = containers.map(c => {
                        return docker.getContainer(c.Id);
                    });
                    Promise.all(dContainers.map(getContainerInfo))
                        .then((infos) => {
                            resolve(
                                infos.map((info, index) => {
                                    const container = containers[index];
                                    container.info = info;
                                    return info;
                                })
                            );
                        })
                        .catch(err => {
                            console.error(err);
                            reject(err);
                        });
                });
            });

            const hostPromise = new Promise((resolve, reject) => {
                return getHostInfo(host).then((hostInfo) => {
                    resolve({
                        ...host,
                        info: hostInfo
                    });
                }).catch(reject);
            });


            return Promise.all([containersPromise, hostPromise])
                .then(([containers, host]) => {
                    console.log(host, containers)
                    resolve({
                        host: host,
                        containers: containers
                    });
                })
                .catch(err => {
                    console.error(`Error getting info:`, err);
                    reject(err);
                });
        });
    }))
        .then(hosts => {
            res.send(hosts);
            // console.log(`Got ${hosts.length} hosts`);
            // hosts.forEach((host: any) => {
            //     console.log(`Host: [${host.host.label}] Hostname: [${host.host.hostname}]`);
            //     host.containers.forEach(container => {
            //         console.log(JSON.stringify(container, null, '\t'));
            //     });
            // });
        });
});

app.listen(8081);