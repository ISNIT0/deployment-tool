type Hostname = string;
type Container = {
    kind: 'container',
    image: string,
    config?: {
        [key: string]: any
    },
    environment?: {
        [key: string]: string
    },
    dockerConfig?: {},
    deployDelay?: number
};

function makeLinuxHost(label: string, hostname: Hostname, containers: Container[]) {
    return {
        kind: 'host',
        label,
        hostname,
        containers
    };
}

function makeZooKeeper(zooServers: Hostname[], dockerConfig?: {}): Container {
    return {
        kind: 'container',
        image: 'isnit0/docker-kafka-arm',
        environment: {
            // 'ZOO_SERVERS': zooServers.map((zkHost, index) => {
            //     return `server.${index + 1}=${zkHost}`;
            // }).join(' ')
        },
        dockerConfig: Object.assign({ Cmd: ['zookeeper-server-start.sh', 'config/zookeeper.properties'] }, dockerConfig)
    };
};

function makeKafkaBroker(hostIp: string, zookeeperConnectionString: string, dockerConfig?: {}, deployDelay: number = 0): Container {
    return {
        kind: 'container',
        image: 'isnit0/docker-kafka-arm',
        environment: {
            'KAFKA_ZOOKEEPER_CONNECT': zookeeperConnectionString,
            'KAFKA_ADVERTISED_HOST_NAME': hostIp,
            'JMX_PORT': '9099',
            'KAFKA_JMX_OPTS': `-Dcom.sun.management.jmxremote=true -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Djava.rmi.server.hostname=${hostIp} -Djava.net.preferIPv4Stack=true -Dcom.sun.management.jmxremote.port=9099 -Dcom.sun.management.jmxremote.rmi.port=9099`,
        },
        dockerConfig: Object.assign({ Cmd: ['kafka-server-start.sh', 'config/server.properties'] }, dockerConfig),
        deployDelay
    };
};

function makeKafkaConsumer(zookeeperConnectionString: string, dockerConfig?: {}): Container {
    return {
        kind: 'container',
        image: 'kafka-consumer',
        config: {
            'zookeeper.connect': zookeeperConnectionString
        },
        dockerConfig: dockerConfig
    };
}

function makeKafkaProducer(brokerList: string[], dockerConfig?: {}): Container {
    return {
        kind: 'container',
        image: 'kafka-producer',
        config: {
            'broker-list': brokerList.join(',')
        },
        dockerConfig: dockerConfig
    };
}

function makeKafkaMirrorMaker(consumerZooKeeperConnectionString: string, producerBrokerConnectionString: string, dockerConfig: {}): Container {
    return {
        kind: 'container',
        image: 'kafka-mirror-maker',
        config: {
            'consumer.config.zookeeper.connect': consumerZooKeeperConnectionString,
            'producer.config.bootstrap.servers': producerBrokerConnectionString
        },
        dockerConfig: dockerConfig
    };
}

const dc1 = {
    label: 'DC1',
    hosts: [

        makeLinuxHost('ZK-0', '192.168.1.153', [
            makeZooKeeper([], {
                "HostConfig": {
                    "PortBindings": {
                        "2181/tcp": [{ "HostPort": "2181" }]
                    }
                }
            })
        ]),

        makeLinuxHost('KAF-0', '192.168.1.162', [
            makeKafkaBroker('192.168.1.162', '192.168.1.153:2181', {
                "ExposedPorts": {
                    "9099/tcp": {}
                },
                "HostConfig": {
                    "PortBindings": {
                        "9092/tcp": [{ "HostPort": "9092" }],
                        "9099/tcp": [{ "HostPort": "9099" }]
                    }
                }
            })
        ]),

        makeLinuxHost('KAF-1', '192.168.1.163', [
            makeKafkaBroker('192.168.1.163', '192.168.1.153:2181', {
                "ExposedPorts": {
                    "9099/tcp": {}
                },
                "HostConfig": {
                    "PortBindings": {
                        "9092/tcp": [{ "HostPort": "9092" }],
                        "9099/tcp": [{ "HostPort": "9099" }]
                    }
                }
            })
        ]),

        makeLinuxHost('KAF-2', '192.168.1.164', [
            makeKafkaBroker('192.168.1.164', '192.168.1.153:2181', {
                "ExposedPorts": {
                    "9099/tcp": {}
                },
                "HostConfig": {
                    "PortBindings": {
                        "9092/tcp": [{ "HostPort": "9092" }],
                        "9099/tcp": [{ "HostPort": "9099" }]
                    }
                }
            })
        ]),

        // ZooKeepers
        //makeLinuxHost('ZK1', '192.168.1.2', [makeZooKeeper(['192.168.1.2:2888:3888', '192.168.1.3:2888:3888'])]),
        //makeLinuxHost('ZK2', '192.168.1.3', [makeZooKeeper(['192.168.1.2:2888:3888', '192.168.1.3:2888:3888'])]),

        // Kafka Brokers
        /*makeLinuxHost('KAF1', '192.168.2.1', [
            makeKafkaBroker('192.168.1.2:2181,192.168.1.3:2181', { expose: '9092' })
        ]),
        makeLinuxHost('KAF2', '192.168.2.2', [
            makeKafkaBroker('192.168.1.2:2181,192.168.1.3:2181', { expose: '9092' })
        ]),
        makeLinuxHost('KAF3', '192.168.2.3', [
            makeKafkaBroker('192.168.1.2:2181,192.168.1.3:2181', { expose: '9092' })
        ]),

        // Kafka Consumers
        makeLinuxHost('CONS1', '192.168.3.1', [
            makeKafkaConsumer('192.168.1.2:2181,192.168.1.3:2181', { expose: '8080' })
        ]),
        makeLinuxHost('CONS1', '192.168.3.2', [
            makeKafkaConsumer('192.168.1.2:2181,192.168.1.3:2181', { expose: '8080' })
        ]),

        // Kafka Producers
        makeLinuxHost('PROD1', '192.168.4.1', [
            makeKafkaProducer(['192.168.2.1:9092', '192.168.2.2:9092'], { expose: '8080' })
        ]),
        makeLinuxHost('PROD2', '192.168.4.2', [
            makeKafkaConsumer('192.168.1.2:2181,192.168.1.3:2181', { expose: '9092' }),
            makeKafkaProducer(['192.168.4.2:9092'], { expose: '8080' })
        ]),

        // Mirror Maker
        makeLinuxHost('MM1', '192.168.5.1', [
            makeKafkaMirrorMaker('192.168.1.2', 'KAF1.DC2.commercetest.com', { expose: '8080' })
        ]),*/
    ]
};

export default dc1;