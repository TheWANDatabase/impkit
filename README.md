# ImpKit

A docker application designed to periodically scan for new episodes of "The WAN Show" on YouTube and import them into
our database.

> ### ⚠️ **Warning** ⚠️
> This is a work in progress and is not yet ready for production.

## Getting Started

This program requires access to a single ENV variable, `DATABASE_URL`, which should be a valid PostgreSQL connection

## Workflow

This program should be run once per week, immediately after the latest episode of WAN has both a youtube and a
floatplane VOD available.

The general workflow the app follows is as such:

1) Pull episode data from [WhenPlane](https://whenplane.com)
2) Process all episodes, updating existing entries with the newest data, and inserting new entries where required



