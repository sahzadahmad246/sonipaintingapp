"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trash2, Edit, Eye, Search, FileText, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getProjects, apiFetch } from "@/app/lib/api"
import type { Project } from "@/app/types"

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // New state for deletion loading
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const limit = 10

  const fetchProjects = useCallback(async () => {
    try {
      const { projects, pages } = await getProjects(page, limit)
      console.log("Fetched projects:", projects) // Log API response for debugging
      setProjects(projects || [])
      setTotalPages(pages || 1)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch projects"
      toast.error(errorMessage)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  const filterProjects = useCallback(() => {
    let filtered = [...projects]
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.clientName?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          false ||
          p.projectId?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          false ||
          p.clientAddress?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
          false ||
          p.clientNumber?.includes(searchTerm) ||
          false,
      )
    }
    setFilteredProjects(filtered)
  }, [projects, searchTerm])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    filterProjects()
  }, [filterProjects])

  const handleDelete = async (projectId: string) => {
    try {
      setIsDeleting(projectId) // Set deletion loading state
      await apiFetch(`/projects/${projectId}`, { method: "DELETE" })
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId))
      toast.success("Project deleted successfully!")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete project"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(null) // Reset deletion loading state
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const confirmDelete = (projectId: string) => {
    setProjectToDelete(projectId)
    setDeleteDialogOpen(true)
  }

  // Helper function to format status
  const formatStatus = (status?: string) => {
    if (!status) return "Unknown" // Fallback for undefined or null status
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (projects.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Projects Found</h3>
          <p className="text-gray-500 mb-6 text-center">Create your first project to get started.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-6 w-6 text-gray-600" /> Project List
          </CardTitle>
          <CardDescription>Manage all your projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client name or project ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <AnimatePresence>
            {filteredProjects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching projects found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project, index) => {
                  const totalPayments = Array.isArray(project.paymentHistory)
                    ? project.paymentHistory.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
                    : 0
                  const grandTotal = Number(project.grandTotal) || 0
                  const paymentPercentage = grandTotal > 0 ? (totalPayments / grandTotal) * 100 : 0

                  return (
                    <motion.div
                      key={project.projectId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card>
                        <div className="border-l-4 border-gray-600">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold">Project #{project.projectId}</h3>
                                <p className="text-sm text-gray-500">
                                  {project.lastUpdated &&
                                    ` • Updated: ${new Date(project.lastUpdated).toLocaleDateString()}`}
                                </p>
                              </div>
                              <div className="mt-4 md:mt-0">
                                <p className="text-lg font-bold text-gray-700">
                                  ₹{project.grandTotal?.toFixed(2) || "0.00"}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Client</p>
                                <p className="font-medium">{project.clientName || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Contact</p>
                                <p>{project.clientNumber || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Date</p>
                                <p>{project.date ? new Date(project.date).toLocaleDateString() : "N/A"}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <p
                                  className={`font-medium ${
                                    project.status === "completed" ? "text-green-600" : "text-gray-600"
                                  }`}
                                >
                                  {formatStatus(project.status)}
                                </p>
                              </div>
                              <div className="w-1/2">
                                <p className="text-sm font-medium text-gray-500">Payment Progress</p>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      paymentPercentage === 100 ? "bg-green-600" : "bg-gray-600"
                                    }`}
                                    style={{ width: `${paymentPercentage}%` }}
                                  />
                                </div>
                                <p className="text-sm text-gray-500 text-right">{paymentPercentage.toFixed(0)}%</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href={`/dashboard/projects/${project.projectId}`}>
                                        <Eye className="hwiggle" /> View
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View project details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link href={`/dashboard/projects/edit/${project.projectId}`}>
                                        <Edit className="h-4 w-4 mr-1" /> Edit
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit project</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => confirmDelete(project.projectId)}
                                      disabled={isDeleting === project.projectId}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      {isDeleting === project.projectId ? "Deleting..." : "Delete"}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete this project</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-6">
            <Button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <p>
              Page {page} of {totalPages}
            </p>
            <Button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => projectToDelete && handleDelete(projectToDelete)}
              disabled={isDeleting !== null}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}