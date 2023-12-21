/**/
import {readdirSync, readFileSync} from "fs";
import Logger from "lumberjack";
import {
  changelog,
  changes,
  ChangeStatus,
  Client,
  comments,
  episodes,
  sponsorMatching,
  sponsorSpot,
  topics
} from "datakit";
import {asc, eq, gte} from "drizzle-orm";

const logger = new Logger("impkit", "0.0.1");

const MainTopicRegex = /\[(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])]\s\*.*\*/
const SubTopicRegex = /\s{3}>\s(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])\s.*/
const IsMerchMessages = /\[(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])]\s\*Merch Messages #\d.*\*/
const IsSponsor = /\[(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])]\s\*Sponsors.*\*/
const IsContinued = /^\[Cont\.]/
const TimestampPattern = /\[?(?:([0-5]?[0-9]):)?([0-5]?[0-9]):([0-5][0-9])]?/


/**
 * Converts a timestamp string to seconds.
 *
 * @param {string} timestamp - The timestamp string in the format "DD:HH:MM:SS".
 * @returns {number} The equivalent number of seconds.
 * @throws {Error} If an invalid timestamp string is detected.
 * @example toSeconds('01:01') // -> 61
 */
function toSeconds(timestamp: string): number {

  let pieces = Array.from(timestamp.match(TimestampPattern)?.values() || []);

  let ss = pieces.pop();
  let mm = pieces.pop();
  let hh = pieces.pop();
  let dd = pieces.pop();

  if (ss !== undefined) {
    if (ss.length > 2) ss = undefined
  }
  if (mm !== undefined) {
    if (mm.length > 2) mm = undefined
  }
  if (hh !== undefined) {
    if (hh.length > 2) hh = undefined
  }
  if (dd !== undefined) {
    if (dd.length > 2) dd = undefined
  }

  let calculated = 0;

  if (ss === undefined) throw new Error("Invalid timestamp string detected");

  calculated += parseInt(ss);
  if (mm !== undefined) calculated += parseInt(mm) * 60;
  if (hh !== undefined) calculated += parseInt(hh) * 60 * 60;
  if (dd !== undefined) calculated += parseInt(dd) * 24 * 60 * 60;

  if (isNaN(calculated)) calculated = 0;

  return calculated;
}


