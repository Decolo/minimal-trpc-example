import { createHTTPServer } from "@trpc/server/adapters/standalone";
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import jwt from "jsonwebtoken";

const users = [{ name: "Alice" }, { name: "Bob" }];

export const createContext = async (opts: CreateNextContextOptions) => {
  const authorization = opts.req.headers.authorization;
 
  return {
    authorization
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;


const t = initTRPC.context<Context>().create({
  experimental: {
    iterablesAndDeferreds: true,
  },
});

const router = t.router;
const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.authorization) {
    throw new Error("Unauthorized");
  }

  const userJson = jwt.verify(ctx.authorization, "secret");

  if (!userJson) {
    throw new Error("Unauthorized");
  }

  if (typeof userJson === "string") {
    throw new Error("Authorize Error");
  }
  
  if (!userJson.username || !users.find(user => user.name === userJson.username)) {
    throw new Error("User not found");
  }

  return next({
    ctx: {
      user: {
        username: userJson.username
      }
    }
  })
});

// const authed = t.middleware(({ next, ctx }) => {});



const appRouter = router({
  user: {
    register: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation((opts) => {
      const { input } = opts;
      const { username } = input;

      users.push({ name: username })

      const token = jwt.sign({ username }, "secret", {
        expiresIn: "1h"
      })

      return {
        success: true,
        token
      }
    }),

    findOne: protectedProcedure
      .input(z.object({ name: z.string() }))
      .query((opt) => {
        const { input } = opt;
        return users.find((user) => user.name === input.name);
      }),
    list: protectedProcedure.query((opts) => {
      if (opts.ctx.user) {
        return users;
      }
    }),
  },
  
});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  router: appRouter,
  createContext
});

server.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
