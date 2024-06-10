import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server";

let token = "";
const setToken = (_token: string) => {
  token = _token;
};

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:8080",
      headers() {
        return {
          Authorization: token,
        };
      },
    }),
  ],
});

const test = async () => {
  // const user = await trpc.user.findOne.query({ name: 'Alice' })
  const user = await trpc.user.register.mutate({ username: "Alice" });
  setToken(user.token)

  const userList = await trpc.user.list.query();
  console.log(userList);
};

test();
