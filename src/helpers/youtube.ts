import ytdl, { videoInfo } from "ytdl-core";
const ffmpeg = require("fluent-ffmpeg");

export async function getVideoInfo(id: string): Promise<videoInfo> {
  return await ytdl.getInfo(id);
}