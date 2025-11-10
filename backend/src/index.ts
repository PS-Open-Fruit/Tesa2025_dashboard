import { Elysia } from "elysia";
import { openapi } from '@elysiajs/openapi'

const app = new Elysia()
app.use(openapi());

app.get("/", () => "Hello Elysia").listen(3000);


console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
