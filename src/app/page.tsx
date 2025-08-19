'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, RotateCcw, Undo2, Shield, AlertCircle, CheckCircle, Sparkles, Lock, Zap, Eye, EyeOff, Info, X, FileImage, MousePointer } from 'lucide-react'

// マスク領域の型定義
interface MaskRegion {
  x: number
  y: number
  width: number
  height: number
  id: string
}

export default function HomePage() {
  // 状態管理
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [maskedRegions, setMaskedRegions] = useState<MaskRegion[]>([])
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<MaskRegion | null>(null)
  
  // Canvas参照
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 元画像を保存
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      processFile(droppedFile)
    }
  }

  // ファイル処理の共通化
  const processFile = (selectedFile: File) => {
    // ファイルサイズチェック（5MB制限）
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
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
    setMaskedRegions([])
    
    // 画像プレビュー生成
    const url = URL.createObjectURL(selectedFile)
    setImageUrl(url)
    
    // 画像サイズ取得
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      setOriginalImage(img)
      drawCanvas(img, [])
    }
    img.src = url
  }

  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  // Canvas描画（モザイク効果付き）
  const drawCanvas = (img: HTMLImageElement, masks: MaskRegion[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Canvasサイズ設定
    canvas.width = img.width
    canvas.height = img.height
    
    // 元画像描画
    ctx.drawImage(img, 0, 0)
    
    // マスク適用（モザイク効果）
    masks.forEach(mask => {
      // モザイクのピクセルサイズ
      const pixelSize = 15
      
      // モザイク効果の実装
      const imageData = ctx.getImageData(mask.x, mask.y, mask.width, mask.height)
      
      for (let y = 0; y < mask.height; y += pixelSize) {
        for (let x = 0; x < mask.width; x += pixelSize) {
          // ピクセルブロックの平均色を計算
          let r = 0, g = 0, b = 0, count = 0
          
          for (let dy = 0; dy < pixelSize && y + dy < mask.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < mask.width; dx++) {
              const idx = ((y + dy) * mask.width + (x + dx)) * 4
              r += imageData.data[idx]
              g += imageData.data[idx + 1]
              b += imageData.data[idx + 2]
              count++
            }
          }
          
          r = Math.floor(r / count)
          g = Math.floor(g / count)
          b = Math.floor(b / count)
          
          // ブロック全体を平均色で塗る
          for (let dy = 0; dy < pixelSize && y + dy < mask.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < mask.width; dx++) {
              const idx = ((y + dy) * mask.width + (x + dx)) * 4
              imageData.data[idx] = r
              imageData.data[idx + 1] = g
              imageData.data[idx + 2] = b
            }
          }
        }
      }
      
      ctx.putImageData(imageData, mask.x, mask.y)
    })
  }

  // マウスダウン - 範囲選択開始
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scale = canvasRef.current.width / rect.width
    
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    
    setIsDrawing(true)
    setStartPoint({ x, y })
    setCurrentRect(null)
  }

  // マウス移動 - 範囲選択中
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const scale = canvasRef.current.width / rect.width
    
    const currentX = (e.clientX - rect.left) * scale
    const currentY = (e.clientY - rect.top) * scale
    
    const newRect: MaskRegion = {
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y),
      id: 'temp'
    }
    
    setCurrentRect(newRect)
  }

  // マウスアップ - 範囲選択完了
  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false)
      return
    }
    
    // 最小サイズチェック（10px以上）
    if (currentRect.width > 10 && currentRect.height > 10) {
      const newMask: MaskRegion = {
        ...currentRect,
        id: `mask-${Date.now()}`
      }
      
      const newMasks = [...maskedRegions, newMask]
      setMaskedRegions(newMasks)
      
      // Canvas再描画
      if (originalImage) {
        drawCanvas(originalImage, newMasks)
      }
      
      setSuccessMessage('Area masked successfully!')
    }
    
    setIsDrawing(false)
    setCurrentRect(null)
  }

  // 元に戻す
  const handleUndo = () => {
    if (maskedRegions.length === 0) return
    
    // 最後のマスクを削除
    const newMasks = maskedRegions.slice(0, -1)
    setMaskedRegions(newMasks)
    
    // Canvas再描画
    if (originalImage) {
      drawCanvas(originalImage, newMasks)
    }
  }

  // リセット
  const handleReset = () => {
    setMaskedRegions([])
    
    if (originalImage) {
      drawCanvas(originalImage, [])
      setSuccessMessage('Image reset. Draw rectangles to mask areas.')
    }
  }

  // ダウンロード
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.toBlob((blob) => {
      if (!blob) return
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `masked-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
    
    setSuccessMessage('Image downloaded successfully!')
  }

  // コンテナサイズに合わせたスケール計算
  const getScaledDimensions = () => {
    if (!containerRef.current || imageSize.width === 0) {
      return { width: '100%', height: 'auto', scale: 1 }
    }
    
    const containerWidth = containerRef.current.offsetWidth
    const scale = Math.min(1, containerWidth / imageSize.width)
    
    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale,
      scale
    }
  }

  const scaled = getScaledDimensions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative overflow-hidden">
      {/* 背景アニメーション */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
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
                  MaskTap
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">One-Click Privacy Shield</p>
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
              <h3 className="text-xl font-bold text-white">How It Works</h3>
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
                <p>Upload any image you want to protect</p>
              </div>
              <div className="flex items-start space-x-3">
                <MousePointer className="w-5 h-5 text-purple-400 mt-0.5" />
                <p>Click and drag to select areas to mask</p>
              </div>
              <div className="flex items-start space-x-3">
                <EyeOff className="w-5 h-5 text-pink-400 mt-0.5" />
                <p>Selected areas are instantly blurred</p>
              </div>
              <div className="flex items-start space-x-3">
                <Download className="w-5 h-5 text-green-400 mt-0.5" />
                <p>Download your protected image</p>
              </div>
            </div>
            <div className="mt-6 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-yellow-400">
                🔒 100% Private: All processing happens in your browser. No data is ever uploaded to servers.
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
                Instant Privacy Protection
                <span className="block text-2xl sm:text-3xl mt-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Click & Drag to Mask
                </span>
              </h2>
              <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
                Upload an image and manually select areas to blur.
                Perfect for hiding sensitive information with just a few clicks.
              </p>
            </div>

            {/* ドラッグ&ドロップエリア */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full max-w-xl transition-all duration-300 ${
                isDragging ? 'scale-105' : 'scale-100'
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
                    <div className="relative">
                      <FileImage className="w-16 h-16 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-cyan-400/20 blur-xl group-hover:bg-cyan-400/30 transition-all duration-300"></div>
                    </div>
                  </div>
                  <p className="text-white font-semibold text-lg mb-2">
                    {isDragging ? 'Drop your image here' : 'Click or drag image here'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                  
                  {/* アニメーションドット */}
                  <div className="flex justify-center mt-6 space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </button>
            </div>

            {/* 機能紹介カード */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-4xl">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-600/10 to-cyan-600/5 backdrop-blur-sm border border-cyan-500/20 p-6 hover:scale-105 transition-all duration-300">
                <Lock className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">100% Secure</h3>
                <p className="text-gray-400 text-sm">No server uploads. Everything stays in your browser.</p>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/20 p-6 hover:scale-105 transition-all duration-300">
                <Zap className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-400 text-sm">Instant masking with no processing delays.</p>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-600/10 to-pink-600/5 backdrop-blur-sm border border-pink-500/20 p-6 hover:scale-105 transition-all duration-300">
                <MousePointer className="w-8 h-8 text-pink-400 mb-3" />
                <h3 className="text-white font-semibold mb-2">Simple Control</h3>
                <p className="text-gray-400 text-sm">Just click and drag to select areas to mask.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ツールバー */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  {file && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400 font-medium">{file.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="px-4 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <p className="text-sm text-cyan-400 font-medium flex items-center space-x-2">
                      <MousePointer className="w-4 h-4" />
                      <span>Click and drag to mask areas</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* エラー・成功メッセージ */}
            {error && (
              <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 rounded-xl p-4 flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                <p className="text-green-400">{successMessage}</p>
              </div>
            )}

            {/* 画像編集エリア */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* メイン画像エリア */}
              <div className="xl:col-span-3">
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      {maskedRegions.length > 0 
                        ? `${maskedRegions.length} areas masked`
                        : 'Draw rectangles to mask areas'
                      }
                    </h3>
                  </div>
                  
                  <div ref={containerRef} className="relative inline-block bg-slate-900/50 rounded-lg overflow-hidden">
                    {/* Canvas */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      style={{
                        width: scaled.width,
                        height: scaled.height,
                        display: imageUrl ? 'block' : 'none',
                        cursor: isDrawing ? 'crosshair' : 'crosshair'
                      }}
                      className="max-w-full h-auto"
                    />
                    
                    {/* 選択中の範囲表示 */}
                    {currentRect && isDrawing && (
                      <div
                        className="absolute border-2 border-cyan-400 bg-cyan-400 bg-opacity-20 pointer-events-none"
                        style={{
                          left: currentRect.x * scaled.scale,
                          top: currentRect.y * scaled.scale,
                          width: currentRect.width * scaled.scale,
                          height: currentRect.height * scaled.scale,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* サイドパネル */}
              <div className="xl:col-span-1 space-y-4">
                {/* アクションボタン */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleUndo}
                      disabled={maskedRegions.length === 0}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 group"
                    >
                      <Undo2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span>Undo Last</span>
                    </button>
                    
                    <button
                      onClick={handleReset}
                      disabled={maskedRegions.length === 0}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 group"
                    >
                      <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Reset All</span>
                    </button>
                    
                    <button
                      onClick={handleDownload}
                      disabled={!imageUrl}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/25"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setFile(null)
                        setImageUrl('')
                        setMaskedRegions([])
                        setError('')
                        setSuccessMessage('')
                      }}
                      className="w-full px-4 py-2.5 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>New Image</span>
                    </button>
                  </div>
                </div>

                {/* 統計情報 */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Masked Areas</span>
                      <span className="text-green-400 font-semibold">{maskedRegions.length}</span>
                    </div>
                    {imageSize.width > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Image Size</span>
                          <span className="text-cyan-400 text-xs">{imageSize.width} × {imageSize.height}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center space-x-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Pro Tip</span>
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Draw multiple rectangles to mask different areas. Use Undo to remove the last mask.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="relative z-10 mt-auto py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Lock className="w-4 h-4 text-gray-500" />
              <p className="text-sm text-gray-500">
                100% Private • No Data Stored • No Tracking
              </p>
            </div>
            <p className="text-xs text-gray-600">
              © 2025 MaskTap. Protecting your privacy locally.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}