use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum ResponseType {
  Display,

}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum CDNEntity {
  /// The CDN Entity is not currently in our CDN, and can be found at the provided address
  URL(String),

  /// The CDN Entity is stored in our CDN, and details can be found using the provided UUIDv4 tag
  Asset(Uuid),
}

/// Helper struct to represent an episode in the archive.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Episode {
  /// The ID of the episode, as found on [YouTube](https://developers.google.com/youtube/v3/docs/videos#properties)
  /// 12 character String
  pub id: String,

  /// The ID of the episode, as found on Floatplane
  /// optional 12 character string
  pub floatplane: Option<String>,

  /// The title of the episode as seen on YouTube, or if present, Floatplane.
  pub title: String,

  /// The description of the episode, as seen on YouTube, or if present, Floatplane.
  pub description: String,

  /// The thumbnail of the episode, this can be either a URL, or a UUIDv4 String
  /// If it is a URL, it will point to an image directly
  /// If it is a UUIDv4 String, it will be pointing to a CDN Entity on our [CDN](https://edge.thewandb.com/v2/cdn/)
  pub thumbnail: CDNEntity,

  /// The timestamp that the stream started (aligned to UTC) (or if not known, the upload timestamp of the VOD
  pub aired: DateTime<Utc>,

  /// The number of seconds that the stream ran for on YouTube.
  pub duration: i64,

  /// The hosts for this episode of the show (usually Linus, Luke, and Dan)
  pub hosts: Vec<Host>,

  pub timestamps: Vec<TimestampedEvent>,
}

/// Helper enum to differentiate the types of timestamped event
/// that can happen during a single episode of WAN Show
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum TimestampType {
  /// Used to represent control timestamps in text docs
  /// Examples:
  /// ```
  /// "*Chapters*"
  /// Tells the parser the current time of the start point (usually 0:00)
  ///
  /// "*Intro*"
  /// Tells the parser where the start of the intro is (allows functionality for "skip intro"
  ///
  /// "*Sponsors*"
  /// Tells the parser that the next few topics are
  ///
  /// "*Outro*"
  /// Tells the parser the start time of the outro segment (which is where we consider an episode as "watched"
  ///
  /// "Topic #1: Apple "maliciously" complies with EU's Digital Markets Act."
  /// Tells the parser that we are entering a "topic segment" which may contain many timestamps of various types.
  /// We use only the first portion to determine what the control is, and the remainder is used as the title
  ///
  /// "*Merch Message #2 ft, WAN Show After Dark*"
  /// ```
  Control(String),

  /// Topics already have the bare minimum necessary in the TimestampedEvent
  Topic(Box<Vec<TimestampedEvent>>),

  /// Child topics are bound to a parent topic, we should know which one that
  /// is by passing the uuid of the parent topic as an enum param
  ChildTopic(Uuid),

  /// Sponsor spots are events which happen at any point during the show.
  SponsorSpot(Company, String),

  /// A merch message is a form of paid interaction during the show
  /// it allows viewers to prompt the hosts using questions that they select
  /// there are several types of merch message response, but not all are visible
  MerchMessage(ResponseType),

  /// A section of the show which represents the end of "news" and
  /// the starting of longer form Q&A topics from the community
  /// This section can be sponsored, but is often not.
  AfterDark(Option<Box<TimestampType>>, Box<Vec<TimestampedEvent>>),
  Tangent(Option<Uuid>),
  Unknown(String),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimestampedEvent {
  pub id: Uuid,
  pub kind: TimestampType,
  pub title: String,
  pub parent: String,
  pub start: u64,
  pub end: u64,
  pub created: DateTime<Utc>,
  pub modified: DateTime<Utc>,
  pub references: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Host {
  pub id: Uuid,
  pub forename: Option<String>,
  pub surname: Option<String>,
  pub preferred_name: String,
  pub alias: Option<String>,
  pub job: HostJob,
  pub avatar: Option<CDNEntity>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HostJob {
  pub id: Uuid,
  pub role: String,
  pub is_primary: bool,
  pub from: Option<DateTime<Utc>>,
  pub to: Option<DateTime<Utc>>,
  pub company: Company,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Company {
  pub id: Uuid,
  pub name: String,
  pub links: Vec<String>,
  pub logo: Option<CDNEntity>,
  pub founded: Option<u16>,
}