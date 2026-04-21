import { auth } from "@/server/better-auth";
import { oAuthDiscoveryMetadata } from "better-auth/plugins";

const handler = oAuthDiscoveryMetadata(auth);

export const GET = (req: Request) => handler(req);
