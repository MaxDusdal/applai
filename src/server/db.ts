import { env } from "@/env";
import { PrismaClient } from "@prisma/client";

const createPrismaClient = () => {
  const baseClient = new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return baseClient.$extends({
    query: {
      application: {
        async update({ args, query }) {
          // Capture previous status before update
          const existing = args.data?.status
            ? await baseClient.application.findUnique({
                where: args.where,
                select: { id: true, userId: true, status: true },
              })
            : null;

          const result = await query(args);
          // Prisma $extends query hooks return opaque generic types; cast for access
          const r = result as {
            id: string;
            userId: string;
            status: string;
          };

          // Log status changes
          if (existing && r.status !== existing.status) {
            try {
              await baseClient.activity.create({
                data: {
                  applicationId: existing.id,
                  userId: existing.userId,
                  type: "STATUS_CHANGE",
                  description: `Status changed from ${existing.status} to ${r.status}`,
                  metadata: { from: existing.status, to: r.status },
                },
              });
            } catch (e) {
              console.error("Failed to log STATUS_CHANGE activity:", e);
            }
          }

          return result;
        },
      },
      document: {
        async update({ args, query }) {
          const result = await query(args);
          // Prisma $extends query hooks return opaque generic types; cast for access
          const r = result as {
            userId: string | null;
            applicationId: string | null;
            type: string;
            name: string | null;
          };

          // Only log when source content changes
          if (args.data?.source) {
            try {
              if (r.userId && r.applicationId) {
                await baseClient.activity.create({
                  data: {
                    applicationId: r.applicationId,
                    userId: r.userId,
                    type: "DOCUMENT_EDIT",
                    description: `${r.name ?? r.type} document updated`,
                  },
                });
              }
            } catch (e) {
              console.error("Failed to log DOCUMENT_EDIT activity:", e);
            }
          }

          return result;
        },
      },
    },
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
