import { z } from 'zod';

const DestinationApiRecordSchema = z.object({
  name: z.string(),
  creationName: z.string(),
  description: z.string(),
  website: z.string(),
  category: z.string(),
});
const DestinationsApiResponseSchema = z.array(DestinationApiRecordSchema);

type DestinationApiRecord = z.infer<typeof DestinationApiRecordSchema>;

// The segment API returns destinations with a creationName field which we rename to ID
export type Destination = Omit<DestinationApiRecord, 'creationName'> & {
  id: string;
};

/**
 * Return a full list of destinations that are enabled for the given write key.
 *
 * Source: https://gist.github.com/sperand-io/4725e248a35d5005d68d810d8a8f7b29
 *         https://github.com/tagticians/segment-onetrust-integration-api/blob/main/index.js
 * @param writeKey
 */
export const fetchDestinations = async (writeKey: string): Promise<Destination[]> => {
  const res = await window.fetch(`https://cdn.segment.com/v1/projects/${writeKey}/integrations`);

  if (!res.ok) {
    throw new Error(
      `Failed to fetch integrations for write key ${writeKey}: HTTP ${res.status} ${res.statusText}`,
    );
  }

  // Parse the API response and make sure it contains valid data using zod
  const apiRecords: DestinationApiRecord[] = DestinationsApiResponseSchema.parse(await res.json());

  // Do a simple transformation from DestinationApiRecord to Destination by renaming the creationName field to id
  return apiRecords.map(({ creationName: id, ...rest }) => ({ id, ...rest }));
};
