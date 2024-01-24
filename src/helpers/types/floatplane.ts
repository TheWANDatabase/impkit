export const constants = {
  DOMAIN: "https://www.floatplane.com",
  API: "api",
  VERSION: 2,
  SPOOF: {
    COOKIE_ENV: "FP_COOKIE",
    DEFAULT_COOKIE: "",
    REFERRER: "www.floatplane.com",
    USER_AGENT:
      "Mozilla/5.0(X11;Linux x86_64;rv: 02.0) Gecko/20100101 Firefox/102.0",
    ACCEPT: "*/*",
    ACCEPT_LANGUAGE: "en-GB,en; q=0.5",
    ALT_USED: "www.floatplane.com",
    SEC_FETCH_DEST: "empty",
    SEC_FETCH_MODE: "cors",
    SEC_FETCH_SITE: "same-origin",
    IF_NONE_MATCH: 'W/"236-CzvTY3x97WDfGGB5IlhfIHDIlXM"',
    TE: "trailers",
  },
};

export interface ContentV3GetBlogResponse {
  id: string;
  guid: string;
  title: string;
  text: string;
  type: string;
  tags: string[];
  attachmentOrder: string[];
  metadata: Metadata;
  releaseDate: string;
  likes: number;
  dislikes: number;
  score: number;
  comments: number;
  creator: Creator;
  wasReleasedSilently: boolean;
  thumbnail: Thumbnail;
  isAccessible: boolean;
  userInteraction: any[];
  videoAttachments: VideoAttachment[];
  audioAttachments: AudioAttachment[];
  pictureAttachments: any[];
  galleryAttachments: any[];
}

export interface Metadata {
  hasVideo: boolean;
  videoCount: number;
  videoDuration: number;
  hasAudio: boolean;
  audioCount: number;
  audioDuration: number;
  hasPicture: boolean;
  pictureCount: number;
  hasGallery: boolean;
  galleryCount: number;
  isFeatured: boolean;
}

export interface Creator {
  id: string;
  owner: string;
  title: string;
  urlname: string;
  description: string;
  about: string;
  category: string;
  cover: any;
  icon: Icon;
  liveStream: any;
  subscriptionPlans: any;
  discoverable: boolean;
  subscriberCountDisplay: string;
  incomeDisplay: boolean;
}

export interface Icon {
  width: number;
  height: number;
  path: string;
  childImages: ChildImage[];
}

export interface ChildImage {
  width: number;
  height: number;
  path: string;
}

export interface Thumbnail {
  width: number;
  height: number;
  path: string;
  childImages: ChildImage2[];
}

export interface ChildImage2 {
  width: number;
  height: number;
  path: string;
}

export interface VideoAttachment {
  id: string;
  guid: string;
  title: string;
  type: string;
  description: string;
  releaseDate: any;
  duration: number;
  creator: string;
  likes: number;
  dislikes: number;
  score: number;
  isProcessing: boolean;
  primaryBlogPost: string;
  thumbnail: Thumbnail2;
  isAccessible: boolean;
}

export interface Thumbnail2 {
  width: number;
  height: number;
  path: string;
  childImages: any[];
}

export interface AudioAttachment {
  id: string;
  guid: string;
  title: string;
  type: string;
  description: string;
  duration: number;
  waveform: Waveform;
  creator: string;
  likes: number;
  dislikes: number;
  score: number;
  isProcessing: boolean;
  primaryBlogPost: string;
  isAccessible: boolean;
}

export interface Waveform {
  dataSetLength: number;
  highestValue: number;
  lowestValue: number;
  data: number[];
}
