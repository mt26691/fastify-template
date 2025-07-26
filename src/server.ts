import Fastify from "fastify";
import { app } from "@/app";
import { config } from "@config/env";

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              messageFormat: "{msg} {processedTimeMs} {endpoint}",
            },
          }
        : undefined,
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort,
        };
      },
      res(reply) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  },
});

server.register(app);

const start = async (): Promise<void> => {
  try {
    await server.listen({
      port: config.PORT,
      host: config.HOST,
    });
    server.log.info(
      `Server listening on http://${config.HOST}:${String(config.PORT)}`
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

void start();
