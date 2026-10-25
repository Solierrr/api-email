import { readFileSync } from "node:fs";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { problemContentType } from "./problem.js";

export const serviceVersion = (
  JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version;

type JsonSchema = Record<string, unknown>;

export function toJsonSchema(schema: z.ZodType, io: "input" | "output") {
  const { $schema: _schema, ...json } = z.toJSONSchema(schema, {
    io,
    unrepresentable: "any",
  }) as JsonSchema;
  return json;
}

// Shared schemas (ProblemDetail and friends) come from the zod registry, so they are declared once
function componentSchemas(): JsonSchema[] {
  const { schemas } = z.toJSONSchema(z.globalRegistry, {
    uri: (id) => `${id}#`,
    unrepresentable: "any",
  });
  return Object.entries(schemas).map(([id, schema]) => {
    const { $schema: _schema, id: _id, ...json } = schema as JsonSchema;
    return { ...json, $id: id };
  });
}

export function problemResponse(description: string) {
  return {
    description,
    content: { [problemContentType]: { schema: { $ref: "ProblemDetail#" } } },
  };
}

export async function registerOpenApi(
  app: FastifyInstance,
  docsEnabled: boolean,
) {
  for (const schema of componentSchemas()) app.addSchema(schema);
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Solaria — api-email",
        description:
          "Renderiza e envia e-mails transacionais a partir de modelos fixos, em pt-BR, en-US e es-ES. É chamado só por outros serviços (api-core e api-auth): autentique com a chave de serviço no cabeçalho X-Service-Key.",
        version: serviceVersion,
        contact: { name: "Solaria", url: "https://github.com/Solierrr" },
        license: {
          name: "CC0-1.0",
          url: "https://creativecommons.org/publicdomain/zero/1.0/",
        },
      },
      servers: [
        { url: "https://api-email-6swz.onrender.com", description: "QA" },
        { url: "http://localhost:8083", description: "Local" },
      ],
      tags: [
        {
          name: "E-mails",
          description: "Prévia e envio de e-mails transacionais.",
        },
        {
          name: "Saúde",
          description: "Verificações de vivo e pronto usadas pela plataforma.",
        },
      ],
      components: {
        securitySchemes: {
          serviceKey: { type: "apiKey", in: "header", name: "X-Service-Key" },
        },
      },
      security: [{ serviceKey: [] }],
    },
    refResolver: {
      buildLocalReference: (json, _baseUri, _fragment, index) =>
        typeof json.$id === "string" ? json.$id : `def-${index}`,
    },
  });
  if (!docsEnabled) return;
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });
  app.get("/openapi.json", { schema: { hide: true } }, async () =>
    app.swagger(),
  );
}

export function exportContract(app: FastifyInstance) {
  // The marker lets release-please bump info.version together with package.json
  return app
    .swagger({ yaml: true })
    .replace(/^(  version: )(\S+)$/m, "$1$2 # x-release-please-version");
}
