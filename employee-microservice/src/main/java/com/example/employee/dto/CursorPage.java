package com.example.employee.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Cursor-based pagination response — efficient for large datasets.
 *
 * Interview: "Why is cursor-based pagination better than offset-based?"
 * → "Offset pagination (OFFSET 1000000 LIMIT 10) scans 1M+ rows before
 * returning.
 * Cursor pagination (WHERE id > lastSeenId LIMIT 10) uses an index seek — O(log
 * n).
 * Also, offset pagination breaks when data changes mid-pagination
 * (missing/duplicate
 * rows), while cursor pagination is stable because it references a specific
 * row."
 *
 * Interview: "When would you still use offset pagination?"
 * → "When you need 'jump to page N' functionality (rare in modern UIs).
 * Cursor pagination only supports next/previous, not random page access."
 *
 * @param <T> The type of items in the page
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CursorPage<T> {

    /** Items on this page */
    private List<T> items;

    /** Cursor for fetching the next page (null if no more pages) */
    private String nextCursor;

    /** Whether there are more items after this page */
    private boolean hasMore;

    /** Total count of items (optional, expensive for large tables) */
    private Long totalCount;

    /** Number of items in this page */
    private int size;
}
