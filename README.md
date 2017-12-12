# Required
- NodeJS
- NPM
```bash
> npm i
> npm i -g ts-node typescript
```

# Running
```bash
# Configure sn-kafka-psuedo-config.ts first
> ts-node makeItSo.ts
```


# Docs will come soon(ish)


Current Thoughts...
We deploy using docker and tools in this repo to various machines (or one machine). Then use tc / pumba to upset things.



Enabling Docker remote API: https://www.ivankrizsan.se/2016/05/18/enabling-docker-remote-api-on-ubuntu-16-04/


Docker network chaos testing: https://github.com/gaia-adm/pumba


Helpful for starting kafka docker instances: https://github.com/ches/docker-kafka

# Manually running locally
```bash
> # Start ZooKeeper
> docker run --name zookeeper-instance --restart always -d 31z4/zookeeper

> # Find IP of zk
> docker network inspect bridge
> # Start Kafka Broker
> docker run -d --name kafka --env ZOOKEEPER_IP=172.17.0.2 ches/kafka
> # Create topic 'test'
> docker run --rm ches/kafka kafka-topics.sh --create --topic test --replication-factor 1 --partitions 1 --zookeeper 172.17.0.2:2181

> # Create a consumer
> docker run --rm ches/kafka kafka-console-consumer.sh --topic test --from-beginning --bootstrap-server 172.17.0.3:9092

> # Create a producer
> docker run --rm --interactive ches/kafka kafka-console-producer.sh --topic test --broker-list 172.17.0.3:9092
```
