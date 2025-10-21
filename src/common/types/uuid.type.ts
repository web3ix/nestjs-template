import { version as uuidVersion, validate as validateUuid } from 'uuid';
import { uuidv7 } from 'uuidv7';
import { Branded } from './types';

/**
 * UUID v7 type - client-generated, time-ordered identifier
 *
 * UUIDs are generated on the client/application side using UUIDv7,
 * NOT by the database. This ensures:
 * - Time-ordered IDs for better database performance
 * - Client control over ID generation
 * - Better distributed system support
 */
export type Uuid = Branded<string, 'Uuid'>;

/**
 * UUID v7 utilities
 */
export namespace Uuid {
  /**
   * Generate a new UUID v7 (client-side generation)
   */
  export function generate(): Uuid {
    return uuidv7() as Uuid;
  }

  /**
   * Validate if string is a valid UUID v7
   */
  export function isValid(value: string): boolean {
    return validateUuid(value) && uuidVersion(value) === 7;
  }

  /**
   * Create a Uuid from a string (throws if invalid)
   */
  export function fromString(value: string): Uuid {
    if (!isValid(value)) {
      throw new Error(`Invalid UUID v7 format: ${value}`);
    }
    return value as Uuid;
  }

  /**
   * Create a Uuid from a string if valid, otherwise return null
   */
  export function fromStringOrNull(value: string): Uuid | null {
    try {
      return fromString(value);
    } catch {
      return null;
    }
  }

  /**
   * Try to create a UUID from unknown value
   */
  export function tryFrom(value: unknown): Uuid | null {
    if (typeof value !== 'string') {
      return null;
    }
    return fromStringOrNull(value);
  }

  /**
   * Compare two Uuids
   */
  export function equals(a: Uuid, b: Uuid): boolean {
    return a === b;
  }

  /**
   * For JSON serialization
   */
  export function toJSON(value: Uuid): string {
    return value;
  }
}
