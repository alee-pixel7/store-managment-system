// Item Validation Schemas
// Validates all input for item CRUD operations

export interface CreateItemInput {
  item_code: string;
  item_name: string;
  category_id?: number;
  brand?: string;
  unit: string;
  min_stock?: number;
  rack_location?: string;
  notes?: string;
  aliases?: string[];
}

export interface UpdateItemInput {
  item_code?: string;
  item_name?: string;
  category_id?: number | null;
  brand?: string | null;
  unit?: string;
  min_stock?: number;
  rack_location?: string | null;
  notes?: string | null;
  aliases?: string[];
}

const VALID_UNITS = ['PCS', 'KG', 'MTR', 'LTR', 'SET'];

export function validateCreateItem(data: unknown): CreateItemInput {
  const errors: string[] = [];
  const input = data as Record<string, unknown>;

  if (!input || typeof input !== 'object') {
    throw new Error('Request body is required');
  }

  // item_code: required, string, 1-50 chars
  if (!input.item_code || typeof input.item_code !== 'string') {
    errors.push('item_code is required and must be a string');
  } else if (input.item_code.trim().length === 0) {
    errors.push('item_code cannot be empty');
  } else if (input.item_code.trim().length > 50) {
    errors.push('item_code must be 50 characters or less');
  }

  // item_name: required, string, 1-200 chars
  if (!input.item_name || typeof input.item_name !== 'string') {
    errors.push('item_name is required and must be a string');
  } else if (input.item_name.trim().length === 0) {
    errors.push('item_name cannot be empty');
  } else if (input.item_name.trim().length > 200) {
    errors.push('item_name must be 200 characters or less');
  }

  // category_id: optional, positive integer
  if (input.category_id !== undefined && input.category_id !== null) {
    if (typeof input.category_id !== 'number' || input.category_id < 1 || !Number.isInteger(input.category_id)) {
      errors.push('category_id must be a positive integer');
    }
  }

  // brand: optional, string, max 100 chars
  if (input.brand !== undefined && input.brand !== null && typeof input.brand === 'string') {
    if (input.brand.trim().length > 100) {
      errors.push('brand must be 100 characters or less');
    }
  }

  // unit: required, must be one of valid units
  if (!input.unit || typeof input.unit !== 'string') {
    errors.push('unit is required');
  } else if (!VALID_UNITS.includes(input.unit.toUpperCase())) {
    errors.push(`unit must be one of: ${VALID_UNITS.join(', ')}`);
  }

  // min_stock: optional, non-negative number
  if (input.min_stock !== undefined && input.min_stock !== null) {
    if (typeof input.min_stock !== 'number' || input.min_stock < 0) {
      errors.push('min_stock must be a non-negative number');
    }
  }

  // rack_location: optional, string, max 100 chars
  if (input.rack_location !== undefined && input.rack_location !== null && typeof input.rack_location === 'string') {
    if (input.rack_location.trim().length > 100) {
      errors.push('rack_location must be 100 characters or less');
    }
  }

  // notes: optional, string, max 500 chars
  if (input.notes !== undefined && input.notes !== null && typeof input.notes === 'string') {
    if (input.notes.trim().length > 500) {
      errors.push('notes must be 500 characters or less');
    }
  }

  // aliases: optional, array of strings
  if (input.aliases !== undefined && input.aliases !== null) {
    if (!Array.isArray(input.aliases)) {
      errors.push('aliases must be an array of strings');
    } else {
      for (let i = 0; i < input.aliases.length; i++) {
        if (typeof input.aliases[i] !== 'string' || input.aliases[i].trim().length === 0) {
          errors.push(`aliases[${i}] must be a non-empty string`);
        } else if (input.aliases[i].trim().length > 100) {
          errors.push(`aliases[${i}] must be 100 characters or less`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    item_code: (input.item_code as string).trim().toUpperCase(),
    item_name: (input.item_name as string).trim(),
    category_id: input.category_id ? Number(input.category_id) : undefined,
    brand: input.brand ? String(input.brand).trim() : undefined,
    unit: (input.unit as string).toUpperCase(),
    min_stock: input.min_stock !== undefined ? Number(input.min_stock) : undefined,
    rack_location: input.rack_location ? String(input.rack_location).trim() : undefined,
    notes: input.notes ? String(input.notes).trim() : undefined,
    aliases: input.aliases ? (input.aliases as string[]).map(a => a.trim()) : [],
  };
}

export function validateUpdateItem(data: unknown): UpdateItemInput {
  const errors: string[] = [];
  const input = data as Record<string, unknown>;

  if (!input || typeof input !== 'object') {
    throw new Error('Request body is required');
  }

  // item_code: optional, string, 1-50 chars
  if (input.item_code !== undefined) {
    if (typeof input.item_code !== 'string') {
      errors.push('item_code must be a string');
    } else if (input.item_code.trim().length === 0) {
      errors.push('item_code cannot be empty');
    } else if (input.item_code.trim().length > 50) {
      errors.push('item_code must be 50 characters or less');
    }
  }

  // item_name: optional, string, 1-200 chars
  if (input.item_name !== undefined) {
    if (typeof input.item_name !== 'string') {
      errors.push('item_name must be a string');
    } else if (input.item_name.trim().length === 0) {
      errors.push('item_name cannot be empty');
    } else if (input.item_name.trim().length > 200) {
      errors.push('item_name must be 200 characters or less');
    }
  }

  // category_id: optional, positive integer or null
  if (input.category_id !== undefined && input.category_id !== null) {
    if (typeof input.category_id !== 'number' || input.category_id < 1 || !Number.isInteger(input.category_id)) {
      errors.push('category_id must be a positive integer');
    }
  }

  // brand: optional, string, max 100 chars or null
  if (input.brand !== undefined && input.brand !== null && typeof input.brand === 'string') {
    if (input.brand.trim().length > 100) {
      errors.push('brand must be 100 characters or less');
    }
  }

  // unit: optional, must be one of valid units
  if (input.unit !== undefined) {
    if (typeof input.unit !== 'string') {
      errors.push('unit must be a string');
    } else if (!VALID_UNITS.includes(input.unit.toUpperCase())) {
      errors.push(`unit must be one of: ${VALID_UNITS.join(', ')}`);
    }
  }

  // min_stock: optional, non-negative number
  if (input.min_stock !== undefined) {
    if (typeof input.min_stock !== 'number' || input.min_stock < 0) {
      errors.push('min_stock must be a non-negative number');
    }
  }

  // rack_location: optional, string, max 100 chars or null
  if (input.rack_location !== undefined && input.rack_location !== null && typeof input.rack_location === 'string') {
    if (input.rack_location.trim().length > 100) {
      errors.push('rack_location must be 100 characters or less');
    }
  }

  // notes: optional, string, max 500 chars or null
  if (input.notes !== undefined && input.notes !== null && typeof input.notes === 'string') {
    if (input.notes.trim().length > 500) {
      errors.push('notes must be 500 characters or less');
    }
  }

  // aliases: optional, array of strings (replaces entire set)
  if (input.aliases !== undefined && input.aliases !== null) {
    if (!Array.isArray(input.aliases)) {
      errors.push('aliases must be an array of strings');
    } else {
      for (let i = 0; i < input.aliases.length; i++) {
        if (typeof input.aliases[i] !== 'string' || input.aliases[i].trim().length === 0) {
          errors.push(`aliases[${i}] must be a non-empty string`);
        } else if (input.aliases[i].trim().length > 100) {
          errors.push(`aliases[${i}] must be 100 characters or less`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return {
    item_code: input.item_code ? (input.item_code as string).trim().toUpperCase() : undefined,
    item_name: input.item_name ? (input.item_name as string).trim() : undefined,
    category_id: input.category_id === null ? null : input.category_id ? Number(input.category_id) : undefined,
    brand: input.brand === null ? null : input.brand ? String(input.brand).trim() : undefined,
    unit: input.unit ? (input.unit as string).toUpperCase() : undefined,
    min_stock: input.min_stock !== undefined ? Number(input.min_stock) : undefined,
    rack_location: input.rack_location === null ? null : input.rack_location ? String(input.rack_location).trim() : undefined,
    notes: input.notes === null ? null : input.notes ? String(input.notes).trim() : undefined,
    aliases: input.aliases ? (input.aliases as string[]).map(a => a.trim()) : undefined,
  };
}

export function validatePagination(query: unknown): { page: number; limit: number; offset: number } {
  const q = query as Record<string, string>;
  const page = Math.max(1, parseInt(q.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit || '20', 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
