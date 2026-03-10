"use client"

import type { RefObject } from "react"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type InfiniteListFooterProps = {
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreError: string | null
  loadedCount: number
  totalCount: number
  itemLabel: string
  observerTargetRef: RefObject<HTMLDivElement | null>
  onRetry: () => void
}

export function InfiniteListFooter({
  hasMore,
  isLoadingMore,
  loadMoreError,
  loadedCount,
  totalCount,
  itemLabel,
  observerTargetRef,
  onRetry,
}: InfiniteListFooterProps) {
  const lowercaseLabel = itemLabel.toLowerCase()

  return (
    <div className="py-8">
      {totalCount > 0 ? (
        <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
          Loaded {loadedCount} of {totalCount} {lowercaseLabel}
        </p>
      ) : null}

      {hasMore ? (
        loadMoreError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4 text-center shadow-sm">
            <p className="text-sm font-medium text-amber-900">Could not load more {lowercaseLabel}.</p>
            <p className="mt-1 text-xs text-amber-700">{loadMoreError}</p>
            <Button onClick={onRetry} variant="outline" className="mt-3 rounded-full border-amber-300 bg-white">
              Try Again
            </Button>
          </div>
        ) : isLoadingMore ? (
          <div className="space-y-3">
            {[1, 2].map((index) => (
              <div key={index} className="rounded-2xl border border-border/50 bg-background p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more {lowercaseLabel}...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div ref={observerTargetRef} className="h-4 w-full" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">Scroll to load more {lowercaseLabel}</p>
          </div>
        )
      ) : totalCount > 0 ? (
        <div className="rounded-2xl border border-border/50 bg-background px-4 py-4 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">All {totalCount} {lowercaseLabel} loaded</p>
          <p className="mt-1 text-xs text-muted-foreground">You have reached the end of the list.</p>
        </div>
      ) : null}
    </div>
  )
}
