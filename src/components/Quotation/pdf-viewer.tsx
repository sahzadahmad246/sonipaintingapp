"use client"

import { useState, useEffect } from "react"
import { X, Download, Maximize, Minimize, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PDFViewerProps {
  pdfUrl: string
  onClose: () => void
  documentTitle: string
}

export function PDFViewer({ pdfUrl, onClose, documentTitle }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => {
      window.removeEventListener("keydown", handleEsc)
    }
  }, [onClose, isFullscreen])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${documentTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const iframe = document.getElementById("pdf-iframe") as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className={`bg-white rounded-lg shadow-xl flex flex-col ${
          isFullscreen ? "w-full h-full" : "w-[95%] h-[90%] max-w-5xl"
        } transition-all duration-200`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-primary">{documentTitle} Preview</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <iframe
            id="pdf-iframe"
            src={pdfUrl}
            className="w-full h-full border-0 rounded shadow-md"
            title="PDF Viewer"
          />
        </div>
      </div>
    </div>
  )
}
