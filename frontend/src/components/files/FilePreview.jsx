import { useEffect, useState } from 'react'
import { DownloadIcon, XIcon, FileIcon } from 'lucide-react'
import { getFileIcon, formatBytes } from '../../assets/assets'

const isImage = (mime = '') => mime.startsWith('image/')
const isVideo = (mime = '') => mime.startsWith('video/')
const isAudio = (mime = '') => mime.startsWith('audio/')
const isPdf = (mime = '') => mime === 'application/pdf'

const isText = (mime = '') =>
  mime.startsWith('text/') ||
  ['application/json', 'application/xml', 'application/javascript'].includes(mime)

const PREVIEW_TEXT_LIMIT = 50_000

const FilePreview = ({ file, previewUrl, onClose, open = true }) => {
  const [textContent, setTextContent] = useState(null)
  const [textError, setTextError] = useState(false)
  const [isLoadingText, setIsLoadingText] = useState(false)

  const mime = file?.mime_type || ''
  const displayName = file?.name || file?.original_name || 'Untitled'

  useEffect(() => {
    setTextContent(null)
    setTextError(false)

    if (!open || !previewUrl || !isText(mime)) return

    let active = true
    setIsLoadingText(true)

    fetch(previewUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch preview')
        return res.text()
      })
      .then((raw) => {
        if (!active) return

        let formatted = raw

        if (mime === 'application/json') {
          try {
            formatted = JSON.stringify(JSON.parse(raw), null, 2)
          } catch {
            // Keep original text
          }
        }

        setTextContent(formatted.slice(0, PREVIEW_TEXT_LIMIT))
      })
      .catch(() => active && setTextError(true))
      .finally(() => active && setIsLoadingText(false))

    return () => {
      active = false
    }
  }, [open, previewUrl, mime])

  if (!open) return null

  const handleDownload = () => {
    if (!previewUrl) return

    const link = document.createElement('a')
    link.href = previewUrl
    link.download = displayName
    link.rel = 'noopener noreferrer'

    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const renderFallback = () => (
    <div className='flex min-h-[280px] w-full max-w-[500px] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm'>
      <span className='flex size-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100'>
        <FileIcon className='size-8' />
      </span>

      <p className='text-sm font-medium text-slate-700'>
        No direct preview available
      </p>
    </div>
  )

  const renderBody = () => {
    if (isImage(mime)) {
      return (
        <img
          src={previewUrl}
          alt={displayName}
          className='max-h-[58vh] max-w-[90%] rounded-lg object-contain shadow-sm'
        />
      )
    }

    if (isVideo(mime)) {
      return (
        <video
          src={previewUrl}
          controls
          autoPlay
          className='max-h-[58vh] max-w-[90%] rounded-lg'
        />
      )
    }

    if (isAudio(mime)) {
      return (
        <div className='flex w-full max-w-md flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-sm'>
          <span className='flex size-14 items-center justify-center rounded-xl bg-orange-50 text-orange-600'>
            {getFileIcon(mime, 'size-7')}
          </span>

          <audio
            src={previewUrl}
            controls
            className='w-full'
          />
        </div>
      )
    }

    if (isPdf(mime)) {
      return (
        <iframe
          title={`Preview ${displayName}`}
          src={previewUrl}
          className='h-[62vh] w-full max-w-[1000px] rounded-lg border border-slate-200 bg-white'
        />
      )
    }

    if (isText(mime)) {
      if (isLoadingText) {
        return (
          <p className='rounded-lg bg-white px-5 py-4 text-sm text-slate-500 shadow-sm'>
            Loading preview…
          </p>
        )
      }

      if (textError || textContent === null) {
        return renderFallback()
      }

      return (
        <pre className='max-h-[62vh] w-full max-w-[1000px] overflow-auto rounded-lg bg-white p-4 text-left text-xs leading-relaxed text-slate-700 shadow-sm'>
          {textContent}
        </pre>
      )
    }

    return renderFallback()
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='flex h-[86vh] min-h-0 w-[94vw] max-w-[1200px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl'
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className='flex min-h-14 items-center gap-2 border-b border-slate-200 px-3 py-2 sm:px-4'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600'>
            {getFileIcon(mime, 'size-4')}
          </span>

          <div className='min-w-0 flex-1'>
            <p
              className='truncate text-sm font-medium text-slate-800'
              title={displayName}
            >
              {displayName}
            </p>

            {file?.size != null && (
              <p className='text-[11px] text-slate-500'>
                {formatBytes(file.size)}
              </p>
            )}
          </div>

          {previewUrl && (
            <button
              type='button'
              onClick={handleDownload}
              className='inline-flex shrink-0 items-center gap-1.5 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-700'
            >
              <DownloadIcon size={13} />
              Download
            </button>
          )}

          {onClose && (
            <button
              type='button'
              aria-label='Close preview'
              onClick={onClose}
              className='shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
            >
              <XIcon size={17} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className='flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50 p-3 sm:p-5'>
          {renderBody()}
        </div>
      </div>
    </div>
  )
}

export default FilePreview
