#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src/i18n/messages");
const enPath = path.join(root, "en.json");
const nlPath = path.join(root, "nl.json");

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const nl = JSON.parse(fs.readFileSync(nlPath, "utf8"));

/**
 * Recursively collect all leaf keys (string values only) from nested object
 */
function collectLeafKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = REDACTED
    
    if (typeof value === "string") {
      keys.push(fullKey);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Skip _orphans section to avoid syncing orphaned keys back into main structure
      if (key !== '_orphans') {
        keys.push(...collectLeafKeys(value, fullKey));
      }
    }
  }
  return keys;
}

/**
 * Get nested value by dot notation path - handles both flat and nested keys
 */
function getValue(obj, path) {
  // First try direct flat key access
  if (obj.hasOwnProperty(path)) {
    return obj[path];
  }
  
  // Then try nested path
  return path.split(".").reduce((current, segment) => {
    return current && typeof current === "object" ? current[segment] : undefined;
  }, obj);
}

/**
 * Set nested value by dot notation path - only creates path if value is a string
 */
function setValue(obj, path, value) {
  // Only proceed if we're setting a string value
  if (typeof value !== "string") {
    return false;
  }

  const segments = path.split(".");
  let current = obj;
  
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current) || typeof current[segment] !== "object" || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }
  
  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;
  return true;
}

// Get all leaf string keys from English (source of truth)
const enKeys = collectLeafKeys(en);
let added = 0;

for (const key of enKeys) {
  const nlValue = getValue(nl, key);
  const enValue = getValue(en, key);
  
  // Only add if missing in Dutch and English has a string value
  if (nlValue === undefined && typeof enValue === "string") {
    const success = setValue(nl, key, enValue);
    if (success) {
      added++;
    }
  }
}

if (added > 0) {
  fs.writeFileSync(nlPath, JSON.stringify(nl, null, 2) + "\n");
  console.log(`i18n-sync: added ${added} missing keys to nl.json`);
} else {
  console.log("i18n-sync: nl.json is up to date");
}