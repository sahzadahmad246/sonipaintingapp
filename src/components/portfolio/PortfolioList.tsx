"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Search, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image"; // Import Next.js Image
import { getPortfolio, apiFetch } from "@/app/lib/api";
import type { Portfolio } from "@/app/types";

export default function PortfolioList() {
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [filteredPortfolio, setFilteredPortfolio] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 8;

  const fetchPortfolio = useCallback(async () => {
    try {
      const { portfolio, pages } = await getPortfolio(page, limit);
      setPortfolio(portfolio);
      setTotalPages(pages);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch portfolio items";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const filterPortfolio = useCallback(() => {
    let filtered = [...portfolio];
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          (item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    }
    setFilteredPortfolio(filtered);
  }, [portfolio, searchTerm]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    filterPortfolio();
  }, [filterPortfolio]);

  const handleDelete = async (publicId: string) => {
    try {
      await apiFetch("/portfolio", {
        method: "DELETE",
        body: JSON.stringify({ publicId }),
      });
      setPortfolio((prev) => prev.filter((item) => item.publicId !== publicId));
      toast.success("Portfolio item deleted successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete portfolio item";
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setPortfolioToDelete(null);
    }
  };

  const confirmDelete = (publicId: string) => {
    setPortfolioToDelete(publicId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-64 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (portfolio.length === 0 && page === 1) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No Portfolio Items Found</h3>
          <p className="text-gray-500 mb-6 text-center">Add your first portfolio item to showcase your work.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ImageIcon className="mr-2 h-6 w-6 text-primary" />
           (pair)
            Portfolio
          </CardTitle>
          <CardDescription>Showcase your work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <AnimatePresence>
            {filteredPortfolio.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No matching portfolio items found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPortfolio.map((item, index) => (
                  <motion.div
                    key={item.publicId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card className="relative">
                      <CardContent className="p-0">
                        <Image
                          src={item.imageUrl}
                          alt={item.title || "Portfolio item"}
                          width={400}
                          height={192}
                          className="w-full h-48 object-cover rounded-t-md"
                        />
                        <div className="p-4">
                          {item.title && <h3 className="font-medium text-lg">{item.title}</h3>}
                          {item.description && <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>}
                          <p className="text-xs text-gray-400 mt-2">
                            Uploaded: {new Date(item.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => confirmDelete(item.publicId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete this portfolio item</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-6">
            <Button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <p>Page {page} of {totalPages}</p>
            <Button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to delete this portfolio item? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => portfolioToDelete && handleDelete(portfolioToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}