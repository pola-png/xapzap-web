'use client'

import { ArrowLeft, Clock, Calendar, Share2, Bookmark, CheckCircle2, User } from 'lucide-react'
import { OptimizedImage } from './components/OptimizedImage'
import { formatTimeAgo } from './utils'

interface NewsDetailScreenProps {
  article: any
  onClose: () => void
}

export function NewsDetailScreen({ article, onClose }: NewsDetailScreenProps) {
  const title = article.title || ''
  const content = article.content || ''
  const summary = article.summary || article.seoDescription || ''
  const category = article.category || 'General'
  const author = 'XapZap News'
  const publishedDate = article.createdAt || article.publishedAt
  const imageUrls = article.imageUrls || []
  const thumbnail = article.thumbnailUrl || article.thumbnailUr || (imageUrls.length > 0 ? imageUrls[0] : null)

  // Parse markdown headings, point outline, and paragraphs for a standard structure
  const lines = content.split('\n')
  const processedBody: React.ReactNode[] = []

  let inlineImageIndex = 0

  // Standard renderer helper
  lines.forEach((line: string, index: number) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('# ')) {
      // H1 (Title) - skip as we display it in header
      return
    } else if (trimmed.startsWith('## ')) {
      const headingText = trimmed.replace('## ', '')
      processedBody.push(
        <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4 border-b border-border pb-2 tracking-tight">
          {headingText}
        </h2>
      )
    } else if (trimmed.startsWith('### ')) {
      const headingText = trimmed.replace('### ', '')
      processedBody.push(
        <h3 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3 tracking-tight">
          {headingText}
        </h3>
      )
    } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      // Bullet list items
      const bulletText = trimmed.substring(2)
      processedBody.push(
        <div key={index} className="flex items-start space-x-3 my-2 text-muted-foreground leading-relaxed pl-2">
          <span className="text-primary mt-1.5">•</span>
          <span>{bulletText}</span>
        </div>
      )
    } else if (trimmed.startsWith('1. ') || trimmed.startsWith('2. ') || trimmed.startsWith('3. ') || trimmed.startsWith('4. ') || trimmed.startsWith('5. ')) {
      // Numbered list items
      const numText = trimmed.substring(3)
      processedBody.push(
        <div key={index} className="flex items-start space-x-3 my-2 text-muted-foreground leading-relaxed pl-2">
          <span className="text-primary font-bold">{trimmed.substring(0, 2)}</span>
          <span>{numText}</span>
        </div>
      )
    } else if (trimmed.startsWith('> ')) {
      // Blockquotes
      const quoteText = trimmed.replace('> ', '')
      processedBody.push(
        <blockquote key={index} className="border-l-4 border-primary pl-4 py-1 my-4 italic text-muted-foreground bg-accent/30 rounded-r-md">
          {quoteText}
        </blockquote>
      )
    } else if (trimmed.length > 0) {
      // Check if image tag is embedded
      if (trimmed.startsWith('![') && trimmed.includes('](')) {
        // Embed image tag parsed
        const start = trimmed.indexOf('(') + 1
        const end = trimmed.indexOf(')')
        const imgUrl = trimmed.substring(start, end)
        processedBody.push(
          <div key={index} className="my-6 rounded-xl overflow-hidden shadow-lg border border-border">
            <OptimizedImage
              src={imgUrl}
              alt="Visual asset"
              className="w-full h-auto object-cover max-h-[400px]"
            />
          </div>
        )
      } else {
        // Plain paragraph
        processedBody.push(
          <p key={index} className="my-4 text-muted-foreground leading-relaxed text-[17px]">
            {trimmed}
          </p>
        )
      }
    }
  })

  // Ensure at least 2 images are embedded inside content
  // If the markdown parsing didn't find embedded images but we have imageUrls, append them
  if (imageUrls.length > 1 && processedBody.filter((x: any) => x && x.key && x.key.toString().includes('embed-img')).length === 0) {
    const additionalImages: React.ReactNode[] = []
    imageUrls.forEach((img: string, idx: number) => {
      // Skip the thumbnail
      if (img !== thumbnail) {
        additionalImages.push(
          <div key={`embed-img-${idx}`} className="my-8 rounded-xl overflow-hidden shadow-lg border border-border">
            <OptimizedImage
              src={img}
              alt={`Article detail visual ${idx}`}
              className="w-full h-[320px] object-cover"
            />
          </div>
        )
      }
    })
    // Insert them at 1/3 and 2/3 points of the content
    if (additionalImages.length > 0) {
      const splitIndex = Math.floor(processedBody.length / 2)
      processedBody.splice(splitIndex, 0, additionalImages[0])
      if (additionalImages.length > 1 && processedBody.length > splitIndex + 3) {
        processedBody.splice(splitIndex + 3, 0, additionalImages[1])
      } else if (additionalImages.length > 1) {
        processedBody.push(additionalImages[1])
      }
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title,
        text: summary,
        url: window.location.href,
      })
    } catch (_) {
      // Fallback copy link
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col animate-in fade-in slide-in-from-right duration-300">
      {/* Premium Glassmorphic Top Nav Bar */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 flex items-center justify-between px-6 py-4 border-b border-border">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 px-3 py-2 bg-accent hover:bg-accent/80 text-foreground text-sm font-medium rounded-full transition-all border border-border shadow-sm hover:scale-105"
        >
          <ArrowLeft size={18} />
          <span>Back to Hub</span>
        </button>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{category}</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleShare}
            className="p-2.5 bg-accent hover:bg-accent/80 text-foreground rounded-full transition-all border border-border shadow-sm hover:scale-105"
            title="Share article"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto safe-area-inset-bottom bg-background">
        <div className="max-w-6xl mx-auto px-6 py-8 md:py-12">
          {/* Grid Layout: Main content (left 2/3) & Sidebar (right 1/3) on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Content Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Article Header Metadata */}
              <div className="space-y-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {category}
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                  {title}
                </h1>
                {article.subtitle && (
                  <p className="text-xl text-muted-foreground font-medium leading-normal">
                    {article.subtitle}
                  </p>
                )}
              </div>

              {/* Cover Image */}
              {thumbnail && (
                <div className="space-y-2">
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-xl border border-border group">
                    <OptimizedImage
                      src={thumbnail}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                  {(article.mediaCredits || article.mediaSource) && (
                    <div className="text-right text-xs text-muted-foreground/85 italic pr-2">
                      Image Source: {article.mediaCredits || 'Original Publisher'} ({article.mediaSource || 'Official Source'})
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Rendered Body */}
              <div className="prose prose-lg dark:prose-invert max-w-none pt-4">
                {processedBody}
              </div>
            </div>

            {/* Right Sidebar Column */}
            <div className="lg:col-span-1 space-y-6 lg:border-l lg:border-border lg:pl-8">
              
              {/* Publisher Detail Widget */}
              <div className="bg-accent/40 rounded-2xl p-6 border border-border/60">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Publisher Desk</h3>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black">
                    XZ
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-foreground">{author}</span>
                      <CheckCircle2 size={14} className="text-primary fill-primary/10" />
                    </div>
                    <span className="text-xs text-muted-foreground">Verified Publisher</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  XapZap News provides rapid, detailed reporting on emerging global trends, curated concurrently across 32 countries.
                </p>
              </div>

              {/* Meta Stats & Actions Widget */}
              <div className="bg-accent/40 rounded-2xl p-6 border border-border/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Article Info</h3>
                
                <div className="space-y-3 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center space-x-2.5">
                    <Clock size={16} className="text-primary" />
                    <span>8 min read</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <Calendar size={16} className="text-primary" />
                    <span>{formatTimeAgo(publishedDate)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Share2 size={16} />
                    <span>Share This Story</span>
                  </button>
                </div>
              </div>

              {/* Tags Widget */}
              {article.tags && article.tags.length > 0 && (
                <div className="bg-accent/40 rounded-2xl p-6 border border-border/60">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Topic Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-accent border border-border/80 hover:border-primary/40 text-foreground text-xs font-medium rounded-full cursor-pointer transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
