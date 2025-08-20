'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, RotateCcw, Undo2, Shield, AlertCircle, CheckCircle, Sparkles, Lock, Zap, Info, X, FileImage, MousePointer, Move } from 'lucide-react'

// マスク領域の型定義
interface MaskRegion {
  x: number
  y: number
  w: number
  h: number
  id: string
}

// マスクサイズの定義
const maskSizeMap = {
  xs: { w: 80, h: 22 },
  small: { w: 100, h: 30 },
  medium: { w: 160, h: 40 },
  large: { w: 240, h: 60 }
}

export default function HomePage() {
  // 状態管理
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [masks, setMasks] = useState<MaskRegion[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [displayScale, setDisplayScale] = useState(1) // 表示倍率
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  
  // 設定
  const [mode, setMode] = useState<'click' | 'drag'>('click')
  const [maskSize, setMaskSize] = useState<'xs' | 'small' | 'medium' | 'large'>('medium')
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  
  // マウス操作用
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [showGuide, setShowGuide] = useState(false)
  const [currentGuide, setCurrentGuide] = useState({ x: 0, y: 0, w: 0, h: 0 })
  
  // Canvas参照
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 元画像を保存
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  // メッセージの自動消去
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('')
      }, 2000) // 2秒後に消える
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('')
      }, 3000) // 3秒後に消える
      return () => clearTimeout(timer)
    }
  }, [error])

  // ドラッグ&ドロップ処理（ファイル）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile)
    }
  }

  // Canvas再描画
  const redraw = (img: HTMLImageElement, currentMasks: MaskRegion[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Canvas内部サイズは原寸大
    canvas.width = img.width
    canvas.height = img.height
    
    // CSS表示サイズはスケール適用
    canvas.style.width = `${img.width * displayScale}px`
    canvas.style.height = `${img.height * displayScale}px`
    
    // 元画像描画（内部は原寸大）
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    
    // 黒い四角でマスク（内部座標で描画）
    ctx.fillStyle = 'black'
    currentMasks.forEach(mask => {
      ctx.fillRect(mask.x, mask.y, mask.w, mask.h)
    })
  }

  // ファイル処理の共通化
  const processFile = (selectedFile: File) => {
    // ファイルサイズチェック（10MB制限）
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      return
    }
    
    // ファイルタイプチェック
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    setFile(selectedFile)
    setError('')
    setSuccessMessage('')
    setMasks([])
    setHistory([])
    
    // 画像プレビュー生成
    const url = URL.createObjectURL(selectedFile)
    setImageUrl(url)
    
    // 画像サイズ取得と自動スケール計算
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      setOriginalImage(img)
      
      // 表示エリアのサイズを取得して自動スケール計算
      const maxWidth = window.innerWidth * 0.5 // 画面幅の50%（サイドパネル分を考慮）
      const maxHeight = window.innerHeight * 0.5 // 画面高さの50%
      
      const scaleX = maxWidth / img.width
      const scaleY = maxHeight / img.height
      const scale = Math.min(scaleX, scaleY, 1) // 最大でも原寸大
      
      setDisplayScale(scale)
      
      // Canvas初期設定とスケール適用 - ここで最初の描画を行う
      if (canvasRef.current) {
        // Canvas内部サイズは原寸大
        canvasRef.current.width = img.width
        canvasRef.current.height = img.height
        
        // CSS表示サイズはスケール適用
        canvasRef.current.style.width = `${img.width * scale}px`
        canvasRef.current.style.height = `${img.height * scale}px`
        
        // 描画
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, img.width, img.height)
          ctx.drawImage(img, 0, 0)
        }
      }
    }
    img.src = url
  }

  // displayScaleが変更されたときに再描画
  useEffect(() => {
    if (originalImage && canvasRef.current) {
      redraw(originalImage, masks)
    }
  }, [displayScale, originalImage, masks])

  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  // 履歴保存
  const saveHistory = () => {
    const newHistory = [...history, JSON.stringify(masks)]
    if (newHistory.length > 25) newHistory.shift()
    setHistory(newHistory)
  }

  // キャンバス上の座標取得（修正版）
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0, canvasX: 0, canvasY: 0 }
    
    const rect = canvasRef.current.getBoundingClientRect()
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    
    // CSS座標からCanvas内部座標への変換
    // rect.widthとrect.heightは実際の表示サイズ
    // canvas.widthとcanvas.heightは内部の解像度
    const canvasX = (cssX / rect.width) * canvasRef.current.width
    const canvasY = (cssY / rect.height) * canvasRef.current.height
    
    return { x: cssX, y: cssY, canvasX, canvasY }
  }

  // マウス移動（ガイド表示）- 修正版
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!originalImage || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    
    // canvasWrapperの親要素に対する相対位置を計算
    const wrapperElement = canvasRef.current.parentElement
    if (!wrapperElement) return
    
    const wrapperRect = wrapperElement.getBoundingClientRect()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    
    // canvas要素のwrapper内での位置
    const canvasOffsetX = canvasRect.left - wrapperRect.left
    const canvasOffsetY = canvasRect.top - wrapperRect.top
    
    // wrapper内での実際のマウス位置
    const wrapperX = canvasOffsetX + cssX
    const wrapperY = canvasOffsetY + cssY
    
    setMousePos({ x: cssX, y: cssY })
    
    if (mode === 'click') {
      // ワンクリックモードのガイド - マウスカーソル位置を中心に
      const size = maskSizeMap[maskSize]
      setCurrentGuide({
        x: wrapperX - (size.w * displayScale) / 2,
        y: wrapperY - (size.h * displayScale) / 2,
        w: size.w * displayScale,
        h: size.h * displayScale
      })
      setShowGuide(true)
    } else if (mode === 'drag' && isDragging) {
      // ドラッグモードのガイド
      const startX = dragStart.x
      const startY = dragStart.y
      setCurrentGuide({
        x: Math.min(startX, wrapperX),
        y: Math.min(startY, wrapperY),
        w: Math.abs(wrapperX - startX),
        h: Math.abs(wrapperY - startY)
      })
      setShowGuide(true)
    }
  }

  // マウスダウン
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!originalImage) return
    
    const pos = getCanvasPos(e)
    
    if (mode === 'click') {
      // ワンクリックで黒い四角を配置
      const size = maskSizeMap[maskSize]
      const newMask: MaskRegion = {
        x: pos.canvasX - size.w / 2, // Canvas内部座標で保存
        y: pos.canvasY - size.h / 2,
        w: size.w,
        h: size.h,
        id: `mask-${Date.now()}`
      }
      
      saveHistory()
      const newMasks = [...masks, newMask]
      setMasks(newMasks)
      redraw(originalImage, newMasks)
      setSuccessMessage('Mask added!')
    } else if (mode === 'drag') {
      // ドラッグ開始 - wrapper内での位置を記録
      setIsDragging(true)
      
      const wrapperElement = canvasRef.current?.parentElement
      if (!wrapperElement) return
      
      const wrapperRect = wrapperElement.getBoundingClientRect()
      const canvasRect = canvasRef.current!.getBoundingClientRect()
      const canvasOffsetX = canvasRect.left - wrapperRect.left
      const canvasOffsetY = canvasRect.top - wrapperRect.top
      
      setDragStart({ 
        x: canvasOffsetX + pos.x, 
        y: canvasOffsetY + pos.y 
      })
    }
  }

  // マウスアップ
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!originalImage || mode !== 'drag' || !isDragging) return
    
    const pos = getCanvasPos(e)
    
    // ドラッグ開始位置のCanvas座標を計算
    if (!canvasRef.current) return
    
    const wrapperElement = canvasRef.current.parentElement
    if (!wrapperElement) return
    
    const wrapperRect = wrapperElement.getBoundingClientRect()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const canvasOffsetX = canvasRect.left - wrapperRect.left
    const canvasOffsetY = canvasRect.top - wrapperRect.top
    
    // dragStartはwrapper座標なので、canvas座標に変換
    const startCanvasX = ((dragStart.x - canvasOffsetX) / canvasRect.width) * canvasRef.current.width
    const startCanvasY = ((dragStart.y - canvasOffsetY) / canvasRect.height) * canvasRef.current.height
    
    const x1 = startCanvasX
    const y1 = startCanvasY
    const x2 = pos.canvasX
    const y2 = pos.canvasY
    
    const bx = Math.min(x1, x2)
    const by = Math.min(y1, y2)
    const bw = Math.abs(x2 - x1)
    const bh = Math.abs(y2 - y1)
    
    if (bw > 2 && bh > 2) {
      const newMask: MaskRegion = {
        x: bx,
        y: by,
        w: bw,
        h: bh,
        id: `mask-${Date.now()}`
      }
      
      saveHistory()
      const newMasks = [...masks, newMask]
      setMasks(newMasks)
      redraw(originalImage, newMasks)
      setSuccessMessage('Mask added!')
    }
    
    setIsDragging(false)
    setShowGuide(false)
  }

  // マウスリーブ
  const handleMouseLeave = () => {
    setShowGuide(false)
    if (isDragging) {
      setIsDragging(false)
    }
  }

  // 元に戻す
  const handleUndo = () => {
    if (history.length === 0) return
    
    const lastState = history[history.length - 1]
    const restoredMasks = JSON.parse(lastState)
    setMasks(restoredMasks)
    setHistory(history.slice(0, -1))
    
    if (originalImage) {
      redraw(originalImage, restoredMasks)
    }
    setSuccessMessage('Undone!')
  }

  // リセット
  const handleReset = () => {
    setMasks([])
    setHistory([])
    
    if (originalImage) {
      redraw(originalImage, [])
      setSuccessMessage('All masks cleared!')
    }
  }

  // ダウンロード
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
    
    canvas.toBlob((blob) => {
      if (!blob) return
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `masked.${format}`
      a.click()
      URL.revokeObjectURL(url)
    }, mime, 0.93)
    
    setSuccessMessage('Image downloaded!')
  }

  // 新しい画像を選択
  const handleNewImage = () => {
    setFile(null)
    setImageUrl('')
    setMasks([])
    setHistory([])
    setError('')
    setSuccessMessage('')
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* 背景アニメーション */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      {/* ヘッダー */}
      <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Shield className="w-10 h-10 text-cyan-400" />
                <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  BlurTap
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Privacy Masking Tool</p>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-300"
            >
              <Info className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 情報パネル */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">How to Use</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex items-start space-x-3">
                <Upload className="w-5 h-5 text-cyan-400 mt-0.5" />
                <p>Upload or drag & drop your image</p>
              </div>
              <div className="flex items-start space-x-3">
                <MousePointer className="w-5 h-5 text-purple-400 mt-0.5" />
                <p>Select masking mode (click or drag)</p>
              </div>
              <div className="flex items-start space-x-3">
                <Move className="w-5 h-5 text-pink-400 mt-0.5" />
                <p>Click or drag to add black masks</p>
              </div>
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-green-400 mt-0.5" />
                <p>Download your masked image</p>
              </div>
            </div>
            <div className="mt-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-yellow-400">
                🔒 100% Private: All processing happens locally in your browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* アップロードセクション */}
        {!imageUrl ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8 animate-fade-in">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Privacy Protection Made Simple
                <span className="block text-2xl sm:text-3xl mt-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Click or Drag to Mask
                </span>
              </h2>
              <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
                Upload an image and mask sensitive areas with black rectangles.
                Simple, fast, and 100% private.
              </p>
            </div>

            {/* ドラッグ&ドロップエリア */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full max-w-xl transition-all duration-300 ${
                isDraggingFile ? 'scale-105' : 'scale-100'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 backdrop-blur-sm border-2 border-dashed border-white/20 hover:border-cyan-400/50 transition-all duration-300"
              >
                <div className="p-12 sm:p-16">
                  <div className="flex justify-center mb-4">
                    <FileImage className="w-16 h-16 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <p className="text-white font-semibold text-lg mb-2">
                    {isDraggingFile ? 'Drop your image here' : 'Click or drag image here'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    PNG, JPEG, GIF, BMP, WebP (Max 10MB)
                  </p>
                </div>
              </button>
            </div>

            {/* 機能紹介 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-4xl">
              <div className="rounded-xl bg-gradient-to-br from-cyan-600/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 p-6">
                <Lock className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">100% Local</h3>
                <p className="text-gray-400 text-sm">No server uploads</p>
              </div>
              
              <div className="rounded-xl bg-gradient-to-br from-purple-600/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 p-6">
                <Zap className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Instant</h3>
                <p className="text-gray-400 text-sm">Real-time masking</p>
              </div>
              
              <div className="rounded-xl bg-gradient-to-br from-pink-600/10 to-pink-600/5 backdrop-blur-sm border border-pink-500/20 p-6">
                <MousePointer className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Easy</h3>
                <p className="text-gray-400 text-sm">Click or drag to mask</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* コントロールパネル */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* モード選択 */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'click' | 'drag')}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="click">Click (fixed)</option>
                    <option value="drag">Drag (area)</option>
                  </select>
                </div>
                
                {/* サイズ選択（クリックモードのみ） */}
                <div className={mode === 'drag' ? 'opacity-50' : ''}>
                  <label className="text-xs text-gray-400 block mb-1">Size</label>
                  <select
                    value={maskSize}
                    onChange={(e) => setMaskSize(e.target.value as any)}
                    disabled={mode === 'drag'}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm disabled:opacity-50 focus:outline-none focus:border-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="xs">XS (80×22)</option>
                    <option value="small">Small (100×30)</option>
                    <option value="medium">Medium (160×40)</option>
                    <option value="large">Large (240×60)</option>
                  </select>
                </div>
                
                {/* フォーマット */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                
                {/* マスク数 */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Masks</label>
                  <div className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium text-center">
                    {masks.length}
                  </div>
                </div>
                
                {/* ファイル名 */}
                <div>
                  <label className="text-xs text-gray-400 block mb-1">File</label>
                  <div className="px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium truncate">
                    {file?.name || 'No file'}
                  </div>
                </div>
              </div>
            </div>

            {/* メッセージ - 位置を固定してレイアウトがずれないように */}
            <div className="h-16"> {/* 固定高さで領域を確保 */}
              {error && (
                <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                  <p className="text-green-400">{successMessage}</p>
                </div>
              )}
            </div>

            {/* 画像エリア - レスポンシブ対応 */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* キャンバスエリア */}
              <div className="flex-1 order-2 lg:order-1">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6">
                  <div className="overflow-auto max-h-[60vh] lg:max-h-[70vh] relative">
                    <div className="inline-block relative min-w-full">
                      <canvas
                        ref={canvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          maxWidth: '100%',
                          cursor: mode === 'click' ? 'crosshair' : 'crosshair',
                          border: '2px solid #444',
                          borderRadius: '8px',
                          display: 'block'
                        }}
                        className="bg-white mx-auto"
                      />
                      
                      {/* ガイドボックス */}
                      {showGuide && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${currentGuide.x}px`,
                            top: `${currentGuide.y}px`,
                            width: `${currentGuide.w}px`,
                            height: `${currentGuide.h}px`,
                            border: '3px dashed #1a9dff',
                            backgroundColor: 'rgba(26,157,255,0.11)',
                            boxShadow: '0 0 0 3px rgba(26,157,255,0.24)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* アクションパネル - サイドバーまたは上部 */}
              <div className="w-full lg:w-80 order-1 lg:order-2 flex flex-col gap-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleUndo}
                      disabled={history.length === 0}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Undo2 className="w-4 h-4" />
                      <span>Undo</span>
                    </button>
                    
                    <button
                      onClick={handleReset}
                      disabled={masks.length === 0}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>
                    
                    <button
                      onClick={handleDownload}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={handleNewImage}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>New Image</span>
                    </button>
                  </div>
                </div>

                {/* 使い方 */}
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2">Quick Guide</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• {mode === 'click' ? 'Click to add fixed-size masks' : 'Drag to select area'}</li>
                    <li>• Use Undo to remove last mask</li>
                    <li>• Reset clears all masks</li>
                    <li>• Download saves the result</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="relative z-10 mt-auto py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            100% Private • No Data Stored • No Tracking
          </p>
        </div>
      </footer>

      {/* アニメーション用のスタイル */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}