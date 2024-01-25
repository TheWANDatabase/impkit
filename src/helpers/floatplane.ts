import { ContentV3GetBlogResponse, constants } from "./types/floatplane";

export async function getBlogPost(
  id: string
): Promise<ContentV3GetBlogResponse | null> {
  let req = await fetch(
    "https://www.floatplane.com/api/v3/content/post?id=" + id,
    {
      headers: {
        "User-Agent": constants.SPOOF.USER_AGENT,
        Accept: constants.SPOOF.ACCEPT,
        "Accept-Language": constants.SPOOF.ACCEPT_LANGUAGE,
        Referer: constants.SPOOF.REFERRER,
        "Alt-Used": constants.SPOOF.ALT_USED,
        Cookie: process.env[constants.SPOOF.COOKIE_ENV] ?? "",
        "Sec-Fetch-Dest": constants.SPOOF.SEC_FETCH_DEST,
        "Sec-Fetch-Mode": constants.SPOOF.SEC_FETCH_MODE,
        "Sec-Fetch-Site": constants.SPOOF.SEC_FETCH_SITE,
        "If-None-Match": constants.SPOOF.IF_NONE_MATCH,
        TE: constants.SPOOF.TE,
      },
    }
  );

  if (req.status !== 200) return null;

  return (await req.json()) satisfies ContentV3GetBlogResponse;
}
