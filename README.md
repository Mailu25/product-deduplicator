# Product Deduplicator

Merges duplicate products from different stores and shows the lowest price for each.

## The Problem

The same product can appear under many different names depending on the source - different languages, abbreviations, casing. For example:
samsung s23
סמסונג גלקסי 23
SAMSUNG Galaxy S23

These are all the same product. A fuzzy matching algorithm that compares strings character by character isn't enough here, especially across languages.

## How It Works

1. Send all product names to Claude with a prompt asking it to normalize them into a consistent English format - translating Hebrew, expanding abbreviations, and using a fixed [Brand] [Series] [Model] structure. Products that refer to the same item must get the exact same canonical name. The response is requested as a JSON array to make parsing straightforward.
2. Group by the canonical name and keep the lowest price.

## Setup

```bash
npm install
export ANTHROPIC_API_KEY="sk-ant-..."
node index.js
```