async function runtime() {
  await logger.log("Welcome to ImpKit");

  // let thisYear = await (
  //   await fetch("https://whenplane.com/api/history/year/2023")
  // ).json();
  // let history = await (
  //   await fetch("https://whenplane.com/api/oldShows")
  // ).json();
  let client = new Client();

  // for (let show of thisYear) {
  //   let aired = show.metadata.mainShowStart
  //     ? new Date(show.metadata.mainShowStart)
  //     : new Date(show.metadata.snippet.publishedAt);
  //
  //   let eid = "";
  //
  //   let thumburl = "";
  //   if (show.metadata.thumbnails !== undefined) {
  //     if (show.metadata.thumbnails.maxres !== undefined)
  //       thumburl = show.metadata.thumbnails.maxres.url;
  //     else if (show.metadata.thumbnails.standard !== undefined)
  //       thumburl = show.metadata.thumbnails.standard.url;
  //     else if (show.metadata.thumbnails.high !== undefined)
  //       thumburl = show.metadata.thumbnails.high.url;
  //     else if (show.metadata.thumbnails.medium !== undefined)
  //       thumburl = show.metadata.thumbnails.medium.url;
  //     else if (show.metadata.thumbnails.default !== undefined)
  //       thumburl = show.metadata.thumbnails.default.url;
  //   }
  //
  //   eid = thumburl.split("/")[4];
  //   let exists =
  //     (
  //       await client.data
  //         .select()
  //         .from(episodes)
  //         .where(eq(episodes.id, eid))
  //         .limit(1)
  //     )[0] !== undefined;
  //
  //   let thumbnail = {
  //     original: {
  //       url: thumburl,
  //       width: 0,
  //       height: 0,
  //       mime: "image/unspecified",
  //     },
  //     kind: "Thumbnail",
  //     additional: {
  //       source: "youtube",
  //       video: eid,
  //     },
  //   };
  //
  //   let duration = Math.floor(show.metadata.mainShowLength / 1000);
  //   if (Number.isNaN(duration)) duration = 0;
  //   let preShowDuration = Math.floor((new Date(show.metadata.mainShowStart).getTime() - new Date(show.metadata.preShowStart).getTime()) / 1000);
  //   let episode: any = {
  //     id: eid,
  //     floatplane: show.metadata.vods.floatplane?.startsWith(
  //       "https://www.floatplane.com/post/",
  //     )
  //       ? show.metadata.vods.floatplane.split("/").pop()
  //       : show.metadata.vods.floatplane,
  //     title: show.metadata.title.trim(),
  //     description: show.metadata.description,
  //     aired,
  //     duration,
  //     preShowOffset: preShowDuration
  //   };
  //
  //   if (!exists) {
  //     logger.log(
  //       "Inserting | " +
  //       aired +
  //       " | " +
  //       episode.id +
  //       " | " +
  //       episode.floatplane +
  //       " | " +
  //       episode.title,
  //     );
  //     let mediaResult = (
  //       await client.data.insert(media).values(thumbnail).returning()
  //     )[0];
  //     episode.thumbnail = mediaResult.id;
  //     await client.data.insert(episodes).values(episode);
  //     await client.data
  //       .insert(episodeMarkers)
  //       .values({id: episode.id, thumb: true});
  //   } else {
  //     logger.log(
  //       "Updating  | " +
  //       aired +
  //       " | " +
  //       episode.id +
  //       " | " +
  //       episode.floatplane +
  //       " | " +
  //       episode.title,
  //     );
  //     await client.data
  //       .update(episodes)
  //       .set(episode)
  //       .where(eq(episodes.id, eid));
  //   }
  // }
  //
  // // history = history.concat(thisYear);
  //
  // logger.log("Found " + history.length + " shows");
  //
  // for (let show of history) {
  //   let aired = show.metadata.mainShowStart
  //     ? new Date(show.metadata.mainShowStart)
  //     : new Date(show.metadata.snippet.publishedAt);
  //
  //   let eid = "";
  //
  //   let thumburl = "";
  //   if (show.metadata.snippet.thumbnails.maxres !== undefined)
  //     thumburl = show.metadata.snippet.thumbnails.maxres.url;
  //   else if (show.metadata.snippet.thumbnails.standard !== undefined)
  //     thumburl = show.metadata.snippet.thumbnails.standard.url;
  //   else if (show.metadata.snippet.thumbnails.high !== undefined)
  //     thumburl = show.metadata.snippet.thumbnails.high.url;
  //   else if (show.metadata.snippet.thumbnails.medium !== undefined)
  //     thumburl = show.metadata.snippet.thumbnails.medium.url;
  //   else if (show.metadata.snippet.thumbnails.default !== undefined)
  //     thumburl = show.metadata.snippet.thumbnails.default.url;
  //
  //   eid = thumburl.split("/")[4];
  //   let exists =
  //     (
  //       await client.data
  //         .select()
  //         .from(episodes)
  //         .where(eq(episodes.id, eid))
  //         .limit(1)
  //     )[0] !== undefined;
  //
  //   let thumbnail = {
  //     original: {
  //       url: thumburl,
  //       width: 0,
  //       height: 0,
  //       mime: "image/unspecified",
  //     },
  //     kind: "Thumbnail",
  //     additional: {
  //       source: "youtube",
  //       video: eid,
  //     },
  //   };
  //
  //   let duration = Math.floor(show.metadata.mainShowLength / 1000);
  //   if (Number.isNaN(duration)) duration = 0;
  //
  //   let episode: any = {
  //     id: eid,
  //     floatplane: show.metadata.vods.floatplane,
  //     title: show.metadata.title.trim(),
  //     description: show.metadata.description,
  //     aired,
  //     duration,
  //   };
  //
  //   if (!exists) {
  //     logger.log(
  //       "Inserting | " +
  //       aired +
  //       " | " +
  //       episode.id +
  //       " | " +
  //       episode.floatplane +
  //       " | " +
  //       episode.title,
  //     );
  //     let mediaResult = (
  //       await client.data.insert(media).values(thumbnail).returning()
  //     )[0];
  //     episode.thumbnail = mediaResult.id;
  //     await client.data.insert(episodes).values(episode);
  //     await client.data
  //       .insert(episodeMarkers)
  //       .values({id: episode.id, thumb: true});
  //   } else {
  //     logger.log(
  //       "Updating  | " +
  //       aired +
  //       " | " +
  //       episode.id +
  //       " | " +
  //       episode.floatplane +
  //       " | " +
  //       episode.title,
  //     );
  //     await client.data
  //       .update(episodes)
  //       .set(episode)
  //       .where(eq(episodes.id, eid));
  //   }
  // }


  let files = new Map<Date, string>();
  let NoKiDocs = readdirSync('./stamps');

  for (const file of NoKiDocs) {
    let toParse = file.split('.txt')[0].replace(/(\d{1,2}(st)\s|(th)\s|(nd)\s|(rd)\s)of/igm, '');
    let date = new Date(toParse);
    let episode = (await client.data.select().from(episodes).where(gte(episodes.aired, date)))[0]
    if (episode === undefined) continue;
    files.set(date, file)
  }

  let archivedEpisodes = await client.data.select().from(episodes);


  for (let episode of archivedEpisodes) {
    let document = files.get(episode.aired as Date);

    if (document !== undefined) {
      logger.log("Document found for episode: " + episode.id);
      await processDocument(client, document, episode)
    } else {
      logger.log("Document not found for episode: " + episode.id);

    }

    console.log(episodes, files.get(episode.aired as Date))

  }
}

