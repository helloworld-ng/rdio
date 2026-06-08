import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@rdio/env/server";

const uploadsPrefix = "uploads/";
const presignedUploadTtlSeconds = 15 * 60;

let client: S3Client | undefined;

function r2Client() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return client;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** R2 object key for an uploaded media file. */
export function mediaObjectKey(mediaId: string) {
  return `${uploadsPrefix}${mediaId}`;
}

/** Public browser URL for a stored media object. */
export function mediaPublicUrl(mediaId: string) {
  return `${trimTrailingSlash(env.R2_PUBLIC_URL)}/${mediaObjectKey(mediaId)}`;
}

/** Parses a media id from an R2 object key, if it is an upload object. */
export function mediaIdFromObjectKey(key: string) {
  if (!key.startsWith(uploadsPrefix)) {
    return;
  }

  const mediaId = key.slice(uploadsPrefix.length);
  return mediaId.length > 0 ? mediaId : undefined;
}

/** Creates a short-lived presigned PUT URL for a direct browser upload. */
export async function createPresignedMediaUpload(
  mediaId: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: mediaObjectKey(mediaId),
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client(), command, {
    expiresIn: presignedUploadTtlSeconds,
  });

  return {
    mediaId,
    uploadUrl,
    publicUrl: mediaPublicUrl(mediaId),
  };
}

/** Confirms an uploaded object exists and returns its stored metadata. */
export async function headMediaObject(mediaId: string) {
  const response = await r2Client().send(
    new HeadObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: mediaObjectKey(mediaId),
    })
  );

  return {
    contentType: response.ContentType,
    size: response.ContentLength ?? 0,
    uploadedAt: response.LastModified ?? new Date(),
  };
}

/** Lists uploaded media objects from R2. */
export async function listMediaObjects() {
  const objects: Array<{
    contentType?: string;
    mediaId: string;
    size: number;
    uploadedAt: Date;
  }> = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2Client().send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET,
        Prefix: uploadsPrefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      const mediaId = object.Key ? mediaIdFromObjectKey(object.Key) : undefined;

      if (!mediaId) {
        continue;
      }

      objects.push({
        mediaId,
        size: object.Size ?? 0,
        uploadedAt: object.LastModified ?? new Date(),
      });
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}

/** Deletes a media object from R2. */
export async function deleteMediaObject(mediaId: string) {
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: mediaObjectKey(mediaId),
    })
  );
}
