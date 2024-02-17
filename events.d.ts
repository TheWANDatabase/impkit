/**
 * @description helper type to represent an API response from the /events endpoint
 * @type TimestampedEvent[]
 */
export type EventResponse = TimestampedEvent[];

/**
 * @description A single point in time during an episode, defined by its start, and end position in relative time
 * featuring information required to piece together a usable list of "timestamps" and internal WanDB controls
 */
export interface TimestampedEvent {
    /**
     * @description The event ID inside the database - can be ignored
     */
    id: string

    /**
     *  @description which kind of event is being fired at this timestamp
     *  each event may contain a different field from the relevant "metadata" field
     */
    event_type:
        "control"
        | "topic"
        | "child_topic"
        | "sponsor_spot"
        | "merch_message"
        | "after_dark"
        | "tangent"
        | "unknown"

    /**
     * @description Additional information to trigger internal logic, can generally be ignored
     */
    metadata: Metadata

    /**
     * @description Event Title, as seen on WanDB, this should be displayed to the user
     */
    title: string

    /**
     * @description The relative number of seconds from 00:00 to the current event starting
     */
    start: number

    /**
     * @description The relative number of seconds from 00:00 to the current event ending
     */
    end: number

    /**
     * @description can be ignored, used internally to display how old an event is
     */
    created: string

    /**
     * @description can be ignored, used internally to display how long since the event was updated
     */
    modified: string

    /**
     * @description The YouTube episode ID for this event
     */
    episode: string

    /**
     * @description The nesting depth of this event (0 = minimum, with higher numbers being further nested
     * this depth value should append this event to the children of the previous one, until such a time as there is not previous event
     * call the api with `parse_recursion=true` to have the API return this for you
     */
    depth: number

    /**
     * @description The nested children of this event. This can be ignored if you didnt call the api with the `parse_recursion=true` flag
     */
    children?: EventResponse
}

/**
 * @description utility interface for representing all the possible combinations of the `metadata` field
 */
export interface Metadata {
    /**
     * @description represents the type of control in a `control` event
     *
     * examples: `PRE_ROLL`, `POST_ROLL`, `SPONSORS`
     */
    control_type?: string

    /**
     * @description an array of urls which are ordered by use/relevance
     *
     * used by `topic`, `child_topic`
     */
    links?: string[]

    /**
     * @description an array of relevant products
     *
     * used by `merch_message`
     */
    relevant_products?: string[]

    /**
     * @description the url for the sponsor spot
     *
     * used by `sponsor_spot`
     */
    link?: string

    /**
     * @description the company who paid for said sponsor spot
     *
     * used by `sponsor_spot`
     */
    brand?: string
}