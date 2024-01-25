import { readdirSync } from "fs";
import { episodeMarkers, episodes, media } from "datakit";
import { asc, eq, gte } from "drizzle-orm";
import {
  logger,
  client,
  redis,
  indexApi,
  utilsApi,
  searchApi,
} from "./database";

let files = new Map<string, string>();
let NoKiDocs = readdirSync("./stamps");

async function runtime() {
  logger.log("Welcome to ImpKit");

  await redis.connect();

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

  /**
   * FEATURE - SEARCHABLE TOPICS + TITLES
   *
   */

  let searchEntity = await searchApi.search({
    index: "episodes",
    query: { query_string: show.metadata.title.trim() },
  });

  if (searchEntity.hits?.total === 0) {
    indexApi.insert({
      index: "episodes",
      doc: {
        episode_id: eid,
        title: show.metadata.title.trim(),
        description: "pending addition",
      },
    });
  }

  /**
   * END FEATURE
   */

  let [metadata] = await client.data
    .select()
    .from(episodeMarkers)
    .where(eq(episodeMarkers.id, episode.id));

  if (!metadata.floatplaneCaptions && episode.floatplane) {
    let exists = (await redis.exists(`vods:${episode.floatplane}`)) > 0;
    if (!exists) {
      await redis.set(
        `vods:${episode.floatplane}`,
        JSON.stringify({
          done: false,
          timings: {
            download: 0,
            transcribe: 0,
            upload: 0,
            job: 0,
          },
          queued: new Date(),
          completed: null,
        })
      );
      await redis.xAdd("vods", "*", {
        kind: "floatplane",
        id: episode.id,
        vod: episode.floatplane,
      });
    }
  }

  if (!metadata.youtubeCaptions) {
    let exists = (await redis.exists(`vods:${episode.id}`)) > 0;
    if (!exists) {
      await redis.set(
        `vods:${episode.id}`,
        JSON.stringify({
          done: false,
          timings: {
            download: 0,
            transcribe: 0,
            upload: 0,
            job: 0,
          },
          queued: new Date(),
          completed: null,
        })
      );
      await redis.xAdd("vods", "*", {
        kind: "youtube",
        id: episode.id,
        vod: episode.id,
      });
    }
  }

  // // Find the document assigned to this episode ID
  // let document = files.get(episode.id as any);

  // // If the document exists, parse it for topic importing
  // if (document !== undefined) {
  //   logger.info(" - Document found for episode: " + episode.id);
  //   await processDocument(client, document, episode);
  // } else {
  //   // otherwise, import from youtube
  //   logger.info(" - Document not found for episode: " + episode.id);
  //   // TODO: Add youtube importing
  // }
}
