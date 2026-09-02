import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { sha256Hex } from "@/server/backup/crypto";
import {
  getBackupStorageConfig,
  isMemoryBackupAllowed,
  type BackupObjectStorage,
  type BackupStorageProviderName,
  type StoredBackupObject,
} from "@/server/backup/config";

const memoryStore = new Map<string, Buffer>();

function assertSafeStorageKey(key: string) {
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    throw new Error("Invalid backup storage key.");
  }
  if (!/^lorvex\/backups\/[A-Za-z0-9._-]+$/.test(key)) {
    throw new Error("Invalid backup storage key.");
  }
}

class MemoryBackupStorage implements BackupObjectStorage {
  readonly provider: BackupStorageProviderName = "memory";

  async put(key: string, body: Buffer): Promise<StoredBackupObject> {
    assertSafeStorageKey(key);
    memoryStore.set(key, body);
    return { key, sizeBytes: body.length, checksum: sha256Hex(body) };
  }

  async get(key: string): Promise<Buffer> {
    assertSafeStorageKey(key);
    const body = memoryStore.get(key);
    if (!body) throw new Error("Backup object not found.");
    return body;
  }

  async head(key: string) {
    assertSafeStorageKey(key);
    const body = memoryStore.get(key);
    return body ? { sizeBytes: body.length } : null;
  }

  async remove(key: string) {
    assertSafeStorageKey(key);
    memoryStore.delete(key);
  }

  async signedDownloadUrl(): Promise<string> {
    throw new Error("Direct backup object URLs are disabled.");
  }
}

class S3BackupStorage implements BackupObjectStorage {
  readonly provider: BackupStorageProviderName = "s3";
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const cfg = getBackupStorageConfig();
    if (!cfg.bucket || !cfg.accessKey || !cfg.secretKey) {
      throw new Error("S3 backup storage is not configured.");
    }
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: cfg.region || "auto",
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secretKey,
      },
      ...(cfg.endpoint
        ? { endpoint: cfg.endpoint, forcePathStyle: cfg.forcePathStyle || true }
        : {}),
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredBackupObject> {
    assertSafeStorageKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        CacheControl: "private, no-store",
      }),
    );
    return { key, sizeBytes: body.length, checksum: sha256Hex(body) };
  }

  async get(key: string): Promise<Buffer> {
    assertSafeStorageKey(key);
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Backup object is empty.");
    return Buffer.from(bytes);
  }

  async head(key: string) {
    assertSafeStorageKey(key);
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { sizeBytes: result.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }

  async remove(key: string) {
    assertSafeStorageKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async signedDownloadUrl(): Promise<string> {
    throw new Error("Direct backup object URLs are disabled.");
  }
}

export function createBackupStorage(): BackupObjectStorage {
  const cfg = getBackupStorageConfig();
  if (cfg.requestedProvider === "memory" && !isMemoryBackupAllowed()) {
    throw new Error(
      "In-memory backup storage is not allowed in production. Set BACKUP_STORAGE_PROVIDER=s3.",
    );
  }
  if (cfg.provider === "memory") {
    return new MemoryBackupStorage();
  }
  if (cfg.provider === "s3") {
    return new S3BackupStorage();
  }
  throw new Error(
    "Backup object storage is not configured. Set BACKUP_STORAGE_PROVIDER=s3 and the BACKUP_STORAGE_* variables.",
  );
}

export { assertSafeStorageKey, memoryStore };
