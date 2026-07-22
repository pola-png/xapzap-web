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
  lines.forEach((line, index) => {
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
    } else if (trimmed.isNotEmpty) {
      // Check if image tag is embedded
      if (trimmed.startsWith('![') && trimmed.contains('](')) {
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
  if (imageUrls.length > 1 && processedBody.filter(x => x && (x as any).key && (x as any).key.toString().includes('embed-img')).length === 0) {
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
      <div className="flex-1 overflow-y-auto safe-area-inset-bottom">
        <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
          {/* Article Header Metadata */}
          <div className="space-y-4 mb-8">
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
            
            {/* Author Card Row */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-y border-border py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <User size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-foreground">{author}</span>
                    <CheckCircle2 size={14} className="text-primary fill-primary/10" />
                  </div>
                  <span className="text-xs text-muted-foreground">Verified Publisher</span>
                </div>
              </div>
              
              <div className="h-4 w-px bg-border hidden sm:block" />
              
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <Clock size={15} />
                  <span>8 min read</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Calendar size={15} />
                  <span>{formatTimeAgo(publishedDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Large Image */}
          {thumbnail && (
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-2xl border border-border mb-8 group">
              <OptimizedImage
                src={thumbnail}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          )}

          {/* Dynamic Rendered Body */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {processedBody}
          </div>

          {/* Tags Footer Section */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Topic Tags</h4>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3.5 py-1.5 bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold rounded-full border border-border cursor-pointer transition-colors"
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
  )
}