runtime();


async function processDocument(client: any, file: string, episode: any) {
  const text = readFileSync('./stamps/' + file, 'utf-8');
  const lines = text.replace(/\r/igm, '').split('\n');
  let currentTopic = null;
  let iteratingSponsors = false;
  let iteratingIgnored = false;
  let iteratingMerchMessages = false;
  let currentMainTopic;

  for (const line of lines) {
    if (line.length === 0) continue;
    let isContinued = IsContinued.test(line);

    if (isContinued) {
      console.warn("Additional processing needed for file", file)
      continue;
    }

    let lineIsSponsored = IsSponsor.test(line);
    let lineIsMainTopic = MainTopicRegex.test(line);
    let lineIsSecondaryTopic = SubTopicRegex.test(line);
    let lineIsMerchMessageLine = IsMerchMessages.test(line)


    if (lineIsSponsored) {
      iteratingSponsors = true;
    } else if (iteratingSponsors && lineIsMainTopic) {
      iteratingSponsors = false;
    } else if (iteratingSponsors && lineIsSecondaryTopic) {
      let context = line.split(TimestampPattern).pop() || '';
      let timestamp = line.match(TimestampPattern)?.shift();
      let sponsorRegex = (await client.data.select().from(sponsorMatching).where(eq(sponsorMatching.enabled, true)).orderBy(asc(sponsorMatching.priority))).map((entity: any) => {
        entity.regex = new RegExp(entity.pattern, entity.flags || 'gm');
        return entity;
      })
      let sponsorId;

      for (let {regex, company} of sponsorRegex) {
        let match = regex.test(context);

        if (match) {
          sponsorId = company;
          break;
        }
      }

      if (sponsorId !== undefined && context !== undefined && episode.id !== '') {
        await client.data.insert(sponsorSpot).values({
          message: context,
          url: null,
          companyId: sponsorId || '',
          added: new Date(),
          modified: new Date(),
          isDennis: false,
          start: toSeconds(timestamp || ''),
          safe: true,
          episodeId: episode.id,
        }).onConflictDoNothing().catch((e: unknown) => {
          logger.error(e);
        })
      }
    } else if (lineIsMerchMessageLine) {
      iteratingMerchMessages = true;
    } else if (iteratingMerchMessages && lineIsSecondaryTopic) {

    } else if (iteratingMerchMessages && lineIsMainTopic) {
      iteratingMerchMessages = false;
    } else if (lineIsMainTopic) {
      let text = line.split(TimestampPattern).pop()?.replace(/[*.]*/igm, '').trim() || '';
      let timestamp = toSeconds(line.match(TimestampPattern)?.shift() || '')

      switch (text) {
        case '':
        case 'Chapters':
        case 'Outro':
          continue;

        case 'Intro':
          await client.data.update(episodes).set({
            introStart: timestamp
          }).where(eq(episodes.id, episode.id));
          break;

        default:
          let topicTitle = text.split(/topic #\d*:\s/igm).pop();
          console.log(timestamp, topicTitle, '|', line);
          await client.data.insert(topics).values({
            episodeId: episode.id,
            title: topicTitle,
            start: timestamp,
            created: new Date(),
            modified: new Date(),
          }).returning().then(([inserted]: any[]) => {
            client.data.insert(changelog).values({
              topicId: inserted.id,
              started: new Date(inserted.created || '')
            }).then(() => {
              client.data.insert(changes).values({
                changelogId: inserted.id,
                status: ChangeStatus.accepted,
                added: new Date(inserted.created || ''),
                modified: new Date(inserted.created || ''),
                authorId: '7dd95843-442d-41d1-8f1d-2e5b45f415fe',
                title: topicTitle,
                start: timestamp,
                end: null,
              }).returning().then(([change]: any[]) => {
                client.data.insert(comments).values({
                  changeId: change.id,
                  message: 'Automatically imported timestamp based off of the values provided in NoKi1119\'s Timestamp document (available [here](https://docs.google.com/document/d/1R8f1IILzJV-xH6LP7Npj5PNgrI8DquxicFjZOxJvQgI/edit))',
                  authorId: '7dd95843-442d-41d1-8f1d-2e5b45f415fe'
                }).then(() => {
                });
              });
            });
          })
      }
    }
  }
}
