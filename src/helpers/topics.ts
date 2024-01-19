import { timestamp } from "drizzle-orm/mysql-core";
import { Topic } from "./parser";
import { ChangeStatus, changelog, changes, comments, topics } from "datakit";

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
