import { S3Client } from "@aws-sdk/client-s3";
import { Client, ConType } from "datakit";
import Logger from "lumberjack";
import { createClient } from "redis";

export const logger = new Logger("impkit", "0.0.1");
export const client = new Client(ConType.POOL, 20);
export const NOKI_UID = "d6ecc832-4c9d-4e2c-a121-b646e2cdd645";
export const SYS_UID = "25ee7958-a3d0-42a6-8621-806fe627567b";
export const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env["CF_ACCOUNT_ID"]}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env["CF_ACCESS_KEY_ID"],
    secretAccessKey: process.env["CF_SECRET_ACCESS_KEY"],
  },
} as any);
export const redis = createClient({
  username: process.env["REDIS_USER"],
  password: process.env["REDIS_PASS"],
  url: `redis://${process.env["REDIS_HOST"]}:${process.env["REDIS_PORT"]}`,
});
