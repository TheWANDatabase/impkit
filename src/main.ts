import { existsSync, readFileSync, readdirSync } from "fs";
import Logger from "lumberjack";
import { Client, episodeMarkers, episodes, media } from "datakit";
import { asc, eq, gte } from "drizzle-orm";
import { getBlogPost } from "./helpers/floatplane";
import { downloadVideo, getVideoInfo } from "./helpers/youtube";
import { logger, client, redis } from "./database";
import { upload } from "./helpers/s3";
import { transcribeAudio } from "./helpers/whisper";
import { installDependencies } from "./helpers/env";

let files = new Map<string, string>();
let NoKiDocs = readdirSync("./stamps");

async function runtime() {
  logger.log("Welcome to ImpKit");

  await redis.connect();

  // await installDependencies();

  logger.info("Parsing Timestamp Document Dates");
  let promises: Promise<void>[] = [];
  for (const file of NoKiDocs) {
    promises.push(
      new Promise<void>(async (resolve) => {
        let toParse = file
          .split(".txt")[0]
          .replace(/(\d{1,2}(st)\s|(th)\s|(nd)\s|(rd)\s)of/gim, "");
        let date = new Date(toParse);
        let episode = (
          await client.data
            .select({
              id: episodes.id,
            })
            .from(episodes)
            .where(gte(episodes.aired, date))
            .orderBy(asc(episodes.aired))
            .limit(1)
        )[0];
        if (episode === undefined) return resolve();
        logger.debug(
          ` - Mapping file ${date.toISOString()} | ${episode.id} | ${file}`
        );
        files.set(episode.id, file);
        return resolve();
      })
    );
  }

  await Promise.allSettled(promises);

  logger.info(
    "Fetching shows from current year",
    `(${new Date().getUTCFullYear()})`
  );
  let allShows: any[] = await (
    await fetch(
      "https://whenplane.com/api/history/year/" + new Date().getUTCFullYear()
    )
  ).json();

  logger.info("Fetching shows from past years");
  allShows = allShows.concat(
    await (await fetch("https://whenplane.com/api/history/year/2023")).json(),
    await (await fetch("https://whenplane.com/api/oldShows")).json()
  );

  allShows = allShows.sort((a, b) => {
    if (
      new Date(a.metadata.mainShowStart).getTime() >
      new Date(b.metadata.mainShowStart).getTime()
    )
      return -1;
    else if (
      new Date(a.metadata.mainShowStart).getTime() <
      new Date(b.metadata.mainShowStart).getTime()
    )
      return 1;
    return 0;
  });

  for (let show of allShows) {
    await upsertEpisode(client, show);
  }
}

runtime();

