"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Phone, Calendar, MessageSquare, Eye, Trash2, Archive, Reply } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface Contact {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  repliedAt?: string;
  repliedBy?: string;
}

interface ContactResponse {
  contacts: Contact[];
  total: number;
  pages: number;
  currentPage: number;
  statusCounts: {
    new: number;
    read: number;
    replied: number;
    archived: number;
    total: number;
  };
}

export default function ContactManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({
    new: 0,
    read: 0,
    replied: 0,
    archived: 0,
    total: 0,
  });

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch<ContactResponse>(`/contact?page=${currentPage}&status=${selectedStatus}`);
      setContacts(response.contacts);
      setTotalPages(response.pages);
      setStatusCounts(response.statusCounts);
    } catch {
      toast.error("Failed to fetch contact messages");
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus]);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || session.user.role !== "admin") {
      router.push("/");
      return;
    }
    
    fetchContacts();
  }, [session, status, fetchContacts, router]);

  const updateContactStatus = async (contactId: string, status: string, notes?: string) => {
    try {
      await apiFetch(`/contact/${contactId}`, {
        method: "PUT",
        body: JSON.stringify({ status, adminNotes: notes }),
      });
      toast.success("Contact status updated successfully");
      fetchContacts();
    } catch {
      toast.error("Failed to update contact status");
    }
  };

  const deleteContact = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact message?")) return;
    
    try {
      await apiFetch(`/contact/${contactId}`, {
        method: "DELETE",
      });
      toast.success("Contact message deleted successfully");
      fetchContacts();
    } catch {
      toast.error("Failed to delete contact message");
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    const variants = {
      new: "destructive",
      read: "secondary",
      replied: "default",
      archived: "outline",
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600">Loading contact messages...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Management</h1>
        <p className="text-gray-600">Manage customer inquiries and messages</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.new}</p>
              </div>
              <Mail className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Read</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.read}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Replied</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.replied}</p>
              </div>
              <Reply className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Archived</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.archived}</p>
              </div>
              <Archive className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-primary">{statusCounts.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.total})</TabsTrigger>
          <TabsTrigger value="new">New ({statusCounts.new})</TabsTrigger>
          <TabsTrigger value="read">Read ({statusCounts.read})</TabsTrigger>
          <TabsTrigger value="replied">Replied ({statusCounts.replied})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({statusCounts.archived})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Contact Messages */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <Card key={contact._id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      {getStatusBadge(contact.status)}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </span>
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(contact.createdAt)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Contact Message Details</DialogTitle>
                          <DialogDescription>
                            From: {contact.name} ({contact.email})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Subject</Label>
                            <p className="text-sm text-gray-600">{contact.subject}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Message</Label>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.message}</p>
                          </div>
                          {contact.adminNotes && (
                            <div>
                              <Label className="text-sm font-medium">Admin Notes</Label>
                              <p className="text-sm text-gray-600">{contact.adminNotes}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => updateContactStatus(contact._id, "read")}
                            >
                              Mark as Read
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateContactStatus(contact._id, "replied")}
                            >
                              Mark as Replied
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => updateContactStatus(contact._id, "archived")}
                            >
                              Archive
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteContact(contact._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <p className="text-sm text-gray-600">{contact.subject}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Message</Label>
                    <p className="text-sm text-gray-600 line-clamp-2">{contact.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
