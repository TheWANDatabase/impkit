import {Client} from "datakit/dist/client";
import {episodes, media, episodeMarkers} from "datakit";
import {eq} from "drizzle-orm";


async function runtime() {
  console.log("Welcome to ImpKit")
  let history = await (await fetch('https://whenplane.com/api/oldShows')).json()
  let client = new Client();

  console.log("Found " + history.length + " shows")

  for (let show of history) {
    let aired = show.metadata.mainShowStart ? new Date(show.metadata.mainShowStart) : new Date(show.metadata.snippet.publishedAt);


    let eid = "";


    let thumburl = "";
    if (show.metadata.snippet.thumbnails.maxres !== undefined) thumburl = show.metadata.snippet.thumbnails.maxres.url
    else if (show.metadata.snippet.thumbnails.standard !== undefined) thumburl = show.metadata.snippet.thumbnails.standard.url
    else if (show.metadata.snippet.thumbnails.high !== undefined) thumburl = show.metadata.snippet.thumbnails.high.url
    else if (show.metadata.snippet.thumbnails.medium !== undefined) thumburl = show.metadata.snippet.thumbnails.medium.url
    else if (show.metadata.snippet.thumbnails.default !== undefined) thumburl = show.metadata.snippet.thumbnails.default.url

    eid = thumburl.split('/')[4]
    let exists = (await client.data.select().from(episodes).where(eq(episodes.id, eid)).limit(1))[0] !== undefined;

    let thumbnail = {
      original: {
        url: thumburl,
        width: 0,
        height: 0,
        mime: 'image/unspecified'
      },
      kind: 'Thumbnail',
      additional: {
        source: 'youtube',
        video: eid
      }
    }


    let duration = Math.floor(show.metadata.mainShowLength / 1000);
    if (Number.isNaN(duration)) duration = 0;

    let episode: any = {
      id: eid,
      floatplane: show.metadata.vods.floatplane,
      title: show.metadata.title.trim(),
      description: show.metadata.description,
      aired,
      duration,
    }

    if (!exists) {
      console.log("Inserting | " + aired + " | " + episode.title);
      let mediaResult = (await client.data.insert(media).values(thumbnail).returning())[0];
      episode.thumbnail = mediaResult.id;
      await client.data.insert(episodes).values(episode);
      await client.data.insert(episodeMarkers).values({id: episode.id, thumb: true})
    } else {
      console.log("Updating  | " + aired + " | " + episode.title);
      await client.data.update(episodes).set(episode).where(eq(episodes.id, eid));
    }
  }
}

runtime()