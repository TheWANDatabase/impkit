/**/
import { readdirSync, readFileSync } from "fs";
import Logger from "lumberjack";
import {
  changelog,
  changes,
  ChangeStatus,
  Client,
  comments,
  episodeMarkers,
  episodes,
  media,
  sponsorMatching,
  sponsorSpot,
  topics,
  merchMessages,
} from "datakit";
import { asc, eq, gte } from "drizzle-orm";
import { parseDocument, Topic } from "./helpers/parser";
import {
  addComment,
  addTopic,
  addTopicChangelog,
  proposeChange,
} from "./helpers/topics";
import internal from "stream";
import { resolveSponsor } from "./helpers/sponsors";

const logger = new Logger("impkit", "0.0.1");
const NOKI_UID = "d6ecc832-4c9d-4e2c-a121-b646e2cdd645";
const SYS_UID = "25ee7958-a3d0-42a6-8621-806fe627567b";

let files = new Map<string, string>();
let NoKiDocs = readdirSync("./stamps");

async function runtime() {
  logger.log("Welcome to ImpKit");
  let client = new Client();

  logger.info("Parsing Timestamp Document Dates");
  for (const file of NoKiDocs) {
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
    if (episode === undefined) continue;
    logger.debug(
      ` - Mapping file ${date.toISOString()} | ${episode.id} | ${file}`
    );
    files.set(episode.id, file);
  }

  logger.info(
    "Fetching shows from current year",
    `(${new Date().getUTCFullYear()})`
  );
  let allShows = await (
    await fetch(
      "https://whenplane.com/api/history/year/" + new Date().getUTCFullYear()
    )
  ).json();

  logger.info("Fetching shows from past years");
  allShows = allShows.concat(
    await (await fetch("https://whenplane.com/api/oldShows")).json()
  );

  logger.info("Pre-processing steps completed, starting archival...");
  for (let show of allShows) {
    await upsertEpisode(client, show).catch((e) => logger.error(e));
  }
}

runtime();

async function upsertEpisode(client: any, show: any) {
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
    floatplane: show.metadata.vods.floatplane,
    title: show.metadata.title.trim(),
    description: show.metadata.description,
    aired,
    duration,
  };

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
    await client.data
      .insert(episodeMarkers)
      .values({ id: episode.id, thumb: true });
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
    await client.data.update(episodes).set(episode).where(eq(episodes.id, eid));
  }

  let document = files.get(episode.id as any);

  if (document !== undefined) {
    logger.info(" - Document found for episode: " + episode.id);
    await processDocument(client, document, episode);
  } else {
    logger.info(" - Document not found for episode: " + episode.id);
  }

  //   console.log(episodes, files.get(episode.aired as Date))
}

async function processDocument(client: any, file: string, episode: any) {
  const text = readFileSync("./stamps/" + file, "utf-8");
  const topics: Topic[] = await parseDocument(text);
  const sponsorRegex = (
    await client.data
      .select()
      .from(sponsorMatching)
      .where(eq(sponsorMatching.enabled, true))
      .orderBy(asc(sponsorMatching.priority))
  ).map((entity: any) => {
    entity.regex = new RegExp(entity.pattern, entity.flags || "gm");
    return entity;
  });
  for (const topic of topics) {
    try {
      let internalTopic = await addTopic(client, {
        episodeId: episode.id,
        title: topic.title,
        start: topic.start,
        end: topic.end,
        created: topic.created,
        modified: topic.modified,
        ref: topic.ref,
        kind: topic.kind,
      });

      await addTopicChangelog(client, internalTopic);

      let internalChangelogId = await proposeChange(client, {
        changelogId: internalTopic,
        status: ChangeStatus.accepted,
        added: topic.created,
        modified: topic.modified,
        authorId: NOKI_UID,
        title: topic.title,
        start: topic.start,
        end: topic.end,
      });

      await addComment(
        client,
        internalChangelogId,
        SYS_UID,
        "Automatically imported timestamp based off of the values provided in NoKi1119's Timestamp document (available [here](https://docs.google.com/document/d/1R8f1IILzJV-xH6LP7Npj5PNgrI8DquxicFjZOxJvQgI/edit))"
      );
      if (!topic.children) continue;
      for (const child of topic.children) {
        try {
          switch (child.kind) {
            case "merch message":
              let [mmResult] = await client.data
                .insert(merchMessages)
                .values({
                  episodeId: episode.id,
                  message: child.title,
                  color: "#f65013",
                  author: "Unknown Author",
                  start: child.start,
                  end: child.end,
                })
                .returning();
              child.ref = mmResult.id;
              break;

            case "sponsor":
              let sponsor = resolveSponsor(child.title, sponsorRegex);
              if (!sponsor) break;
              let [sponsorResult] = await client.data
                .insert(sponsorSpot)
                .values({
                  message: child.title,
                  url: null,
                  companyId: sponsor,
                  isDennis: false,
                  start: child.start,
                  end: child.end,
                  safe: false,
                  episodeId: episode.id,
                })
                .returning();
              child.ref = sponsorResult.id;
              break;
          }

          let internalChildTopic = await addTopic(client, {
            episodeId: episode.id,
            parent: internalTopic,
            title: child.title,
            start: child.start,
            end: child.end,
            created: child.created,
            modified: child.modified,
            ref: child.ref,
            kind: child.kind,
          });

          await addTopicChangelog(client, internalChildTopic);
          let internalChildChangelogId = await proposeChange(client, {
            changelogId: internalChildTopic,
            status: ChangeStatus.accepted,
            added: child.created,
            modified: child.modified,
            authorId: NOKI_UID,
            title: child.title,
            start: child.start,
            end: child.end,
          });

          await addComment(
            client,
            internalChildChangelogId,
            SYS_UID,
            "Automatically imported timestamp based off of the values provided in NoKi1119's Timestamp document (available [here](https://docs.google.com/document/d/1R8f1IILzJV-xH6LP7Npj5PNgrI8DquxicFjZOxJvQgI/edit))"
          );
        } catch (e) {
          logger.error(e);
        }
      }
    } catch (e) {
      logger.error(e);
    }
  }
}