async function upsertEpisode(client: any, show: any): Promise<void> {
  let aired = show.metadata.mainShowStart
    ? new Date(show.metadata.mainShowStart)
    : new Date(show.metadata.snippet.publishedAt);

  let eid = "";

  let thumburl = "";

  if (show.metadata.snippet) {
    if (show.metadata.snippet.thumbnails.maxres !== undefined)
      thumburl = show.metadata.snippet.thumbnails.maxres.url;
    else if (show.metadata.snippet.thumbnails.standard !== undefined)
      thumburl = show.metadata.snippet.thumbnails.standard.url;
    else if (show.metadata.snippet.thumbnails.high !== undefined)
      thumburl = show.metadata.snippet.thumbnails.high.url;
    else if (show.metadata.snippet.thumbnails.medium !== undefined)
      thumburl = show.metadata.snippet.thumbnails.medium.url;
    else if (show.metadata.snippet.thumbnails.default !== undefined)
      thumburl = show.metadata.snippet.thumbnails.default.url;
  } else {
    if (show.metadata.thumbnails.maxres !== undefined)
      thumburl = show.metadata.thumbnails.maxres.url;
    else if (show.metadata.thumbnails.standard !== undefined)
      thumburl = show.metadata.thumbnails.standard.url;
    else if (show.metadata.thumbnails.high !== undefined)
      thumburl = show.metadata.thumbnails.high.url;
    else if (show.metadata.thumbnails.medium !== undefined)
      thumburl = show.metadata.thumbnails.medium.url;
    else if (show.metadata.thumbnails.default !== undefined)
      thumburl = show.metadata.thumbnails.default.url;
  }

  eid = thumburl.split("/")[4];
  let exists =
    (
      await client.data
        .select()
        .from(episodes)
        .where(eq(episodes.id, eid))
        .limit(1)
    )[0] !== undefined;

  let thumbnail = {
    original: {
      url: thumburl,
      width: 0,
      height: 0,
      mime: "image/unspecified",
    },
    kind: "Thumbnail",
    additional: {
      source: "youtube",
      video: eid,
    },
  };

  let duration = Math.floor(show.metadata.mainShowLength / 1000);
  if (Number.isNaN(duration)) duration = 0;

  let episode: any = {
    id: eid,
    floatplane: show.metadata.vods.floatplane
      ? show.metadata.vods.floatplane.split("/").pop()
      : undefined,
    title: show.metadata.title.trim(),
    description: show.metadata.description,
    aired,
    duration,
  };

  // let yt = await getVideoInfo(episode.id);
  // if (yt)
  //   episode.duration = parseInt(yt.player_response.videoDetails.lengthSeconds);

  if (!exists) {
    logger.log(
      "Inserting | " +
        aired +
        " | " +
        episode.id +
        " | " +
        episode.floatplane +
        " | " +
        episode.title
    );
    let mediaResult = (
      await client.data.insert(media).values(thumbnail).returning()
    )[0];
    episode.thumbnail = mediaResult.id;
    await client.data.insert(episodes).values(episode);
    [episode] = await client.data
      .insert(episodeMarkers)
      .values({ id: episode.id, thumb: true })
      .returning();
  } else {
    logger.log(
      "Updating  | " +
        aired +
        " | " +
        episode.id +
        " | " +
        episode.floatplane +
        " | " +
        episode.title
    );

    if (episode.thumbnail === undefined && thumburl) {
      let mediaResult = (
        await client.data.insert(media).values(thumbnail).returning()
      )[0];
      episode.thumbnail = mediaResult.id;
    }
    [episode] = await client.data
      .update(episodes)
      .set(episode)
      .where(eq(episodes.id, eid))
      .returning();
  }

  let [metadata] = await client.data
    .select()
    .from(episodeMarkers)
    .where(eq(episodeMarkers.id, episode.id));

  // if (!metadata.floatplaneCaptions && episode.floatplane) {
  //   await redis.xAdd("vods", "*", {
  //     kind: "floatplane",
  //     id: episode.id,
  //     vod: episode.floatplane,
  //   });
  // }

  if (!metadata.youtubeCaptions) {
    await redis.xAdd("vods", "*", {
      kind: "youtube",
      id: episode.id,
      vod: episode.id,
    });
  }

  // process.exit();

  // Find the document assigned to this episode ID
  // let document = files.get(episode.id as any);

  // If the document exists, parse it for topic importing
  // if (document !== undefined) {
  //   logger.info(" - Document found for episode: " + episode.id);
  //   await processDocument(client, document, episode);
  // } else {
  // // otherwise, import from youtube
  //   logger.info(" - Document not found for episode: " + episode.id);
  //  // TODO: Add youtube importing
  // }
  // let hasFPCaption = await fetch(
  //   `https://cdn.thewandb.com/captions/${episode.id}-fp.vtt`
  // );

  // let hasYTCaption = await fetch(
  //   `https://cdn.thewandb.com/captions/${episode.id}.vtt`
  // );

  // if (hasYTCaption.status === 404) {
  //   if (!existsSync(`./audio/${yt.player_response.videoDetails.videoId}.mp3`)) {
  //     console.log("Downloading VOD from Youtube");
  //     await downloadVideo(yt.player_response.videoDetails.videoId);
  //   }

  //   if (
  //     !existsSync(
  //       `./transcribed/${yt.player_response.videoDetails.videoId}.json`
  //     )
  //   ) {
  //     console.log("Transcribing Audio");
  //     await transcribeAudio(yt.player_response.videoDetails.videoId);
  //     await upload(
  //       `./transcribed/${yt.player_response.videoDetails.videoId}.vtt`,
  //       `captions/${yt.player_response.videoDetails.videoId}.vtt`
  //     );
  //     await client.data
  //       .update(episodeMarkers)
  //       .set({
  //         youtubeCaptions: true,
  //       })
  //       .where(eq(episodeMarkers.id, episode.id));
  //   } else {
  //     console.log("Uploading Transcripts");
  //     await upload(
  //       `./transcribed/${yt.player_response.videoDetails.videoId}.vtt`,
  //       `captions/${yt.player_response.videoDetails.videoId}.vtt`
  //     );
  //     await client.data
  //       .update(episodeMarkers)
  //       .set({
  //         youtubeCaptions: true,
  //       })
  //       .where(eq(episodeMarkers.id, episode.id));
  //   }
  // } else {
  //   await client.data
  //     .update(episodeMarkers)
  //     .set({
  //       youtubeCaptions: true,
  //     })
  //     .where(eq(episodeMarkers.id, episode.id));
  // }

  // if (hasFPCaption.status === 404) {
  //   if (episode.floatplane !== undefined && episode.floatplane !== null) {
  //     console.log("Attempting to download VOD from Floatplane");
  //     let blog = await getBlogPost(episode.floatplane);
  //     if (blog) {
  //       let vod = blog.videoAttachments[0];
  //       let diff =
  //         vod.duration -
  //         parseInt(yt.player_response.videoDetails.lengthSeconds);
  //       episode.preShowOffset = diff;
  //       episode.description = blog.text;
  //       await client.data
  //         .update(episodes)
  //         .set(episode)
  //         .where(eq(episodes.id, eid));
  //     }
  //   }
  // }
  // process.exit();
}
