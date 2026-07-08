import 'server-only';
import { randomUUID } from 'node:crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfig } from './config';

export type BucketKind = 'avatars' | 'gifs' | 'pdfs' | 'requests';

export interface UploadTarget {
  /** Presigned PUT URL the browser uploads the bytes to directly. */
  uploadUrl: string;
  /** Object key (store this or the publicUrl on the entity). */
  key: string;
  /** Stable public URL (path-style) for reading the object. */
  publicUrl: string;
}

const EXT_BY_TYPE: Record<string, string> = {
  'image/gif': '.gif',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * S3/MinIO abstraction. Endpoint + path-style come from env, so MinIO (dev) and
 * AWS S3 (prod) share one code path. Browser uploads use presigned PUT URLs to
 * keep large media off the API process.
 */
export class StorageService {
  /** Internal client for server-side ops (reachable from the API process). */
  private readonly s3: S3Client;
  /**
   * Presign client bound to the browser-reachable endpoint. Presigned URLs embed
   * the endpoint host in the signature, so they must be signed with the public
   * endpoint (e.g. localhost:9100) — not the internal one (e.g. minio:9000).
   */
  private readonly presigner: S3Client;
  private readonly buckets: Record<BucketKind, string>;
  private readonly publicEndpoint: string;

  constructor(config: AppConfig) {
    const region = config.get('S3_REGION');
    const forcePathStyle = config.get('S3_FORCE_PATH_STYLE');
    const credentials = {
      accessKeyId: config.get('S3_ACCESS_KEY'),
      secretAccessKey: config.get('S3_SECRET_KEY'),
    };
    const internalEndpoint = config.get('S3_ENDPOINT');
    this.publicEndpoint = (config.get('S3_PUBLIC_ENDPOINT') ?? internalEndpoint).replace(/\/+$/, '');

    this.s3 = new S3Client({ endpoint: internalEndpoint, region, credentials, forcePathStyle });
    this.presigner = new S3Client({ endpoint: this.publicEndpoint, region, credentials, forcePathStyle });
    this.buckets = {
      avatars: config.get('S3_BUCKET_AVATARS'),
      gifs: config.get('S3_BUCKET_GIFS'),
      pdfs: config.get('S3_BUCKET_PDFS'),
      requests: config.get('S3_BUCKET_REQUESTS'),
    };
  }

  /** Create a presigned PUT target under a key prefix (e.g. coach id). */
  async createUploadTarget(
    kind: BucketKind,
    opts: { keyPrefix?: string; contentType: string },
  ): Promise<UploadTarget> {
    const ext = EXT_BY_TYPE[opts.contentType] ?? '';
    const prefix = opts.keyPrefix ? `${opts.keyPrefix.replace(/^\/|\/$/g, '')}/` : '';
    const key = `${prefix}${randomUUID()}${ext}`;
    const uploadUrl = await getSignedUrl(
      this.presigner,
      new PutObjectCommand({ Bucket: this.buckets[kind], Key: key, ContentType: opts.contentType }),
      { expiresIn: 300 },
    );
    return { uploadUrl, key, publicUrl: this.publicUrl(kind, key) };
  }

  publicUrl(kind: BucketKind, key: string): string {
    return `${this.publicEndpoint}/${this.buckets[kind]}/${key}`;
  }

  presignGet(kind: BucketKind, key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(
      this.presigner,
      new GetObjectCommand({ Bucket: this.buckets[kind], Key: key }),
      { expiresIn },
    );
  }

  /** Server-side upload (used by the PDF service). */
  async putObject(
    kind: BucketKind,
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.buckets[kind], Key: key, Body: body, ContentType: contentType }),
    );
    return this.publicUrl(kind, key);
  }

  async deleteByPublicUrl(kind: BucketKind, url: string | null | undefined): Promise<void> {
    if (!url) return;
    const prefix = `${this.publicEndpoint}/${this.buckets[kind]}/`;
    if (!url.startsWith(prefix)) return; // not one of ours — ignore
    const key = url.slice(prefix.length);
    await this.s3
      .send(new DeleteObjectCommand({ Bucket: this.buckets[kind], Key: key }))
      .catch(() => undefined);
  }
}
