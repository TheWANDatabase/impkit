import { createWriteStream, mkdirSync } from "fs";
import { resolve } from "path";
import ytdl, { videoInfo } from "ytdl-core";
const ffmpeg = require("fluent-ffmpeg");

export async function getVideoInfo(id: string): Promise<videoInfo> {
  return await ytdl.getInfo(id);
}

export async function downloadVideo(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log("> Downloading VOD");
      let stream = ytdl(id, {
        quality: "highestaudio",
      });
      mkdirSync("./audio/", { recursive: true });
      mkdirSync("./video/", { recursive: true });
      let rs = createWriteStream(`./video/${id}.mp4`);
      let bytes = 0;
      stream.pipe(rs);
      stream.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes % 10) {
          process.stdout.write(
            `\r  > Downloaded ${bytes.toLocaleString()} bytes`
          );
        }
      });
      stream.on("end", () => {
        let start = Date.now();
        console.log("\n> Converting to MP3");
        ffmpeg(`./video/${id}.mp4`)
          .audioBitrate(128)
          .save(`./audio/${id}.mp3`)
          .on("progress", (p: any) => {
            process.stdout.write(
              `\r  > ${p.currentKbps}kbps | ${p.percent.toFixed(2)}% Completed`
            );
          })
          .on("end", () => {
            console.log(`\ndone, took ${(Date.now() - start) / 1000}s`);
            resolve();
          });
      });
    } catch (e) {
      reject(e);
    }
  });
}
