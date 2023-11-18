# Optimus

### Redis backed job handler for processing media files on behalf of the WAN Database

This module listens to a collection of streams on a Redis server and processes the jobs that are sent to it. It is
designed to be used in conjunction with the WAN Database, but could be used independently.

### Roles

- Transform media files into a format that is acceptable to the WAN Database
- Upload media files to our CDN
- Update the CDN directory with the new media files
- Generate [blurhash values](https://blurha.sh) for images
- Generate thumbnails for images

### Streams

- `optimus:jobs` - The main stream that Optimus listens to for jobs

### Job Formates

- `optimus:jobs:ingest` - Ingest a media file into the CDN
- `optimus:jobs:blurhash` - Generate a blurhash for an image

### Job Payloads

#### Ingest

```json
{
    "kind": "ingest", // The type of job
    "id": "1234567890" // The ID of the media file to ingest
}
```

#### Blurhash

```json
{
    "kind": "blur", // The type of job
    "id": "1234567890" // The ID of the image to generate a blurhash for
}
```

### CDN Strategies

All media files are hosted on Cloudflare's R2 service, which is a distributed object storage service. The CDN is available in two parts:

- `https://cdn.thewandb.com/assets` - The main CDN that is used for all media files
- `https://cdn.thewandb.com/ingest` - The portion of the CDN that is used for ingesting media files

When uploading a file to the CDN from the web-app, the file is uploaded to the `ingest` portion of the CDN, and a job is sent to Optimus to ingest that image accordingly.
Whilst an image has not been ingested, the CDN will instead load a "default" image in its place. This is to prevent broken images from being displayed on the web-app.

Once the image has been ingested, the CDN will then load the image from the `assets` portion of the CDN.

To request the url of an image from the CDN, you can use the following URL: `https://edge.thewandb.com/cdn/<id>`, where `<id>` is the ID of the image you want to load.
All entities which rely upon a CDN image within the database, will have an ID associated with the CDN media entity they are linked to.

### Blurhash

Blurhash is a method of generating a small, compressed representation of an image. This is useful for displaying a placeholder image whilst the full image is being loaded.
The blurhash is generated by Optimus, and is stored in the database alongside the image it is associated with.

The blurhash value is stored in the database as a string, alongside the CDN entity for the image. It is retrieved in the response provided by the `cdn` endpoint of the API.