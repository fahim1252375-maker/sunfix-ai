export interface StoredObjectMetadata {
  id: string;
  ownerId: string;
  assetId: string;
  caseId: string;
  evidenceType: string;
  storageProvider: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
}

export interface StorageProvider {
  upload(input: {
    metadata: Omit<StoredObjectMetadata, 'storageProvider' | 'objectKey' | 'createdAt'>;
    file: Blob;
  }): Promise<StoredObjectMetadata>;
  download(metadata: StoredObjectMetadata): Promise<Blob>;
  delete(metadata: StoredObjectMetadata): Promise<void>;
  getMetadata(objectKey: string): Promise<StoredObjectMetadata | null>;
  verifyIntegrity(metadata: StoredObjectMetadata, file: Blob): Promise<boolean>;
}

// No provider is configured for the current Firebase Starter project. Returning
// null keeps callers from presenting local IndexedDB as remote object storage.
export function getConfiguredStorageProvider(): StorageProvider | null {
  return null;
}
