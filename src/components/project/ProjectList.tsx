"use client"

import { useState, useEffect, useCallback, useDeferredValue, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trash2,
  Edit,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Calendar,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getProjects, apiFetch } from "@/app/lib/api"
import type { Project } from "@/app/types"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InfiniteListFooter } from "@/components/admin/InfiniteListFooter"

export default function ProjectList() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "ongoing" | "completed" | "cancelled">("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const limit = 10
  const deferredSearchTerm = useDeferredValue(searchTerm.trim())
  const observerTarget = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  const lastScrollYRef = useRef(0)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)

  const fetchProjects = useCallback(async (pageNum = 1, isLoadMore = false, signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current
    try {
      if (isLoadMore) {
        setLoadingMore(true)
        setLoadMoreError(null)
      } else {
        if (hasLoadedOnceRef.current) {
          setIsRefreshing(true)
        } else {
          setLoading(true)
        }
      }
      const { projects: newProjects = [], pages = 1, total: totalProjects = 0, page: currentPage = pageNum } =
        await getProjects({
          page: pageNum,
          limit,
          search: deferredSearchTerm || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          sort: sortOrder,
          signal,
        })

      if (signal?.aborted || requestId !== requestIdRef.current) {
        return
      }

      if (isLoadMore) {
        setProjects((prev) => [...prev, ...newProjects])
      } else {
        setProjects(newProjects)
      }

      setTotal(totalProjects)
      setPage(currentPage)
      setHasMore(currentPage < pages)
      setLoadMoreError(null)
      hasLoadedOnceRef.current = true
    } catch (error: unknown) {
      if (signal?.aborted) {
        return
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch projects"
      if (isLoadMore) {
        setLoadMoreError(errorMessage)
      } else {
        setProjects([])
        setTotal(0)
      }
      toast.error(errorMessage)
    } finally {
      if (signal?.aborted || requestId !== requestIdRef.current) {
        return
      }
      if (isLoadMore) {
        setLoadingMore(false)
      } else {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [deferredSearchTerm, limit, sortOrder, statusFilter])

  useEffect(() => {
    const controller = new AbortController()
    setPage(1)
    setHasMore(true)
    setLoadMoreError(null)
    fetchProjects(1, false, controller.signal)
    return () => controller.abort()
  }, [fetchProjects])

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      const lastY = lastScrollYRef.current

      if (currentY <= 24) {
        setIsHeaderVisible(true)
      } else if (currentY > lastY + 8) {
        setIsHeaderVisible(false)
      } else if (currentY < lastY - 8) {
        setIsHeaderVisible(true)
      }

      lastScrollYRef.current = currentY
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const target = observerTarget.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading && !loadMoreError) {
          fetchProjects(page + 1, true)
        }
      },
      { rootMargin: "400px 0px", threshold: 0 }
    )

    if (target) {
      observer.observe(target)
    }

    return () => {
      if (target) {
        observer.unobserve(target)
      }
    }
  }, [fetchProjects, hasMore, loadMoreError, loading, loadingMore, page])

  const handleDelete = async (projectId: string) => {
    try {
      setIsDeleting(projectId)
      await apiFetch(`/projects/${projectId}`, { method: "DELETE" })
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId))
      setTotal((prev) => Math.max(0, prev - 1))
      toast.success("Project deleted successfully!")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete project"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(null)
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const confirmDelete = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(projectId)
    setDeleteDialogOpen(true)
  }

  const handleCardClick = (projectId: string) => {
    router.push(`/dashboard/projects/${projectId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 text-xs font-medium">
            <CheckCircle className="h-3 w-3" /> Completed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50 gap-1 text-xs font-medium">
            <AlertCircle className="h-3 w-3" /> Cancelled
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 gap-1 text-xs font-medium">
            <Clock className="h-3 w-3" /> In Progress
          </Badge>
        )
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-l-emerald-500"
      case "cancelled":
        return "border-l-red-500"
      default:
        return "border-l-blue-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-background rounded-xl p-5 border border-border/50">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasActiveQuery = deferredSearchTerm.length > 0 || statusFilter !== "all" || sortOrder !== "newest"

  if (projects.length === 0 && page === 1 && !hasActiveQuery) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-5">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
              Create your first project to start tracking your work and progress.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/dashboard/projects/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto">
        {/* Sticky Header */}
        <div
          className={`sticky top-0 z-40 bg-background/95 backdrop-blur transition-transform duration-300 supports-[backdrop-filter]:bg-background/60 ${
            isHeaderVisible ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="px-4 py-3 sm:px-6 sm:py-4 flex flex-row items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Projects</h1>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => router.push('/dashboard/projects/create')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="sticky top-0 z-30 -mt-px border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client, ID, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border border-border/50 focus-visible:ring-1"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 rounded-full border-border/50 bg-background">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="text-sm">
                      {statusFilter === "all"
                        ? "All Status"
                        : statusFilter === "ongoing"
                          ? "In Progress"
                          : statusFilter.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Status</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("ongoing")}>In Progress</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("completed")}>Completed</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>Cancelled</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-full border-border/50 bg-background"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
              >
                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">{sortOrder === "newest" ? "Newest" : "Oldest"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-3">
          {isRefreshing ? (
            <div className="rounded-2xl border border-border/50 bg-background/80 px-4 py-3 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                Updating projects...
              </div>
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div key={item} className="rounded-xl border border-border/50 p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {/* Projects List */}
        <AnimatePresence mode="wait">
          {projects.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="bg-background rounded-2xl border-2 border-dashed border-border/70 p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">No matching projects</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {projects.map((project, index) => {
                const totalPayments = Array.isArray(project.paymentHistory)
                  ? project.paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
                  : 0
                const grandTotal = Number(project.grandTotal) || 0
                const paymentPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0

                return (
                  <motion.div
                    key={project.projectId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <div
                      onClick={() => handleCardClick(project.projectId)}
                      className={`group bg-background rounded-xl border border-border/50 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 border-l-4 ${getStatusColor(project.status)}`}
                    >
                      {/* Mobile Layout */}
                      <div className="sm:hidden space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{project.projectId}
                              </span>
                              {getStatusBadge(project.status)}
                            </div>
                            <h3 className="font-semibold text-foreground">{project.clientName}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              ₹{grandTotal.toFixed(0)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Payment Progress</span>
                            <span>{paymentPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${paymentPercentage === 100 ? "bg-emerald-500" : "bg-primary"}`}
                              style={{ width: `${paymentPercentage}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <Calendar className="h-3 w-3" />
                            {new Date(project.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                            <Phone className="h-3 w-3" />
                            {project.clientNumber}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/projects/edit/${project.projectId}`)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => confirmDelete(project.projectId, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden sm:flex sm:items-center sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xs text-muted-foreground">#{project.projectId}</span>
                            {getStatusBadge(project.status)}
                          </div>
                          <h3 className="font-semibold text-foreground truncate mb-2">{project.clientName}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(project.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {project.clientNumber}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate max-w-[150px]">{project.clientAddress}</span>
                            </div>
                          </div>
                        </div>

                        <div className="w-48 px-4 border-l border-border/50">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{paymentPercentage.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${paymentPercentage === 100 ? "bg-emerald-500" : "bg-primary"}`}
                                style={{ width: `${paymentPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-center px-4 border-l border-border/50 min-w-[100px]">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold text-foreground">
                            ₹{grandTotal.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 pl-2 border-l border-border/50">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/projects/edit/${project.projectId}`)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => confirmDelete(project.projectId, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>

        <InfiniteListFooter
          hasMore={hasMore}
          isLoadingMore={loadingMore}
          loadMoreError={loadMoreError}
          loadedCount={projects.length}
          totalCount={total}
          itemLabel="Projects"
          observerTargetRef={observerTarget}
          onRetry={() => fetchProjects(page + 1, true)}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this project? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => projectToDelete && handleDelete(projectToDelete)}
              className="rounded-lg"
              disabled={isDeleting !== null}
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
