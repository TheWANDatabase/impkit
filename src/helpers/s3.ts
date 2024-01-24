import {
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { readFileSync, statSync } from "fs";
import { s3 } from "../database";

export function upload(
  file: string,
  name: string
): Promise<PutObjectCommandOutput> {
  let stat = statSync(file);
  let body = readFileSync(file);

  return s3.send(
    new PutObjectCommand({
      Key: name,
      Bucket: process.env["CF_BUCKET_NAME"] || "cdn",
      Body: body,
      ContentLength: stat.size || 0,
    })
  );
}

export async function download(name: string, file: string) {
  let body = await s3.send(
    new GetObjectCommand({
      Key: name,
      Bucket: process.env["CF_BUCKET_NAME"] || "cdn",
    })
  );
}
