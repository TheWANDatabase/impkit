import { Topic } from "./parser";
import { ChangeStatus, changelog, changes, comments, merchMessages, sponsorMatching, sponsorSpot, topics } from "datakit";
import { eq, asc } from "drizzle-orm";
import { NOKI_UID, SYS_UID, logger } from "../database";
import { resolveSponsor } from "./sponsors";

export type Chaneglog = {
  changelogId: string;
  status: ChangeStatus;
  added: Date;
  modified: Date;
  authorId: string;
  title: string;
  start: number;
  end: number;
};

export async function addTopic(client: any, topic: Topic): Promise<string> {
  let [result] = await client.data.insert(topics).values(topic).returning();

  return result.id;
}

export async function addTopicChangelog(
  client: any,
  references: string
): Promise<void> {
  await client.data.insert(changelog).values({
    topicId: references,
    started: new Date(),
  });
}

// async function proposeChange(client: any, log: string, status: ChangeStatus, author: string, title: string, start: number, end: number): Promise<string>
export async function proposeChange(
  client: any,
  log: Chaneglog
): Promise<string> {
  let [result] = await client.data.insert(changes).values(log).returning();

  return result.id;
}

export async function addComment(
  client: any,
  changelog: string,
  author: string,
  message: string
): Promise<void> {
  await client.data.insert(comments).values({
    changeId: changelog,
    message,
    authorId: author,
  });
}

export async function processTopics(client: any, episode: any, topics: Topic[]) {
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